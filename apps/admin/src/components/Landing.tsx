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
import { StringList, RepeatingList, ImageField } from './landing/campos'
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
