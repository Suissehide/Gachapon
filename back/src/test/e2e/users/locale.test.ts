import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import type { PostgresPrismaClient } from '../../../main/infra/orm/postgres-client'
import { buildTestApp } from '../../helpers/build-test-app'

describe('PATCH /users/me/locale', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: PostgresPrismaClient
  let cookies: string
  let userId: string
  const suffix = Date.now()
  const email = `locale${suffix}@test.com`

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = app.iocContainer.postgresOrm.prisma
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `locale${suffix}`,
        email,
        password: 'Password123!',
      },
    })
    const registered = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    userId = registered.id
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('ecrit FR en base — relu directement par Prisma, pas via l’API (200)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/locale',
      headers: { cookie: cookies },
      payload: { locale: 'FR' },
    })
    expect(res.statusCode).toBe(200)

    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(row.locale).toBe('FR')
  })

  it('400 sur une locale non geree', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/locale',
      headers: { cookie: cookies },
      payload: { locale: 'DE' },
    })
    expect(res.statusCode).toBe(400)

    // La locale ecrite par le test precedent ne doit pas avoir bouge.
    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(row.locale).toBe('FR')
  })

  it('401 sans authentification', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/locale',
      payload: { locale: 'EN' },
    })
    expect(res.statusCode).toBe(401)
  })
})
