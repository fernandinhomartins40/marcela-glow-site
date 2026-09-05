import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Image as ImageIcon, Info, Plus, Trash2, Upload } from 'lucide-react'
import { api, ConfirmDialog, Field } from '../../lib/ui'
import { ImageCropper } from '../ImageCropper'
import type { LandingData } from './types'

/**
 * Peças que várias seções reaproveitam: divisória com título, lista de textos,
 * lista de blocos repetidos e o campo de foto com recorte.
 */

/**
 * Divisória com título.
 *
 * Substitui o grupo sanfonado que existia aqui. A sanfona economizava altura,
 * mas cobrava caro: fechada, ela escondia o campo procurado e não havia como
 * saber em qual das quatro dobras ele estava senão abrindo uma a uma. Como a
 * seção mais longa tem nove campos, a rolagem que a sanfona evitava era menor
 * que o custo de procurar.
 */
export function Bloco({
  title,
  hint,
  nota,
  children,
}: {
  title: string
  hint?: string
  /** Um aviso destacado — normalmente "isto se cadastra em outro lugar". */
  nota?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="cms-bloco">
      <div className="cms-bloco-head">
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
      </div>
      {nota && (
        <p className="cms-nota">
          <Info size={14} aria-hidden="true" />
          <span>{nota}</span>
        </p>
      )}
      <div className="cms-bloco-body">{children}</div>
    </section>
  )
}

/**
 * Lista de textos curtos — os pontos de destaque, os itens de um recurso.
 */
