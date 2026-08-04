import { CalendarDays, CalendarPlus, Clock, type LucideIcon } from 'lucide-react'
import type { Appointment } from '@/lib/api'
import { appointmentStatus, formatFriendlyDateTime, formatRelative, toneClass } from '@/lib/format'
import { cn, StatusChip } from './ui'

/**
 * Cartão de destaque no topo do painel: responde "quando é minha próxima
 * consulta?" sem que a paciente precise rolar ou procurar.
 */
export function NextAppointment({
  appointment,
  onRequest,
}: {
  appointment: Appointment | null
  onRequest: () => void
}) {
  if (!appointment) {
    return (
      <section className="panel panel-pad bg-[hsl(var(--espresso))] border-transparent">
        <p className="label-eyebrow text-[hsl(var(--bronze-light))]">Próxima consulta</p>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl text-[hsl(var(--cream))]">
          Nenhuma consulta agendada
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--cream))]/60 leading-relaxed max-w-md">
          Quando quiser, solicite um horário e a equipe entrará em contato para
          confirmar a data.
        </p>
        <button
          onClick={onRequest}
          className="btn mt-6 h-11 px-5 bg-[hsl(var(--cream))] text-[hsl(var(--espresso))] hover:bg-[hsl(var(--bronze-light))]"
        >
          <CalendarPlus size={16} aria-hidden="true" />
          Solicitar horário
        </button>
      </section>
    )
  }

  const status = appointmentStatus(appointment.status)
  const when = formatFriendlyDateTime(appointment.scheduledAt)
  const relative = formatRelative(appointment.scheduledAt)
  const title = appointment.procedure?.title ?? 'Consulta de avaliação'

  return (
    <section className="panel panel-pad bg-[hsl(var(--espresso))] border-transparent">
      <div className="flex flex-wrap items-center gap-3">
        <p className="label-eyebrow text-[hsl(var(--bronze-light))]">Próxima consulta</p>
        <span className={cn('chip', toneClass[status.tone])}>{status.label}</span>
      </div>

      <h2 className="mt-3 font-display text-2xl sm:text-3xl text-[hsl(var(--cream))]">{title}</h2>

      {when ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[hsl(var(--cream))]/85">
          <span className="inline-flex items-center gap-2 text-[0.95rem]">
            <CalendarDays size={16} className="text-[hsl(var(--bronze-light))]" aria-hidden="true" />
            {when}
          </span>
          {relative && (
            <span className="inline-flex items-center gap-2 text-sm text-[hsl(var(--cream))]/55">
              <Clock size={15} className="text-[hsl(var(--bronze-light))]" aria-hidden="true" />
              {relative}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[hsl(var(--cream))]/60 leading-relaxed max-w-md">
          Sua solicitação foi recebida. A equipe entrará em contato para confirmar
          a melhor data e horário.
        </p>
      )}

      {appointment.message && (
        <p className="mt-4 pt-4 border-t border-[hsl(var(--cream))]/15 text-sm text-[hsl(var(--cream))]/60 leading-relaxed">
          {appointment.message}
        </p>
      )}
    </section>
  )
}

export function SummaryStat({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: number
  onClick?: () => void
}) {
  const inner = (
    <>
      <Icon size={17} className="text-accent" aria-hidden="true" />
      <span className="stat-figure mt-3 block">{value}</span>
      <span className="mt-1.5 block text-sm text-muted-foreground">{label}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="panel panel-pad text-left transition-colors hover:bg-secondary/50"
      >
        {inner}
      </button>
    )
  }

  return <div className="panel panel-pad">{inner}</div>
}
