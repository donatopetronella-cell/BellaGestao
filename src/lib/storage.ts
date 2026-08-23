import 'server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getEnv } from './env'
import { validationError } from './errors'

/**
 * Photo storage. Client photos are personal data, so they are never public:
 * objects are read back through an authenticated route.
 *
 * Two drivers — the local filesystem (development) and Supabase Storage
 * (production, enabled by SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */
export interface StoredObject {
  bytes: Uint8Array
  contentType: string
}

export interface StorageDriver {
  readonly name: 'local' | 'supabase'
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<StoredObject | null>
  remove(key: string): Promise<void>
}

const LOCAL_ROOT = path.join(process.cwd(), '.storage')

const localDriver: StorageDriver = {
  name: 'local',
  async put(key, bytes) {
    const target = path.join(LOCAL_ROOT, key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, bytes)
  },
  async get(key) {
    try {
      const bytes = await readFile(path.join(LOCAL_ROOT, key))
      return { bytes: new Uint8Array(bytes), contentType: contentTypeFor(key) }
    } catch {
      return null
    }
  },
  async remove(key) {
    await unlink(path.join(LOCAL_ROOT, key)).catch(() => undefined)
  },
}

function supabaseDriver(url: string, serviceKey: string, bucket: string): StorageDriver {
  const base = `${url.replace(/\/$/, '')}/storage/v1/object`
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  }

  return {
    name: 'supabase',
    async put(key, bytes, contentType) {
      const response = await fetch(`${base}/${bucket}/${key}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'true' },
        body: bytes as unknown as BodyInit,
      })
      if (!response.ok) {
        throw new Error(`Supabase Storage upload failed: ${response.status}`)
      }
    },
    async get(key) {
      const response = await fetch(`${base}/${bucket}/${key}`, { headers })
      if (!response.ok) return null
      const buffer = await response.arrayBuffer()
      return {
        bytes: new Uint8Array(buffer),
        contentType: response.headers.get('content-type') ?? contentTypeFor(key),
      }
    },
    async remove(key) {
      await fetch(`${base}/${bucket}/${key}`, { method: 'DELETE', headers }).catch(
        () => undefined,
      )
    },
  }
}

let cachedDriver: StorageDriver | null = null

export function getStorage(): StorageDriver {
  if (cachedDriver) return cachedDriver
  const env = getEnv()
  cachedDriver =
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? supabaseDriver(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
          env.SUPABASE_STORAGE_BUCKET,
        )
      : localDriver
  return cachedDriver
}

export function resetStorageCache(): void {
  cachedDriver = null
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

function contentTypeFor(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    default:
      return 'image/jpeg'
  }
}

export interface UploadedPhoto {
  storagePath: string
  bytes: number
}

/** Validates and stores an uploaded photo under the tenant's prefix. */
export async function storeClientPhoto(
  tenantId: string,
  clientId: string,
  file: File,
): Promise<UploadedPhoto> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw validationError('Envie uma imagem JPG, PNG, WEBP ou AVIF.')
  }
  if (file.size === 0) {
    throw validationError('Selecione uma imagem.')
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw validationError('A imagem deve ter no máximo 8 MB.')
  }

  const extension = EXTENSION_BY_TYPE[file.type] ?? 'jpg'
  const key = `${tenantId}/clients/${clientId}/${randomUUID()}.${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  await getStorage().put(key, bytes, file.type)

  return { storagePath: key, bytes: file.size }
}
