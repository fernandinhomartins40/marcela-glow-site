import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useImage, useLanding, useSection } from "@/hooks/useLanding";
import draEditorial from "@/assets/candidatas/dra-marcela-editorial-limpa-v1.webp";
import draPortrait from "@/assets/candidatas/dra-marcela-portrait-limpa-v1.webp";
import marble from "@/assets/approved/landing-hero-marble-desktop-v2.webp";
import marbleMobile from "@/assets/approved/landing-hero-marble-mobile-v2.webp";

/* As imagens que vêm no build. Cada slide usa a sua enquanto o painel não
   enviar outra — o site nunca abre com espaço vazio no lugar da foto. */
const FALLBACK_IMAGES = [draEditorial, draPortrait, marble];

interface HeroSlide {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  subtitle: string;
  watermark: string;
}

interface HeroContent {
  slides: HeroSlide[];
  primaryCta: string;
  secondaryCta: string;
}

const FALLBACK: HeroContent = {
  slides: [
    {
      eyebrow: "Medicina estética & saúde da pele",
      titleTop: "Beleza com",
      titleBottom: "estratégia",
      subtitle: "Tratamentos personalizados para preservar identidade, melhorar qualidade de pele e acompanhar cada fase com naturalidade.",
      watermark: "PELE",
    },
    {
      eyebrow: "Envelhecimento inteligente",
      titleTop: "Evoluir",
      titleBottom: "sem exageros",
      subtitle: "Gerenciamento de envelhecimento, Botox, bioestimuladores e protocolos regenerativos guiados por análise médica.",
      watermark: "TEMPO",
    },
    {
      eyebrow: "Face · Pele · Pescoço · Corpo",
      titleTop: "Saúde",
      titleBottom: "e beleza",
      subtitle: "A medicina a seu favor: onde saúde, autoestima e naturalidade caminham juntas.",
      watermark: "SAÚDE",
    },
  ],
  primaryCta: "Agendar avaliação",
  secondaryCta: "Mais sobre os procedimentos",
};

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { content, isVisible } = useSection<HeroContent>("HERO", FALLBACK);
  const { data: landing } = useLanding();
  /* O slot do marmore existia na API desde o inicio e ninguem o lia: trocar a
     textura no painel nao mudava nada no site. */
  const fundo = useImage("background.marble", marble, "");
  const slides = content.slides.length ? content.slides : FALLBACK.slides;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + slides.length) % slides.length);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  /* O painel pode reduzir a quantidade de slides enquanto a página está aberta;
     sem isto o índice antigo apontaria para fora da lista. */
  const index = Math.min(currentSlide, slides.length - 1);
  const slide = slides[index];
  // O CMS legado guarda o mesmo título aprovado com a quebra após "Beleza".
  // Recompõe somente essa variação literal, sem sobrescrever outro texto editado.
  const approvedFirstSlideWrap = index === 0
    && slide.titleTop.trim() === "Beleza"
    && slide.titleBottom.trim() === "com estratégia";
  const image = landing?.images?.[`hero.${index}`];
  const portrait = image?.url ?? FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const showPortrait = index % FALLBACK_IMAGES.length !== 2 || Boolean(image?.url);

  if (!isVisible) return null;

  /* Legenda vertical do mockup: fica ao lado do retrato no desktop e sobre a
     borda esquerda da foto no celular. É decoração — o conteúdo já está no
     título e no subtítulo. */
  const pillars = ["Ciência", "Experiência", "Naturalidade"];

  return (
    <section
      id="home"
      className="hero-editorial relative w-full overflow-hidden bg-marble"
    >
      {/* O asset aprovado permanece visível em sua cor original. O CMS pode
          substituir o fundo e cada retrato sem alterar a composição HTML. */}
      {fundo.src === marble ? (
        <picture className="hero-editorial-background" aria-hidden="true">
          <source media="(max-width: 767px)" srcSet={marbleMobile} />
          <img src={marble} alt="" />
        </picture>
      ) : (
        <div
          className="hero-editorial-background bg-cover bg-center"
          style={{ backgroundImage: `url(${fundo.src})` }}
        />
      )}
      {showPortrait && (
        <div className="hero-editorial-photo" key={`img-${index}`}>
          <img
            src={portrait}
            alt={image?.alt ?? "Dra. Marcela Duch"}
            loading="eager"
            fetchPriority={index === 0 ? "high" : "auto"}
          />
        </div>
      )}
      <div className="hero-editorial-shade" aria-hidden="true" />

      <div className="hero-editorial-inner container mx-auto px-5 sm:px-6 lg:px-10">
        <div key={`txt-${index}`} className="hero-editorial-copy animate-slide-up">
          <p className="label-eyebrow">{slide.eyebrow}</p>
          <h1 className="font-display text-primary text-balance">
            <span className="block">{approvedFirstSlideWrap ? "Beleza com" : slide.titleTop}</span>
            <span className="block">{approvedFirstSlideWrap ? "estratégia" : slide.titleBottom}</span>
          </h1>
          <p className="hero-editorial-lead">{slide.subtitle}</p>

          {/* No celular o retrato entra no fluxo, entre o texto e os botões,
              como no mockup. É o mesmo arquivo do desktop: o navegador baixa
              uma vez só. O `alt` vazio evita anunciar a mesma foto duas vezes. */}
          {showPortrait && (
            <div className="hero-editorial-photo-mobile" aria-hidden="true">
              <img src={portrait} alt="" loading="eager" />
              <ul className="hero-editorial-pillars">
                {pillars.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}

          <div className="hero-editorial-actions">
            <Button variant="cta" size="lg" onClick={() => scrollToSection("agendamento")}>
              {content.primaryCta} <ArrowRight aria-hidden="true" />
            </Button>
            {/* Só no celular: no desktop o mockup deixa um caminho único, e
                "Procedimentos" já está no menu logo acima. É utilitário do
                Tailwind, e não regra no CSS, porque o `inline-flex` do botão
                vence qualquer `display` da camada de componentes. */}
            <Button variant="outline" size="lg" className="bg-[hsl(var(--cream))]/55 md:hidden" onClick={() => scrollToSection("procedimentos")}>
              {content.secondaryCta}
            </Button>
          </div>
          <p className="hero-editorial-signature">Saúde · Equilíbrio · Resultados reais</p>
        </div>
      </div>
      <ul className="hero-editorial-watermark" aria-hidden="true">
        {pillars.map((p) => <li key={p}>{p}</li>)}
      </ul>

      {/* Setas */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden w-11 h-11 rounded-full border border-foreground/25 min-[1520px]:flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden w-11 h-11 rounded-full border border-foreground/25 min-[1520px]:flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
        aria-label="Próximo"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Indicador de slides */}
      {slides.length > 1 && (
        <div className="hero-editorial-dots" role="group" aria-label="Slides em destaque">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="flex h-11 w-9 items-center justify-center"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
            >
              <span className={`block h-px transition-all duration-500 ${i === index ? "w-7 bg-primary" : "w-4 bg-primary/35"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;
