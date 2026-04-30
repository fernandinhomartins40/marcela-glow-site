import type { Request } from 'express'
import { prisma, AuditAction } from '@marcela/database'

export async function audit(req: Request, action: AuditAction, resource: string, resourceId?: string, metadata?: unknown) {
  const user = req.user
  if (!user) return

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      action,
      resource,
      resourceId,
      subjectType: user.subjectType,
      userId: user.subjectType === 'STAFF' ? user.userId : undefined,
      patientId: user.subjectType === 'PATIENT' ? user.userId : undefined,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: metadata === undefined ? undefined : (metadata as object),
    },
  })
}
