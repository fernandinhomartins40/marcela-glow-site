import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Rede de seguranca do site publico.
 *
 * Um erro de render aqui e pior que no painel: quem chega e uma possivel
 * paciente, sem vinculo nenhum com a clinica, e tela branca a manda embora
 * sem saber que existe telefone para ligar. Por isso esta tela oferece o
 * contato, nao so o botao de recarregar.
 *
 * Escrito com as classes do Tailwind e os tokens do `index.css`, como o resto
 * deste app — o painel usa CSS proprio e tem a sua versao.
 */

type Props = { children: React.ReactNode };
type State = { erro: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error("[site] erro de render nao tratado", erro, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center"
      >
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-foreground">
          Esta pagina nao carregou
        </h1>
        <p className="max-w-[42ch] leading-relaxed text-muted-foreground">
          Tivemos um problema ao montar a pagina. Tente recarregar; se
          continuar, fale com a clinica pelo WhatsApp.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-5 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Recarregar
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-md border border-foreground/30 px-5 text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Ir para o inicio
          </a>
        </div>
      </div>
    );
  }
}
