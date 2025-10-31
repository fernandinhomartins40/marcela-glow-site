import { Check } from "lucide-react";

const Technology = () => {
  return (
    <section id="tecnologias" className="py-20 md:py-32 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-wide">
            Tecnologia de Ponta
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Equipamentos de última geração para resultados superiores
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-16">
          {/* T-Sculptor - Principal */}
          <div className="grid md:grid-cols-2 gap-12 items-center animate-fade-in">
            <div className="order-2 md:order-1">
              <h3 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-primary">
                T-Sculptor
              </h3>
              <p className="text-lg leading-relaxed mb-6 text-foreground/80">
                A mais avançada tecnologia para remodelagem corporal não invasiva. 
                O T-Sculptor combina múltiplas frequências para resultados visíveis 
                desde as primeiras sessões, sem dor e sem tempo de recuperação.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Redução de gordura localizada de forma eficaz e segura</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Tratamento de flacidez com resultados duradouros</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Definição de contorno corporal sem cirurgia</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Procedimento confortável e sem tempo de recuperação</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-secondary to-accent overflow-hidden shadow-xl">
                <div className="w-full h-full flex items-center justify-center text-6xl font-serif text-primary/20">
                  T-S
                </div>
              </div>
            </div>
          </div>

          {/* Tecnologia Facial */}
          <div className="grid md:grid-cols-2 gap-12 items-center animate-fade-in">
            <div>
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-accent to-muted overflow-hidden shadow-xl">
                <div className="w-full h-full flex items-center justify-center text-6xl font-serif text-primary/20">
                  RF
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-primary">
                Radiofrequência Fracionada
              </h3>
              <p className="text-lg leading-relaxed mb-6 text-foreground/80">
                Tecnologia avançada de radiofrequência para rejuvenescimento facial profundo, 
                estimulando a produção natural de colágeno e elastina.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Lifting facial não cirúrgico com resultados naturais</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Redução de linhas finas e rugas profundas</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground/80">Melhora da textura e firmeza da pele</p>
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
