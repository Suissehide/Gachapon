import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { ALLOWED_IMAGE_MIME, uploadCardImage } from './card-image.helpers'
import {
  adminCardFieldsSchema,
  adminCardIdParamSchema,
  adminCardUpdateBodySchema,
  adminCardsQuerySchema,
} from '../../schemas/admin-cards.schema'

async function parseMultipartCard(request: {
  parts: () => AsyncIterable<any>
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

  fastify.get(
    '/',
    { schema: { querystring: adminCardsQuerySchema } },
    async (request) => {
      const cards = await cardRepository.findAll({
        setId: request.query.setId,
        rarity: request.query.rarity as any,
      })
      return { cards }
    },
  )

  fastify.post('/', async (request, reply) => {
    const { fields, imageBuffer, imageMime } = await parseMultipartCard(request)

    const parsed = adminCardFieldsSchema.safeParse(fields)
    if (!parsed.success) {
      throw Boom.badRequest(parsed.error.toString())
    }

    let imageUrl: string
    if (imageBuffer) {
      imageUrl = (await uploadCardImage(storageClient, parsed.data.name, imageBuffer, imageMime)).url
    } else if (fields.imageUrl) {
      const storagePrefix = storageClient.publicUrl('')
      if (!fields.imageUrl.startsWith(storagePrefix)) {
        throw Boom.badRequest('imageUrl must point to the configured storage')
      }
      imageUrl = fields.imageUrl
    } else {
      throw Boom.badRequest('Either an image file or imageUrl is required')
    }

    const card = await cardRepository.create({ ...parsed.data, imageUrl })
    return reply.status(201).send(card)
  })

  fastify.patch(
    '/:id',
    { schema: { params: adminCardIdParamSchema, body: adminCardUpdateBodySchema } },
    async (request) => {
      if (request.body.imageUrl) {
        const storagePrefix = storageClient.publicUrl('')
        if (!request.body.imageUrl.startsWith(storagePrefix)) {
          throw Boom.badRequest('imageUrl must point to the configured storage')
        }
      }

      const card = await cardRepository.findById(request.params.id)
      if (!card) throw Boom.notFound('Card not found')

      return cardRepository.update(request.params.id, request.body)
    },
  )

  fastify.post(
    '/:id/image',
    { schema: { params: adminCardIdParamSchema } },
    async (request, reply) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) throw Boom.notFound('Card not found')

      const { imageBuffer, imageMime } = await parseMultipartCard(request)
      const { url: imageUrl } = await uploadCardImage(storageClient, card.name, imageBuffer!, imageMime)

      const updated = await cardRepository.update(request.params.id, { imageUrl })
      return reply.status(200).send(updated)
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: adminCardIdParamSchema } },
    async (request, reply) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) throw Boom.notFound('Card not found')
      await cardRepository.delete(request.params.id)
      return reply.status(204).send()
    },
  )
}
