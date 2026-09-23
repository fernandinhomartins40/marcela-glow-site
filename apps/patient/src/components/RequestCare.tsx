import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Loader2, Send } from 'lucide-react'
import { api, getErrorMessage, type Procedure } from '@/lib/api'
import { Feedback, Panel } from './ui'
import { SlotPicker } from './SlotPicker'

type Intent = 'appointment' | 'message'

/**
 * Unifica as duas ações que a paciente pode iniciar: pedir um horário ou
 * mandar uma mensagem. Antes eram dois botões sobre o mesmo campo, sem
 * indicação de qual faria o quê.
 */
export function RequestCare({ procedures, initialIntent = 'appointment' }: { procedures: Procedure[]; initialIntent?: Intent }) {
  const client = useQueryClient()
  const [intent, setIntent] = React.useState<Intent>(initialIntent)
  const [procedureId, setProcedureId] = React.useState('')
  const [slot, setSlot] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState('')
  const [feedback, setFeedback] = React.useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (intent === 'appointment') {
        await api.post('/patient/appointments', {
          procedureId: procedureId || undefined,
          scheduledAt: slot || undefined,
          message: message || undefined,
        })
      } else {
        await api.post('/patient/messages', { body: message.trim() })
      }
    },
    onSuccess: () => {
      setFeedback(
        intent === 'appointment'
          ? slot
            ? 'Horário solicitado! Você receberá o aviso aqui assim que a equipe confirmar.'
            : 'Solicitação enviada. A equipe entrará em contato para combinar o horário.'
          : 'Mensagem enviada. A equipe responderá em breve.',
      )
      setMessage('')
      setProcedureId('')
      setSlot(null)
      client.invalidateQueries({ queryKey: ['patient-dashboard'] })
      client.invalidateQueries({ queryKey: ['patient-messages'] })
      client.invalidateQueries({ queryKey: ['availability'] })
    },
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    setFeedback('')
    mutation.mutate()
  }

  const isMessage = intent === 'message'
  const canSubmit = isMessage ? message.trim().length > 0 : true

  return (
    <Panel title="Solicitar atendimento" icon={CalendarPlus}>
      <form onSubmit={submit} className="panel-pad space-y-4">
        {/* Seletor de intenção */}
        {/* `radiogroup`, não `tablist`: não há tabpanel — os botões escolhem o
            que o formulário abaixo envia. Com role="tab" o leitor de tela
            anuncia uma aba e procura um painel que não existe. */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-md bg-secondary"
          role="radiogroup"
          aria-label="O que você quer fazer"
        >
          {(
            [
              { id: 'appointment' as Intent, label: 'Solicitar horário' },
              { id: 'message' as Intent, label: 'Enviar mensagem' },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={intent === option.id}
              onClick={() => {
                setIntent(option.id)
                setFeedback('')
              }}
              className={`h-11 rounded text-sm transition-colors ${
                intent === option.id
                  ? 'bg-card text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!isMessage && (
          <div aria-describedby="appointment-request-help">
            <label htmlFor="procedure" className="block text-sm font-medium text-foreground mb-1.5">
              Procedimento de interesse
            </label>
            <select
              id="procedure"
              className="field"
              value={procedureId}
              onChange={(e) => setProcedureId(e.target.value)}
            >
              <option value="">Consulta de avaliação</option>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>
                  {procedure.title}
                </option>
              ))}
            </select>
            <p id="appointment-request-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Este é um pedido de horário. A equipe confere a agenda e confirma com você antes da reserva.
            </p>
          </div>
        )}

        {!isMessage && (
          <div>
            <span className="block text-sm font-medium text-foreground mb-2.5">
              Escolha um horário
              <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
            </span>
            <SlotPicker procedureId={procedureId || undefined} value={slot} onChange={setSlot} />
          </div>
        )}

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
            {isMessage ? 'Sua mensagem' : 'Observações'}
            {!isMessage && <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>}
          </label>
          <textarea
            id="message"
            className="field h-auto min-h-[104px] py-3 resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isMessage
                ? 'Escreva sua dúvida ou o que gostaria de compartilhar com a equipe.'
                : 'Conte se há alguma preferência de dia, horário ou algo que devemos saber.'
            }
            required={isMessage}
            maxLength={isMessage ? 4000 : undefined}
          />
        </div>

        {mutation.isError && <Feedback tone="error">{getErrorMessage(mutation.error)}</Feedback>}
        {feedback && <Feedback tone="success">{feedback}</Feedback>}

        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={mutation.isPending || !canSubmit}>
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : isMessage ? (
            <Send size={16} aria-hidden="true" />
          ) : (
            <CalendarPlus size={16} aria-hidden="true" />
          )}
          {mutation.isPending ? 'Enviando...' : isMessage ? 'Enviar mensagem' : 'Solicitar horário'}
        </button>
      </form>
    </Panel>
  )
}
