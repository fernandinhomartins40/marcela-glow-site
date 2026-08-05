import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  HeartPulse,
  Lock,
  Pencil,
  Plus,
  Search,
  Stethoscope,
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
  parseMoney,
  SubmitButton,
  tenantSlug,
  Toolbar,
} from '../lib/ui'
import {
  clinicDate,
  clinicDateKey,
  clinicTime,
  dateKey,
  fromDateTimeLocalValue,
  fullDayLabel,
  statusMeta,
} from '../lib/schedule'
import type { Patient } from './Patients'

interface AgendaEntry {
  id: string
  scheduledAt: string | null
  status: string
  name: string
  procedure: { id: string; title: string } | null
  patient: { id: string; name: string; email: string; phone: string | null; birthDate: string | null } | null
  _count: { records: number; prescriptions: number; sessions: number }
}

interface MedicalRecord {
  id: string
  title: string
  type: string
  body: string
  complaint: string | null
  plan: string | null
  history: string | null
  occurredAt: string | null
  lockedAt: string | null
  createdAt: string
  appointment?: { id: string; scheduledAt: string | null } | null
}

interface Encounter {
  appointment: {
    id: string
    scheduledAt: string | null
    status: string
    message: string | null
    procedure: { id: string; title: string } | null
  }
  patient: Patient & { birthDate: string | null; notes: string | null }
  currentRecords: MedicalRecord[]
  history: MedicalRecord[]
  documents: { id: string; kind: string; title: string; status: string; createdAt: string; items: any[] }[]
  sessions: { id: string; performedAt: string; priceCents: number | null; procedure: { title: string } | null }[]
}

const RECORD_TYPES = [
  { id: 'ANAMNESIS', label: 'Anamnese' },
  { id: 'EVOLUTION', label: 'Evolução' },
  { id: 'ASSESSMENT', label: 'Avaliação' },
  { id: 'PROCEDURE', label: 'Procedimento' },
  { id: 'NOTE', label: 'Observação' },
]

function recordTypeLabel(type: string) {
  return RECORD_TYPES.find((t) => t.id === type)?.label ?? type
}

/**
 * Painel de Atendimento: o fluxo do consultório.
 * Agenda do dia → paciente → prontuário daquele atendimento.
 */
export function Encounter() {
  const [openId, setOpenId] = React.useState<string | null>(null)

  if (openId) return <EncounterDetail appointmentId={openId} onBack={() => setOpenId(null)} />
  return <TodayAgenda onOpen={setOpenId} />
}

