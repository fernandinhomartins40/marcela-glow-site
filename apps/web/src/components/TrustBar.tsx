import { MapPin, Stethoscope, UserRound } from "lucide-react";

const items = [
  { icon: Stethoscope, title: "CRM/MS 5691", detail: "Registro e ética" },
  { icon: UserRound, title: "Atendimento personalizado", detail: "Escuta real, planos individuais" },
  { icon: MapPin, title: "Chapadão do Sul", detail: "Cuidando de você aqui" },
];

/** Pontos de confiança antes da apresentação da médica: evidência, não promessa. */
export default function TrustBar() {
  return (
    <section aria-label="Informações da clínica" className="border-b border-border bg-[hsl(var(--card))]">
      <div className="container mx-auto grid px-5 sm:px-6 lg:grid-cols-3 lg:px-10">
        {items.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex min-h-24 items-center gap-5 border-b border-border py-6 last:border-b-0 lg:min-h-28 lg:justify-center lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0">
            <Icon className="h-10 w-10 shrink-0 text-primary lg:h-8 lg:w-8" strokeWidth={1.1} aria-hidden="true" />
            <div>
              <p className="font-display text-xl text-primary">{title}</p>
              <p className="mt-1 text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
