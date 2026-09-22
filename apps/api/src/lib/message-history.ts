import { prisma } from '@marcela/database'
import { z } from 'zod'
import { AppError } from './errors'

export const messageHistoryQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function listMessageHistory(tenantId: string, patientId: string, cursor?: string, limit = 20) {
  if (cursor) {
    const previous = await prisma.message.findFirst({
      where: { id: cursor, tenantId, patientId },
      select: { id: true },
    })
    if (!previous) throw new AppError('Cursor de mensagens inválido', 400)
  }

  const rows = await prisma.message.findMany({
    where: { tenantId, patientId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
  })
  return {
    messages: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null,
  }
}
