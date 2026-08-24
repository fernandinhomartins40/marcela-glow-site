import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma, LeadStatus, RecordType, PrescriptionStatus, ContentStatus, Permission, UserRole, FileVisibility } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { addDays, randomToken, sha256 } from '../lib/security'
import { buildStorageKey, presignDownload, presignUpload, publicFileUrl, s3Bucket, storageConfigured } from '../lib/storage'
import { sendPatientPush } from '../lib/push'
import { rolePermissions } from '../lib/permissions'

const router = Router()
const staffOnly = [authenticate, requireStaff]

/**
 * Campos de texto opcionais da ficha. String vazia vinda do formulário vira
 * null para que "apagar o campo" realmente apague — com `undefined` o Prisma
 * ignora a chave e o valor antigo permanece.
 */
const optionalText = (max = 200) =>
  z
    .string()
    .max(max)
    .trim()
    .optional()
    .transform((value) => (value ? value : null))

const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(value) : null))

/**
 * Valida o CPF pelos dígitos verificadores. A checagem existe também na tela,
 * mas precisa estar aqui: a API é chamada pelo painel, pelo portal e por
 * integração, e um documento errado vai parar em receita e atestado.
 */
function isValidCPF(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const verifier = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return verifier(9) === Number(digits[9]) && verifier(10) === Number(digits[10])
}

const patientSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  phone: optionalText(30),
  birthDate: optionalDate,
  notes: optionalText(2000),

  // Identificação
  cpf: z
    .string()
    .optional()
    .transform((value) => {
      const digits = (value ?? '').replace(/\D/g, '')
      return digits ? digits : null
    })
    .refine((value) => value === null || isValidCPF(value), 'CPF inválido'),
  rg: optionalText(30),
  socialName: optionalText(150),
  gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED']).nullish(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'STABLE_UNION']).nullish(),
  occupation: optionalText(120),
  nationality: optionalText(60),

  // Endereço
  zipCode: z
    .string()
    .optional()
    .transform((value) => {
      const digits = (value ?? '').replace(/\D/g, '')
      return digits ? digits : null
    })
    .refine((value) => value === null || value.length === 8, 'CEP deve ter 8 dígitos'),
  street: optionalText(200),
  streetNumber: optionalText(20),
  complement: optionalText(100),
  district: optionalText(100),
  city: optionalText(100),
  state: z
    .string()
    .optional()
    .transform((value) => (value ? value.toUpperCase().trim() : null))
    .refine((value) => value === null || /^[A-Z]{2}$/.test(value), 'UF deve ter 2 letras'),

  // Contato de emergência
  emergencyName: optionalText(150),
  emergencyPhone: optionalText(30),
  emergencyRelation: optionalText(60),

  // Clínico de base
  allergies: optionalText(1000),
  medications: optionalText(1000),
  conditions: optionalText(1000),
  surgeries: optionalText(1000),
  bloodType: z
    .enum([
      'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
      'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE',
    ])
    .nullish(),
  isPregnant: z.boolean().optional(),
  isBreastfeeding: z.boolean().optional(),
  skinType: optionalText(60),

  // Administrativo
  insuranceName: optionalText(120),
  insuranceNumber: optionalText(60),
  referralSource: optionalText(120),
  referredBy: optionalText(150),
  // O formulário manda um booleano; o banco guarda o instante do aceite
  lgpdConsent: z.boolean().optional(),
  imageConsent: z.boolean().optional(),
})

type PatientInput = z.infer<typeof patientSchema>

/**
 * Converte o corpo validado em dados do Prisma. Os consentimentos chegam como
 * booleano e viram data: é o instante do aceite que serve de prova (LGPD).
 */
