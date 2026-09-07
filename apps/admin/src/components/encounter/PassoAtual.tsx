import { useMutation } from '@tanstack/react-query'
import { Check, ChevronRight, FileSignature, LogOut, PenLine, Stethoscope } from 'lucide-react'
import { api } from '../../lib/ui'
import type { useAvisos } from '../../lib/avisos'
import { TRILHA, type Etapa } from './etapas'

/**
 * O próximo passo do atendimento.
 *
 * O cabeçalho tinha quatro botões de mesmo peso — chamar, avisar, liberar,
 * encerrar — e a médica decidia a cada momento qual era o certo. A tela sabia a
 * resposta o tempo todo: se a paciente já entrou, se há evolução escrita, se
 * sobrou documento por entregar.
 *
 * Agora ela diz. Uma etapa por vez, um botão grande, e a trilha mostrando onde
 * o atendimento está.
 */

type Avisos = ReturnType<typeof useAvisos>

const ICONE = {
  chamar: Stethoscope,
  registrar: PenLine,
  documentos: FileSignature,
  encerrar: LogOut,
  encerrado: Check,
} as const

export function PassoAtual({
  etapa,
  appointmentId,
  onEscrever,
  onDocumentos,
  onEncerrar,
  onChamou,
  avisos,
}: {
  etapa: Etapa
  appointmentId: string
  onEscrever: () => void
  onDocumentos: () => void
  onEncerrar: () => void
  onChamou: () => void
  avisos: Avisos
}) {
  /* Chamar a paciente é aviso à recepção e entrada no consultório ao mesmo
     tempo — a API já trata os dois como o mesmo gesto. */
  const chamar = useMutation({
    mutationFn: async () =>
      api.post('/alerts', { kind: 'CALL_PATIENT', appointmentId }),
    onSuccess: () => {
      avisos.enviar.reset()
      onChamou()
    },
  })

  const Icone = ICONE[etapa.id]

  function agir() {
    if (etapa.id === 'chamar') chamar.mutate()
    else if (etapa.id === 'registrar') onEscrever()
    else if (etapa.id === 'documentos') onDocumentos()
    else if (etapa.id === 'encerrar') onEncerrar()
  }

  return (
    <section className={`passo passo-${etapa.id}`}>
      {/* A trilha responde "quanto falta" sem a médica ter que perguntar. */}
      <ol className="passo-trilha" aria-label="Etapas do atendimento">
        {TRILHA.map((item, i) => (
          <li
            key={item.id}
            className={
              i < etapa.ordem ? 'feito' : i === etapa.ordem ? 'atual' : 'futuro'
            }
            aria-current={i === etapa.ordem ? 'step' : undefined}
          >
            <span className="passo-bolinha">{i < etapa.ordem ? <Check size={11} /> : i + 1}</span>
            {item.rotulo}
          </li>
        ))}
      </ol>

      <div className="passo-corpo">
        <span className="passo-icone" aria-hidden="true">
          <Icone size={20} />
        </span>

        <div className="passo-texto">
          <strong>{etapa.titulo}</strong>
          <span>{etapa.ajuda}</span>
        </div>

        {etapa.acao && (
          <button className="passo-acao" onClick={agir} disabled={chamar.isPending}>
            {etapa.acao}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
