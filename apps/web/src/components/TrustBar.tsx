import { MapPin, Stethoscope, UserRound } from "lucide-react";

const items = [
  { icon: Stethoscope, title: "CRM/MS 5691", detail: "Registro e ética" },
  { icon: UserRound, title: "Atendimento personalizado", detail: "Escuta real, planos individuais" },
  { icon: MapPin, title: "Chapadão do Sul", detail: "Cuidando de você aqui" },
];

/** Pontos de confiança antes da apresentação da médica: evidência, não promessa. */
export default function TrustBar() {
  return (
    <section aria-label="Informações da clínica" className="border-y border-border bg-background">
      <div className="container mx-auto grid px-5 sm:px-6 lg:grid-cols-3 lg:px-10">
        {items.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex min-h-28 items-center gap-4 border-b border-border py-5 last:border-b-0 lg:justify-center lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0">
            <Icon className="h-7 w-7 shrink-0 text-accent" strokeWidth={1.4} aria-hidden="true" />
            <div>
              <p className="font-display text-lg text-primary">{title}</p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
