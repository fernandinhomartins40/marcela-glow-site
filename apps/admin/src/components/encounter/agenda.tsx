import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, Clock, Plus, Stethoscope, UserRound } from 'lucide-react'
import {
  api,
  Chip,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  FormRow,
  maskPhone,
  Modal,
  PatientSearchSelect,
  type PatientOption,
  SearchBox,
  SubmitButton,
  tenantSlug,
  Toolbar,
} from '../../lib/ui'
import { useDebounced } from '../../lib/useDebounced'
import {
  clinicDateKey,
  clinicTime,
  dateKey,
  fromDateTimeLocalValue,
  fullDayLabel,
  statusMeta,
} from '../../lib/schedule'
import type { Patient } from '../Patients'
import type { AgendaEntry } from './types'

/**
 * Etapa 1 do atendimento: a agenda do dia e a porta de entrada da ficha.
 * Quem chegou pelo site ainda nao tem cadastro, entao daqui tambem se vincula
 * ou se cria a paciente antes de abrir o prontuario.
 */
export function TodayAgenda({ onOpen }: { onOpen: (id: string) => void }) {
  const [date, setDate] = React.useState(() => dateKey(new Date()))
  const [search, setSearch] = React.useState('')
  // A busca vai ao servidor: sem atraso cada tecla vira uma requisição
  const debouncedSearch = useDebounced(search)
  const [creating, setCreating] = React.useState(false)

  const hoje = dateKey(new Date())
  const ehHoje = date === hoje

  const agenda = useQuery({
    queryKey: ['encounter-agenda', date],
    queryFn: async () =>
      (await api.get('/clinical/encounters/agenda', { params: { date } })).data as {
        appointments: AgendaEntry[]
        /** Preenchido só quando o dia está vazio: o próximo compromisso na agenda. */
        next: { id: string; scheduledAt: string; name: string } | null
      },
    /* Quem manda a paciente entrar é a recepção, de outro computador. Sem
       recarregar sozinha, a médica só via a chegada ao trocar de tela — e a
       paciente ficava esperando na sala com o painel dizendo que ela nem
       tinha chegado. Só no dia de hoje: agenda de outro dia não muda sozinha. */
    refetchInterval: ehHoje ? 15_000 : false,
    refetchOnWindowFocus: true,
  })

  // Busca de paciente para quem chegou sem agendamento
  const patients = useQuery({
    queryKey: ['patients', debouncedSearch, false],
    queryFn: async () =>
      (await api.get('/admin/patients', { params: { search: debouncedSearch } })).data as Patient[],
    enabled: debouncedSearch.trim().length >= 2,
  })

  // A API devolve janela ampla em UTC; recorta o dia local aqui
  const entries = (agenda.data?.appointments ?? []).filter(
    (entry) => entry.scheduledAt && clinicDateKey(entry.scheduledAt) === date,
  )
  const next = agenda.data?.next ?? null

  /* A ordem do dia da médica não é o horário marcado — é quem está esperando.
   *
   * Uma lista só por hora mistura quem está sentada na sala com quem talvez nem
   * venha, e a médica tem que adivinhar qual é qual. Estas faixas respondem "de
   * quem é a vez" antes de responder "o que vem depois". */
  const noConsultorio = entries.filter((e) => e.calledAt && !e.releasedAt)
  const aguardando = entries.filter((e) => e.arrivedAt && !e.calledAt)
  const aVir = entries.filter((e) => !e.arrivedAt && !e.releasedAt)
  const encerrados = entries.filter((e) => e.releasedAt)

  const selected = new Date(`${date}T12:00:00`)

  return (
    <>
      <Toolbar>
        <div className="day-picker">
          <button
            onClick={() => {
              const d = new Date(`${date}T12:00:00`)
              d.setDate(d.getDate() - 1)
              setDate(dateKey(d))
            }}
            aria-label="Dia anterior"
          >
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data do atendimento" />
          <button
            onClick={() => {
              const d = new Date(`${date}T12:00:00`)
              d.setDate(d.getDate() + 1)
              setDate(dateKey(d))
            }}
            aria-label="Próximo dia"
          >
            ›
          </button>
          <button className="today-button" onClick={() => setDate(dateKey(new Date()))}>
            Hoje
          </button>
        </div>

        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar paciente sem agendamento"
        />

        <button className="primary" onClick={() => setCreating(true)}>
          <Plus size={15} />
          Novo atendimento
        </button>
      </Toolbar>

      {/* Resultado da busca avulsa */}
      {search.trim().length >= 2 && (
        <section className="list" style={{ marginBottom: 14 }}>
          <h2>Pacientes encontradas</h2>
          {patients.isLoading ? (
            <p className="hint">Buscando...</p>
          ) : !patients.data?.length ? (
            <p className="hint">Nenhuma paciente com esse nome.</p>
          ) : (
            <DataList>
              {patients.data.slice(0, 6).map((p) => (
                <DataRow
                  key={p.id}
                  icon={UserRound}
                  title={p.name}
                  meta={
                    <>
                      <span>{p.email}</span>
                      {p.phone && <span>{p.phone}</span>}
                    </>
                  }
                  actions={<StartEncounterButton patient={p} onStarted={onOpen} />}
                />
              ))}
            </DataList>
          )}
        </section>
      )}

      <h2 className="day-heading">{fullDayLabel(selected)}</h2>

      {agenda.isLoading ? (
        <p className="hint">Carregando agenda...</p>
      ) : !entries.length ? (
        <EmptyState
          title="Nenhum atendimento neste dia"
          description={
            next
              ? `O próximo é ${next.name}, em ${fullDayLabel(new Date(next.scheduledAt))}.`
              : 'Escolha outra data, busque a paciente pelo nome ou abra um novo atendimento.'
          }
          action={
            <>
              {/* Sem isto, a agenda vazia parece sistema quebrado: a medica nao
                  tem como saber se nao ha nada hoje ou se nada carregou. */}
              {next && (
                <button onClick={() => setDate(clinicDateKey(next.scheduledAt))}>
                  <CalendarDays size={15} />
                  Ir para o próximo
                </button>
              )}
              <button className="primary" onClick={() => setCreating(true)}>
                <Plus size={15} />
                Novo atendimento
              </button>
            </>
          }
        />
      ) : ehHoje ? (
        <>
          {/* A ordem é a da sala de espera, não a do relógio: primeiro quem já
              está no consultório, depois quem espera, e só então o que ainda
              vem. Encerradas ficam por último, para consulta. */}
          <FaixaDoDia
            titulo="No consultório"
            entradas={noConsultorio}
            onOpen={onOpen}
            destaque
            vazio=""
          />
          <FaixaDoDia
            titulo="Aguardando na recepção"
            entradas={aguardando}
            onOpen={onOpen}
            aguardando
            vazio=""
          />
          <FaixaDoDia titulo="Ainda não chegaram" entradas={aVir} onOpen={onOpen} vazio="" />
          <FaixaDoDia titulo="Encerrados" entradas={encerrados} onOpen={onOpen} vazio="" />
        </>
      ) : (
        <DataList>
          {entries.map((entry) => (
            <LinhaAgenda key={entry.id} entry={entry} onOpen={onOpen} />
          ))}
        </DataList>
      )}

      {creating && (
        <NewEncounterModal
          onClose={() => setCreating(false)}
          onStarted={(id) => {
            setCreating(false)
            onOpen(id)
          }}
        />
      )}
    </>
  )
}

