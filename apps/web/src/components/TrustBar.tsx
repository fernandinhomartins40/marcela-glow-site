import { CalendarCheck, Heart, MapPin, Star, Stethoscope, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSection } from "@/hooks/useLanding";

/* Os nomes que o painel oferece (`TRUST_ICONS` na API) e o desenho de cada um. */
const ICONES: Record<string, LucideIcon> = {
  registro: Stethoscope,
  pessoa: UserRound,
  local: MapPin,
  agenda: CalendarCheck,
  coracao: Heart,
  estrela: Star,
};

/* Classes escritas por extenso: o Tailwind só gera o que encontra no código,
   e `lg:grid-cols-${n}` montado em tempo de execução não existiria no CSS. */
const COLUNAS: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

interface TrustContent {
  items: { icon: string; title: string; detail: string }[];
}

const FALLBACK: TrustContent = {
  items: [
    { icon: "registro", title: "CRM/MS 5691", detail: "Registro e ética" },
    { icon: "pessoa", title: "Atendimento personalizado", detail: "Escuta real, planos individuais" },
    { icon: "local", title: "Chapadão do Sul", detail: "Cuidando de você aqui" },
  ],
};

/** Pontos de confiança antes da apresentação da médica: evidência, não promessa. */
export default function TrustBar() {
  const { content, isVisible } = useSection<TrustContent>("TRUST", FALLBACK);
  const items = content.items?.length ? content.items : FALLBACK.items;
  if (!isVisible) return null;

  return (
    <section aria-label="Informações da clínica" className="border-b border-border bg-[hsl(var(--card))]">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <div className={`grid ${COLUNAS[Math.min(items.length, 4)]}`}>
          {items.map(({ icon, title, detail }, index) => {
            const Icon = ICONES[icon] ?? Stethoscope;
            return (
              <div key={index} className="flex min-h-24 items-center gap-5 border-b border-border py-6 last:border-b-0 lg:min-h-28 lg:justify-center lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0">
                <Icon className="h-10 w-10 shrink-0 text-primary lg:h-8 lg:w-8" strokeWidth={1.1} aria-hidden="true" />
                <div>
                  <p className="font-display text-xl text-primary">{title}</p>
                  {detail && <p className="mt-1 text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground">{detail}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
