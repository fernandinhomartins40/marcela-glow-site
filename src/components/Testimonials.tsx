import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    name: "Ana Paula Silva",
    text: "A Dra. Marcela transformou minha autoestima! O tratamento foi super personalizado e os resultados foram além das minhas expectativas. Ela tem um olhar único para realçar a beleza natural.",
    rating: 5,
  },
  {
    name: "Juliana Mendes",
    text: "Profissional extremamente competente e atenciosa. O ambiente da clínica é maravilhoso e os procedimentos são realizados com todo cuidado e tecnologia de ponta. Super recomendo!",
    rating: 5,
  },
  {
    name: "Carla Rodrigues",
    text: "Fiz o tratamento com T-Sculptor e estou impressionada com os resultados! A Dra. Marcela explicou todo o processo com muita paciência e o resultado ficou incrível, muito natural.",
    rating: 5,
  },
  {
    name: "Beatriz Costa",
    text: "Há anos procurava uma médica que entendesse minha necessidade de manter a naturalidade. A Dra. Marcela é simplesmente perfeita! Técnica impecável e resultado harmonioso.",
    rating: 5,
  },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="depoimentos" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-wide">
            O Que Dizem Nossas Pacientes
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
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <div className="bg-card p-10 md:p-12 rounded-2xl shadow-lg max-w-3xl mx-auto border border-border/50">
                    {/* Quote mark */}
                    <div className="text-7xl md:text-8xl font-serif text-primary/20 leading-none mb-4">"</div>
                    
                    {/* Stars */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                      ))}
                    </div>

                    {/* Testimonial text */}
                    <p className="text-lg md:text-xl leading-relaxed mb-8 italic text-foreground/90">
                      {testimonial.text}
                    </p>

                    {/* Name */}
                    <p className="font-semibold text-lg text-foreground">
                      — {testimonial.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-accent transition-all hover:scale-110"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-accent transition-all hover:scale-110"
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
