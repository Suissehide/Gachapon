import type { Multipart } from '@fastify/multipart'
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { CardRarity } from '../../../../../../generated/enums'
import {
  adminCardFieldsSchema,
  adminCardIdParamSchema,
  adminCardsQuerySchema,
  adminCardUpdateBodySchema,
} from '../../schemas/admin-cards.schema'
import { ALLOWED_IMAGE_MIME, uploadCardImage } from './card-image.helpers'

async function parseMultipartCard(request: {
  parts: () => AsyncIterableIterator<Multipart>
}): Promise<{
  fields: Record<string, string>
  imageBuffer: Buffer | null
  imageMime: string
}> {
  const parts = request.parts()
  const fields: Record<string, string> = {}
  let imageBuffer: Buffer | null = null
  let imageMime = ''

  for await (const part of parts) {
    if (part.type === 'file') {
      if (!ALLOWED_IMAGE_MIME.has(part.mimetype)) {
        throw Boom.badRequest('Image must be jpeg, png or webp')
      }
      imageMime = part.mimetype
      const chunks: Buffer[] = []
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer)
      }
      imageBuffer = Buffer.concat(chunks)
      if (imageBuffer.length > 5 * 1024 * 1024) {
        throw Boom.badRequest('Image too large (max 5 MB)')
      }
    } else {
      fields[part.fieldname] = part.value as string
    }
  }

  return { fields, imageBuffer, imageMime }
}

export const adminCardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { cardRepository, storageClient } = fastify.iocContainer

  const resolve = (imageUrl: string | null) =>
    imageUrl ? storageClient.publicUrl(imageUrl) : null

  const resolveCard = <T extends { imageUrl: string | null }>(card: T) => ({
    ...card,
    imageUrl: resolve(card.imageUrl),
  })

  fastify.get(
    '/',
    { schema: { querystring: adminCardsQuerySchema } },
    async (request) => {
      const cards = await cardRepository.findAll({
        setId: request.query.setId,
        rarity: request.query.rarity as CardRarity,
      })
      return { cards: cards.map(resolveCard) }
    },
  )

  fastify.post('/', async (request, reply) => {
    const { fields, imageBuffer, imageMime } = await parseMultipartCard(request)

    const parsed = adminCardFieldsSchema.safeParse(fields)
    if (!parsed.success) {
      throw Boom.badRequest(parsed.error.toString())
    }

    let imageKey: string
    if (imageBuffer) {
      imageKey = (
        await uploadCardImage(
          storageClient,
          parsed.data.name,
          imageBuffer,
          imageMime,
        )
      ).key
    } else if (fields.imageUrl) {
      imageKey = storageClient.toKey(fields.imageUrl)
    } else {
      throw Boom.badRequest('Either an image file or imageUrl is required')
    }

    const card = await cardRepository.create({ ...parsed.data, imageUrl: imageKey })
    return reply.status(201).send(resolveCard(card))
  })

  fastify.patch(
    '/:id',
    {
      schema: {
        params: adminCardIdParamSchema,
        body: adminCardUpdateBodySchema,
      },
    },
    async (request) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) {
        throw Boom.notFound('Card not found')
      }

      const data = { ...request.body }
      if (data.imageUrl) {
        data.imageUrl = storageClient.toKey(data.imageUrl)
      }

      return resolveCard(await cardRepository.update(request.params.id, data))
    },
  )

  fastify.post(
    '/:id/image',
    { schema: { params: adminCardIdParamSchema } },
    async (request, reply) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) {
        throw Boom.notFound('Card not found')
      }

      const { imageBuffer, imageMime } = await parseMultipartCard(request)
      if (!imageBuffer) {
        throw Boom.badRequest('No image provided')
      }
      const { key: imageKey } = await uploadCardImage(
        storageClient,
        card.name,
        imageBuffer,
        imageMime,
      )

      const updated = await cardRepository.update(request.params.id, {
        imageUrl: imageKey,
      })
      return reply.status(200).send(resolveCard(updated))
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: adminCardIdParamSchema } },
    async (request, reply) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) {
        throw Boom.notFound('Card not found')
      }
      await cardRepository.delete(request.params.id)
      return reply.status(204).send()
    },
  )
}
