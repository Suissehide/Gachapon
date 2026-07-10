import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E: GET /auth/me expose le nombre de points de compétence disponibles
 * (user.skillPoints) pour alimenter la pastille navbar.
 */
describe('GET /auth/me — skillPoints (e2e)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const email = `mesp${suffix}@test.com`
  const password = 'Password123!'
  const username = `mesp${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(regRes.statusCode).toBe(201)

    await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), skillPoints: 3 },
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('renvoie skillPoints dans le payload', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().skillPoints).toBe(3)
  })
})
