import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Phone,
  Plus,
} from 'lucide-react'
import { NewAppointment } from './NewAppointment'
import { addDays } from 'date-fns'
import {
  clinicDate,
  clinicTime,
  dateKey,
  distribuirColunas,
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
import { api, Chip, errorMessage } from '../lib/ui'

export function Schedule({ appointments }: { appointments: Appointment[] }) {
  /* `?dia=2026-09-12` abre a agenda no dia pedido.
   *
   * Quem chega aqui pela recepção está olhando um dia específico — o que está
   * confirmando, o que quer remarcar. Sem isto o atalho jogava a pessoa na
   * semana corrente e ela tinha que navegar de volta. */
  const [searchParams] = useSearchParams()
  const diaPedido = React.useMemo(() => {
    const bruto = searchParams.get('dia')
    if (!bruto) return null
    const [ano, mes, dia] = bruto.split('-').map(Number)
    if (!ano || !mes || !dia) return null
    const d = new Date(ano, mes - 1, dia)
    return Number.isNaN(d.getTime()) ? null : d
  }, [searchParams])

  const [anchor, setAnchor] = React.useState(diaPedido ?? new Date())
  const [selectedDay, setSelectedDay] = React.useState<Date>(diaPedido ?? new Date())
  const [detail, setDetail] = React.useState<Appointment | null>(null)
  const [creating, setCreating] = React.useState(false)

  const days = weekDays(anchor)

  /* O dia aberto tem de estar sempre dentro da semana a vista.

     A semana vai de segunda a sabado, entao num domingo — ou depois de mudar
     de semana pelas setas — o dia selecionado ficava fora dela. No desktop isso
     passava despercebido porque as seis colunas apareciam de qualquer forma; no
     celular, que desenha so a coluna selecionada, a grade ficava vazia. */
  const diaVisivel = days.some((d) => dateKey(d) === dateKey(selectedDay))
    ? selectedDay
    : days[0]
  const byDay = React.useMemo(() => groupByDay(appointments), [appointments])
  const pending = React.useMemo(() => pendingQueue(appointments), [appointments])
  const dayAppointments = byDay.get(dateKey(diaVisivel)) ?? []

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
          <div className="toolbar-right">
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
            <button className="primary" onClick={() => setCreating(true)}>
              <Plus size={15} />
              Novo agendamento
            </button>
          </div>
        </header>

        <WeekGrid
          days={days}
          byDay={byDay}
          selectedDay={diaVisivel}
          onSelectDay={setSelectedDay}
          onSelectAppointment={setDetail}
        />

        <DayList
          day={diaVisivel}
          appointments={dayAppointments}
          onSelectAppointment={setDetail}
        />
      </section>

      {detail && <AppointmentDrawer appointment={detail} onClose={() => setDetail(null)} />}

      {creating && (
        <NewAppointment
          // Abre já no dia que está selecionado na grade, às 9h
          defaultDate={`${dateKey(selectedDay)}T09:00`}
          onClose={() => setCreating(false)}
          onCreated={() => undefined}
        />
      )}
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
      {/* Cabeçalho e corpo dividem o MESMO container de rolagem: em telas
          estreitas os dias rolam juntos e a coluna continua sob o seu dia. */}
      <div className="week-scroll">
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
              /* A coluna do dia escolhido se marca: no celular so ela aparece, e
                 sem a marca o CSS nao teria como saber qual manter. */
              <div
                key={day.toISOString()}
                className={`day-col${dateKey(day) === dateKey(selectedDay) ? ' is-dia' : ''}`}
              >
                {GRID_HOURS.map((hour) => (
                  <div key={hour} className="hour-slot" />
                ))}

                {distribuirColunas(items).map(({ appointment, coluna, colunas }) => {
                  const startMin = minutesFromMidnight(appointment.scheduledAt!)
                  const endMin = appointment.endsAt
                    ? minutesFromMidnight(appointment.endsAt)
                    : startMin + 60
                  const top = ((startMin - GRID_START_HOUR * 60) / totalMinutes) * 100
                  const height = ((endMin - startMin) / totalMinutes) * 100
                  if (top < 0 || top > 100) return null

                  /* Consultas que se cruzam dividem a largura da coluna. Antes
                     todas ocupavam a faixa inteira e a segunda cobria a
                     primeira: dois nomes impressos um sobre o outro, ilegíveis
                     e sem indicar que havia duas. */
                  const largura = 100 / colunas
                  const esquerda = largura * coluna

                  return (
                    <button
                      key={appointment.id}
                      className={`event ${statusMeta(appointment.status).tone}`}
                      /* A altura desconta 3px para duas consultas seguidas nao
                         se encostarem. Vai aqui e nao no CSS porque `margin`
                         nao vale em `position: absolute` e uma borda
                         transparente ocuparia espaco dentro da propria caixa —
                         as duas tentativas anteriores. Descontando na altura, o
                         topo fica no lugar e o evento segue alinhado com a sua
                         faixa de horario. */
                      style={{
                        top: `${top}%`,
                        height: `calc(${Math.max(height, 4)}% - 3px)`,
                        left: `calc(${esquerda}% + 2px)`,
                        width: `calc(${largura}% - 4px)`,
                      }}
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
  // Cancelada não é atendimento do dia: sai da lista, mas continua acessível
  const active = appointments.filter((a) => a.status !== 'CANCELLED')
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED')

  return (
    <section className="day-list">
      <h3>{fullDayLabel(day)}</h3>
      {active.length === 0 ? (
        <p className="queue-empty">Nenhum atendimento neste dia.</p>
      ) : (
        <ul>
          {active.map((appointment) => {
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
                  <Chip tone={meta.tone}>{meta.label}</Chip>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {cancelled.length > 0 && (
        <details className="cancelled-list">
          <summary>
            {cancelled.length} cancelada{cancelled.length > 1 ? 's' : ''} neste dia
          </summary>
          <ul>
            {cancelled.map((appointment) => (
              <li key={appointment.id}>
                <button onClick={() => onSelectAppointment(appointment)}>
                  <span className="slot-time">{clinicTime(appointment.scheduledAt)}</span>
                  <span className="slot-body">
                    <strong>{appointment.name}</strong>
                    <span>{appointment.cancelReason ?? 'Sem motivo registrado'}</span>
                  </span>
                  <Chip>Cancelada</Chip>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

/* Exportado para a Recepcao: e ali que a secretaria descobre o conflito, e
   remarcar sem sair da tela e a saida que faltava. */
export function AppointmentDrawer({
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

  // Pedido da landing sem cadastro correspondente: sem isso o atendimento não abre
  const linkPatient = useMutation({
    mutationFn: () => api.post(`/appointments/${appointment.id}/link-patient`, {}),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['patients'] })
      refresh()
    },
  })

  /** Abre o WhatsApp e marca que a paciente foi avisada. */
  function openWhatsApp(link: WhatsAppLink) {
    if (!link.url) return
    window.open(link.url, '_blank', 'noopener')
    api.post(`/appointments/${appointment.id}/notified`).then(refresh).catch(() => undefined)
  }

  const busy = confirm.isPending || cancel.isPending

  // Esc volta para a agenda, como em qualquer página aberta por cima
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // A página de fundo não rola enquanto esta está aberta
  React.useEffect(() => {
    document.body.classList.add('page-lock')
    return () => document.body.classList.remove('page-lock')
  }, [])

  return (
    <div className="drawer page-view" role="dialog" aria-modal="true" aria-label={`Consulta de ${appointment.name}`}>
      <header className="page-view-bar">
        <button className="page-back" onClick={onClose} aria-label="Voltar">
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="page-view-heading">
          <Chip tone={meta.tone}>{meta.label}</Chip>
          <h2>{appointment.name}</h2>
          <p>{appointment.procedure?.title ?? 'Consulta de avaliação'}</p>
        </div>
      </header>

      <div className="drawer-body page-view-body">
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

        {!appointment.patient && appointment.status !== 'CANCELLED' && (
          <section className="drawer-section warn-box">
            <p>
              Este pedido não tem cadastro de paciente. Sem o cadastro não é possível
              abrir o atendimento nem registrar o prontuário.
            </p>
            <button
              className="primary"
              onClick={() => linkPatient.mutate()}
              disabled={linkPatient.isPending}
            >
              {linkPatient.isPending ? 'Cadastrando...' : 'Cadastrar e vincular paciente'}
            </button>
            {linkPatient.isError && <p className="error">{errorMessage(linkPatient.error)}</p>}
          </section>
        )}

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
                  aria-label="Motivo do cancelamento (opcional)"
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
      </div>
    </div>
  )
}
