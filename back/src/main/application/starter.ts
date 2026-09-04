import { loadConfig } from './config'
import { AwilixIocContainer } from './ioc/awilix/awilix-ioc-container'
import '../utils/date'

import type { IocContainer } from '../types/application/ioc'
import type { Config } from './config'

const startIocContainer = (config: Config): AwilixIocContainer => {
  return new AwilixIocContainer(config)
}

const startApp = async (): Promise<IocContainer> => {
  const config = loadConfig()
  const iocContainer = startIocContainer(config)
  const { httpServer, configService, questsDomain } = iocContainer.instances

  await httpServer.configure()
  await configService.bootstrap()
  // Ajoute les quêtes manquantes avant d'ouvrir le trafic : le seed Prisma
  // vide toutes les tables, il ne peut pas servir sur une base vivante.
  await questsDomain.bootstrap()
  await httpServer.start()

  const { activityDomain, logger } = iocContainer.instances
  void activityDomain
    .purgeOlderThanDays(30)
    .catch((err: unknown) =>
      logger.warn(`[starter] purgeOlderThanDays boot failed: ${String(err)}`),
    )
  setInterval(
    () =>
      void activityDomain
        .purgeOlderThanDays(30)
        .catch((err: unknown) =>
          logger.warn(
            `[starter] purgeOlderThanDays daily tick failed: ${String(err)}`,
          ),
        ),
    24 * 60 * 60 * 1000,
  ).unref()

  return iocContainer.instances
}

export { startApp, startIocContainer }
