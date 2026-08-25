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

// ─────────────────────────────────────────────────────────────────────────────

type SectionId =
  | 'HERO'
  | 'ABOUT'
  | 'PROCEDURES'
  | 'TECHNOLOGY'
  | 'TESTIMONIALS'
  | 'APPOINTMENT'
  | 'FOOTER'
  | 'SEO'

interface SectionState {
  content: Record<string, any>
  isVisible: boolean
  /** false enquanto a seção ainda usa o texto de fábrica. */
  isCustom: boolean
  updatedAt: string | null
}

interface LandingData {
  sections: Record<SectionId, SectionState>
  images: Record<string, { url: string; width: number; height: number; alt: string }>
  imageTargets: Record<string, CropTarget>
}

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
function Fold({
  title,
  hint,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const bodyId = React.useId()

  return (
    <section className="fold">
      <button
        type="button"
        className="fold-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          size={15}
          aria-hidden="true"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s ease' }}
        />
        <span className="fold-title">
          <strong>{title}</strong>
          {hint && <em>{hint}</em>}
        </span>
        {count !== undefined && <span className="fold-count">{count}</span>}
      </button>
      {open && (
        <div className="fold-body" id={bodyId}>
          {children}
        </div>
      )}
    </section>
  )
}

/** Cabeçalho comum: quase toda seção tem sobrelinha e título em duas partes. */
function HeadingFields({ draft, set, lead }: { draft: any; set: (p: string, v: unknown) => void; lead?: boolean }) {
  return (
    <>
      <Field label="Sobrelinha" hint="A linha pequena em maiúsculas acima do título.">
        <input value={draft.eyebrow ?? ''} onChange={(e) => set('eyebrow', e.target.value)} />
      </Field>
      <Field label="Título — primeira linha">
        <input value={draft.titleTop ?? ''} onChange={(e) => set('titleTop', e.target.value)} />
      </Field>
      <Field label="Título — segunda linha" hint="Sai em itálico, mais leve.">
        <input value={draft.titleBottom ?? ''} onChange={(e) => set('titleBottom', e.target.value)} />
      </Field>
      {lead && (
        <Field label="Texto de apoio">
          <textarea rows={3} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
        </Field>
      )}
    </>
  )
}

function SectionFields({
  id,
  draft,
  set,
  images,
  targets,
  onChanged,
}: {
  id: SectionId
  draft: any
  set: (path: string, value: unknown) => void
  images: LandingData['images']
  targets: LandingData['imageTargets']
  onChanged: () => void
}) {
  if (id === 'HERO') {
    const slides: any[] = draft.slides ?? []
    return (
      <>
        <Fold title="Botões" hint="As duas chamadas sob o título" defaultOpen>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Botão principal">
              <input value={draft.primaryCta ?? ''} onChange={(e) => set('primaryCta', e.target.value)} />
            </Field>
            <Field label="Botão secundário">
              <input value={draft.secondaryCta ?? ''} onChange={(e) => set('secondaryCta', e.target.value)} />
            </Field>
          </div>
        </Fold>

        <RepeatingList
          label="Slides"
          items={slides}
          max={5}
          /* O primeiro slide é o que abre o site, então é o que quase sempre se
             vem editar; os outros ficam fechados até serem pedidos. */
          openFirst
          itemTitle={(slide, index) =>
            [slide.titleTop, slide.titleBottom].filter(Boolean).join(' ') || `Slide ${index + 1}`
          }
          onChange={(next) => set('slides', next)}
          blank={() => ({
            eyebrow: '',
            titleTop: '',
            titleBottom: '',
            subtitle: '',
            watermark: '',
            image: null,
          })}
          render={(slide, index, update) => (
            <>
              <ImageField
                slot={`hero.${index}`}
                images={images}
                targets={targets}
                onChanged={onChanged}
              />
              <Field label="Sobrelinha">
                <input value={slide.eyebrow} onChange={(e) => update({ ...slide, eyebrow: e.target.value })} />
              </Field>
              <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <Field label="Título — 1ª linha">
                  <input value={slide.titleTop} onChange={(e) => update({ ...slide, titleTop: e.target.value })} />
                </Field>
                <Field label="Título — 2ª linha">
                  <input value={slide.titleBottom} onChange={(e) => update({ ...slide, titleBottom: e.target.value })} />
                </Field>
              </div>
              <Field label="Texto">
                <textarea rows={2} value={slide.subtitle} onChange={(e) => update({ ...slide, subtitle: e.target.value })} />
              </Field>
              <Field label="Palavra de fundo" hint="Aparece gigante atrás do texto, só em telas largas.">
                <input value={slide.watermark} onChange={(e) => update({ ...slide, watermark: e.target.value })} />
              </Field>
            </>
          )}
        />
      </>
    )
  }

  if (id === 'ABOUT') {
    const highlights: string[] = draft.highlights ?? []
    return (
      <>
        <Fold title="Retrato" hint="A foto ao lado do texto" defaultOpen>
          <ImageField slot="about.portrait" images={images} targets={targets} onChanged={onChanged} />
        </Fold>
        <Fold title="Título e texto" hint="Sobrelinha, título e parágrafo" defaultOpen>
          <HeadingFields draft={draft} set={set} />
          <Field label="Texto principal">
            <textarea rows={5} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
        </Fold>
        <Fold title="Pontos" hint="As linhas com traço à esquerda" count={highlights.length}>
          <StringList
            label="Pontos"
            hideLabel
            items={highlights}
            max={8}
            onChange={(items) => set('highlights', items)}
          />
        </Fold>
        <Fold title="Registro e botão" hint="CRM, marca de fundo e chamada">
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Field label="Registro">
              <input value={draft.crmLabel ?? ''} onChange={(e) => set('crmLabel', e.target.value)} />
            </Field>
            <Field label="Número">
              <input value={draft.crmNumber ?? ''} onChange={(e) => set('crmNumber', e.target.value)} />
            </Field>
            <Field label="Palavra de fundo">
              <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
            </Field>
          </div>
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Fold>
      </>
    )
  }

  if (id === 'PROCEDURES') {
    return (
      <>
        <p className="hint">
          Os tratamentos em si ficam em <strong>Cadastros → Procedimentos</strong>. Aqui é o
          texto que emoldura a lista.
        </p>
        <Fold title="Título e texto" hint="O cabeçalho da seção" defaultOpen>
          <HeadingFields draft={draft} set={set} lead />
        </Fold>
        <Fold title="Botão" hint="A chamada abaixo da lista">
          <Field label="Texto do botão">
            <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
        </Fold>
      </>
    )
  }

  if (id === 'TECHNOLOGY') {
    const items: any[] = draft.items ?? []
    return (
      <>
        <Fold title="Título e texto" hint="O cabeçalho da seção" defaultOpen>
          <HeadingFields draft={draft} set={set} lead />
          <Field label="Palavra de fundo">
            <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
          </Field>
        </Fold>
        <RepeatingList
          label="Recursos"
          items={items}
          max={6}
          openFirst
          itemTitle={(item, index) => item.name || `Recurso ${index + 1}`}
          onChange={(next) => set('items', next)}
          blank={() => ({ number: '', name: '', eyebrow: '', monogram: '', description: '', points: [] })}
          render={(item, _index, update) => (
            <>
              <div className="form-row" style={{ gridTemplateColumns: '80px minmax(0, 1fr) 90px' }}>
                <Field label="Número">
                  <input value={item.number} onChange={(e) => update({ ...item, number: e.target.value })} />
                </Field>
                <Field label="Nome">
                  <input value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} />
                </Field>
                <Field label="Monograma" hint="1 a 3 letras.">
                  <input value={item.monogram} onChange={(e) => update({ ...item, monogram: e.target.value })} maxLength={3} />
                </Field>
              </div>
              <Field label="Sobrelinha">
                <input value={item.eyebrow} onChange={(e) => update({ ...item, eyebrow: e.target.value })} />
              </Field>
              <Field label="Descrição">
                <textarea rows={3} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
              </Field>
              <StringList
                label="Pontos"
                items={item.points ?? []}
                max={8}
                onChange={(points) => update({ ...item, points })}
              />
            </>
          )}
        />
      </>
    )
  }

  if (id === 'TESTIMONIALS') {
    return (
      <>
        <p className="hint">
          Os depoimentos ficam em <strong>Cadastros → Depoimentos</strong>. Aqui só o título da
          seção.
        </p>
        <Fold title="Título da seção" defaultOpen>
          <HeadingFields draft={draft} set={set} />
        </Fold>
      </>
    )
  }

  if (id === 'APPOINTMENT') {
    return (
      <>
        <Fold title="Título e texto" hint="O que fica ao lado do formulário" defaultOpen>
          <HeadingFields draft={draft} set={set} lead />
        </Fold>
        <Fold title="Aviso e WhatsApp" hint="O que aparece sob o formulário">
          <Field label="Aviso sob o formulário" hint="Explica o que acontece depois do envio.">
            <textarea rows={3} value={draft.disclaimer ?? ''} onChange={(e) => set('disclaimer', e.target.value)} />
          </Field>
          <Field label="WhatsApp" hint="Só números, com DDD. Deixe vazio para não mostrar.">
            <input
              value={draft.whatsapp ?? ''}
              onChange={(e) => set('whatsapp', e.target.value || null)}
              placeholder="67999998888"
            />
          </Field>
        </Fold>
      </>
    )
  }

  if (id === 'FOOTER') {
    return (
      <>
        <Fold title="Marca" hint="Logo e frase de apresentação" defaultOpen>
          <ImageField slot="footer.logo" images={images} targets={targets} onChanged={onChanged} />
          <Field label="Frase de apresentação">
            <textarea rows={3} value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </Fold>
        <Fold title="Contato" hint="Endereço, telefone, e-mail e Instagram" defaultOpen>
          <Field label="Endereço">
            <input value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Telefone">
              <input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value || null)} />
            </Field>
            <Field label="E-mail">
              <input value={draft.email ?? ''} onChange={(e) => set('email', e.target.value || null)} />
            </Field>
          </div>
          <Field label="Instagram" hint="Só o nome do perfil, sem @ nem link.">
            <input value={draft.instagram ?? ''} onChange={(e) => set('instagram', e.target.value || null)} />
          </Field>
        </Fold>
        <Fold title="Newsletter" hint="A caixa de inscrição">
          <Field label="Título da newsletter">
            <input value={draft.newsletterTitle ?? ''} onChange={(e) => set('newsletterTitle', e.target.value)} />
          </Field>
          <Field label="Chamada da newsletter">
            <textarea rows={2} value={draft.newsletterLead ?? ''} onChange={(e) => set('newsletterLead', e.target.value)} />
          </Field>
        </Fold>
      </>
    )
  }

  // SEO
  return (
    <>
      <Fold title="Google" hint="Título e descrição do resultado" defaultOpen>
        <Field
          label="Título na busca"
          required
          hint={`${(draft.title ?? '').length}/70 — o Google corta o que passar disso.`}
        >
          <input value={draft.title ?? ''} onChange={(e) => set('title', e.target.value)} maxLength={70} />
        </Field>
        <Field
          label="Descrição na busca"
          required
          hint={`${(draft.description ?? '').length}/180 — é o parágrafo abaixo do título no resultado.`}
        >
          <textarea rows={3} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} maxLength={180} />
        </Field>
      </Fold>
      <Fold title="Redes sociais" hint="A imagem que acompanha o link" defaultOpen>
        <ImageField slot="seo.og" images={images} targets={targets} onChanged={onChanged} />
      </Fold>
    </>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Listas editáveis
