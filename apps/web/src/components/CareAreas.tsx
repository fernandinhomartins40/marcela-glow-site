import { ArrowRight, CircleUserRound, Sparkles, StretchHorizontal, Waves } from "lucide-react";
import face from "@/assets/approved/treatment-face-v2.png";
import skin from "@/assets/approved/treatment-skin-v2.png";
import neck from "@/assets/approved/treatment-neck-v2.png";
import body from "@/assets/approved/treatment-body-v2.png";

const areas = [
  { name: "Face", description: "Harmonia, expressão e naturalidade para realçar sua beleza única.", icon: CircleUserRound, image: face, alt: "Olho e pele em close" },
  { name: "Pele", description: "Qualidade, viço e saúde em cada fase, com tratamentos personalizados.", icon: Sparkles, image: skin, alt: "Textura natural de pele em close" },
  { name: "Pescoço", description: "Firmeza e definição para um contorno natural e elegante.", icon: Waves, image: neck, alt: "Pescoço e colo em close" },
  { name: "Corpo", description: "Equilíbrio e bem-estar para você se sentir bem em todas as suas fases.", icon: StretchHorizontal, image: body, alt: "Ombro e colo em close" },
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
          {areas.map(({ name, description, icon: Icon, image, alt }) => (
            <article key={name} className="group overflow-hidden rounded-sm border border-border bg-[hsl(var(--cream-deep))]/45 transition-colors duration-500 hover:bg-[hsl(var(--cream-deep))]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                <span className="absolute bottom-0 left-1/2 flex h-12 w-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-accent/45 bg-background text-accent shadow-sm"><Icon size={22} strokeWidth={1.35} aria-hidden="true" /></span>
              </div>
              <div className="flex min-h-64 flex-col px-6 pb-6 pt-10 text-center">
                <h3 className="font-display text-3xl text-primary">{name}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/65">{description}</p>
                <button type="button" onClick={goToAppointment} className="mx-auto mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline decoration-accent underline-offset-8 hover:text-accent">
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
