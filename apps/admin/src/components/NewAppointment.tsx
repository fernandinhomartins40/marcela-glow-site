import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { api, errorMessage, Field, FormRow, Modal, SubmitButton, tenantSlug } from '../lib/ui'
import { fromDateTimeLocalValue, type WhatsAppLink } from '../lib/schedule'
import type { Patient } from './Patients'

interface Procedure {
  id: string
  title: string
  durationMin: number
  bufferMin: number
}

/**
 * Agendamento feito pela equipe (telefone ou balcão). Diferente do site, aqui
 * a data é livre — a recepção pode encaixar fora do expediente se precisar.
 */
export function NewAppointment({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate?: string
  onClose: () => void
  onCreated: () => void
}) {
  const client = useQueryClient()
  const [mode, setMode] = React.useState<'existing' | 'new'>('existing')
  const [patientId, setPatientId] = React.useState('')
  const [guest, setGuest] = React.useState({ name: '', email: '', phone: '' })
  const [procedureId, setProcedureId] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState(defaultDate ?? '')
  const [message, setMessage] = React.useState('')
  const [status, setStatus] = React.useState<'CONFIRMED' | 'PENDING'>('CONFIRMED')
  const [result, setResult] = React.useState<WhatsAppLink | null>(null)

  const patients = useQuery({
    queryKey: ['patients', '', false],
    queryFn: async () => (await api.get('/admin/patients')).data as Patient[],
  })

  const procedures = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () => (await api.get('/procedures', { params: { tenantSlug } })).data as Procedure[],
  })

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/appointments/staff', {
        ...(mode === 'existing' ? { patientId } : { name: guest.name, email: guest.email, phone: guest.phone }),
        procedureId: procedureId || undefined,
        scheduledAt: fromDateTimeLocalValue(scheduledAt),
        message: message || undefined,
        status,
      })
      return data as { whatsapp: WhatsAppLink }
    },
    onSuccess: (data) => {
      setResult(data.whatsapp)
      client.invalidateQueries({ queryKey: ['admin'] })
      client.invalidateQueries({ queryKey: ['patients'] })
      onCreated()
    },
  })

  const chosen = procedures.data?.find((p) => p.id === procedureId)
  const patientOk =
    mode === 'existing'
      ? !!patientId
      : guest.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(guest.email)
  const valid = patientOk && !!scheduledAt

  // Depois de criar, o painel vira o cartão de aviso à paciente
  if (result) {
    return (
      <Modal
        title="Agendamento criado"
        subtitle="Envie a confirmação para a paciente"
        onClose={onClose}
        footer={<button onClick={onClose}>Fechar</button>}
      >
        <div className="whatsapp-box">
          <h3>Mensagem para a paciente</h3>
          <pre>{result.message}</pre>
          {result.url ? (
            <button className="whatsapp-button" onClick={() => window.open(result.url!, '_blank', 'noopener')}>
              <MessageCircle size={15} />
              Abrir no WhatsApp
            </button>
          ) : (
            <p className="hint">{result.unavailableReason}</p>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Novo agendamento"
      subtitle="Para marcações por telefone ou no balcão"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={create.isPending} disabled={!valid} onClick={() => create.mutate()}>
            Criar agendamento
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
            Sem cadastro
          </button>
        </div>

        {mode === 'existing' ? (
          <Field label="Paciente" required>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione…</option>
              {patients.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.email}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Nome" required>
              <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
            </Field>
            <FormRow>
              <Field label="E-mail" required>
                <input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              </Field>
              <Field label="Telefone" hint="Para o aviso por WhatsApp">
                <input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="(67) 90000-0000" />
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
          <Field
            label="Data e horário"
            required
            hint={chosen ? `Ocupa ${chosen.durationMin + chosen.bufferMin} min` : 'Ocupa 60 min'}
          >
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Field>
        </FormRow>

        <Field label="Situação">
          <select value={status} onChange={(e) => setStatus(e.target.value as 'CONFIRMED' | 'PENDING')}>
            <option value="CONFIRMED">Confirmado — avisa a paciente</option>
            <option value="PENDING">Aguardando confirmação</option>
          </select>
        </Field>

        <Field label="Observações">
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>

        {create.isError && <p className="error">{errorMessage(create.error)}</p>}
      </div>
    </Modal>
  )
}
