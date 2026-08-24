import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { proceduresApi } from "@/lib/api";
import { useSection } from "@/hooks/useLanding";

interface ProceduresContent {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  lead: string;
  ctaLabel: string;
}

const FALLBACK: ProceduresContent = {
  eyebrow: "Protocolos médicos",
  titleTop: "Medicina estética,",
  titleBottom: "com estratégia.",
  lead: "Face, pele, pescoço, corpo e cabelo tratados com plano individual, naturalidade e acompanhamento médico.",
  ctaLabel: "Ver Todos os Protocolos",
};

/* Os protocolos têm cadastro próprio no painel; esta lista é o que o site
   mostra enquanto a API não responde. */
const FALLBACK_PROCEDURES = [
  {
    number: "01",
    title: "Gerenciamento de Envelhecimento",
    subtitle: "Prevenção e manutenção",
    description: "Acompanhamento estratégico para preservar identidade, melhorar viço, firmeza, textura e contorno ao longo do tempo.",
  },
  {
    number: "02",
    title: "Botox Full Face",
    subtitle: "Toxina botulínica",
    description: "Tratamento global para suavizar expressões, equilibrar forças musculares e abordar pontos como sorriso gengival, queixo, asas nasais e pescoço.",
  },
  {
    number: "03",
    title: "Peptídeos e Regeneração Celular",
    subtitle: "Estética inteligente",
    description: "Protocolos com foco em atividade celular, reparação tecidual, longevidade da pele e estímulo progressivo de colágeno.",
  },
  {
    number: "04",
    title: "Bioestimuladores e Colágeno",
    subtitle: "Firmeza progressiva",
    description: "Indicação personalizada para flacidez facial, pescoço, linha mandibular e áreas corporais, com melhora gradual da sustentação da pele.",
  },
  {
    number: "05",
    title: "Harmonização Facial",
    subtitle: "Identidade preservada",
    description: "Planejamento de mento, mandíbula, preenchimentos e proporções faciais com foco em equilíbrio, naturalidade e refinamento.",
  },
  {
    number: "06",
    title: "Corpo, Glúteos e T-Sculptor",
    subtitle: "Escultura corporal",
    description: "Protocolos corporais para flacidez, contorno, glúteos e definição, combinando tecnologias e estímulo de colágeno quando indicado.",
  },
];

const Procedures = () => {
  const { content, isVisible } = useSection<ProceduresContent>("PROCEDURES", FALLBACK);
  const { data } = useQuery({
    queryKey: ["procedures"],
    queryFn: () => proceduresApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const procedures = data?.length
    ? data.map((item) => ({
        number: item.number,
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
      }))
    : FALLBACK_PROCEDURES;

  if (!isVisible) return null;

  return (
    <section id="procedimentos" className="relative section-y bg-[hsl(var(--cream-deep))] border-y border-border">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        {/* Cabeçalho */}
        <div className="max-w-3xl section-head animate-fade-in">
          <p className="label-eyebrow mb-4 md:mb-5">{content.eyebrow}</p>
          <h2 className="font-display type-section text-primary">
            {content.titleTop}
            <span className="block italic font-light text-accent">{content.titleBottom}</span>
          </h2>
          <p className="font-editorial-italic type-lead text-foreground/70 mt-5 md:mt-6 max-w-xl">
            {content.lead}
          </p>
        </div>

        {/* Grid de procedimentos — cards em flex-col para alinhar o "Saiba mais"
            na mesma linha de base, independente do tamanho da descrição. */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 border-t border-l border-border">
          {procedures.map((proc, index) => (
            <article
              key={index}
              className="group relative flex flex-col p-6 sm:p-8 lg:p-10 border-r border-b border-border hover:bg-background transition-colors duration-700 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-baseline justify-between gap-4 mb-6 md:mb-8">
                <span className="font-display text-3xl text-accent/60 group-hover:text-accent transition-colors">
                  {proc.number}
                </span>
                <span className="label-eyebrow text-right text-[0.65rem]">
                  {proc.subtitle}
                </span>
              </div>

              <h3 className="font-display type-block text-primary mb-4 group-hover:italic transition-all duration-500 text-balance">
                {proc.title}
              </h3>

              {/* flex-1 faz a descrição ocupar a sobra, alinhando os links no rodapé */}
              <p className="flex-1 text-sm text-foreground/65 leading-relaxed font-light">
                {proc.description}
              </p>

              <button className="link-underline text-[0.7rem] tracking-[0.3em] uppercase text-accent font-medium mt-8 self-start">
                Saiba mais
              </button>
            </article>
          ))}
        </div>

        <div className="text-center mt-10 md:mt-16 animate-fade-in">
          <Button variant="cta" size="lg">
            {content.ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Procedures;
