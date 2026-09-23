import { CircleCheck } from "lucide-react";
import { useSection } from "@/hooks/useLanding";

interface TechItem {
  number: string;
  name: string;
  eyebrow: string;
  monogram: string;
  description: string;
  points: string[];
}

interface TechContent {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  lead: string;
  items: TechItem[];
  watermark: string;
}

const FALLBACK: TechContent = {
  eyebrow: "Recursos médicos",
  titleTop: "Tecnologia",
  titleBottom: "a serviço do plano.",
  lead: "Recursos escolhidos conforme a necessidade de cada paciente — nunca o contrário.",
  items: [
  {
    number: "01",
    name: "T-Sculptor",
    eyebrow: "Escultura corporal",
    monogram: "TS",
    description:
      "Tecnologia para escultura corporal que estimula contrações musculares de alta intensidade e pode compor protocolos para contorno, firmeza e melhora corporal.",
    points: [
      "Planejamento para abdome, braços, glúteos e contorno corporal",
      "Associação com bioestimuladores quando há indicação médica",
      "Estímulo muscular e melhora de definição sem cirurgia",
      "Plano individual para resultados progressivos e naturais",
    ],
  },
  {
    number: "02",
    name: "Peptídeos e Qualidade de Pele",
    eyebrow: "Regeneração celular",
    monogram: "PE",
    description:
      "Protocolos regenerativos voltados à atividade celular, produção de colágeno, reparação tecidual e melhora real da qualidade da pele.",
    points: [
      "Foco em viço, textura, firmeza e resistência da pele",
      "Abordagem progressiva, consistente e biologicamente sustentada",
      "Combinação possível com peelings, skinbooster e bioestimuladores",
    ],
  },
],
  watermark: "tecnologia",
};

/* Capa editorial feita com os dados do recurso: sem foto fictícia. */
const Cover = ({ tech }: { tech: TechItem }) => (
  <div className="relative mx-auto aspect-[5/4] w-full max-w-md overflow-hidden rounded-md border border-border bg-marble shadow-[0_24px_50px_-36px_hsl(var(--espresso)/0.7)] md:max-w-none" aria-hidden="true">
    <span className="absolute right-5 top-6 font-display text-[6.5rem] leading-none text-primary/[0.09] select-none md:text-[8rem]">
      {tech.monogram}
    </span>
    <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
      <span className="text-xs tabular-nums text-muted-foreground">{tech.number}</span>
      <div className="max-w-[16rem]">
        <span className="block text-[0.62rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">{tech.eyebrow}</span>
        <span className="mt-2 block font-display text-2xl leading-tight text-primary md:text-[1.75rem]">{tech.name}</span>
      </div>
    </div>
  </div>
);

const Points = ({ points }: { points: string[] }) => (
  <ul className="mt-6 space-y-2.5">
    {points.map((point) => (
      <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/80">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent-text))]" strokeWidth={1.5} aria-hidden="true" />
        {point}
      </li>
    ))}
  </ul>
);

const Technology = () => {
  const { content, isVisible } = useSection<TechContent>("TECHNOLOGY", FALLBACK);
  const technologies = content.items.length ? content.items : FALLBACK.items;

  if (!isVisible) return null;

  const [first, ...rest] = technologies;

  return (
    <section
      id="tecnologias"
      className="relative section-y bg-background overflow-hidden"
    >
      <div className="container mx-auto max-w-6xl px-5 sm:px-6 lg:px-10 relative space-y-14 md:space-y-20">
        {/* O cabeçalho da seção e o primeiro recurso dividem a mesma linha,
            como no mockup: o título abre, os pontos do recurso sustentam. */}
        {first && (
          <div className="grid items-center gap-8 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-7 animate-fade-in">
              <p className="label-eyebrow label-rule mb-4 md:mb-5">{content.eyebrow}</p>
              <h2 className="font-display type-section text-primary">
                {content.titleTop}
                <span className="block italic font-light text-accent-legible">{content.titleBottom}</span>
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-foreground/70">{content.lead}</p>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-foreground/65">{first.description}</p>
              <Points points={first.points} />
            </div>
            <div className="md:col-span-5">
              <Cover tech={first} />
            </div>
          </div>
        )}

        {rest.map((tech, index) => {
          const coverFirst = index % 2 === 0;
          return (
            <div key={tech.number} className="grid items-center gap-8 md:grid-cols-12 md:gap-14 animate-fade-in">
              <div className={`md:col-span-5 ${coverFirst ? "md:order-1" : "md:order-2"}`}>
                <Cover tech={tech} />
              </div>
              <div className={`md:col-span-7 ${coverFirst ? "md:order-2" : "md:order-1"}`}>
                <p className="label-eyebrow mb-3">{tech.eyebrow}</p>
                <h3 className="font-display type-block text-primary">{tech.name}</h3>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-foreground/70">{tech.description}</p>
                <Points points={tech.points} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Technology;
