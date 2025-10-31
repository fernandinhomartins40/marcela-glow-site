import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

const slides = [
  {
    image: hero1,
    title: "Beleza Natural Através da Ciência",
    subtitle: "Medicina estética de alta performance com tecnologia e sutileza",
  },
  {
    image: hero2,
    title: "Rejuvenescimento Que Respeita Sua Essência",
    subtitle: "Tratamentos personalizados para realçar sua melhor versão",
  },
  {
    image: hero3,
    title: "Tecnologia Não Invasiva, Resultados Reais",
    subtitle: "T-Sculptor e inovações para seu bem-estar",
  },
];

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {/* Overlay premium */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40" />
          <div className="absolute inset-0 bg-gradient-luxury opacity-20" />
        </div>
      ))}

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 tracking-luxury text-gradient leading-tight">
              {slides[currentSlide].title}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-10 text-foreground/90 font-light leading-relaxed backdrop-blur-sm bg-background/10 py-3 px-6 rounded-2xl inline-block">
              {slides[currentSlide].subtitle}
            </p>
            <Button
              variant="hero"
              size="lg"
              onClick={() => scrollToSection("procedimentos")}
            >
              Conheça os Tratamentos
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full glass-strong flex items-center justify-center hover:scale-110 transition-all duration-500 shadow-medium hover:shadow-glow"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-6 h-6 text-primary" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full glass-strong flex items-center justify-center hover:scale-110 transition-all duration-500 shadow-medium hover:shadow-glow"
        aria-label="Próximo slide"
      >
        <ChevronRight className="w-6 h-6 text-primary" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? "bg-primary w-8" : "bg-background/50"
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
