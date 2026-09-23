import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, UserRound, X } from "lucide-react";
import { useImage } from "@/hooks/useLanding";
import logoMD from "@/assets/brand/md-monogram-brown.webp";

const Header = () => {
  /* A logo do topo e a mesma do rodape: trocar no painel precisa mudar os
     dois. Antes so o rodape lia o storage, entao o site ficava com a logo
     nova embaixo e a antiga em cima. */
  const logo = useImage("footer.logo", logoMD, "MD - Dra. Marcela Duch");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        mobileMenuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

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
      /* O cabecalho e transparente no topo da pagina, para o hero aparecer
         inteiro por baixo. Mas o menu aberto herda esse fundo: os links ficavam
         sobre a foto e o texto do hero, ilegiveis. Com o menu aberto o fundo
         entra, mesmo sem rolagem. */
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isMobileMenuOpen ? "max-h-[100svh] overflow-y-auto" : ""} ${
        isScrolled || isMobileMenuOpen
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo MD */}
          {/* `shrink-0` + `whitespace-nowrap`: sem eles o flex espremia a marca
              até "Dra. Marcela Duch" quebrar em duas linhas, engordando o
              header e empurrando a navegação por cima do botão de agendar. */}
          <button
            onClick={() => scrollToSection("home")}
            className="flex shrink-0 items-center gap-2 lg:gap-3 group"
            aria-label="Dra. Marcela Duch"
          >
            {/* 36px no celular contra 48px no tablet: a logo é o único sinal de
                marca ali em cima, já que o nome fica escondido, e nesse tamanho
                ela vira um detalhe do canto. Sobe para 44px sem engordar o
                cabeçalho, que tem 72px de altura. */}
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-11 sm:h-11 md:h-12 w-auto shrink-0 transition-transform duration-500 group-hover:scale-105"
              width={48}
              height={48}
            />
            {/* O nome ficava escondido abaixo de 640px e sobrava o monograma sozinho:
                quem abre o site pelo celular via um símbolo sem saber de quem é.
                Agora ele aparece, com o tracking apertado para caber ao lado do
                botão de menu — e o registro do CRM continua só a partir do tablet,
                onde há largura para as duas linhas sem espremer nada. */}
            <div className="flex flex-col leading-tight whitespace-nowrap">
              <span className="font-display text-[0.8125rem] sm:text-sm lg:text-base xl:text-lg tracking-[0.08em] sm:tracking-[0.14em] lg:tracking-[0.18em] xl:tracking-[0.25em] uppercase text-primary">
                Dra. Marcela Duch
              </span>
              <span className="hidden sm:block text-[0.75rem] sm:text-[0.55rem] xl:text-[0.6rem] tracking-[0.2em] xl:tracking-[0.3em] uppercase text-muted-foreground">
                Médica · CRM/MS 5691
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          {/* Em 1024px os seis itens com tracking de desktop somavam 522px e,
              com a marca e o CTA, estouravam a linha. O espaçamento cresce por
              faixa: apertado no notebook, folgado no monitor grande. */}
          <nav className="hidden lg:flex min-w-0 items-center justify-center gap-3 xl:gap-6 2xl:gap-8">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="link-underline whitespace-nowrap text-[0.75rem] sm:text-[0.6rem] xl:text-[0.65rem] 2xl:text-[0.7rem] tracking-[0.1em] xl:tracking-[0.16em] 2xl:tracking-[0.25em] uppercase font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA Desktop */}
          <div className="hidden lg:flex shrink-0 items-center gap-2 xl:gap-3">
            <Button
              variant="cta"
              size="sm"
              className="xl:h-12 xl:px-7 xl:text-sm"
              onClick={() => scrollToSection("agendamento")}
            >
              Solicitar avaliação
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
            ref={mobileMenuButton}
            className="lg:hidden -mr-2 p-3 shrink-0 text-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-site-navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <nav id="mobile-site-navigation" hidden={!isMobileMenuOpen} className="lg:hidden mt-6 pb-6 space-y-1 animate-fade-in border-t border-border pt-6">
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
              Solicitar avaliação
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
      </div>
    </header>
  );
};

export default Header;
