import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomToken } from './security'

const endpoint = process.env.S3_ENDPOINT
const region = process.env.S3_REGION || 'us-east-1'
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
export const s3Bucket = process.env.S3_BUCKET || ''
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL

export const storageConfigured = Boolean(s3Bucket && accessKeyId && secretAccessKey)

const opcoesComuns = {
  region,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
}

/** Fala com o MinIO pela rede interna: e o caminho curto, sem sair do host. */
const s3 = storageConfigured ? new S3Client({ ...opcoesComuns, endpoint }) : null

/**
 * Assina URLs que o navegador vai abrir.
 *
 * A assinatura da AWS cobre o host, entao nao adianta trocar o endereco depois
 * de assinar - a URL passa a nao conferir. Por isso este cliente assina ja com
 * o endereco publico: `S3_ENDPOINT` aponta para `minio:9000`, que so existe
 * dentro do Docker e em HTTP, e o navegador numa pagina HTTPS recusa por
 * conteudo misto antes mesmo de tentar.
 *
 * Sem `S3_PUBLIC_BASE_URL` configurado, cai no cliente interno: em
 * desenvolvimento os dois endereços são o mesmo.
 */
const publicEndpoint = publicBaseUrl
  // De "https://host/files" sobra "https://host": o caminho do bucket entra
  // depois, montado pelo proprio SDK.
  ? publicBaseUrl.replace(/\/files\/?$/, '').replace(/\/$/, '')
  : endpoint

const s3Public = storageConfigured
  ? new S3Client({ ...opcoesComuns, endpoint: publicEndpoint })
  : null

/**
 * Prefixo do que pode ser lido sem assinatura.
 *
 * O bucket guarda prontuário e foto de paciente, então é privado por padrão e
 * a leitura passa por link assinado. Logo e imagem de site precisam abrir
 * direto — num documento impresso ou numa landing não há como assinar cada
 * requisição —, e ficam sob este prefixo, o único liberado no MinIO.
 */
export const PUBLIC_PREFIX = 'public'

export function buildStorageKey(tenantId: string, fileName: string, options?: { publico?: boolean }): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const chave = `${tenantId}/${new Date().toISOString().slice(0, 10)}/${randomToken(16)}-${safeName}`
  return options?.publico ? `${PUBLIC_PREFIX}/${chave}` : chave
}

export async function presignUpload(key: string, contentType: string): Promise<string> {
  if (!s3Public) throw new Error('S3 storage is not configured')
  return getSignedUrl(s3Public, new PutObjectCommand({ Bucket: s3Bucket, Key: key, ContentType: contentType }), { expiresIn: 900 })
}

export async function presignDownload(key: string): Promise<string> {
  if (!s3Public) throw new Error('S3 storage is not configured')
  return getSignedUrl(s3Public, new GetObjectCommand({ Bucket: s3Bucket, Key: key }), { expiresIn: 900 })
}

export function publicFileUrl(key: string): string {
  if (publicBaseUrl) return `${publicBaseUrl.replace(/\/$/, '')}/${key}`
  if (endpoint) return `${endpoint.replace(/\/$/, '')}/${s3Bucket}/${key}`
  return `s3://${s3Bucket}/${key}`
}
