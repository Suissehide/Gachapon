import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { ALLOWED_IMAGE_MIME, uploadCardImage } from './card-image.helpers'

const cardFieldsSchema = z.object({
  name: z.string().min(1),
  setId: z.string().uuid(),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']),
  dropWeight: z.coerce.number().positive(),
})

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
  fastify.get(
    '/',
    {
      schema: {
        querystring: z.object({
          setId: z.string().uuid().optional(),
          rarity: z
            .enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])
            .optional(),
        }),
      },
    },
    async (request) => {
      const cards = await fastify.iocContainer.postgresOrm.prisma.card.findMany(
        {
          where: {
            ...(request.query.setId ? { setId: request.query.setId } : {}),
            ...(request.query.rarity ? { rarity: request.query.rarity } : {}),
          },
          include: { set: true },
          orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
        },
      )
      return { cards }
    },
  )

  // POST /admin/cards — multipart/form-data (image file ou imageUrl)
  fastify.post('/', async (request, reply) => {
    const { storageClient, postgresOrm } = fastify.iocContainer

    const { fields, imageBuffer, imageMime } = await parseMultipartCard(request)

    const parsed = cardFieldsSchema.safeParse(fields)
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

    const card = await postgresOrm.prisma.card.create({
      data: { ...parsed.data, imageUrl },
      include: { set: true },
    })

    return reply.status(201).send(card)
  })

  // PATCH /admin/cards/:id — JSON only
  fastify.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(1).optional(),
          rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']).optional(),
          dropWeight: z.number().positive().optional(),
          setId: z.string().uuid().optional(),
          imageUrl: z.string().url().nullable().optional(),
        }),
      },
    },
    async (request) => {
      const { storageClient, postgresOrm } = fastify.iocContainer

      // Valider que imageUrl appartient bien au stockage configuré
      if (request.body.imageUrl) {
        const storagePrefix = storageClient.publicUrl('')
        if (!request.body.imageUrl.startsWith(storagePrefix)) {
          throw Boom.badRequest('imageUrl must point to the configured storage')
        }
      }

      const card = await postgresOrm.prisma.card.findUnique({
        where: { id: request.params.id },
      })
      if (!card) throw Boom.notFound('Card not found')

      return postgresOrm.prisma.card.update({
        where: { id: request.params.id },
        data: request.body,
        include: { set: true },
      })
    },
  )

  // POST /admin/cards/:id/image — remplace l'image par upload multipart
  fastify.post(
    '/:id/image',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const { storageClient, postgresOrm } = fastify.iocContainer

      const card = await postgresOrm.prisma.card.findUnique({
        where: { id: request.params.id },
      })
      if (!card) throw Boom.notFound('Card not found')

      const { fields: _fields, imageBuffer, imageMime } = await parseMultipartCard(request)
      const { url: imageUrl } = await uploadCardImage(storageClient, card.name, imageBuffer!, imageMime)

      const updated = await postgresOrm.prisma.card.update({
        where: { id: request.params.id },
        data: { imageUrl },
        include: { set: true },
      })
      return reply.status(200).send(updated)
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const { postgresOrm } = fastify.iocContainer
      const card = await postgresOrm.prisma.card.findUnique({
        where: { id: request.params.id },
      })
      if (!card) {
        throw Boom.notFound('Card not found')
      }
      await postgresOrm.prisma.card.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    },
  )
}
