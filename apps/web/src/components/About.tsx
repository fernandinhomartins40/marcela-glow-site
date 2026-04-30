import { Button } from "@/components/ui/button";
import draMarcela from "@/assets/dra-marcela-portrait.jpg";

const About = () => {
  return (
    <section id="sobre" className="relative py-16 md:py-40 bg-background overflow-hidden border-t border-border/70">
      {/* Watermark */}
      <span className="absolute -top-10 left-1/2 hidden -translate-x-1/2 text-watermark text-[20vw] lg:text-[14vw] font-display pointer-events-none select-none whitespace-nowrap md:block">
        marcela
      </span>

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-20 items-center max-w-7xl mx-auto">
          {/* Imagem */}
          <div className="lg:col-span-5 relative animate-fade-in">
            <div className="relative aspect-[4/5] max-w-sm mx-auto lg:max-w-none">
              <img
                src={draMarcela}
                alt="Dra. Marcela Duch"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                width={800}
                height={1000}
              />
              <div className="absolute inset-3 border border-[hsl(var(--cream))]/40 pointer-events-none" />
              {/* Tag flutuante */}
              <div className="absolute -bottom-6 -right-6 bg-primary text-primary-foreground px-6 py-4 hidden md:block">
                <p className="text-[0.65rem] tracking-[0.3em] uppercase opacity-70">CRM/MS</p>
                <p className="font-display text-2xl">5691</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="lg:col-span-7 animate-slide-up">
            <p className="label-eyebrow mb-4 md:mb-6">Dra. Marcela Campanini Duch</p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.98] md:leading-[0.95] tracking-normal text-primary mb-2">
              Saúde, beleza
              <span className="block italic font-light text-accent">e naturalidade.</span>
            </h2>

            <div className="divider-luxe my-6 md:my-8" />

            <p className="font-editorial text-lg md:text-2xl leading-relaxed text-foreground/80 mb-6">
              A medicina a seu favor: onde saúde e beleza andam juntas. Cada plano
              é construído com análise médica, estratégia e respeito à identidade de
              cada paciente, buscando qualidade de pele, harmonia e evolução natural.
            </p>

            <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
              {[
                "Médica com CRM/MS 5691 em Chapadão do Sul/MS",
                "Gerenciamento de envelhecimento com foco em naturalidade",
                "Protocolos para face, pele, pescoço, corpo e cabelo",
                "Abordagem integrada entre estética, saúde da pele e bem-estar",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-px bg-accent mt-3 shrink-0" />
                  <p className="text-base text-foreground/75 font-light tracking-wide">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <Button variant="outline" size="lg">
              Conhecer a Abordagem
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
