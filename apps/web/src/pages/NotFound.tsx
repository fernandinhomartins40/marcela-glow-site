import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, MessageCircle } from "lucide-react";

/**
 * Pagina de endereco inexistente.
 *
 * Estava em ingles ("Oops! Page not found", "Return to Home") com as cores
 * genericas do Tailwind (`bg-gray-100`, `text-blue-500`) — cinza e azul num
 * site que e todo creme e bronze. Quem chega aqui e uma possivel paciente que
 * errou o link ou seguiu um endereco antigo, e a pagina precisa parecer da
 * clinica e oferecer um caminho, nao so um numero.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota inexistente acessada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="text-center">
        <p className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
          Erro 404
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold text-foreground">
          Esta pagina nao existe
        </h1>
        <p className="mx-auto mb-8 max-w-[44ch] leading-relaxed text-muted-foreground">
          O endereco que voce abriu pode ter mudado de lugar. Volte ao inicio
          para ver os procedimentos e agendar sua avaliacao.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* min-h-[44px]: alvo de toque que o dedo acerta, como no resto da F4 */}
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-6 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ir para o inicio
          </a>
          <a
            href="/#contato"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-foreground/30 px-6 text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Falar com a clinica
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
