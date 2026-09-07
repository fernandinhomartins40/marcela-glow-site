import type { EncounterData } from './types'

/**
 * Em que ponto do atendimento a consulta está, e o que fazer agora.
 *
 * A tela sempre soube disto — `calledAt`, `releasedAt`, registros, documentos —
 * mas usava a informação só para esconder botão. O resultado era uma barra de
 * comandos de peso igual, em que a médica precisava decidir a cada momento qual
 * dos quatro era o certo.
 *
 * Aqui a mesma informação vira uma pergunta só: *qual é o próximo passo*. Cada
 * etapa tem uma ação principal, e o resto sai da frente.
 */

export type EtapaId = 'chamar' | 'registrar' | 'documentos' | 'encerrar' | 'encerrado'

export interface Etapa {
  id: EtapaId
  /** O que a médica vê como título do momento. */
  titulo: string
  /** Uma linha dizendo por que este é o passo. */
  ajuda: string
  /** O rótulo do botão principal. */
  acao: string
  /** Índice na trilha, para desenhar o progresso. */
  ordem: number
}

export const TRILHA: { id: EtapaId; rotulo: string }[] = [
  { id: 'chamar', rotulo: 'Chamar' },
  { id: 'registrar', rotulo: 'Evolução' },
  { id: 'documentos', rotulo: 'Documentos' },
  { id: 'encerrar', rotulo: 'Encerrar' },
]

interface Pendencias {
  draftDocuments: number
  unsentDocuments: number
}

/**
 * A etapa atual.
 *
 * A ordem é a do atendimento real: a paciente entra, a médica escreve, entrega
 * o que precisa ser entregue, e encerra. Documentos só entram no caminho quando
 * existem — uma consulta sem receita não deve mostrar um passo vazio.
 */
export function etapaAtual(data: EncounterData, pendencias?: Pendencias): Etapa {
  const { appointment } = data

  if (appointment.status === 'COMPLETED' || appointment.releasedAt) {
    return {
      id: 'encerrado',
      titulo: 'Atendimento encerrado',
      ajuda: 'A paciente foi liberada e a recepção já sabe.',
      acao: '',
      ordem: 4,
    }
  }

  if (!appointment.calledAt) {
    return {
      id: 'chamar',
      titulo: 'Chamar a paciente',
      ajuda: 'A recepção recebe o aviso e manda a paciente entrar.',
      acao: 'Chamar a paciente',
      ordem: 0,
    }
  }

  if (data.currentRecords.length === 0) {
    return {
      id: 'registrar',
      titulo: 'Registrar a evolução',
      ajuda: 'O que foi avaliado e conduzido nesta consulta.',
      acao: 'Escrever a evolução',
      ordem: 1,
    }
  }

  /* Rascunho ou assinado-e-não-enviado são o mesmo problema visto de dois
     lados: a paciente não recebeu o documento. */
  const documentosAbertos = (pendencias?.draftDocuments ?? 0) + (pendencias?.unsentDocuments ?? 0)
  if (documentosAbertos > 0) {
    return {
      id: 'documentos',
      titulo: 'Entregar os documentos',
      ajuda:
        documentosAbertos === 1
          ? 'Um documento ainda não chegou à paciente.'
          : `${documentosAbertos} documentos ainda não chegaram à paciente.`,
      acao: 'Ver documentos',
      ordem: 2,
    }
  }

  return {
    id: 'encerrar',
    titulo: 'Encerrar o atendimento',
    ajuda: 'A paciente é liberada e a recepção recebe o aviso de cobrança.',
    acao: 'Encerrar e liberar',
    ordem: 3,
  }
}