/**
 * Pedido que chegou pela landing antes de existir cadastro com aquele e-mail.
 * Sem vínculo o atendimento não abre, então aqui estão as duas saídas: criar a
 * ficha com os dados do próprio pedido, ou apontar para uma paciente que já
 * existe — caso comum de quem preencheu o site com outro e-mail.
 */
/**
 * Uma consulta na agenda do dia.
 *
 * O chip diz onde a paciente está, não só como a consulta foi marcada: "na
 * sala" e "confirmada" são coisas diferentes, e antes a agenda mostrava as duas
 * do mesmo jeito.
 */
function LinhaAgenda({
  entry,
  onOpen,
  aguardando,
  destaque,
}: {
  entry: AgendaEntry
  onOpen: (id: string) => void
  aguardando?: boolean
  destaque?: boolean
}) {
  const client = useQueryClient()
  const meta = statusMeta(entry.status as never)

  /* Abrir o atendimento é chamar a paciente para dentro.
   *
   * A recepção marca a entrada quando manda a paciente ao consultório, mas a
   * médica também chama direto — encaixe, atraso, a paciente que já estava na
   * porta. Sem registrar aqui, a recepção continuaria vendo "na sala de espera"
   * alguém que está sentada na frente da médica.
   *
   * Falhar aqui não pode impedir o atendimento: se a marcação não passar, a
   * consulta abre do mesmo jeito e a recepção corrige na tela dela. */
  const entrar = useMutation({
    mutationFn: async () =>
      api.post(`/appointments/${entry.id}/stage`, { stage: 'called', value: true }),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['encounter-agenda'] })
      client.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  function atender() {
    if (!entry.calledAt && !entry.releasedAt) entrar.mutate()
    onOpen(entry.id)
  }
  const registered = entry._count.records + entry._count.prescriptions + entry._count.sessions
  const noPatient = !entry.patient

  return (
    <DataRow
      className="encounter-row"
      dimmed={Boolean(entry.releasedAt)}
      leading={<span className="encounter-time">{clinicTime(entry.scheduledAt)}</span>}
      title={entry.patient?.name ?? entry.name}
      chips={
        <>
          {destaque ? (
            <Chip tone="info">
              <Stethoscope size={11} aria-hidden="true" />
              Em atendimento
            </Chip>
          ) : aguardando ? (
            <Chip tone="success">
              <Clock size={11} aria-hidden="true" />
              Chegou {clinicTime(entry.arrivedAt ?? null)}
            </Chip>
          ) : (
            <Chip tone={meta.tone}>{meta.label}</Chip>
          )}
          {registered > 0 && (
            <Chip tone="info">
              {registered} registro{registered > 1 ? 's' : ''}
            </Chip>
          )}
        </>
      }
      meta={
        <>
          <span>{entry.procedure?.title ?? 'Consulta de avaliação'}</span>
          {noPatient && <span className="warn-text">sem cadastro de paciente</span>}
        </>
      }
      actions={
        noPatient ? (
          <LinkPatientButton entry={entry} />
        ) : (
          <button
            className="primary encounter-open data-action-label"
            onClick={atender}
            title="Abrir atendimento"
          >
            <Stethoscope size={14} aria-hidden="true" />
            {entry.releasedAt ? 'Ver' : 'Atender'}
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        )
      }
    />
  )
}

