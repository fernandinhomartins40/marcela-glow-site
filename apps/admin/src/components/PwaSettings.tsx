import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RotateCcw, Save, Smartphone, Trash2, Upload } from 'lucide-react'
import { api, ConfirmDialog, errorMessage, Field } from '../lib/ui'
import { ImageCropper } from './ImageCropper'
import type { CropTarget } from '../lib/imageCrop'

/**
 * Configuração dos aplicativos instaláveis.
 *
 * O manifesto era um arquivo no repositório: trocar o nome do app na tela de
 * início do celular exigia um deploy. Agora a clínica edita aqui.
 *
 * Os dois apps aparecem lado a lado porque a decisão costuma ser comparativa —
 * a médica quer que o app dela e o da paciente se distingam na gaveta de
 * aplicativos, e isso só se julga vendo os dois juntos.
 */

type AppId = 'admin' | 'patient'

interface AppConfig {
  name: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  display: string
}

interface Dados {
  config: Record<AppId, AppConfig>
  icons: Record<AppId, Partial<Record<string, string>>>
  defaults: Record<AppId, AppConfig>
}

const APPS: { id: AppId; label: string; quem: string }[] = [
  { id: 'patient', label: 'Aplicativo da paciente', quem: 'O que a paciente instala no celular para ver consultas, prescrições e mensagens.' },
  { id: 'admin', label: 'Painel da clínica', quem: 'O que você e a equipe instalam para atender, ver a agenda e assinar documentos.' },
]

const MODOS: { valor: string; label: string; hint: string }[] = [
  { valor: 'standalone', label: 'Aplicativo', hint: 'Abre sem barra de endereço, como um app instalado. É o normal.' },
  { valor: 'fullscreen', label: 'Tela cheia', hint: 'Esconde até a barra de status do celular.' },
  { valor: 'minimal-ui', label: 'Com controles', hint: 'Mantém os botões de voltar e recarregar.' },
  { valor: 'browser', label: 'Aba do navegador', hint: 'Abre como página comum — desiste de parecer aplicativo.' },
]

/** Cada ícone e para que serve — o texto explica por que existem quatro. */
const ICONES: { chave: string; label: string; onde: string; medida: string }[] = [
  { chave: '192', label: 'Ícone do Android', onde: 'A instalação básica e os atalhos pequenos.', medida: '192×192' },
  { chave: '512', label: 'Ícone grande', onde: 'A tela de abertura e o convite de instalação.', medida: '512×512' },
  { chave: 'apple', label: 'Ícone do iPhone', onde: 'A tela de início do iPhone e do iPad.', medida: '180×180' },
  { chave: 'maskable', label: 'Ícone com máscara', onde: 'Launchers que recortam em círculo — deixe margem em volta da marca.', medida: '512×512' },
]

