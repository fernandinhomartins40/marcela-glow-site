import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import QRCode from 'qrcode'
import { prisma } from '@marcela/database'
import { authenticate, requirePermission, requireRole, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { randomToken, signJson, signJsonWithPrivateKey } from '../lib/security'
import { sendPatientPush } from '../lib/push'
import {
  availableSignatureLevel,
  checkCompliance,
  DOCUMENT_LABELS,
  formatItemLine,
  highestControl,
  validUntilFor,
  verifySignaturePayload,
  type DocumentKind,
} from '../lib/clinical'
import {
  hashContent,
  loadConfig,
  PROVIDERS,
  saveConfig,
  signHash,
  SignatureError,
  testConnection,
  toPublic,
} from '../lib/cloudSignature'

const router = Router()
const staffOnly = [authenticate, requireStaff]

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo clínico
// ─────────────────────────────────────────────────────────────────────────────

const catalogSchema = z.object({
  kind: z.enum(['MEDICATION', 'EXAM', 'GUIDANCE', 'RECORD_TEMPLATE']),
  name: z.string().min(2),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  strength: z.string().optional(),
  form: z.string().optional(),
  route: z.string().optional(),
  defaultDose: z.string().optional(),
  defaultQty: z.string().optional(),
  control: z.enum(['COMMON', 'ANTIMICROBIAL', 'CONTROLLED']).optional(),
  tussCode: z.string().optional(),
  preparation: z.string().optional(),
  isActive: z.boolean().optional(),
})

router.get('/catalog', ...staffOnly, requirePermission('RECORD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kind = req.query.kind ? String(req.query.kind) : undefined
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const items = await prisma.catalogItem.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(kind ? { kind: kind as never } : {}),
        ...(req.query.includeInactive === 'true' ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { subtitle: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      // Mais usados primeiro: a médica reencontra o de sempre sem procurar
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
      take: 300,
    })
    res.json(items)
  } catch (err) {
    next(err)
  }
})

router.post('/catalog', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = catalogSchema.parse(req.body)
    const item = await prisma.catalogItem.create({
      data: { ...body, tenantId: req.user!.tenantId },
    })
    await audit(req, 'CREATE', 'catalogItem', item.id, { kind: item.kind })
    res.status(201).json(item)
  } catch (err) {
    next(err)
  }
})

router.put('/catalog/:id', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = catalogSchema.partial().parse(req.body)
    const existing = await prisma.catalogItem.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Item do catálogo')

    const item = await prisma.catalogItem.update({ where: { id: existing.id }, data: body })
    await audit(req, 'UPDATE', 'catalogItem', item.id)
    res.json(item)
  } catch (err) {
    next(err)
  }
})

router.delete('/catalog/:id', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.catalogItem.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Item do catálogo')

    await prisma.catalogItem.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'catalogItem', existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Documentos clínicos (receita, exames, orientações)
// ─────────────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  catalogItemId: z.string().optional(),
  name: z.string().min(1),
  strength: z.string().optional(),
  form: z.string().optional(),
  route: z.string().optional(),
  dose: z.string().optional(),
  quantity: z.string().optional(),
  notes: z.string().optional(),
  control: z.enum(['COMMON', 'ANTIMICROBIAL', 'CONTROLLED']).optional(),
})

const documentSchema = z.object({
  patientId: z.string().min(1),
  /** Consulta em que o documento está sendo emitido */
  appointmentId: z.string().optional(),
  kind: z.enum(['PRESCRIPTION', 'EXAM_REQUEST', 'GUIDANCE', 'CERTIFICATE']).default('PRESCRIPTION'),
  title: z.string().min(2),
  instructions: z.string().default(''),
  items: z.array(itemSchema).optional().default([]),
})

const DOCUMENT_INCLUDE = {
  items: { orderBy: { displayOrder: 'asc' as const } },
  patient: { select: { id: true, name: true, email: true, birthDate: true } },
  signedBy: { select: { id: true, name: true } },
}

router.get('/documents', ...staffOnly, requirePermission('PRESCRIPTION_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documents = await prisma.prescription.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(req.query.kind ? { kind: String(req.query.kind) as never } : {}),
        ...(req.query.patientId ? { patientId: String(req.query.patientId) } : {}),
      },
      include: DOCUMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json(documents)
  } catch (err) {
    next(err)
  }
})

