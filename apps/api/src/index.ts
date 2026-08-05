import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'

import authRouter from './routes/auth'
import proceduresRouter from './routes/procedures'
import appointmentsRouter from './routes/appointments'
import testimonialsRouter from './routes/testimonials'
import newsletterRouter from './routes/newsletter'
import adminRouter from './routes/admin'
import patientRouter from './routes/patient'
import { AppError } from './lib/errors'

const app = express()
const PORT = Number(process.env.PORT) || 3001

// ─────────────────────────────────────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(helmet())

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN : '*',
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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
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
app.use('/api/patient', patientRouter)

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
