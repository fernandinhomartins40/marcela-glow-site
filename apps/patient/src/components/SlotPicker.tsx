import React from 'react'
import { CalendarX2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAvailability, type DayAvailability, type Slot } from '@/lib/api'
import { cn, EmptyState } from './ui'

function formatDayLabel(day: DayAvailability) {
  const [year, month, dayOfMonth] = day.date.split('-').map(Number)
  const local = new Date(year, month - 1, dayOfMonth)
  return {
    weekday: day.weekdayLabel.replace('-feira', ''),
    date: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(local),
    full: new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(local),
  }
}

/* Com passo de 30 minutos e expediente de 9h às 18h, um dia rende quase vinte
   botões numa grade só. Separar por período dá ao olho um ponto de parada, e é
   o mesmo vocabulário que a equipe usa ao confirmar por WhatsApp. Mesmo
   agrupamento do formulário público, para a paciente reencontrar o que já viu. */
const PERIODS = [
  { id: 'manha', label: 'Manhã', until: 12 },
  { id: 'tarde', label: 'Tarde', until: 18 },
  { id: 'noite', label: 'Noite', until: 24 },
] as const

function groupByPeriod(slots: Slot[]) {
  return PERIODS.map((period, index) => {
    const from = index === 0 ? 0 : PERIODS[index - 1].until
    return {
      ...period,
      slots: slots.filter((slot) => {
        const hour = Number(slot.label.slice(0, 2))
        return hour >= from && hour < period.until
      }),
    }
  }).filter((period) => period.slots.length > 0)
}

/**
 * Escolha de horário em dois passos: primeiro o dia, depois a hora.
 * Evita a lista longa de "todos os horários dos próximos 14 dias".
 */
export function SlotPicker({
  procedureId,
  value,
  onChange,
}: {
  procedureId?: string
  value: string | null
  onChange: (startsAt: string | null) => void
}) {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const trackRef = React.useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: ['availability', procedureId ?? 'default'],
    queryFn: () => fetchAvailability(procedureId),
    staleTime: 60_000,
  })

  const days = query.data ?? []

  // Ao trocar de procedimento a duração muda, então a escolha anterior é descartada
  React.useEffect(() => {
    setSelectedDate(null)
    onChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId])

  // Seleciona o primeiro dia disponível assim que a lista chega
  React.useEffect(() => {
    if (!selectedDate && days.length) setSelectedDate(days[0].date)
  }, [days, selectedDate])

  const activeDay = days.find((day) => day.date === selectedDate) ?? null
  const periods = React.useMemo(
    () => (activeDay ? groupByPeriod(activeDay.slots) : []),
    [activeDay],
  )

  const scrollTrack = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 240, behavior: 'smooth' })
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        Buscando horários disponíveis...
      </div>
    )
  }

  if (query.isError) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Não foi possível carregar os horários. Você pode enviar a solicitação sem
        escolher um horário — a equipe entrará em contato.
      </p>
    )
  }

  if (!days.length) {
    return (
      <div className="border border-border rounded-lg">
        <EmptyState
          icon={CalendarX2}
          title="Sem horários disponíveis"
          description="Envie sua solicitação e a equipe entrará em contato para encontrar a melhor data."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Passo 1 — dia */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Escolha o dia
          </span>
          {/* No toque a fila arrasta com o dedo; no mouse, sem as setas não há
              como saber que ela continua além da borda. */}
          <div className="hidden sm:flex gap-1">
            <button
              type="button"
              onClick={() => scrollTrack(-1)}
              aria-label="Ver dias anteriores"
              className="w-7 h-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollTrack(1)}
              aria-label="Ver próximos dias"
              className="w-7 h-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1"
        >
          {days.map((day) => {
            const { weekday, date, full } = formatDayLabel(day)
            const isActive = day.date === selectedDate
            return (
              <button
                key={day.date}
                type="button"
                aria-pressed={isActive}
                aria-label={`${full} — ${day.slots.length} horários disponíveis`}
                onClick={() => {
                  setSelectedDate(day.date)
                  onChange(null)
                }}
                className={cn(
                  'shrink-0 snap-start w-[4.75rem] py-2.5 rounded-md border text-center transition-colors duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-accent',
                )}
              >
                <span className="block text-[0.65rem] uppercase tracking-wider opacity-75">
                  {weekday}
                </span>
                <span className="block text-sm font-medium mt-0.5">{date}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Passo 2 — hora, agrupada por período */}
      {activeDay && (
        <div className="space-y-4">
          {periods.map((period) => (
            <div key={period.id}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {period.label}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {period.slots.map((slot) => {
                  const isActive = value === slot.startsAt
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => onChange(isActive ? null : slot.startsAt)}
                      aria-pressed={isActive}
                      className={cn(
                        'h-10 rounded-md border text-sm tabular-nums transition-colors duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary font-medium'
                          : 'bg-card border-border hover:border-accent',
                      )}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        O horário fica reservado como <strong className="font-medium">solicitação</strong> até
        a equipe confirmar. Você recebe o aviso aqui no portal.
      </p>
    </div>
  )
}
