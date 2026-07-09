import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('PATCH /users/me/username', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  const suffix = Date.now()
  const email = `uname${suffix}@test.com`

  beforeAll(async () => {
    app = await buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `uname${suffix}`, email, password: 'Password123!' },
    })
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('renomme le pseudo (200)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/username',
      headers: { cookie: cookies },
      payload: { username: `renamed${suffix}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().username).toBe(`renamed${suffix}`)
  })

  it('409 si le pseudo est déjà pris', async () => {
    const taken = `taken${suffix}`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: taken, email: `taken${suffix}@test.com`, password: 'Password123!' },
    })
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/username',
      headers: { cookie: cookies },
      payload: { username: taken },
    })
    expect(res.statusCode).toBe(409)
  })

  it('400 si le pseudo est invalide', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/username',
      headers: { cookie: cookies },
      payload: { username: 'a b!' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('401 sans authentification', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/username',
      payload: { username: `noauth${suffix}` },
    })
    expect(res.statusCode).toBe(401)
  })
})
