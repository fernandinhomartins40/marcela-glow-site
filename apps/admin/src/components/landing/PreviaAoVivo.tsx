import React from 'react'
import { Loader2, Monitor, Smartphone } from 'lucide-react'
import type { LandingData, SectionId } from './types'

/**
 * A prévia é o próprio site.
 *
 * Antes o painel tinha uma cópia da landing (o bloco `.lp`), redesenhada à mão
 * — e ela envelhecia a cada mudança no site: depois do redesign, mostrava uma
 * página que já não existia. Agora a moldura carrega `/previa?secao=…` do
 * site, que desenha a seção com os mesmos componentes da landing, e o painel
 * manda o rascunho por `postMessage` a cada tecla. Idêntica por construção.
 *
 * O site e o painel moram no mesmo domínio (o painel em /admin/), então a
 * moldura é permitida pelo `X-Frame-Options: SAMEORIGIN` do nginx e as
 * mensagens trocam entre a mesma origem. `VITE_SITE_URL` só existe para o
 * desenvolvimento, em que cada app roda numa porta.
 */

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const ORIGEM_DO_SITE = SITE ? new URL(SITE).origin : window.location.origin

const DISPOSITIVOS = {
  computador: { largura: 1440, rotulo: 'Computador', icone: Monitor },
  celular: { largura: 390, rotulo: 'Celular', icone: Smartphone },
} as const
type Dispositivo = keyof typeof DISPOSITIVOS

const CHAVE_DISPOSITIVO = 'cms-previa-dispositivo'

function dispositivoSalvo(): Dispositivo {
  try {
    const salvo = localStorage.getItem(CHAVE_DISPOSITIVO)
    return salvo === 'celular' ? 'celular' : 'computador'
  } catch {
    return 'computador'
  }
}

export function PreviaAoVivo({
  secao,
  draft,
  images,
}: {
  secao: SectionId
  draft: Record<string, unknown>
  images: LandingData['images']
}) {
  const moldura = React.useRef<HTMLIFrameElement>(null)
  const palco = React.useRef<HTMLDivElement>(null)
  const [dispositivo, setDispositivo] = React.useState<Dispositivo>(dispositivoSalvo)
  const [pronta, setPronta] = React.useState(false)
  const [altura, setAltura] = React.useState(640)
  const [largura, setLargura] = React.useState(0)

  const { largura: larguraDoDispositivo } = DISPOSITIVOS[dispositivo]
  /* Reduz para caber no palco, nunca amplia: o celular aparece em tamanho real. */
  const escala = largura ? Math.min(1, largura / larguraDoDispositivo) : 1

  const escolher = (proximo: Dispositivo) => {
    setDispositivo(proximo)
    try {
      localStorage.setItem(CHAVE_DISPOSITIVO, proximo)
    } catch {
      /* sem armazenamento, só não lembra a escolha */
    }
  }

  React.useEffect(() => {
    const el = palco.current
    if (!el) return
    const medir = () => setLargura(el.clientWidth)
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    medir()
    return () => observador.disconnect()
  }, [])

  const enviar = React.useCallback(() => {
    const alvo = moldura.current?.contentWindow
    if (!alvo) return
    alvo.postMessage(
      {
        tipo: 'landing-previa',
        sections: { [secao]: draft },
        images: Object.fromEntries(Object.entries(images).map(([slot, img]) => [slot, { url: img.url, alt: img.alt }])),
      },
      ORIGEM_DO_SITE,
    )
  }, [secao, draft, images])

  React.useEffect(() => {
    const ouvir = (event: MessageEvent) => {
      if (event.origin !== ORIGEM_DO_SITE || event.source !== moldura.current?.contentWindow) return
      const dados = event.data as { tipo?: string; altura?: number }
      if (dados?.tipo === 'landing-previa-pronta') setPronta(true)
      if (dados?.tipo === 'landing-previa-altura' && typeof dados.altura === 'number') {
        setAltura(Math.max(200, Math.min(12000, Math.round(dados.altura))))
      }
    }
    window.addEventListener('message', ouvir)
    return () => window.removeEventListener('message', ouvir)
  }, [])

  /* Outra seção é outra moldura (a `key` abaixo): espera o novo aviso de
     pronta. Não usar `onLoad` para isso — ele só dispara depois de todas as
     imagens, e o aviso do site chega antes; zerar ali perderia o aviso. */
  React.useEffect(() => {
    setPronta(false)
  }, [secao])

  /* Cada mudança no rascunho vai para a moldura; a primeira sai quando o site
     avisa que está pronto para ouvir. */
  React.useEffect(() => {
    if (pronta) enviar()
  }, [pronta, enviar])

  return (
    <div className="previa-vivo">
      <div className="previa-vivo-barra" role="group" aria-label="Tamanho da prévia">
        {(Object.keys(DISPOSITIVOS) as Dispositivo[]).map((id) => {
          const { rotulo, icone: Icone } = DISPOSITIVOS[id]
          return (
            <button
              key={id}
              type="button"
              className={dispositivo === id ? 'is-active' : ''}
              aria-pressed={dispositivo === id}
              onClick={() => escolher(id)}
            >
              <Icone size={14} aria-hidden="true" />
              {rotulo}
            </button>
          )
        })}
        <span className="previa-vivo-escala">
          {escala < 1 ? `Reduzida a ${Math.round(escala * 100)}%` : 'Tamanho real'}
        </span>
      </div>

      <div ref={palco} className="previa-vivo-palco">
        <div
          className="previa-vivo-janela"
          style={{ width: larguraDoDispositivo * escala, height: altura * escala }}
        >
          <iframe
            ref={moldura}
            /* Um endereço por seção: trocar de aba recarrega a moldura com a
               seção certa, em vez de reaproveitar a anterior. */
            key={secao}
            src={`${SITE}/previa?secao=${secao}`}
            title={`Prévia ao vivo: ${secao}`}
            style={{
              width: larguraDoDispositivo,
              height: altura,
              transform: `scale(${escala})`,
            }}
          />
          {!pronta && (
            <div className="previa-vivo-carregando" aria-live="polite">
              <Loader2 size={18} className="spin" aria-hidden="true" />
              Carregando a prévia…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
