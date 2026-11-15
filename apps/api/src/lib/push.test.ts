import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Push dos apps nativos (FCM) ao lado do web push.
 *
 * O banco e um vetor em memoria que respeita o `where` usado por push.ts; os
 * dois provedores sao simulados. Assim o teste cobre a decisao — para onde
 * vai cada inscricao, quem pode apagar, quando revogar — sem rede nem banco.
 */

type Linha = {
  id: string
  endpoint: string
  keys: unknown
  provider: 'WEBPUSH' | 'FCM'
  platform: string | null
  patientId: string
  tenantId: string
  revokedAt: Date | null
}

// vi.mock e icado para o topo do arquivo; o que ele usa precisa vir de vi.hoisted.
const { banco, enviadoWeb, enviadoFcm } = vi.hoisted(() => {
  process.env.VAPID_PUBLIC_KEY = 'pub'
  process.env.VAPID_PRIVATE_KEY = 'priv'
  process.env.FIREBASE_SERVICE_ACCOUNT = '{"projectId":"teste"}'
  return { banco: [] as Linha[], enviadoWeb: vi.fn(), enviadoFcm: vi.fn() }
})

vi.mock('@marcela/database', () => ({
  prisma: {
    pushSubscription: {
      findMany: async ({ where }: any) =>
        banco.filter(
          (l) => l.patientId === where.patientId && l.revokedAt === null && where.provider.in.includes(l.provider),
        ),
      update: async ({ where, data }: any) => Object.assign(banco.find((l) => l.id === where.id)!, data),
      upsert: async ({ where, update, create }: any) => {
        const atual = banco.find((l) => l.endpoint === where.endpoint)
        if (atual) return Object.assign(atual, update)
        const nova = { id: `s${banco.length + 1}`, revokedAt: null, ...create }
        banco.push(nova)
        return nova
      },
      deleteMany: async ({ where }: any) => {
        const antes = banco.length
        for (let i = banco.length - 1; i >= 0; i--) {
          if (banco[i].endpoint === where.endpoint && banco[i].patientId === where.patientId) banco.splice(i, 1)
        }
        return { count: antes - banco.length }
      },
    },
    notification: { create: async () => ({}) },
  },
}))

vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: enviadoWeb } }))
vi.mock('firebase-admin/app', () => ({ cert: vi.fn(), getApps: () => [], initializeApp: vi.fn() }))
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ send: enviadoFcm }) }))

let push: typeof import('./push')
beforeAll(async () => {
  push = await import('./push')
})

const ana = { patientId: 'ana', tenantId: 't1' }
const bia = { patientId: 'bia', tenantId: 't1' }
const web = { endpoint: 'https://push.exemplo/abc', keys: { p256dh: 'p', auth: 'a' } }
const fcm = (token: string) => ({ provider: 'FCM' as const, token, platform: 'android' as const })

beforeEach(() => {
  banco.length = 0
  enviadoWeb.mockReset()
  enviadoFcm.mockReset()
})

describe('sendPatientPush despacha por provedor', () => {
  it('FCM vai pelo firebase-admin com o url nos dados e o canal fixo; web pelo web-push', async () => {
    await push.inscreverAparelho(ana, web)
    await push.inscreverAparelho(ana, fcm('tok-ana'))

    const r = await push.sendPatientPush('ana', { title: 'Oi', body: 'Novo', url: '/paciente/jornada' })

    expect(r).toEqual({ sent: 2, skipped: false })
    expect(enviadoWeb).toHaveBeenCalledTimes(1)
    expect(enviadoWeb.mock.calls[0][0].endpoint).toBe(web.endpoint)
    expect(enviadoFcm).toHaveBeenCalledTimes(1)
    expect(enviadoFcm.mock.calls[0][0]).toMatchObject({
      token: 'tok-ana',
      notification: { title: 'Oi', body: 'Novo' },
      data: { url: '/paciente/jornada' },
      android: { notification: { channelId: push.ANDROID_CHANNEL_ID } },
    })
  })

  it('token FCM morto e revogado; falha passageira nao', async () => {
    await push.inscreverAparelho(ana, fcm('morto'))
    await push.inscreverAparelho(ana, fcm('rede'))
    enviadoFcm.mockImplementation(async (m: { token: string }) => {
      throw { code: m.token === 'morto' ? 'messaging/registration-token-not-registered' : 'messaging/server-unavailable' }
    })

    await push.sendPatientPush('ana', { title: 'x', body: 'y' })

    expect(banco.find((l) => l.endpoint === 'morto')!.revokedAt).toBeInstanceOf(Date)
    expect(banco.find((l) => l.endpoint === 'rede')!.revokedAt).toBeNull()
  })
})

describe('a paciente so mexe nas proprias inscricoes', () => {
  it('inscricao FCM de uma paciente nao e apagavel por outra', async () => {
    await push.inscreverAparelho(ana, fcm('tok-ana'))

    expect(await push.removerAparelho('bia', 'tok-ana')).toBe(0)
    expect(banco).toHaveLength(1)

    expect(await push.removerAparelho('ana', 'tok-ana')).toBe(1)
    expect(banco).toHaveLength(0)
  })

  it('aparelho reinscrito por outra paciente passa a ela: os avisos da primeira nao vao para la', async () => {
    await push.inscreverAparelho(ana, fcm('celular-da-familia'))
    await push.inscreverAparelho(bia, fcm('celular-da-familia'))

    await push.sendPatientPush('ana', { title: 'Exame da Ana', body: '...' })
    expect(enviadoFcm).not.toHaveBeenCalled()

    await push.sendPatientPush('bia', { title: 'Aviso da Bia', body: '...' })
    expect(enviadoFcm).toHaveBeenCalledTimes(1)
  })
})
