import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { api, ConfirmDialog, Field } from '../../lib/ui'
import { ImageCropper } from '../ImageCropper'
import type { CropTarget } from '../../lib/imageCrop'
import type { LandingData } from './types'

/**
 * Campos que varias secoes reaproveitam: lista de textos, lista de blocos
 * repetidos e o campo de imagem com recorte.
 */

export function StringList({
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
export function RepeatingList<T>({
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

export function ImageField({
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

export function Fold({
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
export function HeadingFields({ draft, set, lead }: { draft: any; set: (p: string, v: unknown) => void; lead?: boolean }) {
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
