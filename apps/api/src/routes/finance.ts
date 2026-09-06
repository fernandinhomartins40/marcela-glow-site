import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'

/**
 * Controle financeiro da clínica.
 *
 * Antes o único registro de dinheiro era `ProcedureSession.priceCents`: um
 * campo opcional que respondia "quanto foi cobrado" e mais nada. Não dizia se a
 * paciente pagou, nem permitia emitir recibo — e, por ser opcional, um
 * procedimento salvo sem valor sumia do faturamento sem aviso.
 *
 * O modelo aqui separa três coisas que o campo único misturava: a **cobrança**
 * (o que se deve), os **pagamentos** (o que entrou, possivelmente em parcelas e
 * formas diferentes) e o **recibo** (o documento entregue, com numeração que a
 * Receita espera sequencial).
 */

const router = Router()
const staffOnly = [authenticate, requireStaff]

/** O total pago de uma cobrança, e o status que isso implica. */
function situacao(amountCents: number, discountCents: number, pagoCents: number) {
  const devido = Math.max(amountCents - discountCents, 0)
  if (pagoCents <= 0) return { devido, pagoCents, status: 'PENDING' as const }
  if (pagoCents >= devido) return { devido, pagoCents, status: 'PAID' as const }
  return { devido, pagoCents, status: 'PARTIAL' as const }
}

/** Recalcula o status a partir dos pagamentos — nunca confia no que veio da tela. */
async function reavaliar(chargeId: string) {
  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
    include: { payments: true },
  })
  if (!charge) return null
  // Cobrança cancelada não volta a ficar pendente por causa de um pagamento.
  if (charge.status === 'CANCELLED') return charge

  const pago = charge.payments.reduce((soma, p) => soma + p.amountCents, 0)
  const { status } = situacao(charge.amountCents, charge.discountCents, pago)
  if (status === charge.status) return charge
  return prisma.charge.update({ where: { id: chargeId }, data: { status } })
}

// ─────────────────────────────────────────────────────────────────────────────
// Listagem e resumo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * O painel financeiro de um período.
 *
 * Devolve o resumo e a lista na mesma chamada porque a tela mostra os dois
 * juntos e separá-los faria duas viagens para desenhar uma página só.
 */
router.get('/', ...staffOnly, requirePermission('DASHBOARD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const agora = new Date()

    /* O período padrão é o mês corrente: é o recorte em que a clínica pensa, e
       carregar o histórico inteiro na abertura da tela seria lento à toa. */
    const de = req.query.de
      ? new Date(String(req.query.de))
      : new Date(agora.getFullYear(), agora.getMonth(), 1)
    const ate = req.query.ate
      ? new Date(String(req.query.ate))
      : new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999)

    const where = { tenantId, issuedAt: { gte: de, lte: ate } }

    const [charges, semValor] = await Promise.all([
      prisma.charge.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, cpf: true } },
          payments: { orderBy: { paidAt: 'asc' } },
          receipts: { where: { cancelledAt: null }, select: { id: true, number: true, year: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take: 400,
      }),
      /* Procedimento realizado sem cobrança lançada: é o furo que existia no
         modelo antigo, e a tela precisa mostrá-lo em vez de deixá-lo sumir. */
      prisma.procedureSession.count({
        where: { tenantId, performedAt: { gte: de, lte: ate }, Charge: { is: null } },
      }),
    ])

    let cobrado = 0
    let recebido = 0
    let cancelado = 0
    const porForma: Record<string, number> = {}

    for (const c of charges) {
      const pago = c.payments.reduce((s, p) => s + p.amountCents, 0)
      if (c.status === 'CANCELLED') {
        cancelado += c.amountCents - c.discountCents
        continue
      }
      cobrado += c.amountCents - c.discountCents
      recebido += pago
      for (const p of c.payments) porForma[p.method] = (porForma[p.method] ?? 0) + p.amountCents
    }

    res.json({
      periodo: { de, ate },
      resumo: {
        cobradoCents: cobrado,
        recebidoCents: recebido,
        aReceberCents: Math.max(cobrado - recebido, 0),
        canceladoCents: cancelado,
        porForma,
        procedimentosSemCobranca: semValor,
      },
      charges,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Cobranças
// ─────────────────────────────────────────────────────────────────────────────

const chargeSchema = z.object({
  patientId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  description: z.string().trim().min(2).max(200),
  amountCents: z.number().int().positive(),
  discountCents: z.number().int().min(0).default(0),
  issuedAt: z.string().datetime({ offset: true }).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(500).optional(),
})

router.post('/charges', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = chargeSchema.parse(req.body)
    if (body.discountCents > body.amountCents) {
      throw new AppError('O desconto não pode ser maior que o valor.', 400, 'DISCOUNT_TOO_BIG')
    }

    const charge = await prisma.charge.create({
      data: {
        tenantId: req.user!.tenantId,
        patientId: body.patientId,
        sessionId: body.sessionId,
        description: body.description,
        amountCents: body.amountCents,
        discountCents: body.discountCents,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        notes: body.notes,
        createdById: req.user!.userId,
      },
    })
    await audit(req, 'CREATE', 'charge', charge.id, { amountCents: charge.amountCents })
    res.status(201).json(charge)
  } catch (err) {
    next(err)
  }
})

