import { CalendarDays, CalendarPlus, ChevronRight, type LucideIcon } from 'lucide-react'
import type { Appointment } from '@/lib/api'
import { appointmentStatus, formatCardDateTime, formatRelative } from '@/lib/format'
import { StatusChip } from './ui'

/**
 * Cartão de destaque no topo do painel: responde "quando é minha próxima
 * consulta?" sem que a paciente precise rolar ou procurar.
 */
export function NextAppointment({
  appointment,
  onRequest,
  onDetails,
}: {
  appointment: Appointment | null
  onRequest: () => void
  onDetails?: () => void
}) {
  if (!appointment) {
    return (
      <section className="panel panel-pad bg-[hsl(var(--espresso))] border-transparent">
        <p className="label-eyebrow text-[hsl(var(--bronze-light))]">Seu próximo passo</p>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl text-[hsl(var(--cream))]">
          Vamos encontrar o melhor horário para você
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--cream))]/60 leading-relaxed max-w-md">
          Solicite uma avaliação quando estiver pronta. A equipe confirma a melhor
          data com você antes de qualquer reserva.
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
  const when = formatCardDateTime(appointment.scheduledAt)
  const relative = formatRelative(appointment.scheduledAt)
  const title = appointment.procedure?.title ?? 'Consulta de avaliação'

  return (
    <section className="panel panel-pad bg-card shadow-[0_18px_40px_-34px_hsl(var(--espresso)/0.55)]" aria-labelledby="proxima-consulta">
      <div className="flex items-start gap-4 sm:gap-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary sm:h-16 sm:w-16" aria-hidden="true">
          <CalendarDays size={26} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p id="proxima-consulta" className="text-[0.95rem] font-medium text-foreground">Sua próxima consulta</p>
          {when ? (
            <p className="mt-1 font-display text-[1.7rem] leading-tight text-primary sm:text-3xl">{when}</p>
          ) : (
            <p className="mt-1 font-display text-2xl leading-tight text-primary">Aguardando horário</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{title}{relative ? ` · ${relative}` : ''}</p>
          <div className="mt-3"><StatusChip label={status.label} tone={status.tone} /></div>
        </div>
      </div>

      {!when && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Sua solicitação foi recebida. A equipe entrará em contato para confirmar
          a melhor data e horário.
        </p>
      )}

      {appointment.message && (
        <p className="mt-4 pt-4 border-t text-sm text-muted-foreground leading-relaxed">
          {appointment.message}
        </p>
      )}

      {appointment.status === 'PENDING' && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-xs leading-relaxed text-muted-foreground">
          Ainda não é uma reserva confirmada. A equipe está conferindo a agenda e vai avisar você assim que finalizar.
        </p>
      )}
      {onDetails && (
        <button type="button" onClick={onDetails} className="btn mt-5 h-12 w-full justify-center bg-primary text-primary-foreground text-base hover:bg-[hsl(var(--espresso))]">
          Ver detalhes <ChevronRight size={18} aria-hidden="true" />
        </button>
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
