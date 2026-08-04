import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Loader2, Send } from 'lucide-react'
import { api, getErrorMessage, type Procedure } from '@/lib/api'
import { Feedback, Panel } from './ui'

type Intent = 'appointment' | 'message'

/**
 * Unifica as duas ações que a paciente pode iniciar: pedir um horário ou
 * mandar uma mensagem. Antes eram dois botões sobre o mesmo campo, sem
 * indicação de qual faria o quê.
 */
export function RequestCare({ procedures }: { procedures: Procedure[] }) {
  const client = useQueryClient()
  const [intent, setIntent] = React.useState<Intent>('appointment')
  const [procedureId, setProcedureId] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [feedback, setFeedback] = React.useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (intent === 'appointment') {
        await api.post('/patient/appointments', {
          procedureId: procedureId || undefined,
          message: message || undefined,
        })
      } else {
        await api.post('/patient/messages', { body: message })
      }
    },
    onSuccess: () => {
      setFeedback(
        intent === 'appointment'
          ? 'Solicitação enviada. A equipe entrará em contato para confirmar o horário.'
          : 'Mensagem enviada. A equipe responderá em breve.',
      )
      setMessage('')
      setProcedureId('')
      client.invalidateQueries({ queryKey: ['patient-dashboard'] })
    },
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setFeedback('')
    mutation.mutate()
  }

  const isMessage = intent === 'message'
  const canSubmit = isMessage ? message.trim().length > 0 : true

  return (
    <Panel title="Solicitar atendimento" icon={CalendarPlus}>
      <form onSubmit={submit} className="panel-pad space-y-4">
        {/* Seletor de intenção */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-secondary" role="tablist">
          {(
            [
              { id: 'appointment' as Intent, label: 'Agendar horário' },
              { id: 'message' as Intent, label: 'Enviar mensagem' },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={intent === option.id}
              onClick={() => {
                setIntent(option.id)
                setFeedback('')
              }}
              className={`h-9 rounded text-sm transition-colors ${
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
          <div>
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
