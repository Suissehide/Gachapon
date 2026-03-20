import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

const cardFieldsSchema = z.object({
  name: z.string().min(1),
  setId: z.string().uuid(),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']),
  variant: z.enum(['BRILLIANT', 'HOLOGRAPHIC']).optional(),
  dropWeight: z.coerce.number().positive(),
})

async function parseMultipartCard(request: {
  parts: () => AsyncIterable<any>
}): Promise<{
  fields: Record<string, string>
  imageBuffer: Buffer
  imageMime: string
}> {
  const parts = request.parts()
  const fields: Record<string, string> = {}
  let imageBuffer: Buffer | null = null
  let imageMime = ''

  for await (const part of parts) {
    if (part.type === 'file') {
      if (!ALLOWED_MIME.has(part.mimetype)) {
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

  if (!imageBuffer) {
    throw Boom.badRequest('Image file is required')
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

  // POST /admin/cards — multipart/form-data
  fastify.post('/', async (request, reply) => {
    const { minioClient, postgresOrm } = fastify.iocContainer

    const { fields, imageBuffer, imageMime } = await parseMultipartCard(request)

    const parsed = cardFieldsSchema.safeParse(fields)
    if (!parsed.success) {
      throw Boom.badRequest(parsed.error.toString())
    }

    const ext = imageMime.split('/')[1]
    const key = `cards/${Date.now()}-${parsed.data.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`
    await minioClient.upload(key, imageBuffer, imageMime)
    const imageUrl = minioClient.publicUrl(key)

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
          rarity: z
            .enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])
            .optional(),
          variant: z.enum(['BRILLIANT', 'HOLOGRAPHIC']).nullable().optional(),
          dropWeight: z.number().positive().optional(),
          setId: z.string().uuid().optional(),
        }),
      },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const card = await postgresOrm.prisma.card.findUnique({
        where: { id: request.params.id },
      })
      if (!card) {
        throw Boom.notFound('Card not found')
      }
      return postgresOrm.prisma.card.update({
        where: { id: request.params.id },
        data: request.body,
        include: { set: true },
      })
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
