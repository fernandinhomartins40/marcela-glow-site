import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { Prisma, prisma } from '@marcela/database'
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
  // Base do cálculo de horários livres na agenda
  durationMin: z.number().int().min(5).max(480).optional(),
  bufferMin: z.number().int().min(0).max(120).optional(),
  isBookable: z.boolean().optional(),

  /* O que o procedimento espera de um plano de tratamento.

     Sao valores padrao, nao regras: a medica sobrescreve caso a caso, porque
     o mesmo procedimento pede numero de sessoes diferente para cada paciente.
     `fieldSchema` declara os campos que aquele procedimento tem (area,
     produto, dose) para o plano guardar os valores em JSON sem inventar
     coluna nova a cada tecnica nova. */
  defaultSessions: z.number().int().min(1).max(60).optional(),
  intervalDays: z.number().int().min(1).max(365).nullable().optional(),
  fieldSchema: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(60),
        hint: z.string().trim().max(160).optional(),
      }),
    )
    .max(20)
    .nullable()
    .optional(),
  careBefore: z.string().trim().max(2000).nullable().optional(),
  careAfter: z.string().trim().max(2000).nullable().optional(),
})

const updateSchema = createSchema.partial()

/**
 * Prepara os campos do plano para o Prisma.
 *
 * Coluna Json anulavel nao aceita `null` cru: apagar o valor exige
 * `Prisma.DbNull`. Sem esta traducao, limpar os campos de um procedimento
 * falharia em tempo de execucao com um erro que nao diz o que fazer.
 */
function comJson<T extends { fieldSchema?: unknown }>(body: T) {
  const { fieldSchema, ...resto } = body
  if (fieldSchema === undefined) return resto
  return { ...resto, fieldSchema: fieldSchema === null ? Prisma.DbNull : (fieldSchema as Prisma.InputJsonValue) }
}

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
      where: { id: String(req.params.id), tenantId: tenant.id, isActive: true },
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
        ...comJson(body),
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
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Procedimento')
    }

    const procedure = await prisma.procedure.update({
      where: { id: String(req.params.id) },
      data: comJson(body),
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
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })

    if (!existing) {
      throw new NotFoundError('Procedimento')
    }

    await prisma.procedure.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    })

    res.json({ message: 'Procedimento removido com sucesso' })
  } catch (err) {
    next(err)
  }
})

export default router
