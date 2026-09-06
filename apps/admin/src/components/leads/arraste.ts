import React from 'react'

/**
 * Arraste de cartão que funciona com dedo, mouse e caneta.
 *
 * A API de arraste do HTML5 (`draggable`, `dragstart`, `drop`) é de mouse: em
 * navegador de celular ela simplesmente não dispara, e o quadro ficava sem
 * jeito de mover um lead a não ser pelo seletor de etapa dentro do cartão.
 *
 * Eventos de ponteiro cobrem os três dispositivos com um código só. O preço é
 * ter de resolver à mão o que o HTML5 dava de graça:
 *
 * - **Distinguir arrastar de rolar.** O quadro rola na horizontal e a página na
 *   vertical; um toque que começa num cartão pode ser qualquer um dos três. A
 *   regra: enquanto o dedo não sair de um raio de 8px, nada acontece — depois
 *   disso, o eixo do movimento decide. Movimento mais vertical que horizontal é
 *   rolagem e o arraste é cancelado.
 * - **Saber sobre qual coluna o dedo está.** Sem `dragover`, isto sai de
 *   `elementFromPoint` a cada movimento.
 * - **Segurar antes de arrastar.** No celular o arraste só começa depois de
 *   250ms com o dedo parado, senão qualquer deslize sobre um cartão viraria
 *   movimento. No mouse não há espera: o ponteiro é preciso e a intenção é
 *   clara desde o primeiro pixel.
 */

const RAIO_MORTO = 8
const ESPERA_TOQUE = 250

export interface ArrasteInfo {
  /** O que está sendo arrastado, ou null. */
  itemId: string | null
  /** A coluna sob o ponteiro, ou null. */
  alvo: string | null
}

/**
 * Leva o quadro à coluna seguinte quando o cartão encosta na borda.
 *
 * A primeira versão rolava alguns pixels por evento de movimento. Funcionava
 * na teoria e não na mão: uma coluna mede 345px num celular, então atravessar
 * uma exigia manter o dedo parado dentro de uma faixa de 56px por vinte
 * eventos seguidos. Na prática só dava para mover o cartão para a coluna
 * vizinha, que é a única que chega a aparecer na tela.
 *
 * Agora cada encostada na borda salta uma coluna inteira, com o intervalo
 * abaixo entre um salto e o outro. Encostar e esperar percorre o quadro
 * etapa a etapa, e o cartão pode ir para a última coluna sem o dedo precisar
 * de pontaria.
 */
const FAIXA_BORDA = 64
const INTERVALO_SALTO = 420

/**
 * O começo de cada coluna, em coordenada de rolagem.
 *
 * Vem do próprio DOM em vez de `scrollWidth / n`: as colunas podem ter
 * larguras diferentes — o CSS as define em `1fr` com mínimo, e a última não
 * tem a folga do gap — e uma média erraria o alinhamento a cada salto.
 */
function inicioDasColunas(quadro: HTMLElement): number[] {
  const base = quadro.getBoundingClientRect().left - quadro.scrollLeft
  return Array.from(quadro.children, (c) =>
    Math.round((c as HTMLElement).getBoundingClientRect().left - base),
  )
}

/** Salta uma coluna para o lado pedido. Devolve se houve para onde ir. */
function saltarColuna(direcao: 'esq' | 'dir'): boolean {
  const quadro = document.querySelector<HTMLElement>('.kanban')
  if (!quadro) return false

  const inicios = inicioDasColunas(quadro)
  const atual = quadro.scrollLeft
  /* Tolerância de 4px: o `scroll-snap` e o arredondamento do navegador deixam
     a rolagem alguns décimos fora do início exato da coluna, e sem a folga o
     salto acharia que ainda está na anterior. */
  const proximo = direcao === 'dir'
    ? inicios.find((x) => x > atual + 4)
    : [...inicios].reverse().find((x) => x < atual - 4)

  if (proximo === undefined) return false
  quadro.scrollTo({ left: proximo, behavior: 'smooth' })
  return true
}

/**
 * Decide se o ponteiro está numa borda e, se estiver, agenda os saltos.
 *
 * O intervalo é guardado fora do React porque só existe um arraste por vez, e
 * um estado faria o efeito remontar a cada salto.
 */
let saltoEmCurso: { direcao: string; timer: number } | null = null

function pararSaltos() {
  if (saltoEmCurso) {
    window.clearInterval(saltoEmCurso.timer)
    saltoEmCurso = null
  }
}

