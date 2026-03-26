import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { ALLOWED_IMAGE_MIME, MAX_IMAGE_SIZE, sanitizeName, uploadCardImage } from './card-image.helpers'

const SAFE_KEY_RE = /^cards\/[^/]+$/

export const adminMediaRouter: FastifyPluginCallbackZod = (fastify) => {
  // GET /admin/media — liste tous les objets + cross-ref DB
  fastify.get('/', async () => {
    const { storageClient, postgresOrm } = fastify.iocContainer

    const [objects, cards] = await Promise.all([
      storageClient.listObjects('cards/'),
      postgresOrm.prisma.card.findMany({
        select: { imageUrl: true, id: true, name: true, rarity: true },
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
          ? { id: card.id, name: card.name, rarity: card.rarity }
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

      if (!ALLOWED_IMAGE_MIME.has(part.mimetype)) {
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

      if (part.file.truncated || buffer.length > MAX_IMAGE_SIZE) {
        errors.push({ filename, reason: 'Fichier trop grand (max 5 MB)' })
        continue
      }

      const name = filename.replace(/\.[^.]+$/, '')

      try {
        const { key, url } = await uploadCardImage(storageClient, name, buffer, part.mimetype)
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

      // Supprimer — utiliser allSettled pour éviter une suppression partielle silencieuse
      const results = await Promise.allSettled(keys.map((k) => storageClient.delete(k)))
      const deleted = keys.filter((_, i) => results[i]?.status === 'fulfilled')
      const failed = keys.filter((_, i) => results[i]?.status === 'rejected')

      if (failed.length > 0) {
        throw Boom.internal(`Échec de suppression pour : ${failed.join(', ')}`)
      }

      return { deleted }
    },
  )

  // PATCH /admin/media/rename — renomme un objet storage + met à jour la carte liée
  fastify.patch(
    '/rename',
    {
      schema: {
        body: z.object({ from: z.string(), newName: z.string() }),
      },
    },
    async (request) => {
      const { storageClient, postgresOrm } = fastify.iocContainer
      const { from, newName } = request.body

      // 1. Valider format de `from`
      if (!SAFE_KEY_RE.test(from)) {
        throw Boom.badRequest('Clé invalide')
      }

      // 2. Rejeter les points dans newName (évite double extension)
      if (newName.includes('.')) {
        throw Boom.badRequest('Le nom ne peut pas contenir de point')
      }

      // 3. Sanitize
      const sanitized = sanitizeName(newName)
      if (!sanitized || sanitized.replace(/-/g, '').length === 0) {
        throw Boom.badRequest('Nom invalide')
      }

      // 4. Reconstruire la clé destination
      const ext = from.split('.').pop()
      const to = `cards/${sanitized}.${ext}`

      // 5. No-op
      if (to === from) {
        throw Boom.badRequest('Le nom est identique')
      }

      // 6. Vérifier que la source existe
      if (!(await storageClient.exists(from))) {
        throw Boom.notFound('Média introuvable')
      }

      // 7. Vérifier que la destination est libre
      if (await storageClient.exists(to)) {
        throw Boom.conflict('Ce nom est déjà utilisé')
      }

      // 8. Copier
      await storageClient.copy(from, to)

      // 9. Supprimer la source (best-effort — un orphelin est acceptable)
      try {
        await storageClient.delete(from)
      } catch (deleteErr) {
        request.log.warn({ err: deleteErr, key: from }, 'Failed to delete source after copy — key becomes orphaned')
      }

      // 10. Mettre à jour la carte liée si présente
      const oldUrl = storageClient.publicUrl(from)
      const newUrl = storageClient.publicUrl(to)
      await postgresOrm.prisma.card.updateMany({
        where: { imageUrl: oldUrl },
        data: { imageUrl: newUrl },
      })

      return { key: to, url: newUrl }
    },
  )
}
