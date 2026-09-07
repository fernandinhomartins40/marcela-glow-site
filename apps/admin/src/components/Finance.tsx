import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Ban,
  Check,
  FileText,
  Plus,
  Receipt as ReceiptIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { api, Chip, ConfirmDialog, errorMessage, Field, formatMoney,
  usePermissoes, Modal, parseMoney } from '../lib/ui'
import { Caixa } from './Caixa'

/**
 * Controle financeiro da clínica.
 *
 * A tela responde três perguntas, nesta ordem, porque é a ordem em que a
 * clínica pergunta: **quanto entrou**, **o que falta receber** e **o que ficou
 * sem lançamento**. Só depois vem a lista, que é onde se age.
 *
 * O que ficou sem lançamento aparece em destaque de propósito: no modelo antigo
 * um procedimento salvo sem valor sumia do faturamento em silêncio, e o número
 * do painel podia estar errado sem ninguém saber.
 */

const FORMAS: { valor: Metodo; label: string }[] = [
  { valor: 'PIX', label: 'Pix' },
  { valor: 'CASH', label: 'Dinheiro' },
  { valor: 'DEBIT', label: 'Cartão de débito' },
  { valor: 'CREDIT', label: 'Cartão de crédito' },
  { valor: 'TRANSFER', label: 'Transferência' },
  { valor: 'HEALTH_PLAN', label: 'Convênio' },
  { valor: 'OTHER', label: 'Outra' },
]

type Metodo = 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'HEALTH_PLAN' | 'OTHER'
type Situacao = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED'

interface Pagamento {
  id: string
  amountCents: number
  method: Metodo
  paidAt: string
  reference: string | null
}

interface Cobranca {
  id: string
  description: string
  amountCents: number
  discountCents: number
  status: Situacao
  issuedAt: string
  patient: { id: string; name: string; cpf: string | null }
  payments: Pagamento[]
  receipts: { id: string; number: number; year: number }[]
}

interface Dados {
  periodo: { de: string; ate: string }
  resumo: {
    cobradoCents: number
    recebidoCents: number
    aReceberCents: number
    canceladoCents: number
    porForma: Record<string, number>
    procedimentosSemCobranca: number
  }
  charges: Cobranca[]
}

const rotulo: Record<Situacao, { texto: string; tom: 'success' | 'warning' | 'neutral' }> = {
  PAID: { texto: 'Pago', tom: 'success' },
  PARTIAL: { texto: 'Pago em parte', tom: 'warning' },
  PENDING: { texto: 'A receber', tom: 'warning' },
  CANCELLED: { texto: 'Cancelada', tom: 'neutral' },
}

