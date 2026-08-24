import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarCheck,
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
          <p className="landing-preview-title">Prévia</p>
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
    return (
      <>
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <Field label="Botão principal">
            <input value={draft.primaryCta ?? ''} onChange={(e) => set('primaryCta', e.target.value)} />
          </Field>
          <Field label="Botão secundário">
            <input value={draft.secondaryCta ?? ''} onChange={(e) => set('secondaryCta', e.target.value)} />
          </Field>
        </div>

        <RepeatingList
          label="Slides"
          items={draft.slides ?? []}
          max={5}
          onChange={(slides) => set('slides', slides)}
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
    return (
      <>
        <ImageField slot="about.portrait" images={images} targets={targets} onChanged={onChanged} />
        <HeadingFields draft={draft} set={set} />
        <Field label="Texto principal">
          <textarea rows={5} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
        </Field>
        <StringList
          label="Pontos"
          hint="Cada linha aparece com um traço à esquerda."
          items={draft.highlights ?? []}
          max={8}
          onChange={(items) => set('highlights', items)}
        />
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
        <HeadingFields draft={draft} set={set} lead />
        <Field label="Texto do botão">
          <input value={draft.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} />
        </Field>
      </>
    )
  }

  if (id === 'TECHNOLOGY') {
    return (
      <>
        <HeadingFields draft={draft} set={set} lead />
        <Field label="Palavra de fundo">
          <input value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value)} />
        </Field>
        <RepeatingList
          label="Recursos"
          items={draft.items ?? []}
          max={6}
          onChange={(items) => set('items', items)}
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
        <HeadingFields draft={draft} set={set} />
      </>
    )
  }

  if (id === 'APPOINTMENT') {
    return (
      <>
        <HeadingFields draft={draft} set={set} lead />
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
      </>
    )
  }

  if (id === 'FOOTER') {
    return (
      <>
        <ImageField slot="footer.logo" images={images} targets={targets} onChanged={onChanged} />
        <Field label="Frase de apresentação">
          <textarea rows={3} value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} />
        </Field>
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
        <Field label="Título da newsletter">
          <input value={draft.newsletterTitle ?? ''} onChange={(e) => set('newsletterTitle', e.target.value)} />
        </Field>
        <Field label="Chamada da newsletter">
          <textarea rows={2} value={draft.newsletterLead ?? ''} onChange={(e) => set('newsletterLead', e.target.value)} />
        </Field>
      </>
    )
  }

  // SEO
  return (
    <>
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
      <ImageField slot="seo.og" images={images} targets={targets} onChanged={onChanged} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Listas editáveis
// ─────────────────────────────────────────────────────────────────────────────

function StringList({
  label,
  hint,
  items,
  max,
  onChange,
}: {
  label: string
  hint?: string
  items: string[]
  max: number
  onChange: (items: string[]) => void
}) {
  return (
    <div className="string-list">
      <p className="form-section-title">{label}</p>
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

function RepeatingList<T>({
  label,
  items,
  max,
  blank,
  onChange,
  render,
}: {
  label: string
  items: T[]
  max: number
  blank: () => T
  onChange: (items: T[]) => void
  render: (item: T, index: number, update: (next: T) => void) => React.ReactNode
}) {
  return (
    <div className="repeat-list">
      <p className="form-section-title">{label}</p>
      {items.map((item, index) => (
        <fieldset key={index} className="repeat-item">
          <legend>
            {label.replace(/s$/, '')} {index + 1}
          </legend>
          <div className="repeat-item-body">
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
          </div>
        </fieldset>
      ))}
      {items.length < max && (
        <button type="button" className="string-add" onClick={() => onChange([...items, blank()])}>
          <Plus size={13} aria-hidden="true" />
          Adicionar {label.replace(/s$/, '').toLowerCase()}
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
function SearchPreview({ title, description }: { title: string; description: string }) {
  return (
    <div className="serp-preview">
      <p className="serp-url">dramarceladuch.com.br</p>
      <p className="serp-title">{title || 'Título da página'}</p>
      <p className="serp-desc">{description || 'A descrição aparece aqui.'}</p>
    </div>
  )
}

/**
 * Aproximação editorial da seção, não uma cópia fiel do site: reproduz a
 * hierarquia (sobrelinha, título em duas linhas, texto) para que dê para julgar
 * o tamanho do texto antes de publicar.
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
    return <SearchPreview title={draft.title ?? ''} description={draft.description ?? ''} />
  }

  if (id === 'HERO') {
    const slides: any[] = draft.slides ?? []
    return (
      <div className="preview-stack">
        {slides.map((slide, index) => (
          <article key={index} className="preview-card">
            {images[`hero.${index}`] && (
              <img src={images[`hero.${index}`].url} alt="" className="preview-image" />
            )}
            <p className="preview-eyebrow">{slide.eyebrow}</p>
            <p className="preview-title">
              {slide.titleTop}
              <em>{slide.titleBottom}</em>
            </p>
            <p className="preview-text">{slide.subtitle}</p>
          </article>
        ))}
        <p className="preview-buttons">
          <span className="preview-btn-solid">{draft.primaryCta}</span>
          <span className="preview-btn-ghost">{draft.secondaryCta}</span>
        </p>
      </div>
    )
  }

  if (id === 'FOOTER') {
    return (
      <article className="preview-card">
        {images['footer.logo'] && (
          <img src={images['footer.logo'].url} alt="" className="preview-logo" />
        )}
        <p className="preview-text">{draft.tagline}</p>
        <p className="preview-meta">{draft.address}</p>
        {draft.phone && <p className="preview-meta">{draft.phone}</p>}
        {draft.email && <p className="preview-meta">{draft.email}</p>}
        {draft.instagram && <p className="preview-meta">@{draft.instagram}</p>}
        <p className="preview-eyebrow">{draft.newsletterTitle}</p>
        <p className="preview-text">{draft.newsletterLead}</p>
      </article>
    )
  }

  return (
    <article className="preview-card">
      {id === 'ABOUT' && images['about.portrait'] && (
        <img src={images['about.portrait'].url} alt="" className="preview-image" />
      )}
      <p className="preview-eyebrow">{draft.eyebrow}</p>
      <p className="preview-title">
        {draft.titleTop}
        <em>{draft.titleBottom}</em>
      </p>
      {draft.lead && <p className="preview-text">{draft.lead}</p>}
      {Array.isArray(draft.highlights) &&
        draft.highlights.map((item: string, index: number) => (
          <p key={index} className="preview-bullet">
            {item}
          </p>
        ))}
      {Array.isArray(draft.items) &&
        draft.items.map((item: any, index: number) => (
          <div key={index} className="preview-sub">
            <p className="preview-eyebrow">
              {item.number} · {item.eyebrow}
            </p>
            <p className="preview-subtitle">{item.name}</p>
            <p className="preview-text">{item.description}</p>
          </div>
        ))}
      {draft.disclaimer && <p className="preview-meta">{draft.disclaimer}</p>}
      {draft.crmNumber && (
        <p className="preview-meta">
          {draft.crmLabel} {draft.crmNumber}
        </p>
      )}
    </article>
  )
}
