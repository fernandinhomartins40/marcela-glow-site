import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'

/**
 * Planos de tratamento — a jornada da paciente.
 *
 * `ProcedureSession` era uma lista solta: respondia "o que já foi feito" e nada
 * mais. Nem a médica sabia quantas sessões faltavam, nem a paciente via a
 * própria evolução. Procedimento estético raramente é evento único, e o número
 * de sessões muda de pessoa para pessoa.
 *
 * O plano guarda três coisas que a sessão sozinha não comportava: **quantas**
 * sessões o caso pede, **o que é específico daquela paciente** (área, produto,
 * dose — os campos que o procedimento declarou), e **as orientações** de antes e
 * depois.
 */

const router = Router()
const staffOnly = [authenticate, requireStaff]

/** Um campo que o procedimento pede — a forma, não o conteúdo. */
const campoSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  hint: z.string().trim().max(160).optional(),
})

const planSchema = z.object({
  patientId: z.string().min(1),
  procedureId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(120),
  totalSessions: z.number().int().min(1).max(60),
  intervalDays: z.number().int().min(1).max(365).nullable().optional(),
  /* Chave e valor livres: a forma vem de `Procedure.fieldSchema`, e validar a
     estrutura aqui obrigaria a manter as duas em sincronia — o que quebraria
     todo plano antigo sempre que a clínica editasse os campos. */
  details: z.record(z.string().trim().max(400)).optional(),
  careBefore: z.string().trim().max(2000).optional(),
  careAfter: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
})

/** Quantas sessões já aconteceram e o que isso diz sobre o plano. */
function progresso(total: number, feitas: number) {
  return {
    feitas,
    total,
    restantes: Math.max(total - feitas, 0),
    percentual: total > 0 ? Math.round((feitas / total) * 100) : 0,
    concluido: feitas >= total,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', ...staffOnly, requirePermission('RECORD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planos = await prisma.treatmentPlan.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(req.query.patientId ? { patientId: String(req.query.patientId) } : {}),
        ...(req.query.status ? { status: String(req.query.status) as never } : {}),
      },
      include: {
        patient: { select: { id: true, name: true } },
        procedure: { select: { id: true, title: true, fieldSchema: true } },
        sessions: { orderBy: { performedAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })

    res.json(
      planos.map((p) => ({ ...p, progresso: progresso(p.totalSessions, p.sessions.length) })),
    )
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Escrita
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = planSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const paciente = await prisma.patient.findFirst({ where: { id: body.patientId, tenantId } })
    if (!paciente) throw new NotFoundError('Paciente')

    const plano = await prisma.treatmentPlan.create({
      data: {
        tenantId,
        patientId: body.patientId,
        procedureId: body.procedureId,
        title: body.title,
        totalSessions: body.totalSessions,
        intervalDays: body.intervalDays ?? undefined,
        details: body.details ?? undefined,
        careBefore: body.careBefore,
        careAfter: body.careAfter,
        internalNotes: body.internalNotes,
        createdById: req.user!.userId,
      },
    })
    await audit(req, 'CREATE', 'treatmentPlan', plano.id, { patientId: body.patientId })
    res.status(201).json(plano)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = planSchema.partial().parse(req.body)
    const id = String(req.params.id)
    const atual = await prisma.treatmentPlan.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: { sessions: true },
    })
    if (!atual) throw new NotFoundError('Plano')

    /* Reduzir o total abaixo do que já foi feito deixaria o plano em "5 de 3".
       O erro diz o número real, para a médica saber onde pode chegar. */
    if (body.totalSessions !== undefined && body.totalSessions < atual.sessions.length) {
      throw new AppError(
        `Esta paciente já fez ${atual.sessions.length} ${atual.sessions.length === 1 ? 'sessão' : 'sessões'}.`,
        400,
        'TOTAL_TOO_LOW',
      )
    }

    const plano = await prisma.treatmentPlan.update({
      where: { id },
      data: {
        title: body.title,
        totalSessions: body.totalSessions,
        intervalDays: body.intervalDays,
        details: body.details ?? undefined,
        careBefore: body.careBefore,
        careAfter: body.careAfter,
        internalNotes: body.internalNotes,
      },
    })
    await audit(req, 'UPDATE', 'treatmentPlan', id, {})
    res.json(plano)
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
})

router.post('/:id/status', ...staffOnly, requirePermission('RECORD_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = statusSchema.parse(req.body)
    const id = String(req.params.id)
    const atual = await prisma.treatmentPlan.findFirst({ where: { id, tenantId: req.user!.tenantId } })
    if (!atual) throw new NotFoundError('Plano')

    const plano = await prisma.treatmentPlan.update({
      where: { id },
      data: {
        status,
        // Concluir carimba a data; reabrir a limpa, senão o plano ficaria
        // "em andamento" com data de conclusão no passado.
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    })
    await audit(req, 'UPDATE', 'treatmentPlan', id, { status })
    res.json(plano)
  } catch (err) {
    next(err)
  }
})

export default router
