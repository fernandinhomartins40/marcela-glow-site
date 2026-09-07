import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { authenticate, requirePermission, requireStaff } from '../middleware/auth'
import { NotFoundError } from '../lib/errors'
import { clinicTimeToUtc, utcToClinicDate } from '../lib/scheduling'

/**
 * Avisos entre o consultório e a recepção.
 *
 * A médica não sai do atendimento para dizer que a próxima pode entrar, e a
 * secretária não abre a porta do consultório para perguntar se dá para encaixar
 * alguém. Isso hoje acontece por voz, campainha ou bilhete — aqui vira registro,
 * com hora e autor.
 *
 * Não é um chat. Cada aviso nasce preso a um momento do dia, quase sempre a uma
 * consulta, e some quando o outro lado o marca como visto. O painel pergunta
 * "há avisos novos?" a cada poucos segundos: para o volume de um consultório,
 * isso resolve sem abrir conexão permanente nem exigir nada do nginx.
 */

const router = Router()
const staffOnly = [authenticate, requireStaff]

/** Meia-noite do dia da clínica: avisos de ontem não interessam a ninguém. */
function inicioDoDia(): Date {
  return clinicTimeToUtc(utcToClinicDate(new Date()), '00:00')
}

const ALERT_INCLUDE = {
  appointment: {
    select: { id: true, name: true, scheduledAt: true, patientId: true },
  },
  createdBy: { select: { id: true, name: true } },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// GET /  — os avisos de hoje
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', ...staffOnly, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alertas = await prisma.clinicAlert.findMany({
      where: {
        tenantId: req.user!.tenantId,
        createdAt: { gte: inicioDoDia() },
        ...(req.query.pendentes === '1' ? { seenAt: null } : {}),
      },
      include: ALERT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 60,
    })

    /* O próprio autor não precisa ser avisado do que acabou de mandar: sem
       isto o botão "pode entrar" faria o aviso piscar na tela de quem clicou. */
    const pendentes = alertas.filter((a) => !a.seenAt && a.createdById !== req.user!.userId)

    res.json({ alertas, pendentes: pendentes.length })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /  — manda um aviso
// ─────────────────────────────────────────────────────────────────────────────

const criarSchema = z.object({
  kind: z.enum(['CALL_PATIENT', 'CALL_STAFF', 'PATIENT_RELEASED', 'NEED_DOCTOR', 'NOTE']),
  appointmentId: z.string().min(1).optional(),
  body: z.string().trim().max(500).optional(),
})

router.post('/', ...staffOnly, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = criarSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    if (dados.appointmentId) {
      const consulta = await prisma.appointment.findFirst({
        where: { id: dados.appointmentId, tenantId },
        select: { id: true },
      })
      if (!consulta) throw new NotFoundError('Agendamento')
    }

    const alerta = await prisma.clinicAlert.create({
      data: {
        tenantId,
        kind: dados.kind,
        appointmentId: dados.appointmentId,
        body: dados.body,
        createdById: req.user!.userId,
      },
      include: ALERT_INCLUDE,
    })

    /* O aviso move a consulta junto.
     *
     * Chamar a paciente e registrar que ela entrou são o mesmo gesto, e dizer
     * que saiu é o que faz a cobrança aparecer na recepção. Deixar as duas
     * coisas separadas obrigaria a médica a clicar duas vezes na mesma
     * intenção — e, mais cedo ou mais tarde, a fila mostraria uma paciente que
     * já foi embora. */
    if (dados.appointmentId) {
      const agora = new Date()
      if (dados.kind === 'CALL_PATIENT') {
        const consulta = await prisma.appointment.findUnique({
          where: { id: dados.appointmentId },
          select: { arrivedAt: true },
        })
        await prisma.appointment.update({
          where: { id: dados.appointmentId },
          data: {
            calledAt: agora,
            // Quem entra no consultório chegou, ainda que ninguém tenha marcado.
            ...(consulta?.arrivedAt ? {} : { arrivedAt: agora }),
          },
        })
      } else if (dados.kind === 'PATIENT_RELEASED') {
        await prisma.appointment.update({
          where: { id: dados.appointmentId },
          data: { releasedAt: agora },
        })
      }
    }

    res.status(201).json(alerta)
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /:id/seen  — quem recebeu deu por visto
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:id/seen', ...staffOnly, requirePermission('APPOINTMENT_READ'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existente = await prisma.clinicAlert.findFirst({
      where: { id: String(req.params.id), tenantId: req.user!.tenantId },
      select: { id: true, seenAt: true },
    })
    if (!existente) throw new NotFoundError('Aviso')

    // Já visto continua visto: quem marcou primeiro é quem viu.
    if (existente.seenAt) {
      res.json(existente)
      return
    }

    const alerta = await prisma.clinicAlert.update({
      where: { id: existente.id },
      data: { seenAt: new Date(), seenById: req.user!.userId },
      include: ALERT_INCLUDE,
    })
    res.json(alerta)
  } catch (err) {
    next(err)
  }
})

export default router
