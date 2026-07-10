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
  const { httpServer, configService } = iocContainer.instances

  await httpServer.configure()
  await configService.bootstrap()
  await httpServer.start()

  const { activityDomain } = iocContainer.instances
  void activityDomain.purgeOlderThanDays(30)
  setInterval(
    () => void activityDomain.purgeOlderThanDays(30),
    24 * 60 * 60 * 1000,
  ).unref()

  return iocContainer.instances
}

export { startApp, startIocContainer }
