import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import { prisma, LeadStatus, RecordType, PrescriptionStatus, ContentStatus, Permission, UserRole, FileVisibility } from '@marcela/database'
import { authenticate, requirePermission, requireRole } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { addDays, randomToken, sha256, signJson, signJsonWithPrivateKey } from '../lib/security'
import { buildStorageKey, presignDownload, presignUpload, publicFileUrl, s3Bucket, storageConfigured } from '../lib/storage'
import { sendPatientPush } from '../lib/push'

const router = Router()
const staffOnly = [authenticate, requireRole('ADMIN', 'STAFF')]

const patientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
})

const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  origin: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  nextFollowUp: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
})

const recordSchema = z.object({
  title: z.string().min(2),
  type: z.nativeEnum(RecordType).optional(),
  body: z.string().min(2),
})

const prescriptionSchema = z.object({
  patientId: z.string().min(1),
  title: z.string().min(2),
  instructions: z.string().min(2),
  status: z.nativeEnum(PrescriptionStatus).optional(),
})

const cmsPageSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  body: z.string().min(2),
  status: z.nativeEnum(ContentStatus).optional(),
})

const blogPostSchema = cmsPageSchema.extend({
  excerpt: z.string().optional(),
  coverUrl: z.string().url().optional(),
})

const settingsSchema = z.object({
  businessHours: z.record(z.string()).optional(),
  services: z.array(z.object({ name: z.string(), priceCents: z.number().int().min(0) })).optional(),
  team: z.array(z.object({ name: z.string(), role: z.string() })).optional(),
})

const filePresignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024),
  patientId: z.string().optional(),
  medicalRecordId: z.string().optional(),
  visibility: z.nativeEnum(FileVisibility).optional().default('STAFF_ONLY'),
})

const fileCompleteSchema = filePresignSchema.extend({
  storageKey: z.string().min(1),
  checksum: z.string().optional(),
})

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).default('STAFF'),
  permissions: z.array(z.nativeEnum(Permission)).default([]),
})

const acceptInviteSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(2),
  password: z.string().min(8),
})

const notifySchema = z.object({
  patientId: z.string().min(1),
  title: z.string().min(2),
  body: z.string().min(2),
  channel: z.enum(['IN_APP', 'PUSH', 'EMAIL']).default('IN_APP'),
})

router.use(...staffOnly)

router.get('/dashboard', requirePermission('DASHBOARD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      appointments,
      patients,
      leads,
      completedSessions,
      revenue,
      nextAppointments,
      recentPatients,
    ] = await Promise.all([
      prisma.appointment.count({ where: { tenantId } }),
      prisma.patient.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId } }),
      prisma.procedureSession.count({ where: { tenantId, performedAt: { gte: startOfMonth } } }),
      prisma.procedureSession.aggregate({ where: { tenantId }, _sum: { priceCents: true } }),
      prisma.appointment.findMany({
        where: { tenantId, scheduledAt: { not: null } },
        include: { procedure: { select: { title: true } }, patient: { select: { name: true } } },
        orderBy: { scheduledAt: 'asc' },
        take: 8,
      }),
      prisma.patient.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 6 }),
    ])

    res.json({
      metrics: {
        appointments,
        patients,
        leads,
        completedSessions,
        revenueCents: revenue._sum.priceCents ?? 0,
      },
      nextAppointments,
      recentPatients,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/patients', requirePermission('PATIENT_READ'), async (req, res, next) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        appointments: { orderBy: { createdAt: 'desc' }, take: 3 },
        records: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(patients)
  } catch (err) {
    next(err)
  }
})

router.post('/patients', requirePermission('PATIENT_WRITE'), async (req, res, next) => {
  try {
    const body = patientSchema.parse(req.body)
    const patient = await prisma.patient.upsert({
      where: { email_tenantId: { email: body.email, tenantId: req.user!.tenantId } },
      update: { ...body, birthDate: body.birthDate ? new Date(body.birthDate) : undefined },
      create: { ...body, birthDate: body.birthDate ? new Date(body.birthDate) : undefined, tenantId: req.user!.tenantId },
    })
    await audit(req, 'CREATE', 'patient', patient.id)
    res.status(201).json(patient)
  } catch (err) {
    next(err)
  }
})

