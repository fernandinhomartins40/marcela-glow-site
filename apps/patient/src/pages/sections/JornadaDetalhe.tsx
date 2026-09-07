import { ArrowLeft, CalendarDays, Check, CircleDashed, Info } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { cn, StatusChip } from '@/components/ui'
import { dataCurta, proximaPrevista, type Plano } from './Jornada'

/**
 * Um tratamento por inteiro.
 *
 * Responde, nesta ordem: **onde estou** (o progresso), **o que já aconteceu**
 * (a linha do tempo), **o que é meu** (os campos que a médica preencheu) e **o
 * que preciso fazer** (os cuidados). É a ordem em que a paciente pergunta.
 *
 * A lista em {@link Jornada} responde só a primeira dessas perguntas; quem
 * chega aqui já escolheu o tratamento e quer o resto.
 */

export function JornadaDetalhe({
  data: dados,
  planoId,
  onVoltar,
}: {
  data: DashboardData
  planoId: string
  onVoltar: () => void
}) {
  const planos = (dados.plans ?? []) as Plano[]
  const plano = planos.find((p) => p.id === planoId)

  /* Um id que não existe mais — plano cancelado, link antigo, recarga depois de
     a médica mexer — volta para a lista em vez de mostrar tela quebrada. */
  if (!plano) {
    return (
      <div className="panel panel-pad text-center py-10">
        <p className="text-sm font-medium text-foreground">Tratamento não encontrado</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ele pode ter sido atualizado pela equipe. Volte para ver sua jornada.
        </p>
        <button onClick={onVoltar} className="btn-outline mt-5">
          <ArrowLeft size={16} aria-hidden="true" />
          Minha jornada
        </button>
      </div>
    )
  }

  const { progresso } = plano
  const concluido = plano.status === 'COMPLETED'
  const proxima = proximaPrevista(plano)
  /* Só mostra os campos que a médica preencheu, na ordem que o procedimento
     declarou — um valor sem rótulo não diria nada à paciente. */
  const detalhes = (plano.fieldSchema ?? [])
    .map((campo) => ({ label: campo.label, valor: plano.details?.[campo.key] }))
    .filter((d) => d.valor)
  const comFoto = plano.sessions.filter((s) => s.beforePhotoUrl || s.afterPhotoUrl)

  return (
    <div className="space-y-4">
      <button onClick={onVoltar} className="jornada-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Minha jornada
      </button>

      <article className="panel overflow-hidden">
        <header className="px-5 sm:px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-2xl text-primary leading-tight">{plano.title}</h2>
            {plano.status === 'PAUSED' ? (
              <StatusChip label="Pausado" tone="warning" />
            ) : concluido ? (
              <StatusChip label="Concluído" tone="success" />
            ) : (
              <StatusChip label="Em andamento" tone="info" />
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm text-foreground/75">
                <strong className="font-semibold text-primary">{progresso.feitas}</strong> de{' '}
                {progresso.total} {progresso.total === 1 ? 'sessão' : 'sessões'}
              </span>
              {!concluido && progresso.restantes > 0 && (
                <span className="text-xs text-muted-foreground">
                  {progresso.restantes} {progresso.restantes === 1 ? 'restante' : 'restantes'}
                </span>
              )}
            </div>
            <div
              className="h-2 rounded-full bg-secondary overflow-hidden"
              role="img"
              aria-label={`${progresso.percentual}% concluído`}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  concluido ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--bronze))]',
                )}
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

        <div className="px-5 sm:px-6 py-5 space-y-6">
          <section>
            <Rotulo>Suas sessões</Rotulo>
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
                      {feita ? (
                        <Check size={13} aria-hidden="true" />
                      ) : (
                        <CircleDashed size={13} aria-hidden="true" />
                      )}
                    </span>
                    <span className={cn('flex-1', !feita && 'text-muted-foreground')}>
                      {numero}ª sessão
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {feita ? dataCurta(feita.performedAt) : 'a agendar'}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          {detalhes.length > 0 && (
            <section>
              <Rotulo>Seu plano</Rotulo>
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
              <h3 className="flex items-center gap-2 text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mb-3">
                <Info size={13} aria-hidden="true" />
                Cuidados
              </h3>
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

          {comFoto.length > 0 && (
            <section>
              <Rotulo>Sua evolução</Rotulo>
              <div className="space-y-3">
                {comFoto.map((s) => (
                  <div key={s.id}>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {s.sessionNumber}ª sessão · {dataCurta(s.performedAt)}
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
    </div>
  )
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground mb-3">
      {children}
    </h3>
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
