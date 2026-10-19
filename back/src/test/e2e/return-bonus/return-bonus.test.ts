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

  describe('POST /return-bonus/claim', () => {
    const claim = (cookie?: string) =>
      app.inject({
        method: 'POST',
        url: '/return-bonus/claim',
        headers: cookie ? { cookie } : {},
      })

    const seedChest = (userId: string) =>
      prisma.returnChest.create({
        data: { userId, days: 3, cappedDays: 3, tokens: 21, energy: 63 },
      })

    it('crédite le coffre une seule fois et le retire', async () => {
      const u = await registerUser()
      await seedChest(u.id)
      await prisma.user.update({
        where: { id: u.id },
        data: { tokens: 4, lastTokenAt: new Date(), combatPoints: 10, lastCombatPointAt: new Date() },
      })

      const res = await claim(u.cookie)
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({
        tokens: 25,
        combatPoints: 73,
        gained: { days: 3, cappedDays: 3, tokens: 21, energy: 63 },
      })
      expect(await prisma.returnChest.findUnique({ where: { userId: u.id } })).toBeNull()
      const body = await me(u.cookie)
      expect(body.returnChest).toBeNull()
    })

    it('jetons au plafond : le cadeau n’est pas avalé', async () => {
      const u = await registerUser()
      await seedChest(u.id)
      await prisma.user.update({
        where: { id: u.id },
        data: { tokens: 10, lastTokenAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
      })

      const res = await claim(u.cookie)
      expect(res.statusCode).toBe(200)
      expect(res.json().tokens).toBe(31)
    })

    it('deux récupérations simultanées → un seul crédit', async () => {
      const u = await registerUser()
      await seedChest(u.id)
      await prisma.user.update({
        where: { id: u.id },
        data: { tokens: 4, lastTokenAt: new Date() },
      })

      const results = await Promise.all([claim(u.cookie), claim(u.cookie)])
      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 404])
      const user = await prisma.user.findUnique({ where: { id: u.id } })
      expect(user.tokens).toBe(25)
    })

    it('aucun coffre → 404', async () => {
      const u = await registerUser()
      const res = await claim(u.cookie)
      expect(res.statusCode).toBe(404)
    })

    it('sans session → 401', async () => {
      const res = await claim()
      expect(res.statusCode).toBe(401)
    })
  })
})