/** Uma etapa do dia. Some quando não há ninguém nela — faixa vazia é ruído. */
function FaixaDoDia({
  titulo,
  entradas,
  onOpen,
  aguardando,
  destaque,
}: {
  titulo: string
  entradas: AgendaEntry[]
  onOpen: (id: string) => void
  aguardando?: boolean
  destaque?: boolean
  vazio?: string
}) {
  if (entradas.length === 0) return null
  return (
    <section className="agenda-faixa">
      <h3 className="agenda-faixa-titulo">
        {titulo}
        <span className="agenda-faixa-contagem">{entradas.length}</span>
      </h3>
      <DataList>
        {entradas.map((entry) => (
          <LinhaAgenda
            key={entry.id}
            entry={entry}
            onOpen={onOpen}
            aguardando={aguardando}
            destaque={destaque}
          />
        ))}
      </DataList>
    </section>
  )
}

export function LinkPatientButton({ entry }: { entry: AgendaEntry }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        className="data-action-label"
        onClick={() => setOpen(true)}
        title="Vincular este pedido a uma paciente"
      >
        <UserRound size={14} />
        Vincular paciente
      </button>
      {open && <LinkPatientModal entry={entry} onClose={() => setOpen(false)} />}
    </>
  )
}

export function LinkPatientModal({ entry, onClose }: { entry: AgendaEntry; onClose: () => void }) {
  const client = useQueryClient()
  const [mode, setMode] = React.useState<'new' | 'existing'>('new')
  const [picked, setPicked] = React.useState<PatientOption | null>(null)

  const link = useMutation({
    mutationFn: () =>
      api.post(
        `/appointments/${entry.id}/link-patient`,
        mode === 'existing' ? { patientId: picked!.id } : {},
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['encounter-agenda'] })
      client.invalidateQueries({ queryKey: ['patients'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      onClose()
    },
  })

  const valid = mode === 'new' || !!picked

  return (
    <Modal
      title="Vincular paciente"
      subtitle={`Pedido de ${entry.name} — ${entry.email}${entry.phone ? ` · ${maskPhone(entry.phone)}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={link.isPending} disabled={!valid} onClick={() => link.mutate()}>
            Vincular
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {/* Duas opções excludentes, não abas: não há painel para o `tab`
            anunciar, então o leitor de tela recebe isto como escolha. */}
        <div className="segmented" role="radiogroup" aria-label="Como vincular">
          <button
            role="radio"
            aria-checked={mode === 'new'}
            className={mode === 'new' ? 'active' : ''}
            onClick={() => setMode('new')}
          >
            Cadastrar com estes dados
          </button>
          <button
            role="radio"
            aria-checked={mode === 'existing'}
            className={mode === 'existing' ? 'active' : ''}
            onClick={() => setMode('existing')}
          >
            Já é paciente
          </button>
        </div>

        {mode === 'existing' ? (
          <Field label="Paciente" required>
            <PatientSearchSelect
              value={picked}
              onChange={setPicked}
              autoFocus
              emptyHint="Nenhuma ficha encontrada — use “Cadastrar com estes dados”."
            />
          </Field>
        ) : (
          <p className="hint">
            Cria a ficha com o nome, e-mail e telefone do pedido. Se já existir
            cadastro com este e-mail, o agendamento é ligado a ele em vez de
            duplicar.
          </p>
        )}

        {link.isError && <p className="error">{errorMessage(link.error, 'Não foi possível vincular.')}</p>}
      </div>
    </Modal>
  )
}

/**
 * Abre um atendimento para quem chegou sem agendamento: cria a consulta agora
 * e entra direto no prontuário, para que o registro nasça vinculado.
 */
export function StartEncounterButton({
  patient,
  onStarted,
}: {
  patient: Patient
  onStarted: (appointmentId: string) => void
}) {
  const client = useQueryClient()

  const start = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/appointments/staff', {
        patientId: patient.id,
        // Encaixe: começa agora e já nasce confirmado
        scheduledAt: new Date().toISOString(),
        status: 'CONFIRMED',
        message: 'Atendimento sem agendamento prévio',
      })
      return data.appointment.id as string
    },
    onSuccess: (id) => {
      client.invalidateQueries({ queryKey: ['encounter-agenda'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      onStarted(id)
    },
  })

  return (
    <button
      className="primary encounter-open data-action-label"
      onClick={() => start.mutate()}
      disabled={start.isPending}
      title="Iniciar atendimento agora"
    >
      <Stethoscope size={14} />
      {start.isPending ? 'Abrindo...' : 'Atender'}
    </button>
  )
}

