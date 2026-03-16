import { loadConfig } from '../../main/application/config'
import { AwilixIocContainer } from '../../main/application/ioc/awilix/awilix-ioc-container'

export async function buildTestApp() {
  const config = loadConfig()
  const ioc = new AwilixIocContainer(config)
  const server = ioc.instances.httpServer as any
  await server.configure()
  return server.fastify
}
