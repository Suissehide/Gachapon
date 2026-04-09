import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { StorageClientInterface } from '../../../../../types/infra/storage/storage-client'
import {
  adminMediaDeleteBodySchema,
  adminMediaRenameBodySchema,
} from '../../schemas/admin-media.schema'
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_SIZE,
  sanitizeName,
  uploadCardImage,
} from './card-image.helpers'

const SAFE_KEY_RE = /^cards\/[^/]+$/

type UploadResult = { ok: true; entry: unknown } | { ok: false; reason: string }

async function processUploadPart(
  storageClient: StorageClientInterface,
  part: {
    mimetype: string
    filename?: string
    file: AsyncIterable<unknown> & { truncated?: boolean }
  },
): Promise<UploadResult> {
  const filename = part.filename ?? 'upload'

  if (!ALLOWED_IMAGE_MIME.has(part.mimetype)) {
    await drainFilePart(part)
    return {
      ok: false,
      reason: 'Format non supporté (jpeg, png, webp uniquement)',
    }
  }

  const buffer = await readFilePart(part)

  if (part.file.truncated || buffer.length > MAX_IMAGE_SIZE) {
    return { ok: false, reason: 'Fichier trop grand (max 5 MB)' }
  }

  const name = filename.replace(/\.[^.]+$/, '')

  try {
    const { key } = await uploadCardImage(
      storageClient,
      name,
      buffer,
      part.mimetype,
    )
    return {
      ok: true,
      entry: {
        key,
        url: storageClient.publicUrl(key),
        size: buffer.length,
        lastModified: new Date(),
        orphan: true,
        card: null,
      },
    }
  } catch {
    return { ok: false, reason: "Erreur lors de l'upload" }
  }
}

async function readFilePart(part: {
  file: AsyncIterable<unknown>
}): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of part.file) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

async function drainFilePart(part: {
  file: AsyncIterable<unknown>
}): Promise<void> {
  for await (const _ of part.file) {
    // drain the stream
  }
}

function buildRenameKeys(
  from: string,
  newName: string,
): { sanitized: string; ext: string; to: string } {
  if (!SAFE_KEY_RE.test(from)) {
    throw Boom.badRequest('Clé invalide')
  }
  if (newName.includes('.')) {
    throw Boom.badRequest('Le nom ne peut pas contenir de point')
  }

  const sanitized = sanitizeName(newName)
  if (!sanitized || sanitized.replace(/-/g, '').length === 0) {
    throw Boom.badRequest('Nom invalide')
  }

  const ext = from.split('.').pop()
  if (!ext || ext.includes('/')) {
    throw Boom.badRequest('Clé source sans extension valide')
  }

  const to = `cards/${sanitized}.${ext}`
  if (!SAFE_KEY_RE.test(to)) {
    throw Boom.badRequest('Clé destination invalide')
  }
  if (to === from) {
    throw Boom.badRequest('Le nom est identique')
  }

  return { sanitized, ext, to }
}

export const adminMediaRouter: FastifyPluginCallbackZod = (fastify) => {
  const { storageClient, cardRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    const [objects, cards] = await Promise.all([
      storageClient.listObjects('cards/'),
      cardRepository.findAllForMedia(),
    ])

    const keyToCard = new Map(cards.map((c) => [c.imageUrl, c]))

    return objects.map((obj) => {
      const card = keyToCard.get(obj.key) ?? null
      return {
        key: obj.key,
        url: storageClient.publicUrl(obj.key),
        size: obj.size,
        lastModified: obj.lastModified,
        orphan: card === null,
        card: card
          ? { id: card.id, name: card.name, rarity: card.rarity }
          : null,
      }
    })
  })

  fastify.post('/upload', async (request) => {
    const parts = request.parts()
    const created: unknown[] = []
    const errors: { filename: string; reason: string }[] = []

    for await (const part of parts) {
      if (part.type !== 'file') {
        continue
      }
      const filename = part.filename ?? 'upload'
      const result = await processUploadPart(storageClient, part)
      if (result.ok) {
        created.push(result.entry)
      } else {
        errors.push({ filename, reason: result.reason })
      }
    }

    return { created, errors }
  })

  fastify.delete(
    '/',
    { schema: { body: adminMediaDeleteBodySchema } },
    async (request) => {
      const { keys } = request.body

      for (const key of keys) {
        if (!SAFE_KEY_RE.test(key)) {
          throw Boom.badRequest(`Clé invalide : ${key}`)
        }
      }

      const usedCards = await cardRepository.findByImageUrls(keys)

      if (usedCards.length > 0) {
        const names = usedCards.map((c) => c.name).join(', ')
        throw Boom.badRequest(`Image(s) utilisée(s) par : ${names}`)
      }

      const results = await Promise.allSettled(
        keys.map((k) => storageClient.delete(k)),
      )
      const deleted = keys.filter((_, i) => results[i]?.status === 'fulfilled')
      const failed = keys.filter((_, i) => results[i]?.status === 'rejected')

      if (failed.length > 0) {
        throw Boom.internal(`Échec de suppression pour : ${failed.join(', ')}`)
      }

      return { deleted }
    },
  )

  fastify.patch(
    '/rename',
    { schema: { body: adminMediaRenameBodySchema } },
    async (request) => {
      const { from, newName } = request.body
      const { to } = buildRenameKeys(from, newName)

      if (!(await storageClient.exists(from))) {
        throw Boom.notFound('Média introuvable')
      }
      if (await storageClient.exists(to)) {
        throw Boom.conflict('Ce nom est déjà utilisé')
      }

      await storageClient.copy(from, to)

      try {
        await storageClient.delete(from)
      } catch (deleteErr) {
        request.log.warn(
          { err: deleteErr, key: from },
          'Failed to delete source after copy — key becomes orphaned',
        )
      }

      await cardRepository.updateManyImageUrl(from, to)

      return { key: to, url: storageClient.publicUrl(to) }
    },
  )
}
