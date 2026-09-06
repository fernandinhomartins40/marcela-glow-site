import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma, LandingSection } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { buildStorageKey, presignUpload, publicFileUrl, s3Bucket, storageConfigured } from '../lib/storage'
import {
  montarManifesto,
  PWA_APPS,
  PWA_DEFAULTS,
  PWA_SETTING_KEY,
  pwaSettingsSchema,
  type PwaAppId,
} from '../lib/pwa'
import {
  IMAGE_TARGETS,
  LANDING_DEFAULTS,
  LANDING_SCHEMAS,
  isLandingSection,
  type LandingSectionId,
} from '../lib/landing'

const router = Router()
const staffOnly = [authenticate, requireStaff]

const SECTIONS = Object.keys(LANDING_SCHEMAS) as LandingSectionId[]

/**
 * Monta a resposta pública juntando três coisas: o que a clínica editou, o
 * padrão de fábrica para o que ela ainda não tocou, e a URL de cada imagem
 * enviada. Sem o padrão, uma seção nunca editada devolveria vazio e o site
 * apareceria sem texto no primeiro deploy.
 */
async function buildLanding(tenantId: string) {
  const [stored, images] = await Promise.all([
    prisma.landingContent.findMany({ where: { tenantId } }),
    prisma.landingImage.findMany({ where: { tenantId } }),
  ])

  const bySection = new Map(stored.map((row) => [row.section as LandingSectionId, row]))
  const imageUrls = Object.fromEntries(
    images.map((image) => [
      image.slot,
      { url: publicFileUrl(image.storageKey), width: image.width, height: image.height, alt: image.alt },
    ]),
  )

  const sections = Object.fromEntries(
    SECTIONS.map((section) => {
      const row = bySection.get(section)
      const schema = LANDING_SCHEMAS[section]
      // Conteúdo gravado por uma versão antiga do schema pode não bater mais;
      // nesse caso o padrão vale, para o site não quebrar por dado velho.
      const parsed = row ? schema.safeParse(row.content) : null
      return [
        section,
        {
          content: parsed?.success ? parsed.data : schema.parse(LANDING_DEFAULTS[section]),
          isVisible: row?.isVisible ?? true,
          isCustom: Boolean(parsed?.success),
          updatedAt: row?.updatedAt ?? null,
        },
      ]
    }),
  )

  return { sections, images: imageUrls }
}

// ─────────────────────────────────────────────────────────────────────────────
// Público — o que a landing consome
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = typeof req.query.tenantSlug === 'string' ? req.query.tenantSlug : undefined
    const tenant = slug
      ? await prisma.tenant.findUnique({ where: { slug } })
      : await prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
    if (!tenant) throw new NotFoundError('Clinica')

    res.json(await buildLanding(tenant.id))
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Painel — leitura e edição por seção
// ─────────────────────────────────────────────────────────────────────────────

router.get('/admin', ...staffOnly, requirePermission('CMS_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await buildLanding(req.user!.tenantId)
    res.json({
      ...data,
      // O painel usa isto para montar o recorte antes do envio.
      imageTargets: IMAGE_TARGETS,
    })
  } catch (err) {
    next(err)
  }
})

const sectionUpdateSchema = z.object({
  content: z.unknown(),
  isVisible: z.boolean().optional(),
})

router.put('/admin/:section', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const section = String(req.params.section).toUpperCase()
    if (!isLandingSection(section)) throw new NotFoundError('Secao')

    const body = sectionUpdateSchema.parse(req.body)
    // O handler global transforma o ZodError em mensagem com o caminho do
    // campo — mais útil ao formulário do que um erro genérico nosso.
    const content = LANDING_SCHEMAS[section].parse(body.content)

    const tenantId = req.user!.tenantId
    const saved = await prisma.landingContent.upsert({
      where: { section_tenantId: { section: section as LandingSection, tenantId } },
      update: {
        content: content as object,
        ...(body.isVisible !== undefined ? { isVisible: body.isVisible } : {}),
        updatedById: req.user!.userId,
      },
      create: {
        section: section as LandingSection,
        content: content as object,
        isVisible: body.isVisible ?? true,
        tenantId,
        updatedById: req.user!.userId,
      },
    })

    await audit(req, 'UPDATE', 'landingContent', saved.id, { section })
    res.json(saved)
  } catch (err) {
    next(err)
  }
})