/** O mês em `AAAA-MM`, que é o que o input de mês entende. */
function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Finance() {
  const { pode } = usePermissoes()
  const [mes, setMes] = React.useState(mesAtual)
  const [pagando, setPagando] = React.useState<Cobranca | null>(null)
  const [cancelando, setCancelando] = React.useState<Cobranca | null>(null)
  const client = useQueryClient()

  const [ano, m] = mes.split('-').map(Number)
  const de = new Date(ano, m - 1, 1).toISOString()
  const ate = new Date(ano, m, 0, 23, 59, 59, 999).toISOString()

  const query = useQuery({
    queryKey: ['finance', mes],
    queryFn: async () => (await api.get('/finance', { params: { de, ate } })).data as Dados,
  })

  const emitir = useMutation({
    mutationFn: (id: string) => api.post(`/finance/charges/${id}/receipt`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['finance'] }),
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => api.post(`/finance/charges/${id}/cancel`),
    onSuccess: () => {
      setCancelando(null)
      client.invalidateQueries({ queryKey: ['finance'] })
    },
  })

  if (query.isLoading) return <p className="hint">Carregando o financeiro...</p>
  if (query.isError) return <p className="error">{errorMessage(query.error)}</p>
  if (!query.data) return null

  const { resumo, charges } = query.data

  return (
    <div className="fin">
      <div className="fin-topo">
        <label className="fin-mes">
          <span>Mês</span>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
      </div>

      {emitir.isError && <p className="error">{errorMessage(emitir.error)}</p>}

      {/* O caixa do dia vem antes do resumo do mês: no balcão a pergunta é
          sempre "como está hoje", e é ali que o fechamento acontece. */}
      <Caixa podeSupervisionar={pode('FINANCE_MANAGE')} />

      <section className="fin-resumo">
        <Numero
          icone={TrendingUp}
          rotulo="Recebido"
          valor={formatMoney(resumo.recebidoCents)}
          nota="O que entrou no caixa neste mês."
          destaque
        />
        <Numero
          icone={Wallet}
          rotulo="A receber"
          valor={formatMoney(resumo.aReceberCents)}
          nota="Cobranças lançadas e ainda não pagas."
        />
        <Numero
          icone={FileText}
          rotulo="Cobrado"
          valor={formatMoney(resumo.cobradoCents)}
          nota="O total do mês, pago ou não."
        />
      </section>

      {resumo.procedimentosSemCobranca > 0 && (
        <p className="fin-alerta">
          <AlertCircle size={15} aria-hidden="true" />
          <span>
            <strong>
              {resumo.procedimentosSemCobranca}{' '}
              {resumo.procedimentosSemCobranca === 1 ? 'procedimento' : 'procedimentos'}
            </strong>{' '}
            {resumo.procedimentosSemCobranca === 1 ? 'foi realizado' : 'foram realizados'} neste mês
            sem cobrança lançada — {resumo.procedimentosSemCobranca === 1 ? 'ele não entra' : 'eles não entram'}{' '}
            nos totais acima. Lance no atendimento da paciente, ou marque como cortesia.
          </span>
        </p>
      )}

      {Object.keys(resumo.porForma).length > 0 && (
        <section className="fin-formas">
          <h3>Como entrou</h3>
          <ul>
            {Object.entries(resumo.porForma)
              .sort((a, b) => b[1] - a[1])
              .map(([forma, valor]) => (
                <li key={forma}>
                  <span>{FORMAS.find((f) => f.valor === forma)?.label ?? forma}</span>
                  <strong>{formatMoney(valor)}</strong>
                </li>
              ))}
          </ul>
        </section>
      )}

      {charges.length === 0 ? (
        <p className="fin-vazio">
          Nenhuma cobrança lançada neste mês. Elas nascem ao registrar um procedimento no
          atendimento da paciente.
        </p>
      ) : (
        <section className="fin-lista">
          {charges.map((c) => {
            const pago = c.payments.reduce((s, p) => s + p.amountCents, 0)
            const devido = c.amountCents - c.discountCents
            const recibo = c.receipts[0]
            return (
              <article key={c.id} className={`fin-item is-${c.status.toLowerCase()}`}>
                <div className="fin-item-quem">
                  <strong>{c.patient.name}</strong>
                  <span>{c.description}</span>
                  <span className="fin-data">
                    {new Date(c.issuedAt).toLocaleDateString('pt-BR')}
                    {c.discountCents > 0 && ` · desconto de ${formatMoney(c.discountCents)}`}
                  </span>
                </div>

                <div className="fin-item-valor">
                  <strong>{formatMoney(devido)}</strong>
                  {c.status === 'PARTIAL' && (
                    <span className="fin-parcial">{formatMoney(pago)} pagos</span>
                  )}
                  <Chip tone={rotulo[c.status].tom}>{rotulo[c.status].texto}</Chip>
                </div>

                <div className="fin-item-acoes">
                  {c.status !== 'CANCELLED' && c.status !== 'PAID' && (
                    <button type="button" className="cms-btn primary" onClick={() => setPagando(c)}>
                      <Plus size={13} aria-hidden="true" />
                      Pagamento
                    </button>
                  )}
                  {recibo ? (
                    <Chip tone="neutral" icon={ReceiptIcon}>
                      Recibo {String(recibo.number).padStart(3, '0')}/{recibo.year}
                    </Chip>
                  ) : (
                    c.status !== 'CANCELLED' &&
                    pago > 0 && (
                      <button
                        type="button"
                        className="cms-btn"
                        onClick={() => emitir.mutate(c.id)}
                        disabled={emitir.isPending}
                      >
                        <ReceiptIcon size={13} aria-hidden="true" />
                        Emitir recibo
                      </button>
                    )
                  )}
                  {c.status !== 'CANCELLED' && !recibo && (
                    <button
                      type="button"
                      className="cms-btn cms-btn-danger"
                      onClick={() => setCancelando(c)}
                    >
                      <Ban size={13} aria-hidden="true" />
                      Cancelar
                    </button>
                  )}
                </div>

                {c.payments.length > 0 && (
                  <ul className="fin-pagamentos">
                    {c.payments.map((p) => (
                      <li key={p.id}>
                        <Check size={12} aria-hidden="true" />
                        {formatMoney(p.amountCents)} ·{' '}
                        {FORMAS.find((f) => f.valor === p.method)?.label ?? p.method} ·{' '}
                        {new Date(p.paidAt).toLocaleDateString('pt-BR')}
                        {p.reference && ` · ${p.reference}`}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </section>
      )}

      {pagando && (
        <FormPagamento
          cobranca={pagando}
          onClose={() => setPagando(null)}
          onSaved={() => {
            setPagando(null)
            client.invalidateQueries({ queryKey: ['finance'] })
          }}
        />
      )}

      {cancelando && (
        <ConfirmDialog
          title="Cancelar esta cobrança?"
          message={`"${cancelando.description}" de ${cancelando.patient.name} sai dos totais do mês. Ela continua no histórico como cancelada — apagar faria o mês deixar de bater com o que já foi declarado.`}
          confirmLabel="Cancelar cobrança"
          danger
          pending={cancelar.isPending}
          onCancel={() => setCancelando(null)}
          onConfirm={() => cancelar.mutate(cancelando.id)}
        />
      )}
    </div>
  )
}

function Numero({
  icone: Icone,
  rotulo,
  valor,
  nota,
  destaque,
}: {
  icone: typeof TrendingUp
  rotulo: string
  valor: string
  nota: string
  destaque?: boolean
}) {
  return (
    <div className={`fin-numero${destaque ? ' is-destaque' : ''}`}>
      <span className="fin-numero-rotulo">
        <Icone size={13} aria-hidden="true" />
        {rotulo}
      </span>
      <strong>{valor}</strong>
      <span className="fin-numero-nota">{nota}</span>
    </div>
  )
}

/**
 * Registrar um recebimento.
 *
 * O valor já vem preenchido com o que falta: o caso comum é a paciente pagar
 * tudo de uma vez, e obrigar a digitar o número que a tela acabou de mostrar é
 * trabalho sem propósito.
 */
function FormPagamento({
  cobranca,
  onClose,
  onSaved,
}: {
  cobranca: Cobranca
  onClose: () => void
  onSaved: () => void
}) {
  const pago = cobranca.payments.reduce((s, p) => s + p.amountCents, 0)
  const falta = cobranca.amountCents - cobranca.discountCents - pago

  const [valor, setValor] = React.useState(String((falta / 100).toFixed(2)).replace('.', ','))
  const [metodo, setMetodo] = React.useState<Metodo>('PIX')
  const [data, setData] = React.useState(new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = React.useState('')

  const salvar = useMutation({
    mutationFn: () =>
      api.post(`/finance/charges/${cobranca.id}/payments`, {
        amountCents: parseMoney(valor),
        method: metodo,
        paidAt: new Date(`${data}T12:00:00`).toISOString(),
        reference: referencia || undefined,
      }),
    onSuccess: onSaved,
  })

  return (
    <Modal
      title="Registrar pagamento"
      subtitle={`${cobranca.patient.name} · ${cobranca.description}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando...' : 'Registrar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {salvar.isError && <p className="error">{errorMessage(salvar.error)}</p>}

        <p className="hint">
          Em aberto: <strong>{formatMoney(falta)}</strong>
          {pago > 0 && ` · já pagos ${formatMoney(pago)}`}
        </p>

        <div className="form-row form-row-2">
          <Field label="Valor recebido" hint="Menor que o total registra pagamento parcial.">
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Data">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>

        <Field label="Forma de pagamento">
          <select value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
            {FORMAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Referência"
          hint="Número da máquina, id do Pix — o que permite conferir depois. Opcional."
        >
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
