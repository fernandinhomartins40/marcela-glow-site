import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Cake,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileSignature,
  Plus,
  Snowflake,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Painel de controle da clínica.
 *
 * A pergunta que ele responde é "o que precisa de mim agora", não "quantos
 * pacientes existem no total" — esse número só cresce e nunca mudou uma decisão.
 *
 * A ordem da página é a ordem em que a clínica pensa ao abrir o sistema:
 *
 * 1. **O que está travado** — pedidos por confirmar, receitas por assinar,
 *    contatos parados. Vem primeiro porque é o único bloco que some quando o
 *    trabalho é feito; se não houver nada pendente, ele não aparece.
 * 2. **O dia** — quem chega, a que horas, e quanto falta para a próxima.
 * 3. **O mês** — receita comparada ao mês passado até o mesmo dia, e não um
 *    número solto que ninguém sabe se é bom.
 * 4. **A semana e as pessoas** — o que vem depois de hoje, e quem faz
 *    aniversário.
 *
 * Cada bloco leva a uma tela onde a coisa se resolve. Um painel que só informa
 * obriga a pessoa a procurar de novo o que ele acabou de mostrar.
 */

interface Consulta {
  id: string
  name: string
  scheduledAt: string | null
  endsAt: string | null
  status: string
  patient: { id: string; name: string } | null
  procedure: { title: string } | null
}

export interface DashboardData {
  hoje: Consulta[]
  proximos: Consulta[]
  pendencias: {
    aConfirmar: number
    semHorario: number
    receitasParaAssinar: number
    leadsParados: number
  }
  mes: {
    receitaCents: number
    receitaMesPassadoCents: number
    atendimentos: number
    pacientesNovos: number
    ticketMedioCents: number
  }
  saude: { taxaCancelamento: number; cancelados30: number; concluidos30: number }
  aniversariantes: { id: string; name: string; birthDate: string }[]
  funil: Record<string, number>
}

const dinheiro = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'

const diaCurto = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : ''