function rolarSePerto(x: number) {
  const quadro = document.querySelector<HTMLElement>('.kanban')
  if (!quadro) return
  const r = quadro.getBoundingClientRect()

  const direcao: 'esq' | 'dir' | null =
    x < r.left + FAIXA_BORDA ? 'esq' : x > r.right - FAIXA_BORDA ? 'dir' : null

  if (!direcao) {
    pararSaltos()
    return
  }
  // Já saltando para este lado: deixa o intervalo seguir.
  if (saltoEmCurso?.direcao === direcao) return

  pararSaltos()
  /* O primeiro salto sai na hora — esperar 420ms para o quadro reagir faria
     a borda parecer morta. */
  saltarColuna(direcao)
  saltoEmCurso = {
    direcao,
    timer: window.setInterval(() => {
      if (!saltarColuna(direcao)) pararSaltos()
    }, INTERVALO_SALTO),
  }
}

export function useArrasteDeCartao({
  onSoltar,
  atributoDaColuna = 'data-coluna',
}: {
  onSoltar: (itemId: string, coluna: string) => void
  atributoDaColuna?: string
}) {
  const [info, setInfo] = React.useState<ArrasteInfo>({ itemId: null, alvo: null })

  /* Um ref para o estado que os handlers globais leem: eles são registrados uma
     vez e não enxergariam o estado novo de um render posterior. */
  const vivo = React.useRef<{
    id: string
    x0: number
    y0: number
    armado: boolean
    timer: number | null
    alvo: string | null
  } | null>(null)

  const limpar = React.useCallback(() => {
    if (vivo.current?.timer) window.clearTimeout(vivo.current.timer)
    // Sem isto o quadro continuaria saltando depois de soltar o cartão.
    pararSaltos()
    vivo.current = null
    setInfo({ itemId: null, alvo: null })
  }, [])

  /** A coluna sob um ponto da tela, pelo atributo que o quadro marca. */
  const colunaEm = React.useCallback(
    (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      const coluna = el?.closest(`[${atributoDaColuna}]`)
      return coluna?.getAttribute(atributoDaColuna) ?? null
    },
    [atributoDaColuna],
  )

  React.useEffect(() => {
    const mover = (e: PointerEvent) => {
      const atual = vivo.current
      if (!atual) return

      const dx = e.clientX - atual.x0
      const dy = e.clientY - atual.y0

      if (!atual.armado) {
        /* Ainda na zona morta: decide se isto vira arraste ou rolagem. Mais
           vertical que horizontal é a pessoa rolando a página. */
        if (Math.hypot(dx, dy) < RAIO_MORTO) return
        if (Math.abs(dy) > Math.abs(dx) && e.pointerType !== 'mouse') {
          limpar()
          return
        }
        atual.armado = true
        if (atual.timer) {
          window.clearTimeout(atual.timer)
          atual.timer = null
        }
        setInfo({ itemId: atual.id, alvo: null })
      }

      /* Com o arraste em curso, o navegador não pode rolar junto — daí o
         `touch-action: none` no cartão, que faz este preventDefault valer. */
      e.preventDefault()

      /* Arrastar até a borda rola o quadro sozinho.

         No celular uma coluna ocupa quase a tela inteira, então a coluna de
         destino quase nunca está visível quando o arraste começa — sem isto o
         gesto só funcionaria entre as duas colunas que coubessem juntas, que
         no celular são nenhuma. */
      rolarSePerto(e.clientX)

      const alvo = colunaEm(e.clientX, e.clientY)
      if (alvo !== atual.alvo) {
        atual.alvo = alvo
        setInfo({ itemId: atual.id, alvo })
      }
    }

    const soltar = (e: PointerEvent) => {
      const atual = vivo.current
      if (!atual) return
      const alvo = atual.armado ? colunaEm(e.clientX, e.clientY) : null
      const id = atual.id
      limpar()
      if (alvo) onSoltar(id, alvo)
    }

    window.addEventListener('pointermove', mover, { passive: false })
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', limpar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', limpar)
    }
  }, [colunaEm, limpar, onSoltar])

  /** Nos cartões: começa a acompanhar o ponteiro. */
  const pegar = React.useCallback(
    (itemId: string) => (e: React.PointerEvent) => {
      /* Botão do meio ou direito não arrasta, e um toque em botão dentro do
         cartão (editar, apagar) é clique, não arraste. */
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('button, select, a, input')) return

      vivo.current = {
        id: itemId,
        x0: e.clientX,
        y0: e.clientY,
        /* No mouse o arraste vale já: o ponteiro é preciso. No dedo, só depois
           da espera, senão deslizar o quadro moveria cartões sem querer. */
        armado: e.pointerType === 'mouse',
        timer: null,
        alvo: null,
      }
      if (e.pointerType === 'mouse') return

      vivo.current.timer = window.setTimeout(() => {
        if (!vivo.current) return
        vivo.current.armado = true
        setInfo({ itemId, alvo: null })
        /* Um toque curto no aparelho confirma que o cartão foi "pego" — é o que
           o sistema faz ao segurar um ícone na tela de início. */
        navigator.vibrate?.(12)
      }, ESPERA_TOQUE)
    },
    [],
  )

  return { ...info, pegar }
}
