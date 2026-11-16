import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
// prismaAuth so nos quatro pontos que precisam ler o hash (login, checagem do
// cadastro, ativacao e exclusao de conta); o `prisma` comum omite o campo.
import { prisma, prismaAuth } from '@marcela/database'
import { signToken } from '../lib/jwt'
import { authenticate, requirePatient } from '../middleware/auth'
import { AppError, UnauthorizedError } from '../lib/errors'
import { addDays, addHours, credencialDeRevisao, randomToken, sha256 } from '../lib/security'
import { verifySignaturePayload } from '../lib/clinical'
import { audit } from '../lib/audit'
import { getVapidPublicKey, inscreverAparelho, removerAparelho } from '../lib/push'
import { presignDownload, storageConfigured } from '../lib/storage'
import { checkSlotAvailable, resolveEndsAt } from '../lib/scheduling'
import { publicBaseUrl, sendMail } from '../lib/mailer'
import { messageInputSchema } from '../lib/message-input'
import { listMessageHistory, messageHistoryQuerySchema } from '../lib/message-history'

const router = Router()
const TENANT_SLUG_DEFAULT = 'marcela-duch'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  tenantSlug: z.string().optional().default(TENANT_SLUG_DEFAULT),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional().default(TENANT_SLUG_DEFAULT),
})

const appointmentSchema = z.object({
  procedureId: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  message: z.string().optional(),
})

const resetRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().optional().default(TENANT_SLUG_DEFAULT),
})

const resetConfirmSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
})

// Navegador (formato de sempre) ou aparelho dos apps nativos (token FCM).
const pushSubscriptionSchema = z.union([
  z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  z.object({
    provider: z.literal('FCM'),
    token: z.string().min(1).max(4096),
    platform: z.enum(['ios', 'android']),
  }),
])

const pushTokenSchema = z.object({ token: z.string().min(1).max(4096) })

const activateSchema = z.object({ token: z.string().min(20).max(200) })

const deleteAccountSchema = z.object({ password: z.string().min(1) })

async function tenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant || !tenant.isActive) {
    throw new AppError('Clinica nao encontrada', 404, 'TENANT_NOT_FOUND')
  }
  return tenant
}

async function createPatientSession(req: Request, patient: { id: string; email: string; tenantId: string }) {
  const session = await prisma.authSession.create({
    data: {
      subjectType: 'PATIENT',
      patientId: patient.id,
      tenantId: patient.tenantId,
      tokenHash: 'pending',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: addDays(7),
    },
  })
  const token = signToken({
    userId: patient.id,
    email: patient.email,
    tenantId: patient.tenantId,
    role: 'PATIENT',
    subjectType: 'PATIENT',
    sessionId: session.id,
  })
  await prisma.authSession.update({ where: { id: session.id }, data: { tokenHash: sha256(token) } })
  return token
}

const LINK_INVALIDO = 'Link inválido ou expirado'
const CONTA_EXISTE = 'Já existe uma conta com este e-mail. Faça login ou use "esqueci minha senha".'

