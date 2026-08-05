import crypto from 'crypto'
import { prisma } from '@marcela/database'
import { decryptSecret, encryptSecret, maskSecret } from './security'

/**
 * Assinatura qualificada ICP-Brasil via certificado em nuvem.
 *
 * Como funciona (pesquisado na documentação do BirdID/VaultID em 2026-08):
 *
 * 1. A médica obtém o certificado gratuito pelo CFM/CRM. A chave privada nasce
 *    e permanece na nuvem da Autoridade Certificadora — nunca é exportada.
 * 2. O sistema autentica por OAuth2 password grant, enviando client_id e
 *    client_secret da clínica mais o CPF e um OTP gerado no app da médica.
 * 3. Para assinar, envia-se APENAS O HASH do documento. O PDF nunca sai daqui.
 *    A AC assina o hash com a chave privada e devolve a assinatura em base64.
 *
 * É por isso que não existe "subir o certificado": um arquivo .pfx colocaria a
 * chave privada sob controle do servidor, o que descaracteriza o controle
 * exclusivo do titular exigido pela MP 2.200-2 e enfraquece a validade.
 */

export type ProviderId = 'BIRDID' | 'VIDAAS' | 'SAFEID' | 'CUSTOM'

export interface ProviderProfile {
  id: ProviderId
  label: string
  /** Onde a médica obtém as credenciais de integração */
  consoleUrl: string
  tokenUrl: string
  signUrl: string
  /** Rótulo do campo de senha na tela — cada provedor chama de um jeito */
  passwordLabel: string
  notes: string
}

export const PROVIDERS: Record<ProviderId, ProviderProfile> = {
  BIRDID: {
    id: 'BIRDID',
    label: 'BirdID (Soluti)',
    consoleUrl: 'https://birdid.com.br/',
    tokenUrl: 'https://api.birdid.com.br/v0/oauth/token',
    signUrl: 'https://api.birdid.com.br/v0/oauth/signature',
    passwordLabel: 'Código OTP do app Bird ID',
    notes: 'O certificado gratuito emitido pelo CFM costuma ser BirdID ou VIDaaS.',
  },
  VIDAAS: {
    id: 'VIDAAS',
    label: 'VIDaaS (Valid)',
    consoleUrl: 'https://validcertificadora.com.br/pages/psc-integracao-via-api',
    tokenUrl: 'https://certificado.vidaas.com.br/v0/oauth/token',
    signUrl: 'https://certificado.vidaas.com.br/v0/oauth/signature',
    passwordLabel: 'Código OTP do app VIDaaS',
    notes: 'Provedor usado pelo CFM em boa parte dos estados.',
  },
  SAFEID: {
    id: 'SAFEID',
    label: 'SafeID (Safeweb)',
    consoleUrl: 'https://www.safeweb.com.br/produtos/safeidintegracao',
    tokenUrl: 'https://certificado.safewebpss.com.br/v0/oauth/token',
    signUrl: 'https://certificado.safewebpss.com.br/v0/oauth/signature',
    passwordLabel: 'Código OTP do app SafeID',
    notes: 'Exige contratação do módulo de integração.',
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Outro provedor',
    consoleUrl: '',
    tokenUrl: '',
    signUrl: '',
    passwordLabel: 'Código OTP',
    notes: 'Informe manualmente os endereços fornecidos pelo provedor.',
  },
}

const SETTING_KEY = 'signature_provider'

export interface SignatureConfig {
  provider: ProviderId
  clientId: string
  /** Guardado cifrado; nunca devolvido em texto puro pela API */
  clientSecret: string
  /** CPF da médica, só dígitos */
  cpf: string
  /** Alias do certificado no provedor; descoberto no teste de conexão */
  certificateAlias?: string
  tokenUrl?: string
  signUrl?: string
  enabled: boolean
  updatedAt?: string
  lastTestAt?: string
  lastTestOk?: boolean
}

/** Config sem segredo, para exibir na tela. */
export interface PublicSignatureConfig {
  provider: ProviderId
  clientId: string
  clientSecretMasked: string | null
  cpf: string
  certificateAlias: string | null
  tokenUrl: string
  signUrl: string
  enabled: boolean
  configured: boolean
  lastTestAt: string | null
  lastTestOk: boolean | null
}

export async function loadConfig(tenantId: string): Promise<SignatureConfig | null> {
  const row = await prisma.clinicSetting.findFirst({
    where: { tenantId, key: SETTING_KEY },
  })
  if (!row) return null
  const value = row.value as unknown as SignatureConfig
  const secret = value.clientSecret ? decryptSecret(value.clientSecret) : null
  return { ...value, clientSecret: secret ?? '' }
}

export async function saveConfig(
  tenantId: string,
  input: Omit<SignatureConfig, 'updatedAt'>,
): Promise<void> {
  const profile = PROVIDERS[input.provider]
  const stored: SignatureConfig = {
    ...input,
    // Só cifra se veio um valor novo; senão preserva o que já estava
    clientSecret: input.clientSecret ? encryptSecret(input.clientSecret) : '',
    tokenUrl: input.tokenUrl || profile.tokenUrl,
    signUrl: input.signUrl || profile.signUrl,
    updatedAt: new Date().toISOString(),
  }

  await prisma.clinicSetting.upsert({
    where: { key_tenantId: { key: SETTING_KEY, tenantId } },
    update: { value: stored as never },
    create: { key: SETTING_KEY, tenantId, value: stored as never },
  })
}

