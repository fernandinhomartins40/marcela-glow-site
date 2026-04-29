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
  number: z.string().min(1, 'number é obrigatório'),
  title: z.string().min(1, 'title é obrigatório'),
  subtitle: z.string().min(1, 'subtitle é obrigatório'),
  description: z.string().min(1, 'description é obrigatório'),
  imageUrl: z.string().url('imageUrl deve ser uma URL válida').optional(),
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

    const procedures = await prisma.procedure.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    res.json(procedures)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id  (public)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantSlug } = tenantSlugQuery.parse(req.query)

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant || !tenant.isActive) {
      throw new AppError('Clínica não encontrada', 404, 'TENANT_NOT_FOUND')
    }

    const procedure = await prisma.procedure.findFirst({
      where: { id: req.params.id, tenantId: tenant.id, isActive: true },
    })

    if (!procedure) {
      throw new NotFoundError('Procedimento')
    }

    res.json(procedure)
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

    const procedure = await prisma.procedure.create({
      data: {
        ...body,
        tenantId: req.user!.tenantId,
      },
    })

    res.status(201).json(procedure)
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

    // Verify ownership
    const existing = await prisma.procedure.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Procedimento')
    }

    const procedure = await prisma.procedure.update({
      where: { id: req.params.id },
      data: body,
    })

    res.json(procedure)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id  (authenticate + requireAdmin) — soft delete
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify ownership
    const existing = await prisma.procedure.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Procedimento')
    }

    await prisma.procedure.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })

    res.json({ message: 'Procedimento removido com sucesso' })
  } catch (err) {
    next(err)
  }
})

export default router
