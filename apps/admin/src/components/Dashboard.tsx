import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Cake,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileSignature,
  Snowflake,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * A central do dia da clínica.
 *
 * A pergunta que ela responde é "o que precisa de mim agora", não "quantos
 * pacientes existem no total" — esse número só cresce e nunca mudou uma decisão.
 *
 * A ordem segue o mockup aprovado e a ordem em que a clínica pensa:
 *
 * 1. **O que está travado** — a faixa de confirmação no topo e as "Atenções do
 *    dia" na lateral. Somem quando o trabalho é feito.
 * 2. **O fluxo** — chegada → consulta → saída → cobrança, com quantas pessoas
 *    estão em cada etapa agora.
 * 3. **As filas** — cada consulta de hoje com a próxima ação, e quem já está
 *    na sala de espera.
 * 4. **O resto** — próximas consultas, o mês, faltas e aniversariantes.
 *
 * Cada botão leva à tela onde a coisa se resolve. A central não confirma,
 * não registra chegada nem cobra: ela aponta. Um painel que só informa obriga a
 * pessoa a procurar de novo o que ele acabou de mostrar.
 *
 * As listas mostram iniciais, não o nome: a tela do balcão fica à vista de
 * quem espera. O nome completo aparece ao passar o mouse e na tela de destino.
 */

interface Consulta {
  id: string
  name: string
  scheduledAt: string | null
  endsAt: string | null
  status: string
  arrivedAt?: string | null
  calledAt?: string | null
  releasedAt?: string | null
  /** Só vem para quem opera ou supervisiona o caixa. */
  cobrancaAberta?: boolean
  patient: { id: string; name: string } | null
  procedure: { title: string } | null
}

export interface DashboardData {
  hoje: Consulta[]
  proximos: Consulta[]
  fluxo?: {
    aChegar: number
    naEspera: number
    emConsulta: number
    finalizadas: number
    cobrancasAbertas: number | null
  } | null
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
  } | null
  saude: { taxaCancelamento: number; cancelados30: number; concluidos30: number } | null
  aniversariantes: { id: string; name: string; birthDate: string }[]
  funil: Record<string, number>
}

const dinheiro = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const hora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'

const diaCurto = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : ''

/** "Ana Paula Souza" → "A. S." */
const sigla = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '—'
  const letras = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : [partes[0]]
  return letras.map((p) => `${p[0].toUpperCase()}.`).join(' ')
}

const nomeDe = (c: Consulta) => c.patient?.name ?? c.name

/** Tolerância antes de uma paciente que não chegou virar "atrasada". */
const ATRASO_MS = 15 * 60 * 1000

type Tom = 'ok' | 'warn' | 'danger' | 'live' | 'info' | 'neutral'

interface Etapa {
  rotulo: string
  tom: Tom
  proxima: string
  acao?: { rotulo: string; destino: string; forte?: boolean }
}

