import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Banknote,
  Check,
  CircleCheck,
  Lock,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import {
  api,
  Chip,
  errorMessage,
  Field,
  formatMoney,
  parseMoney,
  SubmitButton,
} from '../lib/ui'

/**
 * Caixa do dia.
 *
 * O sistema sempre soube quanto foi recebido — a soma dos pagamentos. Faltava a
 * outra metade da conferência: quanto a secretária *conta* na gaveta ao fim do
 * expediente. A diferença entre as duas é o que revela troco errado, lançamento
 * esquecido ou furo.
 *
 * A contagem é cega. Enquanto o caixa está aberto, quem vai contar não vê o
 * esperado — a API nem manda o número. Mostrá-lo antes transformaria a
 * conferência em confirmação, e um furo passaria sem ninguém notar.
 */

interface Sessao {
  id: string
  status: 'OPEN' | 'CLOSED' | 'APPROVED'
  openingCents: number
  countedCashCents: number | null
  expectedCashCents: number | null
  differenceCents: number | null
  totalReceivedCents: number | null
  notes: string | null
  closedAt: string | null
  approvedAt: string | null
  reviewNotes: string | null
  closedBy?: { id: string; name: string } | null
  approvedBy?: { id: string; name: string } | null
}

interface DadosCaixa {
  dia: string
  sessao: Sessao | null
  recebido: { totalCents: number; quantidade: number; porMeio: Record<string, number> }
  /** `null` enquanto o caixa está aberto para quem só opera — a contagem é cega. */
  esperadoDinheiroCents: number | null
}

const MEIOS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferência',
  HEALTH_PLAN: 'Convênio',
  OTHER: 'Outro',
}

