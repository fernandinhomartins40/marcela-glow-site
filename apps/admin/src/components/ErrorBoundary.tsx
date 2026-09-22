import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * A rede de seguranca do painel.
 *
 * Sem isto, um erro de render em qualquer componente desmonta a arvore inteira
 * e a clinica fica com a **tela branca**: nenhuma mensagem, nenhum botao, nada
 * que diga o que fazer. O interceptor do `api` ja cuida de erro de requisicao,
 * mas nao alcanca erro de render — um campo `null` onde o codigo esperava
 * objeto, por exemplo, derruba a pagina sem passar por HTTP nenhum.
 *
 * A recuperacao oferecida e recarregar: o painel guarda estado em servidor, nao
 * em memoria, entao recarregar volta ao mesmo lugar sem perder trabalho salvo.
 * "Voltar ao inicio" existe para o caso de a propria tela ser a que quebra, e
 * recarregar so repetir o erro.
 */

type Props = { children: React.ReactNode; area?: boolean }
type State = { erro: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    // O console e o unico lugar em que a pilha sobrevive: a tela mostra a
    // mensagem, nao o rastro. Sem isto, um defeito relatado por telefone
    // ("deu erro") nao tem como ser investigado.
    console.error('[painel] erro de render nao tratado', erro, info.componentStack)
  }

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children

    if (this.props.area) {
      return (
        <section role="alert" className="erro-tela erro-area">
          <AlertTriangle size={32} aria-hidden="true" />
          <h2>Não foi possível abrir esta seção</h2>
          <p>Você pode tentar novamente ou escolher outra área no menu. Informações já salvas permanecem disponíveis.</p>
          <div className="erro-acoes">
            <button type="button" onClick={() => this.setState({ erro: null })}>
              <RefreshCw size={16} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
          <details>
            <summary>Detalhes técnicos</summary>
            <code>{erro.message}</code>
          </details>
        </section>
      )
    }

    return (
      <div role="alert" className="erro-tela">
        <AlertTriangle size={40} aria-hidden="true" />
        <h1>Algo deu errado nesta tela</h1>
        <p>
          O painel encontrou um problema e nao conseguiu continuar. Nada do que
          voce salvou foi perdido.
        </p>
        <div className="erro-acoes">
          <button type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={16} aria-hidden="true" />
            Recarregar a pagina
          </button>
          <button type="button" className="ghost" onClick={() => { window.location.href = '/admin/' }}>
            Voltar ao inicio
          </button>
        </div>
        {/*
          O detalhe tecnico fica recolhido: quem precisa dele e quem vai
          relatar o defeito, e quem nao precisa nao deve ver stack trace.
        */}
        <details>
          <summary>Detalhes tecnicos</summary>
          <code>{erro.message}</code>
        </details>
      </div>
    )
  }
}
