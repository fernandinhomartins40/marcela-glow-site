import {
  PrismaClient,
  AppointmentStatus,
  BloodType,
  Gender,
  LeadStatus,
  MaritalStatus,
  NotificationChannel,
  PrescriptionStatus,
  TreatmentPlanStatus,
  UserRole,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Tenant
  // ───────────────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'marcela-duch' },
    update: {},
    create: {
      name: 'Clínica Dra. Marcela Duch',
      slug: 'marcela-duch',
      email: 'contato@drmarceladuch.com.br',
      phone: '(11) 99999-9999',
      address: 'Av. Paulista, 1234 - Sala 56, São Paulo - SP',
      logoUrl: null,
      isActive: true,
    },
  })
  console.log(`✅ Tenant criado/encontrado: ${tenant.name} (${tenant.id})`)

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Demo staff users
  // ───────────────────────────────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Admin@2024!', 12)
  const staffPasswordHash = await bcrypt.hash('Equipe@2026!', 12)

  const adminUser = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email: 'admin@drmarceladuch.com.br',
        tenantId: tenant.id,
      },
    },
    update: { passwordHash: adminPasswordHash, isActive: true, role: UserRole.ADMIN },
    create: {
      email: 'admin@drmarceladuch.com.br',
      passwordHash: adminPasswordHash,
      name: 'Dra. Marcela Duch',
      role: UserRole.ADMIN,
      tenantId: tenant.id,
    },
  })
  console.log(`✅ Usuário admin criado/encontrado: ${adminUser.name} (${adminUser.email})`)

  const staffUser = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email: 'equipe@drmarceladuch.com.br',
        tenantId: tenant.id,
      },
    },
    update: { passwordHash: staffPasswordHash, isActive: true, role: UserRole.STAFF },
    create: {
      email: 'equipe@drmarceladuch.com.br',
      passwordHash: staffPasswordHash,
      name: 'Equipe Demo',
      role: UserRole.STAFF,
      tenantId: tenant.id,
    },
  })
  console.log(`✅ Usuário equipe criado/encontrado: ${staffUser.name} (${staffUser.email})`)

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Procedures
  // ───────────────────────────────────────────────────────────────────────────
  const proceduresData = [
    {
      number: '01',
      title: 'Neck Contour Signature',
      subtitle: 'Assinatura exclusiva',
      description:
        'Protocolo exclusivo desenvolvido pela Dra. Marcela Duch para definição e rejuvenescimento da região cervical. Combina técnicas avançadas de bioestimulação, ultrassom microfocado e toxina botulínica para redefinir o contorno do pescoço, suavizar linhas de expressão e promover firmeza tissular. Resultado: um pescoço elegante, alongado e com aparência significativamente mais jovem, preservando a naturalidade e a harmonia com o rosto.',
      imageUrl: null,
      isActive: true,
      displayOrder: 1,
    },
    {
      number: '02',
      title: 'Harmonização Facial',
      subtitle: 'Equilíbrio e proporção',
      description:
        'Abordagem global e personalizada que integra múltiplas técnicas injetáveis para reequilibrar as proporções do rosto de acordo com os padrões de beleza e a individualidade de cada paciente. Utilizando toxina botulínica, ácido hialurônico e bioestimuladores, o tratamento corrige assimetrias, suaviza rugas, redefine contornos e restaura volumes perdidos com o envelhecimento. O resultado é um rosto harmonioso, expressivo e com aspecto naturalmente rejuvenescido.',
      imageUrl: null,
      isActive: true,
      displayOrder: 2,
    },
    {
      number: '03',
      title: 'Bioestimuladores de Colágeno',
      subtitle: 'Rejuvenescimento progressivo',
      description:
        'Tratamento inovador que estimula a produção natural de colágeno pela própria pele, promovendo rejuvenescimento gradual e duradouro. Com substâncias como Sculptra (ácido poli-L-láctico), Radiesse (hidroxiapatita de cálcio) e Ellansé (policaprolactona), o protocolo melhora a firmeza, a elasticidade e a textura da pele ao longo de semanas. Indicado para quem busca resultados progressivos e naturais, com efeitos que podem durar de 18 meses a 2 anos.',
      imageUrl: null,
      isActive: true,
      displayOrder: 3,
      defaultSessions: 3,
      intervalDays: 45,
      fieldSchema: [
        { key: 'area', label: 'Área tratada', hint: 'Face, pescoço, colo, glúteos' },
        { key: 'produto', label: 'Produto', hint: 'Sculptra, Radiesse, Ellansé' },
        { key: 'diluicao', label: 'Diluição' },
        { key: 'frascos', label: 'Frascos por sessão' },
      ],
      careBefore: 'Chegue com a pele limpa, sem maquiagem. Suspenda anti-inflamatórios 48h antes.',
      careAfter: 'Massageie a área 5 minutos, 5 vezes ao dia, por 5 dias. O resultado é progressivo ao longo de 2 a 3 meses.',
    },
    {
      number: '04',
      title: 'Preenchimento Premium',
      subtitle: 'Ácido hialurônico de alta densidade',
      description:
        'Procedimento de preenchimento com ácido hialurônico de última geração, selecionado conforme a área a ser tratada e o resultado desejado. Utilizado para restaurar volumes faciais, preencher sulcos e rugas profundas, definir contornos do rosto (mandíbula, queixo, maçãs do rosto) e promover hidratação profunda. A técnica por planos e camadas, aliada ao uso de cânulas flexíveis, garante máxima segurança, precisão e resultados harmoniosos e discretos.',
      imageUrl: null,
      isActive: true,
      displayOrder: 4,
    },
    {
      number: '05',
      title: 'T-Sculptor Body',
      subtitle: 'Remodelagem corporal não invasiva',
      description:
        'Protocolo corporal de alta performance que combina tecnologias como radiofrequência, ultrassom cavitacional e eletroestimulação para remodelar e esculpir a silhueta sem cirurgia. O tratamento reduz medidas, melhora o contorno corporal, combate a celulite e promove flacidez. Ideal para abdômen, flancos, coxas e braços. Cada sessão é personalizada conforme as necessidades e objetivos da paciente, com resultados visíveis já após as primeiras aplicações.',
      imageUrl: null,
      isActive: true,
      displayOrder: 5,
    },
    {
      number: '06',
      title: 'Skinbooster & Hidratação',
      subtitle: 'Glow editorial',
      description:
        'Protocolo intensivo de hidratação profunda e luminosidade com microinjeções de ácido hialurônico não reticulado diretamente na derme. O Skinbooster revitaliza a pele de dentro para fora, melhorando textura, elasticidade, luminosidade e uniformidade do tom. Indicado para rosto, pescoço, décolleté e mãos. O resultado é uma pele com aquele brilho editorial, saudável e iluminada, como saída de um making-of de moda.',
      imageUrl: null,
      isActive: true,
      displayOrder: 6,
      defaultSessions: 3,
      intervalDays: 30,
      fieldSchema: [
        { key: 'area', label: 'Área tratada', hint: 'Rosto, pescoço, colo, mãos' },
        { key: 'produto', label: 'Produto' },
        { key: 'volume', label: 'Volume por sessão' },
      ],
      careAfter: 'Pequenas pápulas no local das injeções são normais e somem em até 48h. Use protetor solar todos os dias.',
    },
  ]

  const procedures: Array<{ id: string; title: string }> = []

  for (const proc of proceduresData) {
    // Use number+tenantId as a stable lookup key via a find-or-create pattern
    const existing = await prisma.procedure.findFirst({
      where: { number: proc.number, tenantId: tenant.id },
    })

    let record
    if (existing) {
      record = await prisma.procedure.update({
        where: { id: existing.id },
        data: proc,
      })
    } else {
      record = await prisma.procedure.create({
        data: { ...proc, tenantId: tenant.id },
      })
    }
    procedures.push({ id: record.id, title: record.title })
    console.log(`✅ Procedimento: ${record.number} - ${record.title}`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Testimonials
  // ───────────────────────────────────────────────────────────────────────────
  const testimonialsData = [
    {
      authorName: 'Ana Paula Silva',
      text: 'A experiência na Clínica da Dra. Marcela foi absolutamente transformadora. O atendimento desde a recepção até o procedimento é impecável. Fiz a Harmonização Facial e o resultado superou todas as minhas expectativas — continuo eu mesma, só muito mais descansada e radiante. Já indiquei para todas as minhas amigas!',
      rating: 5,
      isVisible: true,
      displayOrder: 1,
    },
    {
      authorName: 'Juliana Mendes',
      text: 'Finalmente encontrei uma médica que realmente ouve o que você quer e entende o que você precisa. Fiz o Skinbooster e minha pele está completamente outra — hidratada, luminosa e uniforme. A Dra. Marcela tem um olhar clínico apurado e uma sensibilidade estética rara. Resultado natural é a palavra de ordem aqui. Amei demais!',
      rating: 5,
      isVisible: true,
      displayOrder: 2,
    },
    {
      authorName: 'Carla Rodrigues',
      text: 'Comecei o tratamento com Bioestimuladores de Colágeno há seis meses e a diferença é impressionante. Minha pele ficou muito mais firme, com menos flacidez e uma textura linda. O que mais me surpreendeu foi a naturalidade — ninguém sabe que fiz algo, só percebem que estou com uma aparência incrível. Dra. Marcela é uma artista!',
      rating: 5,
      isVisible: true,
      displayOrder: 3,
    },
    {
      authorName: 'Beatriz Costa',
      text: 'O protocolo Neck Contour Signature foi revelação para mim. Nunca imaginei que a região do pescoço pudesse mudar tanto e de forma tão elegante. A Dra. Marcela explicou cada etapa do procedimento com toda a clareza, me deixou completamente à vontade e o resultado foi extraordinário. Clínica sofisticada, atendimento humanizado e resultados reais. Nota 10!',
      rating: 5,
      isVisible: true,
      displayOrder: 4,
    },
  ]

  for (const t of testimonialsData) {
    const existing = await prisma.testimonial.findFirst({
      where: { authorName: t.authorName, tenantId: tenant.id },
    })

    if (existing) {
      await prisma.testimonial.update({ where: { id: existing.id }, data: t })
    } else {
      await prisma.testimonial.create({ data: { ...t, tenantId: tenant.id } })
    }
    console.log(`✅ Depoimento: ${t.authorName}`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Appointments
  // ───────────────────────────────────────────────────────────────────────────
  const appointmentsData = [
    {
      name: 'Fernanda Oliveira',
      email: 'fernanda.oliveira@gmail.com',
      phone: '(11) 98765-4321',
      message:
        'Gostaria de saber mais sobre a Harmonização Facial. Tenho 35 anos e estou notando que perdi um pouco do volume nas bochechas. Quero um resultado natural.',
      status: AppointmentStatus.PENDING,
      procedureTitle: 'Harmonização Facial',
      scheduledAt: null,
    },
    {
      name: 'Renata Alves',
      email: 'renata.alves@outlook.com',
      phone: '(11) 97654-3210',
      message:
        'Tenho interesse no tratamento de Bioestimuladores de Colágeno. Já fiz uma pesquisa sobre o Sculptra e gostaria de uma consulta de avaliação.',
      status: AppointmentStatus.CONFIRMED,
      procedureTitle: 'Bioestimuladores de Colágeno',
      scheduledAt: new Date('2026-05-10T10:00:00-03:00'),
    },
    {
      name: 'Isabela Ferreira',
      email: 'isabela.ferreira@hotmail.com',
      phone: '(11) 96543-2109',
      message:
        'Quero fazer o Skinbooster para melhorar a hidratação e o brilho da pele antes do meu casamento em junho. Estou muito ansiosa para o resultado!',
      status: AppointmentStatus.COMPLETED,
      procedureTitle: 'Skinbooster & Hidratação',
      scheduledAt: new Date('2026-04-15T14:30:00-03:00'),
    },
    {
      name: 'Mariana Santos',
      email: 'mariana.santos@gmail.com',
      phone: '(11) 95432-1098',
      message:
        'Tenho interesse no protocolo T-Sculptor Body para remodelagem do abdômen e flancos. Pratico atividade física regularmente mas preciso de um auxílio para definir mais.',
      status: AppointmentStatus.CONFIRMED,
      procedureTitle: 'T-Sculptor Body',
      scheduledAt: new Date('2026-05-07T09:00:00-03:00'),
    },
    {
      name: 'Patrícia Lima',
      email: 'patricia.lima@uol.com.br',
      phone: '(11) 94321-0987',
      message:
        'Gostaria de agendar uma consulta para avaliar o Preenchimento Premium nos lábios e no sulco nasogeniano. Já fiz preenchimento em outra clínica mas quero uma segunda opinião especializada.',
      status: AppointmentStatus.CANCELLED,
      procedureTitle: 'Preenchimento Premium',
      scheduledAt: null,
    },
  ]

  for (const appt of appointmentsData) {
    const procedure = procedures.find((p) => p.title === appt.procedureTitle)

    const existing = await prisma.appointment.findFirst({
      where: { email: appt.email, tenantId: tenant.id },
    })

    const payload = {
      name: appt.name,
      email: appt.email,
      phone: appt.phone,
      message: appt.message,
      status: appt.status,
      procedureId: procedure?.id ?? null,
      scheduledAt: appt.scheduledAt,
    }

    if (existing) {
      await prisma.appointment.update({ where: { id: existing.id }, data: payload })
    } else {
      await prisma.appointment.create({ data: { ...payload, tenantId: tenant.id } })
    }
    console.log(`✅ Agendamento: ${appt.name} (${appt.status})`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Newsletter Subscribers
  // ───────────────────────────────────────────────────────────────────────────
  const subscribersData = [
    { email: 'camila.moura@gmail.com' },
    { email: 'larissa.nascimento@hotmail.com' },
    { email: 'amanda.pereira@outlook.com' },
  ]

  for (const sub of subscribersData) {
    await prisma.newsletterSubscriber.upsert({
      where: { email_tenantId: { email: sub.email, tenantId: tenant.id } },
      update: {},
      create: { email: sub.email, tenantId: tenant.id },
    })
    console.log(`✅ Inscrita na newsletter: ${sub.email}`)
  }

  const patientPasswordHash = await bcrypt.hash('Paciente@2026', 12)
  // Ficha completa: serve de exemplo do que o cadastro comporta e exercita os
  // alertas clínicos. Telefone e CPF em dígitos crus, como a API grava.
  const patientProfile = {
    name: 'Paciente VIP Demo',
    phone: '11900000000',
    isActive: true,
    notes: 'Paciente demonstrativa para o PWA da área da paciente.',
    birthDate: new Date('1990-05-14T00:00:00.000Z'),
    cpf: '52998224725',
    socialName: null,
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    occupation: 'Advogada',
    nationality: 'Brasileira',
    zipCode: '79560000',
    street: 'Rua das Acácias',
    streetNumber: '450',
    district: 'Centro',
    city: 'Chapadão do Sul',
    state: 'MS',
    emergencyName: 'Ana Demo',
    emergencyPhone: '11988887777',
    emergencyRelation: 'Irmã',
    allergies: 'Dipirona, penicilina',
    medications: 'Levotiroxina 50mcg',
    conditions: 'Hipotireoidismo',
    bloodType: BloodType.O_POSITIVE,
    skinType: 'Fototipo III, sensível',
    referralSource: 'Instagram',
    lgpdConsentAt: new Date(),
    imageConsentAt: new Date(),
  }

  const patient = await prisma.patient.upsert({
    where: { email_tenantId: { email: 'paciente@exemplo.com', tenantId: tenant.id } },
    update: { ...patientProfile, passwordHash: patientPasswordHash },
    create: {
      ...patientProfile,
      email: 'paciente@exemplo.com',
      passwordHash: patientPasswordHash,
      tenantId: tenant.id,
    },
  })
  console.log(`✅ Paciente demo criado/encontrado: ${patient.name} (${patient.email})`)


  // ── Jornada da paciente demo ──────────────────────────────────────────────
  // O login de teste do portal precisa ter o que mostrar: sem plano, a aba
  // Jornada abre vazia e não dá para conferir se a tela funciona. São dois —
  // um em andamento e um concluído — porque é a diferença entre eles que a
  // tela precisa saber desenhar.
  const planosDemo: {
    procedimento: string
    titulo: string
    status: TreatmentPlanStatus
    total: number
    feitas: number
    /** Dias atrás da primeira sessão. */
    inicio: number
    intervalo: number
    details: Record<string, string>
    careBefore?: string
    careAfter?: string
    internalNotes?: string
  }[] = [
    {
      procedimento: 'Bioestimuladores de Colágeno',
      titulo: 'Bioestimulador de colágeno',
      status: TreatmentPlanStatus.ACTIVE,
      total: 3,
      feitas: 2,
      inicio: 90,
      intervalo: 45,
      details: {
        area: 'Terço médio e mandíbula',
        produto: 'Radiesse',
        diluicao: '1:1 com lidocaína',
        frascos: '1,5ml por lado',
      },
      careBefore: 'Chegue com a pele limpa, sem maquiagem. Suspenda anti-inflamatórios 48h antes.',
      careAfter:
        'Massageie a área 5 minutos, 5 vezes ao dia, por 5 dias. O colágeno se forma aos poucos: o resultado é progressivo ao longo de 2 a 3 meses.',
      internalNotes: 'Hipotireoidismo controlado — sem contraindicação. Boa resposta na primeira sessão.',
    },
    {
      procedimento: 'Skinbooster & Hidratação',
      titulo: 'Skinbooster',
      status: TreatmentPlanStatus.COMPLETED,
      total: 3,
      feitas: 3,
      inicio: 180,
      intervalo: 30,
      details: { area: 'Face completa', produto: 'Restylane Vital', volume: '2ml por sessão' },
      careAfter:
        'Pequenas pápulas no local das injeções são normais e somem em até 48h. Use protetor solar todos os dias.',
    },
  ]

  for (const dados of planosDemo) {
    const procedimento = procedures.find((p) => p.title === dados.procedimento)
    if (!procedimento) continue

    const ultima = dados.feitas > 0 ? dados.inicio - (dados.feitas - 1) * dados.intervalo : dados.inicio
    const desde = (diasAtras: number, hora = 10) => {
      const d = new Date()
      d.setHours(hora, 30, 0, 0)
      d.setDate(d.getDate() - diasAtras)
      return d
    }

    const camposPlano = {
      title: dados.titulo,
      status: dados.status,
      totalSessions: dados.total,
      intervalDays: dados.intervalo,
      details: dados.details,
      careBefore: dados.careBefore ?? null,
      careAfter: dados.careAfter ?? null,
      internalNotes: dados.internalNotes ?? null,
      startedAt: desde(dados.inicio),
      completedAt: dados.status === TreatmentPlanStatus.COMPLETED ? desde(ultima, 11) : null,
      patientId: patient.id,
      procedureId: procedimento.id,
      tenantId: tenant.id,
    }

    const jaExiste = await prisma.treatmentPlan.findFirst({
      where: { tenantId: tenant.id, patientId: patient.id, procedureId: procedimento.id },
    })
    const plano = jaExiste
      ? await prisma.treatmentPlan.update({ where: { id: jaExiste.id }, data: camposPlano })
      : await prisma.treatmentPlan.create({ data: camposPlano })

    for (let n = 1; n <= dados.feitas; n += 1) {
      const quando = dados.inicio - (n - 1) * dados.intervalo
      const temSessao = await prisma.procedureSession.findFirst({
        where: { planId: plano.id, sessionNumber: n },
      })
      if (temSessao) continue
      await prisma.procedureSession.create({
        data: {
          performedAt: desde(quando),
          priceCents: 190000,
          notes:
            n === 1
              ? `Primeira sessão de ${dados.total}. Procedimento realizado sem intercorrências.`
              : `${n}ª sessão de ${dados.total}. Boa evolução em relação à anterior.`,
          patientId: patient.id,
          procedureId: procedimento.id,
          planId: plano.id,
          sessionNumber: n,
          tenantId: tenant.id,
        },
      })
    }
    console.log(`✅ Plano de tratamento: ${dados.titulo} (${dados.feitas}/${dados.total})`)
  }

  const existingPrescription = await prisma.prescription.findFirst({
    where: { patientId: patient.id, tenantId: tenant.id, title: 'Cuidados pós-procedimento' },
  })
  const prescriptionPayload = {
    patientId: patient.id,
    tenantId: tenant.id,
    title: 'Cuidados pós-procedimento',
    instructions: 'Hidratar a pele, evitar sol direto por 48h e usar filtro solar conforme orientação.',
    status: PrescriptionStatus.SENT,
    sentAt: new Date(),
  }

  if (existingPrescription) {
    await prisma.prescription.update({ where: { id: existingPrescription.id }, data: prescriptionPayload })
  } else {
    await prisma.prescription.create({ data: prescriptionPayload })
  }

  const existingNotification = await prisma.notification.findFirst({
    where: { patientId: patient.id, tenantId: tenant.id, title: 'Retorno recomendado' },
  })
  const notificationPayload = {
    patientId: patient.id,
    tenantId: tenant.id,
    title: 'Retorno recomendado',
    body: 'Agende seu retorno de acompanhamento em 30 dias.',
    channel: NotificationChannel.IN_APP,
  }

  if (existingNotification) {
    await prisma.notification.update({ where: { id: existingNotification.id }, data: notificationPayload })
  } else {
    await prisma.notification.create({ data: notificationPayload })
  }

  const existingLead = await prisma.lead.findFirst({
    where: { email: 'lead.instagram@example.com', tenantId: tenant.id },
  })
  const leadPayload = {
    name: 'Lead Instagram',
    email: 'lead.instagram@example.com',
    phone: '(11) 98888-1111',
    origin: 'Instagram',
    status: LeadStatus.QUALIFIED,
    notes: 'Interessada em bioestimuladores.',
    tenantId: tenant.id,
  }

  if (existingLead) {
    await prisma.lead.update({ where: { id: existingLead.id }, data: leadPayload })
  } else {
    await prisma.lead.create({ data: leadPayload })
  }

  console.log('\n🔐 Usuários de teste:')
  console.log('   Admin: admin@drmarceladuch.com.br / Admin@2024!')
  console.log('   Equipe: equipe@drmarceladuch.com.br / Equipe@2026!')
  console.log('   Paciente: paciente@exemplo.com / Paciente@2026')

  console.log('\n🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
