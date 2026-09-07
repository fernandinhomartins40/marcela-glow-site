import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { cn, Feedback } from '@/components/ui'
import { SlotPicker } from '@/components/SlotPicker'
import type { Plano } from './Jornada'

/**
 * O que a paciente pode fazer a partir de um tratamento.
 *
 * A jornada nasceu só de leitura: mostrava onde a paciente estava e a deixava
 * ali. Quem via "1 restante" e queria marcar tinha que sair, abrir Consultas,
 * reencontrar o procedimento numa lista e recomeçar — o contexto que ela
 * acabara de ver se perdia no caminho.
 *
 * As duas ações reaproveitam as rotas que o portal já tem
 * (`POST /patient/appointments` e `POST /patient/messages`); o que muda é que
 * saem daqui já sabendo de que tratamento se fala.
 */

type Acao = 'agendar' | 'perguntar' | null

export function JornadaAcoes({ plano }: { plano: Plano }) {
  const client = useQueryClient()
  const [aberta, setAberta] = React.useState<Acao>(null)
  const [slot, setSlot] = React.useState<string | null>(null)
  const [texto, setTexto] = React.useState('')
  const [feito, setFeito] = React.useState('')

  const concluido = plano.status === 'COMPLETED'
  const proximaSessao = plano.progresso.feitas + 1

  const enviar = useMutation({
    mutationFn: async () => {
      if (aberta === 'agendar') {
        await api.post('/patient/appointments', {
          procedureId: plano.procedureId ?? undefined,
          scheduledAt: slot ?? undefined,
          /* A equipe recebe o pedido sabendo de que serie ele faz parte: sem
             isso, chega "quero marcar bioestimulador" e alguem tem que abrir o
             prontuario para descobrir se e a 2a ou a 5a sessao. */
          message: [
            concluido
              ? `Retorno após ${plano.title}.`
              : `${proximaSessao}ª sessão de ${plano.totalSessions} — ${plano.title}.`,
            texto.trim(),
          ]
            .filter(Boolean)
            .join(' '),
        })
      } else {
        await api.post('/patient/messages', {
          body: `Sobre meu tratamento "${plano.title}": ${texto.trim()}`,
        })
      }
    },
    onSuccess: () => {
      setFeito(
        aberta === 'agendar'
          ? slot
            ? 'Horário solicitado. Você recebe o aviso aqui assim que a equipe confirmar.'
            : 'Pedido enviado. A equipe entra em contato para combinar o melhor dia.'
          : 'Mensagem enviada. A equipe responde por aqui.',
      )
      setTexto('')
      setSlot(null)
      setAberta(null)
      client.invalidateQueries({ queryKey: ['patient-dashboard'] })
      client.invalidateQueries({ queryKey: ['availability'] })
    },
  })

  function abrir(acao: Exclude<Acao, null>) {
    setFeito('')
    enviar.reset()
    setAberta((atual) => (atual === acao ? null : acao))
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    enviar.mutate()
  }

  // Perguntar exige texto; agendar não — sem horário vale como "me liguem".
  const podeEnviar = aberta === 'perguntar' ? texto.trim().length > 0 : true

  return (
    <section className="mt-4">
      {feito && (
        <div className="mb-4">
          <Feedback tone="success">{feito}</Feedback>
        </div>
      )}

      {/* Empilha por padrao e so vai a duas colunas quando ha largura: lado a
          lado num celular estreito, "Agendar 3ª sessão" nao cabe e o rotulo
          era cortado no meio. */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
        <BotaoAcao
          icone={CalendarPlus}
          rotulo={concluido ? 'Agendar retorno' : `Agendar ${proximaSessao}ª sessão`}
          ativo={aberta === 'agendar'}
          onClick={() => abrir('agendar')}
        />
        <BotaoAcao
          icone={MessageCircle}
          rotulo="Tirar uma dúvida"
          ativo={aberta === 'perguntar'}
          onClick={() => abrir('perguntar')}
        />
      </div>

      {aberta && (
        <form onSubmit={submeter} className="mt-4 space-y-4">
          {aberta === 'agendar' && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Escolha um horário <span className="text-muted-foreground/70">(opcional)</span> — se
                nenhum servir, envie assim mesmo e a equipe procura outro.
              </p>
              <SlotPicker
                procedureId={plano.procedureId ?? undefined}
                value={slot}
                onChange={setSlot}
              />
            </div>
          )}

          <div>
            <label htmlFor="jornada-texto" className="mb-1.5 block text-xs text-muted-foreground">
              {aberta === 'agendar' ? (
                <>
                  Observações <span className="text-muted-foreground/70">(opcional)</span>
                </>
              ) : (
                'Sua dúvida sobre este tratamento'
              )}
            </label>
            <textarea
              id="jornada-texto"
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={1000}
              placeholder={
                aberta === 'agendar'
                  ? 'Prefiro pela manhã, por exemplo.'
                  : 'Posso tomar sol depois da sessão?'
              }
              className="field h-auto py-2.5 resize-y"
            />
          </div>

          {enviar.isError && <Feedback tone="error">{getErrorMessage(enviar.error)}</Feedback>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={enviar.isPending || !podeEnviar}
              className="btn-primary flex-1"
            >
              {enviar.isPending ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              Enviar
            </button>
            <button type="button" onClick={() => setAberta(null)} className="btn-ghost px-4">
              <X size={16} aria-hidden="true" />
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function BotaoAcao({
  icone: Icone,
  rotulo,
  ativo,
  onClick,
}: {
  icone: typeof CalendarPlus
  rotulo: string
  ativo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ativo}
      className={cn(
        'flex items-center justify-center gap-2 h-11 px-3 rounded-md text-sm font-medium',
        'transition-colors duration-200 text-center',
        ativo
          ? 'bg-primary text-primary-foreground'
          : 'border border-primary/25 text-primary hover:bg-secondary',
      )}
    >
      <Icone size={16} className="shrink-0" aria-hidden="true" />
      <span>{rotulo}</span>
    </button>
  )
}
