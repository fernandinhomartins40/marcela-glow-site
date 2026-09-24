import { ArrowRight, ChevronRight, Instagram, Mail, MapPin, Phone, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImage, useSection } from "@/hooks/useLanding";
import logoMD from "@/assets/brand/md-monogram-white.webp";

/* O rodapé segue o mockup aprovado: marca, navegação, contato e horário numa
   faixa compacta, e embaixo direitos, políticas e CRM. A newsletter saiu por
   isso (os campos continuam no CMS e na API, sem uso aqui). O link do painel
   médico ficou: fora do mockup, mas é a porta de entrada da equipe, e tirá-lo
   deixava a médica procurando o endereço. */
interface FooterContent {
  tagline: string;
  address: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
}

const FALLBACK: FooterContent = {
  tagline: "Medicina estética com ciência, sensibilidade e respeito pela sua história.",
  address: "Av. 16, nº 890 — Ágatha Center, Chapadão do Sul — MS",
  phone: "67999446066",
  email: "contato@dramarceladuch.com.br",
  instagram: "dramarceladuch",
};

/** (67) 99944-6066 — como se lê, não como se disca. */
function formatPhone(digits: string) {
  const only = digits.replace(/\D/g, "").replace(/^55/, "");
  if (only.length === 11) return `(${only.slice(0, 2)}) ${only.slice(2, 7)}-${only.slice(7)}`;
  if (only.length === 10) return `(${only.slice(0, 2)}) ${only.slice(2, 6)}-${only.slice(6)}`;
  return digits;
}

const quickLinks = [
  { id: "home", label: "Início" },
  { id: "procedimentos", label: "Procedimentos" },
  { id: "sobre", label: "Sobre" },
  { id: "tecnologias", label: "Tecnologia" },
  { id: "agendamento", label: "Contato" },
];

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
);

const Footer = () => {
  const { content } = useSection<FooterContent>("FOOTER", FALLBACK);
  const logo = useImage("footer.logo", logoMD, "MD - Dra. Marcela Duch");
  const phoneDigits = content.phone ? content.phone.replace(/\D/g, "") : "67999446066";
  const mail = content.email ?? FALLBACK.email ?? "";

  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const heading = "mb-4 text-[0.66rem] font-medium uppercase tracking-[0.24em] text-[hsl(var(--bronze-light))]";
  const social =
    "flex h-11 w-11 items-center justify-center rounded-full text-[hsl(var(--cream))]/90 transition-colors duration-300 hover:bg-[hsl(var(--cream))]/10 hover:text-[hsl(var(--cream))]";
  const socialLinks = (
    <>
      <a href={`https://www.instagram.com/${content.instagram ?? "dramarceladuch"}/`} target="_blank" rel="noopener noreferrer" className={social} aria-label="Instagram">
        <Instagram className="h-[18px] w-[18px]" aria-hidden="true" />
      </a>
      <a href={`https://wa.me/55${phoneDigits}`} target="_blank" rel="noopener noreferrer" className={social} aria-label="WhatsApp">
        <WhatsAppIcon />
      </a>
    </>
  );

  return (
    <footer id="contato" className="bg-[hsl(var(--espresso))] text-[hsl(var(--cream))] border-t border-[hsl(var(--cream))]/10">
      <div className="container mx-auto px-5 sm:px-6 lg:px-10 pt-9 pb-5 md:pt-10">
        <div className="grid gap-8 md:grid-cols-12 md:gap-8 lg:gap-12">
          {/* Marca */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3">
              <img src={logo.src} alt={logo.alt} className="h-12 w-auto brightness-0 invert opacity-95" width={48} height={48} loading="lazy" />
              <span className="font-display text-xl">Dra. Marcela Duch</span>
            </div>
            <p className="mt-4 hidden max-w-[17rem] text-sm leading-relaxed text-[hsl(var(--cream))]/75 md:block">{content.tagline}</p>
            <div className="-ml-3 mt-3 hidden gap-1 md:flex">{socialLinks}</div>
          </div>

          {/* Navegação: no celular, a lista e os ícones sociais dividem a linha */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 md:col-span-2 md:block">
            <nav aria-label="Rodapé">
              <p className={`${heading} hidden md:block`}>Navegação</p>
              <ul className="md:space-y-1.5">
                {quickLinks.map((link) => (
                  <li key={link.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(link.id)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm text-[hsl(var(--cream))]/85 transition-colors hover:text-[hsl(var(--cream))] md:min-h-0 md:w-auto"
                    >
                      {link.label}
                      <ChevronRight className="h-4 w-4 text-[hsl(var(--cream))]/55 md:hidden" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex flex-col items-center gap-1 pt-1 md:hidden">{socialLinks}</div>
          </div>

          {/* Contato */}
          <div className="hidden md:col-span-3 md:block">
            <p className={heading}>Contato</p>
            <ul className="space-y-3 text-sm text-[hsl(var(--cream))]/85">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--bronze-light))]" strokeWidth={1.5} aria-hidden="true" />
                <a href={`https://wa.me/55${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--cream))]">{formatPhone(phoneDigits)}</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--bronze-light))]" strokeWidth={1.5} aria-hidden="true" />
                <a href={`mailto:${mail}`} className="break-all hover:text-[hsl(var(--cream))]">{mail}</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--bronze-light))]" strokeWidth={1.5} aria-hidden="true" />
                <span>{content.address}</span>
              </li>
            </ul>
          </div>

          {/* Horário */}
          <div className="md:col-span-3">
            <p className={`${heading} hidden md:block`}>Horário</p>
            <p className="hidden text-sm leading-relaxed text-[hsl(var(--cream))]/85 md:block">
              Segunda a sexta: 9h às 18h<br />Sábado: 9h às 13h
            </p>
            {/* No mockup o CTA do rodapé é bronze, não creme: o creme já é o
                botão do formulário logo acima, e dois iguais disputariam. */}
            <Button className="w-full border border-[hsl(var(--bronze))] bg-[hsl(var(--bronze))] text-[hsl(var(--cream))] hover:bg-[hsl(var(--bronze))]/85 md:mt-5 md:w-auto" onClick={() => scrollToSection("agendamento")}>
              Agendar avaliação <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-[hsl(var(--cream))]/12 pt-5 text-center text-xs text-[hsl(var(--cream))]/65 md:flex-row md:justify-between md:text-left">
          <p>© {new Date().getFullYear()} Dra. Marcela Duch. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a href="#" className="hover:text-[hsl(var(--cream))]">Política de Privacidade</a>
            <span aria-hidden="true">|</span>
            <a href="#" className="hover:text-[hsl(var(--cream))]">Termos de Uso</a>
            <span aria-hidden="true" className="hidden md:inline">|</span>
            <span className="basis-full md:basis-auto">CRM/MS 5691</span>
            <span aria-hidden="true" className="hidden md:inline">|</span>
            <a href="/admin/" className="inline-flex min-h-11 items-center gap-1.5 hover:text-[hsl(var(--cream))] md:min-h-0">
              <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
              Painel médico
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
