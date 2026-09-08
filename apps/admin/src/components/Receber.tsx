import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Banknote, Check, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react'
import {
  api,
  errorMessage,
  Field,
  formatMoney,
  Modal,
  parseMoney,
  SubmitButton,
} from '../lib/ui'

/**
 * Receber no balcão.
 *
 * A recepção só via "Receber" quando já existia cobrança lançada — e a cobrança
 * só nasce quando a médica registra o procedimento, depois do atendimento. Na
 * prática a paciente chegava, saía, e nunca havia o que cobrar.
 *
 * Aqui a cobrança nasce no momento do recebimento, com o valor vindo do plano
 * de tratamento. A escolha entre pagar a sessão do dia ou o pacote inteiro é da
 * secretária, no balcão, porque é ali que a paciente decide.
 */

export interface Pendencia {
  appointmentId: string
  patientId: string
  emAberto: { id: string; descricao: string; restanteCents: number }[]
  totalEmAbertoCents: number
  plano: {
    id: string
    titulo: string
    feitas: number
    total: number
    restantes: number
    precoSessaoCents: number | null
    precoPacoteCents: number | null
    quitado: boolean
  } | null
  precoAvulsoCents: number | null
}

const MEIOS = [
  { id: 'CASH', rotulo: 'Dinheiro', icone: Banknote },
  { id: 'PIX', rotulo: 'Pix', icone: Smartphone },
  { id: 'DEBIT', rotulo: 'Débito', icone: CreditCard },
  { id: 'CREDIT', rotulo: 'Crédito', icone: CreditCard },
  { id: 'TRANSFER', rotulo: 'Transferência', icone: Landmark },
  { id: 'HEALTH_PLAN', rotulo: 'Convênio', icone: Wallet },
] as const

type Escolha = 'sessao' | 'pacote' | 'aberto'

export function Receber({
  pendencia,
  nome,
  onClose,
}: {
  pendencia: Pendencia
  nome: string
  onClose: () => void
}) {
  const client = useQueryClient()
  const { plano, emAberto, totalEmAbertoCents } = pendencia

  /* A cobrança já lançada tem precedência: se a médica registrou o
     procedimento, o valor dela inclui desconto e ajuste que a tabela não sabe.
     Sem ela, o padrão é a sessão do dia — o caso comum do balcão. */
  const inicial: Escolha = totalEmAbertoCents > 0 ? 'aberto' : 'sessao'
  const [escolha, setEscolha] = React.useState<Escolha>(inicial)
  const [meio, setMeio] = React.useState<string>('PIX')
  const [valor, setValor] = React.useState('')
  const [desconto, setDesconto] = React.useState('')
  const [erro, setErro] = React.useState('')

  const opcoes = [
    totalEmAbertoCents > 0 && {
      id: 'aberto' as const,
      rotulo: emAberto.length === 1 ? emAberto[0].descricao : `${emAberto.length} cobranças em aberto`,
      valor: totalEmAbertoCents,
      nota: 'Lançado pela médica',
    },
    plano &&
      plano.precoSessaoCents && {
        id: 'sessao' as const,
        rotulo: `Sessão de hoje — ${plano.titulo}`,
        valor: plano.precoSessaoCents,
        nota: `${plano.feitas + 1}ª de ${plano.total}`,
      },
    plano &&
      plano.precoPacoteCents &&
      plano.restantes > 1 && {
        id: 'pacote' as const,
        rotulo: `Pacote — ${plano.titulo}`,
        valor: plano.precoPacoteCents,
        nota: `${plano.restantes} sessões restantes`,
      },
    !plano &&
      pendencia.precoAvulsoCents && {
        id: 'sessao' as const,
        rotulo: 'Atendimento de hoje',
        valor: pendencia.precoAvulsoCents,
        nota: 'Preço de tabela',
      },
  ].filter(Boolean) as { id: Escolha; rotulo: string; valor: number; nota: string }[]

  const opcao = opcoes.find((o) => o.id === escolha) ?? opcoes[0]
  const descontoCents = parseMoney(desconto) ?? 0
  /* O campo de valor fica vazio até a secretária querer mudá-lo: preenchido, a
     escolha acima passa a ser sugestão, não regra. */
  const aReceber = (parseMoney(valor) ?? Math.max((opcao?.valor ?? 0) - descontoCents, 0))

  const receber = useMutation({
    mutationFn: async () =>
      (
        await api.post('/finance/receive', {
          patientId: pendencia.patientId,
          chargeId: escolha === 'aberto' ? emAberto[0]?.id : undefined,
          planId: escolha !== 'aberto' ? plano?.id : undefined,
          coversPlan: escolha === 'pacote',
          amountCents: aReceber,
          discountCents: escolha === 'aberto' ? 0 : descontoCents,
          method: meio,
          description: escolha === 'aberto' ? undefined : opcao?.rotulo,
        })
      ).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['pendencias-hoje'] })
      client.invalidateQueries({ queryKey: ['finance'] })
      client.invalidateQueries({ queryKey: ['finance-aberto'] })
      client.invalidateQueries({ queryKey: ['caixa'] })
      onClose()
    },
    onError: (e) => setErro(errorMessage(e, 'Não foi possível registrar o pagamento.')),
  })

  return (
    <Modal
      title={`Receber de ${nome}`}
      subtitle={plano ? `${plano.feitas} de ${plano.total} sessões realizadas` : undefined}
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton
            pending={receber.isPending}
            disabled={aReceber <= 0}
            onClick={() => receber.mutate()}
          >
            <Check size={14} aria-hidden="true" />
            Receber {formatMoney(aReceber)}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {erro && <p className="error">{erro}</p>}

        {opcoes.length === 0 ? (
          <p className="hint">
            Nenhum valor a cobrar. O procedimento ainda não tem preço cadastrado — informe o valor
            abaixo ou defina o preço em Cadastros.
          </p>
        ) : (
          <div className="receber-opcoes" role="radiogroup" aria-label="O que cobrar">
            {opcoes.map((o) => (
              <button
                key={o.id + o.rotulo}
                type="button"
                role="radio"
                aria-checked={escolha === o.id}
                className={escolha === o.id ? 'receber-opcao ativa' : 'receber-opcao'}
                onClick={() => {
                  setEscolha(o.id)
                  setValor('')
                }}
              >
                <span className="receber-opcao-texto">
                  <strong>{o.rotulo}</strong>
                  <span>{o.nota}</span>
                </span>
                <strong className="receber-opcao-valor">{formatMoney(o.valor)}</strong>
              </button>
            ))}
          </div>
        )}

        <div className="receber-meios" role="radiogroup" aria-label="Forma de pagamento">
          {MEIOS.map((m) => {
            const Icone = m.icone
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={meio === m.id}
                className={meio === m.id ? 'receber-meio ativo' : 'receber-meio'}
                onClick={() => setMeio(m.id)}
              >
                <Icone size={15} aria-hidden="true" />
                {m.rotulo}
              </button>
            )
          })}
        </div>

        <div className="receber-ajustes">
          <Field label="Valor recebido" hint="Deixe em branco para usar o valor acima.">
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={formatMoney(Math.max((opcao?.valor ?? 0) - descontoCents, 0))}
              inputMode="decimal"
            />
          </Field>
          {escolha !== 'aberto' && (
            <Field label="Desconto" hint="Fica registrado à parte do valor.">
              <input
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </Field>
          )}
        </div>
      </div>
    </Modal>
  )
}
