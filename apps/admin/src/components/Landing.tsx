import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarCheck,
  Check,
  Eye,
  EyeOff,
  Layers,
  MessageSquareQuote,
  Monitor,
  PanelBottom,
  RotateCcw,
  Search,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api, ConfirmDialog, errorMessage } from '../lib/ui'
import { SectionFields } from './landing/secoes'
import { SectionPreview } from './landing/preview'
import type { SectionId, SectionState, LandingData } from './landing/types'

/**
 * Editor da landing page.
 *
 * A tela é organizada em torno de uma pergunta só: *qual pedaço do site eu
 * quero mexer agora?* Escolhida a seção, tudo o que aparece pertence a ela — um
 * formulário contínuo, sem sub-abas nem sanfonas fechadas por padrão.
 *
 * As duas decisões que sustentam o resto:
 *
 * 1. **Uma faixa de seções, não uma lista lateral.** As oito seções são a
 *    estrutura do site na ordem em que a visitante as encontra. Numeradas e
 *    lado a lado, a faixa vira um mapa: "estou na 4 de 8". Uma coluna à
 *    esquerda gastava 232px permanentes para dizer a mesma coisa pior.
 *
 * 2. **A prévia é um painel que abre.** Fixa, ela roubava um terço da largura
 *    de todas as telas para uma informação que só interessa depois de escrever.
 *    Fechada, o formulário respira; aberta, ela cobre metade da tela e mostra a
 *    seção grande o bastante para valer a olhada.
 */

const SECTIONS: {
  id: SectionId
  label: string
  icon: LucideIcon
  hint: string
  /** O que a pessoa vai reconhecer ao abrir o site — vocabulário dela, não do código. */
  about: string
}[] = [
  { id: 'HERO', label: 'Primeira tela', icon: Sparkles, hint: 'A abertura do site', about: 'O carrossel grande que aparece assim que o site abre, com os botões de agendar.' },
  { id: 'ABOUT', label: 'Sobre a doutora', icon: UserRound, hint: 'Retrato e apresentação', about: 'A foto ao lado do texto de apresentação, com o número do CRM.' },
  { id: 'PROCEDURES', label: 'Tratamentos', icon: Layers, hint: 'Chamada da lista', about: 'O título e o texto que apresentam a lista de tratamentos.' },
  { id: 'TECHNOLOGY', label: 'Tecnologia', icon: Wrench, hint: 'Equipamentos e recursos', about: 'Os blocos que explicam cada equipamento e o que ele faz.' },
  { id: 'TESTIMONIALS', label: 'Depoimentos', icon: MessageSquareQuote, hint: 'Título da seção', about: 'O cabeçalho acima dos depoimentos das pacientes.' },
  { id: 'APPOINTMENT', label: 'Agendamento', icon: CalendarCheck, hint: 'Convite do formulário', about: 'O convite ao lado do formulário de solicitação de horário.' },
  { id: 'FOOTER', label: 'Rodapé', icon: PanelBottom, hint: 'Contato e endereço', about: 'O fim da página: logo, endereço, telefone e redes sociais.' },
  { id: 'SEO', label: 'Google e redes', icon: Search, hint: 'Como o link aparece', about: 'O título e o resumo que aparecem no Google e ao compartilhar o link.' },
]

