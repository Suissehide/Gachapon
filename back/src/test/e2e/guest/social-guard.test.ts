import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest, randomTestIpv6 } from '../../helpers/guest'

describe('fonctions sociales fermées aux invités', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let guest: { cookies: string; body: { id: string; username: string } }
  let memberCookies: string
  let teamId: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
    guest = await createGuest(app)

    const prisma = app.iocContainer.postgresOrm.prisma
    const email = `socialguard${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { username: `sg${suffix}`, email, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    memberCookies = (login.headers['set-cookie'] as string[])
      .map((c) => c.split(';')[0])
      .join('; ')
    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: memberCookies },
      payload: { name: `SG ${suffix}` },
    })
    teamId = team.json().id
  })
  afterAll(async () => {
    await app.close()
  })

  it.each([
    ['GET', '/teams'],
    ['POST', '/teams'],
    ['GET', '/me/invitations'],
    ['GET', '/me/duels'],
    ['GET', '/me/bets'],
    ['GET', '/me/join-requests'],
    ['GET', '/api-keys'],
    ['POST', '/api-keys'],
  ] as const)('%s %s → 403 GUEST_FORBIDDEN', async (method, url) => {
    const res = await app.inject({
      method,
      url,
      headers: { cookie: guest.cookies },
      payload: method === 'POST' ? { name: 'xx' } : undefined,
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('GUEST_FORBIDDEN')
  })

  it('GET /teams/:id/raid → 403 pour un invité', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: guest.cookies },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('GUEST_FORBIDDEN')
  })

  it('refuse d’inviter un invité par pseudo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/invite`,
      headers: { cookie: memberCookies },
      payload: { username: guest.body.username },
    })
    expect(res.statusCode).toBe(409)
  })

  it('laisse le solo et le classement ouverts', async () => {
    for (const url of ['/leaderboard/collectors', '/auth/me', '/cards']) {
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { cookie: guest.cookies },
      })
      expect(res.statusCode).toBe(200)
    }
  })

  it('un USER garde l’accès aux équipes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/teams',
      headers: { cookie: memberCookies },
    })
    expect(res.statusCode).toBe(200)
  })
})
