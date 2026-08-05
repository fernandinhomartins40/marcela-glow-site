import { prisma } from '@marcela/database'

/**
 * Cálculo de horários livres.
 *
 * O servidor roda em UTC, mas o expediente é definido em hora local da clínica
 * ("09:00"–"18:00"). Todas as conversões passam por aqui para que o fuso seja
 * tratado num lugar só.
 */

/** Fuso da clínica (Chapadão do Sul/MS = UTC-4, sem horário de verão). */
export const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'America/Campo_Grande'

/** Antecedência mínima entre agora e o horário agendável. */
const MIN_LEAD_TIME_MIN = Number(process.env.BOOKING_MIN_LEAD_MINUTES || 120)

/** Granularidade da grade de horários oferecida à paciente. */
const SLOT_STEP_MIN = Number(process.env.BOOKING_SLOT_STEP_MINUTES || 30)

export interface Slot {
  /** Início em ISO 8601 UTC */
  startsAt: string
  /** Fim em ISO 8601 UTC */
  endsAt: string
  /** "14:30" — hora local, pronta para exibição */
  label: string
}

export interface DayAvailability {
  /** "2026-08-12" na data local da clínica */
  date: string
  /** "Terça-feira" */
  weekdayLabel: string
  slots: Slot[]
}

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

/**
 * Deslocamento do fuso da clínica em minutos, para um instante dado.
 * Usa Intl para respeitar eventuais mudanças de regra sem tabela fixa.
 */
function tzOffsetMinutes(date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  )
  return (asUTC - date.getTime()) / 60000
}

/** Converte "2026-08-12" + "14:30" (hora da clínica) para um Date em UTC. */
export function clinicTimeToUtc(dateISO: string, time: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  // Primeira aproximação: trata como UTC e corrige pelo offset daquele instante
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
  const offset = tzOffsetMinutes(naive)
  return new Date(naive.getTime() - offset * 60000)
}

/** Data local da clínica ("2026-08-12") para um instante UTC. */
export function utcToClinicDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Hora local da clínica ("14:30") para um instante UTC. */
export function utcToClinicTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** Dia da semana (0=domingo) na data local da clínica. */
export function clinicWeekday(dateISO: string): number {
  const noon = clinicTimeToUtc(dateISO, '12:00')
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
  }).format(noon)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

/** Soma dias a uma data ISO local, sem passar por Date local do servidor. */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Status que ocupam a agenda. Cancelados liberam o horário. */
const BLOCKING_STATUSES = ['PENDING', 'CONFIRMED'] as const

interface BusyInterval {
  start: Date
  end: Date
}

async function loadBusyIntervals(
  tenantId: string,
  rangeStart: Date,
  rangeEnd: Date,
  ignoreAppointmentId?: string,
): Promise<BusyInterval[]> {
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: [...BLOCKING_STATUSES] },
        scheduledAt: { not: null, gte: rangeStart, lt: rangeEnd },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: {
        scheduledAt: true,
        endsAt: true,
        procedure: { select: { durationMin: true, bufferMin: true } },
      },
    }),
    prisma.scheduleBlock.findMany({
      where: { tenantId, endsAt: { gt: rangeStart }, startsAt: { lt: rangeEnd } },
      select: { startsAt: true, endsAt: true },
    }),
  ])

  const busy: BusyInterval[] = []

  for (const appointment of appointments) {
    if (!appointment.scheduledAt) continue
    const start = appointment.scheduledAt
    // endsAt é a fonte de verdade; se faltar (dado antigo), deriva da duração
    const fallbackMin =
      (appointment.procedure?.durationMin ?? 60) + (appointment.procedure?.bufferMin ?? 0)
    const end = appointment.endsAt ?? new Date(start.getTime() + fallbackMin * 60000)
    busy.push({ start, end })
  }

  for (const block of blocks) {
    busy.push({ start: block.startsAt, end: block.endsAt })
  }

  return busy
}

/**
 * Horários livres para um procedimento, dentro de um intervalo de dias.
 * Retorna apenas dias com pelo menos um horário disponível.
 */
