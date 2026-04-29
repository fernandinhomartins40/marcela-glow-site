import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AppError } from '../lib/errors'

const router = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  email: z.string().email('E-mail inválido'),
  tenantSlug: z.string().min(1, 'tenantSlug é obrigatório'),
})

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /subscribe  (public)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, tenantSlug } = subscribeSchema.parse(req.body)

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant || !tenant.isActive) {
      throw new AppError('Clínica não encontrada', 404, 'TENANT_NOT_FOUND')
    }

    // Upsert: create if not exists, do nothing if already subscribed
    await prisma.newsletterSubscriber.upsert({
      where: { email_tenantId: { email, tenantId: tenant.id } },
      create: { email, tenantId: tenant.id },
      update: {}, // no-op — preserve original createdAt
    })

    res.json({ message: 'Inscrito com sucesso!' })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /subscribers  (authenticate + requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/subscribers', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query)
    const skip = (page - 1) * limit

    const where = { tenantId: req.user!.tenantId }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.newsletterSubscriber.count({ where }),
    ])

    res.json({
      data: subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
