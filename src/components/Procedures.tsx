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
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-luxury text-gradient">
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
              className="glass p-8 rounded-3xl shadow-soft hover-lift border-gradient animate-fade-in group relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-luxury rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
              <div className="w-16 h-16 rounded-full bg-gradient-luxury flex items-center justify-center mb-6 shadow-medium group-hover:shadow-glow transition-all duration-500 group-hover:scale-110 relative z-10">
                <procedure.icon className="w-8 h-8 text-primary-foreground" strokeWidth={1.5} />
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
