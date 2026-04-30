import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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

  return (
    <section id="depoimentos" className="py-16 md:py-32 bg-background border-t border-border/70">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-wide">
            O Que Dizem as Pacientes
          </h2>
        </div>

        <div className="max-w-5xl mx-auto relative">
          {/* Testimonials Slider */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={testimonial.id} className="w-full flex-shrink-0 px-0 md:px-4">
                  <div className="bg-card p-6 sm:p-8 md:p-12 rounded-lg shadow-lg max-w-3xl mx-auto border border-border/50">
                    {/* Quote mark */}
                    <div className="text-5xl md:text-8xl font-serif text-primary/20 leading-none mb-4">"</div>

                    {/* Stars */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                      ))}
                    </div>

                    {/* Testimonial text */}
                    <p className="text-base md:text-xl leading-relaxed mb-8 italic text-foreground/90">
                      {testimonial.text}
                    </p>

                    {/* Name */}
                    <p className="font-semibold text-lg text-foreground">
                      — {testimonial.authorName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 hidden w-12 h-12 rounded-full bg-card shadow-lg md:flex items-center justify-center hover:bg-accent transition-all hover:scale-110"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 hidden w-12 h-12 rounded-full bg-card shadow-lg md:flex items-center justify-center hover:bg-accent transition-all hover:scale-110"
            aria-label="Próximo depoimento"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-2 justify-center mt-10">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? "bg-primary w-8" : "bg-muted"
                }`}
                aria-label={`Ir para depoimento ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
