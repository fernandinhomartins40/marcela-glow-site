/**
 * Auditoria de sincronia entre os dois painéis.
 *
 * Para cada ação de um lado, verifica se o outro lado enxerga o resultado.
 * Testa contra a API real — ler o código não prova que os dois se falam.
 *
 * Exige a API no ar com o banco semeado:
 *
 *   npm run db:migrate && npm run db:seed && npm run db:seed:demo
 *   npm run dev --workspace @marcela/api
 *   node scripts/auditar-sincronia.mjs
 *
 * Escreve no banco (cria consulta, procedimento, plano, cobrança), então rode
 * contra um banco descartável — nunca contra produção.
 *
 * O método está em CLAUDE.md, seção Auditoria. Toda rodada acrescenta o que
 * encontrou ao registro de lá.
 */
const API = 'http://127.0.0.1:3001/api'
const r = []

async function login(email, senha, portal = false) {
  const res = await fetch(`${API}${portal ? '/patient/auth/login' : '/auth/login'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, tenantSlug: 'marcela-duch' }),
  })
  const j = await res.json()
  return j.token
}

async function api(tok, caminho, metodo = 'GET', corpo) {
  const res = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${tok}`,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  let dados = null
  try { dados = await res.json() } catch { dados = null }
  return { status: res.status, dados }
}

function checa(area, o_que, ok, detalhe = '') {
  r.push({ area, o_que, ok, detalhe })
  console.log(`${ok ? '  OK  ' : ' FALHA'} | ${area} | ${o_que}${detalhe ? ' — ' + detalhe : ''}`)
}

const med = await login('admin@drmarceladuch.com.br', 'Admin@2024!')
const sec = await login('recepcao@exemplo.com.br', 'Equipe@2026!')
const pac = await login('ana.beatriz@exemplo.com.br', 'Paciente@2026', true)
console.log('logins:', med && sec && pac ? 'ok\n' : 'FALHOU\n')

const painel = async () => (await api(pac, '/patient/dashboard')).dados
const inicial = await painel()
const pacienteId = inicial.patient.id

// ── 1. A paciente pede horário → a médica vê ────────────────────────────────
console.log('1. PACIENTE PEDE HORARIO')
const antesAg = (await api(sec, '/appointments?limit=200')).dados?.data?.length ?? 0
const pedido = await api(pac, '/patient/appointments', 'POST', {
  message: 'Auditoria: pedido de horário',
})
checa('portal→painel', 'pedido de horário aceito', pedido.status === 201)
const depoisAg = (await api(sec, '/appointments?limit=200')).dados?.data ?? []
checa('portal→painel', 'a equipe enxerga o pedido', depoisAg.length > antesAg)
const novo = depoisAg.find((a) => a.message?.includes('Auditoria'))
checa('portal→painel', 'pedido vem vinculado à paciente', Boolean(novo?.patient?.id))

// ── 2. A médica confirma → a paciente é avisada ─────────────────────────────
console.log('\n2. MEDICA CONFIRMA A CONSULTA')
const antesNotif = inicial.notifications.length
if (novo) {
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 5); amanha.setUTCHours(17, 0, 0, 0)
  const conf = await api(sec, `/appointments/${novo.id}/confirm`, 'POST', {
    scheduledAt: amanha.toISOString(),
  })
  checa('painel→portal', 'confirmação aceita', conf.status === 200, conf.status !== 200 ? JSON.stringify(conf.dados).slice(0, 90) : '')
  const p2 = await painel()
  checa('painel→portal', 'paciente recebe aviso da confirmação', p2.notifications.length > antesNotif)
  checa('painel→portal', 'consulta aparece confirmada no portal',
    p2.appointments.some((a) => a.id === novo.id && a.status === 'CONFIRMED'))
}

// ── 3. A paciente manda mensagem → a equipe vê ──────────────────────────────
console.log('\n3. PACIENTE MANDA MENSAGEM')
const msg = await api(pac, '/patient/messages', 'POST', { body: 'Auditoria: dúvida da paciente' })
checa('portal→painel', 'mensagem aceita', msg.status === 201)
const ficha = await api(med, `/admin/patients/${pacienteId}`)
checa('portal→painel', 'a médica vê a mensagem na ficha',
  (ficha.dados?.messages ?? []).some((m) => m.body?.includes('Auditoria')))

