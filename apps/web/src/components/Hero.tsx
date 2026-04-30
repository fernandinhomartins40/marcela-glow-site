import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import draEditorial from "@/assets/dra-marcela-editorial.jpg";
import draPortrait from "@/assets/dra-marcela-portrait.jpg";
import marble from "@/assets/marble-texture.jpg";

const slides = [
  {
    image: draEditorial,
    eyebrow: "Medicina estética & saúde da pele",
    titleTop: "Beleza",
    titleBottom: "com estratégia",
    subtitle: "Tratamentos personalizados para preservar identidade, melhorar qualidade de pele e acompanhar cada fase com naturalidade.",
    watermark: "PELE",
  },
  {
    image: draPortrait,
    eyebrow: "Envelhecimento inteligente",
    titleTop: "Evoluir",
    titleBottom: "sem exageros",
    subtitle: "Gerenciamento de envelhecimento, Botox, bioestimuladores e protocolos regenerativos guiados por análise médica.",
    watermark: "TEMPO",
  },
  {
    image: marble,
    eyebrow: "Face · Pele · Pescoço · Corpo",
    titleTop: "Saúde",
    titleBottom: "e beleza",
    subtitle: "A medicina a seu favor: onde saúde, autoestima e naturalidade caminham juntas.",
    watermark: "SAÚDE",
  },
];

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + slides.length) % slides.length);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  const slide = slides[currentSlide];

  return (
    <section
      id="home"
      className="relative min-h-[100svh] w-full overflow-hidden bg-marble"
    >
      {/* Marble base background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: `url(${marble})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/60" />

      {/* Watermark gigante */}
      <div className="absolute inset-0 hidden items-center justify-center pointer-events-none overflow-hidden sm:flex">
        <span
          key={`wm-${currentSlide}`}
          className="text-watermark font-display text-[28vw] md:text-[22vw] lg:text-[18vw] whitespace-nowrap animate-fade-in select-none"
        >
          {slide.watermark}
        </span>
      </div>

      {/* Conteúdo principal */}
      <div className="relative container mx-auto px-5 sm:px-6 lg:px-10 min-h-[100svh] flex items-center pt-24 pb-24 md:pt-28 md:pb-20">
        <div className="grid lg:grid-cols-12 gap-6 md:gap-8 w-full items-center">
          {/* Texto à esquerda */}
          <div className="lg:col-span-7 z-10 order-2 lg:order-1">
            <div key={`txt-${currentSlide}`} className="animate-slide-up">
              <p className="label-eyebrow mb-4 md:mb-6">{slide.eyebrow}</p>
              <h1 className="font-display text-6xl min-[380px]:text-7xl sm:text-8xl md:text-9xl lg:text-[9rem] xl:text-[11rem] leading-[0.9] lg:leading-[0.85] tracking-normal text-primary">
                <span className="block">{slide.titleTop}</span>
                <span className="block italic font-light">{slide.titleBottom}</span>
              </h1>
              <p className="font-editorial-italic text-lg md:text-2xl lg:text-3xl text-foreground/70 mt-5 md:mt-6 max-w-xl leading-snug">
                {slide.subtitle}
              </p>
              <div className="grid sm:flex sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-10">
                <Button
                  variant="cta"
                  size="lg"
                  onClick={() => scrollToSection("agendamento")}
                >
                  Agendar Avaliação
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => scrollToSection("procedimentos")}
                >
                  Conheça os Protocolos
                </Button>
              </div>
            </div>
          </div>

          {/* Imagem à direita */}
          <div className="lg:col-span-5 z-10 order-1 lg:order-2">
            <div
              key={`img-${currentSlide}`}
              className="relative aspect-[4/5] max-w-[72vw] min-[420px]:max-w-xs sm:max-w-sm md:max-w-md mx-auto lg:max-w-none animate-reveal"
            >
              <img
                src={slide.image}
                alt={`${slide.titleTop} ${slide.titleBottom}`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
              {/* Borda dupla editorial */}
              <div className="absolute inset-3 border border-cream/40 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Setas */}
      <button
        onClick={prevSlide}
        className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 hidden w-11 h-11 border border-foreground/30 md:flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 hidden w-11 h-11 border border-foreground/30 md:flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
        aria-label="Próximo"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Indicador de slides */}
      <div className="absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-px transition-all duration-500 ${
              i === currentSlide ? "w-12 bg-primary" : "w-6 bg-primary/30"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
        <span className="ml-3 text-[0.65rem] tracking-[0.3em] uppercase text-muted-foreground">
          {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
};

export default Hero;
