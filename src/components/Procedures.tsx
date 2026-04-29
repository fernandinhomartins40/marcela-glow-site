import { Button } from "@/components/ui/button";

const procedures = [
  {
    number: "01",
    title: "Neck Contour Signature",
    subtitle: "Assinatura exclusiva",
    description: "Protocolo proprietário para contorno e firmeza do pescoço — porque o pescoço entrega o que o rosto não revela.",
  },
  {
    number: "02",
    title: "Harmonização Facial",
    subtitle: "Equilíbrio e proporção",
    description: "Técnica refinada que respeita a anatomia única, devolvendo equilíbrio sem alterar a identidade do rosto.",
  },
  {
    number: "03",
    title: "Bioestimuladores de Colágeno",
    subtitle: "Rejuvenescimento progressivo",
    description: "Estímulo natural à produção de colágeno, com resultados que evoluem ao longo do tempo de forma sutil.",
  },
  {
    number: "04",
    title: "Preenchimento Premium",
    subtitle: "Ácido hialurônico de alta densidade",
    description: "Hidratação profunda, definição de contornos e suavização de linhas com naturalidade absoluta.",
  },
  {
    number: "05",
    title: "T-Sculptor Body",
    subtitle: "Remodelagem corporal não invasiva",
    description: "Tecnologia avançada para definição, firmeza e redução de gordura localizada sem cirurgia.",
  },
  {
    number: "06",
    title: "Skinbooster & Hidratação",
    subtitle: "Glow editorial",
    description: "Pele revitalizada, luminosa e uniforme com ativos de última geração e protocolos personalizados.",
  },
];

const Procedures = () => {
  return (
    <section id="procedimentos" className="relative py-24 md:py-40 bg-secondary/40">
      <div className="container mx-auto px-6 lg:px-10">
        {/* Cabeçalho */}
        <div className="max-w-3xl mb-20 animate-fade-in">
          <p className="label-eyebrow mb-6">Tratamentos exclusivos</p>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-[-0.02em] text-primary">
            Cada tratamento,
            <span className="block italic font-light text-accent">uma assinatura.</span>
          </h2>
          <p className="font-editorial-italic text-xl md:text-2xl text-foreground/70 mt-6 max-w-2xl">
            Protocolos personalizados para realçar sua beleza natural com a sutileza
            que define a medicina estética contemporânea.
          </p>
        </div>

        {/* Grid de procedimentos — estilo editorial */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-y border-border">
          {procedures.map((proc, index) => (
            <article
              key={index}
              className="group relative p-10 lg:p-12 hover:bg-background transition-colors duration-700 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-8">
                <span className="font-display text-3xl text-accent/60 group-hover:text-accent transition-colors">
                  {proc.number}
                </span>
                <span className="label-eyebrow text-xs">
                  {proc.subtitle}
                </span>
              </div>

              <h3 className="font-display text-3xl lg:text-4xl text-primary leading-tight mb-4 group-hover:italic transition-all duration-500">
                {proc.title}
              </h3>

              <p className="text-sm text-foreground/65 leading-relaxed font-light mb-8">
                {proc.description}
              </p>

              <button className="link-underline text-[0.7rem] tracking-[0.3em] uppercase text-accent font-medium">
                Saiba mais
              </button>
            </article>
          ))}
        </div>

        <div className="text-center mt-16 animate-fade-in">
          <Button variant="cta" size="lg">
            Ver Todos os Tratamentos
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Procedures;
