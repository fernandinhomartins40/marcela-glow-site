import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { testimonialsApi } from "@/lib/api";
import { useSection } from "@/hooks/useLanding";
import background from "@/assets/approved/landing-testimonials-marble-v2.webp";

interface TestimonialsContent {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
}

const FALLBACK: TestimonialsContent = {
  eyebrow: "Depoimentos",
  titleTop: "Quem já",
  titleBottom: "passou por aqui.",
};

const FALLBACK_TESTIMONIALS = [
  { id: "1", authorName: "Ana Paula Silva", text: "Procurei a Dra. Marcela para melhorar a qualidade da pele sem mudar meus traços. O plano foi claro, progressivo e o resultado ficou muito natural.", rating: 5 },
  { id: "2", authorName: "Juliana Mendes", text: "Fiz Botox com uma abordagem global e adorei a leveza do resultado. Meu rosto ficou descansado, sem perder expressão.", rating: 5 },
  { id: "3", authorName: "Carla Rodrigues", text: "O acompanhamento para pescoço e linha mandibular fez muita diferença. Gostei da explicação médica e da estratégia por etapas.", rating: 5 },
  { id: "4", authorName: "Beatriz Costa", text: "Comecei um protocolo corporal com tecnologia e estímulo de colágeno. O atendimento foi cuidadoso e totalmente individualizado.", rating: 5 },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { content, isVisible } = useSection<TestimonialsContent>("TESTIMONIALS", FALLBACK);

  const { data: apiTestimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: testimonialsApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const testimonials = apiTestimonials && apiTestimonials.length > 0
    ? apiTestimonials.map((t) => ({ id: t.id, authorName: t.authorName, text: t.text, rating: t.rating }))
    : FALLBACK_TESTIMONIALS;

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  /* A lista pode encolher entre uma busca e outra; o índice antigo apontaria
     para fora dela. */
  const activeIndex = Math.min(currentIndex, testimonials.length - 1);
  const current = testimonials[activeIndex];

  if (!isVisible) return null;

  const arrowClass =
    "flex h-11 w-11 items-center justify-center rounded-[3px] border border-primary/25 text-primary transition-colors duration-300 hover:bg-primary hover:text-primary-foreground";

  return (
    <section
      id="depoimentos"
      className="relative overflow-hidden bg-[hsl(var(--cream-deep))] py-16 md:py-24"
    >
      <img src={background} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right" />
      <div className="absolute inset-0 bg-background/25" aria-hidden="true" />

      <div className="container relative mx-auto grid max-w-6xl items-center gap-8 px-5 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-10">
        <div className="lg:col-span-5 animate-fade-in">
          <p className="label-eyebrow mb-3">{content.eyebrow}</p>
          <h2 className="font-display type-section text-primary">
            {content.titleTop}
            <span className="block italic font-light text-accent-legible">{content.titleBottom}</span>
          </h2>
        </div>

        <div className="lg:col-span-7 lg:col-start-6 xl:col-span-6 xl:col-start-7">
          <blockquote key={current.id} className="animate-fade-in text-center lg:text-left" aria-live="polite">
            <p className="font-editorial-italic text-[clamp(1.25rem,2.4vw,1.75rem)] leading-[1.4] text-primary max-w-2xl mx-auto lg:mx-0 text-balance">
              &ldquo;{current.text}&rdquo;
            </p>
            <footer className="mt-5 text-[0.7rem] tracking-[0.24em] uppercase text-muted-foreground">
              {current.authorName}
            </footer>
          </blockquote>

          {testimonials.length > 1 && (
            <div className="mt-7 flex items-center justify-center gap-5 lg:justify-start">
              <button type="button" onClick={prev} className={arrowClass} aria-label="Depoimento anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className="flex h-11 w-6 items-center justify-center"
                    aria-label={`Ir para depoimento ${index + 1}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                  >
                    <span className={`block h-1.5 w-1.5 rounded-full transition-colors ${index === activeIndex ? "bg-primary" : "bg-primary/30"}`} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={next} className={arrowClass} aria-label="Próximo depoimento">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
