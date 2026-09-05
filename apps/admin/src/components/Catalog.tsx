import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Globe, Pencil, Plus, Sparkles, Trash2, UserPlus, UserRound, SlidersHorizontal, Eye, EyeOff } from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  formatDateBR,
  FormRow,
  Modal,
  RowAction,
  SubmitButton,
  tenantSlug,
  Toolbar,
} from '../lib/ui'
import { BoardSettings } from './leads/BoardSettings'
import { COLUNAS_PADRAO, iconOf, normalizeColumns, type LeadColumn } from './leads/board'

// ─────────────────────────────────────────────────────────────────────────────
// Procedimentos oferecidos pela clínica
// ─────────────────────────────────────────────────────────────────────────────

export interface Procedure {
  id: string
  number: string
  title: string
  subtitle: string
  description: string
  durationMin: number
  bufferMin: number
  isBookable: boolean
  displayOrder: number
}

export function Procedures() {
  const client = useQueryClient()
  const [editing, setEditing] = React.useState<Procedure | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<Procedure | null>(null)

  const query = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () => (await api.get('/procedures', { params: { tenantSlug } })).data as Procedure[],
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['procedures-admin'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/procedures/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const items = query.data ?? []

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">{items.length} procedimentos</span>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Novo procedimento
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !items.length ? (
        <EmptyState
          title="Nenhum procedimento cadastrado"
          description="Os procedimentos aparecem no site e são a base do cálculo de horários."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Novo procedimento
            </button>
          }
        />
      ) : (
        <DataList>
          {items.map((item) => (
            <DataRow
              key={item.id}
              icon={Sparkles}
              title={item.title}
              chips={!item.isBookable && <Chip>Fora do agendamento</Chip>}
              meta={
                <>
                  <span>{item.subtitle}</span>
                  <span>{item.durationMin + item.bufferMin} min</span>
                </>
              }
              actions={
                <>
                  <RowAction icon={Pencil} title="Editar procedimento" onClick={() => setEditing(item)} />
                  <RowAction icon={Trash2} title="Excluir procedimento" onClick={() => setRemoving(item)} />
                </>
              }
            />
          ))}
        </DataList>
      )}

      {editing && (
        <ProcedureForm
          procedure={editing === 'new' ? null : editing}
          nextNumber={String(items.length + 1).padStart(2, '0')}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir procedimento?"
          message={`"${removing.title}" sai do site. Agendamentos e histórico que o referenciam continuam existindo, sem o vínculo.`}
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

function ProcedureForm({
  procedure,
  nextNumber,
  onClose,
  onSaved,
}: {
  procedure: Procedure | null
  nextNumber: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    number: procedure?.number ?? nextNumber,
    title: procedure?.title ?? '',
    subtitle: procedure?.subtitle ?? '',
    description: procedure?.description ?? '',
    durationMin: procedure?.durationMin ?? 60,
    bufferMin: procedure?.bufferMin ?? 0,
    isBookable: procedure?.isBookable ?? true,
    displayOrder: procedure?.displayOrder ?? 0,
  })

  const save = useMutation({
    mutationFn: async () => {
      if (procedure) await api.put(`/procedures/${procedure.id}`, form)
      else await api.post('/procedures', form)
    },
    onSuccess: onSaved,
  })

  const valid =
    form.number.trim() && form.title.trim().length >= 2 && form.subtitle.trim() && form.description.trim()

  return (
    <Modal
      title={procedure ? 'Editar procedimento' : 'Novo procedimento'}
      subtitle="Aparece no site e define a duração na agenda"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {procedure ? 'Salvar' : 'Cadastrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <FormRow cols={3}>
          <Field label="Número" required hint="Ordem no site">
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </Field>
          <Field label="Duração" required>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            />
          </Field>
          <Field label="Intervalo" hint="Preparo/limpeza">
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={form.bufferMin}
              onChange={(e) => setForm({ ...form, bufferMin: Number(e.target.value) })}
            />
          </Field>
        </FormRow>

        <Field label="Título" required>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </Field>

        <Field label="Subtítulo" required hint="Ex.: Toxina botulínica">
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </Field>

        <Field label="Descrição" required hint="Texto exibido no site">
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <label className="check-row">
          <input
            type="checkbox"
            checked={form.isBookable}
            onChange={(e) => setForm({ ...form, isBookable: e.target.checked })}
          />
          Disponível para agendamento online
        </label>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Leads
// ─────────────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  origin: string | null
  status: string
  notes: string | null
  nextFollowUp: string | null
  /** Preenchidos quando o contato já virou ficha — a origem fica preservada. */
  patientId: string | null
  convertedAt: string | null
  patient: { id: string; name: string } | null
}


export function Leads() {
  const client = useQueryClient()
  const [editing, setEditing] = React.useState<Lead | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<Lead | null>(null)
  const [converting, setConverting] = React.useState<Lead | null>(null)
  const [editandoColunas, setEditandoColunas] = React.useState(false)
  /* Coluna sob o cursor durante o arraste: sem isso não há como mostrar onde
     o card vai cair, e soltar vira aposta. */
  const [alvo, setAlvo] = React.useState<string | null>(null)

  const board = useQuery({
    queryKey: ['lead-board'],
    queryFn: async () =>
      (await api.get('/admin/lead-board')).data as { columns: LeadColumn[] | null },
  })

  /* Convertidos saem do quadro por padrão. Ainda dá para revê-los: a origem e
     a data da conversão continuam no registro e servem de histórico. */
  const [verConvertidos, setVerConvertidos] = React.useState(false)

  const query = useQuery({
    queryKey: ['leads', verConvertidos],
    queryFn: async () =>
      (
        await api.get('/admin/leads', {
          params: verConvertidos ? { includeConverted: true } : {},
        })
      ).data as { leads: Lead[]; converted: number },
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['leads'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const colunas = normalizeColumns(board.data?.columns)
  const visiveis = colunas.filter((c) => !c.hidden)

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/leads/${id}`, { status }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/leads/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })
  const convert = useMutation({
    mutationFn: (id: string) => api.post(`/admin/leads/${id}/convert`),
    onSuccess: () => {
      setConverting(null)
      // A ficha nova precisa aparecer na aba Pacientes sem exigir recarga
      client.invalidateQueries({ queryKey: ['patients'] })
      refresh()
    },
  })

  const leads = query.data?.leads ?? []
  const convertidos = query.data?.converted ?? 0

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">
          {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
          {verConvertidos ? ' (com convertidos)' : ''}
        </span>
        {convertidos > 0 && (
          <button
            onClick={() => setVerConvertidos((v) => !v)}
            title={
              verConvertidos
                ? 'Voltar a mostrar só quem ainda está no funil'
                : 'Incluir os contatos que já viraram paciente'
            }
          >
            {verConvertidos ? <EyeOff size={14} /> : <Eye size={14} />}
            {verConvertidos ? 'Ocultar convertidos' : `Ver convertidos (${convertidos})`}
          </button>
        )}
        <button onClick={() => setEditandoColunas(true)}>
          <SlidersHorizontal size={14} />
          Colunas
        </button>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Novo lead
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : (
        <div className="kanban">
          {visiveis.map((column) => {
            const items = leads.filter((l) => l.status === column.status)
            const Icone = iconOf(column)
            const cor = column.color ?? '#8c7a68'
            return (
              <div
                key={column.status}
                className={alvo === column.status ? 'is-drop-target' : undefined}
                style={{ borderTopColor: cor }}
                /* Sem preventDefault no dragOver o navegador recusa o drop. */
                onDragOver={(e) => {
                  e.preventDefault()
                  if (alvo !== column.status) setAlvo(column.status)
                }}
                onDragLeave={(e) => {
                  // Só limpa ao sair da coluna inteira, não ao passar por um card.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setAlvo(null)
                  const id = e.dataTransfer.getData('text/plain')
                  const lead = leads.find((l) => l.id === id)
                  // Soltar na mesma coluna não é mudança: evita uma escrita à toa.
                  if (lead && lead.status !== column.status) {
                    move.mutate({ id, status: column.status })
                  }
                }}
              >
                <h3>
                  <span className="kanban-icon" style={{ background: cor }}>
                    <Icone size={12} aria-hidden="true" />
                  </span>
                  {column.label} <span className="kanban-count">{items.length}</span>
                </h3>
                {items.length === 0 && (
                  <p className="kanban-empty">{alvo === column.status ? 'Solte aqui' : '—'}</p>
                )}
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    className="lead-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', lead.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setAlvo(null)}
                  >
                    <strong>{lead.name}</strong>
                    <span>{lead.origin ?? 'origem direta'}</span>
                    {lead.phone && <span>{lead.phone}</span>}
                    {lead.patient && (
                      <Chip
                        tone="success"
                        icon={UserRound}
                        title={`Ficha de paciente: ${lead.patient.name}`}
                      >
                        {/* Repetir o nome que já está em negrito acima não diria
                            nada; só vale mostrar quando o vínculo caiu numa ficha
                            de nome diferente (mesmo e-mail, cadastro anterior). */}
                        {lead.patient.name === lead.name ? 'Já é paciente' : lead.patient.name}
                      </Chip>
                    )}
                    <div className="lead-actions">
                      {!lead.patient && (
                        <button
                          onClick={() => setConverting(lead)}
                          title={
                            lead.email
                              ? 'Converter em paciente'
                              : 'Precisa de e-mail para virar ficha'
                          }
                          aria-label={`Converter ${lead.name} em paciente`}
                          disabled={!lead.email}
                        >
                          <UserPlus size={13} />
                        </button>
                      )}
                      {/* O select fica: arrastar não funciona no teclado nem em
                          leitor de tela, e mover o lead não pode depender do mouse. */}
                      <select
                        value={lead.status}
                        onChange={(e) => move.mutate({ id: lead.id, status: e.target.value })}
                        aria-label={`Mover ${lead.name}`}
                      >
                        {colunas.map((c) => (
                          <option key={c.status} value={c.status}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => setEditing(lead)} title="Editar" aria-label="Editar lead">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setRemoving(lead)} title="Excluir" aria-label="Excluir lead">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {editandoColunas && (
        <BoardSettings
          columns={colunas}
          onClose={() => setEditandoColunas(false)}
          onSaved={() => {
            setEditandoColunas(false)
            client.invalidateQueries({ queryKey: ['lead-board'] })
          }}
        />
      )}

      {editing && (
        <LeadForm
          lead={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir lead?"
          message={`${removing.name} será removido permanentemente.`}
          confirmLabel="Excluir"
          danger
          pending={remove.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id)}
        />
      )}

      {converting && (
        <ConfirmDialog
          title="Converter em paciente?"
          message={
            `Cria a ficha de ${converting.name} com os dados do contato e marca o lead como ganho. ` +
            'Se já existir uma paciente com este e-mail, o contato é apenas vinculado a ela.' +
            (convert.isError ? ` — ${errorMessage(convert.error, 'Não foi possível converter.')}` : '')
          }
          confirmLabel="Converter"
          pending={convert.isPending}
          onCancel={() => setConverting(null)}
          onConfirm={() => convert.mutate(converting.id)}
        />
      )}
    </>
  )
}

function LeadForm({ lead, onClose, onSaved }: { lead: Lead | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState({
    name: lead?.name ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    origin: lead?.origin ?? '',
    status: lead?.status ?? 'NEW',
    notes: lead?.notes ?? '',
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        origin: form.origin || undefined,
        status: form.status,
        notes: form.notes || undefined,
      }
      if (lead) await api.patch(`/admin/leads/${lead.id}`, payload)
      else await api.post('/admin/leads', payload)
    },
    onSuccess: onSaved,
  })

  return (
    <Modal
      title={lead ? 'Editar lead' : 'Novo lead'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={form.name.trim().length < 2} onClick={() => save.mutate()}>
            {lead ? 'Salvar' : 'Cadastrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome" required>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <FormRow>
          <Field label="E-mail">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Origem" hint="Instagram, indicação…">
            <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
          </Field>
          <Field label="Situação">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {COLUNAS_PADRAO.map((c) => (
                <option key={c.status} value={c.status}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </FormRow>
        <Field label="Observações">
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS — páginas e posts
// ─────────────────────────────────────────────────────────────────────────────

interface Content {
  id: string
  slug: string
  title: string
  body: string
  status: string
  excerpt?: string | null
  createdAt: string
}

export function Cms({ cms }: { cms: { pages: Content[]; posts: Content[]; media: any[] } }) {
  const client = useQueryClient()
  const [kind, setKind] = React.useState<'pages' | 'posts'>('pages')
  const [editing, setEditing] = React.useState<Content | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<Content | null>(null)

  const refresh = () => client.invalidateQueries({ queryKey: ['admin'] })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cms/${kind}/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const items = kind === 'pages' ? cms.pages : cms.posts

  return (
    <>
      <Toolbar>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={kind === 'pages'} className={kind === 'pages' ? 'active' : ''} onClick={() => setKind('pages')}>
            Páginas
          </button>
          <button role="tab" aria-selected={kind === 'posts'} className={kind === 'posts' ? 'active' : ''} onClick={() => setKind('posts')}>
            Blog
          </button>
        </div>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          {kind === 'pages' ? 'Nova página' : 'Novo post'}
        </button>
      </Toolbar>

      {!items?.length ? (
        <EmptyState
          title={kind === 'pages' ? 'Nenhuma página' : 'Nenhum post'}
          description="O conteúdo publicado aparece no site."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Criar
            </button>
          }
        />
      ) : (
        <DataList>
          {items.map((item) => (
            <DataRow
              key={item.id}
              icon={kind === 'pages' ? Globe : FileText}
              title={item.title}
              chips={
                <Chip tone={item.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                  {item.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                </Chip>
              }
              meta={
                <>
                  <span>/{item.slug}</span>
                  <span>{formatDateBR(item.createdAt)}</span>
                </>
              }
              actions={
                <>
                  <RowAction icon={Pencil} title="Editar conteúdo" onClick={() => setEditing(item)} />
                  <RowAction icon={Trash2} title="Excluir conteúdo" onClick={() => setRemoving(item)} />
                </>
              }
            />
          ))}
        </DataList>
      )}

      {editing && (
        <ContentForm
          kind={kind}
          content={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir conteúdo?"
          message={`"${removing.title}" sai do site permanentemente.`}
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

function ContentForm({
  kind,
  content,
  onClose,
  onSaved,
}: {
  kind: 'pages' | 'posts'
  content: Content | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    slug: content?.slug ?? '',
    title: content?.title ?? '',
    body: content?.body ?? '',
    excerpt: content?.excerpt ?? '',
    status: content?.status ?? 'DRAFT',
  })

  const save = useMutation({
    // O backend faz upsert por slug, então criar e editar usam a mesma rota
    mutationFn: async () =>
      api.post(`/admin/cms/${kind}`, {
        slug: form.slug,
        title: form.title,
        body: form.body,
        status: form.status,
        ...(kind === 'posts' && form.excerpt ? { excerpt: form.excerpt } : {}),
      }),
    onSuccess: onSaved,
  })

  const valid = form.slug.trim().length >= 2 && form.title.trim().length >= 2 && form.body.trim().length >= 2

  return (
    <Modal
      title={content ? 'Editar' : kind === 'pages' ? 'Nova página' : 'Novo post'}
      subtitle={content ? `/${content.slug}` : undefined}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            Salvar
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <FormRow>
          <Field label="Título" required>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </Field>
          <Field label="Endereço (slug)" required hint="Sem espaços ou acentos">
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              disabled={!!content}
            />
          </Field>
        </FormRow>

        {kind === 'posts' && (
          <Field label="Resumo">
            <textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </Field>
        )}

        <Field label="Conteúdo" required>
          <textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>

        <Field label="Situação">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Rascunho — não aparece no site</option>
            <option value="PUBLISHED">Publicado</option>
          </select>
        </Field>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}
