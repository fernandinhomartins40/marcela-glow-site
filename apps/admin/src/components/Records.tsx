import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSignature, HeartPulse, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import {
  api,
  ConfirmDialog,
  EmptyState,
  errorMessage,
  Field,
  formatDateBR,
  formatMoney,
  FormRow,
  Modal,
  parseMoney,
  SubmitButton,
  tenantSlug,
  Toolbar,
} from '../lib/ui'
import type { Patient } from './Patients'

type Section = 'prescriptions' | 'sessions'

interface Prescription {
  id: string
  title: string
  instructions: string
  status: string
  createdAt: string
  signedAt: string | null
  patient: { id: string; name: string }
}

interface Session {
  id: string
  performedAt: string
  notes: string | null
  priceCents: number | null
  procedure: { id: string; title: string } | null
  patient: { id: string; name: string }
}

const PRESCRIPTION_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  SENT: { label: 'Enviada', tone: 'info' },
  SIGNED: { label: 'Assinada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
}

export function Records() {
  const [section, setSection] = React.useState<Section>('prescriptions')

  return (
    <>
      <Toolbar>
        <div className="segmented" role="tablist">
          <button
            role="tab"
            aria-selected={section === 'prescriptions'}
            className={section === 'prescriptions' ? 'active' : ''}
            onClick={() => setSection('prescriptions')}
          >
            Prescrições
          </button>
          <button
            role="tab"
            aria-selected={section === 'sessions'}
            className={section === 'sessions' ? 'active' : ''}
            onClick={() => setSection('sessions')}
          >
            Procedimentos realizados
          </button>
        </div>
      </Toolbar>

      {section === 'prescriptions' ? <Prescriptions /> : <Sessions />}
    </>
  )
}