function toPatientData(body: Partial<PatientInput>) {
  const { lgpdConsent, imageConsent, name, email, ...rest } = body

  return {
    ...rest,
    ...(name !== undefined ? { name } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(lgpdConsent !== undefined ? { lgpdConsentAt: lgpdConsent ? new Date() : null } : {}),
    ...(imageConsent !== undefined ? { imageConsentAt: imageConsent ? new Date() : null } : {}),
  }
}

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
  occurredAt: z.string().datetime({ offset: true }).optional(),
  complaint: z.string().optional(),
  plan: z.string().optional(),
  history: z.string().optional(),
  /** Consulta que originou o registro; ausente em retorno avulso */
  appointmentId: z.string().optional(),
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
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    // Arquivadas ficam fora da lista salvo pedido explícito
    const includeArchived = req.query.includeArchived === 'true'

    const patients = await prisma.patient.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(includeArchived ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { socialName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search } },
                // A recepção busca pelo documento como a paciente o dita
                ...(search.replace(/\D/g, '') ? [{ cpf: { contains: search.replace(/\D/g, '') } }] : []),
              ],
            }
          : {}),
      },
      include: {
        appointments: { orderBy: { createdAt: 'desc' }, take: 3 },
        records: { orderBy: { createdAt: 'desc' }, take: 3 },
        _count: { select: { appointments: true, records: true, sessions: true, prescriptions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(patients)
  } catch (err) {
    next(err)
  }
})

/**
 * Liga à paciente os agendamentos que chegaram pela landing antes de existir
 * cadastro com aquele e-mail. Sem isso o pedido fica órfão e o atendimento não
 * abre, mesmo depois de a recepção cadastrar a paciente.
 */
async function linkOrphanAppointments(tenantId: string, patientId: string, email: string) {
  const { count } = await prisma.appointment.updateMany({
    where: { tenantId, patientId: null, email },
    data: { patientId },
  })
  return count
}

router.post('/patients', requirePermission('PATIENT_WRITE'), async (req, res, next) => {
  try {
    const body = patientSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    // Não usa upsert: sobrescrever silenciosamente uma paciente existente já
    // apagou dados de cadastro. Colisão de e-mail é erro, não atualização.
    const clash = await prisma.patient.findUnique({
      where: { email_tenantId: { email: body.email, tenantId } },
    })
    if (clash) {
      throw new AppError(
        `Já existe uma paciente cadastrada com este e-mail (${clash.name}).`,
        409,
        'EMAIL_IN_USE',
      )
    }

    if (body.cpf) {
      const cpfClash = await prisma.patient.findFirst({ where: { cpf: body.cpf, tenantId } })
      if (cpfClash) {
        throw new AppError(`Este CPF já está cadastrado para ${cpfClash.name}.`, 409, 'CPF_IN_USE')
      }
    }

    const patient = await prisma.patient.create({
      data: { ...toPatientData(body), name: body.name, email: body.email, tenantId },
    })

    const linked = await linkOrphanAppointments(tenantId, patient.id, patient.email)

    await audit(req, 'CREATE', 'patient', patient.id, linked ? { linkedAppointments: linked } : undefined)
    res.status(201).json({ ...patient, linkedAppointments: linked })
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
        records: {
          include: { attachments: true, appointment: { select: { id: true, scheduledAt: true } } },
          orderBy: { createdAt: 'desc' },
        },
        sessions: { include: { procedure: true }, orderBy: { performedAt: 'desc' } },
        // A ficha mostra o documento como ele é: com os itens estruturados
        prescriptions: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
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

router.put('/patients/:id', requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = patientSchema.partial().parse(req.body)
    const tenantId = req.user!.tenantId
    const existing = await prisma.patient.findFirst({
      where: { id: String(req.params.id), tenantId },
    })
    if (!existing) throw new NotFoundError('Paciente')

    // E-mail é a chave da paciente no tenant: não pode colidir com outra
    if (body.email && body.email !== existing.email) {
      const clash = await prisma.patient.findFirst({
        where: { email: body.email, tenantId, id: { not: existing.id } },
      })
      if (clash) throw new AppError('Já existe uma paciente com este e-mail.', 409, 'EMAIL_IN_USE')
    }

    // CPF também é único: duas fichas com o mesmo CPF são a mesma pessoa
    if (body.cpf && body.cpf !== existing.cpf) {
      const clash = await prisma.patient.findFirst({
        where: { cpf: body.cpf, tenantId, id: { not: existing.id } },
      })
      if (clash) {
        throw new AppError(`Este CPF já está cadastrado para ${clash.name}.`, 409, 'CPF_IN_USE')
      }
    }

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: toPatientData(body),
    })

    // Trocou o e-mail: pedidos antigos com o novo endereço passam a ser dela
    const linked = body.email ? await linkOrphanAppointments(tenantId, patient.id, patient.email) : 0

    await audit(req, 'UPDATE', 'patient', patient.id)
    res.json({ ...patient, linkedAppointments: linked })
  } catch (err) {
    next(err)
  }
})

