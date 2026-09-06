import { CalendarDays, Check, CircleDashed, Info, Pause, Sparkles } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { cn } from '@/components/ui'

/**
 * A jornada da paciente.
 *
 * Cada procedimento estético costuma pedir mais de uma sessão, e até aqui a
 * paciente via só uma lista do que já tinha acontecido — sem saber quantas
 * faltavam nem o que a médica havia planejado para ela.
 *
 * A tela responde, por plano, nesta ordem: **onde estou** (o progresso), **o
 * que já aconteceu** (a linha do tempo), **o que é meu** (os campos que a
 * médica preencheu) e **o que preciso fazer** (os cuidados). É a ordem em que a
 * paciente pergunta.
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

const data = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

/** A próxima sessão, estimada pelo intervalo que a médica definiu. */
function proximaPrevista(plano: Plano): string | null {
  if (plano.status !== 'ACTIVE' || !plano.intervalDays) return null
  const ultima = plano.sessions[plano.sessions.length - 1]
  if (!ultima) return null
  const d = new Date(ultima.performedAt)
  d.setDate(d.getDate() + plano.intervalDays)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export function Jornada({ data: dados }: { data: DashboardData }) {
  const planos = (dados.plans ?? []) as Plano[]

  if (planos.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Sparkles className="mx-auto mb-3 text-muted-foreground" size={22} aria-hidden="true" />
        <p className="font-display text-lg text-primary">Sua jornada começa na consulta</p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Quando a Dra. Marcela montar seu plano de tratamento, ele aparece aqui — com as sessões
          previstas, os cuidados de cada etapa e a sua evolução.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {planos.map((plano) => (
        <CartaoPlano key={plano.id} plano={plano} />
      ))}
    </div>
  )
}

function CartaoPlano({ plano }: { plano: Plano }) {
  const { progresso } = plano
  const proxima = proximaPrevista(plano)
  /* Só mostra os campos que a médica preencheu, na ordem que o procedimento
     declarou — um valor sem rótulo não diria nada à paciente. */
  const detalhes = (plano.fieldSchema ?? [])
    .map((campo) => ({ label: campo.label, valor: plano.details?.[campo.key] }))
    .filter((d) => d.valor)

  return (
    <article className="card overflow-hidden">
      <header className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl text-primary leading-tight">{plano.title}</h3>
          <Selo status={plano.status} />
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="text-sm text-foreground/75">
              <strong className="font-semibold text-primary">{progresso.feitas}</strong> de{' '}
              {progresso.total} {progresso.total === 1 ? 'sessão' : 'sessões'}
            </span>
            {progresso.restantes > 0 && plano.status === 'ACTIVE' && (
              <span className="text-xs text-muted-foreground">
                {progresso.restantes} {progresso.restantes === 1 ? 'restante' : 'restantes'}
              </span>
            )}
          </div>
          {/* `aria-label` porque a barra é decorativa para quem enxerga e a
              única informação para quem usa leitor de tela. */}
          <div
            className="h-2 rounded-full bg-secondary overflow-hidden"
            role="img"
            aria-label={`${progresso.percentual}% concluído`}
          >
            <div
              className="h-full rounded-full bg-[hsl(var(--bronze))] transition-all duration-500"
              style={{ width: `${progresso.percentual}%` }}
            />
          </div>
          {proxima && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays size={13} aria-hidden="true" />
              Próxima sessão prevista para {proxima}
            </p>
          )}
        </div>
      </header>

      <div className="px-5 py-4 space-y-5">
        <section>
          <h4 className="text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mb-3">
            Suas sessões
          </h4>
          <ol className="space-y-2">
            {Array.from({ length: plano.totalSessions }, (_, i) => {
              const numero = i + 1
              const feita = plano.sessions.find((s) => (s.sessionNumber ?? 0) === numero)
              return (
                <li key={numero} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      feita
                        ? 'bg-[hsl(var(--bronze))] text-[hsl(var(--cream))]'
                        : 'border border-dashed border-border text-muted-foreground',
                    )}
                  >
                    {feita ? <Check size={13} aria-hidden="true" /> : <CircleDashed size={13} aria-hidden="true" />}
                  </span>
                  <span className={cn('flex-1', !feita && 'text-muted-foreground')}>
                    {numero}ª sessão
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {feita ? data(feita.performedAt) : 'a agendar'}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        {detalhes.length > 0 && (
          <section>
            <h4 className="text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mb-3">
              Seu plano
            </h4>
            <dl className="space-y-1.5">
              {detalhes.map((d) => (
                <div key={d.label} className="flex flex-wrap gap-x-3 text-sm">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="text-foreground">{d.valor}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {(plano.careBefore || plano.careAfter) && (
          <section className="rounded-lg bg-secondary/50 p-4">
            <h4 className="flex items-center gap-2 text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mb-3">
              <Info size={13} aria-hidden="true" />
              Cuidados
            </h4>
            {plano.careBefore && (
              <div className="mb-3">
                <p className="text-xs font-medium text-primary mb-1">Antes da sessão</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {plano.careBefore}
                </p>
              </div>
            )}
            {plano.careAfter && (
              <div>
                <p className="text-xs font-medium text-primary mb-1">Depois da sessão</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {plano.careAfter}
                </p>
              </div>
            )}
          </section>
        )}

        {plano.sessions.some((s) => s.beforePhotoUrl || s.afterPhotoUrl) && (
          <section>
            <h4 className="text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mb-3">
              Sua evolução
            </h4>
            <div className="space-y-3">
              {plano.sessions
                .filter((s) => s.beforePhotoUrl || s.afterPhotoUrl)
                .map((s) => (
                  <div key={s.id}>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {s.sessionNumber}ª sessão · {data(s.performedAt)}
                    </p>
                    <div className="flex gap-2">
                      {s.beforePhotoUrl && <Foto url={s.beforePhotoUrl} legenda="antes" />}
                      {s.afterPhotoUrl && <Foto url={s.afterPhotoUrl} legenda="depois" />}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}

function Foto({ url, legenda }: { url: string; legenda: string }) {
  return (
    <figure className="flex-1 min-w-0">
      <img src={url} alt={legenda} className="w-full aspect-[3/4] object-cover rounded-lg" />
      <figcaption className="mt-1 text-[0.65rem] tracking-[0.14em] uppercase text-muted-foreground">
        {legenda}
      </figcaption>
    </figure>
  )
}

function Selo({ status }: { status: Plano['status'] }) {
  if (status === 'COMPLETED') {
    return (
      <span className="chip shrink-0 bg-[hsl(var(--bronze))]/12 text-[hsl(var(--bronze))]">
        <Check size={12} aria-hidden="true" />
        Concluído
      </span>
    )
  }
  if (status === 'PAUSED') {
    return (
      <span className="chip shrink-0 bg-secondary text-muted-foreground">
        <Pause size={12} aria-hidden="true" />
        Pausado
      </span>
    )
  }
  return <span className="chip shrink-0 bg-secondary text-primary">Em andamento</span>
}
