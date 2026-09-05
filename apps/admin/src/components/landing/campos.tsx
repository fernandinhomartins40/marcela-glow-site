import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, Image as ImageIcon, Info, Plus, Trash2, Upload } from 'lucide-react'
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
    <section className="cms-card">
      <div className="cms-card-head">
        <div>
          <h3>{title}</h3>
          {hint && <p>{hint}</p>}
        </div>
      </div>
      {nota && (
        <p className="cms-nota">
          <Info size={14} aria-hidden="true" />
          <span>{nota}</span>
        </p>
      )}
      <div className="cms-card-body">{children}</div>
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
 * Cada item é uma linha fechada com o próprio nome ("Beleza com estratégia",
 * não "Slide 2"): a lista inteira cabe na tela, dá para ver a ordem de relance
 * e reordenar sem rolar. Abrir custa um clique, e é o preço de conseguir
 * enxergar cinco slides de uma vez — empilhados abertos eles davam quase três
 * mil pixels de rolagem.
 *
 * Arrastar reordena. Quem não usa o mouse assim tem as setas ao lado, que
 * fazem o mesmo — e são as únicas que o leitor de tela anuncia.
 *
 * Apagar pede confirmação: são parágrafos escritos à mão, e a lixeira fica na
 * mesma linha das setas.
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
  /* Um só aberto por vez: dois abertos já rolam mais que a tela, e o motivo de
     fechar era justamente ver a lista inteira. O primeiro abre de saída para a
     lista não parecer travada. */
  const [aberto, setAberto] = React.useState<number | null>(0)
  const [arrastando, setArrastando] = React.useState<number | null>(null)
  const [alvo, setAlvo] = React.useState<number | null>(null)

  const mover = (de: number, para: number) => {
    if (para < 0 || para >= items.length || de === para) return
    const next = [...items]
    const [item] = next.splice(de, 1)
    next.splice(para, 0, item)
    onChange(next)
    // O item aberto acompanha o próprio conteúdo, não a posição.
    setAberto((atual) => (atual === de ? para : atual))
  }

  const nomeDe = (item: T, index: number) =>
    itemTitle?.(item, index) || `${cap(singular)} ${index + 1}`

  return (
    <section className="cms-card">
      <div className="cms-card-head">
        <div>
          <h3>{label}</h3>
          {hint && <p>{hint}</p>}
        </div>
        {items.length < max && (
          <button type="button" className="cms-btn primary" onClick={() => {
            onChange([...items, blank()])
            setAberto(items.length)
          }}>
            <Plus size={14} aria-hidden="true" />
            Adicionar
          </button>
        )}
      </div>

      <div className="cms-lista">
        {items.map((item, index) => {
          const estaAberto = aberto === index
          return (
            <article
              key={index}
              className={`cms-item${estaAberto ? ' is-open' : ''}${alvo === index ? ' is-target' : ''}${
                arrastando === index ? ' is-dragging' : ''
              }`}
              draggable
              onDragStart={(e) => {
                setArrastando(index)
                e.dataTransfer.effectAllowed = 'move'
                // Alguns navegadores só iniciam o arraste com dado no pacote.
                e.dataTransfer.setData('text/plain', String(index))
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (arrastando !== null && arrastando !== index) setAlvo(index)
              }}
              onDragLeave={() => setAlvo((atual) => (atual === index ? null : atual))}
              onDrop={(e) => {
                e.preventDefault()
                if (arrastando !== null) mover(arrastando, index)
                setArrastando(null)
                setAlvo(null)
              }}
              onDragEnd={() => {
                setArrastando(null)
                setAlvo(null)
              }}
            >
              <div className="cms-item-head">
                <span className="cms-pegar" aria-hidden="true" title="Arraste para reordenar">
                  <GripVertical size={14} />
                </span>

                <button
                  type="button"
                  className="cms-item-abrir"
                  aria-expanded={estaAberto}
                  onClick={() => setAberto(estaAberto ? null : index)}
                >
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    style={{ transform: estaAberto ? 'rotate(90deg)' : 'none', transition: 'transform .16s ease' }}
                  />
                  <span className="cms-item-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="cms-item-nome">{nomeDe(item, index)}</span>
                </button>

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
              </div>

              {estaAberto && (
                <div className="cms-item-body">
                  {render(item, index, (next) => onChange(items.map((v, i) => (i === index ? next : v))))}
                </div>
              )}
            </article>
          )
        })}
      </div>

      <p className="cms-conta">
        {items.length} / {max} {items.length === 1 ? 'item' : 'itens'}
      </p>

      {apagando !== null && (
        <ConfirmDialog
          title={`Apagar este ${singular}?`}
          message={`"${nomeDe(items[apagando], apagando)}" sai do site junto com o texto escrito nele. A foto enviada continua guardada.`}
          confirmLabel="Apagar"
          danger
          onCancel={() => setApagando(null)}
          onConfirm={() => {
            onChange(items.filter((_, i) => i !== apagando))
            setAberto(null)
            setApagando(null)
          }}
        />
      )}
    </section>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "retrato (4:5)" diz mais que "1080×1350" para quem vai procurar a foto. */
function formatoDe(w: number, h: number) {
  const d = (a: number, b: number): number => (b ? d(b, a % b) : a)
  const g = d(w, h)
  const razao = `${w / g}:${h / g}`
  if (w === h) return `quadrada (${razao})`
  return w > h ? `deitada (${razao})` : `em pé (${razao})`
}

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

  /* A proporção diz mais que os pixels: quem vai escolher a foto no celular
     precisa saber se procura uma retrato ou uma deitada. */
  const proporcao = formatoDe(target.width, target.height)

  return (
    <div className="cms-foto">
      <p className="cms-medidas">
        <Info size={13} aria-hidden="true" />
        <span>
          <strong>
            {target.width}×{target.height} pixels
          </strong>{' · '}
          {proporcao} — a foto é recortada nesta medida na hora do envio.
        </span>
      </p>

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
            <ImageIcon size={22} aria-hidden="true" />
            <span>sem foto — clique para enviar</span>
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
        <div className="cms-foto-acoes">
          <button type="button" className="cms-btn primary" onClick={() => setCropping(true)}>
            <Upload size={13} aria-hidden="true" />
            {current ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {current && (
            <button type="button" className="cms-btn cms-btn-danger" onClick={() => setRemoving(true)}>
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
