import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Pencil } from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  errorMessage,
  Field,
  formatDateBR,
  FormRow,
  Modal,
  SubmitButton,
} from '../../lib/ui'
import { clinicTime } from '../../lib/schedule'
import { RECORD_TYPES, recordTypeLabel, type MedicalRecord } from './types'

/**
 * Etapa 2: o prontuario daquele atendimento. Registro assinado nao volta a ser
 * editavel, por isso a trava aparece na propria linha da timeline.
 */
export function RecordTimeline({
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
                <Chip>{recordTypeLabel(record.type)}</Chip>
                {record.lockedAt && (
                  <Chip tone="success" icon={Lock}>
                    Fechado
                  </Chip>
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

export function RecordForm({
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

/**
 * Documentos emitidos na consulta. Emite aqui mesmo: a paciente já está
 * definida e o documento nasce vinculado a este atendimento — sem trocar de
 * tela e sem escolher paciente de novo.
 */
