import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma, AppointmentStatus } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { AppError, NotFoundError } from '../lib/errors'
import { audit } from '../lib/audit'
import { sendPatientPush } from '../lib/push'
import {
  addDaysISO,
  checkSlotAvailable,
  getAvailability,
  resolveEndsAt,
  utcToClinicDate,
} from '../lib/scheduling'
import { buildWhatsAppLink, stripWhatsAppMarkup, type MessageKind } from '../lib/whatsapp'
import { sendMail } from '../lib/mailer'

const router = Router()

const APPOINTMENT_INCLUDE = {
  procedure: { select: { id: true, title: true, number: true, durationMin: true } },
  patient: { select: { id: true, name: true, email: true, phone: true } },
  confirmedBy: { select: { id: true, name: true } },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone deve ter ao menos 8 caracteres'),
  procedure: z.string().optional(), // título ou id
  message: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  tenantSlug: z.string().min(1, 'tenantSlug é obrigatório'),
})

const updateSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  message: z.string().optional(),
  cancelReason: z.string().optional(),
})

const listQuerySchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  /** Recorte por data agendada — usado pela visão de agenda */
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
})

const availabilityQuerySchema = z.object({
  tenantSlug: z.string().min(1),
  procedureId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(60).optional().default(14),
  ignoreAppointmentId: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function resolveTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant || !tenant.isActive) {
    throw new AppError('Clínica não encontrada', 404, 'TENANT_NOT_FOUND')
  }
  return tenant
}

/**
 * Avisa a paciente pelos canais internos (registro + push) e devolve o link de
 * WhatsApp para a equipe disparar em paralelo.
 */
async function notifyPatient(
  appointment: {
    id: string
    tenantId: string
    name: string
    email: string | null
    phone: string
    patientId: string | null
    scheduledAt: Date | null
    procedure?: { title: string } | null
  },
  tenant: { name: string; address: string | null },
  kind: MessageKind,
  reason?: string | null,
) {
  const titles: Record<MessageKind, string> = {
    confirmed: 'Consulta confirmada',
    rescheduled: 'Consulta remarcada',
    cancelled: 'Consulta cancelada',
    reminder: 'Lembrete de consulta',
  }

  const whatsapp = buildWhatsAppLink(kind, {
    patientName: appointment.name,
    phone: appointment.phone,
    procedureTitle: appointment.procedure?.title ?? null,
    scheduledAt: appointment.scheduledAt,
    clinicName: tenant.name,
    clinicAddress: tenant.address,
    reason,
  })

  // E-mail é o único canal que alcança quem agendou pela landing sem cadastro:
  // notificação e push exigem `patientId`, e o WhatsApp depende de alguém da
  // equipe clicar no link. Sem isto a paciente só descobre a confirmação se a
  // clínica lembrar de avisar.
  if (appointment.email) {
    await sendMail({
      to: appointment.email,
      subject: titles[kind],
      body: stripWhatsAppMarkup(whatsapp.message),
    })
  }

  // Sem cadastro de paciente (lead da landing) não há painel para notificar
  if (appointment.patientId) {
    // A mensagem do WhatsApp já está em texto corrido — reaproveita como corpo
    await prisma.notification.create({
      data: {
        tenantId: appointment.tenantId,
        patientId: appointment.patientId,
        title: titles[kind],
        // Sem a marcação do WhatsApp: no portal os asteriscos apareceriam crus
        body: stripWhatsAppMarkup(whatsapp.message),
        channel: 'IN_APP',
      },
    })

    await sendPatientPush(appointment.patientId, {
      title: titles[kind],
      body: whatsapp.message.split('\n\n')[1] ?? titles[kind],
      url: '/paciente/',
    }).catch(() => undefined)
  }

  return whatsapp
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /availability  (público — a landing precisa antes do cadastro)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = availabilityQuerySchema.parse(req.query)
    const tenant = await resolveTenantBySlug(query.tenantSlug)

    const fromDate = query.from ?? utcToClinicDate(new Date())

    const availability = await getAvailability({
      tenantId: tenant.id,
      procedureId: query.procedureId ?? null,
      fromDate,
      days: query.days,
      ignoreAppointmentId: query.ignoreAppointmentId,
    })

    res.json({ from: fromDate, to: addDaysISO(fromDate, query.days - 1), days: availability })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /  (público — formulário da landing)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body)
    const tenant = await resolveTenantBySlug(body.tenantSlug)

    let procedureId: string | undefined
    if (body.procedure) {
      const procedure = await prisma.procedure.findFirst({
        where: {
          tenantId: tenant.id,
          isActive: true,
          OR: [{ id: body.procedure }, { title: { equals: body.procedure, mode: 'insensitive' } }],
        },
      })
      procedureId = procedure?.id
    }

    // Horário é opcional: a paciente pode só pedir contato
    let scheduledAt: Date | null = null
    let endsAt: Date | null = null

    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt)
      const check = await checkSlotAvailable({
        tenantId: tenant.id,
        startsAt: scheduledAt,
        procedureId,
      })
      if (!check.ok) {
        throw new AppError(check.reason!, 409, 'SLOT_UNAVAILABLE')
      }
      endsAt = await resolveEndsAt(tenant.id, scheduledAt, procedureId)
    }

    // Vincula a uma paciente já cadastrada com o mesmo e-mail, se houver
    const existingPatient = await prisma.patient.findFirst({
      where: { tenantId: tenant.id, email: body.email },
      select: { id: true },
    })

    const appointment = await prisma.appointment.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
        tenantId: tenant.id,
        procedureId: procedureId ?? null,
        patientId: existingPatient?.id ?? null,
        scheduledAt,
        endsAt,
        status: 'PENDING',
        source: 'landing',
      },
      include: APPOINTMENT_INCLUDE,
    })

    // Quem pede horário pela landing fica sem resposta até a equipe confirmar.
    // Este aviso fecha o ciclo na hora: diz que chegou e o que acontece agora.
    if (appointment.email) {
      const quando = appointment.scheduledAt
        ? 'Você receberá a confirmação da data e do horário assim que a equipe validar a agenda.'
        : 'A equipe entrará em contato para combinar a data e o horário.'

      await sendMail({
        to: appointment.email,
        subject: 'Recebemos o seu pedido de agendamento',
        body: `Olá, ${appointment.name}.\n\nRecebemos o seu pedido${appointment.procedure?.title ? ` de ${appointment.procedure.title}` : ''}. ${quando}\n\nSe precisar mudar alguma coisa, é só responder ao contato da clínica.`,
      })
    }

    res.status(201).json(appointment)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /staff  (equipe) — marca por telefone/balcão, já confirmado