router.get('/patients/:id', requirePermission('PATIENT_READ', 'RECORD_READ'), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      include: {
        appointments: { include: { procedure: true }, orderBy: { createdAt: 'desc' } },
        records: { include: { attachments: true }, orderBy: { createdAt: 'desc' } },
        sessions: { include: { procedure: true }, orderBy: { performedAt: 'desc' } },
        prescriptions: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!patient) throw new NotFoundError('Paciente')
    await audit(req, 'READ', 'patient', patient.id, { includesMedicalRecord: true })
    res.json(patient)
  } catch (err) {
    next(err)
  }
})

router.post('/patients/:id/records', requirePermission('RECORD_WRITE'), async (req, res, next) => {
  try {
    const body = recordSchema.parse(req.body)
    const patient = await prisma.patient.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } })
    if (!patient) throw new NotFoundError('Paciente')
    const record = await prisma.medicalRecord.create({
      data: { ...body, patientId: patient.id, tenantId: req.user!.tenantId, createdById: req.user!.userId },
    })
    await audit(req, 'CREATE', 'medicalRecord', record.id, { patientId: patient.id })
    res.status(201).json(record)
  } catch (err) {
    next(err)
  }
})

router.get('/leads', requirePermission('LEAD_READ'), async (req, res, next) => {
  try {
    const leads = await prisma.lead.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { updatedAt: 'desc' } })
    res.json(leads)
  } catch (err) {
    next(err)
  }
})

router.post('/leads', requirePermission('LEAD_WRITE'), async (req, res, next) => {
  try {
    const body = leadSchema.parse(req.body)
    const lead = await prisma.lead.create({
      data: { ...body, nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp as string) : undefined, tenantId: req.user!.tenantId },
    })
    res.status(201).json(lead)
  } catch (err) {
    next(err)
  }
})

router.patch('/leads/:id', requirePermission('LEAD_WRITE'), async (req, res, next) => {
  try {
    const body = leadSchema.partial().parse(req.body)
    const existing = await prisma.lead.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } })
    if (!existing) throw new NotFoundError('Lead')
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: { ...body, nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp as string) : undefined },
    })
    res.json(lead)
  } catch (err) {
    next(err)
  }
})

router.get('/prescriptions', requirePermission('PRESCRIPTION_READ'), async (req, res, next) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(prescriptions)
  } catch (err) {
    next(err)
  }
})

router.post('/prescriptions', requirePermission('PRESCRIPTION_WRITE'), async (req, res, next) => {
  try {
    const body = prescriptionSchema.parse(req.body)
    const prescription = await prisma.prescription.create({
      data: {
        ...body,
        tenantId: req.user!.tenantId,
        sentAt: body.status === 'SENT' ? new Date() : undefined,
      },
    })
    res.status(201).json(prescription)
  } catch (err) {
    next(err)
  }
})

router.patch('/prescriptions/:id/sign', requirePermission('PRESCRIPTION_SIGN'), async (req, res, next) => {
  try {
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      include: { patient: true },
    })
    if (!existing) throw new NotFoundError('Prescricao')

    const verificationCode = randomToken(18)
    const payload = {
      id: existing.id,
      patientId: existing.patientId,
      title: existing.title,
      instructions: existing.instructions,
      signedById: req.user!.userId,
      signedAt: new Date().toISOString(),
      verificationCode,
    }
    const certificateSignature = signJsonWithPrivateKey(payload, process.env.PRESCRIPTION_SIGNING_PRIVATE_KEY)
    const signatureHash = certificateSignature || signJson(payload, process.env.PRESCRIPTION_SIGNING_SECRET || process.env.JWT_SECRET || 'change-this-secret')
    const verificationUrl = `${process.env.PUBLIC_APP_URL || ''}/api/patient/prescriptions/verify/${verificationCode}`
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl)

    const prescription = await prisma.prescription.update({
      where: { id: existing.id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedById: req.user!.userId,
        signatureHash,
        verificationCode,
        signaturePayload: {
          ...payload,
          verificationUrl,
          qrCodeDataUrl,
          algorithm: certificateSignature ? 'RSA-SHA256' : 'HMAC-SHA256',
          certificatePem: process.env.PRESCRIPTION_SIGNING_CERTIFICATE?.replace(/\\n/g, '\n') ?? null,
        },
      },
    })
    await audit(req, 'SIGN', 'prescription', prescription.id, { patientId: prescription.patientId })
    res.json(prescription)
  } catch (err) {
    next(err)
  }
})

