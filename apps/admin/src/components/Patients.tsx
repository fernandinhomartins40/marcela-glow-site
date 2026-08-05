import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Download,
  FileText,
  HeartPulse,
  Mail,
  Paperclip,
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
  FileUploadButton,
  formatDateBR,
  formatMoney,
  FormRow,
  Modal,
  SubmitButton,
  toDateInput,
  Toolbar,
} from '../lib/ui'

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
                <span title="Documentos emitidos"><FileText size={13} /> {patient._count?.prescriptions ?? 0}</span>
              </span>

              <span className="data-actions">
                <button
                  className="primary"
                  onClick={() => setDetailId(patient.id)}
                  aria-label={`Abrir prontuário de ${patient.name}`}
                  title="Abrir prontuário"
                >
                  <HeartPulse size={14} />
                  Prontuário
                </button>
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

const DOC_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  SENT: { label: 'Enviado', tone: 'info' },
  SIGNED: { label: 'Assinado', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
}

const DOC_KIND: Record<string, string> = {
  PRESCRIPTION: 'Receita',
  EXAM_REQUEST: 'Pedido de exame',
  GUIDANCE: 'Orientações',
  CERTIFICATE: 'Atestado',
}

const RECORD_TYPE: Record<string, string> = {
  ANAMNESIS: 'Anamnese',
  EVOLUTION: 'Evolução',
  ASSESSMENT: 'Avaliação',
  PROCEDURE: 'Procedimento',
  NOTE: 'Observação',
}

/**
 * Prontuário da paciente: tudo que a clínica registrou, em ordem.
 * Só leitura — registro novo nasce em Atendimento, sempre vinculado à consulta.
 */
export function PatientDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const client = useQueryClient()
  const [tab, setTab] = React.useState<'timeline' | 'documents' | 'procedures' | 'files'>('timeline')

  const query = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await api.get(`/admin/patients/${id}`)).data,
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['patient', id] })

  const p = query.data

  if (query.isLoading) {
    return (
      <Modal title="Prontuário" onClose={onClose} wide>
        <p className="hint">Carregando prontuário...</p>
      </Modal>
    )
  }
  if (!p) {
    return (
      <Modal title="Prontuário" onClose={onClose} wide>
        <p className="error">Não foi possível carregar o prontuário.</p>
      </Modal>
    )
  }

  const age = p.birthDate
    ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 86400000))
    : null

  const tabs = [
    ['timeline', `Evoluções (${p.records?.length ?? 0})`],
    ['documents', `Documentos (${p.prescriptions?.length ?? 0})`],
    ['procedures', `Procedimentos (${p.sessions?.length ?? 0})`],
    ['files', `Arquivos (${p.attachments?.length ?? 0})`],
  ] as const

  return (
    <Modal
      title={p.name}
      subtitle={[age != null ? `${age} anos` : null, p.phone || p.email].filter(Boolean).join(' · ')}
      onClose={onClose}
      wide
    >
      <div className="form-grid">
        {p.notes && (
          <div className="patient-alert">
            <strong>Observações:</strong> {p.notes}
          </div>
        )}

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
            <dt>Paciente desde</dt>
            <dd>{formatDateBR(p.createdAt)}</dd>
          </div>
          <div>
            <dt>Consultas</dt>
            <dd>{p.appointments?.length ?? 0}</dd>
          </div>
        </dl>

        <div className="area-tabs" role="tablist">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'timeline' &&
          (!p.records?.length ? (
            <p className="hint">Nenhuma evolução registrada. Os registros nascem no Atendimento.</p>
          ) : (
            <div className="timeline">
              {p.records.map((r: any) => (
                <article key={r.id} className="timeline-item">
                  <div className="timeline-head">
                    <div>
                      <strong>{r.title}</strong>
                      <span className="chip neutral">{RECORD_TYPE[r.type] ?? r.type}</span>
                      {r.lockedAt && <span className="chip success">Fechado</span>}
                    </div>
                    <span className="timeline-date">{formatDateBR(r.occurredAt ?? r.createdAt)}</span>
                  </div>
                  {r.complaint && (
                    <p className="timeline-field">
                      <span>Queixa</span>
                      {r.complaint}
                    </p>
                  )}
                  <p className="timeline-body">{r.body}</p>
                  {r.plan && (
                    <p className="timeline-field">
                      <span>Conduta</span>
                      {r.plan}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ))}

        {tab === 'documents' &&
          (!p.prescriptions?.length ? (
            <p className="hint">Nenhum documento emitido. Receitas e exames são emitidos no Atendimento.</p>
          ) : (
            <div className="data-list">
              {p.prescriptions.map((doc: any) => {
                const meta = DOC_STATUS[doc.status] ?? { label: doc.status, tone: 'neutral' }
                return (
                  <article key={doc.id} className="data-row">
                    <div className="data-main static">
                      <span className="data-avatar">
                        <FileText size={16} />
                      </span>
                      <span className="data-text">
                        <strong>
                          {doc.title}
                          <span className={`chip ${meta.tone}`}>{meta.label}</span>
                        </strong>
                        <span className="data-meta">
                          <span>{DOC_KIND[doc.kind] ?? doc.kind}</span>
                          <span>{formatDateBR(doc.createdAt)}</span>
                          {doc.items?.length > 0 && <span>{doc.items.length} item(ns)</span>}
                        </span>
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          ))}

        {tab === 'procedures' &&
          (!p.sessions?.length ? (
            <p className="hint">Nenhum procedimento registrado.</p>
          ) : (
            <div className="data-list">
              {p.sessions.map((s: any) => (
                <article key={s.id} className="data-row">
                  <div className="data-main static">
                    <span className="data-avatar">
                      <HeartPulse size={16} />
                    </span>
                    <span className="data-text">
                      <strong>{s.procedure?.title ?? 'Procedimento'}</strong>
                      <span className="data-meta">
                        <span>{formatDateBR(s.performedAt)}</span>
                        <span>{formatMoney(s.priceCents)}</span>
                      </span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ))}

        {tab === 'files' && <PatientFiles patientId={id} attachments={p.attachments ?? []} onChanged={refresh} />}
      </div>
    </Modal>
  )
}

function PatientFiles({
  patientId,
  attachments,
  onChanged,
}: {
  patientId: string
  attachments: any[]
  onChanged: () => void
}) {
  async function open(fileId: string) {
    const { data } = await api.get(`/admin/files/${fileId}/download`)
    window.open(data.downloadUrl, '_blank', 'noopener')
  }

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">Exames, fotos e laudos</span>
        <FileUploadButton patientId={patientId} onUploaded={onChanged} />
      </Toolbar>

      {!attachments.length ? (
        <p className="hint">Nenhum arquivo anexado.</p>
      ) : (
        <div className="data-list">
          {attachments.map((file) => (
            <article key={file.id} className="data-row">
              <div className="data-main static">
                <span className="data-avatar">
                  <Paperclip size={16} />
                </span>
                <span className="data-text">
                  <strong>{file.fileName}</strong>
                  <span className="data-meta">
                    <span>{formatDateBR(file.createdAt)}</span>
                    {file.sizeBytes != null && <span>{Math.max(1, Math.round(file.sizeBytes / 1024))} KB</span>}
                  </span>
                </span>
              </div>
              <span className="data-actions">
                <button onClick={() => open(file.id)} title="Abrir" aria-label="Abrir arquivo">
                  <Download size={14} />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
