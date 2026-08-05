import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  FileText,
  HeartPulse,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'
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
  SubmitButton,
  toDateInput,
  Toolbar,
} from '../lib/ui'
import { clinicDate, clinicTime, statusMeta } from '../lib/schedule'

export interface Patient {
  id: string
  name: string
  email: string
  phone: string | null
  birthDate: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  _count?: { appointments: number; records: number; sessions: number; prescriptions: number }
}

const EMPTY = { name: '', email: '', phone: '', birthDate: '', notes: '' }

export function Patients() {
  const client = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [showArchived, setShowArchived] = React.useState(false)
  const [editing, setEditing] = React.useState<Patient | 'new' | null>(null)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [archiving, setArchiving] = React.useState<Patient | null>(null)

  const query = useQuery({
    queryKey: ['patients', search, showArchived],
    queryFn: async () =>
      (
        await api.get('/admin/patients', {
          params: { ...(search ? { search } : {}), ...(showArchived ? { includeArchived: 'true' } : {}) },
        })
      ).data as Patient[],
  })

  const archive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/patients/${id}/archive`, { isActive }),
    onSuccess: () => {
      setArchiving(null)
      client.invalidateQueries({ queryKey: ['patients'] })
      client.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const patients = query.data ?? []

  return (
    <>
      <Toolbar>
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Buscar por nome, e-mail ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="toolbar-check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Mostrar arquivadas
        </label>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Nova paciente
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !patients.length ? (
        <EmptyState
          title={search ? 'Nenhuma paciente encontrada' : 'Nenhuma paciente cadastrada'}
          description={
            search
              ? 'Tente outro nome, e-mail ou telefone.'
              : 'Cadastre a primeira paciente para começar a registrar atendimentos.'
          }
          action={
            !search && (
              <button className="primary" onClick={() => setEditing('new')}>
                <Plus size={15} />
                Nova paciente
              </button>
            )
          }
        />
      ) : (
        <div className="data-list">
          {patients.map((patient) => (
            <article key={patient.id} className={`data-row ${patient.isActive ? '' : 'archived'}`}>
              <button className="data-main" onClick={() => setDetailId(patient.id)}>
                <span className="data-avatar">
                  <UserRound size={16} />
                </span>
                <span className="data-text">
                  <strong>
                    {patient.name}
                    {!patient.isActive && <span className="chip neutral">Arquivada</span>}
                  </strong>
                  <span className="data-meta">
                    <span><Mail size={12} /> {patient.email}</span>
                    {patient.phone && <span><Phone size={12} /> {patient.phone}</span>}
                  </span>
                </span>
              </button>

              <span className="data-counts">
                <span title="Consultas"><CalendarDays size={13} /> {patient._count?.appointments ?? 0}</span>
                <span title="Procedimentos"><HeartPulse size={13} /> {patient._count?.sessions ?? 0}</span>
                <span title="Prescrições"><FileText size={13} /> {patient._count?.prescriptions ?? 0}</span>
              </span>

              <span className="data-actions">
                <button onClick={() => setEditing(patient)} aria-label={`Editar ${patient.name}`} title="Editar">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setArchiving(patient)}
                  aria-label={patient.isActive ? `Arquivar ${patient.name}` : `Reativar ${patient.name}`}
                  title={patient.isActive ? 'Arquivar' : 'Reativar'}
                >
                  {patient.isActive ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                </button>
              </span>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <PatientForm
          patient={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            client.invalidateQueries({ queryKey: ['patients'] })
            client.invalidateQueries({ queryKey: ['admin'] })
          }}
        />
      )}

      {detailId && <PatientDetail id={detailId} onClose={() => setDetailId(null)} />}

      {archiving && (
        <ConfirmDialog
          title={archiving.isActive ? 'Arquivar paciente?' : 'Reativar paciente?'}
          message={
            archiving.isActive
              ? `${archiving.name} sai das listas, mas todo o histórico clínico é preservado. Você pode reativar depois.`
              : `${archiving.name} volta a aparecer nas listas e buscas.`
          }
          confirmLabel={archiving.isActive ? 'Arquivar' : 'Reativar'}
          danger={archiving.isActive}
          pending={archive.isPending}
          onCancel={() => setArchiving(null)}
          onConfirm={() => archive.mutate({ id: archiving.id, isActive: !archiving.isActive })}
        />
      )}
    </>
  )
}

function PatientForm({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState(
    patient
      ? {
          name: patient.name,
          email: patient.email,
          phone: patient.phone ?? '',
          birthDate: toDateInput(patient.birthDate),
          notes: patient.notes ?? '',
        }
      : EMPTY,
  )

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
        notes: form.notes || undefined,
      }
      if (patient) await api.put(`/admin/patients/${patient.id}`, payload)
      else await api.post('/admin/patients', payload)
    },
    onSuccess: onSaved,
  })

  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email)

  return (
    <Modal
      title={patient ? 'Editar paciente' : 'Nova paciente'}
      subtitle={patient ? patient.email : 'Os dados ficam disponíveis no portal da paciente.'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {patient ? 'Salvar alterações' : 'Cadastrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome completo" required>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>

        <FormRow>
          <Field label="E-mail" required hint="Usado para o acesso ao portal">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Telefone" hint="Com DDD, para o WhatsApp">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(67) 90000-0000" />
          </Field>
        </FormRow>

        <Field label="Data de nascimento">
          <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        </Field>

        <Field label="Observações" hint="Alergias, preferências, histórico relevante">
          <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

/** Ficha completa: tudo que a clínica registrou sobre a paciente. */
function PatientDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await api.get(`/admin/patients/${id}`)).data,
  })

  const p = query.data

  return (
    <Modal title={p?.name ?? 'Paciente'} subtitle={p?.email} onClose={onClose} wide>
      {query.isLoading ? (
        <p className="hint">Carregando ficha...</p>
      ) : !p ? (
        <p className="error">Não foi possível carregar a ficha.</p>
      ) : (
        <div className="form-grid">
          <dl className="drawer-facts">
            <div>
              <dt>Contato</dt>
              <dd>{p.phone || 'sem telefone'}</dd>
              <dd>{p.email}</dd>
            </div>
            <div>
              <dt>Nascimento</dt>
              <dd>{formatDateBR(p.birthDate)}</dd>
            </div>
            <div>
              <dt>Cadastro</dt>
              <dd>{formatDateBR(p.createdAt)}</dd>
            </div>
            {p.notes && (
              <div className="wide">
                <dt>Observações</dt>
                <dd>{p.notes}</dd>
              </div>
            )}
          </dl>

          <DetailBlock title="Consultas" count={p.appointments?.length}>
            {p.appointments?.length ? (
              p.appointments.slice(0, 8).map((a: any) => {
                const meta = statusMeta(a.status)
                return (
                  <div key={a.id} className="mini-row">
                    <span>{a.procedure?.title ?? 'Consulta de avaliação'}</span>
                    <span className="mini-meta">
                      {a.scheduledAt ? `${clinicDate(a.scheduledAt)} · ${clinicTime(a.scheduledAt)}` : 'sem data'}
                    </span>
                    <span className={`chip ${meta.tone}`}>{meta.label}</span>
                  </div>
                )
              })
            ) : (
              <p className="hint">Nenhuma consulta registrada.</p>
            )}
          </DetailBlock>

          <DetailBlock title="Procedimentos realizados" count={p.sessions?.length}>
            {p.sessions?.length ? (
              p.sessions.slice(0, 8).map((s: any) => (
                <div key={s.id} className="mini-row">
                  <span>{s.procedure?.title ?? 'Procedimento'}</span>
                  <span className="mini-meta">{formatDateBR(s.performedAt)}</span>
                  <span className="mini-meta">{formatMoney(s.priceCents)}</span>
                </div>
              ))
            ) : (
              <p className="hint">Nenhum procedimento registrado.</p>
            )}
          </DetailBlock>

          <DetailBlock title="Prescrições" count={p.prescriptions?.length}>
            {p.prescriptions?.length ? (
              p.prescriptions.slice(0, 8).map((pr: any) => (
                <div key={pr.id} className="mini-row">
                  <span>{pr.title}</span>
                  <span className="mini-meta">{formatDateBR(pr.createdAt)}</span>
                  <span className="chip neutral">{pr.status}</span>
                </div>
              ))
            ) : (
              <p className="hint">Nenhuma prescrição.</p>
            )}
          </DetailBlock>

          <DetailBlock title="Prontuário" count={p.records?.length}>
            {p.records?.length ? (
              p.records.slice(0, 8).map((r: any) => (
                <div key={r.id} className="mini-row">
                  <span>{r.title}</span>
                  <span className="mini-meta">{formatDateBR(r.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="hint">Nenhum registro clínico.</p>
            )}
          </DetailBlock>
        </div>
      )}
    </Modal>
  )
}

function DetailBlock({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="detail-block">
      <h3>
        {title}
        {count != null && <span className="detail-count">{count}</span>}
      </h3>
      <div className="detail-body">{children}</div>
    </section>
  )
}
