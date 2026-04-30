import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'

const router = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  authorName: z.string().min(2, 'Nome do autor deve ter ao menos 2 caracteres'),
  text: z.string().min(10, 'Depoimento deve ter ao menos 10 caracteres'),
  rating: z.number().int().min(1).max(5).default(5),
  isVisible: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
})

const updateSchema = createSchema.partial()

const tenantSlugQuery = z.object({
  tenantSlug: z.string().min(1, 'tenantSlug é obrigatório'),
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /  (public)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantSlug } = tenantSlugQuery.parse(req.query)

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant || !tenant.isActive) {
      throw new AppError('Clínica não encontrada', 404, 'TENANT_NOT_FOUND')
    }

    const testimonials = await prisma.testimonial.findMany({
      where: { tenantId: tenant.id, isVisible: true },
      orderBy: { displayOrder: 'asc' },
    })

    res.json(testimonials)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /  (authenticate + requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body)

    const testimonial = await prisma.testimonial.create({
      data: {
        ...body,
        tenantId: req.user!.tenantId,
      },
    })

    res.status(201).json(testimonial)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id  (authenticate + requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body)

    const existing = await prisma.testimonial.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Depoimento')
    }

    const testimonial = await prisma.testimonial.update({
      where: { id: String(req.params.id) },
      data: body,
    })

    res.json(testimonial)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id  (authenticate + requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.testimonial.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Depoimento')
    }

    await prisma.testimonial.delete({ where: { id: String(req.params.id) } })

    res.json({ message: 'Depoimento removido com sucesso' })
  } catch (err) {
    next(err)
  }
})

export default router