router.post('/documents', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = documentSchema.parse(req.body)
    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, tenantId: req.user!.tenantId },
    })
    if (!patient) throw new NotFoundError('Paciente')

    const cloudConfig = await loadConfig(req.user!.tenantId)
    const compliance = checkCompliance(body.kind as DocumentKind, body.items, Boolean(cloudConfig?.enabled))

    const document = await prisma.prescription.create({
      data: {
        patientId: patient.id,
        appointmentId: body.appointmentId || null,
        tenantId: req.user!.tenantId,
        kind: body.kind,
        title: body.title,
        instructions: body.instructions,
        status: 'DRAFT',
        items: {
          create: body.items.map((item, index) => ({
            catalogItemId: item.catalogItemId || null,
            name: item.name,
            strength: item.strength,
            form: item.form,
            route: item.route,
            dose: item.dose,
            quantity: item.quantity,
            notes: item.notes,
            control: item.control ?? 'COMMON',
            displayOrder: index,
          })),
        },
      },
      include: DOCUMENT_INCLUDE,
    })

    // Sobe o contador dos itens usados para ordenar melhor a busca futura
    const usedIds = body.items.map((i) => i.catalogItemId).filter(Boolean) as string[]
    if (usedIds.length) {
      await prisma.catalogItem.updateMany({
        where: { id: { in: usedIds }, tenantId: req.user!.tenantId },
        data: { usageCount: { increment: 1 } },
      })
    }

    await audit(req, 'CREATE', 'prescription', document.id, { kind: body.kind, patientId: patient.id })
    res.status(201).json({ document, compliance })
  } catch (err) {
    next(err)
  }
})

router.put('/documents/:id', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = documentSchema.partial().parse(req.body)
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Documento')
    if (existing.signedAt) {
      throw new AppError('Documento assinado não pode ser alterado.', 409, 'ALREADY_SIGNED')
    }

    const document = await prisma.$transaction(async (tx: any) => {
      if (body.items) {
        // Substitui a lista inteira: mais simples e previsível que diferenciar
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: existing.id } })
        await tx.prescriptionItem.createMany({
          data: body.items.map((item, index) => ({
            prescriptionId: existing.id,
            catalogItemId: item.catalogItemId || null,
            name: item.name,
            strength: item.strength,
            form: item.form,
            route: item.route,
            dose: item.dose,
            quantity: item.quantity,
            notes: item.notes,
            control: item.control ?? 'COMMON',
            displayOrder: index,
          })),
        })
      }

      return tx.prescription.update({
        where: { id: existing.id },
        data: { title: body.title, instructions: body.instructions, kind: body.kind },
        include: DOCUMENT_INCLUDE,
      })
    })

    await audit(req, 'UPDATE', 'prescription', document.id)
    res.json(document)
  } catch (err) {
    next(err)
  }
})

