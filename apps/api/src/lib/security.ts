import crypto from 'crypto'

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function addDays(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export function addHours(hours: number): Date {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date
}

export function signJson(payload: unknown, secret: string): string {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
}

export function signJsonWithPrivateKey(payload: unknown, privateKeyPem?: string): string | null {
  if (!privateKeyPem) return null
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(JSON.stringify(payload))
  signer.end()
  return signer.sign(privateKeyPem.replace(/\\n/g, '\n'), 'base64')
}

export function verifyJsonWithPublicKey(payload: unknown, signature: string, publicKeyPem?: string): boolean {
  if (!publicKeyPem) return false
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(JSON.stringify(payload))
  verifier.end()
  return verifier.verify(publicKeyPem.replace(/\\n/g, '\n'), signature, 'base64')
}
