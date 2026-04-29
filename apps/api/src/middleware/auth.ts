import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../lib/jwt'
import { UnauthorizedError, ForbiddenError } from '../lib/errors'

// Extend Express Request to carry authenticated user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de acesso não fornecido')
    }

    const token = authHeader.slice(7) // Remove "Bearer " prefix
    const payload = verifyToken(token)
    req.user = payload
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
