import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  HeartPulse,
  Paperclip,
  Plus,
  Send,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import {
  api,
  AttachmentsPanel,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  FileUploadButton,
  formatDateBR,
  formatMoney,
  FormRow,
  Modal,
  RowAction,
  SubmitButton,
  tenantSlug,
  Toolbar,
} from '../lib/ui'
import { clinicDate, clinicTime, fromDateTimeLocalValue, statusMeta } from '../lib/schedule'
import { DocumentForm, SignDocumentPrompt, type DocumentKind } from './Clinical'
import { ClinicalAlerts } from './Patients'
import { TodayAgenda } from './encounter/agenda'
import { AvisosBarra, EnviarAviso } from './Avisos'
import { useAvisos } from '../lib/avisos'
import { RecordTimeline, RecordForm } from './encounter/prontuario'
import { EncounterDocuments, EncounterSessions } from './encounter/anexos'
import { RECORD_TYPES, recordTypeLabel, type EncounterData, type MedicalRecord } from './encounter/types'

/**
 * Painel de Atendimento: o fluxo do consultorio.
 * Agenda do dia -> paciente -> prontuario daquele atendimento.
 *
 * Cada etapa vive em ./encounter: a agenda que abre a ficha, o prontuario e o
 * que sai do atendimento. Aqui fica so a casca que liga uma na outra.
 */
export function Encounter() {
  const [openId, setOpenId] = React.useState<string | null>(null)

  if (openId) return <EncounterDetail appointmentId={openId} onBack={() => setOpenId(null)} />
  return <TodayAgenda onOpen={setOpenId} />
}

function EncounterDetail({ appointmentId, onBack }: { appointmentId: string; onBack: () => void }) {
  const client = useQueryClient()
  const avisos = useAvisos()
  const [tab, setTab] = React.useState<'record' | 'history' | 'documents' | 'procedures' | 'files'>('record')
  const [creating, setCreating] = React.useState(false)
  const [editing, setEditing] = React.useState<MedicalRecord | null>(null)
  const [completing, setCompleting] = React.useState(false)

  const query = useQuery({
    queryKey: ['encounter', appointmentId],
    queryFn: async () => (await api.get(`/clinical/encounters/${appointmentId}`)).data as EncounterData,
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['encounter', appointmentId] })
    client.invalidateQueries({ queryKey: ['encounter-agenda'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const [lockOnComplete, setLockOnComplete] = React.useState(false)

  // O que ficou aberto nesta consulta, para avisar antes de encerrar
  const pending = useQuery({
    queryKey: ['encounter-pending', appointmentId],
    queryFn: async () =>
      (await api.get(`/clinical/encounters/${appointmentId}/pending`)).data as {
        openRecords: number
        draftDocuments: number
        unsentDocuments: number
        hasRecords: boolean
      },
    enabled: completing,
  })

  const complete = useMutation({
    mutationFn: () =>
      api.post(`/clinical/encounters/${appointmentId}/complete`, { lockRecords: lockOnComplete }),
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
    ['files', `Arquivos (${data.attachments?.length ?? 0})`],
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

        {/* Os recados que a médica dá dezenas de vezes por dia, sem sair do
            atendimento nem abrir a porta do consultório.
 
            Ficam visíveis mesmo com a consulta encerrada: encerrar o prontuário
            e a paciente sair da sala são momentos diferentes, e chamar a
            recepção não depende de nenhum dos dois. */}
        <div className="encounter-avisos">
          {!appointment.calledAt && (
            <EnviarAviso
              avisos={avisos}
              kind="CALL_PATIENT"
              rotulo="Chamar paciente"
              appointmentId={appointmentId}
              compacto
            />
          )}
          <EnviarAviso avisos={avisos} kind="CALL_STAFF" rotulo="Chamar recepção" compacto />
          {!appointment.releasedAt && (
            <EnviarAviso
              avisos={avisos}
              kind="PATIENT_RELEASED"
              rotulo="Paciente saiu"
              appointmentId={appointmentId}
              compacto
            />
          )}
        </div>

        {appointment.status !== 'COMPLETED' && (
          <button className="primary" onClick={() => setCompleting(true)}>
            <CheckCircle2 size={14} />
            Encerrar
          </button>
        )}
      </div>

      <AvisosBarra avisos={avisos} />

      {/* Alergias e gestação antes de qualquer prescrição */}
      <ClinicalAlerts patient={patient} />

      {patient.notes && (
        <div className="patient-alert neutral">
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
          patient={{ id: patient.id, name: patient.name }}
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

      {tab === 'files' && (
        <AttachmentsPanel patientId={patient.id} attachments={data.attachments ?? []} onChanged={refresh} />
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
        <Modal
          title="Encerrar atendimento?"
          subtitle="A consulta será marcada como realizada"
          onClose={() => setCompleting(false)}
          footer={
            <>
              <button onClick={() => setCompleting(false)}>Cancelar</button>
              <SubmitButton pending={complete.isPending} onClick={() => complete.mutate()}>
                Encerrar
              </SubmitButton>
            </>
          }
        >
          <div className="form-grid">
            {pending.isLoading ? (
              <p className="hint">Conferindo pendências...</p>
            ) : (
              <>
                {!pending.data?.hasRecords && (
                  <p className="warn-text">
                    Nenhuma evolução foi registrada nesta consulta.
                  </p>
                )}
                {!!pending.data?.draftDocuments && (
                  <p className="warn-text">
                    {pending.data.draftDocuments} documento(s) ainda em rascunho — não foram
                    assinados nem entregues à paciente.
                  </p>
                )}
                {!!pending.data?.unsentDocuments && (
                  <p className="warn-text">
                    {pending.data.unsentDocuments} documento(s) assinado(s) mas não enviado(s) ao
                    portal da paciente.
                  </p>
                )}

                {!!pending.data?.openRecords && (
                  <label className="toolbar-check">
                    <input
                      type="checkbox"
                      checked={lockOnComplete}
                      onChange={(e) => setLockOnComplete(e.target.checked)}
                    />
                    Fechar {pending.data.openRecords} registro(s) desta consulta — depois de
                    fechados não podem mais ser editados
                  </label>
                )}

                {!pending.data?.draftDocuments &&
                  !pending.data?.unsentDocuments &&
                  pending.data?.hasRecords && <p className="hint">Nada pendente nesta consulta.</p>}
              </>
            )}

            {complete.isError && <p className="error">{errorMessage(complete.error)}</p>}
          </div>
        </Modal>
      )}
    </>
  )
}
