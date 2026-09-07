import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BellRing,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock,
  DoorOpen,
  MessageCircle,
  Phone,
  Plus,
  Undo2,
  UserRoundCheck,
  X,
} from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  RowAction,
} from '../lib/ui'
import {
  clinicDate,
  clinicDateKey,
  clinicTime,
  dateKey,
  statusMeta,
  type Appointment,
  type WhatsAppLink,
} from '../lib/schedule'
import { NewAppointment } from './NewAppointment'

/**
 * A tela da recepção.
 *
 * A secretária usava as mesmas telas da médica, que respondem a outra pergunta:
 * a Agenda mostra a semana inteira em grade, boa para planejar e ruim para o
 * balcão, onde a pergunta é sempre uma só — *quem está aqui agora, e quem eu
 * preciso ligar?*
 *
 * As três faixas são o dia da recepção em ordem cronológica de uso: quem já
 * chegou e espera, quem tem hora hoje e ainda não apareceu, e quem vem amanhã e
 * precisa confirmar. Tudo que ela faz — marcar chegada, confirmar, avisar por
 * WhatsApp, encaixar — acontece sem sair daqui.
 */

interface Resposta {
  data: Appointment[]
}

/** Amanhã, no formato que a agenda usa como chave de dia. */
function amanha(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return dateKey(d)
}

export function Reception() {
  const client = useQueryClient()
  const [encaixar, setEncaixar] = React.useState(false)
  const [whatsapp, setWhatsapp] = React.useState<WhatsAppLink | null>(null)
  const [cancelando, setCancelando] = React.useState<Appointment | null>(null)
  const [erro, setErro] = React.useState('')

  const consulta = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await api.get('/appointments', { params: { limit: 200 } })).data as Resposta,
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['appointments'] })
    client.invalidateQueries({ queryKey: ['admin'] })
  }

  const todas = consulta.data?.data ?? []
  const hoje = dateKey(new Date())

  /* As três faixas se excluem: uma consulta aparece uma vez só, na etapa em que
     ela realmente está. Cancelada não entra em nenhuma — não há o que fazer. */
  const doDia = todas.filter(
    (a) => a.scheduledAt && clinicDateKey(a.scheduledAt) === hoje && a.status !== 'CANCELLED',
  )
  const naSala = doDia.filter((a) => a.arrivedAt && a.status !== 'COMPLETED')
  const aguardando = doDia.filter((a) => !a.arrivedAt && a.status !== 'COMPLETED')
  const paraConfirmar = todas.filter(
    (a) =>
      a.scheduledAt &&
      clinicDateKey(a.scheduledAt) === amanha() &&
      a.status === 'PENDING',
  )

  const chegada = useMutation({
    mutationFn: async ({ id, chegou }: { id: string; chegou: boolean }) =>
      (await api.post(`/appointments/${id}/arrival`, { arrived: chegou })).data,
    onSuccess: refresh,
    onError: (e) => setErro(errorMessage(e, 'Não foi possível registrar a chegada.')),
  })

  const confirmar = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/appointments/${id}/confirm`, {})).data as {
        appointment: Appointment
        whatsapp: WhatsAppLink
      },
    onSuccess: (data) => {
      refresh()
      // O link vem pronto da API: confirmar e avisar são o mesmo gesto no balcão.
      if (data.whatsapp?.url) setWhatsapp(data.whatsapp)
    },
    onError: (e) => setErro(errorMessage(e, 'Não foi possível confirmar.')),
  })

  const cancelar = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/appointments/${id}/cancel`, { reason: 'Cancelado na recepção' })).data as {
        appointment: Appointment
        whatsapp: WhatsAppLink
      },
    onSuccess: (data) => {
      refresh()
      setCancelando(null)
      if (data.whatsapp?.url) setWhatsapp(data.whatsapp)
    },
    onError: (e) => setErro(errorMessage(e, 'Não foi possível cancelar.')),
  })

  /** Abre a conversa e registra que a paciente foi avisada. */
  function avisar(id: string, link: WhatsAppLink) {
    if (!link.url) return
    window.open(link.url, '_blank', 'noopener')
    api.post(`/appointments/${id}/notified`).then(refresh).catch(() => undefined)
  }

  async function lembrete(a: Appointment) {
    try {
      const { data } = await api.get(`/appointments/${a.id}/whatsapp`, {
        params: { kind: 'reminder' },
      })
      avisar(a.id, data as WhatsAppLink)
    } catch (e) {
      setErro(errorMessage(e, 'Não foi possível montar a mensagem.'))
    }
  }

  if (consulta.isLoading) return <p className="hint">Carregando o dia...</p>

  return (
    <div className="form-grid">
      {erro && <p className="error">{erro}</p>}

      <div className="toolbar">
        <span className="toolbar-title">
          {clinicDate(new Date().toISOString())} · {doDia.length}{' '}
          {doDia.length === 1 ? 'consulta' : 'consultas'}
        </span>
        <button className="primary" onClick={() => setEncaixar(true)}>
          <Plus size={14} aria-hidden="true" />
          Encaixar consulta
        </button>
      </div>

      <Faixa
        icone={DoorOpen}
        titulo="Na sala de espera"
        contagem={naSala.length}
        vazio="Ninguém aguardando no momento."
      >
        {naSala.map((a) => (
          <DataRow
            key={a.id}
            title={a.name}
            className="encounter-row"
            leading={<span className="encounter-time">{clinicTime(a.scheduledAt)}</span>}
            chips={
              <>
                <Chip tone="success">
                  <Clock size={11} aria-hidden="true" />
                  Chegou {clinicTime(a.arrivedAt ?? null)}
                </Chip>
                {a.procedure?.title && <Chip tone="neutral">{a.procedure.title}</Chip>}
              </>
            }
            actions={
              <RowAction
                icon={Undo2}
                title="Desfazer chegada"
                onClick={() => chegada.mutate({ id: a.id, chegou: false })}
              />
            }
          />
        ))}
      </Faixa>

      <Faixa
        icone={Clock}
        titulo="Ainda não chegaram"
        contagem={aguardando.length}
        vazio="Todas as pacientes de hoje já chegaram."
      >
        {aguardando.map((a) => (
          <DataRow
            key={a.id}
            title={a.name}
            className="encounter-row"
            leading={<span className="encounter-time">{clinicTime(a.scheduledAt)}</span>}
            chips={
              <>
                <Chip tone={statusMeta(a.status).tone}>{statusMeta(a.status).label}</Chip>
                {a.procedure?.title && <Chip tone="neutral">{a.procedure.title}</Chip>}
              </>
            }
            meta={a.phone ? <span>{a.phone}</span> : undefined}
            actions={
              <>
                <button
                  className="data-action-label"
                  onClick={() => chegada.mutate({ id: a.id, chegou: true })}
                >
                  <UserRoundCheck size={14} aria-hidden="true" />
                  Chegou
                </button>
                <RowAction icon={MessageCircle} title="Lembrar por WhatsApp" onClick={() => lembrete(a)} />
                <RowAction icon={X} title="Cancelar consulta" onClick={() => setCancelando(a)} />
              </>
            }
          />
        ))}
      </Faixa>

      <Faixa
        icone={BellRing}
        titulo="Confirmar para amanhã"
        contagem={paraConfirmar.length}
        vazio="Nenhuma consulta de amanhã pendente de confirmação."
      >
        {paraConfirmar.map((a) => (
          <DataRow
            key={a.id}
            title={a.name}
            className="encounter-row"
            leading={<span className="encounter-time">{clinicTime(a.scheduledAt)}</span>}
            chips={
              <>
                {a.procedure?.title && <Chip tone="neutral">{a.procedure.title}</Chip>}
                {a.notifiedAt && (
                  <Chip tone="info">
                    <Check size={11} aria-hidden="true" />
                    Avisada
                  </Chip>
                )}
              </>
            }
            meta={
              a.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} aria-hidden="true" />
                  {a.phone}
                </span>
              ) : undefined
            }
            actions={
              <>
                <button
                  className="data-action-label"
                  disabled={confirmar.isPending}
                  onClick={() => confirmar.mutate(a.id)}
                >
                  <Check size={14} aria-hidden="true" />
                  Confirmar
                </button>
                <RowAction icon={MessageCircle} title="Lembrar por WhatsApp" onClick={() => lembrete(a)} />
                <RowAction icon={X} title="Cancelar consulta" onClick={() => setCancelando(a)} />
              </>
            }
          />
        ))}
      </Faixa>

      {encaixar && (
        <NewAppointment
          onClose={() => setEncaixar(false)}
          onCreated={() => {
            refresh()
            setEncaixar(false)
          }}
        />
      )}

      {whatsapp && <AvisoWhatsApp link={whatsapp} onClose={() => setWhatsapp(null)} />}

      {cancelando && (
        <ConfirmDialog
          title="Cancelar consulta"
          message={`A consulta de ${cancelando.name} sai da agenda. A paciente precisa ser avisada.`}
          confirmLabel="Cancelar consulta"
          danger
          pending={cancelar.isPending}
          onCancel={() => setCancelando(null)}
          onConfirm={() => cancelar.mutate(cancelando.id)}
        />
      )}
    </div>
  )
}