/**
 * Novo atendimento a partir do painel: escolhe uma paciente já cadastrada ou
 * cadastra na hora, e entra direto no prontuário.
 */
export function NewEncounterModal({
  onClose,
  onStarted,
}: {
  onClose: () => void
  onStarted: (appointmentId: string) => void
}) {
  const client = useQueryClient()
  const [mode, setMode] = React.useState<'existing' | 'new'>('existing')
  /* A paciente escolhida vem inteira, não só o id: o cartão de confirmação
     mostra nome e contato sem uma segunda consulta à lista. */
  const [picked, setPicked] = React.useState<PatientOption | null>(null)
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    allergies: '',
    notes: '',
  })
  const [procedureId, setProcedureId] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState(() => {
    // Agora, no formato do input datetime-local
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  })

  const procedures = useQuery({
    queryKey: ['procedures-admin'],
    queryFn: async () =>
      (await api.get('/procedures', { params: { tenantSlug } })).data as { id: string; title: string }[],
  })

  const start = useMutation({
    mutationFn: async () => {
      let id = picked?.id ?? ''

      // Cadastra a paciente antes, para que o atendimento já nasça vinculado.
      // Cadastro mínimo: a ficha completa se preenche depois, em Pacientes.
      if (mode === 'new') {
        const { data } = await api.post('/admin/patients', {
          name: form.name,
          email: form.email,
          phone: form.phone.replace(/\D/g, '') || undefined,
          birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
          allergies: form.allergies || undefined,
          notes: form.notes || undefined,
        })
        id = data.id
      }

      const { data } = await api.post('/appointments/staff', {
        patientId: id,
        procedureId: procedureId || undefined,
        scheduledAt: fromDateTimeLocalValue(scheduledAt),
        status: 'CONFIRMED',
      })
      return data.appointment.id as string
    },
    onSuccess: (id) => {
      client.invalidateQueries({ queryKey: ['encounter-agenda'] })
      client.invalidateQueries({ queryKey: ['patients'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      onStarted(id)
    },
  })

  const valid =
    mode === 'existing'
      ? !!picked && !!scheduledAt
      : form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && !!scheduledAt

  return (
    <Modal
      title="Novo atendimento"
      subtitle="Cria a consulta e abre o prontuário"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={start.isPending} disabled={!valid} onClick={() => start.mutate()}>
            Iniciar atendimento
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {/* Escolha excludente, não abas: sem tabpanel o `tab` mente ao leitor
            de tela sobre o que vem a seguir. */}
        <div className="segmented" role="radiogroup" aria-label="Origem da paciente">
          <button
            role="radio"
            aria-checked={mode === 'existing'}
            className={mode === 'existing' ? 'active' : ''}
            onClick={() => setMode('existing')}
          >
            Paciente cadastrada
          </button>
          <button
            role="radio"
            aria-checked={mode === 'new'}
            className={mode === 'new' ? 'active' : ''}
            onClick={() => setMode('new')}
          >
            Cadastrar agora
          </button>
        </div>

        {mode === 'existing' ? (
          <Field label="Paciente" required>
            <PatientSearchSelect
              value={picked}
              onChange={setPicked}
              autoFocus
              emptyHint="Use “Cadastrar agora” para criar a ficha."
            />
          </Field>
        ) : (
          <>
            <Field label="Nome completo" required>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <FormRow>
              <Field label="E-mail" required hint="Usado para o acesso ao portal">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Telefone" hint="Com DDD, para o WhatsApp">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                  placeholder="(67) 90000-0000"
                  inputMode="numeric"
                />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Data de nascimento">
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </Field>
              <Field label="Alergias" hint="Vira alerta no atendimento">
                <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              </Field>
            </FormRow>
            <Field label="Observações" hint="Histórico relevante; a ficha completa pode ser preenchida depois">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
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
          <Field label="Data e horário" required hint="Já vem preenchido com agora">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Field>
        </FormRow>

        {start.isError && <p className="error">{errorMessage(start.error)}</p>}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Atendimento aberto
// ─────────────────────────────────────────────────────────────────────────────
