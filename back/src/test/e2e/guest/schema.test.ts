import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import type { PostgresPrismaClient } from '../../../main/infra/orm/postgres-client'
import { buildTestApp } from '../../helpers/build-test-app'

describe('schéma invité', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: PostgresPrismaClient
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = app.iocContainer.postgresOrm.prisma
  })
  afterAll(async () => {
    await app.close()
  })

  it('accepte plusieurs comptes GUEST sans email', async () => {
    const a = await prisma.user.create({
      data: { username: `ga${suffix}`, role: 'GUEST', locale: 'EN' },
    })
    const b = await prisma.user.create({
      data: { username: `gb${suffix}`, role: 'GUEST', locale: 'EN' },
    })
    expect(a.email).toBeNull()
    expect(b.email).toBeNull()
    expect(a.pendingEmail).toBeNull()
  })
})
