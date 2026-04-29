import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@marcela/database'
import { signToken } from '../lib/jwt'
import { authenticate } from '../middleware/auth'
import { AppError, NotFoundError, UnauthorizedError } from '../lib/errors'

const router = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  tenantSlug: z.string().min(1, 'tenantSlug é obrigatório'),
  // Optional: used only when creating a new tenant (admin bootstrap)
  tenantName: z.string().optional(),
  tenantEmail: z.string().email().optional(),
  tenantPhone: z.string().optional(),
  tenantAddress: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  tenantSlug: z.string().min(1, 'tenantSlug é obrigatório'),
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /register
// ─────────────────────────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)

    // Resolve or create tenant
    let tenant = await prisma.tenant.findUnique({
      where: { slug: body.tenantSlug },
    })

    if (!tenant) {
      // Only allow tenant creation when tenantName (and required fields) are supplied
      if (!body.tenantName || !body.tenantEmail || !body.tenantPhone || !body.tenantAddress) {
        throw new AppError(
          'Clínica não encontrada. Forneça tenantName, tenantEmail, tenantPhone e tenantAddress para criar uma nova clínica.',
          404,
          'TENANT_NOT_FOUND'
        )
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

    // Check for duplicate email within this tenant
    const existing = await prisma.user.findUnique({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
    })

    if (existing) {
      throw new AppError('E-mail já cadastrado nesta clínica', 409, 'EMAIL_TAKEN')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12)

    // Determine role: first user in a tenant becomes ADMIN
    const userCount = await prisma.user.count({ where: { tenantId: tenant.id } })
    const role = userCount === 0 ? 'ADMIN' : 'STAFF'

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        tenantId: tenant.id,
        role: role as 'ADMIN' | 'STAFF',
      },
    })

    const token = signToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
    })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body)

    const tenant = await prisma.tenant.findUnique({
      where: { slug: body.tenantSlug },
    })

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    const user = await prisma.user.findUnique({
      where: { email_tenantId: { email: body.email, tenantId: tenant.id } },
    })

    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    const passwordMatch = await bcrypt.compare(body.password, user.passwordHash)
    if (!passwordMatch) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
    })

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /me  (protected)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            address: true,
            logoUrl: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundError('Usuário')
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tenant: user.tenant,
    })
  } catch (err) {
    next(err)
  }
})

export default router
