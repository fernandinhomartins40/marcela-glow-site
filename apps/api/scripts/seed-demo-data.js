const bcrypt = require('bcryptjs')
// Os enums vem do client gerado, entao acompanham o schema sem lista propria.
const {
  AppointmentStatus, CatalogKind, ContentStatus, DocumentKind, Gender,
  LeadStatus, MaritalStatus, MedicationControl, MessageSender,
  NotificationChannel, PrescriptionStatus, PrismaClient, RecordType, UserRole,
  BloodType,
} = require('@prisma/client')

/**
 * Seed de demonstracao: enche a clinica com volume suficiente para exercitar
 * as telas.
 *
 * Roda no deploy, logo apos seed-demo-users.js. Aquele garante o que a
 * aplicacao precisa para subir (tenant, usuarios, expediente); este popula o
 * catalogo e o movimento - sem procedimento cadastrado, agendamento, catalogo
 * e selecao no atendimento aparecem vazios.
 *
 * Idempotente: reconhece o que ja criou por e-mail ou nome e atualiza em vez de
 * duplicar, entao pode rodar a cada deploy. As datas sao relativas a hoje, para
 * a agenda nao envelhecer no banco.
 *
 * Os dados sao ficticios (e-mails @exemplo.com.br). Quando a clinica tiver o
 * proprio catalogo e as proprias pacientes, tire a chamada do deploy: este
 * script grava prontuario e receita, e nao deve conviver com dado real.
 *
 * Desligar sem mexer no codigo: SEED_DEMO_DATA=0.
 */

const prisma = new PrismaClient()

const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'marcela-duch'

