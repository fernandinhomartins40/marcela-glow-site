import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const CLINIC_TZ = 'America/Campo_Grande'

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface Appointment {
  id: string
  name: string
  email: string
  phone: string
  message: string | null
  status: AppointmentStatus
  scheduledAt: string | null
  endsAt: string | null
  createdAt: string
  notifiedAt: string | null
  confirmedAt: string | null
  cancelReason: string | null
  source: string | null
  procedure: { id: string; title: string; durationMin?: number } | null
  patient: { id: string; name: string; email: string; phone: string | null } | null
  confirmedBy: { id: string; name: string } | null
}

export interface WhatsAppLink {
  url: string | null
  message: string
  unavailableReason?: string
}

const STATUS_META: Record<AppointmentStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Aguardando', tone: 'warning' },
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  COMPLETED: { label: 'Realizada', tone: 'info' },
}

export function statusMeta(status: AppointmentStatus) {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' }
}

/** Hora local da clínica ("14:30"). */
export function clinicTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parseISO(iso))
}

/** "12 de agosto" */
export function clinicDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TZ,
    day: 'numeric',
    month: 'long',
  }).format(parseISO(iso))
}

/** Minutos desde a meia-noite local — usado para posicionar o card na grade. */
export function minutesFromMidnight(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parseISO(iso))
  const [h, m] = parts.split(':').map(Number)
  return h * 60 + m
}

/** Data local da clínica no formato "2026-08-12". */
export function clinicDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parseISO(iso))
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 6 }, (_, i) => addDays(start, i))
}

export function weekRangeLabel(days: Date[]): string {
  if (!days.length) return ''
  const first = days[0]
  const last = days[days.length - 1]
  const sameMonth = first.getMonth() === last.getMonth()
  return sameMonth
    ? `${format(first, 'd', { locale: ptBR })}–${format(last, "d 'de' MMMM", { locale: ptBR })}`
    : `${format(first, "d 'de' MMM", { locale: ptBR })} – ${format(last, "d 'de' MMM", { locale: ptBR })}`
}

export function dayLabel(date: Date): string {
  return format(date, 'EEEEEE', { locale: ptBR }).toUpperCase()
}

export function fullDayLabel(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/** Agrupa agendamentos por data local. Sem data ficam de fora. */
export function groupByDay(appointments: Appointment[]): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>()
  for (const appointment of appointments) {
    if (!appointment.scheduledAt) continue
    const key = clinicDateKey(appointment.scheduledAt)
    const list = map.get(key)
    if (list) list.push(appointment)
    else map.set(key, [appointment])
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1))
  }
  return map
}

/** Solicitações que aguardam ação da equipe, mais antigas primeiro. */
export function pendingQueue(appointments: Appointment[]): Appointment[] {
  return appointments
    .filter((a) => a.status === 'PENDING')
    .sort((a, b) => {
      // Quem já escolheu horário aparece antes de quem só pediu contato
      if (a.scheduledAt && !b.scheduledAt) return -1
      if (!a.scheduledAt && b.scheduledAt) return 1
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt < b.scheduledAt ? -1 : 1
      return a.createdAt < b.createdAt ? -1 : 1
    })
}

/** Monta o valor de um <input type="datetime-local"> na hora da clínica. */
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const date = parseISO(iso)
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
  return parts.replace(' ', 'T')
}

/**
 * Converte "2026-08-12T14:30" (hora da clínica) para ISO UTC.
 * O input datetime-local não carrega fuso, então o deslocamento é aplicado aqui.
 */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)

  const naive = new Date(Date.UTC(y, m - 1, d, hh, mm))
  // Descobre o offset do fuso para aquele instante e corrige
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(naive)
  const asClinic = new Date(formatted.replace(' ', 'T') + 'Z')
  const offset = asClinic.getTime() - naive.getTime()
  return new Date(naive.getTime() - offset).toISOString()
}

/** Faixa horária exibida na grade semanal. */
export const GRID_START_HOUR = 7
export const GRID_END_HOUR = 20
export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => GRID_START_HOUR + i,
)
