import { PrismaClient, AppointmentStatus, UserRole } from '@prisma/client'
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
  // 2. Admin User
  // ───────────────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@2024!', 12)

  const adminUser = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email: 'admin@drmarceladuch.com.br',
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      email: 'admin@drmarceladuch.com.br',
      passwordHash,
      name: 'Dra. Marcela Duch',
      role: UserRole.ADMIN,
      tenantId: tenant.id,
    },
  })
  console.log(`✅ Usuário admin criado/encontrado: ${adminUser.name} (${adminUser.email})`)

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
  const patient = await prisma.patient.upsert({
    where: { email_tenantId: { email: 'paciente@exemplo.com', tenantId: tenant.id } },
    update: { passwordHash: patientPasswordHash },
    create: {
      name: 'Paciente VIP Demo',
      email: 'paciente@exemplo.com',
      phone: '(11) 90000-0000',
      passwordHash: patientPasswordHash,
      notes: 'Paciente demonstrativa para o PWA da area da paciente.',
      tenantId: tenant.id,
    },
  })

  const skinbooster = procedures.find((p) => p.title.includes('Skinbooster'))
  if (skinbooster) {
    await prisma.procedureSession.create({
      data: {
        patientId: patient.id,
        procedureId: skinbooster.id,
        tenantId: tenant.id,
        notes: 'Evolucao com melhora de luminosidade e hidratacao.',
        priceCents: 180000,
      },
    })
  }

  await prisma.prescription.create({
    data: {
      patientId: patient.id,
      tenantId: tenant.id,
      title: 'Cuidados pos-procedimento',
      instructions: 'Hidratar a pele, evitar sol direto por 48h e usar filtro solar conforme orientacao.',
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  await prisma.notification.create({
    data: {
      patientId: patient.id,
      tenantId: tenant.id,
      title: 'Retorno recomendado',
      body: 'Agende seu retorno de acompanhamento em 30 dias.',
      channel: 'IN_APP',
    },
  })

  await prisma.lead.create({
    data: {
      name: 'Lead Instagram',
      email: 'lead.instagram@example.com',
      phone: '(11) 98888-1111',
      origin: 'Instagram',
      status: 'QUALIFIED',
      notes: 'Interessada em bioestimuladores.',
      tenantId: tenant.id,
    },
  })

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
