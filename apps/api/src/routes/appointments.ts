import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma, AppointmentStatus } from '@marcela/database'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'

const router = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone deve ter ao menos 8 caracteres'),
  procedure: z.string().optional(), // title slug or procedure id
  message: z.string().optional(),
  tenantSlug: z.string().min(1, 'tenantSlug é obrigatório'),
})

const updateSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional().transform((v: string | undefined) => (v ? new Date(v) : undefined)),
  message: z.string().optional(),
})

const listQuerySchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /  (public — form submission)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body)

    const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })
    if (!tenant || !tenant.isActive) {
      throw new AppError('Clínica não encontrada', 404, 'TENANT_NOT_FOUND')
    }

    // Resolve procedure if a value was provided
    let procedureId: string | undefined
    if (body.procedure) {
      const procedure = await prisma.procedure.findFirst({
        where: {
          tenantId: tenant.id,
          isActive: true,
          OR: [
            { id: body.procedure },
            { title: { equals: body.procedure, mode: 'insensitive' } },
          ],
        },
      })
      procedureId = procedure?.id
    }

    const appointment = await prisma.appointment.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
        tenantId: tenant.id,
        procedureId: procedureId ?? null,
        status: 'PENDING',
      },
      include: {
        procedure: { select: { id: true, title: true, number: true } },
      },
    })

    res.status(201).json(appointment)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /  (authenticate)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, limit } = listQuerySchema.parse(req.query)
    const skip = (page - 1) * limit

    const where = {
      tenantId: req.user!.tenantId,
      ...(status ? { status } : {}),
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          procedure: { select: { id: true, title: true, number: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ])

    res.json({
      data: appointments,
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id  (authenticate)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        procedure: { select: { id: true, title: true, number: true } },
      },
    })

    if (!appointment) {
      throw new NotFoundError('Agendamento')
    }

    res.json(appointment)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /:id  (authenticate + requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body)

    // Verify ownership
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Agendamento')
    }

    // Build update payload — only include defined fields
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt
    if (body.message !== undefined) data.message = body.message

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: {
        procedure: { select: { id: true, title: true, number: true } },
      },
    })

    res.json(appointment)
  } catch (err) {
    next(err)
  }
})

export default router