export function Caixa({ podeSupervisionar }: { podeSupervisionar: boolean }) {
  const client = useQueryClient()
  const [contado, setContado] = React.useState('')
  const [observacao, setObservacao] = React.useState('')
  const [erro, setErro] = React.useState('')

  const query = useQuery({
    queryKey: ['caixa'],
    queryFn: async () => (await api.get('/finance/cash')).data as DadosCaixa,
  })

  const atualizar = () => {
    client.invalidateQueries({ queryKey: ['caixa'] })
    client.invalidateQueries({ queryKey: ['finance'] })
  }

  const fechar = useMutation({
    mutationFn: async () =>
      (
        await api.post('/finance/cash/close', {
          countedCashCents: parseMoney(contado) ?? 0,
          notes: observacao.trim() || undefined,
        })
      ).data,
    onSuccess: () => {
      atualizar()
      setContado('')
      setObservacao('')
    },
    onError: (e) => setErro(errorMessage(e, 'Não foi possível fechar o caixa.')),
  })

  const aprovar = useMutation({
    mutationFn: async (id: string) => (await api.post(`/finance/cash/${id}/approve`, {})).data,
    onSuccess: atualizar,
    onError: (e) => setErro(errorMessage(e, 'Não foi possível aprovar.')),
  })

  if (query.isLoading) return <p className="hint">Carregando o caixa...</p>
  if (query.isError) return <p className="error">{errorMessage(query.error)}</p>
  if (!query.data) return null

  const { sessao, recebido } = query.data
  const aberto = !sessao || sessao.status === 'OPEN'
  const meios = Object.entries(recebido.porMeio).filter(([, v]) => v > 0)

  return (
    <section className="caixa">
      <header className="caixa-topo">
        <h3>
          <Wallet size={16} aria-hidden="true" />
          Caixa de hoje
        </h3>
        {sessao?.status === 'APPROVED' ? (
          <Chip tone="success">
            <ShieldCheck size={12} aria-hidden="true" />
            Conferido
          </Chip>
        ) : sessao?.status === 'CLOSED' ? (
          <Chip tone="info">
            <Lock size={12} aria-hidden="true" />
            Fechado
          </Chip>
        ) : (
          <Chip tone="warning">Aberto</Chip>
        )}
      </header>

      <div className="caixa-numeros">
        <div className="caixa-numero">
          <span className="caixa-rotulo">Recebido hoje</span>
          <strong>{formatMoney(recebido.totalCents)}</strong>
          <span className="hint">
            {recebido.quantidade} {recebido.quantidade === 1 ? 'lançamento' : 'lançamentos'}
          </span>
        </div>
        {meios.map(([meio, valor]) => (
          <div key={meio} className="caixa-numero">
            <span className="caixa-rotulo">{MEIOS[meio] ?? meio}</span>
            <strong>{formatMoney(valor)}</strong>
          </div>
        ))}
      </div>

      {erro && <p className="error">{erro}</p>}

      {aberto ? (
        <form
          className="caixa-fechamento"
          onSubmit={(e) => {
            e.preventDefault()
            setErro('')
            fechar.mutate()
          }}
        >
          <p className="hint caixa-explica">
            <Banknote size={14} aria-hidden="true" />
            Conte o dinheiro da gaveta e informe o valor. O sistema compara com o esperado e
            registra a diferença — por isso o valor esperado só aparece depois.
          </p>
          <div className="caixa-form">
            <Field label="Dinheiro contado na gaveta" required>
              <input
                value={contado}
                onChange={(e) => setContado(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </Field>
            <Field label="Observação" hint="Explique uma sobra ou falta, se houver.">
              <input value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={1000} />
            </Field>
          </div>
          <SubmitButton pending={fechar.isPending} disabled={!contado.trim()}>
            <Lock size={14} aria-hidden="true" />
            Fechar caixa do dia
          </SubmitButton>
        </form>
      ) : (
        <Conferencia
          sessao={sessao!}
          podeSupervisionar={podeSupervisionar}
          aprovando={aprovar.isPending}
          onAprovar={() => aprovar.mutate(sessao!.id)}
        />
      )}
    </section>
  )
}

function Conferencia({
  sessao,
  podeSupervisionar,
  aprovando,
  onAprovar,
}: {
  sessao: Sessao
  podeSupervisionar: boolean
  aprovando: boolean
  onAprovar: () => void
}) {
  const diferenca = sessao.differenceCents ?? 0
  const bate = diferenca === 0

  return (
    <div className="caixa-conferencia">
      <div className="caixa-numeros">
        <div className="caixa-numero">
          <span className="caixa-rotulo">Esperado em dinheiro</span>
          <strong>{formatMoney(sessao.expectedCashCents ?? 0)}</strong>
        </div>
        <div className="caixa-numero">
          <span className="caixa-rotulo">Contado</span>
          <strong>{formatMoney(sessao.countedCashCents ?? 0)}</strong>
        </div>
        <div className={`caixa-numero ${bate ? '' : 'caixa-divergente'}`}>
          <span className="caixa-rotulo">Diferença</span>
          <strong>
            {/* O sinal importa mais que o número: sobra e falta pedem conversas
                diferentes com quem operou o caixa. */}
            {diferenca > 0 ? '+' : ''}
            {formatMoney(diferenca)}
          </strong>
          <span className="hint">{bate ? 'Caixa bateu' : diferenca > 0 ? 'Sobra' : 'Falta'}</span>
        </div>
      </div>

      {!bate && (
        <p className="caixa-alerta">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            O contado não bate com o esperado.{' '}
            {sessao.notes ? <>Observação: {sessao.notes}</> : 'Sem observação registrada.'}
          </span>
        </p>
      )}

      <p className="hint">
        Fechado por {sessao.closedBy?.name ?? 'equipe'}
        {sessao.approvedAt && sessao.approvedBy
          ? ` · Conferido por ${sessao.approvedBy.name}`
          : ''}
      </p>

      {sessao.status === 'CLOSED' &&
        (podeSupervisionar ? (
          <button className="primary" onClick={onAprovar} disabled={aprovando}>
            <CircleCheck size={14} aria-hidden="true" />
            Conferir e aprovar
          </button>
        ) : (
          <p className="hint">
            <Check size={13} aria-hidden="true" /> Aguardando conferência da Dra. Marcela.
          </p>
        ))}
    </div>
  )
}