router.delete('/documents/:id', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Documento')
    if (existing.signedAt) {
      throw new AppError('Documento assinado não pode ser excluído.', 409, 'ALREADY_SIGNED')
    }

    await prisma.prescription.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'prescription', existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * Assina e disponibiliza o documento. Devolve o resultado da checagem de
 * conformidade para que a interface avise quando a assinatura disponível não
 * atende ao exigido por lei.
 */
router.post('/documents/:id/sign', ...staffOnly, requirePermission('PRESCRIPTION_SIGN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      include: { items: true, patient: true },
    })
    if (!existing) throw new NotFoundError('Documento')
    if (existing.signedAt) throw new AppError('Documento já assinado.', 409, 'ALREADY_SIGNED')

    const kind = existing.kind as DocumentKind
    const cloudConfig = await loadConfig(req.user!.tenantId)
    const compliance = checkCompliance(kind, existing.items, Boolean(cloudConfig?.enabled))

    const signer = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true, email: true },
    })
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      select: { name: true, address: true, phone: true },
    })

    const verificationCode = randomToken(18)
    const signedAt = new Date()
    const validUntil = validUntilFor(kind, existing.items, signedAt)

    // O payload assinado é o que a verificação pública reexibe: mudou algo,
    // a conferência do hash falha.
    const payload = {
      id: existing.id,
      kind,
      title: existing.title,
      patient: { name: existing.patient.name, birthDate: existing.patient.birthDate },
      prescriber: { name: signer?.name ?? 'Equipe médica' },
      clinic: { name: tenant?.name, address: tenant?.address, phone: tenant?.phone },
      items: existing.items.map((item: any) => ({
        name: item.name,
        strength: item.strength,
        form: item.form,
        route: item.route,
        dose: item.dose,
        quantity: item.quantity,
        control: item.control,
        line: formatItemLine(item),
      })),
      instructions: existing.instructions,
      signedAt: signedAt.toISOString(),
      validUntil: validUntil?.toISOString() ?? null,
      verificationCode,
    }

    // Com certificado em nuvem configurado e OTP informado, assina de verdade
    // com a chave da médica — é o que dá validade em farmácia.
    const otp = String(req.body?.otp ?? '').trim()
    let cloudSignature: { signature: string; certificateAlias: string; algorithm: string } | null = null
    let effectiveLevel = availableSignatureLevel()

    if (cloudConfig?.enabled && cloudConfig.clientSecret && otp) {
      try {
        cloudSignature = await signHash(
          cloudConfig,
          otp,
          hashContent(JSON.stringify(payload)),
          `${DOCUMENT_LABELS[kind]} — ${existing.patient.name}`,
        )
        effectiveLevel = 'QUALIFIED'
      } catch (err) {
        if (err instanceof SignatureError) {
          throw new AppError(err.message, 400, 'SIGNATURE_FAILED')
        }
        throw err
      }
    } else if (cloudConfig?.enabled && !otp && compliance.required === 'QUALIFIED') {
      // Documento exige qualificada e o certificado existe: pede o código
      throw new AppError(
        'Informe o código do aplicativo para assinar com o certificado digital.',
        400,
        'OTP_REQUIRED',
      )
    }

    const rsaSignature = signJsonWithPrivateKey(payload, process.env.PRESCRIPTION_SIGNING_PRIVATE_KEY)
    const signatureHash =
      cloudSignature?.signature ??
      rsaSignature ??
      signJson(payload, process.env.PRESCRIPTION_SIGNING_SECRET || process.env.JWT_SECRET || 'change-this-secret')

    const verificationUrl = `${process.env.PUBLIC_APP_URL || ''}/verificar/${verificationCode}`
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl)

    const document = await prisma.prescription.update({
      where: { id: existing.id },
      data: {
        status: 'SIGNED',
        signedAt,
        signedById: req.user!.userId,
        signatureHash,
        verificationCode,
        signatureLevel: effectiveLevel,
        validUntil,
        signaturePayload: {
          ...payload,
          verificationUrl,
          qrCodeDataUrl,
          algorithm: cloudSignature?.algorithm ?? (rsaSignature ? 'RSA-SHA256' : 'HMAC-SHA256'),
          signatureLevel: effectiveLevel,
          certificateAlias: cloudSignature?.certificateAlias ?? null,
          compliance: {
            required: compliance.required,
            // Depois de assinar, o "disponível" é o que foi de fato aplicado
            available: effectiveLevel,
            compliant: effectiveLevel === 'QUALIFIED' || compliance.compliant,
            warning: effectiveLevel === 'QUALIFIED' ? null : compliance.warning ?? null,
          },
        },
      },
      include: DOCUMENT_INCLUDE,
    })

    const finalCompliance = {
      ...compliance,
      available: effectiveLevel,
      compliant: effectiveLevel === 'QUALIFIED' || compliance.compliant,
      warning: effectiveLevel === 'QUALIFIED' ? undefined : compliance.warning,
    }

    await audit(req, 'SIGN', 'prescription', document.id, {
      kind,
      control: highestControl(existing.items),
      signatureLevel: effectiveLevel,
      compliant: finalCompliance.compliant,
      qualified: Boolean(cloudSignature),
    })

    res.json({ document, compliance: finalCompliance, verificationUrl, qrCodeDataUrl })
  } catch (err) {
    next(err)
  }
})

