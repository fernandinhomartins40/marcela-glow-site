import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '@marcela/database'

import authRouter from './routes/auth'
import proceduresRouter from './routes/procedures'
import appointmentsRouter from './routes/appointments'
import clinicalRouter from './routes/clinical'
import testimonialsRouter from './routes/testimonials'
import newsletterRouter from './routes/newsletter'
import adminRouter from './routes/admin'
import patientRouter from './routes/patient'
import landingRouter from './routes/landing'
import templatesRouter from './routes/templates'
import financeRouter from './routes/finance'
import { AppError } from './lib/errors'

const app = express()
const PORT = Number(process.env.PORT) || 3001

// ─────────────────────────────────────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A aplicação roda atrás de dois proxies: o nginx do host e o do compose. Sem
 * isto o Express enxerga todo mundo com o IP do proxy — o rate limit vira um
 * balde único para a clínica inteira (a recepção derrubaria o acesso de todos
 * ao usar o sistema) e a auditoria grava sempre o mesmo IP.
 */
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 2))

app.use(helmet())

/**
 * A clínica atende em dois domínios (com e sem www) e o painel e o portal são
 * servidos da mesma origem. CORS_ORIGIN aceita lista separada por vírgula para
 * que o domínio secundário não seja bloqueado.
 */
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? (origin, callback) => {
            // Requisição de mesma origem não manda Origin — e é a maioria aqui
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
            callback(new Error('Origem não autorizada pelo CORS'))
          }
        : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  // O health check do deploy bate de 5 em 5 segundos e vem sempre do mesmo IP;
  // contá-lo consumiria a cota da própria clínica.
  skip: (req) => req.path === '/api/health',
  message: {
    error: true,
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
})

app.use(limiter)

// ─────────────────────────────────────────────────────────────────────────────
// Body parsing
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Health check usado pelo deploy para decidir se a versão subiu. Consulta o
 * banco de propósito: responder "ok" só porque o Express está de pé deixava
 * passar deploy com migration pendente ou Postgres fora, e o erro só aparecia
 * para a clínica.
 */
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      message: err instanceof Error ? err.message : 'Falha ao consultar o banco',
      timestamp: new Date().toISOString(),
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter)
app.use('/api/procedures', proceduresRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/testimonials', testimonialsRouter)
app.use('/api/newsletter', newsletterRouter)
app.use('/api/admin', adminRouter)
app.use('/api/clinical', clinicalRouter)
app.use('/api/patient', patientRouter)
app.use('/api/landing', landingRouter)
app.use('/api/clinical/templates', templatesRouter)
app.use('/api/finance', financeRouter)

// ─────────────────────────────────────────────────────────────────────────────
// 404 fallback
// ─────────────────────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: true, message: 'Rota não encontrada', code: 'NOT_FOUND' })
})

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Zod validation errors
  if (err instanceof z.ZodError) {
    const zodErr = err as z.ZodError
    const messages = zodErr.errors
      .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    res.status(400).json({
      error: true,
      message: messages,
      code: 'VALIDATION_ERROR',
      details: zodErr.errors,
    })
    return
  }

  // Known application errors
  if (err instanceof AppError) {
    const appErr = err as AppError
    res.status(appErr.statusCode).json({
      error: true,
      message: appErr.message,
      ...(appErr.code ? { code: appErr.code } : {}),
    })
    return
  }

  // Unexpected errors — don't leak internals in production
  console.error('[Unhandled Error]', err instanceof Error ? err.stack : err)
  res.status(500).json({
    error: true,
    message: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
})

export default app
