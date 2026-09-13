import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsync } from 'fastify/types/plugin'
import fastifyPlugin from 'fastify-plugin'

const ormPlugin: FastifyPluginAsync = fastifyPlugin(
  (fastify: FastifyInstance) => {
    const { postgresOrm, backgroundTasks, logger } = fastify.iocContainer
    fastify.addHook('onReady', async () => {
      await postgresOrm.start()
    })
    fastify.addHook('onClose', async () => {
      // Le drain est ICI, juste avant `stop()`, et non dans un plugin dedie :
      // l'ordre compte et on ne veut pas dependre de celui des hooks `onClose`.
      // Une tache de fond ecrit en base ; la laisser en vol pendant le
      // `$disconnect` perdait son ecriture ET suspendait la fermeture pendant
      // les 5 s du delai de sa transaction Serializable.
      if (backgroundTasks.pending() > 0) {
        logger.debug(
          `Attente de ${backgroundTasks.pending()} tâche(s) de fond avant fermeture…`,
        )
        await backgroundTasks.drain()
      }
      await postgresOrm.stop()
    })
    return Promise.resolve()
  },
)

export { ormPlugin }
