import { CLINIC_TIMEZONE } from './scheduling'

/**
 * Monta links wa.me com a mensagem já formatada.
 *
 * Não envia nada: devolve a URL para o painel abrir, de modo que a equipe
 * revise o texto antes de mandar. Sem custo e sem depender da API oficial.
 */

/** Formata o telefone no padrão internacional exigido pelo wa.me (só dígitos). */
export function toWhatsAppNumber(phone: string, defaultCountry = '55'): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return null

  // Já veio com código do país
  if (digits.startsWith(defaultCountry) && digits.length >= 12) return digits

  // DDD + número (10 ou 11 dígitos no Brasil)
  if (digits.length === 10 || digits.length === 11) return defaultCountry + digits

  // Número local sem DDD: não dá para inferir com segurança
  if (digits.length < 10) return null

  return digits
}

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function firstName(fullName: string): string {
  const name = (fullName || '').trim().split(/\s+/)[0]
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'tudo bem'
}

export interface AppointmentMessageInput {
  patientName: string
  phone: string
  procedureTitle?: string | null
  scheduledAt?: Date | null
  clinicName: string
  clinicAddress?: string | null
  /** Motivo, usado no cancelamento */
  reason?: string | null
}

export type MessageKind = 'confirmed' | 'rescheduled' | 'cancelled' | 'reminder'

/**
 * Corpo da mensagem. Usa a marcação do WhatsApp (*negrito*, _itálico_).
 */
export function buildMessage(kind: MessageKind, input: AppointmentMessageInput): string {
  const greeting = `Olá, ${firstName(input.patientName)}! 👋`
  const procedure = input.procedureTitle || 'Consulta de avaliação'
  const signature = `_${input.clinicName}_`

  const when = input.scheduledAt
    ? [
        `📅 ${formatDateLong(input.scheduledAt)}`,
        `🕐 ${formatTime(input.scheduledAt)}`,
      ]
    : []

  const address = input.clinicAddress ? [`📍 ${input.clinicAddress}`] : []

  const blocks: string[][] = []

  switch (kind) {
    case 'confirmed':
      blocks.push([greeting])
      blocks.push(['Sua consulta está *confirmada*:'])
      blocks.push([`💎 ${procedure}`, ...when, ...address])
      blocks.push(['Se precisar remarcar, é só nos avisar por aqui.'])
      blocks.push(['Até breve!', signature])
      break

    case 'rescheduled':
      blocks.push([greeting])
      blocks.push(['Sua consulta foi *remarcada*. O novo horário é:'])
      blocks.push([`💎 ${procedure}`, ...when, ...address])
      blocks.push(['Qualquer coisa, estamos à disposição.'])
      blocks.push([signature])
      break

    case 'cancelled':
      blocks.push([greeting])
      blocks.push([
        input.scheduledAt
          ? `Sua consulta de ${formatDateLong(input.scheduledAt)}, às ${formatTime(input.scheduledAt)}, foi *cancelada*.`
          : 'Sua solicitação de consulta foi *cancelada*.',
      ])
      if (input.reason) blocks.push([`Motivo: ${input.reason}`])
      blocks.push(['Quando quiser remarcar, estamos por aqui para encontrar o melhor horário.'])
      blocks.push([signature])
      break

    case 'reminder':
      blocks.push([greeting])
      blocks.push(['Passando para lembrar da sua consulta:'])
      blocks.push([`💎 ${procedure}`, ...when, ...address])
      blocks.push(['Nos vemos em breve!', signature])
      break
  }

  return blocks.map((lines) => lines.join('\n')).join('\n\n')
}

export interface WhatsAppLink {
  url: string | null
  message: string
  /** Motivo de não haver link (telefone ausente ou inválido) */
  unavailableReason?: string
}

/**
 * Remove a marcação do WhatsApp (*negrito*, _itálico_) para reaproveitar o
 * mesmo texto no portal da paciente, onde os asteriscos apareceriam crus.
 */
export function stripWhatsAppMarkup(message: string): string {
  return message.replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1')
}

/** Link pronto para o painel abrir numa nova aba. */
export function buildWhatsAppLink(kind: MessageKind, input: AppointmentMessageInput): WhatsAppLink {
  const message = buildMessage(kind, input)
  const number = toWhatsAppNumber(input.phone)

  if (!number) {
    return {
      url: null,
      message,
      unavailableReason: input.phone
        ? 'Telefone da paciente em formato inválido.'
        : 'Paciente sem telefone cadastrado.',
    }
  }

  return { url: `https://wa.me/${number}?text=${encodeURIComponent(message)}`, message }
}
