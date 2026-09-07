import React from 'react'
import { BellRing, Check, MessageCircle, Send, X } from 'lucide-react'
import { AVISO_TEXTO, type TipoAviso, type useAvisos } from '../lib/avisos'
import { clinicTime } from '../lib/schedule'

/**
 * Os avisos entre o consultório e a recepção, na tela.
 *
 * A barra fica no topo e só existe quando há algo por ver: um aviso que nunca
 * some vira paisagem, e a médica ou a secretária param de olhar. Some ao ser
 * marcado como visto, que é o gesto de "ok, entendi".
 */

type Avisos = ReturnType<typeof useAvisos>

export function AvisosBarra({ avisos }: { avisos: Avisos }) {
  const pendentes = avisos.naoVistos
  if (pendentes.length === 0) return null

  return (
    <div className="avisos" role="status" aria-live="polite">
      {pendentes.map((aviso) => (
        <div key={aviso.id} className="aviso">
          <BellRing size={16} aria-hidden="true" className="aviso-sino" />
          <div className="aviso-texto">
            <strong>
              {AVISO_TEXTO[aviso.kind]}
              {aviso.appointment ? ` — ${aviso.appointment.name}` : ''}
            </strong>
            {aviso.body && <p>{aviso.body}</p>}
            <span className="hint">
              {clinicTime(aviso.createdAt)}
              {aviso.createdBy ? ` · ${aviso.createdBy.name}` : ''}
            </span>
          </div>
          <button
            className="aviso-visto"
            onClick={() => avisos.marcarVisto.mutate(aviso.id)}
            disabled={avisos.marcarVisto.isPending}
          >
            <Check size={14} aria-hidden="true" />
            Ok
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Botão de aviso rápido.
 *
 * O que se repete dezenas de vezes por dia merece um toque só. O recado
 * escrito abre embaixo, para o caso que não cabe num botão — "pergunte se ela
 * quer remarcar para o dia 12".
 */
export function EnviarAviso({
  avisos,
  kind,
  rotulo,
  appointmentId,
  compacto,
}: {
  avisos: Avisos
  kind: TipoAviso
  rotulo: string
  appointmentId?: string
  compacto?: boolean
}) {
  const [abrindoTexto, setAbrindoTexto] = React.useState(false)
  const [texto, setTexto] = React.useState('')
  const [enviado, setEnviado] = React.useState(false)

  function mandar(corpo?: string) {
    avisos.enviar.mutate(
      { kind: corpo ? 'NOTE' : kind, appointmentId, body: corpo },
      {
        onSuccess: () => {
          setEnviado(true)
          setTexto('')
          setAbrindoTexto(false)
          // A confirmação some sozinha: é um recibo, não um estado.
          window.setTimeout(() => setEnviado(false), 2500)
        },
      },
    )
  }

  return (
    <div className={compacto ? 'aviso-enviar compacto' : 'aviso-enviar'}>
      <button
        className={compacto ? 'data-action-label' : 'ghost'}
        onClick={() => mandar()}
        disabled={avisos.enviar.isPending}
        title={rotulo}
      >
        {enviado ? <Check size={14} aria-hidden="true" /> : <BellRing size={14} aria-hidden="true" />}
        {enviado ? 'Avisado' : rotulo}
      </button>

      {!compacto && (
        <button
          className="ghost aviso-recado"
          onClick={() => setAbrindoTexto((v) => !v)}
          aria-expanded={abrindoTexto}
          title="Mandar um recado escrito"
        >
          <MessageCircle size={14} aria-hidden="true" />
        </button>
      )}

      {abrindoTexto && (
        <form
          className="aviso-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (texto.trim()) mandar(texto.trim())
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: a paciente quer remarcar para o dia 12."
            maxLength={500}
            autoFocus
          />
          <button className="primary" type="submit" disabled={!texto.trim() || avisos.enviar.isPending}>
            <Send size={14} aria-hidden="true" />
            Enviar
          </button>
          <button className="ghost" type="button" onClick={() => setAbrindoTexto(false)}>
            <X size={14} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  )
}
