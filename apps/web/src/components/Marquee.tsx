import { ArrowRight } from "lucide-react";

/* Faixa de valores entre as áreas de cuidado e os tratamentos. O mockup
   aprovado trocou o letreiro rolante por uma linha fixa: parada, ela se lê;
   rolando, virava textura. No celular vira lista curta — os quatro primeiros,
   que cabem sem empurrar os tratamentos para longe. */
const values = [
  "Medicina Estética",
  "Procedimentos Personalizados",
  "Beleza e Saúde",
  "Resultados Reais",
  "Experiência e Cuidado",
  "Ciência e Naturalidade",
];

const Marquee = () => (
  <section aria-label="O que orienta cada tratamento" className="bg-espresso border-y border-[hsl(var(--cream))]/10">
    <ul className="container mx-auto hidden items-center justify-between px-5 py-5 sm:px-6 lg:flex lg:px-10">
      {values.map((value, index) => (
        <li key={value} className="flex items-center">
          {index > 0 && <span className="mr-6 h-4 w-px bg-[hsl(var(--cream))]/30 xl:mr-8" aria-hidden="true" />}
          <span className="text-[0.8125rem] tracking-wide text-[hsl(var(--cream))]/90">{value}</span>
        </li>
      ))}
    </ul>
    <ul className="grid gap-1 px-7 py-6 lg:hidden">
      {values.slice(0, 4).map((value) => (
        <li key={value} className="flex items-center gap-4 py-1.5 text-sm text-[hsl(var(--cream))]/90">
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--bronze-light))]" aria-hidden="true" />
          {value}
        </li>
      ))}
    </ul>
  </section>
);

export default Marquee;
