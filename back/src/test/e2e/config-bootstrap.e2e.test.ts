import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../helpers/build-test-app'

/**
 * Une migration de données écrit GlobalConfig directement en base, juste
 * avant le démarrage de l'app. Le bootstrap doit purger le cache Redis des
 * clés de config, sinon l'ancienne valeur survit jusqu'à 5 minutes.
 */
describe('ConfigService.bootstrap — cache Redis', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let ioc: any
  const key = 'combat.defMitigationRef'

  beforeAll(async () => {
    app = await buildTestApp()
    ioc = (app as any).iocContainer
  })

  afterAll(async () => {
    await ioc.configService.set(key, 1000)
    await app.close()
  })

  it('une valeur écrite en base par une migration est lue dès le démarrage', async () => {
    await ioc.configService.set(key, 1000)
    expect(await ioc.configService.get(key)).toBe(1000)

    await ioc.postgresOrm.prisma.globalConfig.update({
      where: { key },
      data: { value: '777' },
    })
    await ioc.configService.bootstrap()

    expect(await ioc.configService.get(key)).toBe(777)
  })
})