/**
 * Arquiva em vez de excluir: o histórico clínico precisa sobreviver, e a
 * exclusão em cascata levaria prontuário, prescrições e anexos junto.
 */
router.patch('/patients/:id/archive', requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isActive = req.body?.isActive === true
    const existing = await prisma.patient.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Paciente')

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: { isActive },
    })
    await audit(req, 'UPDATE', 'patient', patient.id, { archived: !isActive })
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
      data: {
        ...body,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        patientId: patient.id,
        tenantId: req.user!.tenantId,
        createdById: req.user!.userId,
      },
    })
    await audit(req, 'CREATE', 'medicalRecord', record.id, { patientId: patient.id })
    res.status(201).json(record)
  } catch (err) {
    next(err)
  }
})

router.put('/records/:id', requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = recordSchema.partial().parse(req.body)
    const existing = await prisma.medicalRecord.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Registro')
    // Prontuário fechado é registro clínico definitivo
    if (existing.lockedAt) {
      throw new AppError('Registro fechado não pode ser alterado.', 409, 'RECORD_LOCKED')
    }

    const record = await prisma.medicalRecord.update({
      where: { id: existing.id },
      data: { ...body, occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined },
    })
    await audit(req, 'UPDATE', 'medicalRecord', record.id, { patientId: existing.patientId })
    res.json(record)
  } catch (err) {
    next(err)
  }
})

/** Fecha o registro: a partir daqui vira documento clínico imutável. */
router.patch('/records/:id/lock', requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.medicalRecord.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Registro')
    if (existing.lockedAt) throw new AppError('Registro já está fechado.', 409, 'RECORD_LOCKED')

    const record = await prisma.medicalRecord.update({
      where: { id: existing.id },
      data: { lockedAt: new Date() },
    })
    await audit(req, 'UPDATE', 'medicalRecord', record.id, { action: 'lock' })
    res.json(record)
  } catch (err) {
    next(err)
  }
})

router.delete('/records/:id', requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.medicalRecord.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Registro')
    if (existing.lockedAt) {
      throw new AppError('Registro fechado não pode ser excluído.', 409, 'RECORD_LOCKED')
    }

    await prisma.medicalRecord.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'medicalRecord', existing.id, { patientId: existing.patientId })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Procedimentos realizados (histórico clínico + faturamento)
// ─────────────────────────────────────────────────────────────────────────────

const sessionSchema = z.object({
  patientId: z.string().min(1),
  procedureId: z.string().optional(),
  appointmentId: z.string().optional(),
  performedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
  priceCents: z.number().int().min(0).optional(),
})

router.get('/sessions', requirePermission('RECORD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.procedureSession.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(req.query.patientId ? { patientId: String(req.query.patientId) } : {}),
      },
      include: {
        procedure: { select: { id: true, title: true } },
        patient: { select: { id: true, name: true } },
      },
      orderBy: { performedAt: 'desc' },
      take: 200,
    })
    res.json(sessions)
  } catch (err) {
    next(err)
  }
})

router.post('/sessions', requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sessionSchema.parse(req.body)
    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, tenantId: req.user!.tenantId },
    })
    if (!patient) throw new NotFoundError('Paciente')

    const session = await prisma.procedureSession.create({
      data: {
        patientId: patient.id,
        procedureId: body.procedureId || null,
        appointmentId: body.appointmentId || null,
        performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
        notes: body.notes,
        priceCents: body.priceCents,
        tenantId: req.user!.tenantId,
      },
      include: { procedure: { select: { id: true, title: true } }, patient: { select: { id: true, name: true } } },
    })
    await audit(req, 'CREATE', 'procedureSession', session.id, { patientId: patient.id })
    res.status(201).json(session)
  } catch (err) {
    next(err)
  }
})

