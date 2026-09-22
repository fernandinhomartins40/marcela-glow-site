import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Rede de seguranca do portal da paciente.
 *
 * Aqui a pessoa esta logada e veio ver consulta, plano ou receita. Tela branca
 * num app instalado no celular parece o app ter quebrado de vez, entao esta
 * tela precisa dizer que os dados estao seguros e dar uma saida.
 *
 * Mesmo idioma do app (Tailwind + tokens HSL do `styles.css`).
 */

type Props = { children: React.ReactNode }
type State = { erro: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error('[portal] erro de render nao tratado', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center"
      >
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-foreground">
          Nao foi possivel abrir esta tela
        </h1>
        <p className="max-w-[40ch] leading-relaxed text-muted-foreground">
          Seus dados estao seguros. Tente recarregar o aplicativo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-5 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Recarregar
        </button>
      </div>
    )
  }
}
