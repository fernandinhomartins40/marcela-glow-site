import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CalendarDays,
  Download,
  FileText,
  HeartPulse,
  Mail,
  MessageCircle,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Search,
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
  isValidCPF,
  maskCEP,
  maskCPF,
  maskPhone,
  Modal,
  RowAction,
  SearchBox,
  SubmitButton,
  toDateInput,
  Toolbar,
  type Tone,
  usePermissoes,
} from '../../lib/ui'
import { PlanosPanel } from './planos'
import { useDebounced } from '../../lib/useDebounced'
import { labelOf, GENDERS, MARITAL_STATUSES, BLOOD_TYPES, REFERRAL_SOURCES, type Patient } from './shared'

/**
 * Ficha aberta: o historico da paciente reunido - consultas, documentos,
 * registros e anexos.
 */
const DOC_STATUS: Record<string, { label: string; tone: Tone }> = {
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
 * Alergias, medicações em uso, comorbidades e gestação — o que precisa saltar
 * aos olhos antes de prescrever. Fica em destaque no topo da ficha e do
 * atendimento; sem isso, a informação ficava enterrada no texto de observações.
 */
export function ClinicalAlerts({ patient }: { patient: Partial<Patient> }) {
  const alerts: { label: string; value: string; critical?: boolean }[] = []

  if (patient.allergies) alerts.push({ label: 'Alergias', value: patient.allergies, critical: true })
  if (patient.medications) alerts.push({ label: 'Medicações em uso', value: patient.medications })
  if (patient.conditions) alerts.push({ label: 'Comorbidades', value: patient.conditions })
  if (patient.isPregnant) alerts.push({ label: 'Gestante', value: 'Confirmar segurança do que for prescrito', critical: true })
  if (patient.isBreastfeeding) alerts.push({ label: 'Amamentando', value: 'Confirmar segurança do que for prescrito', critical: true })

  if (!alerts.length) return null

  return (
    <div className="clinical-alerts">
      {alerts.map((alert) => (
        <div key={alert.label} className={`patient-alert ${alert.critical ? 'critical' : ''}`}>
          <AlertTriangle size={14} />
          <span>
            <strong>{alert.label}:</strong> {alert.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Prontuário da paciente: tudo que a clínica registrou, em ordem.
 * Só leitura — registro novo nasce em Atendimento, sempre vinculado à consulta.
 */
export function PatientDetail({ id, onClose, initialTab = 'timeline' }: { id: string; onClose: () => void; initialTab?: 'timeline' | 'messages' }) {
  const client = useQueryClient()
  const { pode } = usePermissoes()
  const [tab, setTab] = React.useState<'timeline' | 'documents' | 'procedures' | 'files' | 'messages'>(initialTab)
  const [reply, setReply] = React.useState('')

  const sendReply = useMutation({
    mutationFn: async (body: string) => api.post(`/admin/patients/${id}/messages`, { body }),
    onSuccess: async () => {
      setReply('')
      await client.invalidateQueries({ queryKey: ['patient', id] })
    },
  })

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
    ['procedures', 'Jornada'],
    ['files', `Arquivos (${p.attachments?.length ?? 0})`],
    ['messages', `Mensagens (${p.messages?.length ?? 0})`],
  ] as const

  const address = [
    [p.street, p.streetNumber].filter(Boolean).join(', '),
    p.complement,
    p.district,
    [p.city, p.state].filter(Boolean).join(' - '),
    p.zipCode ? maskCEP(p.zipCode) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Modal
      title={p.socialName || p.name}
      subtitle={[age != null ? `${age} anos` : null, p.phone || p.email].filter(Boolean).join(' · ')}
      onClose={onClose}
      wide
    >
      <div className="form-grid">
        <ClinicalAlerts patient={p} />

        {p.notes && (
          <div className="patient-alert neutral">
            <strong>Observações:</strong> {p.notes}
          </div>
        )}

        <dl className="drawer-facts">
          <div>
            <dt>Contato</dt>
            <dd>{p.phone ? maskPhone(p.phone) : 'sem telefone'}</dd>
            <dd>{p.email}</dd>
          </div>
          <div>
            <dt>Documento</dt>
            <dd>{p.cpf ? maskCPF(p.cpf) : 'CPF não informado'}</dd>
            {p.rg && <dd>RG {p.rg}</dd>}
          </div>
          <div>
            <dt>Nascimento</dt>
            <dd>{formatDateBR(p.birthDate)}</dd>
            {p.gender && <dd>{labelOf(GENDERS, p.gender)}</dd>}
          </div>
          {p.socialName && (
            <div>
              <dt>Nome civil</dt>
              <dd>{p.name}</dd>
            </div>
          )}
          {address && (
            <div className="wide">
              <dt>Endereço</dt>
              <dd>{address}</dd>
            </div>
          )}
          {p.emergencyName && (
            <div>
              <dt>Emergência</dt>
              <dd>{p.emergencyName}{p.emergencyRelation ? ` (${p.emergencyRelation})` : ''}</dd>
              {p.emergencyPhone && <dd>{maskPhone(p.emergencyPhone)}</dd>}
            </div>
          )}
          {p.insuranceName && (
            <div>
              <dt>Convênio</dt>
              <dd>{p.insuranceName}</dd>
              {p.insuranceNumber && <dd>{p.insuranceNumber}</dd>}
            </div>
          )}
          {(p.occupation || p.maritalStatus) && (
            <div>
              <dt>Perfil</dt>
              {p.occupation && <dd>{p.occupation}</dd>}
              {p.maritalStatus && <dd>{labelOf(MARITAL_STATUSES, p.maritalStatus)}</dd>}
            </div>
          )}
          {p.referralSource && (
            <div>
              <dt>Como chegou</dt>
              <dd>{p.referralSource}</dd>
              {p.referredBy && <dd>por {p.referredBy}</dd>}
            </div>
          )}
          <div>
            <dt>Paciente desde</dt>
            <dd>{formatDateBR(p.createdAt)}</dd>
          </div>
          <div>
            <dt>Consultas</dt>
            <dd>{p.appointments?.length ?? 0}</dd>
          </div>
          <div>
            <dt>Consentimentos</dt>
            <dd>{p.lgpdConsentAt ? `LGPD em ${formatDateBR(p.lgpdConsentAt)}` : 'LGPD pendente'}</dd>
            <dd>{p.imageConsentAt ? `Imagem em ${formatDateBR(p.imageConsentAt)}` : 'Imagem não autorizada'}</dd>
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
                      <Chip>{RECORD_TYPE[r.type] ?? r.type}</Chip>
                      {r.lockedAt && <Chip tone="success">Fechado</Chip>}
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
            <DataList>
              {p.prescriptions.map((doc: any) => {
                const meta = DOC_STATUS[doc.status] ?? { label: doc.status, tone: 'neutral' as const }
                return (
                  <DataRow
                    key={doc.id}
                    icon={FileText}
                    title={doc.title}
                    chips={<Chip tone={meta.tone}>{meta.label}</Chip>}
                    meta={
                      <>
                        <span>{DOC_KIND[doc.kind] ?? doc.kind}</span>
                        <span>{formatDateBR(doc.createdAt)}</span>
                        {doc.items?.length > 0 && <span>{doc.items.length} item(ns)</span>}
                      </>
                    }
                  />
                )
              })}
            </DataList>
          ))}

        {tab === 'procedures' && (
          <>
            <PlanosPanel patientId={id} />

            <p className="form-section-title">Sessões registradas</p>
          </>
        )}

        {tab === 'procedures' &&
          (!p.sessions?.length ? (
            <p className="hint">Nenhum procedimento registrado.</p>
          ) : (
            <DataList>
              {p.sessions.map((s: any) => (
                <DataRow
                  key={s.id}
                  icon={HeartPulse}
                  title={s.procedure?.title ?? 'Procedimento'}
                  meta={
                    <>
                      <span>{formatDateBR(s.performedAt)}</span>
                      <span>{formatMoney(s.priceCents)}</span>
                    </>
                  }
                />
              ))}
            </DataList>
          ))}

        {tab === 'files' && <AttachmentsPanel patientId={id} attachments={p.attachments ?? []} onChanged={refresh} />}

        {tab === 'messages' && (
          <section aria-label="Conversa com a paciente">
            <p className="form-section-title">Conversa no portal</p>
            {!p.messages?.length ? (
              <p className="hint">Ainda não há mensagens nesta conversa.</p>
            ) : (
              <div className="timeline" aria-live="polite">
                {[...p.messages].reverse().map((message: { id: string; sender: string; body: string; createdAt: string }) => (
                  <article className="timeline-item" key={message.id}>
                    <div className="timeline-head">
                      <strong>{message.sender === 'PATIENT' ? 'Paciente' : 'Equipe'}</strong>
                      <span className="timeline-date">{formatDateBR(message.createdAt)}</span>
                    </div>
                    <p className="timeline-body" style={{ whiteSpace: 'pre-wrap' }}>{message.body}</p>
                  </article>
                ))}
              </div>
            )}
            {pode('PATIENT_WRITE') && (
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (reply.trim() && !sendReply.isPending) sendReply.mutate(reply.trim())
                }}
              >
                <label htmlFor="patient-reply">Responder à paciente</label>
                <textarea
                  id="patient-reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Escreva uma orientação ou resposta para o portal da paciente"
                />
                {sendReply.isError && <p className="error" role="alert">{errorMessage(sendReply.error)}</p>}
                <button className="primary" type="submit" disabled={!reply.trim() || sendReply.isPending}>
                  <MessageCircle size={15} aria-hidden="true" />
                  {sendReply.isPending ? 'Enviando...' : 'Enviar resposta'}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </Modal>
  )
}
