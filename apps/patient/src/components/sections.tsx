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

export function PrescriptionsList({ prescriptions }: { prescriptions: Prescription[] }) {
  if (!prescriptions.length) {
    return (
      <Panel title="Prescrições e orientações" icon={FileText}>
        <EmptyState
          icon={FileText}
          title="Nenhuma prescrição no momento"
          description="Receitas e orientações da Dra. Marcela aparecerão aqui, prontas para consultar quando precisar."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Prescrições e orientações" icon={FileText}>
      <div>
        {prescriptions.map((prescription) => {
          const status = prescriptionStatus(prescription.status)
          return (
            <ItemRow
              key={prescription.id}
              title={prescription.title}
              trailing={<StatusChip label={status.label} tone={status.tone} />}
              meta={formatDate(prescription.sentAt ?? prescription.createdAt)}
              description={prescription.instructions}
            />
          )
        })}
      </div>
    </Panel>
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
        {attachments.map((attachment) => {
          const size = formatFileSize(attachment.sizeBytes)
          return (
            <ItemRow
              key={attachment.id}
              href={attachment.url}
              title={attachment.fileName}
              meta={[formatDate(attachment.createdAt), size].filter(Boolean).join(' · ')}
              trailing={<Download size={15} className="text-accent shrink-0" aria-hidden="true" />}
            />
          )
        })}
      </div>
    </Panel>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-secondary animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-secondary animate-pulse" />
    </div>
  )
}

export type { DashboardData }