// ── 4. A médica registra procedimento → portal e financeiro ─────────────────
console.log('\n4. MEDICA REGISTRA PROCEDIMENTO')
const procs = (await api(med, '/procedures?tenantSlug=marcela-duch')).dados ?? []
const proc = procs.find((p) => p.priceCents)
const sess = await api(med, '/admin/sessions', 'POST', {
  patientId: pacienteId,
  procedureId: proc?.id,
  priceCents: proc?.priceCents ?? 30000,
  notes: 'Auditoria',
})
checa('painel→portal', 'procedimento registrado', sess.status === 201)
const p3 = await painel()
checa('painel→portal', 'procedimento aparece no portal',
  p3.sessions.some((s) => s.notes === 'Auditoria' || s.id === sess.dados?.id))
const fin = await api(sec, '/finance')
checa('painel→financeiro', 'procedimento virou cobrança',
  (fin.dados?.charges ?? []).some((c) => c.sessionId === sess.dados?.id))
const notifProc = p3.notifications.length
checa('painel→portal', 'paciente é avisada do procedimento', notifProc > antesNotif + 1,
  notifProc <= antesNotif + 1 ? 'nenhum aviso enviado' : '')

// ── 5. Plano de tratamento → jornada da paciente ────────────────────────────
console.log('\n5. PLANO DE TRATAMENTO')
const plano = await api(med, '/plans', 'POST', {
  patientId: pacienteId,
  procedureId: proc?.id,
  title: 'Auditoria — plano',
  totalSessions: 3,
})
checa('painel→portal', 'plano criado', plano.status === 201)
const p4 = await painel()
checa('painel→portal', 'plano aparece na jornada da paciente',
  (p4.plans ?? []).some((x) => x.title === 'Auditoria — plano'))
checa('painel→portal', 'paciente é avisada do novo plano',
  p4.notifications.length > notifProc,
  p4.notifications.length <= notifProc ? 'nenhum aviso enviado' : '')

// ── 6. Vazamento de dado interno ────────────────────────────────────────────
console.log('\n6. PRIVACIDADE')
await api(med, `/plans/${plano.dados?.id}`, 'PATCH', { internalNotes: 'SEGREDO DA EQUIPE' })
const p5 = await painel()
checa('privacidade', 'nota interna do plano não vaza',
  !JSON.stringify(p5.plans ?? []).includes('SEGREDO'))
checa('privacidade', 'portal não expõe outras pacientes',
  !p5.appointments.some((a) => a.patientId && a.patientId !== pacienteId))

// ── 7. Documento assinado → portal ──────────────────────────────────────────
console.log('\n7. DOCUMENTOS')
checa('painel→portal', 'portal lista prescrições', Array.isArray(p5.prescriptions))

// ── 8. Cancelamento → portal ────────────────────────────────────────────────
console.log('\n8. MEDICA CANCELA')
if (novo) {
  const antes = p5.notifications.length
  const canc = await api(sec, `/appointments/${novo.id}/cancel`, 'POST', { reason: 'Auditoria' })
  checa('painel→portal', 'cancelamento aceito', canc.status === 200)
  const p6 = await painel()
  checa('painel→portal', 'paciente é avisada do cancelamento', p6.notifications.length > antes)
  checa('painel→portal', 'consulta sai da agenda do portal',
    !p6.appointments.some((a) => a.id === novo.id && a.status !== 'CANCELLED'))
}

console.log('\n' + '='.repeat(64))
const falhas = r.filter((x) => !x.ok)
console.log(`RESULTADO: ${r.length - falhas.length}/${r.length} verificações passaram`)
if (falhas.length) {
  console.log('\nLACUNAS:')
  for (const f of falhas) console.log(`  - [${f.area}] ${f.o_que}${f.detalhe ? ': ' + f.detalhe : ''}`)
}
