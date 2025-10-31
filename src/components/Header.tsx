import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm shadow-md" : "bg-background/80 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-2xl font-serif font-bold text-primary-foreground">MD</span>
            </div>
            <div className="hidden sm:block">
              <h2 className="text-lg font-serif font-semibold tracking-wide">Dra. Marcela Duch</h2>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <button onClick={() => scrollToSection("home")} className="link-underline text-sm font-medium">
              Home
            </button>
            <button onClick={() => scrollToSection("sobre")} className="link-underline text-sm font-medium">
              Sobre
            </button>
            <button onClick={() => scrollToSection("procedimentos")} className="link-underline text-sm font-medium">
              Procedimentos
            </button>
            <button onClick={() => scrollToSection("tecnologias")} className="link-underline text-sm font-medium">
              Tecnologias
            </button>
            <button onClick={() => scrollToSection("depoimentos")} className="link-underline text-sm font-medium">
              Depoimentos
            </button>
            <button onClick={() => scrollToSection("contato")} className="link-underline text-sm font-medium">
              Contato
            </button>
          </nav>

          {/* CTA Button - Desktop */}
          <Button
            variant="hero"
            size="default"
            className="hidden lg:inline-flex"
            onClick={() => scrollToSection("agendamento")}
          >
            Agendar Consulta
          </Button>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden mt-6 pb-4 space-y-4 animate-fade-in">
            <button
              onClick={() => scrollToSection("home")}
              className="block w-full text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("sobre")}
              className="block w-full text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
            >
              Sobre
            </button>
            <button
              onClick={() => scrollToSection("procedimentos")}
              className="block w-full text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
            >
              Procedimentos
            </button>
            <button
              onClick={() => scrollToSection("tecnologias")}
              className="block w-full text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
            >
              Tecnologias
            </button>
            <button
              onClick={() => scrollToSection("depoimentos")}
              className="block w-full text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
            >
              Depoimentos
            </button>
            <button
              onClick={() => scrollToSection("contato")}
              className="block w-full text-left py-2 px-4 hover:bg-accent rounded-lg transition-colors"
            >
              Contato
            </button>
            <Button variant="hero" size="default" className="w-full" onClick={() => scrollToSection("agendamento")}>
              Agendar Consulta
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
