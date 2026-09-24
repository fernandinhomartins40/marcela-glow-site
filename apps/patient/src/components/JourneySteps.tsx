import { Check } from 'lucide-react'
import type { Appointment } from '@/lib/api'
import { cn } from './ui'

/**
 * A jornada em quatro etapas: avaliação → plano → sessões → acompanhamento.
 *
 * Não existe um campo "etapa" no banco — ela sai do que a paciente já viveu:
 * uma consulta concluída é a avaliação, um plano aberto é o plano, as sessões
 * feitas contam as sessões e o plano concluído abre o acompanhamento. Assim a
 * régua nunca promete uma etapa que a clínica não registrou.
 */

interface PlanoResumo {
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startedAt: string
  completedAt: string | null
  progresso: { feitas: number; total: number }
}

type Estado = 'feita' | 'atual' | 'futura'

interface Etapa {
  titulo: string
  detalhe: string
  estado: Estado
}

/* Hífen opcional: em 375px a palavra não cabe na coluna e quebra como
   "Acompanha-/mento", em vez de vazar sobre a borda do cartão. */
const ACOMPANHAMENTO = 'Acompanha\u00ADmento'

const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''

export function etapasDaJornada(appointments: Appointment[], plano: PlanoResumo | undefined): Etapa[] {
  const avaliacao = appointments
    .filter((a) => a.status === 'COMPLETED' && a.scheduledAt)
    .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1))[0]
  const avaliada = Boolean(avaliacao) || Boolean(plano)

  if (!plano) {
    return [
      { titulo: 'Avaliação', detalhe: avaliada ? dia(avaliacao?.scheduledAt) : 'Em breve', estado: avaliada ? 'feita' : 'atual' },
      { titulo: 'Plano', detalhe: avaliada ? 'Em definição' : 'Em breve', estado: avaliada ? 'atual' : 'futura' },
      { titulo: 'Sessões', detalhe: 'Em breve', estado: 'futura' },
      { titulo: ACOMPANHAMENTO, detalhe: 'Em breve', estado: 'futura' },
    ]
  }

  const { feitas, total } = plano.progresso
  const concluido = plano.status === 'COMPLETED' || (total > 0 && feitas >= total)
  const emSessoes = feitas > 0 && !concluido
  return [
    { titulo: 'Avaliação', detalhe: dia(avaliacao?.scheduledAt ?? plano.startedAt), estado: 'feita' },
    { titulo: 'Plano', detalhe: feitas > 0 || concluido ? 'Definido' : 'Em andamento', estado: feitas > 0 || concluido ? 'feita' : 'atual' },
    {
      titulo: 'Sessões',
      detalhe: concluido ? `${total} de ${total}` : emSessoes ? `${feitas} de ${total}` : 'Em breve',
      estado: concluido ? 'feita' : emSessoes ? 'atual' : 'futura',
    },
    { titulo: ACOMPANHAMENTO, detalhe: concluido ? 'Em andamento' : 'Em breve', estado: concluido ? 'atual' : 'futura' },
  ]
}

export function JourneySteps({ etapas }: { etapas: Etapa[] }) {
  return (
    <ol className="jornada-regua">
      {etapas.map((etapa, i) => (
        <li key={etapa.titulo} className={cn(`is-${etapa.estado}`)} aria-current={etapa.estado === 'atual' ? 'step' : undefined}>
          <span className="jornada-regua-marco" aria-hidden="true">
            {etapa.estado === 'feita' ? <Check size={18} strokeWidth={2.4} /> : i + 1}
          </span>
          <strong>{etapa.titulo}</strong>
          <span>{etapa.detalhe}</span>
          <span className="sr-only">{etapa.estado === 'feita' ? '(concluída)' : etapa.estado === 'atual' ? '(etapa atual)' : ''}</span>
        </li>
      ))}
    </ol>
  )
}
