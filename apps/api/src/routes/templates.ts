import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { buildStorageKey, presignUpload, publicFileUrl, s3Bucket, storageConfigured } from '../lib/storage'

/**
 * Modelos de documento.
 *
 * Guardam o que se repete a cada emissão: o conteúdo (título, orientações e
 * itens já preenchidos) e o layout com que o documento é impresso. Emitir a
 * partir de um modelo copia esses valores para o documento novo — o documento
 * segue independente, então mudar o modelo depois não altera o que já foi
 * assinado.
 */

const router = Router()
const staffOnly = [authenticate, requireStaff]

const itemSchema = z.object({
  catalogItemId: z.string().optional().nullable(),
  name: z.string().min(1),
  strength: z.string().optional().nullable(),
  form: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  dose: z.string().optional().nullable(),
  quantity: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  control: z.enum(['COMMON', 'ANTIMICROBIAL', 'CONTROLLED']).optional().default('COMMON'),
})

/**
 * Um bloco da folha. A ordem do array e a ordem em que sao impressos.
 *
 * `content` so vale para o bloco de texto; os demais sao gerados pelo sistema
 * (dados da clinica, da paciente, itens, assinatura) e o bloco so diz onde
 * entram e com que aparencia.
 */
const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'clinic',      // logo + nome/endereco/telefone
    'title',       // titulo do documento
    'patient',     // nome e dados da paciente
    'content',     // itens (receita/exame) ou orientacoes
    'text',        // texto livre formatado
    'signature',   // linha de assinatura + QR
    'divider',     // linha horizontal
    'spacer',      // espaco em branco
  ]),
  html: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  /** Altura em milimetros — usado por spacer e pelo espaco da assinatura */
  heightMm: z.number().min(0).max(120).optional(),
  /** Opcoes por tipo de bloco, sem exigir migracao a cada ajuste */
  options: z.record(z.unknown()).optional(),
})

const brandSchema = z.object({
  logoUrl: z.string().optional().nullable(),
  logoHeightMm: z.number().min(5).max(40).optional(),
  logoAlign: z.enum(['left', 'center', 'right']).optional(),
  /** Cor de titulos e linhas; o corpo do texto segue em preto para impressao */
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  /** Nome e contato impressos; vazio usa o cadastro da clinica */
  clinicName: z.string().optional().nullable(),
  clinicLine1: z.string().optional().nullable(),
  clinicLine2: z.string().optional().nullable(),
})

const layoutSchema = z.object({
  /** Blocos da folha, na ordem de impressao. Vazio usa o arranjo padrao. */
  blocks: z.array(blockSchema).optional(),
  brand: brandSchema.optional(),

  /* Campos do primeiro formato, antes dos blocos. Continuam aceitos para os
     modelos ja gravados: a tela converte para blocos ao abrir. */
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  showClinicHeader: z.boolean().optional(),
  signaturePosition: z.enum(['left', 'center', 'right']).optional(),
  signatureSpaceMm: z.number().min(0).max(80).optional(),
  showVerificationQr: z.boolean().optional(),

  marginMm: z.number().min(5).max(50).optional(),
  fontFamily: z.enum(['sans', 'serif']).optional(),
  fontSizePt: z.number().min(8).max(16).optional(),
  paper: z.enum(['A4', 'A5']).optional(),
})

const templateSchema = z.object({
  name: z.string().min(2),
  kind: z.enum(['PRESCRIPTION', 'EXAM_REQUEST', 'GUIDANCE', 'CERTIFICATE']).default('PRESCRIPTION'),
  title: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  items: z.array(itemSchema).optional().default([]),
  layout: layoutSchema.optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})

/** Só um modelo padrão por tipo: o novo padrão desmarca o anterior. */
async function limparPadraoAnterior(tenantId: string, kind: string, exceto?: string) {
  await prisma.documentTemplate.updateMany({
    where: { tenantId, kind: kind as never, isDefault: true, ...(exceto ? { id: { not: exceto } } : {}) },
    data: { isDefault: false },
  })
}

router.get('/', ...staffOnly, requirePermission('PRESCRIPTION_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined
    const templates = await prisma.documentTemplate.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(kind ? { kind: kind as never } : {}),
        ...(req.query.includeInactive === 'true' ? {} : { isActive: true }),
      },
      // Padrão primeiro, depois os mais usados: é a ordem em que a tela oferece.
      orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }, { name: 'asc' }],
    })
    res.json(templates)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', ...staffOnly, requirePermission('PRESCRIPTION_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.documentTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!template) throw new NotFoundError('Modelo')
    res.json(template)
  } catch (err) {
    next(err)
  }
})

