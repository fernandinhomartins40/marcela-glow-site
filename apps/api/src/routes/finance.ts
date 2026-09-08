import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requireAnyPermission, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { clinicTimeToUtc, utcToClinicDate } from '../lib/scheduling'

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
router.get('/', ...staffOnly, requireAnyPermission('FINANCE_OPERATE', 'FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/charges', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
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

router.patch('/charges/:id', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/charges/:id/cancel', ...staffOnly, requirePermission('FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/charges/:id/payments', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
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

router.delete('/payments/:id', ...staffOnly, requirePermission('FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/charges/:id/receipt', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/receipts/:id/cancel', ...staffOnly, requirePermission('FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/receipts', ...staffOnly, requireAnyPermission('FINANCE_OPERATE', 'FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Caixa do dia
//
// O sistema sempre soube quanto foi recebido — a soma dos pagamentos. O que
// faltava era a outra metade da conferência: quanto a secretária conta na
// gaveta ao fim do expediente. A diferença entre as duas é o que revela troco
// errado, lançamento esquecido ou furo, e é a razão de o fechamento existir.
// ─────────────────────────────────────────────────────────────────────────────

/** Meia-noite do dia da clínica, em UTC — a chave do caixa. */
function diaDoCaixa(iso?: string): Date {
  const dia = iso ?? utcToClinicDate(new Date())
  return clinicTimeToUtc(dia, '00:00')
}

/** Quanto entrou no dia, por meio de pagamento. */
async function totaisDoDia(tenantId: string, dia: Date) {
  const fim = new Date(dia)
  fim.setUTCDate(fim.getUTCDate() + 1)

  const pagamentos = await prisma.payment.findMany({
    where: { tenantId, paidAt: { gte: dia, lt: fim } },
    select: { amountCents: true, method: true },
  })

  const porMeio: Record<string, number> = {}
  for (const pagamento of pagamentos) {
    porMeio[pagamento.method] = (porMeio[pagamento.method] ?? 0) + pagamento.amountCents
  }

  return {
    porMeio,
    /* Só dinheiro entra na conferência da gaveta: cartão e Pix se conferem pelo
       extrato, não pela contagem. */
    dinheiroCents: porMeio.CASH ?? 0,
    totalCents: pagamentos.reduce((soma, pagamento) => soma + pagamento.amountCents, 0),
    quantidade: pagamentos.length,
  }
}

/** Quem supervisiona vê o esperado a qualquer momento; quem conta, não. */
function supervisiona(req: Request): boolean {
  return (
    req.user!.role === 'ADMIN' || (req.user!.permissions ?? []).includes('FINANCE_MANAGE')
  )
}

/**
 * GET /cash — o caixa de um dia.
 *
 * A resposta esconde o esperado em dinheiro enquanto o caixa está aberto: a
 * contagem é cega de propósito. Mostrar o valor antes transformaria a
 * conferência em confirmação, e um furo passaria sem ninguém notar.
 */
router.get('/cash', ...staffOnly, requireAnyPermission('FINANCE_OPERATE', 'FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const dia = diaDoCaixa(req.query.dia ? String(req.query.dia) : undefined)
    const totais = await totaisDoDia(tenantId, dia)

    const sessao = await prisma.cashSession.findUnique({
      where: { tenantId_date: { tenantId, date: dia } },
      include: {
        closedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    })

    const fechado = sessao?.status === 'CLOSED' || sessao?.status === 'APPROVED'

    res.json({
      dia: utcToClinicDate(dia),
      sessao,
      recebido: {
        totalCents: totais.totalCents,
        quantidade: totais.quantidade,
        porMeio: totais.porMeio,
      },
      esperadoDinheiroCents:
        fechado || supervisiona(req) ? (sessao?.openingCents ?? 0) + totais.dinheiroCents : null,
    })
  } catch (err) {
    next(err)
  }
})

const aberturaSchema = z.object({
  dia: z.string().optional(),
  openingCents: z.number().int().min(0).max(100000000).optional().default(0),
})

/** POST /cash/open — registra o troco inicial da gaveta. */
router.post('/cash/open', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = aberturaSchema.parse(req.body)
    const tenantId = req.user!.tenantId
    const dia = diaDoCaixa(body.dia)

    const existente = await prisma.cashSession.findUnique({
      where: { tenantId_date: { tenantId, date: dia } },
    })
    if (existente && existente.status !== 'OPEN') {
      throw new AppError('Este caixa já foi fechado.', 409, 'CASH_CLOSED')
    }

    const sessao = existente
      ? await prisma.cashSession.update({
          where: { id: existente.id },
          data: { openingCents: body.openingCents },
        })
      : await prisma.cashSession.create({
          data: { tenantId, date: dia, openingCents: body.openingCents },
        })

    await audit(req, 'CREATE', 'cashSession', sessao.id, { opening: body.openingCents })
    res.status(201).json(sessao)
  } catch (err) {
    next(err)
  }
})

const fechamentoSchema = z.object({
  dia: z.string().optional(),
  /** O que a secretária contou na gaveta. */
  countedCashCents: z.number().int().min(0).max(100000000),
  notes: z.string().trim().max(1000).optional(),
})

/**
 * POST /cash/close — a secretária conta e fecha.
 *
 * Os totais são congelados aqui. Um pagamento lançado com data retroativa
 * depois disso não pode reescrever a conferência que já foi feita: a diferença
 * registrada é a que existia no momento da contagem.
 */
router.post('/cash/close', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = fechamentoSchema.parse(req.body)
    const tenantId = req.user!.tenantId
    const dia = diaDoCaixa(body.dia)
    const totais = await totaisDoDia(tenantId, dia)

    const existente = await prisma.cashSession.findUnique({
      where: { tenantId_date: { tenantId, date: dia } },
    })
    if (existente && existente.status !== 'OPEN') {
      throw new AppError('Este caixa já foi fechado.', 409, 'CASH_CLOSED')
    }

    const abertura = existente?.openingCents ?? 0
    const esperado = abertura + totais.dinheiroCents
    const dados = {
      status: 'CLOSED' as const,
      countedCashCents: body.countedCashCents,
      expectedCashCents: esperado,
      differenceCents: body.countedCashCents - esperado,
      totalReceivedCents: totais.totalCents,
      notes: body.notes,
      closedAt: new Date(),
      closedById: req.user!.userId,
    }

    const sessao = existente
      ? await prisma.cashSession.update({ where: { id: existente.id }, data: dados })
      : await prisma.cashSession.create({
          data: { tenantId, date: dia, openingCents: 0, ...dados },
        })

    await audit(req, 'UPDATE', 'cashSession', sessao.id, { difference: sessao.differenceCents })
    res.json(sessao)
  } catch (err) {
    next(err)
  }
})

const aprovacaoSchema = z.object({
  reviewNotes: z.string().trim().max(1000).optional(),
})

/** POST /cash/:id/approve — a médica confere e aprova. */
router.post('/cash/:id/approve', ...staffOnly, requirePermission('FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = aprovacaoSchema.parse(req.body)
    const sessao = await prisma.cashSession.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
    })
    if (!sessao) throw new NotFoundError('Caixa')
    if (sessao.status !== 'CLOSED') {
      throw new AppError('Só um caixa fechado pode ser aprovado.', 409, 'CASH_NOT_CLOSED')
    }

    const atualizada = await prisma.cashSession.update({
      where: { id: sessao.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user!.userId,
        reviewNotes: body.reviewNotes,
      },
    })

    await audit(req, 'UPDATE', 'cashSession', atualizada.id, { approved: true })
    res.json(atualizada)
  } catch (err) {
    next(err)
  }
})