router.put('/sessions/:id', requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sessionSchema.partial().parse(req.body)
    const existing = await prisma.procedureSession.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Procedimento')

    const session = await prisma.procedureSession.update({
      where: { id: existing.id },
      data: {
        procedureId: body.procedureId === undefined ? undefined : body.procedureId || null,
        performedAt: body.performedAt ? new Date(body.performedAt) : undefined,
        notes: body.notes,
        priceCents: body.priceCents,
      },
      include: { procedure: { select: { id: true, title: true } }, patient: { select: { id: true, name: true } } },
    })
    await audit(req, 'UPDATE', 'procedureSession', session.id)
    res.json(session)
  } catch (err) {
    next(err)
  }
})

router.delete('/sessions/:id', requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.procedureSession.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Procedimento')

    await prisma.procedureSession.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'procedureSession', existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/leads', requirePermission('LEAD_READ'), async (req, res, next) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { updatedAt: 'desc' },
      // O cartão mostra o vínculo com a ficha quando o contato já foi convertido
      include: { patient: { select: { id: true, name: true } } },
    })
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

/**
 * Converte um lead em paciente, guardando o vínculo.
 *
 * Sem isto a mesma pessoa virava dois registros sem ligação: a origem se
 * perdia na conversão e não dava para saber de qual campanha uma paciente
 * tinha vindo. Quando já existe cadastro com aquele e-mail, vincula ao
 * existente em vez de falhar — a recepção costuma cadastrar antes de mexer
 * no quadro de leads, e duplicar seria o pior desfecho.
 */
router.post('/leads/:id/convert', requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const lead = await prisma.lead.findFirst({ where: { id: String(req.params.id), tenantId } })
    if (!lead) throw new NotFoundError('Lead')

    if (lead.patientId) {
      throw new AppError('Este contato já foi convertido em paciente.', 409, 'LEAD_ALREADY_CONVERTED')
    }
    if (!lead.email) {
      throw new AppError(
        'O contato precisa de e-mail para virar cadastro — é ele que dá acesso ao portal.',
        400,
        'LEAD_WITHOUT_EMAIL',
      )
    }

    // Já cadastrada? Vincula em vez de duplicar.
    const existing = await prisma.patient.findUnique({
      where: { email_tenantId: { email: lead.email, tenantId } },
    })

    const patient =
      existing ??
      (await prisma.patient.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone?.replace(/\D/g, '') || null,
          // O quadro de leads registra de onde veio; a ficha herda isso
          referralSource: lead.origin ?? null,
          notes: lead.notes ?? null,
          tenantId,
        },
      }))

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { patientId: patient.id, convertedAt: new Date(), status: 'WON' },
    })

    await audit(req, existing ? 'UPDATE' : 'CREATE', 'patient', patient.id, {
      fromLeadId: lead.id,
      linkedToExisting: Boolean(existing),
    })

    res.status(201).json({ lead: updated, patient, linkedToExisting: Boolean(existing) })
  } catch (err) {
    next(err)
  }
})

router.delete('/leads/:id', requirePermission('LEAD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Lead')

    await prisma.lead.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'lead', existing.id)
    res.status(204).end()
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

/**
 * Aposentado em favor de POST /clinical/documents, que emite o documento com
 * itens estruturados, prazo de validade e checagem do nível de assinatura
 * exigido pela Lei 14.063/2020. Esta rota criava receita em texto corrido, sem
 * validade em farmácia — mantida apenas para não quebrar cliente antigo.
 */
router.post('/prescriptions', requirePermission('PRESCRIPTION_WRITE'), async (_req: Request, _res: Response, next: NextFunction) => {
  next(
    new AppError(
      'Emita o documento pelo atendimento da paciente: as receitas agora saem com itens estruturados e assinatura válida.',
      410,
      'ENDPOINT_RETIRED',
    ),
  )
})