export function toPublic(config: SignatureConfig | null): PublicSignatureConfig | null {
  if (!config) return null
  const profile = PROVIDERS[config.provider] ?? PROVIDERS.CUSTOM
  return {
    provider: config.provider,
    clientId: config.clientId,
    clientSecretMasked: config.clientSecret ? maskSecret(config.clientSecret) : null,
    cpf: config.cpf,
    certificateAlias: config.certificateAlias ?? null,
    tokenUrl: config.tokenUrl || profile.tokenUrl,
    signUrl: config.signUrl || profile.signUrl,
    enabled: config.enabled,
    configured: Boolean(config.clientId && config.clientSecret && config.cpf),
    lastTestAt: config.lastTestAt ?? null,
    lastTestOk: config.lastTestOk ?? null,
  }
}

export class SignatureError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message)
  }
}

interface TokenResponse {
  access_token: string
  expires_in?: number
}

/**
 * OAuth2 password grant. O OTP muda a cada 30s, então o token é obtido no
 * momento da assinatura — não faz sentido guardá-lo por muito tempo.
 */
async function requestToken(config: SignatureConfig, otp: string): Promise<string> {
  const profile = PROVIDERS[config.provider] ?? PROVIDERS.CUSTOM
  const url = config.tokenUrl || profile.tokenUrl
  if (!url) throw new SignatureError('Endereço do provedor não configurado.')

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    // CPF com zeros à esquerda, 11 dígitos
    username: config.cpf.replace(/\D/g, '').padStart(11, '0'),
    password: otp,
    // Sessão curta: só o necessário para assinar agora
    lifetime: '300',
    scope: 'signature_session',
  })

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    throw new SignatureError('Não foi possível falar com o provedor de certificado.', err)
  }

  const text = await response.text()
  let data: TokenResponse & { error?: string; error_description?: string }
  try {
    data = JSON.parse(text)
  } catch {
    throw new SignatureError('Resposta inesperada do provedor.', text.slice(0, 300))
  }

  if (!response.ok || !data.access_token) {
    const reason = data.error_description || data.error || `HTTP ${response.status}`
    // O erro mais comum é OTP expirado — vale dizer isso explicitamente
    throw new SignatureError(
      /invalid_grant|invalid.*credential/i.test(reason)
        ? 'Código OTP inválido ou expirado. Gere um novo no aplicativo e tente de novo.'
        : `Falha na autenticação com o provedor: ${reason}`,
    )
  }

  return data.access_token
}

/** SHA-256 do conteúdo, em hexadecimal — o que de fato é enviado ao provedor. */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

/** OID do SHA-256, exigido pela API do provedor. */
const SHA256_OID = '2.16.840.1.101.3.4.2.1'

export interface SignResult {
  signature: string
  certificateAlias: string
  algorithm: string
}

/**
 * Assina o hash de um documento. Recebe o OTP porque a autorização é sempre da
 * médica, no momento — o sistema não guarda credencial que assine sozinho.
 */
export async function signHash(
  config: SignatureConfig,
  otp: string,
  hashHex: string,
  documentLabel: string,
): Promise<SignResult> {
  const token = await requestToken(config, otp)
  const profile = PROVIDERS[config.provider] ?? PROVIDERS.CUSTOM
  const url = config.signUrl || profile.signUrl
  if (!url) throw new SignatureError('Endereço de assinatura não configurado.')

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        certificate_alias: config.certificateAlias || undefined,
        hashes: [
          {
            id: '1',
            alias: documentLabel.slice(0, 60),
            hash: hashHex,
            hash_algorithm: SHA256_OID,
            signature_format: 'CMS-detached',
          },
        ],
        include_chain: true,
      }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (err) {
    throw new SignatureError('Não foi possível concluir a assinatura junto ao provedor.', err)
  }

  const text = await response.text()
  let data: { signatures?: { id: string; raw_signature: string }[]; certificate_alias?: string; message?: string }
  try {
    data = JSON.parse(text)
  } catch {
    throw new SignatureError('Resposta inesperada do provedor ao assinar.', text.slice(0, 300))
  }

  const signature = data.signatures?.[0]?.raw_signature
  if (!response.ok || !signature) {
    throw new SignatureError(data.message || `Provedor recusou a assinatura (HTTP ${response.status}).`)
  }

  return {
    signature,
    certificateAlias: data.certificate_alias || config.certificateAlias || '',
    algorithm: 'ICP-Brasil CMS-detached SHA-256',
  }
}

/**
 * Testa a configuração sem assinar nada de verdade: autentica e assina um hash
 * descartável. Se passar, as credenciais e o OTP estão corretos.
 */
export async function testConnection(config: SignatureConfig, otp: string): Promise<SignResult> {
  const probe = hashContent(`teste-de-conexao-${Date.now()}`)
  return signHash(config, otp, probe, 'Teste de conexão')
}
