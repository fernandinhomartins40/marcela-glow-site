import { Check } from "lucide-react";

const Technology = () => {
  return (
    <section id="tecnologias" className="py-16 md:py-32 bg-secondary/20 border-t border-border/70">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-wide">
            Tecnologia e Protocolos Avançados
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Recursos médicos para corpo, pele e regeneração, escolhidos conforme a necessidade de cada paciente
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-10 md:space-y-16">
          {/* T-Sculptor - Principal */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center animate-fade-in">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold mb-4 text-primary">
                T-Sculptor
              </h3>
              <p className="text-base md:text-lg leading-relaxed mb-6 text-foreground/80">
                Tecnologia para escultura corporal que estimula contrações musculares
                de alta intensidade e pode compor protocolos para contorno, firmeza e
                melhora corporal.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Planejamento para abdome, braços, glúteos e contorno corporal</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Associação com bioestimuladores quando há indicação médica</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Estímulo muscular e melhora de definição sem cirurgia</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Plano individual para resultados progressivos e naturais</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="aspect-[4/3] md:aspect-square rounded-lg bg-gradient-to-br from-secondary to-accent overflow-hidden shadow-xl">
                <div className="w-full h-full flex items-center justify-center text-5xl md:text-6xl font-serif text-primary/20">
                  T-S
                </div>
              </div>
            </div>
          </div>

          {/* Tecnologia Facial */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center animate-fade-in">
            <div>
              <div className="aspect-[4/3] md:aspect-square rounded-lg bg-gradient-to-br from-accent to-muted overflow-hidden shadow-xl">
                <div className="w-full h-full flex items-center justify-center text-5xl md:text-6xl font-serif text-primary/20">
                  PE
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold mb-4 text-primary">
                Peptídeos e Qualidade de Pele
              </h3>
              <p className="text-base md:text-lg leading-relaxed mb-6 text-foreground/80">
                Protocolos regenerativos voltados à atividade celular, produção de
                colágeno, reparação tecidual e melhora real da qualidade da pele.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Foco em viço, textura, firmeza e resistência da pele</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Abordagem progressiva, consistente e biologicamente sustentada</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Combinação possível com peelings, skinbooster e bioestimuladores</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Technology;