/** Prescrição assinada tem valor legal: só rascunho pode ser alterado. */
router.put('/prescriptions/:id', requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = prescriptionSchema.partial().parse(req.body)
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Prescrição')
    if (existing.signedAt) {
      throw new AppError('Prescrição assinada não pode ser alterada.', 409, 'ALREADY_SIGNED')
    }

    const prescription = await prisma.prescription.update({
      where: { id: existing.id },
      data: { title: body.title, instructions: body.instructions, status: body.status },
      include: { patient: { select: { id: true, name: true } } },
    })
    await audit(req, 'UPDATE', 'prescription', prescription.id)
    res.json(prescription)
  } catch (err) {
    next(err)
  }
})

router.delete('/prescriptions/:id', requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Prescrição')
    if (existing.signedAt) {
      throw new AppError('Prescrição assinada não pode ser excluída.', 409, 'ALREADY_SIGNED')
    }

    await prisma.prescription.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'prescription', existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * Aposentada junto com POST /prescriptions. Assinava um payload sem itens
 * estruturados nem checagem do nível exigido pela Lei 14.063/2020, e apontava o
 * QR code para uma rota de verificação paralela. Assinar agora é
 * POST /clinical/documents/:id/sign.
 */
router.patch('/prescriptions/:id/sign', requirePermission('PRESCRIPTION_SIGN'), async (_req: Request, _res: Response, next: NextFunction) => {
  next(
    new AppError(
      'Assine o documento pelo atendimento da paciente, para que a receita saia com assinatura válida e código de verificação.',
      410,
      'ENDPOINT_RETIRED',
    ),
  )
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

router.delete('/cms/pages/:id', requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.cmsPage.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Página')

    await prisma.cmsPage.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'cmsPage', existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.delete('/cms/posts/:id', requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.blogPost.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Post')

    await prisma.blogPost.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'blogPost', existing.id)
    res.status(204).end()
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
      include: {
        permissions: true,
        sessions: { where: { revokedAt: null }, take: 5, orderBy: { createdAt: 'desc' } },
        _count: { select: { sessions: { where: { revokedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  /** Substitui o conjunto inteiro de exceções — não é um acréscimo. */
  permissions: z.array(z.nativeEnum(Permission)).optional(),
})

/**
 * Duas travas que o painel sozinho não garante: ninguém rebaixa ou desliga a
 * própria conta (sairia da tela sem poder desfazer), e a clínica nunca fica
 * sem administrador ativo — sem ADMIN não há quem gerencie a equipe de volta.
 */
async function assertTenantKeepsAdmin(tenantId: string, userId: string, next: { role?: UserRole; isActive?: boolean }) {
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId } })
  if (!target || target.role !== 'ADMIN') return
  const stillAdmin = (next.role ?? target.role) === 'ADMIN' && (next.isActive ?? target.isActive)
  if (stillAdmin) return

  const others = await prisma.user.count({
    where: { tenantId, role: 'ADMIN', isActive: true, id: { not: userId } },
  })
  if (others === 0) {
    throw new AppError(
      'A clínica precisa de pelo menos um administrador ativo. Promova outra pessoa antes de alterar esta conta.',
      409,
      'LAST_ADMIN',
    )
  }
}

router.patch('/users/:id', requirePermission('USER_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = userUpdateSchema.parse(req.body)
    const tenantId = req.user!.tenantId
    const id = String(req.params.id)

    const target = await prisma.user.findFirst({ where: { id, tenantId } })
    if (!target) throw new NotFoundError('Usuario')

    if (id === req.user!.userId && (body.role !== undefined || body.isActive !== undefined)) {
      throw new AppError(
        'Você não pode alterar o próprio papel nem desativar a própria conta. Peça a outro administrador.',
        409,
        'SELF_DEMOTION',
      )
    }

    await assertTenantKeepsAdmin(tenantId, id, { role: body.role, isActive: body.isActive })

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      })

      if (body.permissions) {
        // O papel já concede o seu conjunto; guardar aqui o que ele daria de
        // graça faria a exceção sobreviver a uma troca de papel.
        const fromRole = new Set(rolePermissions[updated.role] ?? [])
        const extras = body.permissions.filter((permission) => !fromRole.has(permission))
        await tx.userPermission.deleteMany({ where: { userId: id } })
        if (extras.length) {
          await tx.userPermission.createMany({
            data: extras.map((permission) => ({ userId: id, tenantId, permission })),
            skipDuplicates: true,
          })
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: {
          permissions: true,
          sessions: { where: { revokedAt: null }, take: 5, orderBy: { createdAt: 'desc' } },
        },
      })
    })

    // Desativar não basta: a sessão aberta continuaria valendo até expirar.
    if (body.isActive === false) {
      await prisma.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }

    await audit(req, 'UPDATE', 'user', id, {
      role: body.role,
      isActive: body.isActive,
      permissions: body.permissions,
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

/** Catálogo que o painel usa para montar a tela — evita duplicar a lista lá. */
router.get('/roles', requirePermission('USER_MANAGE'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      roles: Object.values(UserRole).map((role) => ({
        id: role,
        permissions: rolePermissions[role] ?? [],
      })),
      permissions: Object.values(Permission),
    })
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

/** "Desconectar de todos os aparelhos" — o caso real é celular perdido. */
router.post('/users/:id/revoke-sessions', requirePermission('USER_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const id = String(req.params.id)
    const target = await prisma.user.findFirst({ where: { id, tenantId } })
    if (!target) throw new NotFoundError('Usuario')

    const { count } = await prisma.authSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    await audit(req, 'REVOKE', 'authSession', id, { all: true, count })
    res.json({ revoked: count })
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

// ─────────────────────────────────────────────────────────────────────────────
// Expediente da clínica
// ─────────────────────────────────────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const businessHoursSchema = z.object({
  hours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      startTime: z.string().regex(TIME_RE, 'Use o formato HH:MM'),
      endTime: z.string().regex(TIME_RE, 'Use o formato HH:MM'),
      isActive: z.boolean().optional().default(true),
    }),
  ),
})

router.get('/business-hours', requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = await prisma.businessHour.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    })
    res.json(hours)
  } catch (err) {
    next(err)
  }
})

