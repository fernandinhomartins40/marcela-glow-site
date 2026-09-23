import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSection } from "@/hooks/useLanding";
import marble from "@/assets/approved/landing-philosophy-marble-v2.webp";
import botanical from "@/assets/approved/landing-quote-botanical-v2.webp";

interface AboutContent {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  lead: string;
  highlights: string[];
  crmLabel: string;
  crmNumber: string;
  ctaLabel: string;
  watermark: string;
}

const FALLBACK: AboutContent = {
  eyebrow: "Dra. Marcela Campanini Duch",
  titleTop: "Saúde, beleza",
  titleBottom: "e naturalidade.",
  lead: "A medicina a seu favor: onde saúde e beleza andam juntas. Cada plano é construído com análise médica, estratégia e respeito à identidade de cada paciente, buscando qualidade de pele, harmonia e evolução natural.",
  highlights: [
    "Médica com CRM/MS 5691 em Chapadão do Sul/MS",
    "Gerenciamento de envelhecimento com foco em naturalidade",
    "Protocolos para face, pele, pescoço, corpo e cabelo",
    "Abordagem integrada entre estética, saúde da pele e bem-estar",
  ],
  crmLabel: "CRM/MS",
  crmNumber: "5691",
  ctaLabel: "Conhecer a Abordagem",
  watermark: "marcela",
};

const About = () => {
  const { content, isVisible } = useSection<AboutContent>("ABOUT", FALLBACK);
  if (!isVisible) return null;

  const scrollToAppointment = () => document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="sobre" className="overflow-hidden bg-background">
      <div className="grid lg:grid-cols-2">
        <div className="relative isolate min-h-[34rem] overflow-hidden px-5 py-16 sm:px-10 md:py-24 lg:px-[max(3rem,calc((100vw-72rem)/2))]">
          <img src={marble} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover object-left opacity-85" />
          <div className="absolute inset-0 -z-10 bg-background/50" aria-hidden="true" />
          <div className="max-w-xl">
            <p className="label-eyebrow label-rule">Minha filosofia</p>
            <h2 className="mt-5 font-display type-section text-primary">Evoluir <span className="block">sem exageros</span></h2>
            <p className="mt-7 max-w-md text-base leading-relaxed text-foreground/80">{content.lead}</p>
            <Button variant="cta" className="mt-9" onClick={scrollToAppointment}>{content.ctaLabel} <ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>
        <aside className="relative flex min-h-[34rem] items-center justify-center overflow-hidden bg-[hsl(var(--cream))] px-7 py-16 text-center sm:px-12 md:py-24">
          <img src={botanical} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-bottom opacity-95" />
          <div className="absolute inset-0 bg-background/20" aria-hidden="true" />
          <div className="relative max-w-md">
            <span className="block font-display text-7xl leading-[0.6] text-[hsl(var(--bronze-light))] select-none" aria-hidden="true">“</span>
            <p className="mt-6 font-editorial-italic text-[1.75rem] leading-snug text-primary sm:text-4xl">“Estética de verdade é quando você se reconhece — e se sente bem.”</p>
            <span className="mx-auto mt-8 block h-px w-12 bg-accent" />
            <p className="mt-5 text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Dra. Marcela Duch</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/65">{content.eyebrow}<br />{content.crmLabel} {content.crmNumber}</p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default About;
