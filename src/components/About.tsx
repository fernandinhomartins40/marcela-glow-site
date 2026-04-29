import { Button } from "@/components/ui/button";
import draMarcela from "@/assets/dra-marcela-portrait.jpg";

const About = () => {
  return (
    <section id="sobre" className="relative py-24 md:py-40 bg-background overflow-hidden">
      {/* Watermark */}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-watermark text-[20vw] lg:text-[14vw] font-display pointer-events-none select-none whitespace-nowrap">
        marcela
      </span>

      <div className="container mx-auto px-6 lg:px-10 relative">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
          {/* Imagem */}
          <div className="lg:col-span-5 relative animate-fade-in">
            <div className="relative aspect-[4/5]">
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
            <p className="label-eyebrow mb-6">Sobre a médica</p>
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.02em] text-primary mb-2">
              Ciência, arte
              <span className="block italic font-light text-accent">e sutileza.</span>
            </h2>

            <div className="divider-luxe my-8" />

            <p className="font-editorial text-xl md:text-2xl leading-relaxed text-foreground/80 mb-6">
              Acredito que a verdadeira beleza está em realçar a sua essência natural.
              Cada tratamento é cuidadosamente personalizado para respeitar suas
              características únicas, promovendo resultados naturais e harmoniosos.
            </p>

            <div className="space-y-4 mb-10">
              {[
                "Especialização em Medicina Estética Avançada",
                "Expertise em Medicina Regenerativa e Antienvelhecimento",
                "Certificação em Tecnologias de Ponta",
                "Membro de Sociedades Internacionais de Estética",
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
              Conhecer Trajetória
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
