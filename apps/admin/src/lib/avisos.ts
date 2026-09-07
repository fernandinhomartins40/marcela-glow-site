import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, usePermissoes } from './ui'

/**
 * Os avisos entre o consultório e a recepção.
 *
 * O painel não tem WebSocket nem SSE — pergunta "há avisos novos?" a cada dez
 * segundos. Para o volume de um consultório isso resolve: o atraso máximo é
 * imperceptível para "pode entrar", e não exige conexão permanente, ajuste de
 * proxy nem reconexão. Se um dia a clínica crescer a ponto de isso pesar, o
 * caminho é trocar esta consulta por um fluxo — as telas não mudam.
 */

export type TipoAviso =
  | 'CALL_PATIENT'
  | 'CALL_STAFF'
  | 'PATIENT_RELEASED'
  | 'NEED_DOCTOR'
  | 'NOTE'

export interface Aviso {
  id: string
  kind: TipoAviso
  body: string | null
  createdAt: string
  seenAt: string | null
  createdById: string | null
  appointment: { id: string; name: string; scheduledAt: string | null; patientId: string | null } | null
  createdBy: { id: string; name: string } | null
}

interface Resposta {
  alertas: Aviso[]
  pendentes: number
}

/** O rótulo de cada aviso, do ponto de vista de quem o recebe. */
export const AVISO_TEXTO: Record<TipoAviso, string> = {
  CALL_PATIENT: 'Pode mandar a paciente entrar',
  CALL_STAFF: 'A Dra. Marcela chama no consultório',
  PATIENT_RELEASED: 'Paciente saiu do consultório',
  NEED_DOCTOR: 'A recepção precisa falar com você',
  NOTE: 'Recado',
}

export function useAvisos(intervaloMs = 10_000) {
  const client = useQueryClient()
  const { usuarioId } = usePermissoes()

  const query = useQuery({
    queryKey: ['avisos'],
    queryFn: async () => (await api.get('/alerts')).data as Resposta,
    refetchInterval: intervaloMs,
    /* Voltar para a aba deve mostrar o que chegou enquanto ela estava em
       segundo plano — no balcão a tela fica aberta o dia todo. */
    refetchOnWindowFocus: true,
  })

  const atualizar = () => client.invalidateQueries({ queryKey: ['avisos'] })

  const enviar = useMutation({
    mutationFn: async (dados: { kind: TipoAviso; appointmentId?: string; body?: string }) =>
      (await api.post('/alerts', dados)).data as Aviso,
    onSuccess: atualizar,
  })

  const marcarVisto = useMutation({
    mutationFn: async (id: string) => (await api.post(`/alerts/${id}/seen`)).data,
    onSuccess: atualizar,
  })

  const alertas = query.data?.alertas ?? []

  return {
    alertas,
    /* Só o que ainda não foi visto e não foi enviado por quem está olhando: o
       botão que a médica acabou de apertar não deve piscar na tela dela. */
    pendentes: query.data?.pendentes ?? 0,
    naoVistos: alertas.filter((a) => !a.seenAt && a.createdById !== usuarioId),
    carregando: query.isLoading,
    enviar,
    marcarVisto,
  }
}