/** Disponibiliza no portal da paciente e avisa por push. */
router.post('/documents/:id/send', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.prescription.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Documento')

    const document = await prisma.prescription.update({
      where: { id: existing.id },
      data: { status: existing.signedAt ? 'SIGNED' : 'SENT', sentAt: new Date() },
      include: DOCUMENT_INCLUDE,
    })

    const label = DOCUMENT_LABELS[document.kind as DocumentKind]
    await prisma.notification.create({
      data: {
        tenantId: req.user!.tenantId,
        patientId: document.patientId,
        title: `${label} disponível`,
        body: `${document.title} já está no seu portal.`,
        channel: 'IN_APP',
      },
    })
    await sendPatientPush(document.patientId, {
      title: `${label} disponível`,
      body: document.title,
      url: '/paciente/',
    }).catch(() => undefined)

    await audit(req, 'SEND', 'prescription', document.id)
    res.json(document)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Atendimento — o fluxo do consultório: agenda do dia → paciente → prontuário
// ─────────────────────────────────────────────────────────────────────────────

/** Consultas do dia, na ordem do horário. Ponto de entrada do atendimento. */
router.get('/encounters/agenda', ...staffOnly, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined
    const base = date ? new Date(`${date}T12:00:00Z`) : new Date()

    // Janela ampla em UTC: o filtro fino por data local fica no cliente, que
    // já sabe o fuso da clínica
    const start = new Date(base)
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - 1)
    const end = new Date(base)
    end.setUTCHours(0, 0, 0, 0)
    end.setUTCDate(end.getUTCDate() + 2)

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: req.user!.tenantId,
        scheduledAt: { gte: start, lt: end },
        status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
      },
      include: {
        procedure: { select: { id: true, title: true, durationMin: true } },
        patient: { select: { id: true, name: true, email: true, phone: true, birthDate: true } },
        // Mostra na lista o que já foi registrado nesta consulta
        _count: { select: { records: true, prescriptions: true, sessions: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    // Dia sem atendimento e a situacao normal numa agenda de consultorio, mas
    // a tela vazia parece sistema quebrado. Devolve tambem o proximo compromisso
    // depois desta data, para o painel dizer onde a agenda continua.
    const next =
      appointments.length > 0
        ? null
        : await prisma.appointment.findFirst({
            where: {
              tenantId: req.user!.tenantId,
              scheduledAt: { gte: end },
              status: { in: ['PENDING', 'CONFIRMED'] },
            },
            select: { id: true, scheduledAt: true, name: true },
            orderBy: { scheduledAt: 'asc' },
          })

    res.json({ appointments, next })
  } catch (err) {
    next(err)
  }
})

/**
 * Tudo que a médica precisa ver ao atender: dados da paciente, o que foi
 * registrado nesta consulta e o histórico anterior.
 */
router.get('/encounters/:appointmentId', ...staffOnly, requirePermission('RECORD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const appointment = await prisma.appointment.findFirst({
      where: { id: String(req.params.appointmentId), tenantId },
      include: {
        procedure: { select: { id: true, title: true } },
        patient: true,
      },
    })
    if (!appointment) throw new NotFoundError('Atendimento')
    if (!appointment.patientId) {
      throw new AppError(
        'Este agendamento não está vinculado a uma paciente cadastrada. Cadastre a paciente antes de iniciar o atendimento.',
        400,
        'PATIENT_REQUIRED',
      )
    }

    const patientId = appointment.patientId

    const [current, history, documents, sessions, attachments] = await Promise.all([
      // Registros feitos nesta consulta
      prisma.medicalRecord.findMany({
        where: { tenantId, appointmentId: appointment.id },
        orderBy: { createdAt: 'desc' },
      }),
      // Histórico anterior, para consulta rápida durante o atendimento
      prisma.medicalRecord.findMany({
        where: { tenantId, patientId, appointmentId: { not: appointment.id } },
        orderBy: { occurredAt: 'desc' },
        take: 20,
        include: { appointment: { select: { id: true, scheduledAt: true } } },
      }),
      prisma.prescription.findMany({
        where: { tenantId, patientId },
        include: { items: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.procedureSession.findMany({
        where: { tenantId, patientId },
        include: { procedure: { select: { id: true, title: true } } },
        orderBy: { performedAt: 'desc' },
        take: 30,
      }),
      // Exames e fotos da paciente, disponíveis durante a consulta
      prisma.attachment.findMany({
        where: { tenantId, patientId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ])

    await audit(req, 'READ', 'encounter', appointment.id, { patientId, includesMedicalRecord: true })

    res.json({
      appointment: {
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        endsAt: appointment.endsAt,
        status: appointment.status,
        message: appointment.message,
        procedure: appointment.procedure,
      },
      patient: appointment.patient,
      currentRecords: current,
      history,
      documents,
      sessions,
      attachments,
    })
  } catch (err) {
    next(err)
  }
})

/** O que ficou por terminar na consulta — a tela avisa antes de encerrar. */
router.get('/encounters/:appointmentId/pending', ...staffOnly, requirePermission('RECORD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const appointment = await prisma.appointment.findFirst({
      where: { id: String(req.params.appointmentId), tenantId },
      select: { id: true },
    })
    if (!appointment) throw new NotFoundError('Atendimento')

    res.json(await pendingWork(tenantId, appointment.id))
  } catch (err) {
    next(err)
  }
})

