import { ArrowRight, CircleUserRound, Sparkles, StretchHorizontal, Waves } from "lucide-react";

const areas = [
  { name: "Face", description: "Harmonia, expressão e naturalidade para realçar sua beleza única.", icon: CircleUserRound },
  { name: "Pele", description: "Qualidade, viço e saúde em cada fase, com tratamentos personalizados.", icon: Sparkles },
  { name: "Pescoço", description: "Firmeza e definição para um contorno natural e elegante.", icon: Waves },
  { name: "Corpo", description: "Equilíbrio e bem-estar para você se sentir bem em todas as suas fases.", icon: StretchHorizontal },
];

export default function CareAreas() {
  const goToAppointment = () => document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section aria-labelledby="care-areas-title" className="section-y bg-background">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <header className="mx-auto max-w-3xl text-center">
          <p className="label-eyebrow">Tratamentos</p>
          <h2 id="care-areas-title" className="mt-4 font-display type-section text-primary">Cuidado completo, em todas as fases</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">Procedimentos personalizados para realçar a sua beleza, preservar a sua identidade e cuidar da sua pele com ciência, segurança e naturalidade.</p>
        </header>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map(({ name, description, icon: Icon }, index) => (
            <article key={name} className="group relative overflow-hidden border border-border bg-[hsl(var(--cream-deep))]/45 p-6 transition-colors duration-500 hover:bg-[hsl(var(--cream-deep))]">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_80%_0%,hsl(var(--accent)/.42),transparent_62%)]" aria-hidden="true" />
              <div className="relative flex h-full min-h-64 flex-col">
                <span className="font-display text-xl text-accent/70">0{index + 1}</span>
                <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-full border border-accent/45 bg-background/70 text-accent"><Icon size={22} strokeWidth={1.35} aria-hidden="true" /></span>
                <h3 className="mt-6 font-display text-3xl text-primary">{name}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/65">{description}</p>
                <button type="button" onClick={goToAppointment} className="mt-7 inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-primary underline decoration-accent underline-offset-8 hover:text-accent">
                  Saiba mais <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