router.post('/', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = templateSchema.parse(req.body)
    if (body.isDefault) await limparPadraoAnterior(req.user!.tenantId, body.kind)

    const template = await prisma.documentTemplate.create({
      data: {
        name: body.name,
        kind: body.kind as never,
        title: body.title ?? null,
        instructions: body.instructions ?? null,
        items: body.items?.length ? (body.items as never) : undefined,
        layout: body.layout ? (body.layout as never) : undefined,
        isDefault: body.isDefault ?? false,
        isActive: body.isActive ?? true,
        tenantId: req.user!.tenantId,
        createdById: req.user!.userId,
      },
    })
    await audit(req, 'CREATE', 'documentTemplate', template.id, { name: template.name })
    res.status(201).json(template)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = templateSchema.partial().parse(req.body)
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Modelo')

    if (body.isDefault) {
      await limparPadraoAnterior(req.user!.tenantId, body.kind ?? existing.kind, existing.id)
    }

    const template = await prisma.documentTemplate.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.kind !== undefined ? { kind: body.kind as never } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.instructions !== undefined ? { instructions: body.instructions } : {}),
        ...(body.items !== undefined ? { items: body.items as never } : {}),
        ...(body.layout !== undefined ? { layout: (body.layout ?? undefined) as never } : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    })
    await audit(req, 'UPDATE', 'documentTemplate', template.id, { name: template.name })
    res.json(template)
  } catch (err) {
    next(err)
  }
})

/**
 * Duplicar: o caminho mais curto para criar uma variação sem começar do zero,
 * e o que evita a médica editar o modelo bom para "testar uma coisa".
 */
router.post('/:id/duplicate', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const origem = await prisma.documentTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!origem) throw new NotFoundError('Modelo')

    const copia = await prisma.documentTemplate.create({
      data: {
        name: `${origem.name} (cópia)`,
        kind: origem.kind,
        title: origem.title,
        instructions: origem.instructions,
        items: origem.items ?? undefined,
        layout: origem.layout ?? undefined,
        // A cópia nunca nasce padrão: senão duplicar trocaria o modelo da clínica.
        isDefault: false,
        tenantId: req.user!.tenantId,
        createdById: req.user!.userId,
      },
    })
    await audit(req, 'CREATE', 'documentTemplate', copia.id, { duplicadoDe: origem.id })
    res.status(201).json(copia)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!existing) throw new NotFoundError('Modelo')
    if (existing.isDefault) {
      throw new AppError(
        'Este é o modelo padrão do tipo. Defina outro como padrão antes de excluir.',
        409,
        'TEMPLATE_IS_DEFAULT',
      )
    }

    await prisma.documentTemplate.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'documentTemplate', existing.id, { name: existing.name })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * Marca o uso ao emitir a partir do modelo. Alimenta a ordenação da lista, que
 * põe os mais usados no topo.
 */
router.post('/:id/used', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.documentTemplate.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError('Modelo')
    await prisma.documentTemplate.update({
      where: { id: existing.id },
      data: { usageCount: { increment: 1 } },
    })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/**
 * Upload do logo usado nos modelos.
 *
 * Mesmo fluxo de presigned URL dos anexos: a API assina, o navegador envia
 * direto ao storage e só a chave volta. Imagem por link externo não entra —
 * um servidor de terceiros fora do ar deixaria o papel timbrado quebrado no
 * meio de uma impressão.
 */
const logoPresignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().regex(/^image\/(png|jpeg|webp|svg\+xml)$/, 'Envie PNG, JPG, WEBP ou SVG.'),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024, 'O logo deve ter até 5 MB.'),
})

router.post('/logo/presign', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = logoPresignSchema.parse(req.body)
    if (!storageConfigured) throw new AppError('Storage nao configurado', 503, 'STORAGE_NOT_CONFIGURED')
    const storageKey = buildStorageKey(req.user!.tenantId, body.fileName)
    const uploadUrl = await presignUpload(storageKey, body.mimeType)
    res.json({ uploadUrl, storageKey, expiresIn: 900 })
  } catch (err) {
    next(err)
  }
})

/**
 * Registra o envio e devolve a URL publica.
 *
 * O logo fica visivel a quem recebe o documento, entao vai como PATIENT_VISIBLE
 * e sem paciente: nao e anexo de prontuario, e um elemento do papel timbrado.
 */
router.post('/logo/complete', ...staffOnly, requirePermission('PRESCRIPTION_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = logoPresignSchema.extend({ storageKey: z.string().min(1) }).parse(req.body)
    const attachment = await prisma.attachment.create({
      data: {
        fileName: body.fileName,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey: body.storageKey,
        bucket: s3Bucket,
        url: publicFileUrl(body.storageKey),
        // O logo aparece no documento que a paciente recebe.
        visibility: 'PATIENT_VISIBLE',
        uploadedById: req.user!.userId,
        tenantId: req.user!.tenantId,
      },
    })
    await audit(req, 'CREATE', 'attachment', attachment.id, { uso: 'logo-modelo' })
    res.status(201).json({ url: attachment.url, storageKey: attachment.storageKey })
  } catch (err) {
    next(err)
  }
})

export default router
