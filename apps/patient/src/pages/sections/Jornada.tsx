import { ChevronRight, Check, Sparkles } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { cn, EmptyState, StatusChip } from '@/components/ui'

/**
 * A jornada da paciente — a lista.
 *
 * Antes esta tela empilhava cada plano aberto por inteiro: progresso, todas as
 * sessões, os campos, os cuidados e as fotos. Com dois ou três tratamentos ela
 * virava uma rolagem longa em que nada se achava, e a pergunta mais comum —
 * "quantas faltam?" — ficava enterrada no meio do texto.
 *
 * Agora a lista responde só isso, em cartões: o que está em andamento primeiro,
 * o que já terminou depois. O detalhe inteiro fica a um toque de distância, em
 * {@link JornadaDetalhe}.
 */

interface Sessao {
  id: string
  sessionNumber: number | null
  performedAt: string
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
}

export interface Plano {
  id: string
  title: string
  /** Usado para abrir o pedido de horario ja no procedimento certo. */
  procedureId: string | null
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  totalSessions: number
  intervalDays: number | null
  details: Record<string, string> | null
  careBefore: string | null
  careAfter: string | null
  fieldSchema: { key: string; label: string }[] | null
  startedAt: string
  completedAt: string | null
  sessions: Sessao[]
  progresso: { feitas: number; total: number; restantes: number; percentual: number }
}

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

/** A próxima sessão, estimada pelo intervalo que a médica definiu. */
export function proximaPrevista(plano: Plano): string | null {
  if (plano.status !== 'ACTIVE' || !plano.intervalDays) return null
  const ultima = plano.sessions[plano.sessions.length - 1]
  if (!ultima) return null
  const d = new Date(ultima.performedAt)
  d.setDate(d.getDate() + plano.intervalDays)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export function Jornada({
  data: dados,
  onAbrir,
}: {
  data: DashboardData
  onAbrir: (planoId: string) => void
}) {
  const planos = (dados.plans ?? []) as Plano[]
  /* Pausado fica junto do que está em andamento: é um tratamento que a paciente
     ainda vai retomar, não um capítulo encerrado. */
  const abertos = planos.filter((p) => p.status === 'ACTIVE' || p.status === 'PAUSED')
  const concluidos = planos.filter((p) => p.status === 'COMPLETED')

  if (planos.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={Sparkles}
          title="Sua jornada começa na consulta"
          description="Quando a Dra. Marcela montar seu plano de tratamento, ele aparece aqui — com as sessões previstas, os cuidados de cada etapa e a sua evolução."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {abertos.length > 0 && (
        <section>
          <Titulo texto="Em andamento" contagem={abertos.length} />
          <div className="space-y-3">
            {abertos.map((plano) => (
              <CartaoPlano key={plano.id} plano={plano} onAbrir={onAbrir} />
            ))}
          </div>
        </section>
      )}

      {concluidos.length > 0 && (
        <section>
          <Titulo texto="Concluídos" contagem={concluidos.length} />
          <div className="space-y-3">
            {concluidos.map((plano) => (
              <CartaoPlano key={plano.id} plano={plano} onAbrir={onAbrir} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Titulo({ texto, contagem }: { texto: string; contagem: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[0.68rem] tracking-[0.18em] uppercase text-muted-foreground">
      {texto}
      <span className="text-accent">{contagem}</span>
    </h2>
  )
}

function CartaoPlano({ plano, onAbrir }: { plano: Plano; onAbrir: (id: string) => void }) {
  const { progresso } = plano
  const concluido = plano.status === 'COMPLETED'
  const proxima = proximaPrevista(plano)

  return (
    /* O cartão inteiro é o botão: num toque, mirar um link pequeno dentro de um
       cartão grande é a diferença entre abrir e errar. */
    <button
      type="button"
      onClick={() => onAbrir(plano.id)}
      className="jornada-cartao"
      aria-label={`${plano.title}, ${progresso.feitas} de ${progresso.total} sessões. Ver detalhes.`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-display text-lg text-primary leading-tight text-left">
          {plano.title}
        </span>
        {plano.status === 'PAUSED' ? (
          <StatusChip label="Pausado" tone="warning" />
        ) : concluido ? (
          <StatusChip label="Concluído" tone="success" />
        ) : (
          <StatusChip label="Em andamento" tone="info" />
        )}
      </span>

      <span className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground/75">
          <strong className="font-semibold text-primary">{progresso.feitas}</strong> de{' '}
          {progresso.total} {progresso.total === 1 ? 'sessão' : 'sessões'}
        </span>
        {!concluido && progresso.restantes > 0 && (
          <span className="text-xs text-muted-foreground">
            {progresso.restantes} {progresso.restantes === 1 ? 'restante' : 'restantes'}
          </span>
        )}
      </span>

      <span
        className="mt-2 block h-2 rounded-full bg-secondary overflow-hidden"
        role="img"
        aria-label={`${progresso.percentual}% concluído`}
      >
        <span
          className={cn(
            'block h-full rounded-full transition-all duration-500',
            concluido ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--bronze))]',
          )}
          style={{ width: `${progresso.percentual}%` }}
        />
      </span>

      <span className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {concluido ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} aria-hidden="true" />
              {plano.completedAt ? `Finalizado em ${dataCurta(plano.completedAt)}` : 'Finalizado'}
            </span>
          ) : proxima ? (
            `Próxima sessão prevista para ${proxima}`
          ) : (
            'Ver plano e cuidados'
          )}
        </span>
        {/* O texto do atalho diz o que acontece ao tocar: num cartao que
            inteiro e clicavel, uma seta sozinha nao promete nada. */}
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
          {concluido ? 'Ver' : 'Agendar'}
          <ChevronRight size={15} aria-hidden="true" />
        </span>
      </span>
    </button>
  )
}
