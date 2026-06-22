import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/sets-progression', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const username = `setprog${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    // 2 active sets — own 2/3 in set A, 0/2 in set B
    const setA = await prisma.cardSet.create({ data: { name: `SetA${suffix}`, isActive: true, hue: 35 } })
    const setB = await prisma.cardSet.create({ data: { name: `SetB${suffix}`, isActive: true } })
    const a1 = await prisma.card.create({ data: { name: 'a1', rarity: 'COMMON', dropWeight: 10, setId: setA.id } })
    const a2 = await prisma.card.create({ data: { name: 'a2', rarity: 'COMMON', dropWeight: 10, setId: setA.id } })
    await prisma.card.create({ data: { name: 'a3', rarity: 'COMMON', dropWeight: 10, setId: setA.id } })
    await prisma.card.create({ data: { name: 'b1', rarity: 'COMMON', dropWeight: 10, setId: setB.id } })
    await prisma.card.create({ data: { name: 'b2', rarity: 'COMMON', dropWeight: 10, setId: setB.id } })
    await prisma.userCard.create({ data: { userId: user!.id, cardId: a1.id, variant: 'NORMAL', quantity: 1 } })
    await prisma.userCard.create({ data: { userId: user!.id, cardId: a2.id, variant: 'NORMAL', quantity: 1 } })
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns owned/total/percent for each active set sorted by percent desc', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/sets-progression`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const setA = body.sets.find((s: any) => s.name.startsWith('SetA'))
    const setB = body.sets.find((s: any) => s.name.startsWith('SetB'))
    expect(setA).toMatchObject({ owned: 2, total: 3, hue: 35 })
    expect(setB).toMatchObject({ owned: 0, total: 2 })
    expect(typeof setB.hue).toBe('number') // fallback hash
    expect(body.sets[0].percent).toBeGreaterThanOrEqual(body.sets[1].percent)
  })
})
