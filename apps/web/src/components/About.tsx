import { Button } from "@/components/ui/button";
import { useImage, useSection } from "@/hooks/useLanding";
import draMarcela from "@/assets/candidatas/dra-marcela-portrait-limpa-v1.png";

interface AboutContent {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  lead: string;
  highlights: string[];
  crmLabel: string;
  crmNumber: string;
  ctaLabel: string;
  watermark: string;
}

const FALLBACK: AboutContent = {
  eyebrow: "Dra. Marcela Campanini Duch",
  titleTop: "Saúde, beleza",
  titleBottom: "e naturalidade.",
  lead: "A medicina a seu favor: onde saúde e beleza andam juntas. Cada plano é construído com análise médica, estratégia e respeito à identidade de cada paciente, buscando qualidade de pele, harmonia e evolução natural.",
  highlights: [
    "Médica com CRM/MS 5691 em Chapadão do Sul/MS",
    "Gerenciamento de envelhecimento com foco em naturalidade",
    "Protocolos para face, pele, pescoço, corpo e cabelo",
    "Abordagem integrada entre estética, saúde da pele e bem-estar",
  ],
  crmLabel: "CRM/MS",
  crmNumber: "5691",
  ctaLabel: "Conhecer a Abordagem",
  watermark: "marcela",
};

const About = () => {
  const { content, isVisible } = useSection<AboutContent>("ABOUT", FALLBACK);
  const portrait = useImage("about.portrait", draMarcela, "Dra. Marcela Duch");

  if (!isVisible) return null;

  return (
    <section id="sobre" className="relative section-y bg-background overflow-hidden">
      {/* Watermark — contido dentro da seção, sem invadir o bloco anterior */}
      <span className="absolute top-4 left-1/2 hidden -translate-x-1/2 text-watermark text-[11vw] leading-none font-display pointer-events-none select-none whitespace-nowrap lg:block">
        {content.watermark}
      </span>

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-20 items-center max-w-7xl mx-auto">
          {/* Imagem */}
          <div className="lg:col-span-5 relative animate-fade-in">
            <div className="relative aspect-[4/5] max-w-sm mx-auto lg:max-w-none">
              <img
                src={portrait.src}
                alt={portrait.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                width={800}
                height={1000}
              />
              <div className="absolute inset-3 border border-[hsl(var(--cream))]/40 pointer-events-none" />
              {/* Tag flutuante — tangencia o canto sem cobrir a imagem */}
              <div className="absolute -bottom-5 -right-5 bg-primary text-primary-foreground px-5 py-3.5 hidden lg:block">
                <p className="text-[0.75rem] sm:text-[0.65rem] tracking-[0.3em] uppercase opacity-70">{content.crmLabel}</p>
                <p className="font-display text-2xl">{content.crmNumber}</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="lg:col-span-7 animate-slide-up">
            <p className="label-eyebrow mb-4 md:mb-5">{content.eyebrow}</p>
            <h2 className="font-display type-section text-primary">
              {content.titleTop}
              <span className="block italic font-light text-accent">{content.titleBottom}</span>
            </h2>

            <div className="divider-luxe my-6 md:my-8" />

            <p className="font-editorial type-lead text-foreground/80 mb-6">
              {content.lead}
            </p>

            <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
              {content.highlights.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-px bg-accent mt-3 shrink-0" />
                  <p className="text-base text-foreground/75 font-light tracking-wide">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <Button variant="outline" size="lg">
              {content.ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
