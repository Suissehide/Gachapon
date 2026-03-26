import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const rewardSchema = z.object({
  tokens: z.number().int().min(0),
  dust: z.number().int().min(0),
  xp: z.number().int().min(0),
})

export const adminStreakRouter: FastifyPluginCallbackZod = (fastify) => {
  const prisma = () => fastify.iocContainer.postgresOrm.prisma

  // GET /admin/streak — returns default reward and all active milestone rows
  fastify.get('/', async () => {
    const defaultRow = await prisma().streakMilestone.findFirst({
      where: { day: 0 },
      include: { reward: true },
    })
    const milestones = await prisma().streakMilestone.findMany({
      where: { isActive: true, day: { gt: 0 } },
      include: { reward: true },
      orderBy: { day: 'asc' },
    })
    return {
      default: defaultRow?.reward ?? null,
      defaultMilestoneId: defaultRow?.id ?? null,
      milestones: milestones.map((m) => ({
        id: m.id,
        day: m.day,
        tokens: m.reward.tokens,
        dust: m.reward.dust,
        xp: m.reward.xp,
      })),
    }
  })

  // PATCH /admin/streak/default — update the day=0 default reward values
  fastify.patch(
    '/default',
    { schema: { body: rewardSchema.partial() } },
    async (request) => {
      const defaultRow = await prisma().streakMilestone.findFirst({ where: { day: 0 } })
      if (!defaultRow) {
        throw Boom.notFound('Default streak milestone not found. Run the migration first.')
      }
      const updated = await prisma().reward.update({
        where: { id: defaultRow.rewardId },
        data: request.body,
      })
      return { tokens: updated.tokens, dust: updated.dust, xp: updated.xp }
    },
  )

  // POST /admin/streak/milestones — create a new milestone
  fastify.post(
    '/milestones',
    {
      schema: {
        body: rewardSchema.extend({ day: z.number().int().min(1) }),
      },
    },
    async (request, reply) => {
      const { day, tokens, dust, xp } = request.body

      // Check for duplicate day (day @unique constraint)
      const existing = await prisma().streakMilestone.findFirst({ where: { day } })
      if (existing) {
        throw Boom.conflict(`A milestone for day ${day} already exists.`)
      }

      const reward = await prisma().reward.create({ data: { tokens, dust, xp } })
      const milestone = await prisma().streakMilestone.create({
        data: { day, isMilestone: true, isActive: true, rewardId: reward.id },
        include: { reward: true },
      })

      return reply.status(201).send({
        id: milestone.id,
        day: milestone.day,
        tokens: milestone.reward.tokens,
        dust: milestone.reward.dust,
        xp: milestone.reward.xp,
      })
    },
  )

  // PATCH /admin/streak/milestones/:id — update reward values for a milestone
  fastify.patch(
    '/milestones/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: rewardSchema.partial(),
      },
    },
    async (request) => {
      const milestone = await prisma().streakMilestone.findUnique({
        where: { id: request.params.id },
        include: { reward: true },
      })
      if (!milestone) {
        throw Boom.notFound('Milestone not found')
      }
      const updated = await prisma().reward.update({
        where: { id: milestone.rewardId },
        data: request.body,
      })
      return {
        id: milestone.id,
        day: milestone.day,
        tokens: updated.tokens,
        dust: updated.dust,
        xp: updated.xp,
      }
    },
  )

  // DELETE /admin/streak/milestones/:id — soft delete (isActive = false)
  // Cannot delete the day=0 default row.
  fastify.delete(
    '/milestones/:id',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const milestone = await prisma().streakMilestone.findUnique({
        where: { id: request.params.id },
      })
      if (!milestone) {
        throw Boom.notFound('Milestone not found')
      }
      if (milestone.day === 0) {
        throw Boom.forbidden('Cannot delete the default daily milestone.')
      }
      await prisma().streakMilestone.update({
        where: { id: request.params.id },
        data: { isActive: false },
      })
      return reply.status(204).send()
    },
  )
}
