import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AppointmentStatus, PrescriptionStatus } from './api'

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}

/** "12 de agosto de 2026" */
export function formatDate(value: string | Date | null | undefined) {
  const date = toDate(value)
  return date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'
}

/** "12 de agosto, 14h30" — formato curto usado nos cartões */
export function formatDateTime(value: string | Date | null | undefined) {
  const date = toDate(value)
  if (!date) return null
  return format(date, "d 'de' MMMM', ' HH'h'mm", { locale: ptBR })
}

/** "Hoje, 14h30" / "Amanhã, 09h00" / "12 de agosto, 14h30" */
export function formatFriendlyDateTime(value: string | Date | null | undefined) {
  const date = toDate(value)
  if (!date) return null
  const time = format(date, "HH'h'mm", { locale: ptBR })
  if (isToday(date)) return `Hoje, ${time}`
  if (isTomorrow(date)) return `Amanhã, ${time}`
  return format(date, "d 'de' MMMM', ' HH'h'mm", { locale: ptBR })
}

/**
 * "Quinta-feira, 14:00", "Hoje, 14:00" ou, a mais de uma semana, "2 de
 * outubro, 14:00". O dia da semana basta quando a consulta está perto; longe,
 * ele sozinho confunde qual quinta é.
 */
export function formatCardDateTime(value: string | Date | null | undefined) {
  const date = toDate(value)
  if (!date) return null
  const time = format(date, 'HH:mm', { locale: ptBR })
  if (isToday(date)) return `Hoje, ${time}`
  if (isTomorrow(date)) return `Amanhã, ${time}`
  const dias = (date.getTime() - Date.now()) / 86_400_000
  const rotulo = dias > 0 && dias < 7 ? format(date, 'EEEE', { locale: ptBR }) : format(date, "d 'de' MMMM", { locale: ptBR })
  return `${rotulo.charAt(0).toUpperCase()}${rotulo.slice(1)}, ${time}`
}

/** "em 3 dias" / "há 2 meses" */
export function formatRelative(value: string | Date | null | undefined) {
  const date = toDate(value)
  if (!date) return null
  const distance = formatDistanceToNowStrict(date, { locale: ptBR })
  return isPast(date) ? `há ${distance}` : `em ${distance}`
}

type Tone = 'success' | 'warning' | 'info' | 'neutral'

const APPOINTMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Aguardando confirmação', tone: 'warning' },
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  COMPLETED: { label: 'Realizada', tone: 'neutral' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
}

export function appointmentStatus(status: AppointmentStatus) {
  return APPOINTMENT_STATUS[status] ?? { label: String(status), tone: 'neutral' as Tone }
}

const PRESCRIPTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Em preparo', tone: 'neutral' },
  SENT: { label: 'Disponível', tone: 'info' },
  SIGNED: { label: 'Assinada', tone: 'success' },
}

export function prescriptionStatus(status: PrescriptionStatus) {
  return PRESCRIPTION_STATUS[status] ?? { label: String(status), tone: 'neutral' as Tone }
}

export const toneClass: Record<Tone, string> = {
  success: 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]',
  info: 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]',
  neutral: 'bg-secondary text-muted-foreground',
}

export function firstName(fullName: string | null | undefined) {
  if (!fullName) return null
  const name = fullName.trim().split(/\s+/)[0]
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null
}

export function initials(fullName: string | null | undefined) {
  if (!fullName) return 'MD'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'MD'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / 1024 ** exponent
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/** Próxima consulta futura; se não houver, a mais recente pendente. */
export function pickNextAppointment<T extends { scheduledAt: string | null; status: string; createdAt: string }>(
  appointments: T[],
): T | null {
  const active = appointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED')

  const upcoming = active
    .filter((a) => {
      const date = toDate(a.scheduledAt)
      return date && !isPast(date)
    })
    .sort((a, b) => toDate(a.scheduledAt)!.getTime() - toDate(b.scheduledAt)!.getTime())

  if (upcoming.length) return upcoming[0]

  // Sem data marcada ainda: mostra a solicitação mais recente
  const pending = active
    .filter((a) => !a.scheduledAt)
    .sort((a, b) => toDate(b.createdAt)!.getTime() - toDate(a.createdAt)!.getTime())

  return pending[0] ?? null
}
