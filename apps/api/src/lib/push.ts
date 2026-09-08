import webpush from 'web-push'
import { prisma } from '@marcela/database'

const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:contato@drmarceladuch.com.br'

export const pushConfigured = Boolean(publicKey && privateKey)

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!)
}

export function getVapidPublicKey() {
  return publicKey || null
}

export async function sendPatientPush(patientId: string, payload: { title: string; body: string; url?: string }) {
  if (!pushConfigured) return { sent: 0, skipped: true }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { patientId, revokedAt: null },
  })

  let sent = 0
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
          JSON.stringify(payload)
        )
        sent += 1
      } catch {
        await prisma.pushSubscription.update({ where: { id: sub.id }, data: { revokedAt: new Date() } })
      }
    })
  )

  return { sent, skipped: false }
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