router.patch('/charges/:id', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = chargeSchema.partial().parse(req.body)
    const id = String(req.params.id)
    const atual = await prisma.charge.findFirst({ where: { id, tenantId: req.user!.tenantId } })
    if (!atual) throw new NotFoundError('Cobranca')

    await prisma.charge.update({
      where: { id },
      data: {
        description: body.description,
        amountCents: body.amountCents,
        discountCents: body.discountCents,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        notes: body.notes,
      },
    })
    // O valor pode ter mudado, então o status precisa ser recalculado.
    const charge = await reavaliar(id)
    await audit(req, 'UPDATE', 'charge', id, {})
    res.json(charge)
  } catch (err) {
    next(err)
  }
})

/**
 * Cancelar em vez de apagar.
 *
 * Uma cobrança apagada some do histórico e o mês fechado deixa de bater com o
 * que foi declarado. Cancelada, ela continua visível e explicável.
 */
router.post('/charges/:id/cancel', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id)
    const atual = await prisma.charge.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: { receipts: { where: { cancelledAt: null } } },
    })
    if (!atual) throw new NotFoundError('Cobranca')
    if (atual.receipts.length > 0) {
      throw new AppError(
        'Esta cobrança tem recibo emitido. Cancele o recibo antes.',
        400,
        'RECEIPT_EXISTS',
      )
    }

    const charge = await prisma.charge.update({ where: { id }, data: { status: 'CANCELLED' } })
    await audit(req, 'UPDATE', 'charge', id, { cancelled: true })
    res.json(charge)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Pagamentos
// ─────────────────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(['PIX', 'CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'HEALTH_PLAN', 'OTHER']),
  paidAt: z.string().datetime({ offset: true }).optional(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(300).optional(),
})

router.post('/charges/:id/payments', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = paymentSchema.parse(req.body)
    const chargeId = String(req.params.id)
    const charge = await prisma.charge.findFirst({
      where: { id: chargeId, tenantId: req.user!.tenantId },
      include: { payments: true },
    })
    if (!charge) throw new NotFoundError('Cobranca')
    if (charge.status === 'CANCELLED') {
      throw new AppError('Esta cobrança está cancelada.', 400, 'CHARGE_CANCELLED')
    }

    /* Recebido a mais que o devido é quase sempre erro de digitação — e, quando
       não é, a clínica precisa corrigir o valor da cobrança, não empurrar a
       diferença para um pagamento que ninguém consegue explicar depois. */
    const jaPago = charge.payments.reduce((s, p) => s + p.amountCents, 0)
    const devido = charge.amountCents - charge.discountCents
    if (jaPago + body.amountCents > devido) {
      throw new AppError(
        `Esta cobrança tem ${((devido - jaPago) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em aberto.`,
        400,
        'OVERPAYMENT',
      )
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId: req.user!.tenantId,
        chargeId,
        amountCents: body.amountCents,
        method: body.method,
        paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
        reference: body.reference,
        notes: body.notes,
        createdById: req.user!.userId,
      },
    })
    await reavaliar(chargeId)
    await audit(req, 'CREATE', 'payment', payment.id, { amountCents: payment.amountCents })
    res.status(201).json(payment)
  } catch (err) {
    next(err)
  }
})

