import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { api, errorMessage, Field, Modal, SubmitButton } from '../../lib/ui'
import {
  COLUMN_COLORS,
  COLUMN_ICONS,
  iconOf,
  type LeadColumn,
} from './board'

/**
 * Edição das colunas do quadro.
 *
 * Não há "criar coluna": cada coluna é um status do banco, e inventar status
 * novo exigiria migração e quebraria os relatórios que agrupam por ele. O que
 * se edita é como cada um aparece — nome, cor, ícone, ordem — e quais ficam
 * fora do quadro.
 */
export function BoardSettings({
  columns,
  onClose,
  onSaved,
}: {
  columns: LeadColumn[]
  onClose: () => void
  onSaved: () => void
}) {
  const [lista, setLista] = React.useState<LeadColumn[]>(columns)

  const set = (status: string, patch: Partial<LeadColumn>) =>
    setLista((prev) => prev.map((c) => (c.status === status ? { ...c, ...patch } : c)))

  const mover = (status: string, delta: number) =>
    setLista((prev) => {
      const i = prev.findIndex((c) => c.status === status)
      const j = i + delta
      if (i === -1 || j < 0 || j >= prev.length) return prev
      const copia = [...prev]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  const save = useMutation({
    mutationFn: () => api.put('/admin/lead-board', { columns: lista }),
    onSuccess: onSaved,
  })

  const visiveis = lista.filter((c) => !c.hidden).length

  return (
    <Modal
      title="Colunas do quadro"
      subtitle="Nome, cor e ícone de cada etapa do funil"
      onClose={onClose}
      wide
      footer={
        <>
          {visiveis === 0 && <span className="footer-hint">Deixe ao menos uma coluna visível.</span>}
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={visiveis === 0} onClick={() => save.mutate()}>
            Salvar colunas
          </SubmitButton>
        </>
      }
    >
      <p className="hint" style={{ marginBottom: 12 }}>
        Cada coluna é uma etapa do funil já reconhecida pelo sistema. Uma coluna escondida
        continua guardando os leads que estão nela — eles voltam a aparecer se você mostrá-la
        de novo.
      </p>

      <ul className="column-list">
        {lista.map((c, i) => {
          const Icone = iconOf(c)
          return (
            <li key={c.status} className={c.hidden ? 'is-hidden' : undefined}>
              <div className="column-row">
                <span className="column-badge" style={{ background: c.color ?? '#8c7a68' }}>
                  <Icone size={14} aria-hidden="true" />
                </span>

                <Field label="Nome da coluna">
                  <input value={c.label} onChange={(e) => set(c.status, { label: e.target.value })} />
                </Field>

                <div className="column-actions">
                  <button
                    type="button"
                    onClick={() => set(c.status, { hidden: !c.hidden })}
                    title={c.hidden ? 'Mostrar no quadro' : 'Esconder do quadro'}
                    aria-label={c.hidden ? 'Mostrar no quadro' : 'Esconder do quadro'}
                  >
                    {c.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(c.status, -1)}
                    disabled={i === 0}
                    title="Mover para a esquerda"
                    aria-label="Mover para a esquerda"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(c.status, 1)}
                    disabled={i === lista.length - 1}
                    title="Mover para a direita"
                    aria-label="Mover para a direita"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="column-picks">
                <div>
                  <span className="field-label">Cor</span>
                  <div className="pick-row">
                    {COLUMN_COLORS.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        className={c.color === cor ? 'is-active' : undefined}
                        style={{ background: cor }}
                        onClick={() => set(c.status, { color: cor })}
                        title={cor}
                        aria-label={`Cor ${cor}`}
                        aria-pressed={c.color === cor}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="field-label">Ícone</span>
                  <div className="pick-row">
                    {Object.entries(COLUMN_ICONS).map(([nome, Ico]) => (
                      <button
                        key={nome}
                        type="button"
                        className={`pick-icon ${c.icon === nome ? 'is-active' : ''}`}
                        onClick={() => set(c.status, { icon: nome })}
                        title={nome}
                        aria-label={`Ícone ${nome}`}
                        aria-pressed={c.icon === nome}
                      >
                        <Ico size={14} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {save.isError && <p className="error">{errorMessage(save.error)}</p>}
    </Modal>
  )
}
