import {
  AppointmentStatus,
  BloodType,
  CatalogKind,
  ContentStatus,
  DocumentKind,
  Gender,
  LeadStatus,
  MaritalStatus,
  MedicationControl,
  MessageSender,
  NotificationChannel,
  PrescriptionStatus,
  PrismaClient,
  RecordType,
  TreatmentPlanStatus,
  UserRole,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * Seed de demonstração: enche o banco com volume suficiente para exercitar as
 * telas de verdade.
 *
 * Diferente de `seed.ts`, que cria o mínimo para a aplicação subir (um tenant,
 * um admin, um exemplo de cada coisa), este popula a clínica como ela seria
 * depois de alguns meses de uso: catálogo completo, agenda espalhada no tempo,
 * prontuários com histórico e conversas em andamento. É o que permite ver
 * paginação, filtro, estado cheio e ordenação funcionando.
 *
 * Idempotente: reconhece o que já criou pelo e-mail/nome e atualiza em vez de
 * duplicar, então pode rodar a cada deploy sem sujar o banco.
 *
 * Os dados são fictícios e marcados como tal (e-mails @exemplo.com.br). Nunca
 * use este seed num banco com paciente real: ele grava prontuário e receita.
 */

const prisma = new PrismaClient()

const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'marcela-duch'

/** Data relativa a hoje, para a agenda nunca "envelhecer" no banco. */
function dia(offset: number, hora = 9, minuto = 0): Date {
  const d = new Date()
  d.setHours(hora, minuto, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function anos(idade: number): Date {
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
    defaultSessions: 1,
    careAfter: 'Traga suas dúvidas anotadas e, se possível, fotos recentes. Evite maquiagem pesada no dia.',
  },
  {
    number: '02',
    title: 'Toxina botulínica',
    subtitle: 'Rugas dinâmicas',
    description:
      'Aplicação para suavizar linhas de expressão da testa, glabela e região dos olhos. Resultado progressivo em até 15 dias.',
    durationMin: 45,
    bufferMin: 15,
    defaultSessions: 1,
    intervalDays: 150,
    fieldSchema: [
      { key: 'areas', label: 'Áreas aplicadas', hint: 'Testa, glabela, periorbital' },
      { key: 'unidades', label: 'Unidades', hint: 'Total aplicado na sessão' },
      { key: 'marca', label: 'Marca do produto' },
    ],
    careBefore: 'Suspenda anti-inflamatórios e bebida alcoólica 48h antes. Avise se estiver usando anticoagulante.',
    careAfter: 'Não deite nem abaixe a cabeça por 4 horas. Evite exercício físico, sauna e massagem no rosto por 24h. O resultado completo aparece em até 15 dias.',
  },
  {
    number: '03',
    title: 'Preenchimento facial',
    subtitle: 'Ácido hialurônico',
    description:
      'Reposição de volume em lábios, olheiras, malar ou mento, com técnica adequada a cada região.',
    durationMin: 60,
    bufferMin: 15,
    defaultSessions: 1,
    intervalDays: 365,
    fieldSchema: [
      { key: 'regiao', label: 'Região', hint: 'Lábios, olheiras, malar, mento' },
      { key: 'volume', label: 'Volume aplicado', hint: 'Em ml' },
      { key: 'produto', label: 'Produto' },
    ],
    careBefore: 'Evite álcool e anti-inflamatórios por 48h. Se tiver histórico de herpes labial, avise — pode ser necessário antiviral antes.',
    careAfter: 'Inchaço e pequenos roxos são esperados nos primeiros dias. Compressa fria nas primeiras 24h, sem massagear a região.',
  },
  {
    number: '04',
    title: 'Bioestimulador de colágeno',
    subtitle: 'Firmeza da pele',
    description:
      'Estimula a produção natural de colágeno para melhorar flacidez de face, pescoço e colo.',
    durationMin: 60,
    bufferMin: 15,
    defaultSessions: 3,
    intervalDays: 45,
    fieldSchema: [
      { key: 'area', label: 'Área tratada', hint: 'Face, pescoço, colo, glúteos' },
      { key: 'produto', label: 'Produto', hint: 'Radiesse, Sculptra, Ellansé' },
      { key: 'diluicao', label: 'Diluição' },
      { key: 'frascos', label: 'Frascos por sessão' },
    ],
    careBefore: 'Chegue com a pele limpa, sem maquiagem. Suspenda anti-inflamatórios 48h antes.',
    careAfter: 'Massageie a área 5 minutos, 5 vezes ao dia, por 5 dias. O colágeno se forma aos poucos: o resultado é progressivo ao longo de 2 a 3 meses.',
  },
  {
    number: '05',
    title: 'Skinbooster',
    subtitle: 'Hidratação profunda',
    description: 'Microinjeções de ácido hialurônico que devolvem viço e maciez à pele.',
    durationMin: 45,
    bufferMin: 10,
    defaultSessions: 3,
    intervalDays: 30,
    fieldSchema: [
      { key: 'area', label: 'Área tratada', hint: 'Face, pescoço, mãos' },
      { key: 'produto', label: 'Produto' },
      { key: 'volume', label: 'Volume por sessão', hint: 'Em ml' },
    ],
    careBefore: 'Evite ácidos e esfoliantes por 3 dias antes.',
    careAfter: 'Pequenas pápulas no local das injeções são normais e somem em até 48h. Use protetor solar todos os dias.',
  },
  {
    number: '06',
    title: 'Peeling químico',
    subtitle: 'Renovação celular',
    description: 'Renova a camada superficial da pele, clareando manchas e melhorando a textura.',
    durationMin: 40,
    bufferMin: 10,
    defaultSessions: 4,
    intervalDays: 21,
    fieldSchema: [
      { key: 'agente', label: 'Ativo utilizado', hint: 'Glicólico, salicílico, retinoico' },
      { key: 'concentracao', label: 'Concentração' },
      { key: 'tempo', label: 'Tempo de permanência' },
    ],
    careBefore: 'Suspenda ácidos e retinoides 5 dias antes. Não se exponha ao sol na semana anterior.',
    careAfter: 'A pele descama entre o 3º e o 7º dia — não puxe nem esfregue. Protetor solar FPS 50 a cada 3 horas é obrigatório.',
  },
  {
    number: '07',
    title: 'Microagulhamento',
    subtitle: 'Textura e cicatrizes',
    description: 'Indução de colágeno para cicatrizes de acne, poros dilatados e textura irregular.',
    durationMin: 50,
    bufferMin: 15,
    defaultSessions: 5,
    intervalDays: 30,
    fieldSchema: [
      { key: 'area', label: 'Área tratada' },
      { key: 'profundidade', label: 'Profundidade da agulha', hint: 'Em mm' },
      { key: 'ativo', label: 'Ativo aplicado', hint: 'Drug delivery' },
      { key: 'indicacao', label: 'Indicação', hint: 'Cicatriz de acne, poros, textura' },
    ],
    careBefore: 'Suspenda ácidos 5 dias antes. Avise se tiver herpes ativo ou lesão de acne inflamada na área.',
    careAfter: 'Vermelhidão parecida com queimadura de sol por 24 a 48h. Só água termal e hidratante indicado nas primeiras 24h. Sem maquiagem, sol ou academia por 3 dias.',
  },
  {
    number: '08',
    title: 'Limpeza de pele profunda',
    subtitle: 'Cuidado mensal',
    description: 'Extração, higienização e hidratação, indicada como manutenção da rotina de cuidados.',
    durationMin: 60,
    bufferMin: 10,
    defaultSessions: 6,
    intervalDays: 30,
    fieldSchema: [
      { key: 'tipoPele', label: 'Tipo de pele' },
      { key: 'extracao', label: 'Grau de extração' },
    ],
    careAfter: 'Evite sol direto por 24h e não use maquiagem no restante do dia.',
  },
  {
    number: '09',
    title: 'Retorno de acompanhamento',
    subtitle: 'Revisão do tratamento',
    description: 'Consulta de revisão para acompanhar a resposta ao tratamento e ajustar o plano.',
    durationMin: 30,
    bufferMin: 5,
    isBookable: false,
    defaultSessions: 1,
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

/** Preco medio por sessao, em centavos — o que a clinica cobra de fato. */
const PRECO_SESSAO: Record<string, number> = {
  'Consulta de avaliação': 35000,
  'Toxina botulínica': 120000,
  'Preenchimento facial': 150000,
  'Bioestimulador de colágeno': 190000,
  Skinbooster: 90000,
  'Peeling químico': 45000,
  Microagulhamento: 55000,
  'Limpeza de pele profunda': 25000,
  'Retorno de acompanhamento': 0,
}

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

function email(nome: string): string {
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

function telefone(i: number): string {
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
function cpf(i: number): string {
  const base = String(100000000 + i * 12345671).slice(0, 9)
  const digito = (parcial: string) => {
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
  ] as const) {
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
  const catalogo: { kind: CatalogKind; itens: Record<string, unknown>[] }[] = [
    { kind: CatalogKind.MEDICATION, itens: MEDICAMENTOS },
    { kind: CatalogKind.EXAM, itens: EXAMES },
    { kind: CatalogKind.GUIDANCE, itens: ORIENTACOES },
    { kind: CatalogKind.RECORD_TEMPLATE, itens: MODELOS_PRONTUARIO },
  ]
  let totalCatalogo = 0
  const medicamentos: { id: string; name: string }[] = []
  for (const grupo of catalogo) {
    for (const item of grupo.itens) {
      const nome = item.name as string
      const existente = await prisma.catalogItem.findFirst({
        where: { tenantId: tenant.id, kind: grupo.kind, name: nome },
      })
      const dados = { ...item, kind: grupo.kind, tenantId: tenant.id, isActive: true } as never
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
      medications: (p as { medications?: string }).medications ?? null,
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
  const agendaPlano: { offset: number; hora: number; pacienteIdx: number; procIdx: number; status: AppointmentStatus }[] = []
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
    const proc = procedimentos.find((p) => p.id === ag.procedureId)!
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
          patientId: ag.patientId!,
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
          performedAt: ag.scheduledAt!,
          priceCents: [35000, 90000, 120000, 150000, 65000, 45000, 55000, 25000, 0][i % 9],
          notes: `${proc.title} realizado conforme plano.`,
          patientId: ag.patientId!,
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

  // ── Planos de tratamento (a jornada) ──────────────────────────────────────
  // Os planos são o que dá sentido às sessões: sem eles a paciente vê uma lista
  // solta de procedimentos e não sabe onde está. Aqui eles cobrem todos os
  // estados que as telas precisam mostrar — começando, no meio, quase no fim,
  // pausado, concluído e cancelado — porque um seed só com o caso feliz esconde
  // exatamente os casos que quebram na hora de testar.
  //
  // As três primeiras pacientes têm acesso ao portal, então são elas que
  // recebem as jornadas mais completas.
  const proc = (titulo: string) => procedimentos.find((p) => p.title === titulo)!

  const PLANOS: {
    paciente: number
    procedimento: string
    status: TreatmentPlanStatus
    total: number
    feitas: number
    /** Dias atrás em que a primeira sessão aconteceu. */
    inicio: number
    intervalo: number
    details: Record<string, string>
    careBefore?: string
    careAfter?: string
    internalNotes?: string
  }[] = [
    // Ana Beatriz (portal) — a jornada mais rica: três planos em fases diferentes.
    {
      paciente: 0,
      procedimento: 'Bioestimulador de colágeno',
      status: TreatmentPlanStatus.ACTIVE,
      total: 3,
      feitas: 2,
      inicio: 96,
      intervalo: 45,
      details: { area: 'Terço médio e mandíbula', produto: 'Radiesse', diluicao: '1:1 com lidocaína', frascos: '1,5ml por lado' },
      careAfter:
        'Massageie a área 5 minutos, 5 vezes ao dia, por 5 dias. O resultado é progressivo: a firmeza aparece ao longo de 2 a 3 meses.',
      internalNotes: 'Pele fina no terço médio — manter diluição maior. Respondeu bem à primeira sessão.',
    },
    {
      paciente: 0,
      procedimento: 'Skinbooster',
      status: TreatmentPlanStatus.ACTIVE,
      total: 3,
      feitas: 1,
      inicio: 28,
      intervalo: 30,
      details: { area: 'Face completa', produto: 'Restylane Vital', volume: '2ml' },
      internalNotes: 'Combinar com o bioestimulador — intercalar as datas para não sobrecarregar.',
    },
    {
      paciente: 0,
      procedimento: 'Toxina botulínica',
      status: TreatmentPlanStatus.COMPLETED,
      total: 1,
      feitas: 1,
      inicio: 150,
      intervalo: 150,
      details: { areas: 'Testa, glabela e periorbital', unidades: '32U', marca: 'Botox' },
      internalNotes: 'Glabela forte, precisou de 4U a mais que o previsto.',
    },

    // Carolina (portal) — começando agora: mostra o plano quase vazio.
    {
      paciente: 1,
      procedimento: 'Microagulhamento',
      status: TreatmentPlanStatus.ACTIVE,
      total: 5,
      feitas: 1,
      inicio: 30,
      intervalo: 30,
      details: {
        area: 'Face — região malar e mandíbula',
        profundidade: '1,5mm',
        ativo: 'Ácido hialurônico não reticulado',
        indicacao: 'Cicatriz de acne',
      },
      careBefore: 'Avise se sentir formigamento no lábio nos dias anteriores — pode ser herpes, e adiamos a sessão.',
      internalNotes: 'Cicatrizes distensíveis respondem melhor. Reavaliar profundidade na 3ª sessão.',
    },
    {
      paciente: 1,
      procedimento: 'Peeling químico',
      status: TreatmentPlanStatus.PAUSED,
      total: 4,
      feitas: 2,
      inicio: 120,
      intervalo: 21,
      details: { agente: 'Ácido glicólico', concentracao: '30%', tempo: '5 minutos' },
      internalNotes: 'Pausado a pedido da paciente — viagem de trabalho. Retomar em março.',
    },

    // Daniela (portal) — plano longo e quase no fim: exercita a barra cheia.
    {
      paciente: 2,
      procedimento: 'Limpeza de pele profunda',
      status: TreatmentPlanStatus.ACTIVE,
      total: 6,
      feitas: 5,
      inicio: 160,
      intervalo: 30,
      details: { tipoPele: 'Mista com tendência acneica', extracao: 'Moderada' },
      careAfter: 'Evite sol direto por 24h e não use maquiagem no restante do dia.',
    },
    {
      paciente: 2,
      procedimento: 'Preenchimento facial',
      status: TreatmentPlanStatus.COMPLETED,
      total: 1,
      feitas: 1,
      inicio: 200,
      intervalo: 365,
      details: { regiao: 'Olheiras', volume: '1ml', produto: 'Belotero Balance' },
      internalNotes: 'Vaso proeminente à esquerda — técnica com cânula, entrada lateral.',
    },
    {
      paciente: 2,
      procedimento: 'Bioestimulador de colágeno',
      status: TreatmentPlanStatus.CANCELLED,
      total: 3,
      feitas: 0,
      inicio: 60,
      intervalo: 45,
      details: { area: 'Colo', produto: 'Sculptra' },
      internalNotes: 'Cancelado: paciente optou por adiar por questão financeira. Retomar conversa no segundo semestre.',
    },

    // Demais pacientes — volume para a lista da médica não parecer vazia.
    {
      paciente: 3,
      procedimento: 'Toxina botulínica',
      status: TreatmentPlanStatus.ACTIVE,
      total: 1,
      feitas: 0,
      inicio: 5,
      intervalo: 150,
      details: { areas: 'Testa e glabela', unidades: '24U', marca: 'Dysport' },
    },
    {
      paciente: 4,
      procedimento: 'Bioestimulador de colágeno',
      status: TreatmentPlanStatus.COMPLETED,
      total: 3,
      feitas: 3,
      inicio: 140,
      intervalo: 45,
      details: { area: 'Face e pescoço', produto: 'Sculptra', diluicao: '8ml', frascos: '2 frascos' },
      internalNotes: 'Concluiu as três sessões. Avaliar necessidade de manutenção em 12 meses.',
    },
    {
      paciente: 5,
      procedimento: 'Skinbooster',
      status: TreatmentPlanStatus.ACTIVE,
      total: 3,
      feitas: 2,
      inicio: 65,
      intervalo: 30,
      details: { area: 'Face e pescoço', produto: 'Profhilo', volume: '2ml' },
    },
    {
      paciente: 6,
      procedimento: 'Microagulhamento',
      status: TreatmentPlanStatus.ACTIVE,
      total: 5,
      feitas: 3,
      inicio: 95,
      intervalo: 30,
      details: { area: 'Face completa', profundidade: '1,0mm', ativo: 'Vitamina C', indicacao: 'Textura e poros' },
    },
    {
      paciente: 7,
      procedimento: 'Peeling químico',
      status: TreatmentPlanStatus.ACTIVE,
      total: 4,
      feitas: 1,
      inicio: 22,
      intervalo: 21,
      details: { agente: 'Ácido salicílico', concentracao: '20%', tempo: '4 minutos' },
    },
    {
      paciente: 8,
      procedimento: 'Limpeza de pele profunda',
      status: TreatmentPlanStatus.ACTIVE,
      total: 6,
      feitas: 2,
      inicio: 62,
      intervalo: 30,
      details: { tipoPele: 'Oleosa', extracao: 'Intensa' },
    },
    {
      paciente: 9,
      procedimento: 'Preenchimento facial',
      status: TreatmentPlanStatus.COMPLETED,
      total: 1,
      feitas: 1,
      inicio: 75,
      intervalo: 365,
      details: { regiao: 'Lábios', volume: '0,8ml', produto: 'Juvéderm Ultra' },
    },
    {
      paciente: 10,
      procedimento: 'Bioestimulador de colágeno',
      status: TreatmentPlanStatus.PAUSED,
      total: 3,
      feitas: 1,
      inicio: 80,
      intervalo: 45,
      details: { area: 'Glúteos', produto: 'Radiesse', diluicao: '1:2', frascos: '3ml por lado' },
      internalNotes: 'Diabética — acompanhar cicatrização com atenção. Pausado até controle glicêmico melhorar.',
    },
    {
      paciente: 11,
      procedimento: 'Skinbooster',
      status: TreatmentPlanStatus.ACTIVE,
      total: 3,
      feitas: 0,
      inicio: 2,
      intervalo: 30,
      details: { area: 'Face', produto: 'Restylane Vital', volume: '2ml' },
    },
    {
      paciente: 12,
      procedimento: 'Microagulhamento',
      status: TreatmentPlanStatus.CANCELLED,
      total: 5,
      feitas: 1,
      inicio: 110,
      intervalo: 30,
      details: { area: 'Face', profundidade: '0,5mm', ativo: 'Ácido hialurônico', indicacao: 'Rejuvenescimento' },
      internalNotes: 'Cancelado por baixa adesão — faltou a duas sessões seguidas.',
    },
    {
      paciente: 13,
      procedimento: 'Toxina botulínica',
      status: TreatmentPlanStatus.COMPLETED,
      total: 1,
      feitas: 1,
      inicio: 175,
      intervalo: 150,
      details: { areas: 'Periorbital', unidades: '16U', marca: 'Botox' },
    },
    {
      paciente: 14,
      procedimento: 'Peeling químico',
      status: TreatmentPlanStatus.ACTIVE,
      total: 4,
      feitas: 3,
      inicio: 88,
      intervalo: 21,
      details: { agente: 'Ácido retinoico', concentracao: '5%', tempo: '6 horas' },
      internalNotes: 'Fototipo IV — risco de hiperpigmentação. Reforçar protetor solar a cada retorno.',
    },
  ]

  let planosCriados = 0
  let sessoesDePlano = 0
  for (const dados of PLANOS) {
    const paciente = pacientes[dados.paciente]
    const procedimento = proc(dados.procedimento)

    // Idempotência: o par paciente+procedimento identifica o plano no seed.
    const existente = await prisma.treatmentPlan.findFirst({
      where: { tenantId: tenant.id, patientId: paciente.id, procedureId: procedimento.id },
    })

    const ultimaSessao = dados.feitas > 0 ? dados.inicio - (dados.feitas - 1) * dados.intervalo : dados.inicio

    const campos = {
      title: procedimento.title,
      status: dados.status,
      totalSessions: dados.total,
      intervalDays: dados.intervalo,
      details: dados.details,
      careBefore: dados.careBefore ?? null,
      careAfter: dados.careAfter ?? null,
      internalNotes: dados.internalNotes ?? null,
      startedAt: dia(-dados.inicio, 10),
      completedAt: dados.status === TreatmentPlanStatus.COMPLETED ? dia(-ultimaSessao, 11) : null,
      patientId: paciente.id,
      procedureId: procedimento.id,
      createdById: doctor.id,
      tenantId: tenant.id,
    }

    const plano = existente
      ? await prisma.treatmentPlan.update({ where: { id: existente.id }, data: campos })
      : await prisma.treatmentPlan.create({ data: campos })
    planosCriados += 1

    // As sessões do plano, espaçadas pelo intervalo e numeradas na série. É o
    // que faz a barra de progresso do portal mostrar um número verdadeiro.
    for (let n = 1; n <= dados.feitas; n += 1) {
      const quandoAtras = dados.inicio - (n - 1) * dados.intervalo
      const jaExiste = await prisma.procedureSession.findFirst({
        where: { planId: plano.id, sessionNumber: n },
      })
      if (jaExiste) continue
      await prisma.procedureSession.create({
        data: {
          performedAt: dia(-quandoAtras, 10, 30),
          priceCents: PRECO_SESSAO[dados.procedimento] ?? 50000,
          notes:
            n === 1
              ? `Primeira sessão de ${dados.total}. Procedimento realizado sem intercorrências.`
              : `${n}ª sessão de ${dados.total}. Boa evolução em relação à anterior, sem eventos adversos.`,
          patientId: paciente.id,
          procedureId: procedimento.id,
          planId: plano.id,
          sessionNumber: n,
          tenantId: tenant.id,
        },
      })
      sessoesDePlano += 1
    }
  }
  console.log(
    `✨ Planos de tratamento: ${planosCriados}` +
      ` (${PLANOS.filter((p) => p.status === TreatmentPlanStatus.ACTIVE).length} em andamento,` +
      ` ${PLANOS.filter((p) => p.status === TreatmentPlanStatus.PAUSED).length} pausados,` +
      ` ${PLANOS.filter((p) => p.status === TreatmentPlanStatus.COMPLETED).length} concluídos,` +
      ` ${PLANOS.filter((p) => p.status === TreatmentPlanStatus.CANCELLED).length} cancelados)` +
      ` · Sessões vinculadas: ${sessoesDePlano}`,
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
        patientId: ag.patientId!,
        appointmentId: ag.id,
        tenantId: tenant.id,
      },
    })

    for (const [ordem, med] of medicamentos.slice(i % 3, (i % 3) + 2).entries()) {
      const fonte = MEDICAMENTOS.find((m) => m.name === med.name)!
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

  // ── Modelos de documento ──────────────────────────────────────────────────
  // Guardam o que se repete a cada emissão: o texto pronto e o layout de
  // impressão. O primeiro de cada tipo entra como padrão, que é o que a tela
  // sugere primeiro ao emitir.
  const LAYOUT_BASE = {
    showClinicHeader: true,
    signaturePosition: 'center',
    signatureSpaceMm: 24,
    showVerificationQr: true,
    marginMm: 20,
    fontFamily: 'sans',
    fontSizePt: 11,
    paper: 'A4',
  }

  const MODELOS = [
    {
      name: 'Receita pós-procedimento',
      kind: 'PRESCRIPTION',
      title: 'Receita',
      instructions:
        'Seguir as orientações abaixo por 7 dias.\n\nEm caso de dor intensa, vermelhidão progressiva ou febre, entre em contato com a clínica.',
      isDefault: true,
      layout: { ...LAYOUT_BASE, footerHtml: '<p>Documento assinado digitalmente. Confira a autenticidade pelo QR ao lado.</p>' },
    },
    {
      name: 'Pedido de exames pré-procedimento',
      kind: 'EXAM_REQUEST',
      title: 'Solicitação de exames',
      instructions: 'Realizar os exames abaixo e trazer os resultados na próxima consulta.',
      isDefault: true,
      layout: { ...LAYOUT_BASE },
    },
    {
      name: 'Orientações pós-toxina botulínica',
      kind: 'GUIDANCE',
      title: 'Cuidados após o procedimento',
      instructions: ORIENTACOES[0].body,
      isDefault: true,
      layout: { ...LAYOUT_BASE, signatureSpaceMm: 12, showVerificationQr: false },
    },
    {
      name: 'Orientações pós-preenchimento',
      kind: 'GUIDANCE',
      title: 'Cuidados após o procedimento',
      instructions: ORIENTACOES[1].body,
      layout: { ...LAYOUT_BASE, signatureSpaceMm: 12, showVerificationQr: false },
    },
    {
      name: 'Atestado de comparecimento',
      kind: 'CERTIFICATE',
      title: 'Atestado de comparecimento',
      instructions:
        'Atesto para os devidos fins que a paciente compareceu a esta clínica nesta data, para atendimento médico.',
      isDefault: true,
      layout: { ...LAYOUT_BASE, paper: 'A5', signatureSpaceMm: 20, showVerificationQr: false },
    },
  ]

  let modelos = 0
  for (const m of MODELOS) {
    const existente = await prisma.documentTemplate.findFirst({
      where: { tenantId: tenant.id, name: m.name },
    })
    const dados = { ...m, kind: m.kind as DocumentKind, tenantId: tenant.id, createdById: doctor.id, isActive: true }
    if (existente) await prisma.documentTemplate.update({ where: { id: existente.id }, data: dados })
    else await prisma.documentTemplate.create({ data: dados })
    modelos += 1
  }
  console.log(`📄 Modelos de documento: ${modelos}`)

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
