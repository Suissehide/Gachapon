import type { FastifyInstance } from 'fastify'

import { loadConfig } from '../../main/application/config'
import { AwilixIocContainer } from '../../main/application/ioc/awilix/awilix-ioc-container'

/**
 * L'application e2e, typee. Le cradle expose `httpServer` et `configService`
 * derriere leurs interfaces : `HttpServer.instance` rend l'instance Fastify et
 * `ConfigServiceInterface.bootstrap()` est declare. Aucun `as any` n'est donc
 * necessaire ici — et comme les suites consomment le retour de cette fonction,
 * un `any` a cet endroit se propageait a toutes : `app.iocContainer` y perdait
 * le typage que `fastify-http-server.ts` lui donne pourtant.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const config = loadConfig()
  const ioc = new AwilixIocContainer(config)
  const server = ioc.instances.httpServer
  await server.configure()
  await ioc.instances.configService.bootstrap()
  return server.instance
}