/** Registros abertos e documentos não entregues desta consulta. */
async function pendingWork(tenantId: string, appointmentId: string) {
  const [openRecords, draftDocuments, unsentDocuments, records] = await Promise.all([
    prisma.medicalRecord.count({ where: { tenantId, appointmentId, lockedAt: null } }),
    prisma.prescription.count({ where: { tenantId, appointmentId, status: 'DRAFT' } }),
    // Assinado mas nunca disponibilizado: a paciente não recebeu
    prisma.prescription.count({ where: { tenantId, appointmentId, status: 'SIGNED', sentAt: null } }),
    prisma.medicalRecord.count({ where: { tenantId, appointmentId } }),
  ])

  return { openRecords, draftDocuments, unsentDocuments, hasRecords: records > 0 }
}

const completeSchema = z.object({
  /** Fecha de uma vez os registros desta consulta, tornando-os definitivos */
  lockRecords: z.boolean().optional().default(false),
})

/**
 * Encerra o atendimento. Devolve o que ficou pendente para que a tela mostre —
 * marcar como realizada sem avisar de receita em rascunho fazia o documento
 * nunca chegar à paciente.
 */
router.post('/encounters/:appointmentId/complete', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = completeSchema.parse(req.body ?? {})
    const tenantId = req.user!.tenantId

    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.appointmentId), tenantId },
    })
    if (!existing) throw new NotFoundError('Atendimento')

    const pending = await pendingWork(tenantId, existing.id)

    if (body.lockRecords && pending.openRecords > 0) {
      await prisma.medicalRecord.updateMany({
        where: { tenantId, appointmentId: existing.id, lockedAt: null },
        data: { lockedAt: new Date() },
      })
      await audit(req, 'UPDATE', 'medicalRecord', existing.id, {
        action: 'lock-on-complete',
        count: pending.openRecords,
      })
    }

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: { status: 'COMPLETED' },
    })

    await audit(req, 'UPDATE', 'appointment', appointment.id, { action: 'complete', ...pending })
    res.json({ appointment, pending, lockedRecords: body.lockRecords ? pending.openRecords : 0 })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Certificado digital em nuvem (assinatura qualificada ICP-Brasil)
// ─────────────────────────────────────────────────────────────────────────────

const providerConfigSchema = z.object({
  provider: z.enum(['BIRDID', 'VIDAAS', 'SAFEID', 'CUSTOM']),
  clientId: z.string().min(1),
  /** Vazio = manter o segredo já gravado */
  clientSecret: z.string().optional(),
  cpf: z.string().min(11),
  certificateAlias: z.string().optional(),
  tokenUrl: z.string().url().optional().or(z.literal('')),
  signUrl: z.string().url().optional().or(z.literal('')),
  enabled: z.boolean().optional().default(false),
})

/** Catálogo de provedores para a tela montar as instruções. */
router.get('/signature/providers', ...staffOnly, requirePermission('PRESCRIPTION_SIGN'), async (_req: Request, res: Response) => {
  res.json(
    Object.values(PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      consoleUrl: p.consoleUrl,
      passwordLabel: p.passwordLabel,
      notes: p.notes,
    })),
  )
})

router.get('/signature/config', ...staffOnly, requirePermission('PRESCRIPTION_SIGN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await loadConfig(req.user!.tenantId)
    res.json({
      config: toPublic(config),
      // A tela precisa saber o que o servidor consegue fazer hoje
      currentLevel: availableSignatureLevel(),
    })
  } catch (err) {
    next(err)
  }
})

