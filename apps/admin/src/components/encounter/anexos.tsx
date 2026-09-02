import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FlaskConical, Pill, Plus } from 'lucide-react'
import {
  api,
  Chip,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  formatDateBR,
  formatMoney,
  FormRow,
  Modal,
  parseMoney,
  RowAction,
  SubmitButton,
  tenantSlug,
  Toolbar,
} from '../../lib/ui'
import { DocumentForm, SignDocumentPrompt, type DocumentKind } from '../Clinical'

/**
 * Etapa 3: o que sai do atendimento - receita, atestado e sessao realizada.
 */
export function EncounterDocuments({
  patient,
  appointmentId,
  documents,
  onChanged,
}: {
  patient: { id: string; name: string }
  appointmentId: string
  documents: Encounter['documents']
  onChanged: () => void
}) {
  const [creating, setCreating] = React.useState<DocumentKind | null>(null)
  const [signing, setSigning] = React.useState<Encounter['documents'][number] | null>(null)

  const sign = useMutation({
    mutationFn: async ({ id, otp }: { id: string; otp?: string }) =>
      (await api.post(`/clinical/documents/${id}/sign`, otp ? { otp } : {})).data,
    onSuccess: () => {
      setSigning(null)
      onChanged()
    },
  })
  const send = useMutation({
    mutationFn: (id: string) => api.post(`/clinical/documents/${id}/send`),
    onSuccess: onChanged,
  })

  // Com certificado ativo, a assinatura pede o código do app da médica
  const signatureConfig = useQuery({
    queryKey: ['signature-config'],
    queryFn: async () => (await api.get('/clinical/signature/config')).data as { config: { enabled: boolean } | null },
  })
  const cloudReady = Boolean(signatureConfig.data?.config?.enabled)

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">Emitir para {patient.name.split(' ')[0]}</span>
        <button className="primary" onClick={() => setCreating('PRESCRIPTION')}>
          <Pill size={15} />
          Receita
        </button>
        <button className="primary" onClick={() => setCreating('EXAM_REQUEST')}>
          <FlaskConical size={15} />
          Pedido de exame
        </button>
        <button className="primary" onClick={() => setCreating('GUIDANCE')}>
          <BookOpen size={15} />
          Orientações
        </button>
      </Toolbar>

      {!documents.length ? (
        <EmptyState
          title="Nenhum documento nesta consulta"
          description="Emita receita, pedido de exame ou orientações. Tudo já sai vinculado a este atendimento."
          action={
            <button className="primary" onClick={() => setCreating('PRESCRIPTION')}>
              <Plus size={15} />
              Nova receita
            </button>
          }
        />
      ) : (
        <DataList>
          {documents.map((doc) => {
            const signed = doc.status === 'SIGNED' || doc.status === 'SENT'
            return (
              <DataRow
                key={doc.id}
                icon={FileText}
                title={doc.title}
                chips={
                  <Chip tone={doc.status === 'SIGNED' ? 'success' : doc.status === 'SENT' ? 'info' : 'neutral'}>
                    {doc.status === 'SIGNED' ? 'Assinado' : doc.status === 'SENT' ? 'Enviado' : 'Rascunho'}
                  </Chip>
                }
                meta={
                  <>
                    <span>{formatDateBR(doc.createdAt)}</span>
                    {doc.items?.length > 0 && <span>{doc.items.length} item(ns)</span>}
                  </>
                }
                actions={
                  <>
                    <RowAction
                      icon={FileSignature}
                      title={signed ? 'Já assinado' : 'Assinar documento'}
                      onClick={() => (cloudReady ? setSigning(doc) : sign.mutate({ id: doc.id }))}
                      disabled={signed || sign.isPending}
                    />
                    <RowAction
                      icon={Send}
                      title="Enviar à paciente"
                      onClick={() => send.mutate(doc.id)}
                      disabled={send.isPending}
                    />
                  </>
                }
              />
            )
          })}
        </DataList>
      )}

      {(sign.isError || send.isError) && <p className="error">{errorMessage(sign.error ?? send.error)}</p>}

      {creating && (
        <DocumentForm
          kind={creating}
          document={null}
          fixedPatient={patient}
          appointmentId={appointmentId}
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null)
            onChanged()
          }}
        />
      )}

      {signing && (
        <SignDocumentPrompt
          title={signing.title}
          patientName={patient.name}
          pending={sign.isPending}
          error={sign.isError ? errorMessage(sign.error) : null}
          onCancel={() => setSigning(null)}
          onConfirm={(otp) => sign.mutate({ id: signing.id, otp })}
        />
      )}
    </>
  )
}


export function EncounterSessions({
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
        <DataList>
          {sessions.map((session) => (
            <DataRow
              key={session.id}
              icon={HeartPulse}
              title={session.procedure?.title ?? 'Procedimento'}
              meta={
                <>
                  <span>{formatDateBR(session.performedAt)}</span>
                  <span>{formatMoney(session.priceCents)}</span>
                </>
              }
            />
          ))}
        </DataList>
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

export function SessionQuickForm({
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
