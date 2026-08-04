import { Instagram, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { newsletterApi, getErrorMessage } from "@/lib/api";
import logoMD from "@/assets/logo-md.png";

const quickLinks = [
  { id: "home", label: "Início" },
  { id: "sobre", label: "Sobre a doutora" },
  { id: "procedimentos", label: "Tratamentos" },
  { id: "tecnologias", label: "Tecnologia" },
  { id: "depoimentos", label: "Depoimentos" },
];

const Footer = () => {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: newsletterApi.subscribe,
    onSuccess: () => {
      toast.success("Obrigada por se inscrever! Você receberá nossas novidades em breve.");
      setEmail("");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      mutation.mutate(email);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer
      id="contato"
      className="bg-espresso border-t border-[hsl(var(--cream))]/10"
    >
      <div className="container mx-auto px-5 sm:px-6 lg:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-12 gap-12 md:gap-10 lg:gap-16 mb-14 md:mb-20">
          {/* Marca */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-3 mb-6">
              <img
                src={logoMD}
                alt="MD - Dra. Marcela Duch"
                className="h-12 w-auto brightness-0 invert opacity-90"
                width={48}
                height={48}
                loading="lazy"
              />
            </div>
            <p className="font-display text-lg tracking-[0.25em] uppercase text-[hsl(var(--cream))] mb-2">
              Dra. Marcela Duch
            </p>
            <p className="text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))] mb-6">
              Médica · CRM/MS 5691
            </p>
            <p className="font-editorial-italic text-lg text-[hsl(var(--cream))]/60 leading-snug max-w-xs">
              Medicina estética e saúde da pele, com estratégia e naturalidade.
            </p>

            <div className="flex gap-3 mt-8">
              <a
                href="https://www.instagram.com/dramarceladuch/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-[hsl(var(--cream))]/25 flex items-center justify-center text-[hsl(var(--cream))] hover:bg-[hsl(var(--cream))] hover:text-[hsl(var(--espresso))] hover:border-[hsl(var(--cream))] transition-all duration-500"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/5567999446066"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-[hsl(var(--cream))]/25 flex items-center justify-center text-[hsl(var(--cream))] hover:bg-[hsl(var(--cream))] hover:text-[hsl(var(--espresso))] hover:border-[hsl(var(--cream))] transition-all duration-500"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navegação */}
          <div className="md:col-span-3">
            <p className="label-eyebrow mb-6">Navegação</p>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="link-underline text-sm font-light tracking-wide text-[hsl(var(--cream))]/70 hover:text-[hsl(var(--cream))] transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div className="md:col-span-3">
            <p className="label-eyebrow mb-6">Contato</p>
            <ul className="space-y-5 text-sm font-light tracking-wide text-[hsl(var(--cream))]/70">
              <li>
                <p className="text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))] mb-1.5">
                  Endereço
                </p>
                <p>Av. 16, nº 890 — Ágatha Center</p>
                <p>Chapadão do Sul — MS</p>
              </li>
              <li>
                <p className="text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))] mb-1.5">
                  Telefone
                </p>
                <a
                  href="https://wa.me/5567999446066"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline hover:text-[hsl(var(--cream))] transition-colors"
                >
                  (67) 99944-6066
                </a>
              </li>
              <li>
                <p className="text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))] mb-1.5">
                  E-mail
                </p>
                <a
                  href="mailto:contato@dramarceladuch.com.br"
                  className="link-underline hover:text-[hsl(var(--cream))] transition-colors break-all"
                >
                  contato@dramarceladuch.com.br
                </a>
              </li>
              <li>
                <p className="text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))] mb-1.5">
                  Atendimento
                </p>
                <p>Segunda a sexta · 9h às 18h</p>
                <p>Sábado · 9h às 13h</p>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-3">
            <p className="label-eyebrow mb-6">Receba novidades</p>
            <p className="text-sm font-light tracking-wide text-[hsl(var(--cream))]/70 mb-6 leading-relaxed">
              Conteúdos sobre saúde da pele e envelhecimento inteligente.
            </p>
            <form onSubmit={handleNewsletter} className="space-y-4">
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-0 border-b border-[hsl(var(--cream))]/25 rounded-none px-0 h-12 text-[hsl(var(--cream))] placeholder:text-[hsl(var(--cream))]/45 focus-visible:ring-0 focus-visible:border-[hsl(var(--bronze))] transition-colors duration-500"
                required
              />
              <Button
                type="submit"
                variant="ghostLight"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Inscrevendo..." : "Inscrever"}
              </Button>
            </form>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-[hsl(var(--cream))]/15 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 text-[0.7rem] tracking-[0.15em] uppercase text-[hsl(var(--cream))]/50">
            <p>
              © {new Date().getFullYear()} Dra. Marcela Duch · Todos os direitos reservados
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="link-underline hover:text-[hsl(var(--cream))] transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="link-underline hover:text-[hsl(var(--cream))] transition-colors">
                Termos de Uso
              </a>
              <a
                href="/admin/"
                className="inline-flex items-center gap-2 hover:text-[hsl(var(--cream))] transition-colors"
                aria-label="Acessar painel médico"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Painel Médico
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
