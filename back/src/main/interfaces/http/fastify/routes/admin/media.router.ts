import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const SAFE_KEY_RE = /^cards\/[^/]+$/

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-\.]/g, '-').toLowerCase()
}

export const adminMediaRouter: FastifyPluginCallbackZod = (fastify) => {
  // GET /admin/media — liste tous les objets + cross-ref DB
  fastify.get('/', async () => {
    const { storageClient, postgresOrm } = fastify.iocContainer

    const [objects, cards] = await Promise.all([
      storageClient.listObjects('cards/'),
      postgresOrm.prisma.card.findMany({
        select: { imageUrl: true, id: true, name: true, rarity: true, variant: true },
      }),
    ])

    const urlToCard = new Map(cards.map((c) => [c.imageUrl, c]))

    return objects.map((obj) => {
      const url = storageClient.publicUrl(obj.key)
      const card = urlToCard.get(url) ?? null
      return {
        key: obj.key,
        url,
        size: obj.size,
        lastModified: obj.lastModified,
        orphan: card === null,
        card: card
          ? { id: card.id, name: card.name, rarity: card.rarity, variant: card.variant }
          : null,
      }
    })
  })

  // POST /admin/media/upload — upload multi-fichiers
  fastify.post('/upload', async (request) => {
    const { storageClient } = fastify.iocContainer
    const parts = request.parts()
    const created: unknown[] = []
    const errors: { filename: string; reason: string }[] = []

    for await (const part of parts) {
      if (part.type !== 'file') continue

      const filename = part.filename ?? 'upload'

      if (!ALLOWED_MIME.has(part.mimetype)) {
        // Drain the stream
        for await (const _ of part.file) {}
        errors.push({ filename, reason: 'Format non supporté (jpeg, png, webp uniquement)' })
        continue
      }

      const chunks: Buffer[] = []
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer)
      }
      const buffer = Buffer.concat(chunks)

      if (buffer.length > 5 * 1024 * 1024) {
        errors.push({ filename, reason: 'Fichier trop grand (max 5 MB)' })
        continue
      }

      const ext = part.mimetype.split('/')[1]
      const base = sanitizeFilename(filename.replace(/\.[^.]+$/, ''))
      const key = `cards/${Date.now()}-${base}.${ext}`

      try {
        await storageClient.upload(key, buffer, part.mimetype)
        const url = storageClient.publicUrl(key)
        created.push({
          key,
          url,
          size: buffer.length,
          lastModified: new Date(),
          orphan: true,
          card: null,
        })
      } catch {
        errors.push({ filename, reason: "Erreur lors de l'upload" })
      }
    }

    return { created, errors }
  })

  // DELETE /admin/media — suppression atomique d'orphelines
  fastify.delete(
    '/',
    {
      schema: {
        body: z.object({ keys: z.array(z.string()).min(1) }),
      },
    },
    async (request) => {
      const { storageClient, postgresOrm } = fastify.iocContainer
      const { keys } = request.body

      // Valider format de chaque clé
      for (const key of keys) {
        if (!SAFE_KEY_RE.test(key)) {
          throw Boom.badRequest(`Clé invalide : ${key}`)
        }
      }

      // Vérifier qu'aucune clé n'est référencée en base
      const urls = keys.map((k) => storageClient.publicUrl(k))
      const usedCards = await postgresOrm.prisma.card.findMany({
        where: { imageUrl: { in: urls } },
        select: { name: true, imageUrl: true },
      })

      if (usedCards.length > 0) {
        const names = usedCards.map((c) => c.name).join(', ')
        throw Boom.badRequest(`Image(s) utilisée(s) par : ${names}`)
      }

      // Supprimer
      await Promise.all(keys.map((k) => storageClient.delete(k)))

      return { deleted: keys }
    },
  )
}
