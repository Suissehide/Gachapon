import Boom from '@hapi/boom'

import type { StorageClientInterface } from '../../../../../types/infra/storage/storage-client'

export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\-.]/g, '-')
    .toLowerCase()
}

/**
 * Upload a card image buffer to storage.
 * The storage key is: `cards/{sanitized-name}.{ext}`
 * Returns `{ key, url }`.
 */
export async function uploadCardImage(
  storageClient: StorageClientInterface,
  name: string,
  buffer: Buffer,
  mimetype: string,
): Promise<{ key: string }> {
  if (!ALLOWED_IMAGE_MIME.has(mimetype)) {
    throw Boom.badRequest('Image must be jpeg, png or webp')
  }
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw Boom.badRequest('Image too large (max 5 MB)')
  }
  const ext = mimetype.split('/')[1]
  const key = `cards/${sanitizeName(name)}.${ext}`
  await storageClient.upload(key, buffer, mimetype)
  return { key }
}
