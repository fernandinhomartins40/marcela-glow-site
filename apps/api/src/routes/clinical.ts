import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import QRCode from 'qrcode'
import { prisma } from '@marcela/database'
import { authenticate, requirePermission, requireRole } from '../middleware/auth'
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
  type DocumentKind,
} from '../lib/clinical'

const router = Router()
const staffOnly = [authenticate, requireRole('ADMIN', 'STAFF')]

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

router.get('/catalog', ...staffOnly, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/catalog', ...staffOnly, async (req: Request, res: Response, next: NextFunction) => {
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

router.put('/catalog/:id', ...staffOnly, async (req: Request, res: Response, next: NextFunction) => {
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

router.delete('/catalog/:id', ...staffOnly, async (req: Request, res: Response, next: NextFunction) => {
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

router.get('/documents', ...staffOnly, async (req: Request, res: Response, next: NextFunction) => {
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

    const compliance = checkCompliance(body.kind as DocumentKind, body.items)

    const document = await prisma.prescription.create({
      data: {
        patientId: patient.id,
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
    const compliance = checkCompliance(kind, existing.items)

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

    const rsaSignature = signJsonWithPrivateKey(payload, process.env.PRESCRIPTION_SIGNING_PRIVATE_KEY)
    const signatureHash =
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
        signatureLevel: availableSignatureLevel(),
        validUntil,
        signaturePayload: {
          ...payload,
          verificationUrl,
          qrCodeDataUrl,
          algorithm: rsaSignature ? 'RSA-SHA256' : 'HMAC-SHA256',
          signatureLevel: availableSignatureLevel(),
          compliance: {
            required: compliance.required,
            available: compliance.available,
            compliant: compliance.compliant,
            warning: compliance.warning ?? null,
          },
        },
      },
      include: DOCUMENT_INCLUDE,
    })

    await audit(req, 'SIGN', 'prescription', document.id, {
      kind,
      control: highestControl(existing.items),
      signatureLevel: availableSignatureLevel(),
      compliant: compliance.compliant,
    })

    res.json({ document, compliance, verificationUrl, qrCodeDataUrl })
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

    // Resposta pública: só o necessário para conferir o documento em mãos
    res.json({
      valid: true,
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