/** Substitui o expediente inteiro — mais simples que diferenciar cada faixa. */
router.put('/business-hours', requirePermission('SETTINGS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = businessHoursSchema.parse(req.body)

    for (const hour of body.hours) {
      if (hour.startTime >= hour.endTime) {
        throw new AppError(
          `O horário de término deve ser depois do início (dia ${hour.weekday}).`,
          400,
          'INVALID_RANGE',
        )
      }
    }

    const tenantId = req.user!.tenantId
    const hours = await prisma.$transaction(async (tx: any) => {
      await tx.businessHour.deleteMany({ where: { tenantId } })
      await tx.businessHour.createMany({
        data: body.hours.map((hour) => ({ ...hour, tenantId })),
      })
      return tx.businessHour.findMany({
        where: { tenantId },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      })
    })

    await audit(req, 'UPDATE', 'business_hours', undefined, { count: hours.length })
    res.json(hours)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Bloqueios de agenda (férias, feriados, almoço)
// ─────────────────────────────────────────────────────────────────────────────

const blockSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.string().max(200).optional(),
})

router.get('/schedule-blocks', requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date()
    const blocks = await prisma.scheduleBlock.findMany({
      where: { tenantId: req.user!.tenantId, endsAt: { gte: from } },
      orderBy: { startsAt: 'asc' },
    })
    res.json(blocks)
  } catch (err) {
    next(err)
  }
})

router.post('/schedule-blocks', requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = blockSchema.parse(req.body)
    const startsAt = new Date(body.startsAt)
    const endsAt = new Date(body.endsAt)

    if (endsAt <= startsAt) {
      throw new AppError('O fim do bloqueio deve ser depois do início.', 400, 'INVALID_RANGE')
    }

    const block = await prisma.scheduleBlock.create({
      data: { tenantId: req.user!.tenantId, startsAt, endsAt, reason: body.reason },
    })

    await audit(req, 'CREATE', 'schedule_block', block.id, { reason: body.reason })
    res.status(201).json(block)
  } catch (err) {
    next(err)
  }
})

router.delete('/schedule-blocks/:id', requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.scheduleBlock.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Bloqueio')

    await prisma.scheduleBlock.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'schedule_block', existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
