import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('cycle de vie du duel', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookiesA: string
  let cookiesB: string
  let cookiesC: string
  let userIdA: string
  let userIdB: string
  let userIdC: string
  let teamId: string

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `duel${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `duel${tag}${suffix}`, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    return {
      userId: user.id as string,
      cookies: login.headers['set-cookie'] as string,
    }
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    const a = await registerAndLogin('A')
    const b = await registerAndLogin('B')
    const c = await registerAndLogin('C')
    userIdA = a.userId
    userIdB = b.userId
    userIdC = c.userId
    cookiesA = a.cookies
    cookiesB = b.cookies
    cookiesC = c.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `DuelTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdB, role: 'MEMBER' },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /teams/:id/wagers exige une session', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /teams/:id/wagers refuse un non-membre', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
      headers: { cookie: cookiesC },
    })
    expect(res.statusCode).toBe(403)
  })

  it("POST /teams/:id/duels refuse un non-membre, sans creer de duel", async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesC },
      payload: { opponentId: userIdA },
    })
    expect(res.statusCode).toBe(403)
    const duels = await prisma.duel.findMany({ where: { teamId } })
    expect(duels).toHaveLength(0)
  })

  it('POST /teams/:id/duels : A ne peut pas se defier lui-meme', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdA },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /teams/:id/duels : A ne peut pas defier C, hors equipe', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdC },
    })
    expect([400, 403]).toContain(res.statusCode)
  })

  let duel1Id: string

  it('POST /teams/:id/duels : A defie B -> 201 PENDING, pullCount fige', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.status).toBe('PENDING')
    expect(body.challenger.id).toBe(userIdA)
    expect(body.opponent.id).toBe(userIdB)
    expect(body.myRole).toBe('CHALLENGER')
    duel1Id = body.id

    const row = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(row.status).toBe('PENDING')
    expect(row.pullCount).toBe(5)
  })

  it('POST /teams/:id/duels : A a deja un duel ouvert -> 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(res.statusCode).toBe(409)
    const duels = await prisma.duel.findMany({ where: { teamId } })
    expect(duels).toHaveLength(1)
  })

  it('POST accept : le defieur (A) ne peut pas accepter son propre duel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel1Id}/accept`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(403)
    const row = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(row.status).toBe('PENDING')
  })

  it('POST decline : B refuse le duel -> DECLINED, libere A et B', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel1Id}/decline`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('DECLINED')
    const row = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(row.status).toBe('DECLINED')
  })

  let duel2Id: string

  it('POST /teams/:id/duels : nouveau duel A vs B, puis annule par A -> CANCELLED', async () => {
    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    duel2Id = propose.json().id

    const cancelByB = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel2Id}/cancel`,
      headers: { cookie: cookiesB },
    })
    expect(cancelByB.statusCode).toBe(403)

    const cancel = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel2Id}/cancel`,
      headers: { cookie: cookiesA },
    })
    expect(cancel.statusCode).toBe(200)
    expect(cancel.json().status).toBe('CANCELLED')
    const row = await prisma.duel.findUnique({ where: { id: duel2Id } })
    expect(row.status).toBe('CANCELLED')
  })

  it("une acceptation apres le delai d'acceptation expire le duel -> 409, statut EXPIRED", async () => {
    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    const expiredDuelId = propose.json().id as string

    await prisma.duel.update({
      where: { id: expiredDuelId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    })

    const accept = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${expiredDuelId}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(accept.statusCode).toBe(409)
    const row = await prisma.duel.findUnique({ where: { id: expiredDuelId } })
    expect(row.status).toBe('EXPIRED')
  })

  let duel3Id: string

  it('POST accept : B accepte -> ACTIVE, acceptedAt et deadlineAt poses', async () => {
    await configService.set('duel.pullCount', 9)

    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    duel3Id = propose.json().id
    expect(propose.json().pullCount).toBe(9)

    const accept = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel3Id}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(accept.statusCode).toBe(200)
    const body = accept.json()
    expect(body.status).toBe('ACTIVE')
    expect(body.acceptedAt).not.toBeNull()
    expect(body.deadlineAt).not.toBeNull()

    const row = await prisma.duel.findUnique({ where: { id: duel3Id } })
    expect(row.status).toBe('ACTIVE')
    expect(row.acceptedAt).not.toBeNull()
    expect(row.deadlineAt).not.toBeNull()
    expect(row.pullCount).toBe(9)

    // Le pullCount d'un duel deja resolu (duel1, avant le changement de
    // config) reste fige a l'ancienne valeur.
    const oldRow = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(oldRow.pullCount).toBe(5)
  })

  it('POST accept : une seconde acceptation echoue -> 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel3Id}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(409)
    const row = await prisma.duel.findUnique({ where: { id: duel3Id } })
    expect(row.status).toBe('ACTIVE')
  })

  it('GET /teams/:id/wagers par A : le duel actif apparait, myRole CHALLENGER', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const found = body.duels.find((d: any) => d.id === duel3Id)
    expect(found).toBeDefined()
    expect(found.status).toBe('ACTIVE')
    expect(found.myRole).toBe('CHALLENGER')
    expect(found.pullCount).toBe(9)
    expect(found.challengerScore).toBe(0)
    expect(found.opponentScore).toBe(0)
  })
})
