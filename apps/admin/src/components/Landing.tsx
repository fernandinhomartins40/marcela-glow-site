import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarCheck,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  MessageSquareQuote,
  PanelBottom,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api, ConfirmDialog, errorMessage } from '../lib/ui'
import { SectionFields } from './landing/secoes'
import { SectionPreview } from './landing/preview'
import type { SectionId, SectionState, LandingData } from './landing/types'

/**
 * Editor da landing page.
 *
 * A página segue sempre a mesma ordem, seção após seção: escolher a aba,
 * ligar ou desligar a seção, preencher os campos, ver a prévia no fim. Quem
 * aprendeu a mexer na primeira tela já sabe mexer no rodapé.
 *
 * As decisões que sustentam o resto:
 *
 * 1. **Abas nomeadas.** As oito seções são a estrutura do site na ordem em que
 *    a visitante as encontra, e a aba ativa diz onde se está sem gastar largura
 *    permanente — como a coluna lateral de 232px gastava.
 *
 * 2. **A seção liga e desliga no primeiro cartão.** Era um botão no cabeçalho,
 *    ao lado de "Restaurar", e desligar o site inteiro por engano ficava a um
 *    clique de distância do que se queria fazer.
 *
 * 3. **A prévia fecha a página.** Lateral, ela dividia a largura o tempo todo;
 *    embutida no fim, ela recebe a página inteira e mostra a seção no tamanho
 *    em que dá para julgá-la.
 */

const SECTIONS: {
  id: SectionId
  label: string
  icon: LucideIcon
  /** O que a pessoa vai reconhecer ao abrir o site — vocabulário dela, não do código. */
  about: string
}[] = [
  { id: 'HERO', label: 'Primeira tela', icon: Sparkles, about: 'O carrossel grande que aparece assim que o site abre, com os botões de agendar.' },
  { id: 'ABOUT', label: 'Sobre a doutora', icon: UserRound, about: 'A foto ao lado do texto de apresentação, com o número do CRM.' },
  { id: 'PROCEDURES', label: 'Tratamentos', icon: Layers, about: 'O título e o texto que apresentam a lista de tratamentos.' },
  { id: 'TECHNOLOGY', label: 'Tecnologia', icon: Wrench, about: 'Os blocos que explicam cada equipamento e o que ele faz.' },
  { id: 'TESTIMONIALS', label: 'Depoimentos', icon: MessageSquareQuote, about: 'O cabeçalho acima dos depoimentos das pacientes.' },
  { id: 'APPOINTMENT', label: 'Agendamento', icon: CalendarCheck, about: 'O convite ao lado do formulário de solicitação de horário.' },
  { id: 'FOOTER', label: 'Rodapé', icon: PanelBottom, about: 'O fim da página: logo, endereço, telefone e redes sociais.' },
  { id: 'SEO', label: 'Google e redes', icon: Search, about: 'O título e o resumo que aparecem no Google e ao compartilhar o link.' },
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
      <nav className="cms-tabs" role="tablist" aria-label="Seções do site">
        {SECTIONS.map((section) => {
          const data = query.data.sections[section.id]
          const atual = active === section.id
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={atual}
              className={`cms-tab${atual ? ' is-active' : ''}`}
              onClick={() => setActive(section.id)}
              title={section.about}
            >
              <section.icon size={14} aria-hidden="true" />
              {section.label}
              {!data.isVisible && (
                <>
                  <EyeOff className="cms-tab-off" size={12} aria-hidden="true" />
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

  /* Ctrl+S é o reflexo de quem escreve texto; sem isto o navegador abre a
     caixa de salvar página, que aqui não serve para nada. */
  React.useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      if (dirty && !save.isPending) save.mutate({})
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [dirty, save])

  return (
    <section className="cms-editor">
      <header className="cms-head">
        <div className="cms-head-text">
          <h2>
            <meta.icon size={17} aria-hidden="true" />
            {meta.label}
          </h2>
          <p>{meta.about}</p>
        </div>

        <div className="cms-head-actions">
          {/* O admin mora em /admin/ do mesmo domínio, então a raiz é o site. */}
          <a className="cms-btn" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden="true" />
            Abrir o site
          </a>
          {state.isCustom && (
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              onClick={() => setResetting(true)}
              title="Voltar ao texto que veio pronto"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Restaurar padrão
            </button>
          )}
          <button
            type="button"
            className="cms-btn primary"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({})}
          >
            <Save size={14} aria-hidden="true" />
            {save.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </header>

      {save.isError && <p className="error">{errorMessage(save.error)}</p>}

      {/* Ligar e desligar abre a página: é a decisão que muda o site inteiro,
          e no cabeçalho ela ficava a um clique de "Restaurar". */}
      <div className="cms-card cms-switch">
        <div>
          <strong>Seção ativa</strong>
          <p>
            {state.isVisible
              ? 'Esta seção está aparecendo no site.'
              : 'Esta seção está escondida — o que você escrever aqui fica guardado, mas não aparece no site.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.isVisible}
          aria-label={state.isVisible ? 'Esconder esta seção do site' : 'Mostrar esta seção no site'}
          className={`cms-toggle${state.isVisible ? ' is-on' : ''}`}
          onClick={() => save.mutate({ isVisible: !state.isVisible, content: state.content })}
        >
          <span aria-hidden="true" />
        </button>
      </div>

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

      <section className="cms-card cms-previa">
        <div className="cms-previa-head">
          <div>
            <h3>
              <Eye size={15} aria-hidden="true" />
              Prévia de {meta.label.toLowerCase()}
            </h3>
            <p>Veja como esta seção vai aparecer no site.</p>
          </div>
          <span className="cms-vivo">
            <span aria-hidden="true" />
            Atualiza enquanto você escreve
          </span>
        </div>
        <div className="cms-previa-palco">
          <SectionPreview id={id} draft={draft} images={images} />
        </div>
      </section>

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
          <kbd className="cms-atalho" title="Atalho para salvar">
            Ctrl+S
          </kbd>
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
