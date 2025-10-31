import { Button } from "@/components/ui/button";
import draMarcela from "@/assets/dra-marcela.jpg";

const About = () => {
  return (
    <section id="sobre" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto">
          {/* Image */}
          <div className="relative animate-fade-in">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-strong border-gradient relative">
              <img
                src={draMarcela}
                alt="Dra. Marcela Duch"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-luxury opacity-10" />
            </div>
            {/* Decorative gradient line */}
            <div className="absolute -right-4 top-1/4 bottom-1/4 w-1 bg-gradient-luxury rounded-full hidden md:block shadow-glow" />
            {/* Floating element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-luxury rounded-full blur-3xl opacity-30 animate-float" />
          </div>

          {/* Content */}
          <div className="animate-slide-up">
            {/* Decorative quotes */}
            <div className="text-8xl font-serif text-primary/10 leading-none mb-4">"</div>
            
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-gradient mb-2 tracking-luxury">
              Dra. Marcela Duch
            </h2>
            <p className="text-xl text-muted-foreground mb-6 font-light">
              Medicina Estética & Regenerativa
            </p>

            <p className="text-lg leading-relaxed mb-8 text-foreground/80">
              Com uma abordagem que une ciência e arte, acredito que a verdadeira beleza está em 
              realçar a sua essência natural. Cada tratamento é cuidadosamente personalizado para 
              respeitar suas características únicas, promovendo resultados naturais e harmoniosos.
            </p>

            <div className="space-y-3 mb-10">
              <div className="flex items-start gap-3">
                <div className="w-1 h-6 bg-primary mt-1" />
                <p className="text-foreground/80">Especialização em Medicina Estética Avançada</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1 h-6 bg-primary mt-1" />
                <p className="text-foreground/80">Expertise em Medicina Regenerativa e Antienvelhecimento</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1 h-6 bg-primary mt-1" />
                <p className="text-foreground/80">Certificação em Tecnologias de Ponta</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1 h-6 bg-primary mt-1" />
                <p className="text-foreground/80">Membro de Sociedades Internacionais de Estética</p>
              </div>
            </div>

            <Button variant="outline" size="lg">
              Saiba Mais
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
