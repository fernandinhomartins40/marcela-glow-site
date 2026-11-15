import webpush from 'web-push'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { prisma } from '@marcela/database'

const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:contato@drmarceladuch.com.br'

export const pushConfigured = Boolean(publicKey && privateKey)

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!)
}

/**
 * FCM (apps nativos). `FIREBASE_SERVICE_ACCOUNT` traz o CONTEUDO do JSON da
 * conta de servico (em uma linha, ou em base64) — nao o caminho: assim cabe no
 * .env do compose e num segredo do CI sem montar arquivo no container. Sem ela, o
 * push nativo e pulado sem erro, como o web push sem VAPID.
 */
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT

let fcmLigado = false
if (serviceAccount) {
  // Credencial malformada desliga so o push nativo; derrubar a API inteira por
  // isso tiraria a clinica do ar por causa de um aviso.
  try {
    // JSON direto ou em base64 (o deploy grava base64: o .env nao guarda aspas e \n com seguranca).
    const json = serviceAccount.trim().startsWith('{') ? serviceAccount : Buffer.from(serviceAccount, 'base64').toString('utf8')
    if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(json)) })
    fcmLigado = true
  } catch (err) {
    console.error('[push] FIREBASE_SERVICE_ACCOUNT invalida, push nativo desligado:', err instanceof Error ? err.message : err)
  }
}
export const fcmConfigured = fcmLigado

/** Canal de notificacao do Android. O app da paciente cria o canal com este id. */
export const ANDROID_CHANNEL_ID = 'avisos'

// So estes dizem que o token morreu; erro de rede ou de credencial nao revoga.
const FCM_TOKEN_MORTO = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']

export function getVapidPublicKey() {
  return publicKey || null
}

export async function sendPatientPush(patientId: string, payload: { title: string; body: string; url?: string }) {
  if (!pushConfigured && !fcmConfigured) return { sent: 0, skipped: true }

  const providers = [...(pushConfigured ? ['WEBPUSH' as const] : []), ...(fcmConfigured ? ['FCM' as const] : [])]
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { patientId, revokedAt: null, provider: { in: providers } },
  })

  let sent = 0
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        if (sub.provider === 'FCM') {
          await getMessaging().send({
            token: sub.endpoint,
            notification: { title: payload.title, body: payload.body },
            // `data` so aceita string; o app navega para `url` ao tocar.
            data: payload.url ? { url: payload.url } : {},
            android: { notification: { channelId: ANDROID_CHANNEL_ID } },
          })
        } else {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
            JSON.stringify(payload)
          )
        }
        sent += 1
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (sub.provider === 'FCM' && !FCM_TOKEN_MORTO.includes(code ?? '')) return
        await prisma.pushSubscription.update({ where: { id: sub.id }, data: { revokedAt: new Date() } })
      }
    })
  )

  return { sent, skipped: false }
}

type Assinante = { patientId: string; tenantId: string; userAgent?: string }
export type NovaInscricao =
  | { endpoint: string; keys: { p256dh: string; auth: string } }
  | { provider: 'FCM'; token: string; platform: 'ios' | 'android' }

/**
 * Registra o navegador ou aparelho para a paciente logada.
 *
 * O endpoint/token identifica o aparelho, nao a pessoa. Se ele ja estava com
 * outra paciente (celular de familia, logout sem rede), passa para quem esta
 * logada agora: manter o dono antigo mandaria os avisos de saude dela para o
 * aparelho de outra pessoa. O pior que um token roubado permite e desviar os
 * avisos do proprio ladrao para o aparelho da vitima — nada da vitima vaza.
 */
export async function inscreverAparelho(quem: Assinante, body: NovaInscricao) {
  const dono = { subjectType: 'PATIENT' as const, patientId: quem.patientId, tenantId: quem.tenantId, userAgent: quem.userAgent }
  const dados =
    'provider' in body
      ? { endpoint: body.token, keys: {}, provider: 'FCM' as const, platform: body.platform }
      : { endpoint: body.endpoint, keys: body.keys, provider: 'WEBPUSH' as const, platform: null }

  return prisma.pushSubscription.upsert({
    where: { endpoint: dados.endpoint },
    update: { ...dados, ...dono, revokedAt: null },
    create: { ...dados, ...dono },
  })
}

/** Remove a inscricao, so se for da propria paciente. Token alheio: nada acontece. */
export async function removerAparelho(patientId: string, token: string) {
  const { count } = await prisma.pushSubscription.deleteMany({ where: { endpoint: token, patientId } })
  return count
}

/**
 * Avisa a paciente no portal e no celular.
 *
 * A notificação em tela e o push são a mesma intenção — "aconteceu algo que
 * você precisa saber" — e estavam sendo escritos aos pares, rota a rota. Onde
 * alguém esqueceu um dos dois, a paciente ficava sem aviso: era o caso do
 * procedimento registrado e do plano de tratamento criado, que apareciam no
 * portal sem nada indicando que eram novos.
 *
 * O push nunca derruba a operação: se a paciente revogou a permissão ou o
 * navegador recusou, a notificação em tela já cumpriu o papel.
 */
export async function avisarPaciente(
  tenantId: string,
  patientId: string,
  aviso: { title: string; body: string; url?: string },
) {
  await prisma.notification.create({
    data: {
      tenantId,
      patientId,
      title: aviso.title,
      body: aviso.body,
      channel: 'IN_APP',
    },
  })

  await sendPatientPush(patientId, {
    title: aviso.title,
    body: aviso.body,
    url: aviso.url ?? '/paciente/',
  }).catch(() => undefined)
}
