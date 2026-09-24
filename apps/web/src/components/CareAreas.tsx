import { ArrowRight, CircleUserRound, Flower2, HeartPulse, Sparkles, StretchHorizontal, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanding, useSection } from "@/hooks/useLanding";
import face from "@/assets/approved/treatment-face-v2.webp";
import skin from "@/assets/approved/treatment-skin-v2.webp";
import neck from "@/assets/approved/treatment-neck-v2.webp";
import body from "@/assets/approved/treatment-body-v2.webp";

/* Os nomes que o painel oferece (`CARE_ICONS` na API) e o desenho de cada um. */
const ICONES: Record<string, LucideIcon> = {
  rosto: CircleUserRound,
  pele: Sparkles,
  pescoco: Waves,
  corpo: StretchHorizontal,
  cabelo: Flower2,
  bemestar: HeartPulse,
};

/* Foto de cada cartão enquanto o painel não enviar outra (`care.0` a `care.3`). */
const FOTOS_DO_BUILD = [face, skin, neck, body];

interface CareContent {
  eyebrow: string;
  title: string;
  lead: string;
  items: { name: string; description: string; icon: string; alt: string }[];
}

const FALLBACK: CareContent = {
  eyebrow: "Tratamentos",
  title: "Cuidado completo, em todas as fases",
  lead: "Procedimentos personalizados para realçar a sua beleza, preservar a sua identidade e cuidar da sua pele com ciência, segurança e naturalidade.",
  items: [
    { name: "Face", description: "Harmonia, expressão e naturalidade para realçar sua beleza única.", icon: "rosto", alt: "Olho e pele em close" },
    { name: "Pele", description: "Qualidade, viço e saúde em cada fase, com tratamentos personalizados.", icon: "pele", alt: "Textura natural de pele em close" },
    { name: "Pescoço", description: "Firmeza e definição para um contorno natural e elegante.", icon: "pescoco", alt: "Pescoço e colo em close" },
    { name: "Corpo", description: "Equilíbrio e bem-estar para você se sentir bem em todas as suas fases.", icon: "corpo", alt: "Ombro e colo em close" },
  ],
};

/* Classes por extenso: o Tailwind não gera classe montada em tempo de execução. */
const COLUNAS: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

export default function CareAreas() {
  const { content, isVisible } = useSection<CareContent>("CARE", FALLBACK);
  const { data: landing } = useLanding();
  const items = content.items?.length ? content.items : FALLBACK.items;
  const goToAppointment = () => document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth" });
  if (!isVisible) return null;

  return (
    <section aria-labelledby="care-areas-title" className="section-y bg-background">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <header className="mx-auto max-w-3xl text-center">
          <p className="label-eyebrow label-rule justify-center">{content.eyebrow}</p>
          <h2 id="care-areas-title" className="mt-4 font-display type-section text-primary">{content.title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">{content.lead}</p>
        </header>
        <div className={`mt-10 grid gap-4 sm:grid-cols-2 ${COLUNAS[Math.min(items.length, 4)]}`}>
          {items.map(({ name, description, icon, alt }, index) => {
            const Icon = ICONES[icon] ?? Sparkles;
            const enviada = landing?.images?.[`care.${index}`];
            const foto = enviada?.url ?? FOTOS_DO_BUILD[index % FOTOS_DO_BUILD.length];
            return (
              <article key={index} className="group overflow-hidden rounded-md bg-[hsl(var(--cream-deep))]/50 shadow-[0_18px_40px_-32px_hsl(var(--espresso)/0.6)] transition-colors duration-500 hover:bg-[hsl(var(--cream-deep))]/80">
                <div className="relative aspect-[16/10] sm:aspect-[4/3]">
                  <div className="absolute inset-0 overflow-hidden rounded-t-md">
                    <img src={foto} alt={enviada?.alt || alt || name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                  </div>
                  <span className="absolute bottom-0 left-1/2 flex h-12 w-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-accent/50 bg-[hsl(var(--card))] text-[hsl(var(--bronze))] shadow-sm"><Icon size={22} strokeWidth={1.2} aria-hidden="true" /></span>
                </div>
                <div className="flex flex-col px-6 pb-5 pt-10 text-center sm:min-h-60">
                  <h3 className="font-display text-3xl text-primary">{name}</h3>
                  <p className="mx-auto mt-3 max-w-[24ch] flex-1 text-sm leading-relaxed text-foreground/70">{description}</p>
                  <button type="button" onClick={goToAppointment} className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:text-[hsl(var(--bronze))]">
                    Saiba mais <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
