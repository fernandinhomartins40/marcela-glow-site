import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

/**
 * Ativacao por e-mail e exclusao de conta, pela rota de verdade.
 *
 * O ataque medido por HTTP em 14/11/2026: `register` gravava a senha de
 * qualquer paciente cadastrada pela clinica sem senha, so pelo e-mail, e
 * devolvia sessao — o prontuario dela abria para quem soubesse o endereco.
 *
 * O banco e um vetor em memoria que entende os `where` usados nestas rotas.
 * O `prisma` simulado omite `passwordHash` da paciente como o real; so o
 * `prismaAuth` o devolve — trocar um pelo outro na rota quebra estes testes.
 */

// Cada caso faz varios bcrypt de custo 12: o prazo padrao de 5 s nao basta em maquina carregada.
vi.setConfig({ testTimeout: 60_000 })

type Linha = Record<string, any>

const { banco, enviados } = vi.hoisted(() => ({
  banco: {} as Record<string, Linha[]>,
  enviados: [] as { to: string; url?: string }[],
}))

vi.mock('@marcela/database', () => {
  let seq = 0
  const tabela = (m: string) => (banco[m] ??= [])
  const casa = (l: Linha, where: Linha = {}): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (k === 'email_tenantId') return l.email === v.email && l.tenantId === v.tenantId
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('gt' in v) return l[k] > v.gt
        if ('equals' in v) return String(l[k] ?? '').toLowerCase() === String(v.equals).toLowerCase()
        if ('in' in v) return v.in.includes(l[k])
      }
      return v === null ? l[k] == null : l[k] === v
    })
  const relacao: Record<string, string> = { patient: 'patient', user: 'user', tenant: 'tenant' }
  const incluir = (l: Linha | undefined, include?: Linha): Linha | null => {
    if (!l) return null
    const r = { ...l }
    for (const [k, sub] of Object.entries(include ?? {})) {
      const alvo = tabela(relacao[k]).find((x) => x.id === l[`${k}Id`])
      r[k] = incluir(alvo, typeof sub === 'object' ? sub.include : undefined)
    }
    return r
  }
  const modelo = (m: string) => ({
    findUnique: async ({ where, include }: any) => incluir(tabela(m).find((l) => casa(l, where)), include),
    findFirst: async ({ where, include }: any) => incluir(tabela(m).find((l) => casa(l, where)), include),
    findMany: async ({ where }: any = {}) => tabela(m).filter((l) => casa(l, where)),
    create: async ({ data }: any) => {
      const nova = { id: `${m}${++seq}`, isActive: true, usedAt: null, revokedAt: null, ...data }
      tabela(m).push(nova)
      return { ...nova }
    },
    update: async ({ where, data }: any) => ({ ...Object.assign(tabela(m).find((l) => casa(l, where))!, data) }),
    updateMany: async ({ where, data }: any) => {
      const alvo = tabela(m).filter((l) => casa(l, where))
      alvo.forEach((l) => Object.assign(l, data))
      return { count: alvo.length }
    },
    delete: async ({ where }: any) => tabela(m).splice(tabela(m).findIndex((l) => casa(l, where)), 1)[0],
    deleteMany: async ({ where }: any) => {
      const antes = tabela(m).length
      banco[m] = tabela(m).filter((l) => !casa(l, where))
      return { count: antes - banco[m].length }
    },
  })
  const nomes = ['tenant', 'patient', 'patientActivationToken', 'appointment', 'authSession', 'pushSubscription', 'auditLog']
  const prismaAuth = Object.fromEntries(nomes.map((n) => [n, modelo(n)]))
  // Como o cliente real: a paciente sai sem passwordHash.
  const semHash = (v: any) => (v && typeof v === 'object' ? { ...v, passwordHash: undefined } : v)
  const p = prismaAuth.patient
  const prisma = {
    ...prismaAuth,
    patient: {
      ...p,
      findUnique: async (a: any) => semHash(await p.findUnique(a)),
      findFirst: async (a: any) => semHash(await p.findFirst(a)),
      update: async (a: any) => semHash(await p.update(a)),
      create: async (a: any) => semHash(await p.create(a)),
    },
  }
  return { prisma, prismaAuth }
})

