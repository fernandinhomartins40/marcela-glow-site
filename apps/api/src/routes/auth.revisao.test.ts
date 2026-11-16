import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import bcrypt from 'bcryptjs'

/**
 * Conta de revisão das lojas no login da equipe (REVIEW_STAFF_EMAIL/PASSWORD).
 * Nasce como médica no primeiro login com a credencial do segredo; desativada
 * pelo painel, não volta sozinha — é o que fecha o acesso do revisor quando a
 * clínica tiver pacientes reais.
 */

vi.setConfig({ testTimeout: 60_000 })

const { banco } = vi.hoisted(() => ({ banco: {} as Record<string, Record<string, any>[]> }))

vi.mock('@marcela/database', () => {
  let seq = 0
  const tabela = (m: string) => (banco[m] ??= [])
  const casa = (l: any, where: any = {}) =>
    Object.entries(where).every(([k, v]: [string, any]) =>
      k === 'email_tenantId' ? l.email === v.email && l.tenantId === v.tenantId : l[k] === v)
  const modelo = (m: string) => ({
    findUnique: async ({ where }: any) => {
      const l = tabela(m).find((x) => casa(x, where))
      return l ? { ...l, permissions: [] } : null
    },
    create: async ({ data }: any) => {
      const nova = { id: `${m}${++seq}`, isActive: true, ...data }
      tabela(m).push(nova)
      return { ...nova, permissions: [] }
    },
    update: async ({ where, data }: any) => ({ ...Object.assign(tabela(m).find((l) => casa(l, where))!, data) }),
  })
  const cliente = Object.fromEntries(['tenant', 'user', 'authSession', 'auditLog'].map((n) => [n, modelo(n)]))
  return { prisma: cliente, prismaAuth: cliente }
})

let servidor: Server
let base = ''
let clinicaId = ''

beforeAll(async () => {
  const express = (await import('express')).default
  const { AppError } = await import('../lib/errors')
  const app = express()
  app.use(express.json())
  app.use('/api/auth', (await import('./auth')).default)
  app.use((err: unknown, _req: any, res: any, _next: any) =>
    res.status(err instanceof AppError ? err.statusCode : 500).json({ message: String(err) }))
  servidor = app.listen(0)
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/auth`
}, 120_000)

afterAll(() => {
  servidor?.close()
  delete process.env.REVIEW_STAFF_EMAIL
  delete process.env.REVIEW_STAFF_PASSWORD
})

const SENHA = 'SenhaDaRevisao1'
const entrar = async (email: string, password: string) =>
  (await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenantSlug: 'marcela-duch' }),
  })).status

beforeEach(async () => {
  for (const k of Object.keys(banco)) delete banco[k]
  banco.tenant = [{ id: 't1', slug: 'marcela-duch', name: 'Clínica', isActive: true }]
  clinicaId = 't1'
  process.env.REVIEW_STAFF_EMAIL = 'revisao@exemplo.com'
  process.env.REVIEW_STAFF_PASSWORD = SENHA
})

describe('conta de revisão da equipe', () => {
  it('nasce como médica no primeiro login; senha errada e outro e-mail não criam nada', async () => {
    expect(await entrar('revisao@exemplo.com', 'errada')).toBe(401)
    expect(await entrar('outra@exemplo.com', SENHA)).toBe(401)
    expect(banco.user ?? []).toHaveLength(0)

    expect(await entrar('revisao@exemplo.com', SENHA)).toBe(200)
    expect(banco.user).toHaveLength(1)
    expect(banco.user[0]).toMatchObject({ role: 'DOCTOR', tenantId: clinicaId, isActive: true })
    expect(await entrar('revisao@exemplo.com', SENHA)).toBe(200)
    expect(banco.user).toHaveLength(1)
  })

  it('desativada pelo painel, continua barrada', async () => {
    expect(await entrar('revisao@exemplo.com', SENHA)).toBe(200)
    banco.user[0].isActive = false
    expect(await entrar('revisao@exemplo.com', SENHA)).toBe(401)
  })

  it('segue a senha nova do segredo', async () => {
    banco.user = [{ id: 'u1', email: 'revisao@exemplo.com', tenantId: clinicaId, role: 'DOCTOR', isActive: true, passwordHash: await bcrypt.hash('antiga', 4) }]
    expect(await entrar('revisao@exemplo.com', SENHA)).toBe(200)
    expect(await bcrypt.compare(SENHA, banco.user[0].passwordHash)).toBe(true)
  })

  it('sem os segredos, não existe', async () => {
    delete process.env.REVIEW_STAFF_PASSWORD
    expect(await entrar('revisao@exemplo.com', SENHA)).toBe(401)
    expect(banco.user ?? []).toHaveLength(0)
  })
})
