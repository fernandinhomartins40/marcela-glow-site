import { Instagram, Facebook, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { newsletterApi, getErrorMessage } from "@/lib/api";

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
    <footer id="contato" className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Coluna 1 - Marca */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-serif font-bold text-primary-foreground">MD</span>
              </div>
            </div>
            <h3 className="text-xl font-serif font-semibold mb-2">Dra. Marcela Duch</h3>
            <p className="text-background/80 mb-6">Medicina Estética & Regenerativa</p>
            
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Coluna 2 - Links Rápidos */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Links Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection("home")}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("sobre")}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  Sobre a Doutora
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("procedimentos")}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  Procedimentos
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("tecnologias")}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  Tecnologias
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("depoimentos")}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  Depoimentos
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3 - Contato */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contato</h4>
            <ul className="space-y-3 text-background/80">
              <li>
                <p className="font-medium text-background">Endereço</p>
                <p>Av. Exemplo, 1234 - Sala 56</p>
                <p>São Paulo - SP</p>
              </li>
              <li>
                <p className="font-medium text-background">Telefone</p>
                <p>(11) 99999-9999</p>
              </li>
              <li>
                <p className="font-medium text-background">E-mail</p>
                <p>contato@drmarceladuch.com.br</p>
              </li>
              <li>
                <p className="font-medium text-background">Horário</p>
                <p>Seg-Sex: 9h às 18h</p>
                <p>Sáb: 9h às 13h</p>
              </li>
            </ul>
          </div>

          {/* Coluna 4 - Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Receba Novidades</h4>
            <p className="text-background/80 mb-4">
              Dicas de beleza e saúde direto no seu e-mail
            </p>
            <form onSubmit={handleNewsletter} className="space-y-3">
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/10 border-background/20 text-background placeholder:text-background/60"
                required
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full bg-background/10 text-background border-background/20 hover:bg-background hover:text-foreground"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Inscrevendo..." : "Inscrever"}
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/70">
            <p>© 2024 Dra. Marcela Duch - Todos os direitos reservados</p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="hover:text-background transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-background transition-colors">
                Termos de Uso
              </a>
              <a
                href="/admin/"
                className="inline-flex items-center gap-2 hover:text-background transition-colors"
                aria-label="Acessar painel médico"
              >
                <Stethoscope className="w-4 h-4" />
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
