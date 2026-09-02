import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarCheck,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  MessageSquareQuote,
  PanelBottom,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api, Chip, ConfirmDialog, errorMessage, Field, SubmitButton, Toolbar } from '../lib/ui'
import { ImageCropper } from './ImageCropper'
import type { CropTarget } from '../lib/imageCrop'
import { SectionFields } from './landing/secoes'
import { SectionPreview } from './landing/preview'
import type { SectionId, SectionState, LandingData } from './landing/types'

// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'HERO', label: 'Primeira tela', icon: Sparkles, hint: 'O carrossel que abre o site' },
  { id: 'ABOUT', label: 'Sobre a doutora', icon: UserRound, hint: 'Retrato, texto e credenciais' },
  { id: 'PROCEDURES', label: 'Tratamentos', icon: Layers, hint: 'Texto que emoldura a lista' },
  { id: 'TECHNOLOGY', label: 'Tecnologia', icon: Wrench, hint: 'Os recursos e o que cada um faz' },
  { id: 'TESTIMONIALS', label: 'Depoimentos', icon: MessageSquareQuote, hint: 'Título da seção' },
  { id: 'APPOINTMENT', label: 'Agendamento', icon: CalendarCheck, hint: 'Chamada do formulário' },
  { id: 'FOOTER', label: 'Rodapé', icon: PanelBottom, hint: 'Contato, endereço e logo' },
  { id: 'SEO', label: 'Busca e redes', icon: Search, hint: 'Como o site aparece no Google' },
]

// ─────────────────────────────────────────────────────────────────────────────

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

  const state = query.data.sections[active]

  return (
    <div className="landing-layout">
      <nav className="landing-nav" aria-label="Seções da landing page">
        {SECTIONS.map((section) => {
          const data = query.data.sections[section.id]
          return (
            <button
              key={section.id}
              className={active === section.id ? 'active' : ''}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={() => setActive(section.id)}
            >
              <section.icon size={15} aria-hidden="true" />
              <span className="landing-nav-text">
                <strong>{section.label}</strong>
                <em>{section.hint}</em>
              </span>
              {!data.isVisible && (
                <>
                  <EyeOff size={13} aria-hidden="true" />
                  {/* O ícone é decorativo; o texto é o que o leitor de tela lê. */}
                  <span className="sr-only">oculta no site</span>
                </>
              )}
            </button>
          )
        })}
      </nav>

      <div className="landing-panel">
        <SectionEditor
          key={active}
          id={active}
          state={state}
          images={query.data.images}
          targets={query.data.imageTargets}
          onChanged={refresh}
        />
      </div>
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

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">{meta.label}</span>
        {!state.isCustom && <Chip tone="neutral">texto padrão</Chip>}
        {!state.isVisible && (
          <Chip tone="warning" icon={EyeOff}>
            oculta no site
          </Chip>
        )}
        <button
          onClick={() => save.mutate({ isVisible: !state.isVisible, content: state.content })}
          title={state.isVisible ? 'Esconder esta seção do site' : 'Mostrar esta seção no site'}
        >
          {state.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          {state.isVisible ? 'Ocultar' : 'Mostrar'}
        </button>
        {state.isCustom && (
          <button onClick={() => setResetting(true)} title="Voltar ao texto de fábrica">
            <RotateCcw size={14} />
            Restaurar
          </button>
        )}
        <SubmitButton pending={save.isPending} disabled={!dirty} onClick={() => save.mutate({})}>
          {dirty ? 'Salvar alterações' : 'Salvo'}
        </SubmitButton>
      </Toolbar>

      {save.isError && <p className="error">{errorMessage(save.error)}</p>}

      <div className="landing-split">
        <div className="landing-form">
          <SectionFields id={id} draft={draft} set={set} images={images} targets={targets} onChanged={onChanged} />
        </div>
        <aside className="landing-preview" aria-label="Prévia da seção">
          <p className="landing-preview-title">
            Prévia
            <span className="landing-preview-note">como fica no site</span>
          </p>
          <SectionPreview id={id} draft={draft} images={images} />
        </aside>
      </div>

      {resetting && (
        <ConfirmDialog
          title="Restaurar o texto de fábrica?"
          message={`Tudo o que foi escrito em "${meta.label}" é descartado e volta ao texto original. As imagens enviadas não são apagadas.`}
          confirmLabel="Restaurar"
          danger
          pending={reset.isPending}
          onCancel={() => setResetting(false)}
          onConfirm={() => reset.mutate()}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Campos por seção
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grupo de campos que abre e fecha.
 *
 * Uma seção como o rodapé tem nove campos; empilhados todos abertos, achar o
 * telefone exige rolar por cima da newsletter. Fechado, o grupo continua
 * dizendo o que guarda — e quantos itens tem, quando é uma lista — então
 * fechar não esconde informação, só detalhe.
 *
 * `<details>` nativo daria isso de graça, mas fecha o conteúdo do DOM ao
 * colapsar, e um campo com foco dentro some junto. O estado em React mantém o
 * rascunho intacto.
 */
