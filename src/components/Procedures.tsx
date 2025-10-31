import { Button } from "@/components/ui/button";
import { Droplet, Sparkles, Zap, Heart, Waves, Shield, Star, Sun } from "lucide-react";

const procedures = [
  {
    icon: Droplet,
    title: "Hidratação Facial Profunda",
    description: "Revitalização intensa da pele com ativos de última geração para brilho natural e duradouro.",
  },
  {
    icon: Sparkles,
    title: "Preenchimento com Ácido Hialurônico",
    description: "Harmonização facial sutil e natural, respeitando suas características únicas.",
  },
  {
    icon: Zap,
    title: "Bioestimuladores de Colágeno",
    description: "Estímulo natural da produção de colágeno para rejuvenescimento progressivo e duradouro.",
  },
  {
    icon: Heart,
    title: "Rejuvenescimento Facial",
    description: "Protocolos personalizados para reduzir sinais de envelhecimento com resultados naturais.",
  },
  {
    icon: Waves,
    title: "T-Sculptor - Remodelagem Corporal",
    description: "Tecnologia não invasiva para definição corporal e redução de gordura localizada.",
  },
  {
    icon: Shield,
    title: "Tratamento de Flacidez",
    description: "Protocolos avançados para firmeza e elasticidade da pele com tecnologia de ponta.",
  },
  {
    icon: Star,
    title: "Harmonização Facial",
    description: "Equilíbrio perfeito entre proporções faciais para um resultado elegante e natural.",
  },
  {
    icon: Sun,
    title: "Protocolo Antienvelhecimento",
    description: "Tratamento completo que combina múltiplas tecnologias para prevenir e tratar o envelhecimento.",
  },
];

const Procedures = () => {
  return (
    <section id="procedimentos" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-wide">
            Nossos Tratamentos
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Procedimentos personalizados para sua beleza natural
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {procedures.map((procedure, index) => (
            <div
              key={index}
              className="bg-card p-8 rounded-2xl shadow-sm hover-lift border border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <procedure.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3 text-foreground">
                {procedure.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {procedure.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center animate-fade-in">
          <Button variant="hero" size="lg">
            Ver Todos os Tratamentos
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Procedures;