// ─────────────────────────────────────────────────────────────────────────────

const staffCreateSchema = z.object({
  /** Paciente já cadastrada; quando ausente, usa os dados avulsos abaixo */
  patientId: z.string().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  procedureId: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  message: z.string().optional(),
  /** A recepção normalmente já marca confirmado; PENDING fica para triagem */
  status: z.enum(['PENDING', 'CONFIRMED']).optional().default('CONFIRMED'),
})

router.post('/staff', authenticate, requireStaff, requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = staffCreateSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    let patient: { id: string; name: string; email: string; phone: string | null } | null = null
    if (body.patientId) {
      patient = await prisma.patient.findFirst({
        where: { id: body.patientId, tenantId },
        select: { id: true, name: true, email: true, phone: true },
      })
      if (!patient) throw new NotFoundError('Paciente')
    }

    const name = patient?.name ?? body.name
    const email = patient?.email ?? body.email
    const phone = patient?.phone ?? body.phone ?? ''
    if (!name || !email) {
      throw new AppError('Informe a paciente ou preencha nome e e-mail.', 400, 'PATIENT_REQUIRED')
    }

    const startsAt = new Date(body.scheduledAt)
    // A equipe pode marcar fora do expediente, mas nunca sobre outro atendimento
    const check = await checkSlotAvailable({
      tenantId,
      startsAt,
      procedureId: body.procedureId,
      allowOutsideBusinessHours: true,
    })
    if (!check.ok) throw new AppError(check.reason!, 409, 'SLOT_UNAVAILABLE')

    const endsAt = await resolveEndsAt(tenantId, startsAt, body.procedureId)
    const confirmed = body.status === 'CONFIRMED'

    const appointment = await prisma.appointment.create({
      data: {
        name,
        email,
        phone,
        message: body.message,
        tenantId,
        patientId: patient?.id ?? null,
        procedureId: body.procedureId || null,
        scheduledAt: startsAt,
        endsAt,
        status: body.status,
        source: 'staff',
        confirmedAt: confirmed ? new Date() : null,
        confirmedById: confirmed && req.user!.subjectType === 'STAFF' ? req.user!.userId : null,
      },
      include: APPOINTMENT_INCLUDE,
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true },
    })

    // Avisa a paciente só quando o horário já está confirmado
    const whatsapp = confirmed
      ? await notifyPatient(appointment, tenant!, 'confirmed')
      : buildWhatsAppLink('confirmed', {
          patientName: appointment.name,
          phone: appointment.phone,
          procedureTitle: appointment.procedure?.title ?? null,
          scheduledAt: appointment.scheduledAt,
          clinicName: tenant!.name,
          clinicAddress: tenant!.address,
        })

    await audit(req, 'CREATE', 'appointment', appointment.id, { source: 'staff' })

    res.status(201).json({ appointment, whatsapp })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /  (equipe)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireStaff, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, from, to, page, limit } = listQuerySchema.parse(req.query)
    const skip = (page - 1) * limit

    const scheduledFilter =
      from || to
        ? {
            scheduledAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lt: new Date(to) } : {}),
            },
          }
        : {}

    const where = {
      tenantId: req.user!.tenantId,
      ...(status ? { status } : {}),
      ...scheduledFilter,
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        // Agenda lê por horário; pendentes sem data caem no fim
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: APPOINTMENT_INCLUDE,
      }),
      prisma.appointment.count({ where }),
    ])

    res.json({
      data: appointments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id  (equipe)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', authenticate, requireStaff, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      include: APPOINTMENT_INCLUDE,
    })
    if (!appointment) throw new NotFoundError('Agendamento')
    res.json(appointment)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/confirm  (equipe) — confirma, agenda e devolve link de WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

const confirmSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).optional(),
})

router.post('/:id/confirm', authenticate, requireStaff, requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = confirmSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId },
      include: { procedure: { select: { title: true } } },
    })
    if (!existing) throw new NotFoundError('Agendamento')

    const startsAt = body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt
    if (!startsAt) {
      throw new AppError('Defina a data e o horário antes de confirmar.', 400, 'SCHEDULE_REQUIRED')
    }

    // A equipe pode confirmar fora do expediente, mas nunca sobrepor outro atendimento
    const check = await checkSlotAvailable({
      tenantId,
      startsAt,
      procedureId: existing.procedureId,
      ignoreAppointmentId: existing.id,
      allowOutsideBusinessHours: true,
    })
    if (!check.ok) throw new AppError(check.reason!, 409, 'SLOT_UNAVAILABLE')

    const endsAt = await resolveEndsAt(tenantId, startsAt, existing.procedureId)

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: 'CONFIRMED',
        scheduledAt: startsAt,
        endsAt,
        confirmedAt: new Date(),
        confirmedById: req.user!.subjectType === 'STAFF' ? req.user!.userId : null,
        cancelledAt: null,
        cancelReason: null,
      },
      include: APPOINTMENT_INCLUDE,
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true },
    })

    const wasRescheduled =
      existing.status === 'CONFIRMED' &&
      existing.scheduledAt != null &&
      existing.scheduledAt.getTime() !== startsAt.getTime()

    const whatsapp = await notifyPatient(
      appointment,
      tenant!,
      wasRescheduled ? 'rescheduled' : 'confirmed',
    )

    await audit(req, 'UPDATE', 'appointment', appointment.id, {
      action: wasRescheduled ? 'reschedule' : 'confirm',
      scheduledAt: startsAt.toISOString(),
    })

    res.json({ appointment, whatsapp })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/cancel  (equipe)
// ─────────────────────────────────────────────────────────────────────────────

const cancelSchema = z.object({ reason: z.string().max(300).optional() })

router.post('/:id/cancel', authenticate, requireStaff, requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = cancelSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId },
    })
    if (!existing) throw new NotFoundError('Agendamento')

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: body.reason ?? null,
      },
      include: APPOINTMENT_INCLUDE,
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true },
    })

    const whatsapp = await notifyPatient(appointment, tenant!, 'cancelled', body.reason)

    await audit(req, 'UPDATE', 'appointment', appointment.id, { action: 'cancel', reason: body.reason })

    res.json({ appointment, whatsapp })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/notified  (equipe) — registra que o WhatsApp foi disparado
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:id/notified', authenticate, requireStaff, requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError('Agendamento')

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: { notifiedAt: new Date() },
      include: APPOINTMENT_INCLUDE,
    })

    res.json(appointment)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/arrival  (equipe) — a paciente chegou, ou desfaz a marcação
// ─────────────────────────────────────────────────────────────────────────────

const arrivalSchema = z.object({
  /** `false` desfaz: a recepção clicou na linha errada, ou a paciente foi embora. */
  arrived: z.boolean().optional().default(true),
})

