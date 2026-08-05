import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { availabilityApi, type DayAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDay(day: DayAvailability) {
  const [year, month, dayOfMonth] = day.date.split("-").map(Number);
  const local = new Date(year, month - 1, dayOfMonth);
  return {
    weekday: day.weekdayLabel.replace("-feira", ""),
    date: new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(local),
  };
}

/**
 * Escolha de horário no formulário público. Segue a paleta escura da seção de
 * agendamento, com dias em fila horizontal e horários em grade.
 */
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

  if (isLoading) {
    return (
      <p className="text-sm text-[hsl(var(--cream))]/50 py-3">
        Buscando horários disponíveis...
      </p>
    );
  }

  if (isError || !days.length) {
    return (
      <p className="text-sm text-[hsl(var(--cream))]/50 py-3 leading-relaxed">
        Envie sua solicitação e entraremos em contato para encontrar o melhor
        horário para você.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const { weekday, date } = formatDay(day);
          const isActive = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                setSelectedDate(day.date);
                onChange(null);
              }}
              className={cn(
                "shrink-0 w-[4.5rem] py-2 border text-center transition-colors duration-300",
                isActive
                  ? "bg-[hsl(var(--cream))] text-[hsl(var(--espresso))] border-[hsl(var(--cream))]"
                  : "border-[hsl(var(--cream))]/25 text-[hsl(var(--cream))]/80 hover:border-[hsl(var(--bronze))]",
              )}
            >
              <span className="block text-[0.6rem] uppercase tracking-[0.15em] opacity-70">
                {weekday}
              </span>
              <span className="block text-sm mt-0.5">{date}</span>
            </button>
          );
        })}
      </div>

      {activeDay && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {activeDay.slots.map((slot) => {
            const isActive = value === slot.startsAt;
            return (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => onChange(isActive ? null : slot.startsAt)}
                aria-pressed={isActive}
                className={cn(
                  "h-10 border text-sm transition-colors duration-300",
                  isActive
                    ? "bg-[hsl(var(--cream))] text-[hsl(var(--espresso))] border-[hsl(var(--cream))]"
                    : "border-[hsl(var(--cream))]/25 text-[hsl(var(--cream))]/80 hover:border-[hsl(var(--bronze))]",
                )}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SlotPicker;
