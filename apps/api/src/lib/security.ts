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

/**
 * Cifragem simétrica para segredos guardados no banco (ex.: client_secret do
 * provedor de assinatura). AES-256-GCM porque autentica o texto cifrado: uma
 * adulteração no banco falha na decifragem em vez de devolver lixo.
 *
 * A chave vem de SECRETS_ENCRYPTION_KEY; sem ela, cai no JWT_SECRET, que já é
 * obrigatório para o servidor rodar.
 */
function encryptionKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!raw) throw new Error('SECRETS_ENCRYPTION_KEY ou JWT_SECRET precisa estar definido.')
  // Deriva 32 bytes de qualquer comprimento de entrada
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.')
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.')
    if (!ivB64 || !tagB64 || !dataB64) return null
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    // Chave trocada ou dado adulterado: trata como ausente
    return null
  }
}

/** Mostra só o fim do segredo, para conferência sem expor o valor. */
export function maskSecret(value: string): string {
  if (value.length <= 4) return '••••'
  return '••••••••' + value.slice(-4)
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
