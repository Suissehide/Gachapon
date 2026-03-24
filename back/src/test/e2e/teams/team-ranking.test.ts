import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /teams/:id/ranking', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let ownerCookies: string
  let memberCookies: string
  let outsiderCookies: string
  let teamId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const prisma = (app as any).iocContainer.postgresOrm.prisma

    // Register owner
    const ownerReg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `rankowner${suffix}`, email: `rankowner${suffix}@test.com`, password: 'Password123!' },
    })
    expect(ownerReg.statusCode).toBe(201)
    ownerCookies = ownerReg.headers['set-cookie'] as string

    // Register member
    const memberReg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `rankmember${suffix}`, email: `rankmember${suffix}@test.com`, password: 'Password123!' },
    })
    expect(memberReg.statusCode).toBe(201)
    memberCookies = memberReg.headers['set-cookie'] as string

    // Register outsider (not in team)
    const outsiderReg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `rankout${suffix}`, email: `rankout${suffix}@test.com`, password: 'Password123!' },
    })
    expect(outsiderReg.statusCode).toBe(201)
    outsiderCookies = outsiderReg.headers['set-cookie'] as string

    // Create team as owner
    const teamRes = await app.inject({
      method: 'POST', url: '/teams',
      headers: { cookie: ownerCookies },
      payload: { name: `RankTeam${suffix}` },
    })
    expect(teamRes.statusCode).toBe(201)
    teamId = teamRes.json().id

    // Invite member and accept
    const invRes = await app.inject({
      method: 'POST', url: `/teams/${teamId}/invite`,
      headers: { cookie: ownerCookies },
      payload: { username: `rankmember${suffix}` },
    })
    expect(invRes.statusCode).toBe(201)
    const token = invRes.json().token
    await app.inject({
      method: 'POST', url: `/invitations/${token}/accept`,
      headers: { cookie: memberCookies },
    })

    // Give the owner a LEGENDARY card to ensure they score higher
    const owner = await prisma.user.findUnique({ where: { email: `rankowner${suffix}@test.com` } })
    const set = await prisma.cardSet.create({ data: { name: `RankSet${suffix}`, isActive: true } })
    const card = await prisma.card.create({
      data: { name: `RankCard${suffix}`, rarity: 'LEGENDARY', setId: set.id },
    })
    await prisma.userCard.upsert({
      where: { userId_cardId_variant: { userId: owner.id, cardId: card.id, variant: 'NORMAL' } },
      update: {},
      create: { userId: owner.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
    })
  })

  afterAll(async () => { await app.close() })

  it('returns ranked members with scores', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/ranking`,
      headers: { cookie: ownerCookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('members')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(body).toHaveProperty('totalPages')
    expect(body.members.length).toBeGreaterThan(0)
    const first = body.members[0]
    expect(first).toHaveProperty('rank')
    expect(first).toHaveProperty('score')
    expect(first).toHaveProperty('role')
    expect(first.user).toHaveProperty('username')
  })

  it('owner ranks first (has the LEGENDARY card)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/ranking`,
      headers: { cookie: ownerCookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.members[0].score).toBeGreaterThan(body.members[body.members.length - 1].score)
  })

  it('pagination metadata is correct', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/ranking?page=1&limit=1`,
      headers: { cookie: ownerCookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.members).toHaveLength(1)
    expect(body.total).toBe(2) // owner + member
    expect(body.totalPages).toBe(2)
    expect(body.page).toBe(1)
  })

  it('returns 403 for a non-member', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/ranking`,
      headers: { cookie: outsiderCookies },
    })
    expect(res.statusCode).toBe(403)
  })
})