/** Data relativa a hoje, para a agenda nunca "envelhecer" no banco. */
function dia(offset, hora = 9, minuto = 0) {
  const d = new Date()
  d.setHours(hora, minuto, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function anos(idade) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - idade)
  return d
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de procedimentos — o que trava a aplicação quando falta
// ─────────────────────────────────────────────────────────────────────────────

const PROCEDIMENTOS = [
  {
    number: '01',
    title: 'Consulta de avaliação',
    subtitle: 'Primeira consulta',
    description:
      'Avaliação facial e corporal completa, com análise de pele, histórico de saúde e definição do plano de tratamento.',
    durationMin: 60,
    bufferMin: 10,
  },
  {
    number: '02',
    title: 'Toxina botulínica',
    subtitle: 'Rugas dinâmicas',
    description:
      'Aplicação para suavizar linhas de expressão da testa, glabela e região dos olhos. Resultado progressivo em até 15 dias.',
    durationMin: 45,
    bufferMin: 15,
  },
  {
    number: '03',
    title: 'Preenchimento facial',
    subtitle: 'Ácido hialurônico',
    description:
      'Reposição de volume em lábios, olheiras, malar ou mento, com técnica adequada a cada região.',
    durationMin: 60,
    bufferMin: 15,
  },
  {
    number: '04',
    title: 'Bioestimulador de colágeno',
    subtitle: 'Firmeza da pele',
    description:
      'Estimula a produção natural de colágeno para melhorar flacidez de face, pescoço e colo.',
    durationMin: 60,
    bufferMin: 15,
  },
  {
    number: '05',
    title: 'Skinbooster',
    subtitle: 'Hidratação profunda',
    description: 'Microinjeções de ácido hialurônico que devolvem viço e maciez à pele.',
    durationMin: 45,
    bufferMin: 10,
  },
  {
    number: '06',
    title: 'Peeling químico',
    subtitle: 'Renovação celular',
    description: 'Renova a camada superficial da pele, clareando manchas e melhorando a textura.',
    durationMin: 40,
    bufferMin: 10,
  },
  {
    number: '07',
    title: 'Microagulhamento',
    subtitle: 'Textura e cicatrizes',
    description: 'Indução de colágeno para cicatrizes de acne, poros dilatados e textura irregular.',
    durationMin: 50,
    bufferMin: 15,
  },
  {
    number: '08',
    title: 'Limpeza de pele profunda',
    subtitle: 'Cuidado mensal',
    description: 'Extração, higienização e hidratação, indicada como manutenção da rotina de cuidados.',
    durationMin: 60,
    bufferMin: 10,
  },
  {
    number: '09',
    title: 'Retorno de acompanhamento',
    subtitle: 'Revisão do tratamento',
    description: 'Consulta de revisão para acompanhar a resposta ao tratamento e ajustar o plano.',
    durationMin: 30,
    bufferMin: 5,
    isBookable: false,
  },
]

const MEDICAMENTOS = [
  { name: 'Dipirona sódica', subtitle: 'Analgésico', strength: '500mg', form: 'comprimido', route: 'oral', defaultDose: '1 comprimido a cada 6 horas se dor', defaultQty: '1 caixa' },
  { name: 'Ibuprofeno', subtitle: 'Anti-inflamatório', strength: '400mg', form: 'comprimido', route: 'oral', defaultDose: '1 comprimido a cada 8 horas por 3 dias', defaultQty: '1 caixa' },
  { name: 'Arnica montana', subtitle: 'Homeopático para hematomas', strength: '30CH', form: 'glóbulos', route: 'sublingual', defaultDose: '5 glóbulos 3x ao dia', defaultQty: '1 frasco' },
  { name: 'Ácido hialurônico tópico', subtitle: 'Hidratante pós-procedimento', form: 'sérum', route: 'tópica', defaultDose: 'Aplicar 2x ao dia na face limpa', defaultQty: '1 frasco 30ml' },
  { name: 'Protetor solar FPS 50', subtitle: 'Fotoproteção', form: 'creme', route: 'tópica', defaultDose: 'Aplicar pela manhã e reaplicar a cada 3 horas', defaultQty: '1 frasco' },
  { name: 'Vitamina C tópica', subtitle: 'Antioxidante', strength: '10%', form: 'sérum', route: 'tópica', defaultDose: 'Aplicar pela manhã antes do protetor', defaultQty: '1 frasco' },
  { name: 'Tretinoína', subtitle: 'Renovação celular', strength: '0,025%', form: 'creme', route: 'tópica', defaultDose: 'Aplicar à noite, 3x por semana', defaultQty: '1 bisnaga', control: MedicationControl.CONTROLLED },
  { name: 'Cefalexina', subtitle: 'Antibiótico', strength: '500mg', form: 'cápsula', route: 'oral', defaultDose: '1 cápsula a cada 6 horas por 7 dias', defaultQty: '1 caixa', control: MedicationControl.ANTIMICROBIAL },
]

const EXAMES = [
  { name: 'Hemograma completo', tussCode: '40304361', preparation: 'Jejum de 4 horas' },
  { name: 'Coagulograma', tussCode: '40304370', preparation: 'Jejum de 8 horas' },
  { name: 'Glicemia de jejum', tussCode: '40301630', preparation: 'Jejum de 8 horas' },
  { name: 'TSH e T4 livre', tussCode: '40316220', preparation: 'Não precisa de jejum' },
  { name: 'Vitamina D (25-OH)', tussCode: '40316475', preparation: 'Não precisa de jejum' },
  { name: 'Ferritina', tussCode: '40316130', preparation: 'Jejum de 4 horas' },
]

const ORIENTACOES = [
  {
    name: 'Cuidados após toxina botulínica',
    body: 'Nas primeiras 4 horas, permaneça em posição vertical e evite deitar.\n\nPor 24 horas: não faça exercício físico, não consuma álcool e não massageie a região aplicada.\n\nEvite sauna, piscina e exposição solar intensa por 48 horas.\n\nO resultado aparece progressivamente e se completa em até 15 dias.',
  },
  {
    name: 'Cuidados após preenchimento',
    body: 'Aplique compressa fria nas primeiras 24 horas, por 10 minutos a cada hora.\n\nEvite exercício físico, calor intenso e bebida alcoólica por 48 horas.\n\nInchaço e pequenos hematomas são esperados e regridem em até 7 dias.\n\nDurma de barriga para cima e com a cabeceira elevada nas primeiras noites.',
  },
  {
    name: 'Cuidados após peeling',
    body: 'Use protetor solar FPS 50 a cada 3 horas, inclusive em ambiente fechado.\n\nNão exponha a pele ao sol direto por 15 dias.\n\nA descamação é parte do processo: não puxe nem esfregue a pele.\n\nHidrate a face pelo menos 3x ao dia com o produto indicado.',
  },
  {
    name: 'Preparo para o procedimento',
    body: 'Suspenda anti-inflamatórios e suplementos de ômega 3 por 7 dias antes, se autorizado pelo seu médico.\n\nEvite bebida alcoólica nas 48 horas anteriores.\n\nVenha sem maquiagem na região a ser tratada.\n\nAvise a equipe se estiver usando algum medicamento novo.',
  },
]

const MODELOS_PRONTUARIO = [
  {
    name: 'Anamnese estética inicial',
    body: 'QUEIXA PRINCIPAL:\n\nHISTÓRIA DA QUEIXA:\n\nPROCEDIMENTOS ESTÉTICOS ANTERIORES:\n\nALERGIAS:\n\nMEDICAMENTOS EM USO:\n\nDOENÇAS PRÉVIAS:\n\nCIRURGIAS:\n\nEXPECTATIVA DA PACIENTE:\n\nAVALIAÇÃO DA PELE (fototipo, textura, hidratação):\n\nPLANO DE TRATAMENTO PROPOSTO:',
  },
  {
    name: 'Evolução de retorno',
    body: 'TEMPO DESDE O PROCEDIMENTO:\n\nRESPOSTA AO TRATAMENTO:\n\nINTERCORRÊNCIAS RELATADAS:\n\nEXAME FÍSICO:\n\nSATISFAÇÃO DA PACIENTE:\n\nCONDUTA:',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Pacientes — variedade para exercitar filtros, buscas e estados de ficha
// ─────────────────────────────────────────────────────────────────────────────

const PACIENTES = [
  { name: 'Ana Beatriz Moraes', idade: 34, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo III', allergies: 'Dipirona', conditions: 'Rinite alérgica', referralSource: 'Instagram', bloodType: BloodType.O_POSITIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Advogada' },
  { name: 'Carolina Prado Lima', idade: 28, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo II', allergies: null, conditions: null, referralSource: 'Indicação', bloodType: BloodType.A_POSITIVE, maritalStatus: MaritalStatus.SINGLE, occupation: 'Nutricionista' },
  { name: 'Daniela Vasconcelos', idade: 45, gender: Gender.FEMALE, city: 'Costa Rica', skinType: 'Fototipo IV', allergies: 'Látex', conditions: 'Hipotireoidismo', medications: 'Levotiroxina 50mcg', referralSource: 'Google', bloodType: BloodType.B_POSITIVE, maritalStatus: MaritalStatus.DIVORCED, occupation: 'Empresária' },
  { name: 'Eduarda Nunes Ribeiro', idade: 31, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo III', allergies: null, conditions: null, referralSource: 'Instagram', bloodType: BloodType.O_NEGATIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Professora' },
  { name: 'Fernanda Alves Teixeira', idade: 52, gender: Gender.FEMALE, city: 'Cassilândia', skinType: 'Fototipo II', allergies: 'Penicilina', conditions: 'Hipertensão', medications: 'Losartana 50mg', referralSource: 'Indicação', bloodType: BloodType.AB_POSITIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Servidora pública' },
  { name: 'Gabriela Souza Martins', idade: 26, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo IV', allergies: null, conditions: null, referralSource: 'Site', bloodType: BloodType.A_NEGATIVE, maritalStatus: MaritalStatus.SINGLE, occupation: 'Designer' },
  { name: 'Helena Campos Duarte', idade: 39, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo III', allergies: null, conditions: 'Enxaqueca', referralSource: 'Instagram', bloodType: BloodType.O_POSITIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Fisioterapeuta' },
  { name: 'Isabela Rocha Ferreira', idade: 23, gender: Gender.FEMALE, city: 'Paraíso das Águas', skinType: 'Fototipo II', allergies: null, conditions: null, referralSource: 'Indicação', bloodType: BloodType.B_NEGATIVE, maritalStatus: MaritalStatus.SINGLE, occupation: 'Estudante' },
  { name: 'Juliana Barbosa Pinto', idade: 41, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo III', allergies: 'Ibuprofeno', conditions: null, referralSource: 'Google', bloodType: BloodType.A_POSITIVE, maritalStatus: MaritalStatus.WIDOWED, occupation: 'Contadora' },
  { name: 'Larissa Mendes Cardoso', idade: 36, gender: Gender.FEMALE, city: 'Costa Rica', skinType: 'Fototipo IV', allergies: null, conditions: null, referralSource: 'Instagram', bloodType: BloodType.O_POSITIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Enfermeira' },
  { name: 'Mariana Costa Andrade', idade: 48, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo II', allergies: null, conditions: 'Diabetes tipo 2', medications: 'Metformina 850mg', referralSource: 'Indicação', bloodType: BloodType.AB_NEGATIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Farmacêutica' },
  { name: 'Natália Freitas Gomes', idade: 29, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo III', allergies: null, conditions: null, referralSource: 'Site', bloodType: BloodType.A_POSITIVE, maritalStatus: MaritalStatus.SINGLE, occupation: 'Publicitária' },
  { name: 'Patrícia Lopes Ramos', idade: 55, gender: Gender.FEMALE, city: 'Cassilândia', skinType: 'Fototipo III', allergies: null, conditions: 'Osteoporose', referralSource: 'Indicação', bloodType: BloodType.O_NEGATIVE, maritalStatus: MaritalStatus.DIVORCED, occupation: 'Aposentada' },
  { name: 'Renata Siqueira Nogueira', idade: 33, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo II', allergies: null, conditions: null, referralSource: 'Instagram', bloodType: BloodType.B_POSITIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Arquiteta' },
  { name: 'Tatiane Oliveira Braga', idade: 44, gender: Gender.FEMALE, city: 'Chapadão do Sul', skinType: 'Fototipo IV', allergies: 'Sulfa', conditions: null, referralSource: 'Google', bloodType: BloodType.A_NEGATIVE, maritalStatus: MaritalStatus.MARRIED, occupation: 'Dentista' },
]

const LEADS = [
  { name: 'Bianca Ferraz', interest: 'Toxina botulínica', status: LeadStatus.NEW, source: 'Instagram' },
  { name: 'Camila Antunes', interest: 'Preenchimento labial', status: LeadStatus.CONTACTED, source: 'WhatsApp' },
  { name: 'Débora Farias', interest: 'Limpeza de pele', status: LeadStatus.QUALIFIED, source: 'Site' },
  { name: 'Elaine Moura', interest: 'Bioestimulador', status: LeadStatus.NEW, source: 'Indicação' },
  { name: 'Flávia Rezende', interest: 'Peeling químico', status: LeadStatus.WON, source: 'Instagram' },
  { name: 'Giovana Peixoto', interest: 'Skinbooster', status: LeadStatus.LOST, source: 'Google' },
  { name: 'Heloísa Cunha', interest: 'Microagulhamento', status: LeadStatus.CONTACTED, source: 'Site' },
  { name: 'Ingrid Sampaio', interest: 'Consulta de avaliação', status: LeadStatus.NEW, source: 'Instagram' },
]

const DEPOIMENTOS = [
  { authorName: 'Ana Beatriz M.', text: 'Me senti acolhida desde a primeira consulta. A Dra. Marcela explica cada etapa e respeita o que a gente quer — resultado natural, sem exagero.', rating: 5 },
  { authorName: 'Carolina P.', text: 'Fiz preenchimento labial com muito receio e o resultado ficou discreto, exatamente como eu pedi. Recomendo de olhos fechados.', rating: 5 },
  { authorName: 'Daniela V.', text: 'Clínica impecável e equipe muito atenciosa. O acompanhamento depois do procedimento fez toda a diferença para mim.', rating: 5 },
  { authorName: 'Fernanda A.', text: 'Já tinha feito toxina em outro lugar e não gostei. Aqui a aplicação foi precisa e o resultado ficou harmônico.', rating: 5 },
  { authorName: 'Helena C.', text: 'Atendimento pontual, ambiente agradável e um cuidado com detalhes que eu não vi em outro lugar da região.', rating: 4 },
]

function email(nome) {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, '')
    .split(' ')
    .slice(0, 2)
    .join('.')
  return `${base}@exemplo.com.br`
}

function telefone(i) {
  return `679${String(80000000 + i * 1234).slice(0, 8)}`
}

/**
 * CPF ficticio, mas com digito verificador correto.
 *
 * O painel valida o CPF antes de deixar salvar a ficha; numero invalido trava
 * o botao e a paciente do seed nao pode ser editada. Os nove primeiros digitos
 * saem de uma sequencia previsivel, entao o mesmo indice gera sempre o mesmo
 * CPF e o seed continua idempotente.
 */
function cpf(i) {
  const base = String(100000000 + i * 12345671).slice(0, 9)
  const digito = (parcial) => {
    let soma = 0
    for (let k = 0; k < parcial.length; k++) soma += Number(parcial[k]) * (parcial.length + 1 - k)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = digito(base)
  const d2 = digito(base + d1)
  return base + d1 + d2
}

async function main() {
  if (process.env.SEED_DEMO_DATA === '0') {
    console.log('Seed de demonstracao desligado (SEED_DEMO_DATA=0).')
    return
  }
  console.log('🌱 Seed de demonstração — dados fictícios para testar a aplicação\n')

  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) {
    throw new Error(
      `Tenant "${TENANT_SLUG}" não existe. Rode antes: npm run db:seed (cria a clínica e o admin).`,
    )
  }
  console.log(`🏥 Clínica: ${tenant.name}`)

  const doctor =
    (await prisma.user.findFirst({ where: { tenantId: tenant.id, role: UserRole.ADMIN } })) ??
    (await prisma.user.findFirst({ where: { tenantId: tenant.id } }))
  if (!doctor) throw new Error('Nenhum usuário na clínica. Rode antes: npm run db:seed')

  // ── Equipe ────────────────────────────────────────────────────────────────
  const equipe = [
    { email: 'recepcao@exemplo.com.br', name: 'Priscila Andrade', role: UserRole.RECEPTION },
    { email: 'assistente@exemplo.com.br', name: 'Bruna Teles', role: UserRole.ASSISTANT },
    { email: 'financeiro@exemplo.com.br', name: 'Rodrigo Salles', role: UserRole.FINANCE },
  ]
  for (const membro of equipe) {
    await prisma.user.upsert({
      where: { email_tenantId: { email: membro.email, tenantId: tenant.id } },
      update: { name: membro.name, role: membro.role, isActive: true },
      create: {
        ...membro,
        tenantId: tenant.id,
        passwordHash: await bcrypt.hash('Equipe@2026!', 12),
      },
    })
  }
  console.log(`👥 Equipe: ${equipe.length} integrantes`)

  // ── Horário de funcionamento ──────────────────────────────────────────────
  // Segunda a sexta 08:00–18:00, sábado 08:00–12:00.
  for (const [weekday, startTime, endTime] of [
    [1, '08:00', '18:00'], [2, '08:00', '18:00'], [3, '08:00', '18:00'],
    [4, '08:00', '18:00'], [5, '08:00', '18:00'], [6, '08:00', '12:00'],
  ]) {
    const existente = await prisma.businessHour.findFirst({ where: { tenantId: tenant.id, weekday } })
    if (existente) {
      await prisma.businessHour.update({ where: { id: existente.id }, data: { startTime, endTime, isActive: true } })
    } else {
      await prisma.businessHour.create({ data: { tenantId: tenant.id, weekday, startTime, endTime } })
    }
  }
  console.log('🕐 Horário de funcionamento: seg–sex 8h–18h, sáb 8h–12h')

  // ── Procedimentos ─────────────────────────────────────────────────────────
  const procedimentos = []
  for (const [i, p] of PROCEDIMENTOS.entries()) {
    const existente = await prisma.procedure.findFirst({ where: { tenantId: tenant.id, title: p.title } })
    const dados = { ...p, displayOrder: i, tenantId: tenant.id, isActive: true }
    procedimentos.push(
      existente
        ? await prisma.procedure.update({ where: { id: existente.id }, data: dados })
        : await prisma.procedure.create({ data: dados }),
    )
  }
  console.log(`💉 Procedimentos: ${procedimentos.length}`)

  // ── Catálogo clínico ──────────────────────────────────────────────────────
  const catalogo = [
    { kind: CatalogKind.MEDICATION, itens: MEDICAMENTOS },
    { kind: CatalogKind.EXAM, itens: EXAMES },
    { kind: CatalogKind.GUIDANCE, itens: ORIENTACOES },
    { kind: CatalogKind.RECORD_TEMPLATE, itens: MODELOS_PRONTUARIO },
  ]
  let totalCatalogo = 0
  const medicamentos = []
  for (const grupo of catalogo) {
    for (const item of grupo.itens) {
      const nome = item.name
      const existente = await prisma.catalogItem.findFirst({
        where: { tenantId: tenant.id, kind: grupo.kind, name: nome },
      })
      const dados = { ...item, kind: grupo.kind, tenantId: tenant.id, isActive: true }
      const salvo = existente
        ? await prisma.catalogItem.update({ where: { id: existente.id }, data: dados })
        : await prisma.catalogItem.create({ data: dados })
      if (grupo.kind === CatalogKind.MEDICATION) medicamentos.push({ id: salvo.id, name: salvo.name })
      totalCatalogo += 1
    }
  }
  console.log(`📋 Catálogo clínico: ${totalCatalogo} itens`)

  // ── Pacientes ─────────────────────────────────────────────────────────────
  const senhaPaciente = await bcrypt.hash('Paciente@2026', 12)
  const pacientes = []
  for (const [i, p] of PACIENTES.entries()) {
    const mail = email(p.name)
    const dados = {
      name: p.name,
      email: mail,
      phone: telefone(i),
      cpf: cpf(i),
      birthDate: anos(p.idade),
      gender: p.gender,
      maritalStatus: p.maritalStatus,
      occupation: p.occupation,
      city: p.city,
      state: 'MS',
      skinType: p.skinType,
      allergies: p.allergies ?? null,
      conditions: p.conditions ?? null,
      medications: p.medications ?? null,
      bloodType: p.bloodType,
      referralSource: p.referralSource,
      lgpdConsentAt: dia(-90 + i),
      isActive: true,
      tenantId: tenant.id,
      // As três primeiras têm acesso ao portal, para testar o login da paciente.
      passwordHash: i < 3 ? senhaPaciente : null,
    }
    const existente = await prisma.patient.findUnique({
      where: { email_tenantId: { email: mail, tenantId: tenant.id } },
    })
    pacientes.push(
      existente
        ? await prisma.patient.update({ where: { id: existente.id }, data: dados })
        : await prisma.patient.create({ data: dados }),
    )
  }
  console.log(`🧑‍⚕️ Pacientes: ${pacientes.length} (3 com acesso ao portal)`)

  // ── Agenda ────────────────────────────────────────────────────────────────
  // Espalhada de 60 dias atrás a 30 à frente, com status coerente ao tempo:
  // passado concluído ou cancelado, hoje confirmado, futuro entre confirmado e
  // aguardando. É o que faz a agenda e o dashboard mostrarem algo real.
  const agendaPlano = []
  let n = 0
  for (const offset of [-58, -51, -44, -37, -30, -23, -16, -9, -2]) {
    agendaPlano.push({ offset, hora: 8 + (n % 8), pacienteIdx: n % PACIENTES.length, procIdx: n % PROCEDIMENTOS.length, status: n % 7 === 0 ? AppointmentStatus.CANCELLED : AppointmentStatus.COMPLETED })
    n += 1
  }
  for (const hora of [8, 9, 10, 14, 15, 16]) {
    agendaPlano.push({ offset: 0, hora, pacienteIdx: n % PACIENTES.length, procIdx: n % PROCEDIMENTOS.length, status: AppointmentStatus.CONFIRMED })
    n += 1
  }
  for (const offset of [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 24, 28, 30]) {
    agendaPlano.push({ offset, hora: 8 + (n % 9), pacienteIdx: n % PACIENTES.length, procIdx: n % PROCEDIMENTOS.length, status: n % 4 === 0 ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED })
    n += 1
  }

  const agendamentos = []
  for (const a of agendaPlano) {
    const paciente = pacientes[a.pacienteIdx]
    const procedimento = procedimentos[a.procIdx]
    const scheduledAt = dia(a.offset, a.hora)
    const endsAt = new Date(scheduledAt.getTime() + (procedimento.durationMin + procedimento.bufferMin) * 60000)
    const existente = await prisma.appointment.findFirst({
      where: { tenantId: tenant.id, patientId: paciente.id, scheduledAt },
    })
    const dados = {
      name: paciente.name,
      email: paciente.email,
      // Appointment.phone e obrigatorio; paciente.phone e opcional no schema.
      phone: paciente.phone ?? telefone(0),
      scheduledAt,
      endsAt,
      status: a.status,
      source: a.offset % 3 === 0 ? 'landing' : 'staff',
      tenantId: tenant.id,
      patientId: paciente.id,
      procedureId: procedimento.id,
    }
    agendamentos.push(
      existente
        ? await prisma.appointment.update({ where: { id: existente.id }, data: dados })
        : await prisma.appointment.create({ data: dados }),
    )
  }
  console.log(`📅 Agendamentos: ${agendamentos.length} (de 58 dias atrás a 30 à frente)`)

  // ── Prontuários e sessões dos atendimentos concluídos ──────────────────────
  const concluidos = agendamentos.filter((a) => a.status === AppointmentStatus.COMPLETED)
  let registros = 0
  let sessoes = 0
  for (const [i, ag] of concluidos.entries()) {
    const proc = procedimentos.find((p) => p.id === ag.procedureId)
    const jaTem = await prisma.medicalRecord.findFirst({ where: { appointmentId: ag.id } })
    if (!jaTem) {
      await prisma.medicalRecord.create({
        data: {
          title: i % 3 === 0 ? 'Anamnese inicial' : `Evolução — ${proc.title}`,
          type: i % 3 === 0 ? RecordType.ANAMNESIS : RecordType.EVOLUTION,
          complaint: i % 3 === 0 ? 'Deseja melhorar linhas de expressão e textura da pele.' : 'Retorno de acompanhamento.',
          body:
            i % 3 === 0
              ? 'Paciente comparece para avaliação estética. Nega uso de anticoagulantes. Pele com fotoenvelhecimento leve a moderado, sem lesões suspeitas.'
              : `Procedimento realizado sem intercorrências. Paciente refere boa adaptação, sem dor ou edema importante. Resultado dentro do esperado para o tempo decorrido.`,
          plan: `Manter cuidados domiciliares. Retorno em 30 dias para reavaliação.`,
          occurredAt: ag.scheduledAt,
          lockedAt: i % 2 === 0 ? ag.endsAt : null,
          patientId: ag.patientId,
          appointmentId: ag.id,
          createdById: doctor.id,
          tenantId: tenant.id,
        },
      })
      registros += 1
    }

    const temSessao = await prisma.procedureSession.findFirst({ where: { appointmentId: ag.id } })
    if (!temSessao) {
      await prisma.procedureSession.create({
        data: {
          performedAt: ag.scheduledAt,
          priceCents: [35000, 90000, 120000, 150000, 65000, 45000, 55000, 25000, 0][i % 9],
          notes: `${proc.title} realizado conforme plano.`,
          patientId: ag.patientId,
          procedureId: proc.id,
          appointmentId: ag.id,
          tenantId: tenant.id,
        },
      })
      sessoes += 1
    }
  }
  console.log(
    `📝 Prontuários: ${await prisma.medicalRecord.count({ where: { tenantId: tenant.id } })}` +
      ` · Sessões realizadas: ${await prisma.procedureSession.count({ where: { tenantId: tenant.id } })}`,
  )

  // ── Receitas ──────────────────────────────────────────────────────────────
  let receitas = 0
  for (const [i, ag] of concluidos.slice(0, 6).entries()) {
    const codigo = `DEMO-${String(i + 1).padStart(4, '0')}`
    const existente = await prisma.prescription.findUnique({ where: { verificationCode: codigo } })
    if (existente) continue

    const status = i % 3 === 0 ? PrescriptionStatus.SIGNED : i % 3 === 1 ? PrescriptionStatus.SENT : PrescriptionStatus.DRAFT
    const receita = await prisma.prescription.create({
      data: {
        kind: i % 4 === 3 ? DocumentKind.EXAM_REQUEST : DocumentKind.PRESCRIPTION,
        title: i % 4 === 3 ? 'Pedido de exames pré-procedimento' : 'Receita pós-procedimento',
        instructions:
          i % 4 === 3
            ? 'Realizar os exames abaixo antes do próximo procedimento e trazer os resultados na consulta.'
            : 'Seguir as orientações abaixo por 7 dias. Em caso de dor intensa ou vermelhidão progressiva, entre em contato com a clínica.',
        status,
        sentAt: status === PrescriptionStatus.DRAFT ? null : ag.endsAt,
        signedAt: status === PrescriptionStatus.SIGNED ? ag.endsAt : null,
        signedById: status === PrescriptionStatus.SIGNED ? doctor.id : null,
        verificationCode: codigo,
        validUntil: dia(30 + i),
        patientId: ag.patientId,
        appointmentId: ag.id,
        tenantId: tenant.id,
      },
    })

    for (const [ordem, med] of medicamentos.slice(i % 3, (i % 3) + 2).entries()) {
      const fonte = MEDICAMENTOS.find((m) => m.name === med.name)
      await prisma.prescriptionItem.create({
        data: {
          prescriptionId: receita.id,
          catalogItemId: med.id,
          name: fonte.name,
          strength: fonte.strength ?? null,
          form: fonte.form ?? null,
          route: fonte.route ?? null,
          dose: fonte.defaultDose ?? null,
          quantity: fonte.defaultQty ?? null,
          control: fonte.control ?? MedicationControl.COMMON,
          displayOrder: ordem,
        },
      })
    }
    receitas += 1
  }
  console.log(`💊 Receitas e pedidos: ${await prisma.prescription.count({ where: { tenantId: tenant.id } })}`)

  // ── Mensagens e notificações do portal ────────────────────────────────────
  let mensagens = 0
  for (const paciente of pacientes.slice(0, 3)) {
    const jaTem = await prisma.message.findFirst({ where: { patientId: paciente.id } })
    if (jaTem) continue
    const conversa = [
      { sender: MessageSender.PATIENT, body: 'Boa tarde! Posso usar protetor solar em cima da área tratada?', offset: -5 },
      { sender: MessageSender.STAFF, body: 'Boa tarde! Pode sim, a partir de 24 horas após o procedimento. Use FPS 50 e reaplique a cada 3 horas.', offset: -5 },
      { sender: MessageSender.PATIENT, body: 'Perfeito, obrigada! E exercício físico, quando posso voltar?', offset: -4 },
      { sender: MessageSender.STAFF, body: 'Libere a partir de 48 horas. Comece leve e evite exposição ao calor intenso nos primeiros dias.', offset: -4 },
    ]
    for (const m of conversa) {
      await prisma.message.create({
        data: {
          sender: m.sender,
          body: m.body,
          patientId: paciente.id,
          tenantId: tenant.id,
          createdAt: dia(m.offset, 14),
        },
      })
      mensagens += 1
    }

    await prisma.notification.create({
      data: {
        title: 'Consulta confirmada',
        body: 'Sua consulta foi confirmada. Chegue com 10 minutos de antecedência.',
        channel: NotificationChannel.IN_APP,
        patientId: paciente.id,
        tenantId: tenant.id,
      },
    })
  }
  console.log(
    `💬 Mensagens: ${await prisma.message.count({ where: { tenantId: tenant.id } })}` +
      ` · Notificações: ${await prisma.notification.count({ where: { tenantId: tenant.id } })}`,
  )

  // ── Leads ─────────────────────────────────────────────────────────────────
  let leads = 0
  for (const [i, l] of LEADS.entries()) {
    const mail = email(l.name)
    const existente = await prisma.lead.findFirst({ where: { tenantId: tenant.id, email: mail } })
    const dados = {
      name: l.name,
      email: mail,
      phone: telefone(100 + i),
      status: l.status,
      // O schema guarda a procedencia em `origin` e o texto livre em `notes`.
      origin: l.source,
      notes: `Interesse: ${l.interest}. Perguntou valor e disponibilidade de horário.`,
      tenantId: tenant.id,
      createdAt: dia(-20 + i * 2, 10),
    }
    if (existente) await prisma.lead.update({ where: { id: existente.id }, data: dados })
    else await prisma.lead.create({ data: dados })
    leads += 1
  }
  console.log(`📨 Leads: ${leads}`)

  // ── Depoimentos e newsletter ──────────────────────────────────────────────
  let depoimentos = 0
  for (const [i, d] of DEPOIMENTOS.entries()) {
    const existente = await prisma.testimonial.findFirst({ where: { tenantId: tenant.id, authorName: d.authorName } })
    const dados = { ...d, isVisible: true, displayOrder: i, tenantId: tenant.id }
    if (existente) await prisma.testimonial.update({ where: { id: existente.id }, data: dados })
    else await prisma.testimonial.create({ data: dados })
    depoimentos += 1
  }

  let inscritos = 0
  for (const p of PACIENTES.slice(0, 8)) {
    const mail = email(p.name)
    const existente = await prisma.newsletterSubscriber.findFirst({ where: { tenantId: tenant.id, email: mail } })
    if (!existente) {
      await prisma.newsletterSubscriber.create({
        data: { email: mail, tenantId: tenant.id },
      })
    }
    inscritos += 1
  }
  console.log(`⭐ Depoimentos: ${depoimentos} · Newsletter: ${inscritos} inscritas`)

  // ── Conteúdo do site ──────────────────────────────────────────────────────
  const posts = [
    { title: 'Toxina botulínica: o que esperar do resultado', slug: 'toxina-botulinica-resultado', excerpt: 'Como funciona, quanto tempo dura e por que o resultado natural depende da técnica.' },
    { title: 'Cuidados com a pele no clima seco', slug: 'cuidados-pele-clima-seco', excerpt: 'A rotina que protege a barreira cutânea nos meses de baixa umidade.' },
    { title: 'Preenchimento labial sem exagero', slug: 'preenchimento-labial-natural', excerpt: 'Volume proporcional ao rosto: como planejamos cada aplicação.' },
  ]
  for (const [i, post] of posts.entries()) {
    const existente = await prisma.blogPost.findFirst({ where: { tenantId: tenant.id, slug: post.slug } })
    const dados = {
      ...post,
      body: `${post.excerpt}

Este é um texto de demonstração para exercitar a listagem e a página de publicação do site.`,
      status: i === 2 ? ContentStatus.DRAFT : ContentStatus.PUBLISHED,
      tenantId: tenant.id,
    }
    if (existente) await prisma.blogPost.update({ where: { id: existente.id }, data: dados })
    else await prisma.blogPost.create({ data: dados })
  }
  console.log(`📰 Publicações: ${posts.length}`)

  console.log('\n✅ Seed de demonstração concluído.')
  console.log('   Portal da paciente: ' + email(PACIENTES[0].name) + ' / Paciente@2026')
  console.log('   Equipe (recepção):  recepcao@exemplo.com.br / Equipe@2026!')
}

main()
  .catch((e) => {
    console.error('❌ Falha no seed de demonstração:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
