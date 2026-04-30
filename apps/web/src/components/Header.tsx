import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, UserRound, X } from "lucide-react";
import logoMD from "@/assets/logo-md.png";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const links = [
    { id: "home", label: "Início" },
    { id: "sobre", label: "Sobre" },
    { id: "procedimentos", label: "Tratamentos" },
    { id: "tecnologias", label: "Tecnologia" },
    { id: "depoimentos", label: "Depoimentos" },
    { id: "contato", label: "Contato" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 lg:px-10 py-4">
        <div className="flex items-center justify-between">
          {/* Logo MD */}
          <button
            onClick={() => scrollToSection("home")}
            className="flex items-center gap-3 group"
            aria-label="Dra. Marcela Duch"
          >
            <img
              src={logoMD}
              alt="MD - Dra. Marcela Duch"
              className="h-10 md:h-12 w-auto transition-transform duration-500 group-hover:scale-105"
              width={48}
              height={48}
            />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display text-base md:text-lg tracking-[0.25em] uppercase text-primary">
                Dra. Marcela Duch
              </span>
              <span className="text-[0.6rem] tracking-[0.3em] uppercase text-muted-foreground">
                Médica · CRM/MS 5691
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="link-underline text-[0.7rem] tracking-[0.25em] uppercase font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="cta"
              size="default"
              onClick={() => scrollToSection("agendamento")}
            >
              Agendar
            </Button>
            <Button
              asChild
              variant="outline"
              size="icon"
              className="rounded-full"
              title="Área da Paciente"
            >
              <a href="/paciente/" aria-label="Acessar área da paciente">
                <UserRound className="w-4 h-4" />
              </a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden mt-6 pb-6 space-y-1 animate-fade-in border-t border-border pt-6">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left py-3 px-2 text-sm tracking-[0.2em] uppercase hover:text-accent transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Button
              variant="cta"
              size="default"
              className="w-full mt-4"
              onClick={() => scrollToSection("agendamento")}
            >
              Agendar Consulta
            </Button>
            <Button
              asChild
              variant="outline"
              size="default"
              className="w-full mt-3"
            >
              <a href="/paciente/">
                <UserRound className="w-4 h-4" />
                Área da Paciente
              </a>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