function Faixa({
  icone: Icone,
  titulo,
  contagem,
  vazio,
  children,
}: {
  icone: typeof DoorOpen
  titulo: string
  contagem: number
  vazio: string
  children: React.ReactNode
}) {
  return (
    <section className="reception-faixa">
      <h2 className="reception-titulo">
        <Icone size={15} aria-hidden="true" />
        {titulo}
        <span className="reception-contagem">{contagem}</span>
      </h2>
      {contagem === 0 ? <p className="hint">{vazio}</p> : <DataList>{children}</DataList>}
    </section>
  )
}

/** O link do WhatsApp, para a recepção abrir a conversa já escrita. */
function AvisoWhatsApp({ link, onClose }: { link: WhatsAppLink; onClose: () => void }) {
  return (
    <div className="reception-whats">
      <div>
        <strong>Mensagem pronta para enviar</strong>
        <p className="hint">{link.message}</p>
      </div>
      <div className="reception-whats-acoes">
        {link.url ? (
          <a className="primary" href={link.url} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} aria-hidden="true" />
            Abrir WhatsApp
            <ChevronRight size={14} aria-hidden="true" />
          </a>
        ) : (
          <span className="hint">{link.unavailableReason ?? 'Paciente sem telefone cadastrado.'}</span>
        )}
        <button className="ghost" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}