/** Volta a seção ao texto de fábrica — sai mais barato que reescrever à mão. */
router.delete('/admin/:section', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const section = String(req.params.section).toUpperCase()
    if (!isLandingSection(section)) throw new NotFoundError('Secao')

    const tenantId = req.user!.tenantId
    await prisma.landingContent.deleteMany({
      where: { section: section as LandingSection, tenantId },
    })
    await audit(req, 'DELETE', 'landingContent', section, { section, action: 'reset' })
    res.json({ section, content: LANDING_SCHEMAS[section].parse(LANDING_DEFAULTS[section]) })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Imagens
// ─────────────────────────────────────────────────────────────────────────────

const imagePresignSchema = z.object({
  slot: z.string().trim().min(1).max(120),
  mimeType: z.string().trim().min(3).max(120),
})

router.post('/admin/images/presign', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = imagePresignSchema.parse(req.body)
    if (!storageConfigured) throw new AppError('Storage S3 nao configurado', 503, 'STORAGE_NOT_CONFIGURED')

    const target = IMAGE_TARGETS[body.slot]
    if (!target) throw new AppError(`Slot de imagem desconhecido: ${body.slot}`, 400, 'UNKNOWN_SLOT')
    if (body.mimeType !== target.mime) {
      throw new AppError(
        `Esta imagem precisa ser ${target.mime === 'image/png' ? 'PNG' : 'JPEG'}.`,
        400,
        'WRONG_MIME',
      )
    }

    // Imagem de site carrega direto no navegador: vai para o prefixo público.
    const storageKey = buildStorageKey(req.user!.tenantId, `landing-${body.slot.replace(/\./g, '-')}`, {
      publico: true,
    })
    const uploadUrl = await presignUpload(storageKey, body.mimeType)
    res.json({ uploadUrl, storageKey, bucket: s3Bucket, target, expiresIn: 900 })
  } catch (err) {
    next(err)
  }
})

const imageCompleteSchema = z.object({
  slot: z.string().trim().min(1).max(120),
  storageKey: z.string().trim().min(1).max(300),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().trim().min(3).max(120),
  /* Obrigatório: quem usa leitor de tela não tem outra descrição da foto, e
     deixar opcional garante que ninguém preencha. */
  alt: z.string().trim().min(3).max(200),
})

router.post('/admin/images', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = imageCompleteSchema.parse(req.body)
    const target = IMAGE_TARGETS[body.slot]
    if (!target) throw new AppError(`Slot de imagem desconhecido: ${body.slot}`, 400, 'UNKNOWN_SLOT')

    /* O recorte acontece no navegador. Conferir aqui é o que impede que um
       upload feito por fora do painel entregue uma imagem fora de proporção —
       o layout do site depende da razão de aspecto, não só do tamanho. */
    if (body.width !== target.width || body.height !== target.height) {
      throw new AppError(
        `Esta imagem precisa ter ${target.width}×${target.height}px; recebida ${body.width}×${body.height}px.`,
        400,
        'WRONG_DIMENSIONS',
      )
    }

    const tenantId = req.user!.tenantId
    const image = await prisma.landingImage.upsert({
      where: { slot_tenantId: { slot: body.slot, tenantId } },
      update: {
        storageKey: body.storageKey,
        width: body.width,
        height: body.height,
        sizeBytes: body.sizeBytes,
        mimeType: body.mimeType,
        alt: body.alt,
      },
      create: { ...body, tenantId },
    })

    await audit(req, 'CREATE', 'landingImage', image.id, { slot: body.slot })
    res.status(201).json({ ...image, url: publicFileUrl(image.storageKey) })
  } catch (err) {
    next(err)
  }
})