// ─────────────────────────────────────────────────────────────────────────────

function StringList({
  label,
  hint,
  hideLabel,
  items,
  max,
  onChange,
}: {
  label: string
  hint?: string
  /** Quando a lista já está dentro de um grupo com esse mesmo nome. */
  hideLabel?: boolean
  items: string[]
  max: number
  onChange: (items: string[]) => void
}) {
  return (
    <div className="string-list">
      {!hideLabel && <p className="form-section-title">{label}</p>}
      {hint && <p className="hint">{hint}</p>}
      {items.map((item, index) => (
        <div key={index} className="string-row">
          <input
            value={item}
            onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
            aria-label={`${label} — item ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            title="Remover"
            aria-label={`Remover item ${index + 1}`}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="string-add" onClick={() => onChange([...items, ''])}>
          <Plus size={13} aria-hidden="true" />
          Adicionar
        </button>
      )}
    </div>
  )
}

/**
 * Lista de blocos repetidos — slides do hero, recursos da tecnologia.
 *
 * Cada bloco é um grupo colapsável titulado pelo próprio conteúdo (o título do
 * slide, o nome do recurso), não por "Slide 2": com cinco slides fechados,
 * "Evoluir sem exageros" diz qual é e "Slide 2" não.
 */
function RepeatingList<T>({
  label,
  items,
  max,
  blank,
  onChange,
  render,
  itemTitle,
  openFirst,
}: {
  label: string
  items: T[]
  max: number
  blank: () => T
  onChange: (items: T[]) => void
  render: (item: T, index: number, update: (next: T) => void) => React.ReactNode
  /** Como nomear o bloco fechado; cai no rótulo numerado se vier vazio. */
  itemTitle?: (item: T, index: number) => string
  openFirst?: boolean
}) {
  const singular = label.replace(/s$/, '')

  return (
    <div className="repeat-list">
      <p className="form-section-title">
        {label} <span className="fold-count">{items.length}</span>
      </p>
      {items.map((item, index) => (
        <Fold
          key={index}
          title={itemTitle?.(item, index) || `${singular} ${index + 1}`}
          hint={`${singular} ${index + 1}`}
          defaultOpen={openFirst && index === 0}
        >
          {render(item, index, (next) => onChange(items.map((v, i) => (i === index ? next : v))))}
          {items.length > 1 && (
            <button
              type="button"
              className="repeat-remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={13} aria-hidden="true" />
              Remover
            </button>
          )}
        </Fold>
      ))}
      {items.length < max && (
        <button type="button" className="string-add" onClick={() => onChange([...items, blank()])}>
          <Plus size={13} aria-hidden="true" />
          Adicionar {singular.toLowerCase()}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Imagem de um slot
// ─────────────────────────────────────────────────────────────────────────────

function ImageField({
  slot,
  images,
  targets,
  onChanged,
}: {
  slot: string
  images: LandingData['images']
  targets: LandingData['imageTargets']
  onChanged: () => void
}) {
  const [cropping, setCropping] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const client = useQueryClient()
  const target = targets[slot]
  const current = images[slot]

  const remove = useMutation({
    mutationFn: () => api.delete(`/landing/admin/images/${slot}`),
    onSuccess: () => {
      setRemoving(false)
      client.invalidateQueries({ queryKey: ['landing'] })
    },
  })

  if (!target) return null

  return (
    <div className="image-field">
      <div className="image-field-thumb" style={{ aspectRatio: `${target.width} / ${target.height}` }}>
        {current ? (
          <img src={current.url} alt={current.alt} />
        ) : (
          <span className="image-field-empty">
            <ImageIcon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="image-field-text">
        <strong>{target.label}</strong>
        <span className="hint">
          {target.width}×{target.height}px
          {current ? ` · ${current.alt}` : ' · usando a imagem que vem no site'}
        </span>
        <div className="image-field-actions">
          <button type="button" onClick={() => setCropping(true)}>
            {current ? 'Trocar' : 'Enviar'}
          </button>
          {current && (
            <button type="button" onClick={() => setRemoving(true)}>
              Remover
            </button>
          )}
        </div>
      </div>

      {cropping && (
        <ImageCropper
          slot={slot}
          target={target}
          currentUrl={current?.url}
          currentAlt={current?.alt}
          onClose={() => setCropping(false)}
          onDone={() => {
            setCropping(false)
            onChanged()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remover esta imagem?"
          message={`O site volta a usar a imagem original de "${target.label}".`}
          confirmLabel="Remover"
          danger
          pending={remove.isPending}
          onCancel={() => setRemoving(false)}
          onConfirm={() => remove.mutate()}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Prévia
// ─────────────────────────────────────────────────────────────────────────────

/** Como o resultado aparece numa busca — o formato mais reconhecível. */
function SearchPreview({
  title,
  description,
  og,
}: {
  title: string
  description: string
  og?: { url: string; alt: string }
}) {
  return (
    <div className="preview-stack" style={{ display: 'grid', gap: 10 }}>
      <div className="serp-preview">
        <p className="serp-url">dramarceladuch.com.br</p>
        <p className="serp-title">{title || 'Título da página'}</p>
        <p className="serp-desc">{description || 'A descrição aparece aqui.'}</p>
      </div>
      {/* O mesmo texto acompanha o link quando ele é colado no WhatsApp ou no
          Instagram — lá a imagem é o que aparece primeiro. */}
      {og && <img className="serp-og" src={og.url} alt={og.alt} />}
    </div>
  )
}

/** Fotografia de um slot, com a borda dupla e a proporção que o site usa. */
function Figure({
  image,
  ratio,
  label,
}: {
  image?: { url: string; alt: string }
  ratio: string
  label: string
}) {
  return (
    <div className="lp-figure" style={{ aspectRatio: ratio }}>
      {image ? (
        <img src={image.url} alt={image.alt} />
      ) : (
        <span className="lp-figure-empty">{label}</span>
      )}
    </div>
  )
}

/** Título em duas linhas — a segunda sempre itálica, como em todas as seções. */
function Title({ top, bottom, level }: { top?: string; bottom?: string; level: 'hero' | 'section' | 'block' }) {
  return (
    <p className={`lp-display lp-title-${level}`}>
      {top}
      <span className="lp-title-italic">{bottom}</span>
    </p>
  )
}

function Points({ items }: { items: string[] }) {
  return (
    <div className="lp-stack-tight">
      {items.map((item, index) => (
        <div key={index} className="lp-point">
          <p className="lp-body">{item}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * A seção como ela sai no site.
 *
 * Aqui não há aproximação: as classes `lp-*` repetem os tokens, as fontes e a
 * estrutura de `apps/web`, e a escala tipográfica está ancorada na largura do
 * próprio quadro. O que se vê é a seção inteira reduzida — mesma hierarquia,
 * mesmas cores, mesma proporção entre título, texto e foto — e não uma lista de
 * campos formatada. Por isso dá para decidir olhando se o título ficou grande
 * demais ou se o texto de apoio está longo.
 */
function SectionPreview({
  id,
  draft,
  images,
}: {
  id: SectionId
  draft: any
  images: LandingData['images']
}) {
  if (id === 'SEO') {
    return (
      <SearchPreview
        title={draft.title ?? ''}
        description={draft.description ?? ''}
        og={images['seo.og']}
      />
    )
  }

  if (id === 'HERO') {
    const slides: any[] = draft.slides ?? []
    return (
      <div className="lp-slides">
        {slides.map((slide, index) => (
          <div key={index}>
            {/* O site mostra um slide por vez; a prévia empilha para dar para
                comparar os três sem esperar o carrossel girar. */}
            <p className="lp-slide-tag">Slide {index + 1}</p>
            <section className="lp lp-hero lp-marble">
              <div className="lp-inner">
                <span className="lp-watermark">{slide.watermark}</span>
                <div className="lp-split">
                  <div className="lp-stack">
                    <p className="lp-eyebrow">{slide.eyebrow}</p>
                    <Title top={slide.titleTop} bottom={slide.titleBottom} level="hero" />
                    <p className="lp-lead">{slide.subtitle}</p>
                    <div className="lp-actions">
                      <span className="lp-btn lp-btn-cta">{draft.primaryCta}</span>
                      <span className="lp-btn lp-btn-outline">{draft.secondaryCta}</span>
                    </div>
                  </div>
                  <Figure image={images[`hero.${index}`]} ratio="4 / 5" label="foto do site" />
                </div>
                <div className="lp-dots" aria-hidden="true">
                  {slides.map((_, dot) => (
                    <span key={dot} className={`lp-dot${dot === index ? ' is-on' : ''}`} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        ))}
      </div>
    )
  }

  if (id === 'ABOUT') {
    return (
      <section className="lp">
        <div className="lp-inner">
          <span className="lp-watermark lp-watermark-top">{draft.watermark}</span>
          <div className="lp-split lp-split-reverse">
            <div className="lp-crm-host">
              <Figure image={images['about.portrait']} ratio="4 / 5" label="retrato" />
              <div className="lp-crm">
                <p className="lp-crm-label">{draft.crmLabel}</p>
                <p className="lp-crm-value">{draft.crmNumber}</p>
              </div>
            </div>
            <div className="lp-stack">
              <p className="lp-eyebrow">{draft.eyebrow}</p>
              <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
              <span className="lp-divider" />
              <p className="lp-lead lp-lead-roman">{draft.lead}</p>
              <Points items={draft.highlights ?? []} />
              <div className="lp-actions">
                <span className="lp-btn lp-btn-outline">{draft.ctaLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (id === 'PROCEDURES') {
    return (
      <section className="lp lp-cream-deep">
        <div className="lp-inner">
          <div className="lp-head">
            <p className="lp-eyebrow">{draft.eyebrow}</p>
            <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
            <p className="lp-lead">{draft.lead}</p>
          </div>
          {/* Os tratamentos vêm do cadastro, não deste formulário — o quadro
              marca onde a lista entra para dar a noção do espaço que sobra. */}
          <div className="lp-placeholder">
            <p className="lp-eyebrow">a lista de tratamentos entra aqui</p>
            <p className="lp-body">Cadastros → Procedimentos</p>
          </div>
          <div className="lp-actions" style={{ marginTop: '5cqw', justifyContent: 'center' }}>
            <span className="lp-btn lp-btn-cta">{draft.ctaLabel}</span>
          </div>
        </div>
      </section>
    )
  }

  if (id === 'TECHNOLOGY') {
    const items: any[] = draft.items ?? []
    return (
      <section className="lp">
        <div className="lp-inner">
          <span className="lp-watermark lp-watermark-top">{draft.watermark}</span>
          <div className="lp-head">
            <p className="lp-eyebrow">{draft.eyebrow}</p>
            <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
            <p className="lp-lead">{draft.lead}</p>
          </div>
          <div className="lp-stack" style={{ gap: '7cqw' }}>
            {items.map((item, index) => (
              /* No site os blocos alternam o lado da imagem; a prévia faz o
                 mesmo, senão o ritmo da seção não aparece. */
              <div key={index} className={`lp-split${index % 2 ? '' : ' lp-split-reverse'}`}>
                <div
                  className="lp-figure lp-marble"
                  style={{ aspectRatio: '4 / 5', order: index % 2 ? 2 : 0 }}
                >
                  <span
                    className="lp-display"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '14cqw',
                      color: 'hsl(var(--primary) / .15)',
                    }}
                  >
                    {item.monogram}
                  </span>
                  <span
                    className="lp-display"
                    style={{
                      position: 'absolute',
                      top: '3cqw',
                      left: '3cqw',
                      fontSize: '4cqw',
                      color: 'hsl(var(--accent) / .7)',
                    }}
                  >
                    {item.number}
                  </span>
                </div>
                <div className="lp-stack">
                  <p className="lp-eyebrow">{item.eyebrow}</p>
                  <p className="lp-display lp-title-block">{item.name}</p>
                  <span className="lp-divider" />
                  <p className="lp-lead lp-lead-roman">{item.description}</p>
                  <Points items={item.points ?? []} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (id === 'TESTIMONIALS') {
    return (
      <section className="lp lp-cream-deep">
        <div className="lp-inner">
          <div className="lp-head">
            <p className="lp-eyebrow">{draft.eyebrow}</p>
            <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
          </div>
          <div className="lp-cards">
            {[0, 1].map((card) => (
              <div key={card} className="lp-card lp-stack-tight">
                <span className="lp-divider" />
                <p className="lp-lead">Depoimento cadastrado</p>
                <p className="lp-eyebrow">nome da paciente</p>
              </div>
            ))}
          </div>
          <p className="lp-body" style={{ marginTop: '4cqw', textAlign: 'center' }}>
            Os depoimentos vêm de Cadastros → Depoimentos.
          </p>
        </div>
      </section>
    )
  }

  if (id === 'APPOINTMENT') {
    return (
      <section className="lp lp-espresso">
        <div className="lp-inner">
          <div className="lp-split">
            <div className="lp-stack">
              <p className="lp-eyebrow">{draft.eyebrow}</p>
              <Title top={draft.titleTop} bottom={draft.titleBottom} level="section" />
              <span className="lp-divider" />
              <p className="lp-lead">{draft.lead}</p>
              {draft.whatsapp && (
                <div className="lp-actions">
                  <span className="lp-btn lp-btn-cta">WhatsApp</span>
                </div>
              )}
            </div>
            <div className="lp-stack-tight">
              <p className="lp-eyebrow">Solicitação de avaliação</p>
              <div className="lp-input">Nome</div>
              <div className="lp-input">Telefone</div>
              <div className="lp-input">Horário</div>
              <p className="lp-body">{draft.disclaimer}</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // FOOTER
  return (
    <section className="lp lp-espresso">
      <div className="lp-inner">
        <div className="lp-footer-grid">
          <div className="lp-stack-tight">
            {images['footer.logo'] ? (
              <img className="lp-footer-logo" src={images['footer.logo'].url} alt="" />
            ) : (
              <p className="lp-field-label">logo</p>
            )}
            <p className="lp-brand">Dra. Marcela Duch</p>
            <p className="lp-brand-sub">Médica · CRM/MS 5691</p>
            <p className="lp-lead">{draft.tagline}</p>
            <div className="lp-social" aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
          <div className="lp-stack-tight">
            <p className="lp-field-label">Endereço</p>
            <p className="lp-body">{draft.address}</p>
            {draft.phone && (
              <>
                <p className="lp-field-label">Telefone</p>
                <p className="lp-body">{formatPhone(draft.phone)}</p>
              </>
            )}
            {draft.email && (
              <>
                <p className="lp-field-label">E-mail</p>
                <p className="lp-body">{draft.email}</p>
              </>
            )}
            {draft.instagram && (
              <>
                <p className="lp-field-label">Instagram</p>
                <p className="lp-body">@{draft.instagram}</p>
              </>
            )}
            <p className="lp-field-label">{draft.newsletterTitle}</p>
            <p className="lp-body">{draft.newsletterLead}</p>
            <div className="lp-input">seu@email.com</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** (67) 99944-6066 — o mesmo formato que o rodapé do site imprime. */
function formatPhone(digits: string) {
  const only = String(digits).replace(/\D/g, '').replace(/^55/, '')
  if (only.length === 11) return `(${only.slice(0, 2)}) ${only.slice(2, 7)}-${only.slice(7)}`
  if (only.length === 10) return `(${only.slice(0, 2)}) ${only.slice(2, 6)}-${only.slice(6)}`
  return digits
}