function Prescriptions() {
  const client = useQueryClient()
  const [editing, setEditing] = React.useState<Prescription | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<Prescription | null>(null)

  const query = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => (await api.get('/admin/prescriptions')).data as Prescription[],
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['prescriptions'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const sign = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/prescriptions/${id}/sign`),
    onSuccess: refresh,
  })
  const send = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/prescriptions/${id}/send`),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/prescriptions/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const items = query.data ?? []

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">{items.length} prescrições</span>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Nova prescrição
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !items.length ? (
        <EmptyState
          title="Nenhuma prescrição"
          description="Crie a primeira prescrição para uma paciente."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Nova prescrição
            </button>
          }
        />
      ) : (
        <div className="data-list">
          {items.map((item) => {
            const meta = PRESCRIPTION_STATUS[item.status] ?? { label: item.status, tone: 'neutral' }
            const locked = !!item.signedAt
            return (
              <article key={item.id} className="data-row">
                <div className="data-main static">
                  <span className="data-text">
                    <strong>
                      {item.title}
                      <span className={`chip ${meta.tone}`}>{meta.label}</span>
                    </strong>
                    <span className="data-meta">
                      <span>{item.patient.name}</span>
                      <span>{formatDateBR(item.createdAt)}</span>
                    </span>
                  </span>
                </div>
                <span className="data-actions">
                  {!locked && (
                    <button onClick={() => setEditing(item)} title="Editar" aria-label="Editar prescrição">
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => sign.mutate(item.id)}
                    disabled={locked || sign.isPending}
                    title={locked ? 'Já assinada' : 'Assinar'}
                    aria-label="Assinar prescrição"
                  >
                    <FileSignature size={14} />
                  </button>
                  <button
                    onClick={() => send.mutate(item.id)}
                    disabled={send.isPending}
                    title="Enviar à paciente"
                    aria-label="Enviar prescrição"
                  >
                    <Send size={14} />
                  </button>
                  {!locked && (
                    <button onClick={() => setRemoving(item)} title="Excluir" aria-label="Excluir prescrição">
                      <Trash2 size={14} />
                    </button>
                  )}
                </span>
              </article>
            )
          })}
        </div>
      )}

      {(sign.isError || send.isError) && <p className="error">{errorMessage(sign.error ?? send.error)}</p>}

      {editing && (
        <PrescriptionForm
          prescription={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir prescrição?"
          message={`"${removing.title}" de ${removing.patient.name} será removida permanentemente.`}
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

function PrescriptionForm({
  prescription,
  onClose,
  onSaved,
}: {
  prescription: Prescription | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    patientId: prescription?.patient.id ?? '',
    title: prescription?.title ?? '',
    instructions: prescription?.instructions ?? '',
  })

  const patients = useQuery({
    queryKey: ['patients', '', false],
    queryFn: async () => (await api.get('/admin/patients')).data as Patient[],
  })

  const save = useMutation({
    mutationFn: async () => {
      if (prescription) {
        await api.put(`/admin/prescriptions/${prescription.id}`, {
          title: form.title,
          instructions: form.instructions,
        })
      } else {
        await api.post('/admin/prescriptions', form)
      }
    },
    onSuccess: onSaved,
  })

  const valid = (prescription || form.patientId) && form.title.trim().length >= 2 && form.instructions.trim().length >= 2

  return (
    <Modal
      title={prescription ? 'Editar prescrição' : 'Nova prescrição'}
      subtitle={prescription ? prescription.patient.name : 'A paciente vê no portal depois de enviada.'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {prescription ? 'Salvar' : 'Criar prescrição'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {!prescription && (
          <Field label="Paciente" required>
            <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Selecione…</option>
              {patients.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Título" required hint="Ex.: Protocolo domiciliar pós-procedimento">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </Field>

        <Field label="Orientações" required hint="Uma instrução por linha">
          <textarea
            rows={8}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder={'Aplicar o hidratante pela manhã e à noite.\nProtetor solar FPS 50 a cada 3 horas.'}
          />
        </Field>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

function Sessions() {
  const client = useQueryClient()
  const [editing, setEditing] = React.useState<Session | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<Session | null>(null)

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/admin/sessions')).data as Session[],
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['sessions'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sessions/${id}`),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  const items = query.data ?? []
  const total = items.reduce((sum, s) => sum + (s.priceCents ?? 0), 0)

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">
          {items.length} procedimentos · {formatMoney(total)}
        </span>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Registrar procedimento
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !items.length ? (
        <EmptyState
          title="Nenhum procedimento registrado"
          description="Registre os atendimentos realizados para compor o histórico e o faturamento."
          action={
            <button className="primary" onClick={() => setEditing('new')}>
              <Plus size={15} />
              Registrar procedimento
            </button>
          }
        />
      ) : (
        <div className="data-list">
          {items.map((item) => (
            <article key={item.id} className="data-row">
              <div className="data-main static">
                <span className="data-avatar">
                  <HeartPulse size={16} />
                </span>
                <span className="data-text">
                  <strong>{item.procedure?.title ?? 'Procedimento'}</strong>
                  <span className="data-meta">
                    <span>{item.patient.name}</span>
                    <span>{formatDateBR(item.performedAt)}</span>
                    <span>{formatMoney(item.priceCents)}</span>
                  </span>
                </span>
              </div>
              <span className="data-actions">
                <button onClick={() => setEditing(item)} title="Editar" aria-label="Editar procedimento">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setRemoving(item)} title="Excluir" aria-label="Excluir procedimento">
                  <Trash2 size={14} />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <SessionForm
          session={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir registro?"
          message={`O procedimento de ${removing.patient.name} sai do histórico e do faturamento.`}
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

function SessionForm({
  session,
  onClose,
  onSaved,
}: {
  session: Session | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    patientId: session?.patient.id ?? '',
    procedureId: session?.procedure?.id ?? '',
    performedAt: session ? new Date(session.performedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: session?.notes ?? '',
    price: session?.priceCents != null ? (session.priceCents / 100).toFixed(2).replace('.', ',') : '',
  })

  const patients = useQuery({
    queryKey: ['patients', '', false],
    queryFn: async () => (await api.get('/admin/patients')).data as Patient[],
  })
  const procedures = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () => (await api.get('/procedures', { params: { tenantSlug } })).data as { id: string; title: string }[],
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...(session ? {} : { patientId: form.patientId }),
        procedureId: form.procedureId || undefined,
        performedAt: new Date(`${form.performedAt}T12:00:00`).toISOString(),
        notes: form.notes || undefined,
        priceCents: parseMoney(form.price),
      }
      if (session) await api.put(`/admin/sessions/${session.id}`, payload)
      else await api.post('/admin/sessions', payload)
    },
    onSuccess: onSaved,
  })

  const valid = (session || form.patientId) && form.performedAt

  return (
    <Modal
      title={session ? 'Editar procedimento' : 'Registrar procedimento'}
      subtitle={session ? session.patient.name : 'Compõe o histórico da paciente e o faturamento.'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {session ? 'Salvar' : 'Registrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {!session && (
          <Field label="Paciente" required>
            <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Selecione…</option>
              {patients.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <FormRow>
          <Field label="Procedimento">
            <select value={form.procedureId} onChange={(e) => setForm({ ...form, procedureId: e.target.value })}>
              <option value="">Não especificado</option>
              {procedures.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data" required>
            <input type="date" value={form.performedAt} onChange={(e) => setForm({ ...form, performedAt: e.target.value })} />
          </Field>
        </FormRow>

        <Field label="Valor" hint="Deixe em branco se não for cobrar">
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" inputMode="decimal" />
        </Field>

        <Field label="Observações clínicas">
          <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}