export function PwaSettings() {
  const [app, setApp] = React.useState<AppId>('patient')
  const [restaurando, setRestaurando] = React.useState(false)
  const client = useQueryClient()

  const query = useQuery({
    queryKey: ['pwa'],
    queryFn: async () => (await api.get('/landing/admin/pwa')).data as Dados,
  })

  const [draft, setDraft] = React.useState<Record<AppId, AppConfig> | null>(null)
  /* O rascunho nasce do servidor e só é recriado quando o servidor muda — sem
     isso, cada refetch apagaria o que a pessoa acabou de digitar. */
  React.useEffect(() => {
    if (query.data) setDraft(structuredClone(query.data.config))
  }, [query.data])

  const salvar = useMutation({
    mutationFn: (valor: Record<AppId, AppConfig>) => api.put('/landing/admin/pwa', valor),
    onSuccess: () => client.invalidateQueries({ queryKey: ['pwa'] }),
  })

  const restaurar = useMutation({
    mutationFn: () => api.delete('/landing/admin/pwa'),
    onSuccess: () => {
      setRestaurando(false)
      client.invalidateQueries({ queryKey: ['pwa'] })
    },
  })

  if (query.isLoading) return <p className="hint">Carregando as configurações dos aplicativos...</p>
  if (query.isError) return <p className="error">{errorMessage(query.error)}</p>
  if (!query.data || !draft) return null

  const atual = draft[app]
  const meta = APPS.find((a) => a.id === app)!
  const sujo = JSON.stringify(draft) !== JSON.stringify(query.data.config)

  const set = (campo: keyof AppConfig, valor: string) =>
    setDraft((d) => (d ? { ...d, [app]: { ...d[app], [campo]: valor } } : d))

  return (
    <div className="cms">
      <nav className="cms-tabs" role="tablist" aria-label="Aplicativos">
        {APPS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={app === a.id}
            className={`cms-tab${app === a.id ? ' is-active' : ''}`}
            onClick={() => setApp(a.id)}
          >
            <Smartphone size={14} aria-hidden="true" />
            {a.label}
          </button>
        ))}
      </nav>

      <section className="cms-editor">
        <header className="cms-head">
          <div className="cms-head-text">
            <h2>
              <Smartphone size={17} aria-hidden="true" />
              {meta.label}
            </h2>
            <p>{meta.quem}</p>
          </div>
        </header>

        {salvar.isError && <p className="error">{errorMessage(salvar.error)}</p>}

        <div className="cms-form">
          <section className="cms-card">
            <div className="cms-card-head">
              <div>
                <h3>Nome e descrição</h3>
                <p>É o que aparece na tela de início do celular e no convite de instalação.</p>
              </div>
            </div>
            <div className="cms-card-body">
              <Field label="Nome completo" hint="Aparece no convite para instalar.">
                <input value={atual.name} onChange={(e) => set('name', e.target.value)} maxLength={60} />
              </Field>
              <Field
                label="Nome curto"
                hint="Vai sob o ícone, onde cabem poucas letras. Até 20 caracteres."
              >
                <input value={atual.shortName} onChange={(e) => set('shortName', e.target.value)} maxLength={20} />
              </Field>
              <Field label="Descrição" hint="Uma frase dizendo para quem é o app e o que ele faz.">
                <textarea
                  rows={3}
                  value={atual.description}
                  onChange={(e) => set('description', e.target.value)}
                  maxLength={300}
                />
              </Field>
            </div>
          </section>

          <section className="cms-card">
            <div className="cms-card-head">
              <div>
                <h3>Cores e abertura</h3>
                <p>Como o sistema pinta o app enquanto ele carrega.</p>
              </div>
            </div>
            <div className="cms-card-body">
              <div className="form-row form-row-2">
                <CampoCor
                  label="Cor do tema"
                  hint="Pinta a barra do sistema quando o app está aberto."
                  valor={atual.themeColor}
                  onChange={(v) => set('themeColor', v)}
                />
                <CampoCor
                  label="Cor de fundo"
                  hint="O fundo da tela de abertura, antes do app desenhar."
                  valor={atual.backgroundColor}
                  onChange={(v) => set('backgroundColor', v)}
                />
              </div>
              <Field
                label="Modo de exibição"
                hint={MODOS.find((m) => m.valor === atual.display)?.hint}
              >
                <select value={atual.display} onChange={(e) => set('display', e.target.value)}>
                  {MODOS.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <Previa config={atual} icone={query.data.icons[app]['512'] ?? query.data.icons[app]['192']} />

          <section className="cms-card">
            <div className="cms-card-head">
              <div>
                <h3>Ícones</h3>
                <p>
                  Cada sistema usa um tamanho. Sem nenhum enviado, o app continua com o ícone que
                  veio pronto.
                </p>
              </div>
            </div>
            <div className="cms-card-body">
              {ICONES.map((i) => (
                <CampoIcone
                  key={i.chave}
                  slot={`app.${app}.${i.chave}`}
                  label={i.label}
                  onde={i.onde}
                  medida={i.medida}
                  url={query.data.icons[app][i.chave]}
                  onChanged={() => client.invalidateQueries({ queryKey: ['pwa'] })}
                />
              ))}
            </div>
          </section>
        </div>

        <footer className={`cms-save${sujo ? ' is-dirty' : ''}`}>
          <span className="cms-save-state">
            {salvar.isPending ? (
              'Salvando...'
            ) : sujo ? (
              'Você tem alterações que ainda não valem para quem instalar o app.'
            ) : (
              <>
                <Check size={14} aria-hidden="true" />
                Tudo salvo.
              </>
            )}
          </span>
          <div className="cms-save-actions">
            <button type="button" onClick={() => setRestaurando(true)}>
              <RotateCcw size={14} aria-hidden="true" />
              Restaurar padrão
            </button>
            <button
              type="button"
              className="primary"
              disabled={!sujo || salvar.isPending}
              onClick={() => salvar.mutate(draft)}
            >
              <Save size={14} aria-hidden="true" />
              Salvar
            </button>
          </div>
        </footer>
      </section>

      {restaurando && (
        <ConfirmDialog
          title="Voltar ao padrão?"
          message="Nome, descrição, cores e modo dos dois aplicativos voltam ao que vieram de fábrica. Os ícones enviados continuam."
          confirmLabel="Restaurar"
          danger
          pending={restaurar.isPending}
          onCancel={() => setRestaurando(false)}
          onConfirm={() => restaurar.mutate()}
        />
      )}
    </div>
  )
}

/**
 * Campo de cor.
 *
 * O seletor do navegador e o código hexadecimal lado a lado: quem tem a paleta
 * do designer cola o código, quem não tem escolhe no olho.
 */
