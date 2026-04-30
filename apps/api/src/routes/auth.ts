import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma, UserRole } from '@marcela/database'
import { signToken } from '../lib/jwt'
import { authenticate } from '../middleware/auth'
import { AppError, NotFoundError, UnauthorizedError } from '../lib/errors'
import { addDays, addHours, randomToken, sha256 } from '../lib/security'
import { effectivePermissions } from '../lib/permissions'
import { audit } from '../lib/audit'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  tenantSlug: z.string().min(1, 'tenantSlug e obrigatorio'),
  tenantName: z.string().optional(),
  tenantEmail: z.string().email().optional(),
  tenantPhone: z.string().optional(),
  tenantAddress: z.string().optional(),
  bootstrapToken: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(1, 'Senha e obrigatoria'),
  tenantSlug: z.string().min(1, 'tenantSlug e obrigatorio'),
})

const resetRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
})

const resetConfirmSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
})

async function createStaffSession(req: Request, user: any, tenant: any) {
  const session = await prisma.authSession.create({
    data: {
      subjectType: 'STAFF',
      userId: user.id,
      tenantId: tenant.id,
      tokenHash: 'pending',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: addDays(7),
    },
  })
  const permissions = effectivePermissions(user.role, user.permissions?.map((p: any) => p.permission) ?? [])
  const token = signToken({
    userId: user.id,
    email: user.email,
    tenantId: tenant.id,
    role: user.role,
    subjectType: 'STAFF',
    sessionId: session.id,
    permissions,
  })
  await prisma.authSession.update({ where: { id: session.id }, data: { tokenHash: sha256(token) } })
  return { token, permissions }
}

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)
    let tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })

    if (!tenant) {
      if (process.env.BOOTSTRAP_TOKEN && body.bootstrapToken !== process.env.BOOTSTRAP_TOKEN) {
        throw new UnauthorizedError('Bootstrap nao autorizado')
      }
      if (!body.tenantName || !body.tenantEmail || !body.tenantPhone || !body.tenantAddress) {
        throw new AppError('Clinica nao encontrada', 404, 'TENANT_NOT_FOUND')
      }
      tenant = await prisma.tenant.create({
        data: {
          name: body.tenantName,
          slug: body.tenantSlug,
          email: body.tenantEmail,
          phone: body.tenantPhone,
          address: body.tenantAddress,
        },
      })
    }

    const existing = await prisma.user.findUnique({ where: { email_tenantId: { email: body.email, tenantId: tenant.id } } })
    if (existing) throw new AppError('E-mail ja cadastrado nesta clinica', 409, 'EMAIL_TAKEN')

    const userCount = await prisma.user.count({ where: { tenantId: tenant.id } })
    const role: UserRole = userCount === 0 ? 'ADMIN' : 'STAFF'
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 12),
        tenantId: tenant.id,
        role,
      },
      include: { permissions: true },
    })

    const { token, permissions } = await createStaffSession(req, user, tenant)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, permissions },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body)
    const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })
    if (!tenant || !tenant.isActive) throw new UnauthorizedError('Credenciais invalidas')

    const user = await prisma.user.findUnique({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
      include: { permissions: true },
    })
    if (!user || !user.isActive) throw new UnauthorizedError('Credenciais invalidas')

    const passwordMatch = await bcrypt.compare(body.password, user.passwordHash)
    if (!passwordMatch) throw new UnauthorizedError('Credenciais invalidas')

    const { token, permissions } = await createStaffSession(req, user, tenant)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'LOGIN',
        resource: 'auth',
        subjectType: 'STAFF',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, permissions },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.authSession.update({ where: { id: req.user!.sessionId }, data: { revokedAt: new Date() } })
    await audit(req, 'LOGOUT', 'auth')
    res.json({ message: 'Sessao encerrada' })
  } catch (err) {
    next(err)
  }
})

router.post('/password/request', async (req, res, next) => {
  try {
    const body = resetRequestSchema.parse(req.body)
    const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })
    if (!tenant) return res.json({ message: 'Se o e-mail existir, enviaremos instrucoes.' })
    const user = await prisma.user.findUnique({ where: { email_tenantId: { email: body.email, tenantId: tenant.id } } })
    if (!user) return res.json({ message: 'Se o e-mail existir, enviaremos instrucoes.' })

    const token = randomToken()
    await prisma.passwordResetToken.create({
      data: { subjectType: 'STAFF', userId: user.id, tenantId: tenant.id, tokenHash: sha256(token), expiresAt: addHours(2) },
    })
    res.json({ message: 'Token de recuperacao gerado.', resetToken: process.env.NODE_ENV === 'production' ? undefined : token })
  } catch (err) {
    next(err)
  }
})

router.post('/password/confirm', async (req, res, next) => {
  try {
    const body = resetConfirmSchema.parse(req.body)
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(body.token) } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.userId) throw new UnauthorizedError('Token invalido ou expirado')

    await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(body.password, 12) } })
    await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } })
    await prisma.authSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    res.json({ message: 'Senha atualizada' })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        permissions: true,
        tenant: { select: { id: true, name: true, slug: true, email: true, phone: true, address: true, logoUrl: true, isActive: true } },
      },
    })
    if (!user) throw new NotFoundError('Usuario')

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions: effectivePermissions(user.role, user.permissions.map((p) => p.permission)),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tenant: user.tenant,
    })
  } catch (err) {
    next(err)
  }
})

export default router