router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)
    const tenant = await tenantBySlug(body.tenantSlug)

    // prismaAuth porque a verificacao abaixo depende de LER o passwordHash: o
    // cliente comum o devolve como undefined, e a conta ja ativada pareceria
    // sem senha.
    const existing = await prismaAuth.patient.findUnique({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
    })

    if (existing?.passwordHash) {
      throw new AppError(CONTA_EXISTE, 409, 'ACCOUNT_EXISTS')
    }

    /* Cadastro da clinica sem senha ou e-mail novo: nada e gravado na paciente
       nem criado ate o link do e-mail ser aberto. Antes, este ponto gravava a
       senha direto, e quem soubesse o e-mail de uma paciente cadastrada pela
       clinica entrava no prontuario dela (medido por HTTP em 14/11/2026). A
       resposta e a mesma nos dois casos, para nao revelar quem ja e paciente. */
    const token = randomToken()
    const pedido = await prisma.patientActivationToken.create({
      data: {
        tenantId: tenant.id,
        email: body.email,
        name: body.name,
        phone: body.phone,
        passwordHash: await bcrypt.hash(body.password, 12),
        tokenHash: sha256(token),
        expiresAt: addHours(24),
      },
    })

    const { sent } = await sendMail({
      to: body.email,
      subject: 'Ativar acesso — portal da paciente',
      body: `Olá, ${body.name}.\n\nRecebemos um pedido para criar o seu acesso ao portal. Para confirmar que este e-mail é seu, use o link abaixo. Ele vale por 24 horas.\n\nSe não foi você, ignore este e-mail: nenhum acesso foi criado.`,
      action: { label: 'Ativar acesso', url: `${publicBaseUrl()}/paciente/?ativar=${token}` },
    })

    // Em producao, nao prometer um e-mail que nao saiu.
    if (!sent && process.env.NODE_ENV === 'production') {
      await prisma.patientActivationToken.delete({ where: { id: pedido.id } })
      throw new AppError(
        'Não foi possível enviar o e-mail de ativação agora. Tente mais tarde ou fale com a clínica.',
        503,
        'MAIL_UNAVAILABLE',
      )
    }

    res.status(202).json({
      status: 'CONFIRMAR_EMAIL',
      email: body.email,
      activationToken: process.env.NODE_ENV === 'production' ? undefined : token,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = activateSchema.parse(req.body)
    const pedido = await prisma.patientActivationToken.findUnique({ where: { tokenHash: sha256(token) } })
    if (!pedido || pedido.usedAt || pedido.expiresAt < new Date()) throw new UnauthorizedError(LINK_INVALIDO)

    // Reivindica o link de forma atomica: dois cliques simultaneos nao ativam duas vezes.
    const { count } = await prisma.patientActivationToken.updateMany({
      where: { id: pedido.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (count !== 1) throw new UnauthorizedError(LINK_INVALIDO)

    const tenant = await prisma.tenant.findUnique({ where: { id: pedido.tenantId } })
    if (!tenant || !tenant.isActive) throw new UnauthorizedError(LINK_INVALIDO)

    // prismaAuth: decidir se a conta ja tem senha exige ler o hash.
    const existing = await prismaAuth.patient.findUnique({
      where: { email_tenantId: { email: pedido.email, tenantId: pedido.tenantId } },
    })

    // Ativada por outro caminho (outro link, recuperacao de senha) depois deste pedido.
    if (existing?.passwordHash) throw new AppError(CONTA_EXISTE, 409, 'ACCOUNT_EXISTS')

    const patient = existing
      ? await prisma.patient.update({
          where: { id: existing.id },
          data: {
            passwordHash: pedido.passwordHash,
            // Não sobrescreve o cadastro da clínica com dados do formulário
            phone: existing.phone ?? pedido.phone,
          },
        })
      : await prisma.patient.create({
          data: {
            name: pedido.name,
            email: pedido.email,
            phone: pedido.phone,
            passwordHash: pedido.passwordHash,
            tenantId: tenant.id,
          },
        })

    /* Uma solicitação da landing pode chegar antes da pessoa criar acesso ao
       portal. Ao criar acesso com o mesmo e-mail, ligamos somente pedidos
       ainda pendentes e sem paciente: assim a jornada
       solicitada no site aparece no portal sem a recepção repetir trabalho.

       Consultas já vinculadas, canceladas ou concluídas ficam intactas. */
    await prisma.appointment.updateMany({
      where: {
        tenantId: tenant.id,
        patientId: null,
        status: 'PENDING',
        email: { equals: patient.email, mode: 'insensitive' },
      },
      data: { patientId: patient.id },
    })

    const sessionToken = await createPatientSession(req, patient)
    await prisma.patient.update({ where: { id: patient.id }, data: { lastLoginAt: new Date() } })

    res.status(201).json({
      token: sessionToken,
      patient: { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const tenant = await tenantBySlug(body.tenantSlug)
    const patient = await prismaAuth.patient.findUnique({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
    })

    // Conta de revisão das lojas: o revisor da Apple exclui a conta no teste, e o
    // próximo login com a senha de revisão devolve o acesso (ao revisor seguinte
    // e ao vídeo gravado no Actions). Só reabre um cadastro que já existe.
    if (patient && credencialDeRevisao('PATIENT', body.email, body.password)) {
      if (!patient.passwordHash || !(await bcrypt.compare(body.password, patient.passwordHash))) {
        patient.passwordHash = await bcrypt.hash(body.password, 12)
        await prismaAuth.patient.update({ where: { id: patient.id }, data: { passwordHash: patient.passwordHash } })
      }
    }

    if (!patient?.passwordHash) throw new UnauthorizedError('Credenciais invalidas')
    const ok = await bcrypt.compare(body.password, patient.passwordHash)
    if (!ok) throw new UnauthorizedError('Credenciais invalidas')

    const token = await createPatientSession(req, patient)
    await prisma.patient.update({ where: { id: patient.id }, data: { lastLoginAt: new Date() } })

    res.json({
      token,
      patient: { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'LOGIN',
        resource: 'patientAuth',
        subjectType: 'PATIENT',
        patientId: patient.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/password/request', async (req, res, next) => {
  try {
    const body = resetRequestSchema.parse(req.body)
    const tenant = await tenantBySlug(body.tenantSlug)
    const patient = await prisma.patient.findUnique({ where: { email_tenantId: { email: body.email, tenantId: tenant.id } } })
    if (!patient) return res.json({ message: 'Se o e-mail existir, enviaremos instrucoes.' })
    const token = randomToken()
    await prisma.passwordResetToken.create({
      data: { subjectType: 'PATIENT', patientId: patient.id, tenantId: tenant.id, tokenHash: sha256(token), expiresAt: addHours(2) },
    })

    await sendMail({
      to: patient.email!,
      subject: 'Recuperação de senha — portal da paciente',
      body: `Olá, ${patient.name}.\n\nRecebemos um pedido para redefinir a sua senha de acesso ao portal. O link abaixo vale por 2 horas.\n\nSe não foi você, ignore este e-mail: a senha atual continua valendo.`,
      action: { label: 'Definir nova senha', url: `${publicBaseUrl()}/paciente/#/recuperar-senha?token=${token}` },
    })

    res.json({ message: 'Token de recuperacao gerado.', resetToken: process.env.NODE_ENV === 'production' ? undefined : token })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/password/confirm', async (req, res, next) => {
  try {
    const body = resetConfirmSchema.parse(req.body)
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(body.token) } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.patientId) throw new UnauthorizedError('Token invalido ou expirado')
    await prisma.patient.update({ where: { id: reset.patientId }, data: { passwordHash: await bcrypt.hash(body.password, 12) } })
    await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } })
    await prisma.authSession.updateMany({ where: { patientId: reset.patientId, revokedAt: null }, data: { revokedAt: new Date() } })
    res.json({ message: 'Senha atualizada' })
  } catch (err) {
    next(err)
  }
})

router.get('/push/public-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() })
})

/**
 * Verificação pública de documento assinado. Mantida no caminho antigo porque
 * QR codes já impressos apontam para cá; a conferência da assinatura é a mesma
 * de /clinical/verify/:code, que sabe ler os dois formatos de payload.
 */
router.get('/prescriptions/verify/:code', async (req, res, next) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { verificationCode: req.params.code },
      include: { patient: { select: { name: true, email: true } }, signedBy: { select: { name: true, email: true } } },
    })
    if (!prescription || !prescription.signatureHash || !prescription.signaturePayload) {
      throw new AppError('Prescricao nao encontrada', 404, 'NOT_FOUND')
    }

    const payload = prescription.signaturePayload as Record<string, unknown>
    const valid = verifySignaturePayload(payload, prescription.signatureHash)

    res.json({
      valid,
      id: prescription.id,
      title: prescription.title,
      patient: prescription.patient,
      signedBy: prescription.signedBy,
      signedAt: prescription.signedAt,
      signatureHash: prescription.signatureHash,
      algorithm: payload.algorithm,
      certificatePem: payload.certificatePem ?? null,
    })
  } catch (err) {
    next(err)
  }
})