function CampoCor({
  label,
  hint,
  valor,
  onChange,
}: {
  label: string
  hint: string
  valor: string
  onChange: (v: string) => void
}) {
  const id = React.useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <span className="field-hint">{hint}</span>
      <div className="cms-cor cms-cor-simples">
        <input
          id={id}
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          className="cms-cor-valor"
          value={valor}
          onChange={(e) => {
            const v = e.target.value.trim()
            if (/^#[0-9a-f]{0,6}$/i.test(v)) onChange(v)
          }}
          aria-label={`Código da ${label.toLowerCase()}`}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

/** Um ícone: a imagem atual, o que ela faz, e como trocar. */
function CampoIcone({
  slot,
  label,
  onde,
  medida,
  url,
  onChanged,
}: {
  slot: string
  label: string
  onde: string
  medida: string
  url?: string
  onChanged: () => void
}) {
  const [enviando, setEnviando] = React.useState(false)
  const [removendo, setRemovendo] = React.useState(false)
  const client = useQueryClient()

  const [larg, alt] = medida.split('×').map(Number)
  const target: CropTarget = { width: larg, height: alt, mime: 'image/png', label }

  const remover = useMutation({
    mutationFn: () => api.delete(`/landing/admin/images/${slot}`),
    onSuccess: () => {
      setRemovendo(false)
      client.invalidateQueries({ queryKey: ['pwa'] })
    },
  })

  return (
    <div className="cms-foto">
      <p className="cms-medidas">
        <strong>{medida} pixels</strong> · {onde}
      </p>
      <button
        type="button"
        className="cms-foto-thumb cms-icone-thumb"
        onClick={() => setEnviando(true)}
        aria-label={url ? `Trocar o ${label.toLowerCase()}` : `Enviar o ${label.toLowerCase()}`}
      >
        {url ? <img src={url} alt="" /> : <span className="cms-foto-vazio">sem ícone</span>}
      </button>
      <div className="cms-foto-texto">
        <strong>{label}</strong>
        <span className="hint">
          {url ? 'Você enviou este ícone.' : 'Usando o ícone que veio pronto no app.'}
        </span>
        <div className="cms-foto-acoes">
          <button type="button" className="cms-btn primary" onClick={() => setEnviando(true)}>
            <Upload size={13} aria-hidden="true" />
            {url ? 'Trocar' : 'Enviar'}
          </button>
          {url && (
            <button type="button" className="cms-btn cms-btn-danger" onClick={() => setRemovendo(true)}>
              <Trash2 size={13} aria-hidden="true" />
              Remover
            </button>
          )}
        </div>
      </div>

      {enviando && (
        <ImageCropper
          slot={slot}
          target={target}
          currentUrl={url}
          onClose={() => setEnviando(false)}
          onDone={() => {
            setEnviando(false)
            onChanged()
          }}
        />
      )}

      {removendo && (
        <ConfirmDialog
          title="Remover este ícone?"
          message={`O app volta a usar o ícone que veio pronto para "${label.toLowerCase()}".`}
          confirmLabel="Remover"
          danger
          pending={remover.isPending}
          onCancel={() => setRemovendo(false)}
          onConfirm={() => remover.mutate()}
        />
      )}
    </div>
  )
}

/**
 * Como o app aparece na tela de início.
 *
 * Os campos sozinhos não dizem se a escolha ficou boa — o que diz é ver o ícone
 * com o nome embaixo, do tamanho em que o celular desenha.
 */
function Previa({ config, icone }: { config: AppConfig; icone?: string }) {
  return (
    <section className="cms-card cms-previa">
      <div className="cms-previa-head">
        <div>
          <h3>Como fica no celular</h3>
          <p>O ícone e o nome curto, como aparecem na tela de início.</p>
        </div>
      </div>
      <div className="pwa-palco" style={{ background: config.backgroundColor }}>
        <div className="pwa-icone" style={{ background: config.themeColor }}>
          {icone ? <img src={icone} alt="" /> : <span>MD</span>}
        </div>
        <span className="pwa-nome" style={{ color: contraste(config.backgroundColor) }}>
          {config.shortName || 'Nome curto'}
        </span>
      </div>
    </section>
  )
}

/**
 * Preto ou branco sobre a cor de fundo, o que der mais contraste.
 *
 * A fórmula é a de luminância relativa do WCAG. Sem ela, um fundo escuro
 * escolhido pela clínica deixaria o nome do app ilegível justamente na prévia
 * que existe para julgar a escolha.
 */
function contraste(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#000'
  const n = parseInt(m[1], 16)
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luz =
    0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
  return luz > 0.4 ? '#1f1713' : '#fbf6ee'
}