router.patch('/prescriptions/:id/send', requirePermission('PRESCRIPTION_WRITE'), async (req, res, next) => {
  try {
    const existing = await prisma.prescription.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } })
    if (!existing) throw new NotFoundError('Prescricao')
    const prescription = await prisma.prescription.update({
      where: { id: existing.id },
      data: { status: 'SENT', sentAt: new Date() },
    })
    await prisma.notification.create({
      data: {
        title: 'Nova prescricao disponivel',
        body: prescription.title,
        channel: 'IN_APP',
        patientId: prescription.patientId,
        tenantId: req.user!.tenantId,
      },
    })
    await sendPatientPush(prescription.patientId, { title: 'Nova prescricao disponivel', body: prescription.title, url: '/paciente/' })
    await audit(req, 'SEND', 'prescription', prescription.id, { patientId: prescription.patientId })
    res.json(prescription)
  } catch (err) {
    next(err)
  }
})

router.get('/cms', requirePermission('CMS_READ'), async (req, res, next) => {
  try {
    const [pages, posts, testimonials, media] = await Promise.all([
      prisma.cmsPage.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { updatedAt: 'desc' } }),
      prisma.blogPost.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { updatedAt: 'desc' } }),
      prisma.testimonial.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { displayOrder: 'asc' } }),
      prisma.attachment.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ])
    res.json({ pages, posts, testimonials, media })
  } catch (err) {
    next(err)
  }
})

router.post('/cms/pages', requirePermission('CMS_WRITE'), async (req, res, next) => {
  try {
    const body = cmsPageSchema.parse(req.body)
    const page = await prisma.cmsPage.upsert({
      where: { slug_tenantId: { slug: body.slug, tenantId: req.user!.tenantId } },
      update: body,
      create: { ...body, tenantId: req.user!.tenantId },
    })
    res.status(201).json(page)
  } catch (err) {
    next(err)
  }
})

router.post('/cms/posts', requirePermission('CMS_WRITE'), async (req, res, next) => {
  try {
    const body = blogPostSchema.parse(req.body)
    const post = await prisma.blogPost.upsert({
      where: { slug_tenantId: { slug: body.slug, tenantId: req.user!.tenantId } },
      update: body,
      create: { ...body, tenantId: req.user!.tenantId },
    })
    res.status(201).json(post)
  } catch (err) {
    next(err)
  }
})

router.get('/notifications', requirePermission('NOTIFICATION_SEND'), async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifications)
  } catch (err) {
    next(err)
  }
})

router.post('/notifications', requirePermission('NOTIFICATION_SEND'), async (req, res, next) => {
  try {
    const body = notifySchema.parse(req.body)
    const notification = await prisma.notification.create({
      data: {
        patientId: body.patientId,
        tenantId: req.user!.tenantId,
        title: body.title,
        body: body.body,
        channel: body.channel,
      },
    })
    const push = body.channel === 'PUSH' ? await sendPatientPush(body.patientId, { title: body.title, body: body.body, url: '/paciente/' }) : null
    await audit(req, 'SEND', 'notification', notification.id, { channel: body.channel, push })
    res.status(201).json({ notification, push })
  } catch (err) {
    next(err)
  }
})

router.post('/files/presign', requirePermission('FILE_MANAGE'), async (req, res, next) => {
  try {
    const body = filePresignSchema.parse(req.body)
    if (!storageConfigured) throw new AppError('Storage S3 nao configurado', 503, 'STORAGE_NOT_CONFIGURED')
    const storageKey = buildStorageKey(req.user!.tenantId, body.fileName)
    const uploadUrl = await presignUpload(storageKey, body.mimeType)
    res.json({ uploadUrl, storageKey, bucket: s3Bucket, expiresIn: 900 })
  } catch (err) {
    next(err)
  }
})

