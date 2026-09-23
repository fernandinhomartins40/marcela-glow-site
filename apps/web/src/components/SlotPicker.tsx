import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { availabilityApi, type DayAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDay(day: DayAvailability) {
  const [year, month, dayOfMonth] = day.date.split("-").map(Number);
  const local = new Date(year, month - 1, dayOfMonth);
  return {
    /* "Qui", "Sex": com três letras cabem quatro dias lado a lado, como no mockup. */
    weekday: day.weekdayLabel.replace("-feira", "").slice(0, 3),
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

/**
 * Escolha de horário no formulário público. Mesmo fluxo em dois passos do
 * portal da paciente (primeiro o dia, depois a hora) e mesma fonte de dados
 * (`/appointments/availability`), vestido com a paleta escura da seção.
 *
 * Desenho do mockup aprovado: os dias à esquerda e os horários do dia
 * escolhido à direita, lado a lado — o formulário cabe numa tela em vez de
 * empilhar dois blocos. No celular as duas metades empilham.
 */
const box = "rounded-[3px] border border-[hsl(var(--cream))]/15 bg-[hsl(var(--cream))]/[0.03] p-3";

const SlotPicker = ({
  procedureId,
  value,
  onChange,
}: {
  procedureId?: string;
  value: string | null;
  onChange: (startsAt: string | null) => void;
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

  const scrollTrack = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className={box}>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[4.25rem] w-16 shrink-0 animate-pulse rounded-[3px] bg-[hsl(var(--cream))]/[0.07]"
              style={{ animationDelay: `${index * 90}ms` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-[hsl(var(--cream))]/65">Buscando horários disponíveis...</p>
      </div>
    );
  }

  if (isError || !days.length) {
    return (
      <div className={box}>
        <p className="text-sm leading-relaxed text-[hsl(var(--cream))]/75">
          {isError
            ? "Não foi possível carregar a agenda agora. Envie sua solicitação e entraremos em contato para encontrar o melhor horário."
            : "Sem horários abertos nos próximos dias. Envie sua solicitação e entraremos em contato para encontrar o melhor horário para você."}
        </p>
      </div>
    );
  }

  const arrow =
    "flex h-11 w-9 shrink-0 items-center justify-center rounded-[3px] text-[hsl(var(--cream))]/70 transition-colors hover:bg-[hsl(var(--cream))]/10 hover:text-[hsl(var(--cream))]";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      {/* Passo 1 — dia */}
      <div className={`${box} flex items-center gap-1`}>
        <button type="button" onClick={() => scrollTrack(-1)} aria-label="Ver dias anteriores" className={arrow}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div ref={trackRef} className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  "flex w-[3.25rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-[3px] border py-2 transition-colors duration-300",
                  isActive
                    ? "border-[hsl(var(--cream))] bg-[hsl(var(--cream))] text-[hsl(var(--espresso))]"
                    : "border-[hsl(var(--cream))]/20 text-[hsl(var(--cream))]/80 hover:border-[hsl(var(--bronze-light))] hover:text-[hsl(var(--cream))]",
                )}
              >
                <span className="text-[0.65rem] capitalize">{weekday}</span>
                <span className="text-[0.6rem] uppercase tracking-wide opacity-75">{month}</span>
                <span className="font-display text-xl leading-none">{dayOfMonth}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => scrollTrack(1)} aria-label="Ver próximos dias" className={arrow}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Passo 2 — hora. Uma grade só, com rolagem própria quando o dia tem
          muitos horários: a altura acompanha a caixa dos dias. */}
      <div className={box}>
        {activeDay && activeDay.slots.length > 0 ? (
          <div className="scrollbar-on-dark grid max-h-[9.75rem] grid-cols-3 md:max-h-[8.5rem] gap-2 overflow-y-auto pr-1">
            {activeDay.slots.map((slot) => {
              const isActive = value === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => onChange(isActive ? null : slot.startsAt)}
                  aria-pressed={isActive}
                  className={cn(
                    "h-11 rounded-[3px] border text-sm tabular-nums transition-colors duration-300 md:h-9",
                    isActive
                      ? "border-[hsl(var(--cream))] bg-[hsl(var(--cream))] text-[hsl(var(--espresso))]"
                      : "border-[hsl(var(--cream))]/20 text-[hsl(var(--cream))]/80 hover:border-[hsl(var(--bronze-light))] hover:text-[hsl(var(--cream))]",
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-sm text-[hsl(var(--cream))]/70">Escolha um dia para ver os horários.</p>
        )}
      </div>
    </div>
  );
};

export default SlotPicker;
