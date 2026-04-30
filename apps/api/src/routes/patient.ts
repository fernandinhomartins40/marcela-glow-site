import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { signToken } from '../lib/jwt'
import { authenticate, requirePatient } from '../middleware/auth'
import { AppError, UnauthorizedError } from '../lib/errors'
import { addDays, addHours, randomToken, sha256, signJson, verifyJsonWithPublicKey } from '../lib/security'
import { audit } from '../lib/audit'
import { getVapidPublicKey } from '../lib/push'
import { presignDownload, storageConfigured } from '../lib/storage'

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

const messageSchema = z.object({
  body: z.string().min(1),
})

const resetRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().optional().default(TENANT_SLUG_DEFAULT),
})

const resetConfirmSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
})

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

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

router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)
    const tenant = await tenantBySlug(body.tenantSlug)
    const passwordHash = await bcrypt.hash(body.password, 12)

    const patient = await prisma.patient.upsert({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
      update: { name: body.name, phone: body.phone, passwordHash },
      create: { name: body.name, email: body.email, phone: body.phone, passwordHash, tenantId: tenant.id },
    })

    res.status(201).json({
      token: await createPatientSession(req, patient),
      patient: { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
    await prisma.patient.update({ where: { id: patient.id }, data: { lastLoginAt: new Date() } })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const tenant = await tenantBySlug(body.tenantSlug)
    const patient = await prisma.patient.findUnique({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
    })

    if (!patient?.passwordHash) throw new UnauthorizedError('Credenciais invalidas')
    const ok = await bcrypt.compare(body.password, patient.passwordHash)
    if (!ok) throw new UnauthorizedError('Credenciais invalidas')

    res.json({
      token: await createPatientSession(req, patient),
      patient: { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
    await prisma.patient.update({ where: { id: patient.id }, data: { lastLoginAt: new Date() } })
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

router.get('/prescriptions/verify/:code', async (req, res, next) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { verificationCode: req.params.code },
      include: { patient: { select: { name: true, email: true } }, signedBy: { select: { name: true, email: true } } },
    })
    if (!prescription || !prescription.signatureHash || !prescription.signaturePayload) throw new AppError('Prescricao nao encontrada', 404, 'NOT_FOUND')
    const payload = prescription.signaturePayload as any
    const signedPayload = {
      id: payload.id,
      patientId: payload.patientId,
      title: payload.title,
      instructions: payload.instructions,
      signedById: payload.signedById,
      signedAt: payload.signedAt,
      verificationCode: payload.verificationCode,
    }
    const valid =
      payload.algorithm === 'RSA-SHA256'
        ? verifyJsonWithPublicKey(signedPayload, prescription.signatureHash, payload.certificatePem)
        : signJson(signedPayload, process.env.PRESCRIPTION_SIGNING_SECRET || process.env.JWT_SECRET || 'change-this-secret') === prescription.signatureHash
    res.json({ valid, id: prescription.id, title: prescription.title, patient: prescription.patient, signedBy: prescription.signedBy, signedAt: prescription.signedAt, signatureHash: prescription.signatureHash, algorithm: payload.algorithm, certificatePem: payload.certificatePem })
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

router.get('/dashboard', async (req, res, next) => {
  try {
    const patientId = req.user!.userId
    const tenantId = req.user!.tenantId
    const [appointments, sessions, prescriptions, notifications, messages, attachments] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId, tenantId },
        include: { procedure: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.procedureSession.findMany({
        where: { patientId, tenantId },
        include: { procedure: { select: { title: true } } },
        orderBy: { performedAt: 'desc' },
      }),
      prisma.prescription.findMany({ where: { patientId, tenantId }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { patientId, tenantId }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.message.findMany({ where: { patientId, tenantId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.attachment.findMany({ where: { patientId, tenantId, visibility: 'PATIENT_VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ])
    res.json({ appointments, sessions, prescriptions, notifications, messages, attachments })
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

    const appointment = await prisma.appointment.create({
      data: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone ?? '',
        message: body.message,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
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
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { keys: body.keys, revokedAt: null, userAgent: req.headers['user-agent'] },
      create: {
        endpoint: body.endpoint,
        keys: body.keys,
        subjectType: 'PATIENT',
        patientId: req.user!.userId,
        tenantId: req.user!.tenantId,
        userAgent: req.headers['user-agent'],
      },
    })
    res.status(201).json(subscription)
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

router.get('/prescriptions/verify/:code', async (req, res, next) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { verificationCode: req.params.code },
      include: { patient: { select: { name: true, email: true } }, signedBy: { select: { name: true, email: true } } },
    })
    if (!prescription || !prescription.signatureHash || !prescription.signaturePayload) throw new AppError('Prescricao nao encontrada', 404, 'NOT_FOUND')
    const payload = prescription.signaturePayload as any
    const signedPayload = {
      id: payload.id,
      patientId: payload.patientId,
      title: payload.title,
      instructions: payload.instructions,
      signedById: payload.signedById,
      signedAt: payload.signedAt,
      verificationCode: payload.verificationCode,
    }
    const valid =
      payload.algorithm === 'RSA-SHA256'
        ? verifyJsonWithPublicKey(signedPayload, prescription.signatureHash, payload.certificatePem)
        : signJson(signedPayload, process.env.PRESCRIPTION_SIGNING_SECRET || process.env.JWT_SECRET || 'change-this-secret') === prescription.signatureHash
    res.json({
      valid,
      id: prescription.id,
      title: prescription.title,
      patient: prescription.patient,
      signedBy: prescription.signedBy,
      signedAt: prescription.signedAt,
      signatureHash: prescription.signatureHash,
      algorithm: payload.algorithm,
      certificatePem: payload.certificatePem,
    })
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

router.post('/messages', async (req, res, next) => {
  try {
    const body = messageSchema.parse(req.body)
    const message = await prisma.message.create({
      data: { body: body.body, sender: 'PATIENT', patientId: req.user!.userId, tenantId: req.user!.tenantId },
    })
    res.status(201).json(message)
  } catch (err) {
    next(err)
  }
})

export default router
