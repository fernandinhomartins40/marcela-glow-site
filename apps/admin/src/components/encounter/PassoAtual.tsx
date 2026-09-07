import { useMutation } from '@tanstack/react-query'
import React from 'react'
import {
  Check,
  ChevronRight,
  FileSignature,
  LogOut,
  PenLine,
  SkipForward,
  Stethoscope,
} from 'lucide-react'
import { api } from '../../lib/ui'
import type { useAvisos } from '../../lib/avisos'
import { etapaPorId, TRILHA, type Etapa, type EtapaId } from './etapas'

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

  /* A trilha sugere o passo; a médica decide. Escolhendo uma etapa, é ela que
     manda até a próxima recarga — a sugestão volta quando o atendimento
     realmente avança. */
  const [escolhida, setEscolhida] = React.useState<EtapaId | null>(null)
  const mostrada = escolhida ? etapaPorId(escolhida, etapa) : etapa

  /* Se o atendimento avançou por conta própria — a evolução foi escrita, a
     paciente entrou — a escolha manual perde o sentido e sai da frente. */
  React.useEffect(() => {
    setEscolhida(null)
  }, [etapa.id])

  const Icone = ICONE[mostrada.id]

  function agir() {
    if (mostrada.id === 'chamar') chamar.mutate()
    else if (mostrada.id === 'registrar') onEscrever()
    else if (mostrada.id === 'documentos') onDocumentos()
    else if (mostrada.id === 'encerrar') onEncerrar()
  }

  return (
    <section className={`passo passo-${mostrada.id}`}>
      {/* Responde "quanto falta" e deixa ir a qualquer passo. Uma consulta de
          retorno pode não ter evolução a escrever, e travar a médica ali só a
          faria escrever qualquer coisa para destravar. */}
      <ol className="passo-trilha" aria-label="Etapas do atendimento">
        {TRILHA.map((item, i) => (
          <li
            key={item.id}
            className={
              i < etapa.ordem ? 'feito' : i === mostrada.ordem ? 'atual' : 'futuro'
            }
            aria-current={i === mostrada.ordem ? 'step' : undefined}
          >
            <button
              type="button"
              className="passo-etapa"
              onClick={() => setEscolhida(item.id)}
              title={`Ir para "${item.rotulo}"`}
            >
              <span className="passo-bolinha">
                {i < etapa.ordem ? <Check size={11} /> : i + 1}
              </span>
              {item.rotulo}
            </button>
          </li>
        ))}
      </ol>

      <div className="passo-corpo">
        <span className="passo-icone" aria-hidden="true">
          <Icone size={20} />
        </span>

        <div className="passo-texto">
          <strong>{mostrada.titulo}</strong>
          <span>{mostrada.ajuda}</span>
        </div>

        {/* Pular vai direto ao passo seguinte da trilha. Existe porque a ordem
            é a do caso comum, não uma regra: quem já sabe o que quer fazer não
            deve ter que cumprir a etapa para chegar lá. */}
        {mostrada.id !== 'encerrar' && mostrada.id !== 'encerrado' && (
          <button
            type="button"
            className="passo-pular"
            onClick={() => setEscolhida(TRILHA[Math.min(mostrada.ordem + 1, TRILHA.length - 1)].id)}
          >
            Pular
            <SkipForward size={14} aria-hidden="true" />
          </button>
        )}

        {mostrada.acao && (
          <button className="passo-acao" onClick={agir} disabled={chamar.isPending}>
            {mostrada.acao}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