export function Dashboard({ data, permissions }: { data: DashboardData; permissions: string[] }) {
  const navigate = useNavigate()
  const { pendencias, mes, saude, hoje, proximos, aniversariantes, fluxo } = data
  const pode = (permissao: string) => permissions.includes(permissao)
  const destinoConfirmacao = pode('FINANCE_OPERATE') ? '/reception' : '/appointments'
  const agora = Date.now()

  const totalPendente =
    (pode('APPOINTMENT_WRITE') ? pendencias.aConfirmar + pendencias.semHorario : 0) +
    (pode('PRESCRIPTION_SIGN') ? pendencias.receitasParaAssinar : 0) +
    (pode('LEAD_WRITE') ? pendencias.leadsParados : 0) +
    (fluxo?.cobrancasAbertas ?? 0)

  /* Onde a consulta está e o que falta fazer. As etapas espelham a Recepção:
     chegou → foi chamada → saiu. Cada ação só aparece para quem pode abri-la. */
  const etapa = (c: Consulta): Etapa => {
    if (c.releasedAt || c.status === 'COMPLETED') {
      if (c.cobrancaAberta) {
        return { rotulo: 'Cobrança em aberto', tom: 'warn', proxima: 'Conferir cobrança', acao: { rotulo: 'Conferir cobrança', destino: pode('FINANCE_OPERATE') ? '/reception' : '/finance', forte: true } }
      }
      return { rotulo: 'Consulta finalizada', tom: 'ok', proxima: c.cobrancaAberta === false ? 'Tudo certo' : 'Saiu do consultório' }
    }
    if (c.calledAt) {
      return { rotulo: 'Em consulta', tom: 'live', proxima: 'Aguardar término', acao: pode('RECORD_WRITE') ? { rotulo: 'Abrir prontuário', destino: '/encounter' } : undefined }
    }
    if (c.arrivedAt) {
      return {
        rotulo: 'Na sala de espera',
        tom: 'info',
        proxima: 'Chamar para a consulta',
        acao: pode('RECORD_WRITE')
          ? { rotulo: 'Chamar paciente', destino: '/encounter', forte: true }
          : pode('FINANCE_OPERATE') ? { rotulo: 'Ver recepção', destino: '/reception' } : undefined,
      }
    }
    if (c.status === 'PENDING') {
      return { rotulo: 'Aguardando confirmação', tom: 'warn', proxima: 'Entrar em contato', acao: pode('APPOINTMENT_WRITE') ? { rotulo: 'Confirmar horário', destino: destinoConfirmacao, forte: true } : undefined }
    }
    const atrasada = c.scheduledAt && new Date(c.scheduledAt).getTime() + ATRASO_MS < agora
    const chegada = pode('FINANCE_OPERATE')
      ? { rotulo: 'Registrar chegada', destino: '/reception', forte: Boolean(atrasada) }
      : { rotulo: 'Ver na agenda', destino: '/appointments' }
    return atrasada
      ? { rotulo: 'Não chegou', tom: 'danger', proxima: 'Entrar em contato', acao: chegada }
      : { rotulo: 'Aguardando chegada', tom: 'neutral', proxima: 'Registrar chegada', acao: chegada }
  }

  const naSala = hoje.filter((c) => c.arrivedAt && !c.calledAt && !c.releasedAt && c.status !== 'COMPLETED')
  /* A lateral mostra o que vem pela frente: o resto de hoje e, se sobrar
     espaço, os próximos dias. */
  const aindaHoje = hoje.filter((c) => !c.arrivedAt && c.status !== 'COMPLETED' && c.scheduledAt && new Date(c.scheduledAt).getTime() > agora)
  const proximasConsultas = [...aindaHoje, ...proximos].slice(0, 6)

  return (
    <div className="painel">
      {pode('APPOINTMENT_WRITE') && pendencias.aConfirmar > 0 && (
        <section className="painel-faixa" aria-label="Confirmações pendentes">
          <span className="painel-faixa-icone" aria-hidden="true"><AlertCircle size={20} /></span>
          <div>
            <strong>
              {pendencias.aConfirmar} {pendencias.aConfirmar === 1 ? 'paciente aguarda' : 'pacientes aguardam'} confirmação
            </strong>
            <p>Entre em contato para confirmar os horários marcados.</p>
          </div>
          <button type="button" onClick={() => navigate(destinoConfirmacao)}>Ver pacientes</button>
        </section>
      )}

      <div className="painel-grade">
        <div className="painel-principal">
          {pode('APPOINTMENT_READ') && fluxo && (
            <section className="painel-card painel-fluxo" aria-labelledby="fluxo-titulo">
              <header>
                <h2 id="fluxo-titulo">Fluxo de hoje</h2>
                <p>{hoje.length ? `${hoje.length} ${hoje.length === 1 ? 'consulta' : 'consultas'} na agenda` : 'Nenhuma consulta hoje'}</p>
              </header>
              <ol className="fluxo-etapas">
                <EtapaFluxo icone={Users} titulo="Chegada" n={fluxo.naEspera} texto={`${fluxo.naEspera} na espera · ${fluxo.aChegar} a chegar`} />
                <EtapaFluxo icone={Stethoscope} titulo="Consulta" n={fluxo.emConsulta} texto={fluxo.emConsulta === 1 ? '1 em atendimento' : `${fluxo.emConsulta} em atendimento`} />
                <EtapaFluxo icone={DoorOpen} titulo="Saída" n={fluxo.finalizadas} texto={fluxo.finalizadas === 1 ? '1 finalizada' : `${fluxo.finalizadas} finalizadas`} />
                {fluxo.cobrancasAbertas !== null && (
                  <EtapaFluxo icone={CreditCard} titulo="Cobrança" n={fluxo.cobrancasAbertas} texto={fluxo.cobrancasAbertas === 1 ? '1 em aberto' : `${fluxo.cobrancasAbertas} em aberto`} alerta />
                )}
              </ol>
            </section>
          )}

          {pode('APPOINTMENT_READ') && (
            <section className="painel-card" aria-labelledby="fila-titulo">
              <header>
                <div className="painel-titulo-linha">
                  <h2 id="fila-titulo">Fila de atendimento</h2>
                  {hoje.length > 0 && <span className="painel-contador">{hoje.length} {hoje.length === 1 ? 'paciente' : 'pacientes'} hoje</span>}
                </div>
                <button type="button" className="painel-link-seta" onClick={() => navigate('/appointments')}>
                  Ver agenda <ArrowRight size={14} aria-hidden="true" />
                </button>
              </header>
              {hoje.length === 0 ? (
                <p className="painel-vazio">
                  O dia está livre. Os pedidos que chegarem pelo site aparecem aqui e na
                  <button type="button" className="painel-link" onClick={() => navigate('/appointments')}>Agenda</button>.
                </p>
              ) : (
                <table className="painel-tabela">
                  <thead>
                    <tr>
                      <th scope="col">Horário</th>
                      <th scope="col">Paciente</th>
                      <th scope="col">Status</th>
                      <th scope="col">Próxima ação</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoje.map((c) => {
                      const e = etapa(c)
                      return (
                        <tr key={c.id}>
                          <td data-rotulo="Horário" className="painel-hora">{hora(c.scheduledAt)}</td>
                          <td data-rotulo="Paciente">
                            <strong title={nomeDe(c)}>{sigla(nomeDe(c))}</strong>
                            <span>{c.procedure?.title ?? 'Consulta'}</span>
                          </td>
                          <td data-rotulo="Status"><Status tom={e.tom}>{e.rotulo}</Status></td>
                          <td data-rotulo="Próxima ação" className="painel-proxima">{e.proxima}</td>
                          <td className="painel-acao">
                            {e.acao && (
                              <button type="button" className={e.acao.forte ? 'is-forte' : ''} onClick={() => navigate(e.acao!.destino)} aria-label={`${e.acao.rotulo} — ${nomeDe(c)}`}>
                                {e.acao.rotulo}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}

          <div className="painel-dupla">
            {pode('APPOINTMENT_READ') && (
              <section className="painel-card" aria-labelledby="recepcao-titulo">
                <header>
                  <div className="painel-titulo-linha">
                    <h2 id="recepcao-titulo">Fila da recepção</h2>
                    <span className="painel-contador">{naSala.length} na espera</span>
                  </div>
                  {pode('FINANCE_OPERATE') && (
                    <button type="button" className="painel-link-seta" onClick={() => navigate('/reception')}>
                      Ver todos <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </header>
                {naSala.length === 0 ? (
                  <p className="painel-vazio">Ninguém na sala de espera agora.</p>
                ) : (
                  <ul className="painel-lista">
                    {naSala.map((c) => (
                      <li key={c.id}>
                        <time>{hora(c.arrivedAt)}</time>
                        <div>
                          <strong title={nomeDe(c)}>{sigla(nomeDe(c))}</strong>
                          <span>Consulta às {hora(c.scheduledAt)}</span>
                        </div>
                        <Status tom="ok">Chegou</Status>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {mes && (
              <section className="painel-card" aria-labelledby="mes-titulo">
                <header>
                  <div>
                    <h2 id="mes-titulo"><Wallet size={15} aria-hidden="true" />O mês</h2>
                    <p>O que entrou no caixa, comparado ao mês passado até o mesmo dia.</p>
                  </div>
                </header>
                <Receita atual={mes.receitaCents} anterior={mes.receitaMesPassadoCents} />
                <div className="painel-numeros">
                  <Numero rotulo="Atendimentos" valor={String(mes.atendimentos)} />
                  <Numero rotulo="Ticket médio" valor={dinheiro(mes.ticketMedioCents)} />
                  <Numero rotulo="Pacientes novas" valor={String(mes.pacientesNovos)} />
                </div>
              </section>
            )}

            {saude && (
              <section className="painel-card" aria-labelledby="faltas-titulo">
                <header>
                  <div>
                    <h2 id="faltas-titulo">Faltas e cancelamentos</h2>
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
            )}

            {pode('PATIENT_READ') && (
              <section className="painel-card" aria-labelledby="aniver-titulo">
                <header>
                  <div>
                    <h2 id="aniver-titulo"><Cake size={15} aria-hidden="true" />Aniversariantes do mês</h2>
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
            )}
          </div>
        </div>

        <div className="painel-lateral">
          {pode('APPOINTMENT_READ') && (
            <section className="painel-card" aria-labelledby="proximas-titulo">
              <header>
                <h2 id="proximas-titulo">Próximas consultas</h2>
                <button type="button" className="painel-link-seta" onClick={() => navigate('/appointments')}>
                  Ver agenda <ArrowRight size={14} aria-hidden="true" />
                </button>
              </header>
              {proximasConsultas.length === 0 ? (
                <p className="painel-vazio">Nada marcado para os próximos sete dias.</p>
              ) : (
                <ul className="painel-lista painel-proximas">
                  {proximasConsultas.map((c) => {
                    const deHoje = aindaHoje.includes(c)
                    return (
                      <li key={c.id}>
                        {deHoje ? (
                          <time><Clock size={14} aria-hidden="true" />{hora(c.scheduledAt)}</time>
                        ) : (
                          <time className="is-largo"><span>{diaCurto(c.scheduledAt)}</span>{hora(c.scheduledAt)}</time>
                        )}
                        <div>
                          <strong title={nomeDe(c)}>{sigla(nomeDe(c))}</strong>
                          <span>{c.procedure?.title ?? 'Consulta'}</span>
                        </div>
                        {c.status === 'PENDING'
                          ? <Status tom="danger">Não confirmado</Status>
                          : <Status tom="neutral">Agendado</Status>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          <section className="painel-card painel-atencoes" aria-labelledby="atencoes-titulo">
            <header>
              <div className="painel-titulo-linha">
                <h2 id="atencoes-titulo">Atenções do dia</h2>
                {totalPendente > 0 && <span className="painel-contador is-alerta">{totalPendente}</span>}
              </div>
            </header>
            {totalPendente === 0 ? (
              <p className="painel-vazio"><CheckCircle2 size={14} aria-hidden="true" /> Nada pendente. Bom trabalho.</p>
            ) : (
              <div className="painel-alertas-grade">
                {pode('APPOINTMENT_WRITE') && <Pendencia
                  n={pendencias.aConfirmar}
                  icone={CalendarClock}
                  titulo="a confirmar"
                  texto="Horário marcado que ninguém confirmou com a paciente."
                  acao={() => navigate(destinoConfirmacao)}
                />}
                {pode('APPOINTMENT_WRITE') && <Pendencia
                  n={pendencias.semHorario}
                  icone={ClipboardList}
                  titulo="sem horário"
                  texto="Pedido que chegou pelo site e ainda não foi encaixado."
                  acao={() => navigate(destinoConfirmacao)}
                />}
                {pode('PRESCRIPTION_SIGN') && <Pendencia
                  n={pendencias.receitasParaAssinar}
                  icone={FileSignature}
                  titulo="por assinar"
                  texto="Documento escrito e não assinado — a paciente não pode usar."
                  acao={() => navigate('/documents')}
                />}
                {pode('LEAD_WRITE') && <Pendencia
                  n={pendencias.leadsParados}
                  icone={Snowflake}
                  titulo="contatos parados"
                  texto="Sem movimento há mais de 30 dias no funil."
                  acao={() => navigate('/leads')}
                />}
                {fluxo?.cobrancasAbertas ? <Pendencia
                  n={fluxo.cobrancasAbertas}
                  icone={CreditCard}
                  titulo="cobrança em aberto"
                  texto="Paciente saiu hoje com valor ainda por receber."
                  acao={() => navigate(pode('FINANCE_OPERATE') ? '/reception' : '/finance')}
                /> : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function EtapaFluxo({ icone: Icone, titulo, n, texto, alerta }: { icone: LucideIcon; titulo: string; n: number; texto: string; alerta?: boolean }) {
  return (
    <li className={n > 0 ? (alerta ? 'is-alerta' : 'is-ativo') : ''}>
      <span className="fluxo-icone" aria-hidden="true"><Icone size={22} strokeWidth={1.6} /></span>
      <strong>{titulo}</strong>
      <span>{texto}</span>
    </li>
  )
}

const ICONE_TOM: Record<Tom, LucideIcon> = {
  ok: CheckCircle2,
  warn: Clock,
  danger: AlertCircle,
  live: Stethoscope,
  info: CircleDot,
  neutral: Clock,
}

function Status({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  const Icone = ICONE_TOM[tom]
  return (
    <span className={`painel-status is-${tom}`}>
      <Icone size={14} aria-hidden="true" />
      {children}
    </span>
  )
}

/** Uma linha de "Atenções do dia". Zero não aparece: nada a fazer não é informação. */
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
      <ChevronRight className="painel-pendencia-seta" size={16} aria-hidden="true" />
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