router.delete('/admin/images/:slot', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slot = String(req.params.slot)
    const tenantId = req.user!.tenantId
    const existing = await prisma.landingImage.findUnique({ where: { slot_tenantId: { slot, tenantId } } })
    if (!existing) throw new NotFoundError('Imagem')

    await prisma.landingImage.delete({ where: { id: existing.id } })
    await audit(req, 'DELETE', 'landingImage', existing.id, { slot })
    res.json({ slot })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Aplicativos instaláveis
// ─────────────────────────────────────────────────────────────────────────────

/** A configuração gravada, ou o padrão quando a clínica nunca editou. */
async function carregarPwa(tenantId: string) {
  const linha = await prisma.clinicSetting.findUnique({
    where: { key_tenantId: { key: PWA_SETTING_KEY, tenantId } },
  })
  /* Conteúdo gravado por uma versão antiga do schema pode não bater mais; aí
     o padrão vale, para o app não perder o manifesto por dado velho. */
  const parsed = linha ? pwaSettingsSchema.safeParse(linha.value) : null
  return parsed?.success ? parsed.data : PWA_DEFAULTS
}

/** As URLs dos ícones de um app, pelos slots que o painel enviou. */
async function iconesDe(app: PwaAppId, tenantId: string) {
  const prefixo = PWA_APPS[app].slotPrefix
  const linhas = await prisma.landingImage.findMany({
    where: { tenantId, slot: { startsWith: `${prefixo}.` } },
  })
  return Object.fromEntries(
    linhas.map((linha: { slot: string; storageKey: string }) => [
      linha.slot.slice(prefixo.length + 1),
      publicFileUrl(linha.storageKey),
    ]),
  ) as Partial<Record<string, string>>
}

/**
 * O manifesto que o navegador lê.
 *
 * Público de propósito: quem instala o app da paciente ainda não fez login, e
 * o navegador busca este arquivo sem enviar credencial nenhuma.
 */
router.get('/manifest/:app.webmanifest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const app = String(req.params.app) as PwaAppId
    if (!PWA_APPS[app]) throw new NotFoundError('Aplicativo')

    const slug = typeof req.query.tenantSlug === 'string' ? req.query.tenantSlug : undefined
    const tenant = slug
      ? await prisma.tenant.findUnique({ where: { slug } })
      : await prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
    if (!tenant) throw new NotFoundError('Clinica')

    const [config, icones] = await Promise.all([carregarPwa(tenant.id), iconesDe(app, tenant.id)])

    /* O tipo do manifesto importa: com `application/json` alguns navegadores
       aceitam, mas o Chrome só reconhece o arquivo como manifesto com este. */
    res.type('application/manifest+json')
    /* Cache curto: a clínica troca o nome e quer ver o efeito, mas cada aba
       aberta não precisa buscar de novo a cada navegação. */
    res.set('Cache-Control', 'public, max-age=300')
    res.json(montarManifesto(app, config[app], icones))
  } catch (err) {
    next(err)
  }
})

/** A configuração para a tela do painel, com os ícones já enviados. */
router.get('/admin/pwa', ...staffOnly, requirePermission('CMS_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const [config, admin, patient] = await Promise.all([
      carregarPwa(tenantId),
      iconesDe('admin', tenantId),
      iconesDe('patient', tenantId),
    ])
    res.json({ config, icons: { admin, patient }, defaults: PWA_DEFAULTS })
  } catch (err) {
    next(err)
  }
})

router.put('/admin/pwa', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = pwaSettingsSchema.parse(req.body)
    const tenantId = req.user!.tenantId
    const linha = await prisma.clinicSetting.upsert({
      where: { key_tenantId: { key: PWA_SETTING_KEY, tenantId } },
      create: { key: PWA_SETTING_KEY, value: body, tenantId },
      update: { value: body },
    })
    await audit(req, 'UPDATE', 'pwaSettings', linha.id, {})
    res.json({ config: body })
  } catch (err) {
    next(err)
  }
})

/** Volta ao manifesto de fábrica — os ícones enviados continuam. */
router.delete('/admin/pwa', ...staffOnly, requirePermission('CMS_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    await prisma.clinicSetting
      .delete({ where: { key_tenantId: { key: PWA_SETTING_KEY, tenantId } } })
      .catch(() => null)
    await audit(req, 'DELETE', 'pwaSettings', tenantId, {})
    res.json({ config: PWA_DEFAULTS })
  } catch (err) {
    next(err)
  }
})

export default router