router.use(authenticate, requirePatient)

router.post('/auth/logout', async (req, res, next) => {
  try {
    await prisma.authSession.update({ where: { id: req.user!.sessionId }, data: { revokedAt: new Date() } })
    await audit(req, 'LOGOUT', 'patientAuth')
    res.json({ message: 'Sessao encerrada' })
  } catch (err) {
    next(err)
  }
})

router.get('/me', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.user!.userId, tenantId: req.user!.tenantId },
      include: { tenant: { select: { id: true, name: true, slug: true, phone: true, email: true } } },
    })
    if (!patient) throw new UnauthorizedError()
    res.json(patient)
  } catch (err) {
    next(err)
  }
})

/**
 * Exclusao da conta pela propria paciente (exigencia das lojas).
 *
 * Remove o ACESSO, nao o registro: prontuario, consultas e documentos tem
 * guarda legal obrigatoria e ficam. A conta volta ao estado de "cadastrada
 * pela clinica, sem acesso" — e reativar passa pela confirmacao por e-mail.
 */
router.delete('/me', async (req, res, next) => {
  try {
    const { password } = deleteAccountSchema.parse(req.body)
    // prismaAuth: conferir a senha exige o hash, que o cliente comum omite.
    const patient = await prismaAuth.patient.findUnique({ where: { id: req.user!.userId } })
    if (!patient || patient.tenantId !== req.user!.tenantId || !patient.passwordHash) throw new UnauthorizedError()
    if (!(await bcrypt.compare(password, patient.passwordHash))) throw new UnauthorizedError('Senha incorreta')

    await prisma.patient.update({ where: { id: patient.id }, data: { passwordHash: null } })
    await prisma.authSession.updateMany({
      where: { patientId: patient.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    await prisma.pushSubscription.deleteMany({ where: { patientId: patient.id } })
    await prisma.patientActivationToken.deleteMany({
      where: { tenantId: patient.tenantId, email: patient.email, usedAt: null },
    })
    await audit(req, 'DELETE', 'patientAccess', patient.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/dashboard', async (req, res, next) => {
  try {
    const patientId = req.user!.userId
    const tenantId = req.user!.tenantId
    const [patient, appointments, sessions, prescriptions, notifications, messages, attachments, plans] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, tenantId },
        select: { id: true, name: true, email: true, phone: true, birthDate: true },
      }),
      prisma.appointment.findMany({
        where: { patientId, tenantId },
        include: { procedure: { select: { title: true } } },
        // scheduledAt primeiro (nulls por último) para o painel destacar o próximo atendimento
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.procedureSession.findMany({
        where: { patientId, tenantId },
        include: { procedure: { select: { title: true } } },
        orderBy: { performedAt: 'desc' },
      }),
      // Só documentos já disponibilizados: rascunho não aparece para a paciente
      prisma.prescription.findMany({
        where: { patientId, tenantId, status: { in: ['SENT', 'VIEWED', 'SIGNED'] } },
        include: { items: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({ where: { patientId, tenantId }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.message.findMany({ where: { patientId, tenantId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.attachment.findMany({ where: { patientId, tenantId, visibility: 'PATIENT_VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 20 }),

      /* Os planos de tratamento — a jornada.

         Cancelado não vem: é um plano que a clínica desfez, e mostrá-lo à
         paciente levantaria uma pergunta sobre algo que já foi resolvido.
         Pausado vem, porque a paciente precisa saber que ele existe e está
         esperando por ela. */
      prisma.treatmentPlan.findMany({
        where: { patientId, tenantId, status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] } },
        include: {
          procedure: { select: { title: true, careBefore: true, careAfter: true, fieldSchema: true } },
          sessions: {
            select: {
              id: true,
              sessionNumber: true,
              performedAt: true,
              beforePhotoUrl: true,
              afterPhotoUrl: true,
            },
            orderBy: { performedAt: 'asc' },
          },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      }),
    ])
    if (!patient) throw new UnauthorizedError()

    /* `internalNotes` fica de fora, e por isso o plano é montado campo a
       campo em vez de devolvido inteiro: é a anotação que a médica escreve
       para a equipe, e um `select` esquecido a entregaria à paciente. */
    const jornada = plans.map((plano) => {
      const feitas = plano.sessions.length
      return {
        id: plano.id,
        title: plano.title,
        status: plano.status,
        /* O portal usa isto para ja abrir o pedido de horario no procedimento
           certo — sem ele a paciente teria que reescolher na lista o mesmo
           tratamento que acabou de abrir. */
        procedureId: plano.procedureId,
        totalSessions: plano.totalSessions,
        intervalDays: plano.intervalDays,
        details: plano.details,
        // A orientação do plano tem precedência sobre a do procedimento:
        // quando a médica escreveu algo para esta paciente, é o que vale.
        careBefore: plano.careBefore ?? plano.procedure?.careBefore ?? null,
        careAfter: plano.careAfter ?? plano.procedure?.careAfter ?? null,
        fieldSchema: plano.procedure?.fieldSchema ?? null,
        startedAt: plano.startedAt,
        completedAt: plano.completedAt,
        sessions: plano.sessions,
        progresso: {
          feitas,
          total: plano.totalSessions,
          restantes: Math.max(plano.totalSessions - feitas, 0),
          percentual:
            plano.totalSessions > 0 ? Math.round((feitas / plano.totalSessions) * 100) : 0,
        },
      }
    })

    res.json({
      patient,
      appointments,
      sessions,
      prescriptions,
      notifications,
      messages,
      attachments,
      plans: jornada,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/appointments', async (req, res, next) => {
  try {
    const body = appointmentSchema.parse(req.body)
    const patient = await prisma.patient.findFirst({
      where: { id: req.user!.userId, tenantId: req.user!.tenantId },
    })
    if (!patient) throw new UnauthorizedError()

    // Valida o horário no servidor: a lista de slots pode ter ficado obsoleta
    // entre a escolha da paciente e o envio do formulário.
    let scheduledAt: Date | null = null
    let endsAt: Date | null = null

    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt)
      const check = await checkSlotAvailable({
        tenantId: patient.tenantId,
        startsAt: scheduledAt,
        procedureId: body.procedureId,
      })
      if (!check.ok) throw new AppError(check.reason!, 409, 'SLOT_UNAVAILABLE')
      endsAt = await resolveEndsAt(patient.tenantId, scheduledAt, body.procedureId)
    }

    const appointment = await prisma.appointment.create({
      data: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone ?? '',
        message: body.message,
        scheduledAt,
        endsAt,
        procedureId: body.procedureId,
        patientId: patient.id,
        tenantId: patient.tenantId,
        source: 'patient-pwa',
      },
      include: { procedure: { select: { id: true, title: true } } },
    })
    res.status(201).json(appointment)
  } catch (err) {
    next(err)
  }
})

router.post('/push/subscriptions', async (req, res, next) => {
  try {
    const body = pushSubscriptionSchema.parse(req.body)
    const subscription = await inscreverAparelho(
      { patientId: req.user!.userId, tenantId: req.user!.tenantId, userAgent: req.headers['user-agent'] },
      body,
    )
    res.status(201).json(subscription)
  } catch (err) {
    next(err)
  }
})

// Chamado no logout do app. Mesma resposta exista ou nao, seja de quem for:
// nao revela se o token pertence a outra paciente.
router.delete('/push/subscriptions', async (req, res, next) => {
  try {
    const { token } = pushTokenSchema.parse(req.body)
    await removerAparelho(req.user!.userId, token)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/files/:id/download', async (req, res, next) => {
  try {
    const attachment = await prisma.attachment.findFirst({
      where: { id: req.params.id, patientId: req.user!.userId, tenantId: req.user!.tenantId, visibility: 'PATIENT_VISIBLE' },
    })
    if (!attachment) throw new AppError('Arquivo nao encontrado', 404, 'NOT_FOUND')
    const downloadUrl = storageConfigured && attachment.storageKey ? await presignDownload(attachment.storageKey) : attachment.url
    await audit(req, 'READ', 'attachment', attachment.id)
    res.json({ downloadUrl })
  } catch (err) {
    next(err)
  }
})

router.get('/appointments', async (req, res, next) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.user!.userId, tenantId: req.user!.tenantId },
      include: { procedure: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(appointments)
  } catch (err) {
    next(err)
  }
})

router.get('/messages', async (req, res, next) => {
  try {
    const { cursor, limit } = messageHistoryQuerySchema.parse(req.query)
    res.json(await listMessageHistory(req.user!.tenantId, req.user!.userId, cursor, limit))
  } catch (err) {
    next(err)
  }
})

router.post('/messages', async (req, res, next) => {
  try {
    const body = messageInputSchema.parse(req.body)
    const message = await prisma.message.create({
      data: { body: body.body, sender: 'PATIENT', patientId: req.user!.userId, tenantId: req.user!.tenantId },
    })
    res.status(201).json(message)
  } catch (err) {
    next(err)
  }
})

export default router
