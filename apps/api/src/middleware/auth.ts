import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../lib/jwt'
import { prisma } from '@marcela/database'
import { effectivePermissions } from '../lib/permissions'
import { sha256 } from '../lib/security'
import { UnauthorizedError, ForbiddenError } from '../lib/errors'

// Extend Express Request to carry authenticated user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de acesso não fornecido')
    }

    const token = authHeader.slice(7) // Remove "Bearer " prefix
    const payload = verifyToken(token)

    if (!payload.sessionId || !payload.subjectType) {
      throw new UnauthorizedError('Sessao invalida')
    }

    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.sessionId,
        tenantId: payload.tenantId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        tokenHash: sha256(token),
      },
      include: {
        user: { include: { tenant: true, permissions: true } },
        patient: { include: { tenant: true } },
      },
    })

    if (!session) throw new UnauthorizedError('Sessao expirada ou revogada')

    if (payload.subjectType === 'STAFF') {
      if (!session.user || !session.user.isActive || !session.user.tenant.isActive) {
        throw new UnauthorizedError('Usuario inativo')
      }
      req.user = {
        ...payload,
        userId: session.user.id,
        email: session.user.email,
        tenantId: session.user.tenantId,
        role: session.user.role,
        permissions: effectivePermissions(session.user.role, session.user.permissions.map((p) => p.permission)),
      }
    } else {
      if (!session.patient || !session.patient.isActive || !session.patient.tenant.isActive) {
        throw new UnauthorizedError('Paciente inativo')
      }
      req.user = {
        ...payload,
        userId: session.patient.id,
        email: session.patient.email,
        tenantId: session.patient.tenantId,
        role: 'PATIENT',
        permissions: [],
      }
    }

    next()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err)
    } else {
      next(new UnauthorizedError('Token inválido ou expirado'))
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError())
    return
  }

  if (req.user.role !== 'ADMIN') {
    next(new ForbiddenError('Apenas administradores podem realizar esta ação'))
    return
  }

  next()
}

/**
 * Libera qualquer integrante da equipe, seja qual for o papel. O que cada um
 * pode fazer é decidido por `requirePermission`, que lê as permissões efetivas
 * do papel (ver lib/permissions). Listar papéis à mão aqui já derrubou DOCTOR,
 * RECEPTION e ASSISTANT de rotas que as permissões deles autorizavam.
 */
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError())
    return
  }

  if (req.user.subjectType !== 'STAFF') {
    next(new ForbiddenError('Apenas a equipe da clínica pode acessar este recurso'))
    return
  }

  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError())
      return
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Perfil sem permissao para realizar esta acao'))
      return
    }

    next()
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError())
      return
    }

    if (req.user.role === 'ADMIN') {
      next()
      return
    }

    const granted = new Set(req.user.permissions ?? [])
    if (!permissions.every((permission) => granted.has(permission))) {
      next(new ForbiddenError('Permissao insuficiente para realizar esta acao'))
      return
    }

    next()
  }
}

/**
 * Exige **ao menos uma** das permissoes.
 *
 * `requirePermission` cobra todas (`every`), o que e o certo para acumular
 * exigencias. Mas ha rota que dois papeis alcancam por caminhos diferentes: o
 * relatorio do caixa serve a secretaria, que opera, e a medica, que
 * supervisiona — e nenhuma das duas tem a permissao da outra. Com `every` a
 * lista das duas trancaria a porta para ambas.
 */
export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError())
      return
    }
    if (req.user.role === 'ADMIN') {
      next()
      return
    }
    const granted = new Set(req.user.permissions ?? [])
    if (!permissions.some((permission) => granted.has(permission))) {
      next(new ForbiddenError('Permissao insuficiente para realizar esta acao'))
      return
    }
    next()
  }
}

export function requirePatient(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError())
    return
  }

  if (req.user.role !== 'PATIENT') {
    next(new ForbiddenError('Apenas pacientes podem acessar este recurso'))
    return
  }

  next()
}