router.post('/:id/arrival', authenticate, requireStaff, requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { arrived } = arrivalSchema.parse(req.body)
    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      select: { id: true, status: true },
    })
    if (!existing) throw new NotFoundError('Agendamento')

    /* Quem chega está, na prática, confirmado — está ali. Deixar como
       "pendente" faria a consulta continuar na lista de quem a recepção ainda
       precisa ligar, com a paciente sentada na sala de espera. */
    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        arrivedAt: arrived ? new Date() : null,
        ...(arrived && existing.status === 'PENDING'
          ? { status: 'CONFIRMED' as const, confirmedAt: new Date(), confirmedById: req.user!.userId }
          : {}),
      },
      include: APPOINTMENT_INCLUDE,
    })

    await audit(req, 'UPDATE', 'appointment', appointment.id, { arrived })
    res.json(appointment)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id/whatsapp  (equipe) — regera o link sem alterar o agendamento
// ─────────────────────────────────────────────────────────────────────────────

const whatsappQuerySchema = z.object({
  kind: z.enum(['confirmed', 'rescheduled', 'cancelled', 'reminder']).optional().default('reminder'),
})

router.get('/:id/whatsapp', authenticate, requireStaff, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { kind } = whatsappQuerySchema.parse(req.query)

    const appointment = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      include: { procedure: { select: { title: true } } },
    })
    if (!appointment) throw new NotFoundError('Agendamento')

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      select: { name: true, address: true },
    })

    const whatsapp = buildWhatsAppLink(kind, {
      patientName: appointment.name,
      phone: appointment.phone,
      procedureTitle: appointment.procedure?.title ?? null,
      scheduledAt: appointment.scheduledAt,
      clinicName: tenant!.name,
      clinicAddress: tenant!.address,
      reason: appointment.cancelReason,
    })

    res.json(whatsapp)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/link-patient  (equipe) — liga o agendamento a uma paciente
// ─────────────────────────────────────────────────────────────────────────────

const linkPatientSchema = z.object({
  /** Paciente existente; ausente, cadastra a partir dos dados do agendamento */
  patientId: z.string().optional(),
})

/**
 * Pedido vindo da landing nasce sem `patientId` quando ainda não existe
 * cadastro com aquele e-mail. Sem este vínculo o atendimento não abre, e não
 * havia como criá-lo depois — o agendamento ficava num beco sem saída.
 */
router.post('/:id/link-patient', authenticate, requireStaff, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = linkPatientSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId },
    })
    if (!existing) throw new NotFoundError('Agendamento')
    if (existing.patientId) {
      throw new AppError('Este agendamento já está vinculado a uma paciente.', 409, 'ALREADY_LINKED')
    }

    let patient
    if (body.patientId) {
      patient = await prisma.patient.findFirst({
        where: { id: body.patientId, tenantId },
      })
      if (!patient) throw new NotFoundError('Paciente')
    } else {
      // Reaproveita cadastro com o mesmo e-mail; senão, cria a partir do pedido
      patient = await prisma.patient.upsert({
        where: { email_tenantId: { email: existing.email, tenantId } },
        update: {},
        create: {
          name: existing.name,
          email: existing.email,
          phone: existing.phone || null,
          tenantId,
        },
      })
    }

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: { patientId: patient.id },
      include: APPOINTMENT_INCLUDE,
    })

    await audit(req, 'UPDATE', 'appointment', appointment.id, {
      action: 'link-patient',
      patientId: patient.id,
    })

    res.json({ appointment, patient })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /:id  (admin) — edição direta; mantido para compatibilidade
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/:id', authenticate, requireStaff, requirePermission('APPOINTMENT_WRITE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const existing = await prisma.appointment.findFirst({
      where: { id: String(req.params.id), tenantId },
    })
    if (!existing) throw new NotFoundError('Agendamento')

    const data: Record<string, unknown> = {}

    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt === null) {
        data.scheduledAt = null
        data.endsAt = null
      } else {
        const startsAt = new Date(body.scheduledAt)
        const check = await checkSlotAvailable({
          tenantId,
          startsAt,
          procedureId: existing.procedureId,
          ignoreAppointmentId: existing.id,
          allowOutsideBusinessHours: true,
        })
        if (!check.ok) throw new AppError(check.reason!, 409, 'SLOT_UNAVAILABLE')
        data.scheduledAt = startsAt
        data.endsAt = await resolveEndsAt(tenantId, startsAt, existing.procedureId)
      }
    }

    if (body.status !== undefined) data.status = body.status
    if (body.message !== undefined) data.message = body.message
    if (body.cancelReason !== undefined) data.cancelReason = body.cancelReason

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data,
      include: APPOINTMENT_INCLUDE,
    })

    await audit(req, 'UPDATE', 'appointment', appointment.id, data)

    res.json(appointment)
  } catch (err) {
    next(err)
  }
})

export default router
