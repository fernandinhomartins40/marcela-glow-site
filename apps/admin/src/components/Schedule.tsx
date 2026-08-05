import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react'
import { addDays } from 'date-fns'
import {
  clinicDate,
  clinicTime,
  dateKey,
  dayLabel,
  fullDayLabel,
  fromDateTimeLocalValue,
  GRID_END_HOUR,
  GRID_HOURS,
  GRID_START_HOUR,
  groupByDay,
  isToday,
  minutesFromMidnight,
  pendingQueue,
  statusMeta,
  toDateTimeLocalValue,
  weekDays,
  weekRangeLabel,
  type Appointment,
  type WhatsAppLink,
} from '../lib/schedule'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function errorMessage(error: unknown, fallback = 'Não foi possível concluir.') {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}

export function Schedule({ appointments }: { appointments: Appointment[] }) {
  const [anchor, setAnchor] = React.useState(new Date())
  const [selectedDay, setSelectedDay] = React.useState<Date>(new Date())
  const [detail, setDetail] = React.useState<Appointment | null>(null)

  const days = weekDays(anchor)
  const byDay = React.useMemo(() => groupByDay(appointments), [appointments])
  const pending = React.useMemo(() => pendingQueue(appointments), [appointments])
  const dayAppointments = byDay.get(dateKey(selectedDay)) ?? []

  return (
    <div className="schedule">
      <aside className="schedule-queue">
        <header>
          <h2>Solicitações</h2>
          <span className="queue-count">{pending.length}</span>
        </header>
        {pending.length === 0 ? (
          <p className="queue-empty">Nenhuma solicitação aguardando.</p>
        ) : (
          <ul>
            {pending.map((appointment) => (
              <li key={appointment.id}>
                <button className="queue-card" onClick={() => setDetail(appointment)}>
                  <strong>{appointment.name}</strong>
                  <span>{appointment.procedure?.title ?? 'Consulta de avaliação'}</span>
                  <span className="queue-when">
                    {appointment.scheduledAt ? (
                      <>
                        <Clock size={13} />
                        {clinicDate(appointment.scheduledAt)} · {clinicTime(appointment.scheduledAt)}
                      </>
                    ) : (
                      'Sem horário definido'
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="schedule-main">
        <header className="schedule-toolbar">
          <div className="week-nav">
            <button onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Semana anterior">
              <ChevronLeft size={16} />
            </button>
            <strong>{weekRangeLabel(days)}</strong>
            <button onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Próxima semana">
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            className="today-button"
            onClick={() => {
              const now = new Date()
              setAnchor(now)
              setSelectedDay(now)
            }}
          >
            Hoje
          </button>
        </header>

        <WeekGrid
          days={days}
          byDay={byDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onSelectAppointment={setDetail}
        />

        <DayList
          day={selectedDay}
          appointments={dayAppointments}
          onSelectAppointment={setDetail}
        />
      </section>

      {detail && <AppointmentDrawer appointment={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function WeekGrid({
  days,
  byDay,
  selectedDay,
  onSelectDay,
  onSelectAppointment,
}: {
  days: Date[]
  byDay: Map<string, Appointment[]>
  selectedDay: Date
  onSelectDay: (date: Date) => void
  onSelectAppointment: (appointment: Appointment) => void
}) {
  const totalMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60

  return (
    <div className="week-grid">
      <div className="week-head">
        <div className="hour-col" />
        {days.map((day) => (
          <button
            key={day.toISOString()}
            className={`day-head ${dateKey(day) === dateKey(selectedDay) ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
            onClick={() => onSelectDay(day)}
          >
            <span>{dayLabel(day)}</span>
            <strong>{day.getDate()}</strong>
          </button>
        ))}
      </div>

      <div className="week-body">
        <div className="hour-col">
          {GRID_HOURS.map((hour) => (
            <div key={hour} className="hour-mark">
              <span>{String(hour).padStart(2, '0')}h</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const items = (byDay.get(dateKey(day)) ?? []).filter((a) => a.status !== 'CANCELLED')
          return (
            <div key={day.toISOString()} className="day-col">
              {GRID_HOURS.map((hour) => (
                <div key={hour} className="hour-slot" />
              ))}

              {items.map((appointment) => {
                const startMin = minutesFromMidnight(appointment.scheduledAt!)
                const endMin = appointment.endsAt
                  ? minutesFromMidnight(appointment.endsAt)
                  : startMin + 60
                const top = ((startMin - GRID_START_HOUR * 60) / totalMinutes) * 100
                const height = ((endMin - startMin) / totalMinutes) * 100
                if (top < 0 || top > 100) return null

                return (
                  <button
                    key={appointment.id}
                    className={`event ${statusMeta(appointment.status).tone}`}
                    style={{ top: `${top}%`, height: `${Math.max(height, 4)}%` }}
                    onClick={() => onSelectAppointment(appointment)}
                    title={`${clinicTime(appointment.scheduledAt)} · ${appointment.name}`}
                  >
                    <strong>{clinicTime(appointment.scheduledAt)}</strong>
                    <span>{appointment.name}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayList({
  day,
  appointments,
  onSelectAppointment,
}: {
  day: Date
  appointments: Appointment[]
  onSelectAppointment: (appointment: Appointment) => void
}) {
  return (
    <section className="day-list">
      <h3>{fullDayLabel(day)}</h3>
      {appointments.length === 0 ? (
        <p className="queue-empty">Nenhum atendimento neste dia.</p>
      ) : (
        <ul>
          {appointments.map((appointment) => {
            const meta = statusMeta(appointment.status)
            return (
              <li key={appointment.id}>
                <button onClick={() => onSelectAppointment(appointment)}>
                  <span className="slot-time">
                    {clinicTime(appointment.scheduledAt)}
                    {appointment.endsAt && <small>{clinicTime(appointment.endsAt)}</small>}
                  </span>
                  <span className="slot-body">
                    <strong>{appointment.name}</strong>
                    <span>{appointment.procedure?.title ?? 'Consulta de avaliação'}</span>
                  </span>
                  <span className={`chip ${meta.tone}`}>{meta.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function AppointmentDrawer({
  appointment,
  onClose,
}: {
  appointment: Appointment
  onClose: () => void
}) {
  const client = useQueryClient()
  const [scheduledAt, setScheduledAt] = React.useState(toDateTimeLocalValue(appointment.scheduledAt))
  const [cancelReason, setCancelReason] = React.useState('')
  const [showCancel, setShowCancel] = React.useState(false)
  const [whatsapp, setWhatsapp] = React.useState<WhatsAppLink | null>(null)

  const meta = statusMeta(appointment.status)

  const refresh = () => client.invalidateQueries({ queryKey: ['admin'] })

  const confirm = useMutation({
    mutationFn: async () => {
      const iso = fromDateTimeLocalValue(scheduledAt)
      const { data } = await api.post(`/appointments/${appointment.id}/confirm`, {
        ...(iso ? { scheduledAt: iso } : {}),
      })
      return data as { appointment: Appointment; whatsapp: WhatsAppLink }
    },
    onSuccess: (data) => {
      setWhatsapp(data.whatsapp)
      refresh()
    },
  })

  const cancel = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/appointments/${appointment.id}/cancel`, {
        reason: cancelReason || undefined,
      })
      return data as { appointment: Appointment; whatsapp: WhatsAppLink }
    },
    onSuccess: (data) => {
      setWhatsapp(data.whatsapp)
      setShowCancel(false)
      refresh()
    },
  })

  const reminder = useMutation({
    mutationFn: async () => {
      const { data } = await api.get(`/appointments/${appointment.id}/whatsapp`, {
        params: { kind: 'reminder' },
      })
      return data as WhatsAppLink
    },
    onSuccess: (data) => setWhatsapp(data),
  })

  /** Abre o WhatsApp e marca que a paciente foi avisada. */
  function openWhatsApp(link: WhatsAppLink) {
    if (!link.url) return
    window.open(link.url, '_blank', 'noopener')
    api.post(`/appointments/${appointment.id}/notified`).then(refresh).catch(() => undefined)
  }

  const busy = confirm.isPending || cancel.isPending

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span className={`chip ${meta.tone}`}>{meta.label}</span>
            <h2>{appointment.name}</h2>
            <p>{appointment.procedure?.title ?? 'Consulta de avaliação'}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <dl className="drawer-facts">
          <div>
            <dt>Contato</dt>
            <dd>
              <Phone size={13} /> {appointment.phone || 'não informado'}
            </dd>
            <dd>{appointment.email}</dd>
          </div>
          {appointment.scheduledAt && (
            <div>
              <dt>Horário atual</dt>
              <dd>
                {clinicDate(appointment.scheduledAt)} · {clinicTime(appointment.scheduledAt)}
                {appointment.endsAt && ` – ${clinicTime(appointment.endsAt)}`}
              </dd>
            </div>
          )}
          {appointment.confirmedBy && (
            <div>
              <dt>Confirmada por</dt>
              <dd>{appointment.confirmedBy.name}</dd>
            </div>
          )}
          {appointment.notifiedAt && (
            <div>
              <dt>Aviso enviado</dt>
              <dd>{clinicDate(appointment.notifiedAt)} · {clinicTime(appointment.notifiedAt)}</dd>
            </div>
          )}
          {appointment.message && (
            <div className="wide">
              <dt>Observações da paciente</dt>
              <dd>{appointment.message}</dd>
            </div>
          )}
          {appointment.cancelReason && (
            <div className="wide">
              <dt>Motivo do cancelamento</dt>
              <dd>{appointment.cancelReason}</dd>
            </div>
          )}
        </dl>

        {appointment.status !== 'CANCELLED' && (
          <section className="drawer-section">
            <label htmlFor="scheduledAt">Data e horário</label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="hint">
              Ao confirmar, a paciente recebe o aviso no portal e você pode enviar a
              mensagem pelo WhatsApp.
            </p>

            <div className="drawer-actions">
              <button className="primary" onClick={() => confirm.mutate()} disabled={busy || !scheduledAt}>
                <Check size={15} />
                {appointment.status === 'CONFIRMED' ? 'Atualizar e avisar' : 'Confirmar'}
              </button>
              <button onClick={() => reminder.mutate()} disabled={busy || !appointment.scheduledAt}>
                <MessageCircle size={15} />
                Lembrete
              </button>
              <button className="danger" onClick={() => setShowCancel((v) => !v)} disabled={busy}>
                <Ban size={15} />
                Cancelar
              </button>
            </div>

            {showCancel && (
              <div className="cancel-box">
                <input
                  placeholder="Motivo (opcional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <button className="danger" onClick={() => cancel.mutate()} disabled={busy}>
                  Confirmar cancelamento
                </button>
              </div>
            )}
          </section>
        )}

        {(confirm.isError || cancel.isError) && (
          <p className="error">{errorMessage(confirm.error ?? cancel.error)}</p>
        )}

        {whatsapp && (
          <section className="whatsapp-box">
            <h3>Mensagem para a paciente</h3>
            <pre>{whatsapp.message}</pre>
            {whatsapp.url ? (
              <button className="whatsapp-button" onClick={() => openWhatsApp(whatsapp)}>
                <MessageCircle size={15} />
                Abrir no WhatsApp
              </button>
            ) : (
              <p className="hint">{whatsapp.unavailableReason}</p>
            )}
          </section>
        )}
      </aside>
    </div>
  )
}