vi.mock('../lib/mailer', () => ({
  publicBaseUrl: () => 'https://site.exemplo',
  sendMail: async (m: { to: string; action?: { url: string } }) => {
    enviados.push({ to: m.to, url: m.action?.url })
    return { sent: true }
  },
}))

let servidor: Server
let base = ''

beforeAll(async () => {
  const express = (await import('express')).default
  const { z } = await import('zod')
  const { AppError } = await import('../lib/errors')
  const router = (await import('./patient')).default
  const app = express()
  app.use(express.json())
  app.use('/api/patient', router)
  app.use((err: unknown, _req: any, res: any, _next: any) => {
    if (err instanceof z.ZodError) return res.status(400).json({ code: 'VALIDATION_ERROR' })
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message, code: err.code })
    res.status(500).json({ message: String(err) })
  })
  servidor = app.listen(0)
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/patient`
}, 120_000) // a rota importa SDKs pesados (S3, firebase): o import frio passa de 10 s

afterAll(() => servidor?.close())

async function http(caminho: string, metodo = 'GET', corpo?: unknown, tok?: string) {
  const res = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  const texto = await res.text()
  return { status: res.status, dados: texto ? JSON.parse(texto) : null }
}

const SENHA = 'SenhaDaPaciente1'
let clinicaId = ''

beforeEach(async () => {
  for (const k of Object.keys(banco)) delete banco[k]
  enviados.length = 0
  const { prismaAuth } = (await import('@marcela/database')) as any
  const t = await prismaAuth.tenant.create({ data: { slug: 'marcela-duch', name: 'Clinica' } })
  clinicaId = t.id
})

async function pacienteDaClinica(email = 'fernanda@exemplo.com') {
  const { prismaAuth } = (await import('@marcela/database')) as any
  return prismaAuth.patient.create({ data: { name: 'Fernanda', email, phone: '11999', tenantId: clinicaId, passwordHash: null } })
}

const cadastro = (email: string, password = 'SenhaDoInvasor1') =>
  http('/auth/register', 'POST', { name: 'Qualquer', email, phone: '000', password })

async function contaAtiva(email = 'fernanda@exemplo.com') {
  await pacienteDaClinica(email)
  const r = await cadastro(email, SENHA)
  const a = await http('/auth/activate', 'POST', { token: r.dados.activationToken })
  return a.dados.token as string
}

describe('cadastro so ativa com prova do e-mail', () => {
  it('paciente da clinica sem senha: 202 sem sessao, senha nao gravada, painel fechado', async () => {
    const paciente = await pacienteDaClinica()
    const r = await cadastro('fernanda@exemplo.com')

    expect(r.status).toBe(202)
    expect(r.dados).toMatchObject({ status: 'CONFIRMAR_EMAIL', email: 'fernanda@exemplo.com' })
    expect(r.dados.token).toBeUndefined()
    expect(banco.patient.find((p) => p.id === paciente.id)!.passwordHash).toBeNull()
    expect(enviados).toEqual([{ to: 'fernanda@exemplo.com', url: expect.stringContaining('/paciente/?ativar=') }])
    expect((await http('/dashboard', 'GET', undefined, r.dados.activationToken)).status).toBe(401)
  })

  it('e-mail novo nao cria paciente antes da confirmacao, e a resposta e identica', async () => {
    await pacienteDaClinica()
    const existente = await cadastro('fernanda@exemplo.com')
    const novo = await cadastro('nova@exemplo.com')

    expect(banco.patient.some((p) => p.email === 'nova@exemplo.com')).toBe(false)
    expect(novo.status).toBe(existente.status)
    expect(Object.keys(novo.dados).sort()).toEqual(Object.keys(existente.dados).sort())
  })

  it('conta que ja tem senha continua 409', async () => {
    await contaAtiva()
    expect((await cadastro('fernanda@exemplo.com')).status).toBe(409)
  })
})

describe('ativacao pelo link', () => {
  it('token valido loga, grava a senha e liga a consulta pendente daquele e-mail', async () => {
    const { prismaAuth } = (await import('@marcela/database')) as any
    const consulta = await prismaAuth.appointment.create({
      data: { tenantId: clinicaId, patientId: null, status: 'PENDING', email: 'NOVA@exemplo.com' },
    })
    const r = await cadastro('nova@exemplo.com', SENHA)
    const a = await http('/auth/activate', 'POST', { token: r.dados.activationToken })

    expect(a.status).toBe(201)
    expect(Object.keys(a.dados).sort()).toEqual(['patient', 'tenant', 'token'])
    const criada = banco.patient.find((p) => p.email === 'nova@exemplo.com')!
    expect(banco.appointment.find((c) => c.id === consulta.id)!.patientId).toBe(criada.id)
    expect((await http('/dashboard', 'GET', undefined, a.dados.token)).status).not.toBe(401)
    expect((await http('/auth/login', 'POST', { email: 'nova@exemplo.com', password: SENHA })).status).toBe(200)
  })

  it('nao sobrescreve o telefone do cadastro da clinica', async () => {
    await contaAtiva()
    expect(banco.patient.find((p) => p.email === 'fernanda@exemplo.com')!.phone).toBe('11999')
  })

  it('token usado ou expirado falha com 401', async () => {
    await pacienteDaClinica()
    const r = await cadastro('fernanda@exemplo.com')
    expect((await http('/auth/activate', 'POST', { token: r.dados.activationToken })).status).toBe(201)
    expect((await http('/auth/activate', 'POST', { token: r.dados.activationToken })).status).toBe(401)

    const r2 = await cadastro('outra@exemplo.com')
    banco.patientActivationToken.at(-1)!.expiresAt = new Date(Date.now() - 1000)
    expect((await http('/auth/activate', 'POST', { token: r2.dados.activationToken })).status).toBe(401)
    expect(banco.patient.some((p) => p.email === 'outra@exemplo.com')).toBe(false)
  })

  it('segundo link pendente nao troca a senha de conta ja ativada', async () => {
    await pacienteDaClinica()
    const invasor = await cadastro('fernanda@exemplo.com', 'SenhaDoInvasor1')
    const dona = await cadastro('fernanda@exemplo.com', SENHA)
    await http('/auth/activate', 'POST', { token: dona.dados.activationToken })

    expect((await http('/auth/activate', 'POST', { token: invasor.dados.activationToken })).status).toBe(409)
    expect((await http('/auth/login', 'POST', { email: 'fernanda@exemplo.com', password: SENHA })).status).toBe(200)
  })
})

describe('exclusao de conta', () => {
  it('exige a senha atual', async () => {
    const tok = await contaAtiva()
    expect((await http('/me', 'DELETE', { password: 'errada' }, tok)).status).toBe(401)
    expect((await http('/me', 'DELETE', {}, tok)).status).toBe(400)
    expect(banco.patient[0].passwordHash).toBeTruthy()
  })

  it('remove o acesso: senha, sessoes, push; login falha depois', async () => {
    const tok = await contaAtiva()
    await http('/push/subscriptions', 'POST', { provider: 'FCM', token: 'aparelho', platform: 'ios' }, tok)

    expect((await http('/me', 'DELETE', { password: SENHA }, tok)).status).toBe(204)
    expect(banco.patient[0].passwordHash).toBeNull()
    expect(banco.pushSubscription).toHaveLength(0)
    expect(banco.authSession.every((s) => s.revokedAt)).toBe(true)
    expect(banco.auditLog.some((a) => a.action === 'DELETE' && a.resource === 'patientAccess')).toBe(true)
    expect((await http('/dashboard', 'GET', undefined, tok)).status).toBe(401)
    expect((await http('/auth/login', 'POST', { email: 'fernanda@exemplo.com', password: SENHA })).status).toBe(401)
  })

  it('mantem paciente e consultas', async () => {
    const tok = await contaAtiva()
    const { prismaAuth } = (await import('@marcela/database')) as any
    await prismaAuth.appointment.create({ data: { tenantId: clinicaId, patientId: banco.patient[0].id, status: 'COMPLETED' } })

    await http('/me', 'DELETE', { password: SENHA }, tok)
    expect(banco.patient).toHaveLength(1)
    expect(banco.appointment).toHaveLength(1)
  })

  it('depois dela, o cadastro volta a exigir o e-mail', async () => {
    const tok = await contaAtiva()
    await http('/me', 'DELETE', { password: SENHA }, tok)

    const r = await cadastro('fernanda@exemplo.com')
    expect(r.status).toBe(202)
    expect(r.dados.token).toBeUndefined()
    expect(banco.patient[0].passwordHash).toBeNull()
  })
})