/** GET /cash/history — os fechamentos do período, para a médica acompanhar. */
router.get('/cash/history', ...staffOnly, requirePermission('FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessoes = await prisma.cashSession.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(req.query.pendentes === '1' ? { status: 'CLOSED' as const } : {}),
      },
      include: {
        closedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 90,
    })
    res.json(sessoes)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// O que cobrar no balcão
//
// A recepção só via "Receber" quando já existia cobrança lançada — e a cobrança
// só nasce quando a médica registra o procedimento, depois do atendimento. A
// paciente chegava, saía, e nunca havia o que cobrar.
//
// Esta rota responde a pergunta do balcão: das pacientes de hoje, quem deve, e
// quanto. O valor vem do plano de tratamento (preço da sessão × quantas faltam)
// mesmo antes de existir cobrança, para a secretária poder receber na chegada.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/pending-today', ...staffOnly, requireAnyPermission('FINANCE_OPERATE', 'FINANCE_MANAGE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId
    const dia = diaDoCaixa(req.query.dia ? String(req.query.dia) : undefined)
    const fim = new Date(dia)
    fim.setUTCDate(fim.getUTCDate() + 1)

    const consultas = await prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: dia, lt: fim },
        status: { notIn: ['CANCELLED'] },
        patientId: { not: null },
      },
      select: {
        id: true,
        patientId: true,
        procedureId: true,
        procedure: { select: { title: true, priceCents: true } },
      },
    })

    const pacientes = [...new Set(consultas.map((c) => c.patientId!))]
    if (pacientes.length === 0) {
      res.json({ dia: utcToClinicDate(dia), pendencias: [] })
      return
    }

    const [planos, cobrancas] = await Promise.all([
      prisma.treatmentPlan.findMany({
        where: { tenantId, patientId: { in: pacientes }, status: { in: ['ACTIVE', 'PAUSED'] } },
        include: {
          _count: { select: { sessions: true } },
          charges: {
            where: { status: { notIn: ['CANCELLED'] } },
            select: { id: true, status: true, coversPlan: true, amountCents: true },
          },
        },
      }),
      prisma.charge.findMany({
        where: { tenantId, patientId: { in: pacientes }, status: { in: ['PENDING', 'PARTIAL'] } },
        select: {
          id: true,
          patientId: true,
          planId: true,
          description: true,
          amountCents: true,
          discountCents: true,
          status: true,
          payments: { select: { amountCents: true } },
        },
      }),
    ])

    const pendencias = consultas.map((consulta) => {
      /* A cobrança já lançada tem precedência: se a médica registrou o
         procedimento, o valor dela é o que vale — inclui desconto e ajuste que
         a tabela não sabe. */
      const abertas = cobrancas.filter((c) => c.patientId === consulta.patientId)
      const emAberto = abertas.map((c) => ({
        id: c.id,
        descricao: c.description,
        restanteCents:
          c.amountCents -
          c.discountCents -
          c.payments.reduce((soma, p) => soma + p.amountCents, 0),
      }))

      /* O plano do procedimento desta consulta: é o que permite oferecer
         "pagar o pacote" antes de existir cobrança nenhuma. */
      const plano = planos.find(
        (p) => p.patientId === consulta.patientId && p.procedureId === consulta.procedureId,
      )

      const pacoteQuitado = plano?.charges.some((c) => c.coversPlan && c.status === 'PAID') ?? false
      const precoSessao = plano?.sessionPriceCents ?? consulta.procedure?.priceCents ?? null
      const restantes = plano ? Math.max(plano.totalSessions - plano._count.sessions, 0) : 0

      return {
        appointmentId: consulta.id,
        patientId: consulta.patientId,
        emAberto,
        totalEmAbertoCents: emAberto.reduce((soma, c) => soma + Math.max(c.restanteCents, 0), 0),
        plano: plano
          ? {
              id: plano.id,
              titulo: plano.title,
              feitas: plano._count.sessions,
              total: plano.totalSessions,
              restantes,
              precoSessaoCents: precoSessao,
              /* O pacote cobra o que falta, não o plano inteiro: quem já fez
                 duas de cinco não deve pagar as duas de novo. */
              precoPacoteCents: precoSessao ? precoSessao * Math.max(restantes, 1) : null,
              quitado: pacoteQuitado,
            }
          : null,
        precoAvulsoCents: precoSessao,
      }
    })

    res.json({ dia: utcToClinicDate(dia), pendencias })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /receive — cobrar e receber no balcão, num gesto