export function StringList({
  label,
  titulo,
  items,
  max,
  placeholder,
  onChange,
}: {
  /** No singular: vira o rótulo de cada linha ("Ponto 1", "Ponto 2"). */
  label: string
  /** Título opcional acima da lista, quando ela não é a única coisa do bloco. */
  titulo?: string
  items: string[]
  max: number
  placeholder?: string
  onChange: (items: string[]) => void
}) {
  const mover = (de: number, para: number) => {
    if (para < 0 || para >= items.length) return
    const next = [...items]
    const [item] = next.splice(de, 1)
    next.splice(para, 0, item)
    onChange(next)
  }

  return (
    <div className="cms-linhas">
      {titulo && <p className="cms-linhas-titulo">{titulo}</p>}

      {items.length === 0 && <p className="cms-linhas-vazio">Nenhum item ainda.</p>}

      {items.map((item, index) => (
        <div key={index} className="cms-linha">
          <span className="cms-linha-num" aria-hidden="true">
            {index + 1}
          </span>
          <input
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
            aria-label={`${label} ${index + 1}`}
          />
          <div className="cms-linha-acoes">
            <button
              type="button"
              onClick={() => mover(index, index - 1)}
              disabled={index === 0}
              title="Mover para cima"
              aria-label={`Mover ${label.toLowerCase()} ${index + 1} para cima`}
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => mover(index, index + 1)}
              disabled={index === items.length - 1}
              title="Mover para baixo"
              aria-label={`Mover ${label.toLowerCase()} ${index + 1} para baixo`}
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cms-linha-apagar"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              title="Apagar esta linha"
              aria-label={`Apagar ${label.toLowerCase()} ${index + 1}`}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}

      {items.length < max ? (
        <button type="button" className="cms-add" onClick={() => onChange([...items, ''])}>
          <Plus size={14} aria-hidden="true" />
          Adicionar {label.toLowerCase()}
        </button>
      ) : (
        <p className="cms-linhas-vazio">Máximo de {max} itens.</p>
      )}
    </div>
  )
}

/**
 * Lista de blocos repetidos — os slides da primeira tela, os recursos da
 * tecnologia.
 *
 * Todos ficam abertos, um sob o outro, numerados. Antes vinham dobrados e só o
 * primeiro abria: quem queria o slide 3 clicava, procurava, clicava de novo.
 * Como o máximo são cinco, a rolagem é curta e a visão contínua ganha.
 *
 * Apagar pede confirmação: são parágrafos escritos à mão, e a lixeira ficava
 * encostada nos campos de texto.
 */
export function RepeatingList<T>({
  label,
  singular,
  hint,
  items,
  max,
  blank,
  onChange,
  render,
  itemTitle,
}: {
  label: string
  singular: string
  hint?: string
  items: T[]
  max: number
  blank: () => T
  onChange: (items: T[]) => void
  render: (item: T, index: number, update: (next: T) => void) => React.ReactNode
  itemTitle?: (item: T, index: number) => string
}) {
  const [apagando, setApagando] = React.useState<number | null>(null)

  const mover = (de: number, para: number) => {
    if (para < 0 || para >= items.length) return
    const next = [...items]
    const [item] = next.splice(de, 1)
    next.splice(para, 0, item)
    onChange(next)
  }

  return (
    <section className="cms-bloco">
      <div className="cms-bloco-head">
        <h3>
          {label}
          <span className="cms-conta">
            {items.length} de {max}
          </span>
        </h3>
        {hint && <p>{hint}</p>}
      </div>

      <div className="cms-bloco-body cms-repete">
        {items.map((item, index) => (
          <article key={index} className="cms-item">
            <header className="cms-item-head">
              <span className="cms-item-num" aria-hidden="true">
                {index + 1}
              </span>
              <h4>{itemTitle?.(item, index) || `${cap(singular)} ${index + 1}`}</h4>
              <div className="cms-linha-acoes">
                <button
                  type="button"
                  onClick={() => mover(index, index - 1)}
                  disabled={index === 0}
                  title={`Mover este ${singular} para cima`}
                  aria-label={`Mover ${singular} ${index + 1} para cima`}
                >
                  <ChevronUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(index, index + 1)}
                  disabled={index === items.length - 1}
                  title={`Mover este ${singular} para baixo`}
                  aria-label={`Mover ${singular} ${index + 1} para baixo`}
                >
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="cms-linha-apagar"
                    onClick={() => setApagando(index)}
                    title={`Apagar este ${singular}`}
                    aria-label={`Apagar ${singular} ${index + 1}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </header>
            <div className="cms-item-body">
              {render(item, index, (next) => onChange(items.map((v, i) => (i === index ? next : v))))}
            </div>
          </article>
        ))}

        {items.length < max && (
          <button type="button" className="cms-add" onClick={() => onChange([...items, blank()])}>
            <Plus size={14} aria-hidden="true" />
            Adicionar {singular}
          </button>
        )}
      </div>

      {apagando !== null && (
        <ConfirmDialog
          title={`Apagar este ${singular}?`}
          message={`"${
            itemTitle?.(items[apagando], apagando) || `${cap(singular)} ${apagando + 1}`
          }" sai do site junto com o texto escrito nele. A foto enviada continua guardada.`}
          confirmLabel="Apagar"
          danger
          onCancel={() => setApagando(null)}
          onConfirm={() => {
            onChange(items.filter((_, i) => i !== apagando))
            setApagando(null)
          }}
        />
      )}
    </section>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ─────────────────────────────────────────────────────────────────────────────
// Foto de um espaço do site
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
    <div className="cms-foto">
      <button
        type="button"
        className="cms-foto-thumb"
        style={{ aspectRatio: `${target.width} / ${target.height}` }}
        onClick={() => setCropping(true)}
        title={current ? 'Trocar esta foto' : 'Enviar uma foto'}
        aria-label={current ? `Trocar a foto: ${target.label}` : `Enviar a foto: ${target.label}`}
      >
        {current ? (
          <img src={current.url} alt={current.alt} />
        ) : (
          <span className="cms-foto-vazio">
            <ImageIcon size={20} aria-hidden="true" />
            <span>sem foto</span>
          </span>
        )}
      </button>

      <div className="cms-foto-texto">
        <strong>{target.label}</strong>
        <span className="hint">
          {current
            ? `Enviada · ${current.alt || 'sem descrição'}`
            : 'Ainda usando a foto que veio pronta no site.'}
        </span>
        <span className="hint">
          A foto é cortada em {target.width}×{target.height} pixels — o recorte é feito na hora do
          envio.
        </span>
        <div className="cms-foto-acoes">
          <button type="button" className="primary" onClick={() => setCropping(true)}>
            <Upload size={13} aria-hidden="true" />
            {current ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {current && (
            <button type="button" onClick={() => setRemoving(true)}>
              <Trash2 size={13} aria-hidden="true" />
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
          title="Remover esta foto?"
          message={`O site volta a usar a foto original de "${target.label}".`}
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

/** Cabeçalho comum: quase toda seção tem a linha pequena e o título em duas partes. */
export function HeadingFields({
  draft,
  set,
  lead,
}: {
  draft: any
  set: (p: string, v: unknown) => void
  lead?: boolean
}) {
  return (
    <>
      <Field label="Linha pequena acima do título" hint="Sai em maiúsculas, discreta.">
        <input value={draft.eyebrow ?? ''} onChange={(e) => set('eyebrow', e.target.value)} />
      </Field>
      <div className="form-row form-row-2">
        <Field label="Título — 1ª linha" hint="Sai em letra reta, mais firme.">
          <input value={draft.titleTop ?? ''} onChange={(e) => set('titleTop', e.target.value)} />
        </Field>
        <Field label="Título — 2ª linha" hint="Sai em itálico, mais leve.">
          <input value={draft.titleBottom ?? ''} onChange={(e) => set('titleBottom', e.target.value)} />
        </Field>
      </div>
      {lead && (
        <Field label="Texto de apoio" hint="A frase sob o título.">
          <textarea rows={3} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
        </Field>
      )}
    </>
  )
}
