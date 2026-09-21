import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { missingTranslationsResponseSchema } from '../../schemas/admin-translations.schema'

export const adminTranslationsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { adminTranslationsRepository } = fastify.iocContainer

  fastify.get(
    '/translations/missing',
    { schema: { response: { 200: missingTranslationsResponseSchema } } },
    async () => ({
      entries: await adminTranslationsRepository.findMissingTranslations(),
    }),
  )
}
