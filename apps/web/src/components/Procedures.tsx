import { useState } from "react";
import { ArrowRight } from "lucide-react";
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
  eyebrow: "Tratamentos em destaque",
  titleTop: "Tratamentos",
  titleBottom: "com propósito.",
  lead: "Cada procedimento é escolhido e indicado para a sua real necessidade, com foco em saúde, naturalidade e resultados duradouros.",
  ctaLabel: "Ver todos os tratamentos",
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

/* Quantos cartões aparecem antes do "Ver todos": a grade 3×3 do mockup no
   desktop, quatro no celular. */
const DESKTOP_LIMIT = 9;
const MOBILE_LIMIT = 4;

const Procedures = () => {
  const { content, isVisible } = useSection<ProceduresContent>("PROCEDURES", FALLBACK);
  const [expanded, setExpanded] = useState(false);
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

  const goToAppointment = () => document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="procedimentos" className="relative section-y bg-background">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10">
        <div className="max-w-2xl section-head animate-fade-in">
          <p className="label-eyebrow label-rule mb-4 md:mb-5">{content.eyebrow}</p>
          <h2 className="font-display type-section text-primary">
            {content.titleTop}
            <span className="block italic font-light text-accent-legible">{content.titleBottom}</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-foreground/70">
            {content.lead}
          </p>
        </div>

        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {procedures.map((proc, index) => {
            const hidden = !expanded && (index >= DESKTOP_LIMIT ? "hidden" : index >= MOBILE_LIMIT ? "hidden md:flex" : "");
            return (
              <li
                key={`${proc.number}-${proc.title}`}
                className={`group flex flex-col rounded-md border border-border p-5 sm:p-6 transition-colors duration-500 hover:bg-[hsl(var(--cream-deep))]/55 ${index % 2 === 1 ? "bg-[hsl(var(--cream-deep))]/40" : "bg-[hsl(var(--card))]"} ${hidden || "flex"}`}
              >
                <span className="text-xs tabular-nums text-muted-foreground">{proc.number}</span>
                <h3 className="mt-2 font-display text-2xl leading-tight text-primary text-balance">{proc.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/70 line-clamp-3">{proc.description}</p>
                <button
                  type="button"
                  onClick={goToAppointment}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-[0.8125rem] font-semibold text-primary hover:text-[hsl(var(--bronze))]"
                  aria-label={`Saiba mais sobre ${proc.title}`}
                >
                  Saiba mais <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        {/* Um botão por faixa: no celular há cartões escondidos a partir do
            quinto, no desktop só a partir do décimo. Sem essa separação,
            "Ver todos" no desktop expandia uma lista que já estava inteira. */}
        <div className="mt-8 flex justify-center md:mt-12">
          {[
            { limit: MOBILE_LIMIT, className: "w-full sm:w-auto md:hidden" },
            { limit: DESKTOP_LIMIT, className: "hidden md:inline-flex" },
          ].map(({ limit, className }) => {
            const canExpand = procedures.length > limit;
            return (
              <Button
                key={limit}
                variant="cta"
                className={className}
                onClick={canExpand ? () => setExpanded((v) => !v) : goToAppointment}
                aria-expanded={canExpand ? expanded : undefined}
              >
                {canExpand && expanded ? "Mostrar menos" : content.ctaLabel} <ArrowRight aria-hidden="true" />
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Procedures;