//
// A secretária não deveria precisar lançar a cobrança e depois registrar o
// pagamento: no balcão isso é uma coisa só, com a paciente esperando. A rota
// cria a cobrança quando ela ainda não existe e registra o pagamento junto.
// ─────────────────────────────────────────────────────────────────────────────

const receberSchema = z.object({
  patientId: z.string().min(1),
  /** Cobrança já lançada. Ausente, uma nova é criada. */
  chargeId: z.string().optional(),
  /** O plano sendo pago, quando a cobrança nasce aqui. */
  planId: z.string().optional(),
  /** `true` quita o pacote inteiro; `false` cobra só a sessão do dia. */
  coversPlan: z.boolean().optional().default(false),
  amountCents: z.number().int().min(1).max(100000000),
  discountCents: z.number().int().min(0).max(100000000).optional().default(0),
  method: z.enum(['PIX', 'CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'HEALTH_PLAN', 'OTHER']),
  description: z.string().trim().max(200).optional(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
})

router.post('/receive', ...staffOnly, requirePermission('FINANCE_OPERATE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = receberSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const paciente = await prisma.patient.findFirst({
      where: { id: body.patientId, tenantId },
      select: { id: true, name: true },
    })
    if (!paciente) throw new NotFoundError('Paciente')

    let charge = body.chargeId
      ? await prisma.charge.findFirst({
          where: { id: body.chargeId, tenantId },
          include: { payments: true },
        })
      : null

    if (body.chargeId && !charge) throw new NotFoundError('Cobranca')
    if (charge?.status === 'CANCELLED') {
      throw new AppError('Esta cobrança está cancelada.', 400, 'CHARGE_CANCELLED')
    }

    /* Cobrança nova: o balcão está recebendo antes de a médica registrar o
       procedimento, que é o caso de quem paga na chegada. */
    if (!charge) {
      const plano = body.planId
        ? await prisma.treatmentPlan.findFirst({
            where: { id: body.planId, tenantId, patientId: paciente.id },
            select: { id: true, title: true },
          })
        : null
      if (body.planId && !plano) throw new NotFoundError('Plano de tratamento')

      const descricao =
        body.description?.trim() ||
        (plano
          ? body.coversPlan
            ? `${plano.title} — pacote`
            : `${plano.title} — sessão`
          : 'Atendimento')

      charge = await prisma.charge.create({
        data: {
          tenantId,
          patientId: paciente.id,
          planId: plano?.id,
          coversPlan: body.coversPlan,
          description: descricao,
          amountCents: body.amountCents + body.discountCents,
          discountCents: body.discountCents,
          createdById: req.user!.userId,
        },
        include: { payments: true },
      })
      await audit(req, 'CREATE', 'charge', charge.id, { origem: 'balcao', coversPlan: body.coversPlan })
    }

    const jaPago = charge.payments.reduce((soma, pagamento) => soma + pagamento.amountCents, 0)
    const devido = charge.amountCents - charge.discountCents
    if (jaPago + body.amountCents > devido) {
      throw new AppError(
        `Esta cobrança tem ${((devido - jaPago) / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })} em aberto.`,
        400,
        'PAYMENT_EXCEEDS',
      )
    }

    await prisma.payment.create({
      data: {
        tenantId,
        chargeId: charge.id,
        amountCents: body.amountCents,
        method: body.method,
        reference: body.reference,
        notes: body.notes,
        createdById: req.user!.userId,
      },
    })

    /* Pago por inteiro fecha a cobrança; parcial fica `PARTIAL` para o balcão
       saber que ainda falta algo sem tratar como dívida nova. */
    /* O status sai do helper que o resto do arquivo usa: duplicar a regra aqui
       criaria dois lugares para corrigir quando ela mudar. */
    const { status } = situacao(charge.amountCents, charge.discountCents, jaPago + body.amountCents)
    const atualizada = await prisma.charge.update({
      where: { id: charge.id },
      data: { status },
      include: { payments: { orderBy: { paidAt: 'asc' } } },
    })

    await audit(req, 'UPDATE', 'charge', charge.id, { pago: body.amountCents, status })
    res.status(201).json(atualizada)
  } catch (err) {
    next(err)
  }
})

export default router
