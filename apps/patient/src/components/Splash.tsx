import React from 'react'

/**
 * Tela de abertura do portal da paciente.
 *
 * Um app nativo mostra a marca enquanto carrega; um site cai direto no
 * formulário. Essa diferença de um segundo é o que faz o PWA parecer instalado
 * em vez de aberto.
 *
 * Ela só existe em modo standalone e só na primeira abertura da sessão — quem
 * sai e volta para o login por causa de sessão expirada não merece esperar a
 * animação de novo. Pelo navegador nunca aparece: ali a pessoa já viu a marca
 * na aba e na barra de endereço.
 *
 * A duração é curta de propósito. Uma abertura de marca acima de um segundo
 * deixa de ser identidade e vira espera.
 */

const CHAVE = 'abertura-vista'
const DURACAO = 900

export function useAbertura(ativo: boolean): boolean {
  /* A leitura acontece no inicializador — precisa valer já no primeiro render,
     senão a tela de login pisca antes da abertura. Mas a ESCRITA fica no efeito:
     no StrictMode o inicializador roda duas vezes, e gravar ali fazia a segunda
     passada encontrar a marca da primeira e concluir que a abertura já tinha
     sido vista. O resultado era ela nunca aparecer. */
  const [mostrando, setMostrando] = React.useState(() => {
    if (!ativo) return false
    try {
      if (sessionStorage.getItem(CHAVE) === '1') return false
    } catch {
      // Armazenamento bloqueado: mostra a cada abertura, que é o mal menor.
    }
    /* Quem pediu menos movimento no sistema pula a animação inteira: ela é
       decorativa, e insistir nela contra o pedido explícito é desrespeito. */
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  })

  React.useEffect(() => {
    if (!mostrando) return
    try {
      sessionStorage.setItem(CHAVE, '1')
    } catch {
      // Sem armazenamento a abertura se repete; nada quebra.
    }
    const t = setTimeout(() => setMostrando(false), DURACAO)
    return () => clearTimeout(t)
  }, [mostrando])

  return mostrando
}

export function Splash({ marca, sub }: { marca: string; sub: string }) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-marca">
        <span className="splash-mono" aria-hidden="true">
          MD
        </span>
        <strong>{marca}</strong>
        <em>{sub}</em>
      </div>
      <span className="sr-only">Abrindo o aplicativo</span>
    </div>
  )
}
