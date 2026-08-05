import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarX2, Loader2 } from 'lucide-react'
import { fetchAvailability, type DayAvailability } from '@/lib/api'
import { cn, EmptyState } from './ui'

function formatDayLabel(day: DayAvailability): { weekday: string; date: string } {
  const [year, month, dayOfMonth] = day.date.split('-').map(Number)
  const local = new Date(year, month - 1, dayOfMonth)
  return {
    weekday: day.weekdayLabel.replace('-feira', ''),
    date: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(local),
  }
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
      {/* Dias */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {days.map((day) => {
          const { weekday, date } = formatDayLabel(day)
          const isActive = day.date === selectedDate
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                setSelectedDate(day.date)
                onChange(null)
              }}
              className={cn(
                'shrink-0 w-[4.75rem] py-2.5 rounded-md border text-center transition-colors duration-200',
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

      {/* Horários do dia escolhido */}
      {activeDay && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {activeDay.slots.map((slot) => {
            const isActive = value === slot.startsAt
            return (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => onChange(isActive ? null : slot.startsAt)}
                aria-pressed={isActive}
                className={cn(
                  'h-10 rounded-md border text-sm transition-colors duration-200',
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
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        O horário fica reservado como <strong className="font-medium">solicitação</strong> até
        a equipe confirmar. Você recebe o aviso aqui no portal.
      </p>
    </div>
  )
}
