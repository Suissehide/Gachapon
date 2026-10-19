import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest, randomTestIpv6 } from '../../helpers/guest'

const DAY = 24 * 60 * 60 * 1000

describe('Bonus de retour', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  const suffix = Date.now()
  let seq = 0

  async function registerUser() {
    seq++
    const name = `ret${seq}x${suffix}`
    const email = `${name}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { username: name, email, password: 'Password123!' },
    })
    const user = await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { email, password: 'Password123!' },
    })
    return { id: user.id as string, cookie: login.headers['set-cookie'] as unknown as string }
  }

  const absentFor = (userId: string, days: number) =>
    prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date(Date.now() - days * DAY) } })

  const me = async (cookie: string) => {
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    return res.json()
  }

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma
  })

  afterAll(async () => {
    await app.close()
  })

  describe('création du coffre', () => {
    it('3 jours d’absence → coffre de 21 jetons / 63 énergie', async () => {
      const u = await registerUser()
      await absentFor(u.id, 3)
      const body = await me(u.cookie)
      expect(body.returnChest).toEqual({ days: 3, cappedDays: 3, tokens: 21, energy: 63 })
    })

    it('2 jours d’absence → pas de coffre', async () => {
      const u = await registerUser()
      await absentFor(u.id, 2)
      const body = await me(u.cookie)
      expect(body.returnChest).toBeNull()
    })

    it('10 jours d’absence → montants plafonnés à 7 jours, jours réels', async () => {
      const u = await registerUser()
      await absentFor(u.id, 10)
      const body = await me(u.cookie)
      expect(body.returnChest).toEqual({ days: 10, cappedDays: 7, tokens: 49, energy: 147 })
    })

    it('un coffre en attente n’est ni recalculé ni cumulé', async () => {
      const u = await registerUser()
      await absentFor(u.id, 3)
      await me(u.cookie)
      const sameDay = await me(u.cookie)
      expect(sameDay.returnChest).toEqual({ days: 3, cappedDays: 3, tokens: 21, energy: 63 })

      await absentFor(u.id, 6)
      const later = await me(u.cookie)
      expect(later.returnChest).toEqual({ days: 3, cappedDays: 3, tokens: 21, energy: 63 })
    })

    it('un invité y a droit', async () => {
      const { cookies, body: created } = await createGuest(app)
      const guestMe = await me(cookies)
      expect(created).toBeTruthy()
      await absentFor(guestMe.id, 4)
      const body = await me(cookies)
      expect(body.returnChest?.days).toBe(4)
    })
  })
})
