import React from 'react'

/**
 * Tela de abertura do aplicativo instalado.
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

/**
 * O ícone que a clínica enviou pelo painel, para a abertura mostrar a marca
 * dela e não um monograma fixo.
 *
 * A abertura acontece antes do login, então a busca precisa ser pública — o
 * manifesto é. Enquanto ele não chega (ou se falhar), fica o "MD": a animação
 * dura menos de um segundo e não pode esperar por rede.
 *
 * O `maskable` fica de fora: ele tem margem para o recorte em círculo do
 * Android e apareceria pequeno demais aqui.
 */
function useIconeDaClinica(app: 'admin' | 'patient'): string | null {
  const [icone, setIcone] = React.useState<string | null>(null)

  React.useEffect(() => {
    let vivo = true
    fetch(`/api/landing/manifest/${app}.webmanifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { icons?: { src?: string; sizes?: string; purpose?: string }[] } | null) => {
        if (!vivo || !Array.isArray(m?.icons)) return
        const uteis = m.icons.filter((i) => i?.src && !/maskable/.test(i.purpose ?? ''))
        /* 192 antes de 512: é o menor que já tem qualidade para 74px na tela, e
           o de 512 pode passar de meio megabyte — peso que atrasaria justamente
           a tela que existe para não fazer esperar. */
        const escolhido =
          uteis.find((i) => i.sizes === '192x192') ??
          uteis.find((i) => i.sizes === '180x180') ??
          uteis[0]
        if (escolhido?.src) setIcone(escolhido.src)
      })
      .catch(() => {
        // Sem rede ou API fora: o monograma continua valendo.
      })
    return () => {
      vivo = false
    }
  }, [app])

  return icone
}

export function Splash({ marca, sub, app }: { marca: string; sub: string; app: 'admin' | 'patient' }) {
  const icone = useIconeDaClinica(app)

  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-marca">
        <span className="splash-mono" aria-hidden="true">
          {icone ? <img src={icone} alt="" className="splash-icone" /> : 'MD'}
        </span>
        <strong>{marca}</strong>
        <em>{sub}</em>
      </div>
      <span className="sr-only">Abrindo o aplicativo</span>
    </div>
  )
}
