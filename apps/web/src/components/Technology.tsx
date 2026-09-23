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

const Technology = () => {
  const { content, isVisible } = useSection<TechContent>("TECHNOLOGY", FALLBACK);
  const technologies = content.items.length ? content.items : FALLBACK.items;

  if (!isVisible) return null;

  return (
    <section
      id="tecnologias"
      className="relative section-y bg-background overflow-hidden"
    >
      {/* Watermark editorial */}
      <span className="absolute top-4 right-0 hidden text-watermark text-[10vw] leading-none font-display pointer-events-none select-none whitespace-nowrap lg:block">
        {content.watermark}
      </span>

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative">
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

        {/* Blocos alternados */}
        <div className="max-w-6xl mx-auto space-y-16 md:space-y-32">
          {technologies.map((tech, index) => {
            const reversed = index % 2 === 1;
            return (
              <div
                key={tech.number}
                className="grid md:grid-cols-12 gap-8 md:gap-16 items-center animate-fade-in"
              >
                {/* Capa editorial feita com os dados do recurso: sem foto fictícia. */}
                <div
                  className={`md:col-span-5 ${
                    reversed ? "md:order-1" : "md:order-2"
                  }`}
                >
                  <div className="relative aspect-[4/5] max-w-xs mx-auto md:max-w-none overflow-hidden border border-border bg-marble" aria-hidden="true">
                    <span className="absolute -right-4 top-1/4 font-display text-[9rem] md:text-[11rem] leading-none text-primary/10 select-none">
                      {tech.monogram}
                    </span>
                    <div className="absolute inset-4 border border-primary/20" />
                    <div className="relative flex h-full flex-col justify-between p-8 md:p-10">
                      <span className="font-display text-2xl text-primary/65">{tech.number}</span>
                      <div className="max-w-[17rem]">
                        <span className="block text-[0.65rem] font-medium uppercase tracking-[0.2em] text-primary/70">{tech.eyebrow}</span>
                        <span className="mt-4 block font-display text-3xl md:text-4xl leading-tight text-primary">{tech.name}</span>
                        <span className="mt-6 block h-px w-12 bg-accent" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Texto */}
                <div
                  className={`md:col-span-7 ${
                    reversed ? "md:order-2" : "md:order-1"
                  }`}
                >
                  <p className="label-eyebrow mb-4">{tech.eyebrow}</p>
                  <h3 className="font-display type-block text-primary mb-5">
                    {tech.name}
                  </h3>
                  <div className="divider-luxe mb-6" />
                  <p className="font-editorial text-lg md:text-xl leading-relaxed text-foreground/80 mb-8">
                    {tech.description}
                  </p>

                  <div className="space-y-3 md:space-y-4">
                    {tech.points.map((point, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-8 h-px bg-accent mt-3 shrink-0" />
                        <p className="text-base text-foreground/75 font-light tracking-wide">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Technology;