router.delete('/payments/:id', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id)
    const pagamento = await prisma.payment.findFirst({ where: { id, tenantId: req.user!.tenantId } })
    if (!pagamento) throw new NotFoundError('Pagamento')

    await prisma.payment.delete({ where: { id } })
    await reavaliar(pagamento.chargeId)
    await audit(req, 'DELETE', 'payment', id, { amountCents: pagamento.amountCents })
    res.json({ id })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Recibos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emite o recibo de uma cobrança.
 *
 * A numeração é sequencial por ano e sai dentro de uma transação: dois recibos
 * emitidos ao mesmo tempo em abas diferentes receberiam o mesmo número se o
 * cálculo ficasse fora dela, e número repetido é exatamente o que a Receita não
 * aceita.
 */
router.post('/charges/:id/receipt', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const chargeId = String(req.params.id)

    const charge = await prisma.charge.findFirst({
      where: { id: chargeId, tenantId },
      include: {
        patient: { select: { name: true, cpf: true } },
        payments: true,
        receipts: { where: { cancelledAt: null } },
      },
    })
    if (!charge) throw new NotFoundError('Cobranca')
    if (charge.status === 'CANCELLED') {
      throw new AppError('Cobrança cancelada não gera recibo.', 400, 'CHARGE_CANCELLED')
    }
    if (charge.receipts.length > 0) {
      throw new AppError('Esta cobrança já tem recibo emitido.', 400, 'RECEIPT_EXISTS')
    }

    /* Recibo é comprovante do que foi recebido: emitir por valor não pago
       colocaria no papel da médica uma declaração falsa. */
    const pago = charge.payments.reduce((s, p) => s + p.amountCents, 0)
    if (pago <= 0) {
      throw new AppError(
        'Registre o pagamento antes de emitir o recibo.',
        400,
        'NOT_PAID',
      )
    }

    const ano = new Date().getFullYear()
    const receipt = await prisma.$transaction(async (tx) => {
      const ultimo = await tx.receipt.findFirst({
        where: { tenantId, year: ano },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      return tx.receipt.create({
        data: {
          tenantId,
          chargeId,
          number: (ultimo?.number ?? 0) + 1,
          year: ano,
          // Cópia congelada: o recibo continua dizendo o que dizia mesmo que a
          // cobrança ou o cadastro da paciente mudem depois.
          patientName: charge.patient.name,
          patientCpf: charge.patient.cpf,
          description: charge.description,
          amountCents: pago,
          createdById: req.user!.userId,
        },
      })
    })

    await audit(req, 'CREATE', 'receipt', receipt.id, { number: receipt.number, year: receipt.year })
    res.status(201).json(receipt)
  } catch (err) {
    next(err)
  }
})

const cancelReceiptSchema = z.object({ reason: z.string().trim().min(3).max(300) })

router.post('/receipts/:id/cancel', ...staffOnly, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = cancelReceiptSchema.parse(req.body)
    const id = String(req.params.id)
    const atual = await prisma.receipt.findFirst({ where: { id, tenantId: req.user!.tenantId } })
    if (!atual) throw new NotFoundError('Recibo')
    if (atual.cancelledAt) throw new AppError('Este recibo já foi cancelado.', 400, 'ALREADY_CANCELLED')

    /* Cancelado, não apagado: a numeração não pode ter furo, e é o cancelamento
       que se explica à Receita se ela perguntar pelo número que falta. */
    const receipt = await prisma.receipt.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelReason: body.reason },
    })
    await audit(req, 'UPDATE', 'receipt', id, { cancelled: true })
    res.json(receipt)
  } catch (err) {
    next(err)
  }
})

/**
 * O talão do ano, para a declaração.
 *
 * Traz os cancelados junto e em ordem de número: é assim que o contador confere
 * se a sequência está inteira.
 */
router.get('/receipts', ...staffOnly, requirePermission('DASHBOARD_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear()
    const receipts = await prisma.receipt.findMany({
      where: { tenantId: req.user!.tenantId, year: ano },
      orderBy: { number: 'asc' },
    })

    const validos = receipts.filter((r) => !r.cancelledAt)
    res.json({
      ano,
      receipts,
      resumo: {
        emitidos: receipts.length,
        cancelados: receipts.length - validos.length,
        totalCents: validos.reduce((s, r) => s + r.amountCents, 0),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