export async function getAvailability(params: {
  tenantId: string
  procedureId?: string | null
  fromDate: string
  days: number
  /** Ao remarcar, o próprio agendamento não deve bloquear seus horários */
  ignoreAppointmentId?: string
}): Promise<DayAvailability[]> {
  const { tenantId, procedureId, fromDate, days, ignoreAppointmentId } = params

  const procedure = procedureId
    ? await prisma.procedure.findFirst({
        where: { id: procedureId, tenantId },
        select: { durationMin: true, bufferMin: true, isBookable: true },
      })
    : null

  // Procedimento fechado para agendamento online não oferece horários
  if (procedure && !procedure.isBookable) return []

  const durationMin = procedure?.durationMin ?? 60
  const bufferMin = procedure?.bufferMin ?? 0
  const blockMin = durationMin + bufferMin

  const businessHours = await prisma.businessHour.findMany({
    where: { tenantId, isActive: true },
    orderBy: { startTime: 'asc' },
  })
  if (!businessHours.length) return []

  const rangeStart = clinicTimeToUtc(fromDate, '00:00')
  const rangeEnd = clinicTimeToUtc(addDaysISO(fromDate, days + 1), '00:00')
  const busy = await loadBusyIntervals(tenantId, rangeStart, rangeEnd, ignoreAppointmentId)

  const earliest = new Date(Date.now() + MIN_LEAD_TIME_MIN * 60000)
  const result: DayAvailability[] = []

  for (let i = 0; i < days; i++) {
    const dateISO = addDaysISO(fromDate, i)
    const weekday = clinicWeekday(dateISO)
    const windows = businessHours.filter((h) => h.weekday === weekday)
    if (!windows.length) continue

    const slots: Slot[] = []

    for (const window of windows) {
      const windowStart = clinicTimeToUtc(dateISO, window.startTime)
      const windowEnd = clinicTimeToUtc(dateISO, window.endTime)

      for (
        let cursor = windowStart.getTime();
        cursor + blockMin * 60000 <= windowEnd.getTime();
        cursor += SLOT_STEP_MIN * 60000
      ) {
        const start = new Date(cursor)
        const end = new Date(cursor + blockMin * 60000)

        if (start < earliest) continue
        if (busy.some((b) => overlaps(start, end, b.start, b.end))) continue

        slots.push({
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          label: utcToClinicTime(start),
        })
      }
    }

    if (slots.length) {
      result.push({ date: dateISO, weekdayLabel: WEEKDAY_LABELS[weekday], slots })
    }
  }

  return result
}

export interface ConflictCheck {
  ok: boolean
  reason?: string
}

/**
 * Valida um horário antes de gravar. Chamado sempre que uma data é definida,
 * porque a lista de slots pode ter ficado obsoleta entre a escolha e o envio.
 */
export async function checkSlotAvailable(params: {
  tenantId: string
  startsAt: Date
  procedureId?: string | null
  ignoreAppointmentId?: string
  /** A equipe pode marcar fora do expediente; a paciente, não. */
  allowOutsideBusinessHours?: boolean
}): Promise<ConflictCheck> {
  const { tenantId, startsAt, procedureId, ignoreAppointmentId, allowOutsideBusinessHours } = params

  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, reason: 'Data inválida.' }
  }

  const procedure = procedureId
    ? await prisma.procedure.findFirst({
        where: { id: procedureId, tenantId },
        select: { durationMin: true, bufferMin: true, isBookable: true },
      })
    : null

  const blockMin = (procedure?.durationMin ?? 60) + (procedure?.bufferMin ?? 0)
  const endsAt = new Date(startsAt.getTime() + blockMin * 60000)

  if (!allowOutsideBusinessHours) {
    // A equipe pode agendar qualquer procedimento; o site, só os liberados
    if (procedure && !procedure.isBookable) {
      return { ok: false, reason: 'Este procedimento não está disponível para agendamento online.' }
    }

    if (startsAt.getTime() < Date.now() + MIN_LEAD_TIME_MIN * 60000) {
      return { ok: false, reason: 'Escolha um horário com mais antecedência.' }
    }

    const dateISO = utcToClinicDate(startsAt)
    const weekday = clinicWeekday(dateISO)
    const windows = await prisma.businessHour.findMany({
      where: { tenantId, weekday, isActive: true },
    })

    const insideWindow = windows.some((window) => {
      const windowStart = clinicTimeToUtc(dateISO, window.startTime)
      const windowEnd = clinicTimeToUtc(dateISO, window.endTime)
      return startsAt >= windowStart && endsAt <= windowEnd
    })

    if (!insideWindow) {
      return { ok: false, reason: 'Horário fora do expediente da clínica.' }
    }
  }

  const busy = await loadBusyIntervals(tenantId, startsAt, endsAt, ignoreAppointmentId)
  if (busy.some((b) => overlaps(startsAt, endsAt, b.start, b.end))) {
    return { ok: false, reason: 'Este horário acabou de ser ocupado. Escolha outro.' }
  }

  return { ok: true }
}

/** Fim do atendimento a partir do início e do procedimento. */
export async function resolveEndsAt(
  tenantId: string,
  startsAt: Date,
  procedureId?: string | null,
): Promise<Date> {
  const procedure = procedureId
    ? await prisma.procedure.findFirst({
        where: { id: procedureId, tenantId },
        select: { durationMin: true, bufferMin: true },
      })
    : null
  const blockMin = (procedure?.durationMin ?? 60) + (procedure?.bufferMin ?? 0)
  return new Date(startsAt.getTime() + blockMin * 60000)
}
