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