function TodayAgenda({ onOpen }: { onOpen: (id: string) => void }) {
  const [date, setDate] = React.useState(() => dateKey(new Date()))
  const [search, setSearch] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const agenda = useQuery({
    queryKey: ['encounter-agenda', date],
    queryFn: async () => (await api.get('/clinical/encounters/agenda', { params: { date } })).data as AgendaEntry[],
  })

  // Busca de paciente para quem chegou sem agendamento
  const patients = useQuery({
    queryKey: ['patients', search, false],
    queryFn: async () => (await api.get('/admin/patients', { params: { search } })).data as Patient[],
    enabled: search.trim().length >= 2,
  })

  // A API devolve janela ampla em UTC; recorta o dia local aqui
  const entries = (agenda.data ?? []).filter(
    (entry) => entry.scheduledAt && clinicDateKey(entry.scheduledAt) === date,
  )

  const selected = new Date(`${date}T12:00:00`)

  return (
    <>
      <Toolbar>
        <div className="day-picker">
          <button
            onClick={() => {
              const d = new Date(`${date}T12:00:00`)
              d.setDate(d.getDate() - 1)
              setDate(dateKey(d))
            }}
            aria-label="Dia anterior"
          >
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data do atendimento" />
          <button
            onClick={() => {
              const d = new Date(`${date}T12:00:00`)
              d.setDate(d.getDate() + 1)
              setDate(dateKey(d))
            }}
            aria-label="Próximo dia"
          >
            ›
          </button>
          <button className="today-button" onClick={() => setDate(dateKey(new Date()))}>
            Hoje
          </button>
        </div>

        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Buscar paciente sem agendamento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="primary" onClick={() => setCreating(true)}>
          <Plus size={15} />
          Novo atendimento
        </button>
      </Toolbar>

      {/* Resultado da busca avulsa */}
      {search.trim().length >= 2 && (
        <section className="list" style={{ marginBottom: 14 }}>
          <h2>Pacientes encontradas</h2>
          {patients.isLoading ? (
            <p className="hint">Buscando...</p>
          ) : !patients.data?.length ? (
            <p className="hint">Nenhuma paciente com esse nome.</p>
          ) : (
            <div className="data-list">
              {patients.data.slice(0, 6).map((p) => (
                <article key={p.id} className="data-row">
                  <div className="data-main static">
                    <span className="data-avatar">
                      <UserRound size={16} />
                    </span>
                    <span className="data-text">
                      <strong>{p.name}</strong>
                      <span className="data-meta">
                        <span>{p.email}</span>
                        {p.phone && <span>{p.phone}</span>}
                      </span>
                    </span>
                  </div>
                  <span className="data-actions">
                    <StartEncounterButton patient={p} onStarted={onOpen} />
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <h2 className="day-heading">{fullDayLabel(selected)}</h2>

      {agenda.isLoading ? (
        <p className="hint">Carregando agenda...</p>
      ) : !entries.length ? (
        <EmptyState
          title="Nenhum atendimento neste dia"
          description="Escolha outra data, busque a paciente pelo nome ou abra um novo atendimento."
          action={
            <button className="primary" onClick={() => setCreating(true)}>
              <Plus size={15} />
              Novo atendimento
            </button>
          }
        />
      ) : (
        <div className="data-list">
          {entries.map((entry) => {
            const meta = statusMeta(entry.status as never)
            const registered = entry._count.records + entry._count.prescriptions + entry._count.sessions
            const noPatient = !entry.patient
            return (
              <article key={entry.id} className="data-row encounter-row">
                <span className="encounter-time">{clinicTime(entry.scheduledAt)}</span>

                <div className="data-main static">
                  <span className="data-text">
                    <strong>
                      {entry.patient?.name ?? entry.name}
                      <span className={`chip ${meta.tone}`}>{meta.label}</span>
                      {registered > 0 && (
                        <span className="chip info">
                          {registered} registro{registered > 1 ? 's' : ''}
                        </span>
                      )}
                    </strong>
                    <span className="data-meta">
                      <span>{entry.procedure?.title ?? 'Consulta de avaliação'}</span>
                      {noPatient && <span className="warn-text">sem cadastro de paciente</span>}
                    </span>
                  </span>
                </div>

                <span className="data-actions">
                  <button
                    className="primary encounter-open"
                    onClick={() => onOpen(entry.id)}
                    disabled={noPatient}
                    title={noPatient ? 'Cadastre a paciente para atender' : 'Abrir atendimento'}
                  >
                    <Stethoscope size={14} />
                    Atender
                    <ChevronRight size={14} />
                  </button>
                </span>
              </article>
            )
          })}
        </div>
      )}

      {creating && (
        <NewEncounterModal
          onClose={() => setCreating(false)}
          onStarted={(id) => {
            setCreating(false)
            onOpen(id)
          }}
        />
      )}
    </>
  )
}

/**
 * Abre um atendimento para quem chegou sem agendamento: cria a consulta agora
 * e entra direto no prontuário, para que o registro nasça vinculado.
 */
function StartEncounterButton({
  patient,
  onStarted,
}: {
  patient: Patient
  onStarted: (appointmentId: string) => void
}) {
  const client = useQueryClient()

  const start = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/appointments/staff', {
        patientId: patient.id,
        // Encaixe: começa agora e já nasce confirmado
        scheduledAt: new Date().toISOString(),
        status: 'CONFIRMED',
        message: 'Atendimento sem agendamento prévio',
      })
      return data.appointment.id as string
    },
    onSuccess: (id) => {
      client.invalidateQueries({ queryKey: ['encounter-agenda'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      onStarted(id)
    },
  })

  return (
    <button
      className="primary encounter-open"
      onClick={() => start.mutate()}
      disabled={start.isPending}
      title="Iniciar atendimento agora"
    >
      <Stethoscope size={14} />
      {start.isPending ? 'Abrindo...' : 'Atender'}
    </button>
  )
}

/**
 * Novo atendimento a partir do painel: escolhe uma paciente já cadastrada ou
 * cadastra na hora, e entra direto no prontuário.
 */
function NewEncounterModal({
  onClose,
  onStarted,
}: {
  onClose: () => void
  onStarted: (appointmentId: string) => void
}) {
  const client = useQueryClient()
  const [mode, setMode] = React.useState<'existing' | 'new'>('existing')
  const [search, setSearch] = React.useState('')
  const [patientId, setPatientId] = React.useState('')
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', birthDate: '', notes: '' })
  const [procedureId, setProcedureId] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState(() => {
    // Agora, no formato do input datetime-local
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  })

  const patients = useQuery({
    queryKey: ['patients', search, false],
    queryFn: async () => (await api.get('/admin/patients', { params: search ? { search } : {} })).data as Patient[],
  })

  const procedures = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () =>
      (await api.get('/procedures', { params: { tenantSlug } })).data as { id: string; title: string }[],
  })

  const start = useMutation({
    mutationFn: async () => {
      let id = patientId

      // Cadastra a paciente antes, para que o atendimento já nasça vinculado
      if (mode === 'new') {
        const { data } = await api.post('/admin/patients', {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
          notes: form.notes || undefined,
        })
        id = data.id
      }

      const { data } = await api.post('/appointments/staff', {
        patientId: id,
        procedureId: procedureId || undefined,
        scheduledAt: fromDateTimeLocalValue(scheduledAt),
        status: 'CONFIRMED',
      })
      return data.appointment.id as string
    },
    onSuccess: (id) => {
      client.invalidateQueries({ queryKey: ['encounter-agenda'] })
      client.invalidateQueries({ queryKey: ['patients'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      onStarted(id)
    },
  })

  const valid =
    mode === 'existing'
      ? !!patientId && !!scheduledAt
      : form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && !!scheduledAt

  return (
    <Modal
      title="Novo atendimento"
      subtitle="Cria a consulta e abre o prontuário"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={start.isPending} disabled={!valid} onClick={() => start.mutate()}>
            Iniciar atendimento
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <div className="segmented" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'existing'}
            className={mode === 'existing' ? 'active' : ''}
            onClick={() => setMode('existing')}
          >
            Paciente cadastrada
          </button>
          <button
            role="tab"
            aria-selected={mode === 'new'}
            className={mode === 'new' ? 'active' : ''}
            onClick={() => setMode('new')}
          >
            Cadastrar agora
          </button>
        </div>

        {mode === 'existing' ? (
          <>
            <Field label="Buscar paciente">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, e-mail ou telefone"
                autoFocus
              />
            </Field>
            <Field label="Paciente" required>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} size={6}>
                {patients.data?.slice(0, 40).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.email}
                  </option>
                ))}
              </select>
            </Field>
            {!patients.data?.length && !patients.isLoading && (
              <p className="hint">
                Nenhuma paciente encontrada. Use “Cadastrar agora” para criar o cadastro.
              </p>
            )}
          </>
        ) : (
          <>
            <Field label="Nome completo" required>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <FormRow>
              <Field label="E-mail" required hint="Usado para o acesso ao portal">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Telefone" hint="Com DDD, para o WhatsApp">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(67) 90000-0000"
                />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Data de nascimento">
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </Field>
              <Field label="Observações" hint="Alergias, histórico relevante">
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </FormRow>
          </>
        )}

        <FormRow>
          <Field label="Procedimento">
            <select value={procedureId} onChange={(e) => setProcedureId(e.target.value)}>
              <option value="">Consulta de avaliação</option>
              {procedures.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data e horário" required hint="Já vem preenchido com agora">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Field>
        </FormRow>

        {start.isError && <p className="error">{errorMessage(start.error)}</p>}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Atendimento aberto
// ─────────────────────────────────────────────────────────────────────────────

function EncounterDetail({ appointmentId, onBack }: { appointmentId: string; onBack: () => void }) {
  const client = useQueryClient()
  const [tab, setTab] = React.useState<'record' | 'history' | 'documents' | 'procedures'>('record')
  const [creating, setCreating] = React.useState(false)
  const [editing, setEditing] = React.useState<MedicalRecord | null>(null)
  const [completing, setCompleting] = React.useState(false)

  const query = useQuery({
    queryKey: ['encounter', appointmentId],
    queryFn: async () => (await api.get(`/clinical/encounters/${appointmentId}`)).data as Encounter,
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['encounter', appointmentId] })
    client.invalidateQueries({ queryKey: ['encounter-agenda'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const complete = useMutation({
    mutationFn: () => api.post(`/clinical/encounters/${appointmentId}/complete`),
    onSuccess: () => {
      setCompleting(false)
      refresh()
      onBack()
    },
  })

  if (query.isLoading) return <p className="hint">Carregando atendimento...</p>
  if (query.isError) return <p className="error">{errorMessage(query.error)}</p>

  const data = query.data!
  const { patient, appointment } = data
  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 86400000))
    : null

  const tabs = [
    ['record', `Atendimento (${data.currentRecords.length})`],
    ['history', `Histórico (${data.history.length})`],
    ['documents', `Documentos (${data.documents.length})`],
    ['procedures', `Procedimentos (${data.sessions.length})`],
  ] as const

  return (
    <>
      <div className="encounter-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={15} />
          Agenda
        </button>

        <div className="encounter-patient">
          <span className="data-avatar">
            <UserRound size={18} />
          </span>
          <div>
            <strong>{patient.name}</strong>
            <span>
              {age != null && `${age} anos · `}
              {patient.phone ?? patient.email}
            </span>
          </div>
        </div>

        <div className="encounter-when">
          <CalendarDays size={14} />
          {appointment.scheduledAt
            ? `${clinicDate(appointment.scheduledAt)} · ${clinicTime(appointment.scheduledAt)}`
            : 'sem horário'}
          {appointment.procedure && <span> · {appointment.procedure.title}</span>}
        </div>

        {appointment.status !== 'COMPLETED' && (
          <button className="primary" onClick={() => setCompleting(true)}>
            <CheckCircle2 size={14} />
            Encerrar
          </button>
        )}
      </div>

      {patient.notes && (
        <div className="patient-alert">
          <strong>Observações da paciente:</strong> {patient.notes}
        </div>
      )}

      <div className="area-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'record' && (
        <>
          <Toolbar>
            <span className="toolbar-title">Registros desta consulta</span>
            <button className="primary" onClick={() => setCreating(true)}>
              <Plus size={15} />
              Novo registro
            </button>
          </Toolbar>
          {!data.currentRecords.length ? (
            <EmptyState
              title="Nada registrado ainda"
              description="Comece a evolução deste atendimento. O registro fica vinculado a esta consulta."
              action={
                <button className="primary" onClick={() => setCreating(true)}>
                  <Plus size={15} />
                  Novo registro
                </button>
              }
            />
          ) : (
            <RecordTimeline records={data.currentRecords} onEdit={setEditing} onChanged={refresh} />
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          <Toolbar>
            <span className="toolbar-title">Atendimentos anteriores</span>
          </Toolbar>
          {!data.history.length ? (
            <EmptyState title="Primeira consulta" description="Não há registros anteriores desta paciente." />
          ) : (
            <RecordTimeline records={data.history} readOnly />
          )}
        </>
      )}

      {tab === 'documents' && (
        <EncounterDocuments
          patientId={patient.id}
          appointmentId={appointmentId}
          documents={data.documents}
          onChanged={refresh}
        />
      )}

      {tab === 'procedures' && (
        <EncounterSessions
          patientId={patient.id}
          appointmentId={appointmentId}
          sessions={data.sessions}
          onChanged={refresh}
        />
      )}

      {(creating || editing) && (
        <RecordForm
          patientId={patient.id}
          appointmentId={appointmentId}
          record={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            refresh()
          }}
        />
      )}

      {completing && (
        <ConfirmDialog
          title="Encerrar atendimento?"
          message="A consulta será marcada como realizada. Os registros continuam editáveis até serem fechados."
          confirmLabel="Encerrar"
          pending={complete.isPending}
          onCancel={() => setCompleting(false)}
          onConfirm={() => complete.mutate()}
        />
      )}
    </>
  )
}

function RecordTimeline({
  records,
  onEdit,
  onChanged,
  readOnly,
}: {
  records: MedicalRecord[]
  onEdit?: (record: MedicalRecord) => void
  onChanged?: () => void
  readOnly?: boolean
}) {
  const [locking, setLocking] = React.useState<MedicalRecord | null>(null)

  const lock = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/records/${id}/lock`),
    onSuccess: () => {
      setLocking(null)
      onChanged?.()
    },
  })

  return (
    <>
      <div className="timeline">
        {records.map((record) => (
          <article key={record.id} className="timeline-item">
            <div className="timeline-head">
              <div>
                <strong>{record.title}</strong>
                <span className="chip neutral">{recordTypeLabel(record.type)}</span>
                {record.lockedAt && (
                  <span className="chip success">
                    <Lock size={11} /> Fechado
                  </span>
                )}
              </div>
              <span className="timeline-date">
                {formatDateBR(record.occurredAt ?? record.createdAt)}
                {record.appointment?.scheduledAt && ` · ${clinicTime(record.appointment.scheduledAt)}`}
              </span>
            </div>

            {record.complaint && (
              <p className="timeline-field">
                <span>Queixa</span>
                {record.complaint}
              </p>
            )}
            {record.history && (
              <p className="timeline-field">
                <span>Histórico</span>
                {record.history}
              </p>
            )}
            <p className="timeline-body">{record.body}</p>
            {record.plan && (
              <p className="timeline-field">
                <span>Conduta</span>
                {record.plan}
              </p>
            )}

            {!readOnly && !record.lockedAt && (
              <div className="timeline-actions">
                <button onClick={() => onEdit?.(record)}>
                  <Pencil size={13} />
                  Editar
                </button>
                <button onClick={() => setLocking(record)}>
                  <Lock size={13} />
                  Fechar registro
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {locking && (
        <ConfirmDialog
          title="Fechar registro?"
          message="Depois de fechado, o registro não pode mais ser editado nem excluído. É assim que o prontuário ganha valor de documento clínico."
          confirmLabel="Fechar registro"
          pending={lock.isPending}
          onCancel={() => setLocking(null)}
          onConfirm={() => lock.mutate(locking.id)}
        />
      )}
    </>
  )
}

function RecordForm({
  patientId,
  appointmentId,
  record,
  onClose,
  onSaved,
}: {
  patientId: string
  appointmentId?: string
  record?: MedicalRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    title: record?.title ?? '',
    type: record?.type ?? 'EVOLUTION',
    complaint: record?.complaint ?? '',
    history: record?.history ?? '',
    body: record?.body ?? '',
    plan: record?.plan ?? '',
  })

  // Modelos de anamnese/evolução cadastrados no catálogo
  const templates = useQuery({
    queryKey: ['catalog', 'RECORD_TEMPLATE', ''],
    queryFn: async () =>
      (await api.get('/clinical/catalog', { params: { kind: 'RECORD_TEMPLATE' } })).data as {
        id: string
        name: string
        body: string | null
      }[],
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, ...(appointmentId ? { appointmentId } : {}) }
      if (record) await api.put(`/admin/records/${record.id}`, payload)
      else await api.post(`/admin/patients/${patientId}/records`, payload)
    },
    onSuccess: onSaved,
  })

  const valid = form.title.trim().length >= 2 && form.body.trim().length >= 2

  return (
    <Modal
      title={record ? 'Editar registro' : 'Novo registro'}
      subtitle={appointmentId ? 'Vinculado a esta consulta' : 'Sem vínculo com agendamento'}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {record ? 'Salvar' : 'Registrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <FormRow>
          <Field label="Título" required>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </Field>
          <Field label="Tipo">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {RECORD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </FormRow>

        {!!templates.data?.length && (
          <Field label="Usar modelo" hint="Preenche a evolução com um texto cadastrado">
            <select
              value=""
              onChange={(e) => {
                const tpl = templates.data?.find((t) => t.id === e.target.value)
                if (tpl?.body) setForm((prev) => ({ ...prev, body: tpl.body! }))
              }}
            >
              <option value="">Escolher modelo…</option>
              {templates.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Queixa principal">
          <input value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
        </Field>

        <Field label="Histórico" hint="Alergias, medicações em uso, comorbidades">
          <textarea rows={3} value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })} />
        </Field>

        <Field label="Evolução" required>
          <textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>

        <Field label="Conduta">
          <textarea rows={3} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
        </Field>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

/** Documentos emitidos, com atalho para criar já vinculado a esta consulta. */
function EncounterDocuments({
  patientId,
  appointmentId,
  documents,
  onChanged,
}: {
  patientId: string
  appointmentId: string
  documents: Encounter['documents']
  onChanged: () => void
}) {
  return (
    <>
      <Toolbar>
        <span className="toolbar-title">Receitas, exames e orientações</span>
        <span className="hint" style={{ marginLeft: 'auto' }}>
          Emita em Prontuário → Documentos
        </span>
      </Toolbar>

      {!documents.length ? (
        <EmptyState title="Nenhum documento" description="Receitas e pedidos de exame desta paciente aparecem aqui." />
      ) : (
        <div className="data-list">
          {documents.map((doc) => (
            <article key={doc.id} className="data-row">
              <div className="data-main static">
                <span className="data-avatar">
                  <FileText size={16} />
                </span>
                <span className="data-text">
                  <strong>
                    {doc.title}
                    <span className={`chip ${doc.status === 'SIGNED' ? 'success' : 'neutral'}`}>
                      {doc.status === 'SIGNED' ? 'Assinado' : doc.status === 'SENT' ? 'Enviado' : 'Rascunho'}
                    </span>
                  </strong>
                  <span className="data-meta">
                    <span>{formatDateBR(doc.createdAt)}</span>
                    {doc.items?.length > 0 && <span>{doc.items.length} item(ns)</span>}
                  </span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

function EncounterSessions({
  patientId,
  appointmentId,
  sessions,
  onChanged,
}: {
  patientId: string
  appointmentId: string
  sessions: Encounter['sessions']
  onChanged: () => void
}) {
  const [creating, setCreating] = React.useState(false)

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">Procedimentos realizados</span>
        <button className="primary" onClick={() => setCreating(true)}>
          <Plus size={15} />
          Registrar procedimento
        </button>
      </Toolbar>

      {!sessions.length ? (
        <EmptyState
          title="Nenhum procedimento registrado"
          description="Registre o que foi realizado neste atendimento."
          action={
            <button className="primary" onClick={() => setCreating(true)}>
              <Plus size={15} />
              Registrar
            </button>
          }
        />
      ) : (
        <div className="data-list">
          {sessions.map((session) => (
            <article key={session.id} className="data-row">
              <div className="data-main static">
                <span className="data-avatar">
                  <HeartPulse size={16} />
                </span>
                <span className="data-text">
                  <strong>{session.procedure?.title ?? 'Procedimento'}</strong>
                  <span className="data-meta">
                    <span>{formatDateBR(session.performedAt)}</span>
                    <span>{formatMoney(session.priceCents)}</span>
                  </span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <SessionQuickForm
          patientId={patientId}
          appointmentId={appointmentId}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            onChanged()
          }}
        />
      )}
    </>
  )
}

function SessionQuickForm({
  patientId,
  appointmentId,
  onClose,
  onSaved,
}: {
  patientId: string
  appointmentId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    procedureId: '',
    performedAt: new Date().toISOString().slice(0, 10),
    notes: '',
    price: '',
  })

  const procedures = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () =>
      (await api.get('/procedures', { params: { tenantSlug } })).data as { id: string; title: string }[],
  })

  const save = useMutation({
    mutationFn: async () =>
      api.post('/admin/sessions', {
        patientId,
        appointmentId,
        procedureId: form.procedureId || undefined,
        performedAt: new Date(`${form.performedAt}T12:00:00`).toISOString(),
        notes: form.notes || undefined,
        priceCents: parseMoney(form.price),
      }),
    onSuccess: onSaved,
  })

  return (
    <Modal
      title="Registrar procedimento"
      subtitle="Vinculado a esta consulta"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} onClick={() => save.mutate()}>
            Registrar
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
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
            <input
              type="date"
              value={form.performedAt}
              onChange={(e) => setForm({ ...form, performedAt: e.target.value })}
            />
          </Field>
        </FormRow>

        <Field label="Valor">
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