router.put('/signature/config', ...staffOnly, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = providerConfigSchema.parse(req.body)
    const existing = await loadConfig(req.user!.tenantId)

    // Segredo em branco no formulário significa "não mexer"
    const clientSecret = body.clientSecret || existing?.clientSecret || ''
    if (!clientSecret) {
      throw new AppError('Informe o client secret fornecido pelo provedor.', 400, 'SECRET_REQUIRED')
    }

    await saveConfig(req.user!.tenantId, {
      provider: body.provider,
      clientId: body.clientId,
      clientSecret,
      cpf: body.cpf.replace(/\D/g, ''),
      certificateAlias: body.certificateAlias || existing?.certificateAlias,
      tokenUrl: body.tokenUrl || undefined,
      signUrl: body.signUrl || undefined,
      enabled: body.enabled ?? false,
      lastTestAt: existing?.lastTestAt,
      lastTestOk: existing?.lastTestOk,
    })

    await audit(req, 'UPDATE', 'signature_config', undefined, { provider: body.provider })
    res.json({ config: toPublic(await loadConfig(req.user!.tenantId)) })
  } catch (err) {
    next(err)
  }
})

/** Confirma credenciais e OTP assinando um hash descartável. */
router.post('/signature/test', ...staffOnly, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const otp = String(req.body?.otp ?? '').trim()
    if (!otp) throw new AppError('Informe o código do aplicativo.', 400, 'OTP_REQUIRED')

    const config = await loadConfig(req.user!.tenantId)
    if (!config?.clientId || !config.clientSecret) {
      throw new AppError('Configure o provedor antes de testar.', 400, 'NOT_CONFIGURED')
    }

    try {
      const result = await testConnection(config, otp)
      await saveConfig(req.user!.tenantId, {
        ...config,
        // O alias vem do provedor: guarda para as próximas assinaturas
        certificateAlias: result.certificateAlias || config.certificateAlias,
        enabled: true,
        lastTestAt: new Date().toISOString(),
        lastTestOk: true,
      })
      await audit(req, 'UPDATE', 'signature_config', undefined, { test: 'ok' })
      res.json({ ok: true, certificateAlias: result.certificateAlias, algorithm: result.algorithm })
    } catch (err) {
      await saveConfig(req.user!.tenantId, {
        ...config,
        lastTestAt: new Date().toISOString(),
        lastTestOk: false,
      })
      if (err instanceof SignatureError) {
        res.status(400).json({ ok: false, message: err.message })
        return
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Verificação pública — usada pela farmácia e pelo laboratório
// ─────────────────────────────────────────────────────────────────────────────

router.get('/verify/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.prescription.findUnique({
      where: { verificationCode: String(req.params.code) },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
        patient: { select: { name: true } },
        signedBy: { select: { name: true } },
        tenant: { select: { name: true, address: true, phone: true } },
      },
    })

    if (!document || !document.signedAt) {
      throw new AppError('Documento não encontrado ou não assinado.', 404, 'NOT_FOUND')
    }

    const expired = document.validUntil ? document.validUntil < new Date() : false

    // Confere de fato a assinatura: um documento adulterado no banco precisa
    // reprovar aqui, que é onde a farmácia checa.
    const valid = document.signaturePayload
      ? verifySignaturePayload(document.signaturePayload as Record<string, unknown>, document.signatureHash ?? '')
      : false

    // Resposta pública: só o necessário para conferir o documento em mãos
    res.json({
      valid,
      expired,
      kind: document.kind,
      kindLabel: DOCUMENT_LABELS[document.kind as DocumentKind],
      title: document.title,
      patientName: document.patient.name,
      prescriber: document.signedBy?.name ?? null,
      clinic: document.tenant,
      signedAt: document.signedAt,
      validUntil: document.validUntil,
      signatureLevel: document.signatureLevel,
      items: document.items.map((item: any) => ({
        name: item.name,
        strength: item.strength,
        form: item.form,
        dose: item.dose,
        quantity: item.quantity,
        route: item.route,
        control: item.control,
      })),
      instructions: document.instructions,
    })
  } catch (err) {
    next(err)
  }
})

export default router