router.post('/files/complete', requirePermission('FILE_MANAGE'), async (req, res, next) => {
  try {
    const body = fileCompleteSchema.parse(req.body)
    const attachment = await prisma.attachment.create({
      data: {
        fileName: body.fileName,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey: body.storageKey,
        bucket: s3Bucket,
        url: publicFileUrl(body.storageKey),
        checksum: body.checksum,
        visibility: body.visibility,
        patientId: body.patientId,
        medicalRecordId: body.medicalRecordId,
        uploadedById: req.user!.userId,
        tenantId: req.user!.tenantId,
      },
    })
    await audit(req, 'CREATE', 'attachment', attachment.id, { patientId: body.patientId })
    res.status(201).json(attachment)
  } catch (err) {
    next(err)
  }
})

router.get('/files/:id/download', requirePermission('FILE_MANAGE'), async (req, res, next) => {
  try {
    const attachment = await prisma.attachment.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } })
    if (!attachment?.storageKey) throw new NotFoundError('Arquivo')
    const downloadUrl = storageConfigured ? await presignDownload(attachment.storageKey) : attachment.url
    await audit(req, 'READ', 'attachment', attachment.id)
    res.json({ downloadUrl })
  } catch (err) {
    next(err)
  }
})

router.get('/audit', requirePermission('AUDIT_READ'), async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { user: { select: { name: true, email: true } }, patient: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json(logs)
  } catch (err) {
    next(err)
  }
})

router.get('/users', requirePermission('USER_MANAGE'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { permissions: true, sessions: { where: { revokedAt: null }, take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: { name: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

router.post('/invites', requirePermission('USER_MANAGE'), async (req, res, next) => {
  try {
    const body = inviteSchema.parse(req.body)
    const token = randomToken()
    const invite = await prisma.staffInvite.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        permissions: body.permissions,
        tokenHash: sha256(token),
        tenantId: req.user!.tenantId,
        invitedById: req.user!.userId,
        expiresAt: addDays(7),
      },
    })
    await audit(req, 'CREATE', 'staffInvite', invite.id, { email: body.email, role: body.role })
    res.status(201).json({ invite, inviteToken: process.env.NODE_ENV === 'production' ? undefined : token })
  } catch (err) {
    next(err)
  }
})

router.post('/invites/accept', async (req, res, next) => {
  try {
    const body = acceptInviteSchema.parse(req.body)
    const invite = await prisma.staffInvite.findUnique({ where: { tokenHash: sha256(body.token) } })
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) throw new AppError('Convite invalido ou expirado', 400, 'INVITE_INVALID')

    const user = await prisma.user.upsert({
      where: { email_tenantId: { email: invite.email, tenantId: invite.tenantId } },
      update: { name: body.name, passwordHash: await bcrypt.hash(body.password, 12), role: invite.role, isActive: true },
      create: { name: body.name, email: invite.email, passwordHash: await bcrypt.hash(body.password, 12), role: invite.role, tenantId: invite.tenantId },
    })
    await prisma.userPermission.deleteMany({ where: { userId: user.id } })
    await prisma.userPermission.createMany({
      data: invite.permissions.map((permission) => ({ userId: user.id, tenantId: invite.tenantId, permission })),
      skipDuplicates: true,
    })
    await prisma.staffInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
    res.json({ message: 'Convite aceito' })
  } catch (err) {
    next(err)
  }
})

router.patch('/sessions/:id/revoke', requirePermission('USER_MANAGE'), async (req, res, next) => {
  try {
    const session = await prisma.authSession.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } })
    if (!session) throw new NotFoundError('Sessao')
    const updated = await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    await audit(req, 'REVOKE', 'authSession', updated.id)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

router.get('/settings', requirePermission('SETTINGS_READ'), async (req, res, next) => {
  try {
    const settings = await prisma.clinicSetting.findMany({ where: { tenantId: req.user!.tenantId } })
    res.json(Object.fromEntries(settings.map((item: any) => [item.key, item.value])))
  } catch (err) {
    next(err)
  }
})

router.put('/settings', requirePermission('SETTINGS_WRITE'), async (req, res, next) => {
  try {
    const body = settingsSchema.parse(req.body)
    const updates = await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.clinicSetting.upsert({
          where: { key_tenantId: { key, tenantId: req.user!.tenantId } },
          update: { value },
          create: { key, value, tenantId: req.user!.tenantId },
        })
      )
    )
    res.json(Object.fromEntries(updates.map((item: any) => [item.key, item.value])))
  } catch (err) {
    next(err)
  }
})

export default router
