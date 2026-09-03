import React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Bell,
  CalendarDays,
  Download,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  Paperclip,
} from 'lucide-react'
import {
  enablePushNotifications,
  fetchAttachmentUrl,
  getErrorMessage,
  type Appointment,
  type Attachment,
  type DashboardData,
  type Message,
  type Notification,
  type Prescription,
  type Session,
} from '@/lib/api'
import {
  appointmentStatus,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatRelative,
  prescriptionStatus,
} from '@/lib/format'
import { EmptyState, Feedback, ItemRow, Panel, StatusChip } from './ui'

export function AppointmentsList({ appointments }: { appointments: Appointment[] }) {
  if (!appointments.length) {
    return (
      <Panel title="Consultas" icon={CalendarDays}>
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma consulta ainda"
          description="Quando você solicitar um horário, ele aparecerá aqui com data e status."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Consultas" icon={CalendarDays}>
      <div>
        {appointments.map((appointment) => {
          const status = appointmentStatus(appointment.status)
          const when = formatDateTime(appointment.scheduledAt)
          return (
            <ItemRow
              key={appointment.id}
              title={appointment.procedure?.title ?? 'Consulta de avaliação'}
              trailing={<StatusChip label={status.label} tone={status.tone} />}
              meta={when ?? `Solicitada em ${formatDate(appointment.createdAt)} · aguardando data`}
              description={appointment.message}
            />
          )
        })}
      </div>
    </Panel>
  )
}

export function SessionsList({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) {
    return (
      <Panel title="Procedimentos realizados" icon={Heart}>
        <EmptyState
          icon={Heart}
          title="Seu histórico começa aqui"
          description="Cada procedimento realizado ficará registrado com data e observações."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Procedimentos realizados" icon={Heart}>
      <div>
        {sessions.map((session) => (
          <ItemRow
            key={session.id}
            title={session.procedure?.title ?? 'Procedimento'}
            meta={`${formatDate(session.performedAt)} · ${formatRelative(session.performedAt)}`}
            description={session.notes}
          />
        ))}
      </div>
    </Panel>
  )
}

const DOCUMENT_TITLES: Record<string, string> = {
  PRESCRIPTION: 'Receitas',
  EXAM_REQUEST: 'Solicitações de exame',
  GUIDANCE: 'Orientações',
  CERTIFICATE: 'Atestados',
}

/** Uma linha por medicamento: a paciente lê posologia sem decifrar texto corrido. */
function DocumentItems({ items }: { items: Prescription['items'] }) {
  if (!items?.length) return null
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="pl-3 border-l-2 border-accent/40">
          <p className="text-sm font-medium text-foreground">
            {[item.name, item.strength, item.form].filter(Boolean).join(' ')}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
            {[
              item.quantity && `Quantidade: ${item.quantity}`,
              item.dose && `Como tomar: ${item.dose}`,
              item.route && `Via: ${item.route}`,
              item.notes,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function PrescriptionsList({ prescriptions }: { prescriptions: Prescription[] }) {
  if (!prescriptions.length) {
    return (
      <Panel title="Receitas e orientações" icon={FileText}>
        <EmptyState
          icon={FileText}
          title="Nenhum documento no momento"
          description="Receitas, pedidos de exame e orientações da Dra. Marcela aparecerão aqui, prontos para consultar quando precisar."
        />
      </Panel>
    )
  }

  // Agrupa por tipo para a paciente achar o que procura
  const groups = new Map<string, Prescription[]>()
  for (const doc of prescriptions) {
    const key = doc.kind ?? 'PRESCRIPTION'
    const list = groups.get(key)
    if (list) list.push(doc)
    else groups.set(key, [doc])
  }

  return (
    <>
      {[...groups.entries()].map(([kind, docs]) => (
        <Panel key={kind} title={DOCUMENT_TITLES[kind] ?? 'Documentos'} icon={FileText}>
          <div>
            {docs.map((doc) => {
              const status = prescriptionStatus(doc.status)
              const expired = doc.validUntil ? new Date(doc.validUntil) < new Date() : false
              return (
                <div key={doc.id} className="px-5 sm:px-6 py-4 border-b border-border last:border-b-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="text-[0.95rem] font-medium text-foreground">{doc.title}</p>
                    <StatusChip label={status.label} tone={status.tone} />
                    {expired && <StatusChip label="Vencida" tone="neutral" />}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(doc.sentAt ?? doc.createdAt)}
                    {doc.validUntil && !expired && ` · válida até ${formatDate(doc.validUntil)}`}
                  </p>

                  <DocumentItems items={doc.items} />

                  {doc.instructions && (
                    <p className="mt-3 text-sm text-foreground/70 leading-relaxed whitespace-pre-line">
                      {doc.instructions}
                    </p>
                  )}

                  {doc.verificationCode && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Código de verificação:{' '}
                      <span className="font-medium text-foreground">{doc.verificationCode}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>
      ))}
    </>
  )
}

export function AttachmentsList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) {
    return (
      <Panel title="Arquivos e fotos" icon={Paperclip}>
        <EmptyState
          icon={Paperclip}
          title="Nenhum arquivo compartilhado"
          description="Fotos de acompanhamento e documentos enviados pela equipe ficarão disponíveis aqui."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Arquivos e fotos" icon={Paperclip}>
      <div>
        {attachments.map((attachment) => (
          <AttachmentRow key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </Panel>
  )
}

/**
 * Uma linha de arquivo.
 *
 * O download não é um link direto: arquivo clínico fica em bucket privado, e o
 * endereço que abre precisa ser assinado na hora pela API. Por isso a linha
 * busca o link ao ser tocada e só então abre.
 */
function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const [error, setError] = React.useState<string | null>(null)

  const open = useMutation({
    mutationFn: () => fetchAttachmentUrl(attachment.id),
    onMutate: () => setError(null),
    onSuccess: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    onError: (err) => setError(getErrorMessage(err, 'Não foi possível abrir o arquivo.')),
  })

  const size = formatFileSize(attachment.sizeBytes)

  return (
    <ItemRow
      onClick={() => open.mutate()}
      disabled={open.isPending}
      title={attachment.fileName}
      meta={error ?? [formatDate(attachment.createdAt), size].filter(Boolean).join(' · ')}
      trailing={
        open.isPending ? (
          <Loader2 size={15} className="text-accent shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Download size={15} className="text-accent shrink-0" aria-hidden="true" />
        )
      }
    />
  )
}

export function MessagesList({ messages }: { messages: Message[] }) {
  if (!messages.length) {
    return (
      <Panel title="Canal direto" icon={MessageCircle}>
        <EmptyState
          icon={MessageCircle}
          title="Nenhuma mensagem ainda"
          description="Use o formulário de atendimento para falar diretamente com a equipe."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Canal direto" icon={MessageCircle}>
      <div className="panel-pad space-y-3">
        {messages.map((message) => {
          const isPatient = message.sender === 'PATIENT'
          return (
            <div
              key={message.id}
              className={`flex flex-col max-w-[85%] ${isPatient ? 'ml-auto items-end' : 'items-start'}`}
            >
              <div
                className={`px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-line ${
                  isPatient
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-secondary text-foreground rounded-bl-sm'
                }`}
              >
                {message.body}
              </div>
              <span className="mt-1 text-[0.7rem] text-muted-foreground">
                {isPatient ? 'Você' : 'Equipe'} · {formatRelative(message.createdAt)}
              </span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  const [feedback, setFeedback] = React.useState('')
  const push = useMutation({
    mutationFn: enablePushNotifications,
    onSuccess: () => setFeedback('Pronto! Você receberá lembretes das suas consultas.'),
  })

  return (
    <Panel
      title="Lembretes"
      icon={Bell}
      action={
        <button
          onClick={() => {
            setFeedback('')
            push.mutate()
          }}
          className="btn-ghost h-9 px-3 text-xs"
          disabled={push.isPending}
        >
          {push.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
          Ativar
        </button>
      }
    >
      {(push.isError || feedback) && (
        <div className="px-5 sm:px-6 pt-4">
          {push.isError && <Feedback tone="error">{getErrorMessage(push.error)}</Feedback>}
          {feedback && <Feedback tone="success">{feedback}</Feedback>}
        </div>
      )}

      {notifications.length ? (
        <div>
          {notifications.map((notification) => (
            <ItemRow
              key={notification.id}
              title={notification.title}
              meta={formatRelative(notification.createdAt)}
              description={notification.body}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum lembrete por enquanto"
          description="Ative os lembretes para ser avisada sobre suas próximas consultas."
        />
      )}
    </Panel>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando seus dados">
      <div className="h-44 rounded-lg bg-secondary animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-secondary animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-secondary animate-pulse" />
    </div>
  )
}

export type { DashboardData }
