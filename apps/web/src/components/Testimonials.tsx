import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { testimonialsApi } from "@/lib/api";

const FALLBACK_TESTIMONIALS = [
  { id: "1", authorName: "Ana Paula Silva", text: "Procurei a Dra. Marcela para melhorar a qualidade da pele sem mudar meus traços. O plano foi claro, progressivo e o resultado ficou muito natural.", rating: 5 },
  { id: "2", authorName: "Juliana Mendes", text: "Fiz Botox com uma abordagem global e adorei a leveza do resultado. Meu rosto ficou descansado, sem perder expressão.", rating: 5 },
  { id: "3", authorName: "Carla Rodrigues", text: "O acompanhamento para pescoço e linha mandibular fez muita diferença. Gostei da explicação médica e da estratégia por etapas.", rating: 5 },
  { id: "4", authorName: "Beatriz Costa", text: "Comecei um protocolo corporal com tecnologia e estímulo de colágeno. O atendimento foi cuidadoso e totalmente individualizado.", rating: 5 },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const current = testimonials[currentIndex];

  return (
    <section
      id="depoimentos"
      className="relative section-y bg-[hsl(var(--cream-deep))] border-y border-border overflow-hidden"
    >
      {/* Watermark */}
      <span className="absolute top-4 left-1/2 hidden -translate-x-1/2 text-watermark text-[10vw] leading-none font-display pointer-events-none select-none whitespace-nowrap lg:block">
        pacientes
      </span>

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative">
        <div className="max-w-3xl section-head animate-fade-in">
          <p className="label-eyebrow mb-4 md:mb-5">Depoimentos</p>
          <h2 className="font-display type-section text-primary">
            O que dizem
            <span className="block italic font-light text-accent">as pacientes.</span>
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Citação editorial */}
          <blockquote key={current.id} className="animate-fade-in text-center">
            <span
              aria-hidden="true"
              className="font-display block text-6xl md:text-8xl text-accent/30 leading-none mb-2 select-none"
            >
              &ldquo;
            </span>

            <p className="font-editorial-italic text-[clamp(1.4rem,3.2vw,2.4rem)] leading-[1.3] text-foreground/85 max-w-3xl mx-auto text-balance">
              {current.text}
            </p>

            <footer className="mt-8 md:mt-12">
              <div className="divider-luxe mb-5" />
              <p className="text-[0.7rem] tracking-[0.3em] uppercase text-primary font-medium">
                {current.authorName}
              </p>
            </footer>
          </blockquote>

          {/* Navegação */}
          <div className="flex items-center justify-center gap-6 mt-10 md:mt-16">
            <button
              onClick={prev}
              className="w-11 h-11 border border-foreground/25 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-500"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-px transition-all duration-500 ${
                    index === currentIndex ? "w-10 bg-primary" : "w-5 bg-primary/30"
                  }`}
                  aria-label={`Ir para depoimento ${index + 1}`}
                />
              ))}
              <span className="ml-2 text-[0.65rem] tracking-[0.3em] uppercase text-muted-foreground">
                {String(currentIndex + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
              </span>
            </div>

            <button
              onClick={next}
              className="w-11 h-11 border border-foreground/25 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-500"
              aria-label="Próximo depoimento"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
