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

const s3 = storageConfigured
  ? new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    })
  : null

export function buildStorageKey(tenantId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  return `${tenantId}/${new Date().toISOString().slice(0, 10)}/${randomToken(16)}-${safeName}`
}

export async function presignUpload(key: string, contentType: string): Promise<string> {
  if (!s3) throw new Error('S3 storage is not configured')
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: s3Bucket, Key: key, ContentType: contentType }), { expiresIn: 900 })
}

export async function presignDownload(key: string): Promise<string> {
  if (!s3) throw new Error('S3 storage is not configured')
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: s3Bucket, Key: key }), { expiresIn: 900 })
}

export function publicFileUrl(key: string): string {
  if (publicBaseUrl) return `${publicBaseUrl.replace(/\/$/, '')}/${key}`
  if (endpoint) return `${endpoint.replace(/\/$/, '')}/${s3Bucket}/${key}`
  return `s3://${s3Bucket}/${key}`
}