export function Dashboard({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const { pendencias, mes, saude, hoje, proximos, aniversariantes } = data

  const totalPendente =
    pendencias.aConfirmar +
    pendencias.semHorario +
    pendencias.receitasParaAssinar +
    pendencias.leadsParados

  /* A próxima consulta ainda por vir hoje — o relógio da recepção. Uma consulta
     que já começou continua sendo "a de agora" até terminar. */
  const agora = Date.now()
  const emAndamento = hoje.find(
    (c) =>
      c.scheduledAt &&
      new Date(c.scheduledAt).getTime() <= agora &&
      (!c.endsAt || new Date(c.endsAt).getTime() > agora),
  )
  const proximaHoje = hoje.find((c) => c.scheduledAt && new Date(c.scheduledAt).getTime() > agora)

  return (
    <div className="painel">
      {totalPendente > 0 && (
        <section className="painel-alertas" aria-label="O que precisa de atenção">
          <h2>
            <AlertCircle size={15} aria-hidden="true" />
            Precisa de você
          </h2>
          <div className="painel-alertas-grade">
            <Pendencia
              n={pendencias.aConfirmar}
              icone={CalendarClock}
              titulo="a confirmar"
              texto="Horário marcado que ninguém confirmou com a paciente."
              acao={() => navigate('/appointments')}
            />
            <Pendencia
              n={pendencias.semHorario}
              icone={ClipboardList}
              titulo="sem horário"
              texto="Pedido que chegou pelo site e ainda não foi encaixado."
              acao={() => navigate('/appointments')}
            />
            <Pendencia
              n={pendencias.receitasParaAssinar}
              icone={FileSignature}
              titulo="por assinar"
              texto="Documento escrito e não assinado — a paciente não pode usar."
              acao={() => navigate('/documents')}
            />
            <Pendencia
              n={pendencias.leadsParados}
              icone={Snowflake}
              titulo="contatos parados"
              texto="Sem movimento há mais de 30 dias no funil."
              acao={() => navigate('/leads')}
            />
          </div>
        </section>
      )}

      <div className="painel-corpo">
        <section className="painel-card painel-dia">
          <header>
            <div>
              <h2>
                <CalendarDays size={15} aria-hidden="true" />
                Hoje
              </h2>
              <p>
                {hoje.length === 0
                  ? 'Nenhuma consulta marcada para hoje.'
                  : `${hoje.length} ${hoje.length === 1 ? 'consulta' : 'consultas'} na agenda.`}
              </p>
            </div>
            <div className="painel-acoes">
              <button type="button" onClick={() => navigate('/appointments')}>
                <Plus size={14} aria-hidden="true" />
                Novo agendamento
              </button>
              <button type="button" onClick={() => navigate('/patients')}>
                <UserPlus size={14} aria-hidden="true" />
                Nova paciente
              </button>
            </div>
          </header>

          {(emAndamento || proximaHoje) && (
            <div className={`painel-agora${emAndamento ? ' is-live' : ''}`}>
              <span className="painel-agora-tag">
                <Clock size={12} aria-hidden="true" />
                {emAndamento ? 'Em atendimento' : 'A próxima'}
              </span>
              <strong>
                {(emAndamento ?? proximaHoje)!.patient?.name ?? (emAndamento ?? proximaHoje)!.name}
              </strong>
              <span className="painel-agora-quando">
                {hora((emAndamento ?? proximaHoje)!.scheduledAt)}
                {' · '}
                {(emAndamento ?? proximaHoje)!.procedure?.title ?? 'Consulta'}
              </span>
              <button type="button" onClick={() => navigate('/encounter')}>
                Abrir atendimento
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}

          {hoje.length === 0 ? (
            <p className="painel-vazio">
              O dia está livre. Os pedidos que chegarem pelo site aparecem aqui e em
              <button type="button" className="painel-link" onClick={() => navigate('/appointments')}>
                Agenda
              </button>
              .
            </p>
          ) : (
            <ol className="painel-horarios">
              {hoje.map((c) => {
                const passou = c.endsAt ? new Date(c.endsAt).getTime() < agora : false
                return (
                  <li
                    key={c.id}
                    className={`${passou ? 'is-passado' : ''}${c === emAndamento ? ' is-agora' : ''}`}
                  >
                    <time>{hora(c.scheduledAt)}</time>
                    <div>
                      <strong>{c.patient?.name ?? c.name}</strong>
                      <span>{c.procedure?.title ?? 'Consulta'}</span>
                    </div>
                    {c.status === 'PENDING' ? (
                      <span className="painel-tag is-warn">a confirmar</span>
                    ) : (
                      <span className="painel-tag is-ok">
                        <CheckCircle2 size={11} aria-hidden="true" />
                        confirmada
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section className="painel-card">
          <header>
            <div>
              <h2>O mês</h2>
              <p>Comparado ao mês passado, até o mesmo dia.</p>
            </div>
          </header>
          <Receita atual={mes.receitaCents} anterior={mes.receitaMesPassadoCents} />
          <div className="painel-numeros">
            <Numero rotulo="Atendimentos" valor={String(mes.atendimentos)} />
            <Numero rotulo="Ticket médio" valor={dinheiro(mes.ticketMedioCents)} />
            <Numero rotulo="Pacientes novas" valor={String(mes.pacientesNovos)} />
          </div>
        </section>

        <section className="painel-card">
          <header>
            <div>
              <h2>Próximos sete dias</h2>
              <p>O que vem depois de hoje.</p>
            </div>
            <div className="painel-acoes">
              <button type="button" onClick={() => navigate('/appointments')}>
                Ver a agenda
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </header>
          {proximos.length === 0 ? (
            <p className="painel-vazio">Nada marcado para os próximos sete dias.</p>
          ) : (
            <ol className="painel-horarios">
              {proximos.map((c) => (
                <li key={c.id}>
                  <time className="is-largo">{diaCurto(c.scheduledAt)}</time>
                  <div>
                    <strong>{c.patient?.name ?? c.name}</strong>
                    <span>
                      {hora(c.scheduledAt)} · {c.procedure?.title ?? 'Consulta'}
                    </span>
                  </div>
                  {c.status === 'PENDING' && <span className="painel-tag is-warn">a confirmar</span>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="painel-card">
          <header>
            <div>
              <h2>Faltas e cancelamentos</h2>
              <p>Nos últimos 30 dias.</p>
            </div>
          </header>
          {saude.cancelados30 + saude.concluidos30 === 0 ? (
            <p className="painel-vazio">Ainda não há atendimentos concluídos no período.</p>
          ) : (
            <>
              <div className="painel-barra" role="img" aria-label={`${saude.taxaCancelamento}% cancelados`}>
                <span style={{ width: `${saude.taxaCancelamento}%` }} />
              </div>
              <p className="painel-legenda">
                <strong>{saude.taxaCancelamento}%</strong> cancelados — {saude.cancelados30} de{' '}
                {saude.cancelados30 + saude.concluidos30} consultas.
              </p>
            </>
          )}
        </section>

        <section className="painel-card">
          <header>
            <div>
              <h2>
                <Cake size={15} aria-hidden="true" />
                Aniversariantes do mês
              </h2>
              <p>Uma mensagem no dia costuma trazer a paciente de volta.</p>
            </div>
          </header>
          {aniversariantes.length === 0 ? (
            <p className="painel-vazio">Nenhuma paciente faz aniversário este mês.</p>
          ) : (
            <ul className="painel-pessoas">
              {aniversariantes.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => navigate(`/patients?id=${p.id}`)}>
                    <span className="painel-dia-mes">
                      {new Date(p.birthDate).getUTCDate().toString().padStart(2, '0')}
                    </span>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/** Um cartão de pendência. Zero não aparece: nada a fazer não é informação. */
function Pendencia({
  n,
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  n: number
  icone: LucideIcon
  titulo: string
  texto: string
  acao: () => void
}) {
  if (n === 0) return null
  return (
    <button type="button" className="painel-pendencia" onClick={acao}>
      <Icone size={16} aria-hidden="true" />
      <span className="painel-pendencia-n">{n}</span>
      <span className="painel-pendencia-titulo">{titulo}</span>
      <span className="painel-pendencia-texto">{texto}</span>
      <ArrowRight className="painel-pendencia-seta" size={14} aria-hidden="true" />
    </button>
  )
}

/**
 * A receita do mês com a comparação embutida.
 *
 * O número sozinho não diz nada — R$ 11.200 é bom ou ruim? Ao lado do mesmo
 * período do mês passado, vira uma frase que se lê de uma vez.
 */
function Receita({ atual, anterior }: { atual: number; anterior: number }) {
  const variacao = anterior ? Math.round(((atual - anterior) / anterior) * 100) : null
  const subiu = variacao !== null && variacao >= 0

  return (
    <div className="painel-receita">
      <strong>{dinheiro(atual)}</strong>
      {variacao === null ? (
        <span className="painel-receita-nota">sem base de comparação no mês passado</span>
      ) : (
        <span className={`painel-receita-var${subiu ? ' is-up' : ' is-down'}`}>
          {subiu ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
          {subiu ? '+' : ''}
          {variacao}% · {dinheiro(anterior)} no mês passado
        </span>
      )}
    </div>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="painel-numero">
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  )
}
