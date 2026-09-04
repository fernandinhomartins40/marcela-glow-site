import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileSignature, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  FormRow,
  Modal,
  RowAction,
  SubmitButton,
  Toolbar,
} from '../lib/ui'
import { TemplateForm } from './templates/TemplateForm'
import type { TemplateLayout } from './templates/blocks'

/**
 * Biblioteca de modelos de documento.
 *
 * Guarda o que se repete: o conteúdo que já vem preenchido e o layout de
 * impressão. Emitir a partir de um modelo copia esses valores — o documento
 * segue independente, então ajustar o modelo depois não altera o que já foi
 * assinado.
 */

export type DocumentKind = 'PRESCRIPTION' | 'EXAM_REQUEST' | 'GUIDANCE' | 'CERTIFICATE'

// TemplateLayout mora em ./templates/blocks, junto dos blocos que ele descreve.
export type { TemplateLayout }

export interface DocumentTemplate {
  id: string
  name: string
  kind: DocumentKind
  title: string | null
  instructions: string | null
  items: { name: string; strength?: string | null; dose?: string | null; quantity?: string | null }[] | null
  layout: TemplateLayout | null
  isDefault: boolean
  isActive: boolean
  usageCount: number
}

const KIND_LABEL: Record<DocumentKind, string> = {
  PRESCRIPTION: 'Receita',
  EXAM_REQUEST: 'Pedido de exame',
  GUIDANCE: 'Orientação',
  CERTIFICATE: 'Atestado',
}


export function DocumentTemplates() {
  const client = useQueryClient()
  const [kind, setKind] = React.useState<DocumentKind>('PRESCRIPTION')
  const [editing, setEditing] = React.useState<DocumentTemplate | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<DocumentTemplate | null>(null)

  const query = useQuery({
    queryKey: ['templates', kind],
    queryFn: async () =>
      (await api.get('/clinical/templates', { params: { kind } })).data as DocumentTemplate[],
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['templates'] })

  const duplicate = useMutation({
    mutationFn: (id: string) => api.post(`/clinical/templates/${id}/duplicate`),
    onSuccess: refresh,
  })
  const setDefault = useMutation({
    mutationFn: (id: string) => api.put(`/clinical/templates/${id}`, { isDefault: true }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/clinical/templates/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const templates = query.data ?? []

  return (
    <>
      <Toolbar>
        <div className="segmented" role="tablist">
          {(Object.keys(KIND_LABEL) as DocumentKind[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              className={kind === k ? 'active' : ''}
              onClick={() => setKind(k)}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Novo modelo
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !templates.length ? (
        <EmptyState
          icon={FileSignature}
          title={`Nenhum modelo de ${KIND_LABEL[kind].toLowerCase()}`}
          description="Um modelo guarda o texto e os itens que se repetem, e o layout com que o documento é impresso. Ao emitir no atendimento, é só escolher."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Novo modelo
            </button>
          }
        />
      ) : (
        <DataList>
          {templates.map((t) => (
            <DataRow
              key={t.id}
              icon={FileSignature}
              title={t.name}
              chips={
                <>
                  {t.isDefault && <Chip tone="success">Padrão</Chip>}
                  {t.usageCount > 0 && <Chip tone="info">{t.usageCount}x usado</Chip>}
                </>
              }
              meta={
                <>
                  {t.items?.length ? <span>{t.items.length} item(ns)</span> : null}
                  {t.layout ? <span>Layout próprio</span> : <span>Layout padrão</span>}
                </>
              }
              actions={
                <>
                  {!t.isDefault && (
                    <RowAction
                      icon={Star}
                      title="Tornar padrão deste tipo"
                      onClick={() => setDefault.mutate(t.id)}
                      disabled={setDefault.isPending}
                    />
                  )}
                  <RowAction
                    icon={Copy}
                    title="Duplicar modelo"
                    onClick={() => duplicate.mutate(t.id)}
                    disabled={duplicate.isPending}
                  />
                  <RowAction icon={Pencil} title="Editar modelo" onClick={() => setEditing(t)} />
                  <RowAction icon={Trash2} title="Excluir modelo" onClick={() => setRemoving(t)} />
                </>
              }
            />
          ))}
        </DataList>
      )}

      {(duplicate.isError || setDefault.isError || remove.isError) && (
        <p className="error">{errorMessage(duplicate.error ?? setDefault.error ?? remove.error)}</p>
      )}

      {editing && (
        <TemplateForm
          kind={kind}
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir modelo?"
          message={`"${removing.name}" deixa de aparecer ao emitir. Documentos já criados a partir dele não mudam.`}
          confirmLabel="Excluir"
          danger
          pending={remove.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id)}
        />
      )}
    </>
  )
}
