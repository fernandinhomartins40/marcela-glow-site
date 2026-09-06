import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { availabilityApi, type DayAvailability, type Slot } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDay(day: DayAvailability) {
  const [year, month, dayOfMonth] = day.date.split("-").map(Number);
  const local = new Date(year, month - 1, dayOfMonth);
  return {
    weekday: day.weekdayLabel.replace("-feira", ""),
    dayOfMonth: String(dayOfMonth).padStart(2, "0"),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(local)
      .replace(".", ""),
    full: new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(local),
  };
}

/* Com passo de 30 minutos e expediente de 9h às 18h, um dia rende quase vinte
   botões numa grade só. Separar por período dá ao olho um ponto de parada, e é
   o mesmo vocabulário que a equipe usa ao confirmar por WhatsApp. */
const PERIODS = [
  { id: "manha", label: "Manhã", until: 12 },
  { id: "tarde", label: "Tarde", until: 18 },
  { id: "noite", label: "Noite", until: 24 },
] as const;

function groupByPeriod(slots: Slot[]) {
  return PERIODS.map((period, index) => {
    const from = index === 0 ? 0 : PERIODS[index - 1].until;
    return {
      ...period,
      slots: slots.filter((slot) => {
        const hour = Number(slot.label.slice(0, 2));
        return hour >= from && hour < period.until;
      }),
    };
  }).filter((period) => period.slots.length > 0);
}

/**
 * Escolha de horário no formulário público. Mesmo fluxo em dois passos do
 * portal da paciente (primeiro o dia, depois a hora) e mesma fonte de dados
 * (`/appointments/availability`), vestido com a paleta escura da seção.
 */
const SlotPicker = ({
  procedureId,
  value,
  onChange,
  disclaimer,
}: {
  procedureId?: string;
  value: string | null;
  onChange: (startsAt: string | null) => void;
  /** Explica o que acontece depois do envio; vem do painel. */
  disclaimer?: string;
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const { data: days = [], isLoading, isError } = useQuery({
    queryKey: ["availability", procedureId ?? "default"],
    queryFn: () => availabilityApi.list(procedureId),
    staleTime: 60_000,
  });

  // Trocar de procedimento muda a duração, invalidando a escolha anterior
  useEffect(() => {
    setSelectedDate(null);
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId]);

  useEffect(() => {
    if (!selectedDate && days.length) setSelectedDate(days[0].date);
  }, [days, selectedDate]);

  const activeDay = days.find((day) => day.date === selectedDate) ?? null;
  const periods = useMemo(
    () => (activeDay ? groupByPeriod(activeDay.slots) : []),
    [activeDay],
  );

  const scrollTrack = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="border border-[hsl(var(--cream))]/12 bg-[hsl(var(--cream))]/[0.03] p-4 sm:p-5">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[4.25rem] w-[4.5rem] shrink-0 animate-pulse bg-[hsl(var(--cream))]/[0.07]"
              style={{ animationDelay: `${index * 90}ms` }}
            />
          ))}
        </div>
        <p className="mt-4 text-sm font-light text-[hsl(var(--cream))]/45">
          Buscando horários disponíveis...
        </p>
      </div>
    );
  }

  if (isError || !days.length) {
    return (
      <div className="border border-[hsl(var(--cream))]/12 bg-[hsl(var(--cream))]/[0.03] p-4 sm:p-5">
        <p className="text-sm font-light leading-relaxed text-[hsl(var(--cream))]/60">
          {isError
            ? "Não foi possível carregar a agenda agora. Envie sua solicitação e entraremos em contato para encontrar o melhor horário."
            : "Sem horários abertos nos próximos dias. Envie sua solicitação e entraremos em contato para encontrar o melhor horário para você."}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[hsl(var(--cream))]/12 bg-[hsl(var(--cream))]/[0.03]">
      {/* Passo 1 — dia */}
      <div className="border-b border-[hsl(var(--cream))]/10 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-[0.75rem] sm:text-[0.6rem] uppercase tracking-[0.28em] text-[hsl(var(--bronze-light))]">
            Escolha o dia
          </span>
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollTrack(-1)}
              aria-label="Ver dias anteriores"
              className="flex h-7 w-7 items-center justify-center border border-[hsl(var(--cream))]/20 text-[hsl(var(--cream))]/60 transition-colors duration-300 hover:border-[hsl(var(--bronze))] hover:text-[hsl(var(--cream))]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTrack(1)}
              aria-label="Ver próximos dias"
              className="flex h-7 w-7 items-center justify-center border border-[hsl(var(--cream))]/20 text-[hsl(var(--cream))]/60 transition-colors duration-300 hover:border-[hsl(var(--bronze))] hover:text-[hsl(var(--cream))]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* O degradê à direita avisa que a fila continua além da borda */}
        <div className="relative">
          <div
            ref={trackRef}
            className="scrollbar-on-dark flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2"
          >
            {days.map((day) => {
              const { weekday, dayOfMonth, month, full } = formatDay(day);
              const isActive = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${full} — ${day.slots.length} horários disponíveis`}
                  onClick={() => {
                    setSelectedDate(day.date);
                    onChange(null);
                  }}
                  className={cn(
                    "flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-0.5 border py-2.5 transition-colors duration-300",
                    isActive
                      ? "border-[hsl(var(--cream))] bg-[hsl(var(--cream))] text-[hsl(var(--espresso))]"
                      : "border-[hsl(var(--cream))]/20 text-[hsl(var(--cream))]/75 hover:border-[hsl(var(--bronze))] hover:text-[hsl(var(--cream))]",
                  )}
                >
                  <span className="text-[0.75rem] sm:text-[0.55rem] uppercase tracking-[0.2em] opacity-70">
                    {weekday}
                  </span>
                  <span className="font-display text-2xl leading-none">
                    {dayOfMonth}
                  </span>
                  <span className="text-[0.75rem] sm:text-[0.55rem] uppercase tracking-[0.2em] opacity-70">
                    {month}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[hsl(var(--espresso))] to-transparent"
          />
        </div>
      </div>

      {/* Passo 2 — hora */}
      {activeDay && (
        <div className="space-y-5 p-4 sm:p-5">
          {periods.map((period) => (
            <div key={period.id}>
              <div className="mb-2.5 flex items-center gap-3">
                <span className="text-[0.75rem] sm:text-[0.6rem] uppercase tracking-[0.28em] text-[hsl(var(--bronze-light))]">
                  {period.label}
                </span>
                <span className="h-px flex-1 bg-[hsl(var(--cream))]/10" />
              </div>
              <div className="grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-5">
                {period.slots.map((slot) => {
                  const isActive = value === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => onChange(isActive ? null : slot.startsAt)}
                      aria-pressed={isActive}
                      className={cn(
                        "h-10 border text-sm tabular-nums tracking-wide transition-colors duration-300",
                        isActive
                          ? "border-[hsl(var(--cream))] bg-[hsl(var(--cream))] text-[hsl(var(--espresso))]"
                          : "border-[hsl(var(--cream))]/20 text-[hsl(var(--cream))]/75 hover:border-[hsl(var(--bronze))] hover:text-[hsl(var(--cream))]",
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="border-t border-[hsl(var(--cream))]/10 pt-4 text-xs font-light leading-relaxed text-[hsl(var(--cream))]/45">
            {disclaimer ??
              "O horário fica reservado como solicitação até a equipe confirmar — você recebe o aviso por WhatsApp e na Área da Paciente."}
          </p>
        </div>
      )}
    </div>
  );
};

export default SlotPicker;