export function Landing() {
  const [active, setActive] = React.useState<SectionId>('HERO')
  const client = useQueryClient()

  const query = useQuery({
    queryKey: ['landing'],
    queryFn: async () => (await api.get('/landing/admin')).data as LandingData,
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['landing'] })

  if (query.isLoading) return <p className="hint">Carregando o conteúdo do site...</p>
  if (query.isError) return <p className="error">{errorMessage(query.error)}</p>
  if (!query.data) return null

  return (
    <div className="cms">
      <nav className="cms-steps" aria-label="Seções do site">
        {SECTIONS.map((section, index) => {
          const data = query.data.sections[section.id]
          const atual = active === section.id
          return (
            <button
              key={section.id}
              type="button"
              className={`cms-step${atual ? ' is-active' : ''}${data.isVisible ? '' : ' is-hidden'}`}
              aria-current={atual ? 'step' : undefined}
              onClick={() => setActive(section.id)}
              title={section.about}
            >
              <span className="cms-step-num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="cms-step-text">
                <strong>{section.label}</strong>
                <em>{data.isVisible ? section.hint : 'escondida do site'}</em>
              </span>
              {!data.isVisible && (
                <>
                  <EyeOff className="cms-step-off" size={13} aria-hidden="true" />
                  <span className="sr-only">esta seção está escondida do site</span>
                </>
              )}
            </button>
          )
        })}
      </nav>

      <SectionEditor
        key={active}
        id={active}
        state={query.data.sections[active]}
        images={query.data.images}
        targets={query.data.imageTargets}
        onChanged={refresh}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor de uma seção
// ─────────────────────────────────────────────────────────────────────────────

function SectionEditor({
  id,
  state,
  images,
  targets,
  onChanged,
}: {
  id: SectionId
  state: SectionState
  images: LandingData['images']
  targets: LandingData['imageTargets']
  onChanged: () => void
}) {
  const meta = SECTIONS.find((s) => s.id === id)!
  /* Cópia local: a pessoa edita vários campos e só depois salva. Ligar cada
     tecla ao servidor deixaria o site mudando enquanto o texto é escrito. */
  const [draft, setDraft] = React.useState<Record<string, any>>(() => structuredClone(state.content))
  const [resetting, setResetting] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const client = useQueryClient()

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(state.content),
    [draft, state.content],
  )

  const save = useMutation({
    mutationFn: (payload: { content?: Record<string, any>; isVisible?: boolean }) =>
      api.put(`/landing/admin/${id.toLowerCase()}`, {
        content: payload.content ?? draft,
        ...(payload.isVisible !== undefined ? { isVisible: payload.isVisible } : {}),
      }),
    onSuccess: onChanged,
  })

  const reset = useMutation({
    mutationFn: () => api.delete(`/landing/admin/${id.toLowerCase()}`),
    onSuccess: (response) => {
      setResetting(false)
      setDraft(structuredClone(response.data.content))
      client.invalidateQueries({ queryKey: ['landing'] })
    },
  })

  const set = (path: string, value: unknown) =>
    setDraft((current) => {
      const next = structuredClone(current)
      const keys = path.split('.')
      let node: any = next
      for (const key of keys.slice(0, -1)) node = node[key]
      node[keys[keys.length - 1]] = value
      return next
    })

  /* Sair com texto por salvar é a perda que mais dói aqui: são parágrafos
     escritos à mão, não um formulário que se refaz em dez segundos. */
  React.useEffect(() => {
    if (!dirty) return
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [dirty])

  return (
    <section className={`cms-editor${previewing ? ' is-previewing' : ''}`}>
      <header className="cms-head">
        <div className="cms-head-text">
          <h2>
            <meta.icon size={17} aria-hidden="true" />
            {meta.label}
          </h2>
          <p>{meta.about}</p>
        </div>

        <div className="cms-head-actions">
          <button
            type="button"
            className={previewing ? 'is-on' : ''}
            onClick={() => setPreviewing((v) => !v)}
            aria-pressed={previewing}
          >
            <Monitor size={14} aria-hidden="true" />
            {previewing ? 'Fechar prévia' : 'Ver prévia'}
          </button>

          <button
            type="button"
            onClick={() => save.mutate({ isVisible: !state.isVisible, content: state.content })}
            title={
              state.isVisible
                ? 'A seção deixa de aparecer no site, mas o texto continua guardado'
                : 'A seção volta a aparecer no site'
            }
          >
            {state.isVisible ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
            {state.isVisible ? 'Esconder do site' : 'Mostrar no site'}
          </button>

          {state.isCustom && (
            <button type="button" onClick={() => setResetting(true)} title="Voltar ao texto que veio pronto">
              <RotateCcw size={14} aria-hidden="true" />
              Restaurar
            </button>
          )}
        </div>
      </header>

      {!state.isVisible && (
        <p className="cms-warn">
          <EyeOff size={14} aria-hidden="true" />
          Esta seção está escondida — o que você escrever aqui só aparece no site depois de clicar
          em <strong>Mostrar no site</strong>.
        </p>
      )}

      {save.isError && <p className="error">{errorMessage(save.error)}</p>}

      <div className="cms-body">
        <div className="cms-form">
          <SectionFields
            id={id}
            draft={draft}
            set={set}
            images={images}
            targets={targets}
            onChanged={onChanged}
          />
        </div>

        {previewing && (
          <aside className="cms-preview" aria-label={`Prévia de ${meta.label}`}>
            <div className="cms-preview-bar">
              <span>
                <Monitor size={13} aria-hidden="true" />
                Como fica no site
              </span>
              <button type="button" onClick={() => setPreviewing(false)} aria-label="Fechar a prévia">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="cms-preview-scroll">
              <SectionPreview id={id} draft={draft} images={images} />
            </div>
          </aside>
        )}
      </div>

      {/* A barra acompanha a rolagem: com um formulário longo, o botão de salvar
          no topo fica fora da tela justamente quando termina de escrever. */}
      <footer className={`cms-save${dirty ? ' is-dirty' : ''}`}>
        <span className="cms-save-state">
          {save.isPending ? (
            'Salvando...'
          ) : dirty ? (
            'Você tem alterações que ainda não estão no site.'
          ) : (
            <>
              <Check size={14} aria-hidden="true" />
              Tudo salvo e publicado.
            </>
          )}
        </span>
        <div className="cms-save-actions">
          {dirty && (
            <button type="button" onClick={() => setDraft(structuredClone(state.content))}>
              Descartar
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({})}
          >
            {save.isPending ? 'Salvando...' : 'Salvar e publicar'}
          </button>
        </div>
      </footer>

      {resetting && (
        <ConfirmDialog
          title="Voltar ao texto original?"
          message={`Tudo o que foi escrito em "${meta.label}" é apagado e volta ao texto que veio pronto. As fotos enviadas continuam.`}
          confirmLabel="Restaurar"
          danger
          pending={reset.isPending}
          onCancel={() => setResetting(false)}
          onConfirm={() => reset.mutate()}
        />
      )}
    </section>
  )
}
