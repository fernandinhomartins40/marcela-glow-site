import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Check, Clock, Loader2, Plus, Trash2 } from 'lucide-react'
import { clinicDate, clinicTime, fromDateTimeLocalValue } from '../lib/schedule'
import { api, errorMessage, tenantSlug } from '../lib/ui'

const WEEKDAYS = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
]

interface BusinessHour {
  id?: string
  weekday: number
  startTime: string
  endTime: string
  isActive?: boolean
}

interface ScheduleBlock {
  id: string
  startsAt: string
  endsAt: string
  reason: string | null
}

interface Procedure {
  id: string
  title: string
  durationMin: number
  bufferMin: number
  isBookable: boolean
}

export function ScheduleSettings() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <BusinessHours />
      <Durations />
      <Blocks />
    </div>
  )
}

/** Uma faixa por dia é o caso comum; dias fechados ficam desmarcados. */
function BusinessHours() {
  const client = useQueryClient()
  const [rows, setRows] = React.useState<Record<number, { open: boolean; start: string; end: string }>>({})
  const [saved, setSaved] = React.useState(false)

  const query = useQuery({
    queryKey: ['business-hours'],
    queryFn: async () => (await api.get('/admin/business-hours')).data as BusinessHour[],
  })

  // Preenche o formulário quando os dados chegam
  React.useEffect(() => {
    if (!query.data) return
    const next: Record<number, { open: boolean; start: string; end: string }> = {}
    for (const day of WEEKDAYS) {
      const found = query.data.find((h) => h.weekday === day.id && h.isActive !== false)
      next[day.id] = found
        ? { open: true, start: found.startTime, end: found.endTime }
        : { open: false, start: '09:00', end: '18:00' }
    }
    setRows(next)
  }, [query.data])

  const save = useMutation({
    mutationFn: async () => {
      const hours = WEEKDAYS.filter((d) => rows[d.id]?.open).map((d) => ({
        weekday: d.id,
        startTime: rows[d.id].start,
        endTime: rows[d.id].end,
        isActive: true,
      }))
      await api.put('/admin/business-hours', { hours })
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      client.invalidateQueries({ queryKey: ['business-hours'] })
      client.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  function update(weekday: number, patch: Partial<{ open: boolean; start: string; end: string }>) {
    setRows((prev) => ({ ...prev, [weekday]: { ...prev[weekday], ...patch } }))
    setSaved(false)
  }

  const invalid = WEEKDAYS.some((d) => rows[d.id]?.open && rows[d.id].start >= rows[d.id].end)

  return (
    <section className="list">
      <h2>Expediente da clínica</h2>
      <p className="hint" style={{ marginBottom: 14 }}>
        Define quais horários ficam disponíveis para as pacientes agendarem.
        Dias desmarcados não aparecem no site.
      </p>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : (
        <div className="hours-grid">
          {WEEKDAYS.map((day) => {
            const row = rows[day.id] ?? { open: false, start: '09:00', end: '18:00' }
            const bad = row.open && row.start >= row.end
            return (
              <div key={day.id} className={`hours-row ${row.open ? '' : 'closed'}`}>
                <label className="hours-toggle">
                  <input
                    type="checkbox"
                    checked={row.open}
                    onChange={(e) => update(day.id, { open: e.target.checked })}
                  />
                  <span>{day.label}</span>
                </label>
                {row.open ? (
                  <div className="hours-times">
                    <input
                      type="time"
                      value={row.start}
                      onChange={(e) => update(day.id, { start: e.target.value })}
                      aria-label={`Início ${day.label}`}
                    />
                    <span className="hours-sep">até</span>
                    <input
                      type="time"
                      value={row.end}
                      onChange={(e) => update(day.id, { end: e.target.value })}
                      aria-label={`Término ${day.label}`}
                    />
                    {bad && <span className="hours-error">término deve ser depois do início</span>}
                  </div>
                ) : (
                  <span className="hours-closed">Fechado</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {save.isError && <p className="error">{errorMessage(save.error, 'Não foi possível salvar.')}</p>}

      <div className="row-actions" style={{ marginTop: 14 }}>
        <button onClick={() => save.mutate()} disabled={save.isPending || invalid}>
          {save.isPending ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
          Salvar expediente
        </button>
        {saved && <span className="saved-flag"><Check size={13} /> Salvo</span>}
      </div>
    </section>
  )
}

/** A duração define de quanto em quanto tempo os horários são oferecidos. */
function Durations() {
  const client = useQueryClient()
  const [draft, setDraft] = React.useState<Record<string, { durationMin: number; bufferMin: number; isBookable: boolean }>>({})
  const [savedId, setSavedId] = React.useState<string | null>(null)

  const query = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () =>
      (await api.get('/procedures', { params: { tenantSlug } })).data as Procedure[],
  })

  React.useEffect(() => {
    if (!query.data) return
    const next: Record<string, { durationMin: number; bufferMin: number; isBookable: boolean }> = {}
    for (const procedure of query.data) {
      next[procedure.id] = {
        durationMin: procedure.durationMin ?? 60,
        bufferMin: procedure.bufferMin ?? 0,
        isBookable: procedure.isBookable ?? true,
      }
    }
    setDraft(next)
  }, [query.data])

  const save = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/procedures/${id}`, draft[id])
      return id
    },
    onSuccess: (id) => {
      setSavedId(id)
      setTimeout(() => setSavedId((v) => (v === id ? null : v)), 3000)
      client.invalidateQueries({ queryKey: ['procedures-admin'] })
    },
  })

  function update(id: string, patch: Partial<{ durationMin: number; bufferMin: number; isBookable: boolean }>) {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    setSavedId(null)
  }

  return (
    <section className="list">
      <h2>Duração dos procedimentos</h2>
      <p className="hint" style={{ marginBottom: 14 }}>
        Quanto tempo cada atendimento ocupa na agenda. O intervalo é somado
        depois, para preparo e limpeza da sala.
      </p>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !query.data?.length ? (
        <p className="hint">Nenhum procedimento cadastrado.</p>
      ) : (
        <div className="duration-grid">
          <div className="duration-head">
            <span>Procedimento</span>
            <span>Duração</span>
            <span>Intervalo</span>
            <span>Agendável</span>
            <span />
          </div>
          {query.data.map((procedure) => {
            const row = draft[procedure.id]
            if (!row) return null
            const total = row.durationMin + row.bufferMin
            return (
              <div key={procedure.id} className="duration-row">
                <div className="duration-name">
                  <strong>{procedure.title}</strong>
                  <span>ocupa {total} min na agenda</span>
                </div>
                <div className="duration-field">
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={row.durationMin}
                    onChange={(e) => update(procedure.id, { durationMin: Number(e.target.value) })}
                    aria-label={`Duração de ${procedure.title}`}
                  />
                  <span>min</span>
                </div>
                <div className="duration-field">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    step={5}
                    value={row.bufferMin}
                    onChange={(e) => update(procedure.id, { bufferMin: Number(e.target.value) })}
                    aria-label={`Intervalo de ${procedure.title}`}
                  />
                  <span>min</span>
                </div>
                <label className="duration-toggle">
                  <input
                    type="checkbox"
                    checked={row.isBookable}
                    onChange={(e) => update(procedure.id, { isBookable: e.target.checked })}
                  />
                  <span className="sr-only">Disponível para agendamento online</span>
                </label>
                <button
                  onClick={() => save.mutate(procedure.id)}
                  disabled={save.isPending}
                  className="duration-save"
                >
                  {savedId === procedure.id ? <Check size={14} /> : 'Salvar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {save.isError && <p className="error">{errorMessage(save.error, 'Não foi possível salvar.')}</p>}
    </section>
  )
}

/** Períodos em que a agenda fica indisponível: férias, feriados, compromissos. */
function Blocks() {
  const client = useQueryClient()
  const [startsAt, setStartsAt] = React.useState('')
  const [endsAt, setEndsAt] = React.useState('')
  const [reason, setReason] = React.useState('')

  const query = useQuery({
    queryKey: ['schedule-blocks'],
    queryFn: async () => (await api.get('/admin/schedule-blocks')).data as ScheduleBlock[],
  })

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/admin/schedule-blocks', {
        startsAt: fromDateTimeLocalValue(startsAt),
        endsAt: fromDateTimeLocalValue(endsAt),
        reason: reason || undefined,
      })
    },
    onSuccess: () => {
      setStartsAt('')
      setEndsAt('')
      setReason('')
      client.invalidateQueries({ queryKey: ['schedule-blocks'] })
      client.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/schedule-blocks/${id}`)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['schedule-blocks'] })
      client.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const canCreate = startsAt && endsAt && startsAt < endsAt

  return (
    <section className="list">
      <h2>Bloqueios de agenda</h2>
      <p className="hint" style={{ marginBottom: 14 }}>
        Férias, feriados, almoço ou compromissos. Durante o bloqueio nenhum
        horário é oferecido às pacientes.
      </p>

      <div className="block-form">
        <label>
          Início
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label>
          Término
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <label>
          Motivo (opcional)
          <input placeholder="Ex.: feriado" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <button onClick={() => create.mutate()} disabled={!canCreate || create.isPending}>
          {create.isPending ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
          Bloquear
        </button>
      </div>

      {startsAt && endsAt && startsAt >= endsAt && (
        <p className="error">O término deve ser depois do início.</p>
      )}
      {create.isError && <p className="error">{errorMessage(create.error, 'Não foi possível salvar.')}</p>}

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !query.data?.length ? (
        <div className="block-empty">
          <CalendarOff size={18} />
          <p>Nenhum bloqueio cadastrado.</p>
        </div>
      ) : (
        <ul className="block-list">
          {query.data.map((block) => (
            <li key={block.id}>
              <span className="block-when">
                <Clock size={13} />
                {clinicDate(block.startsAt)} · {clinicTime(block.startsAt)} — {clinicDate(block.endsAt)} · {clinicTime(block.endsAt)}
              </span>
              <span className="block-reason">{block.reason || 'Sem motivo informado'}</span>
              <button
                onClick={() => remove.mutate(block.id)}
                disabled={remove.isPending}
                className="block-remove"
                aria-label="Remover bloqueio"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
