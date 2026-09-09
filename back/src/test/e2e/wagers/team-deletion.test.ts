import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// La suppression d'une equipe emporte ses duels et ses paris par cascade de
// cle etrangere. La mise d'un pari est debitee AU PLACEMENT et n'existe
// nulle part ailleurs : sans traitement, la poussiere du parieur disparait
// avec la ligne. Ce fichier a sa propre equipe parce qu'il la detruit.
describe("suppression d'equipe : paris rembourses, duels annules", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookiesA: string
  let cookiesB: string
  let userIdA: string
  let userIdB: string
  let teamId: string
  let setId: string
  let baselineActiveSetIds: string[]

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `del${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `del${tag}${suffix}`, email, password },
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

    const a = await registerAndLogin('A')
    const b = await registerAndLogin('B')
    userIdA = a.userId
    userIdB = b.userId
    cookiesA = a.cookies
    cookiesB = b.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `DelTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdB, role: 'MEMBER' },
    })

    // Catalogue de controle : la cote doit exister (au moins une carte
    // active) et ne pas tomber au plancher de 1,00, sinon le placement est
    // refuse. Snapshot des sets actifs pour rendre la base comme trouvee.
    const active = await prisma.cardSet.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    baselineActiveSetIds = active.map((s: { id: string }) => s.id)

    const set = await prisma.cardSet.create({
      data: { name: `DelSet${suffix}`, isActive: false },
    })
    setId = set.id
    await prisma.card.createMany({
      data: [
        {
          name: `DelCommon${suffix}`,
          rarity: 'COMMON',
          dropWeight: 90,
          setId,
        },
        { name: `DelRare${suffix}`, rarity: 'RARE', dropWeight: 10, setId },
      ],
    })
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    await prisma.cardSet.update({ where: { id: setId }, data: { isActive: true } })
  })

  afterAll(async () => {
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    if (baselineActiveSetIds.length > 0) {
      await prisma.cardSet.updateMany({
        where: { id: { in: baselineActiveSetIds } },
        data: { isActive: true },
      })
    }
    await app.close()
  })

  it("DELETE /teams/:id rembourse la mise des paris ACTIVE et annule les duels", async () => {
    await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

    const stake = 300
    const placed = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake },
    })
    expect(placed.statusCode).toBe(201)
    const betId = placed.json().id as string

    const dustAfterPlacement = await prisma.user
      .findUnique({ where: { id: userIdA } })
      .then((u: { dust: number }) => u.dust)
    expect(dustAfterPlacement).toBe(5000 - stake)

    // Un duel ACTIVE en plus : il verrouille les cartes comptees des deux
    // joueurs, et disparaitrait lui aussi sans un mot.
    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    const duelId = propose.json().id as string
    const accept = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duelId}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(accept.statusCode).toBe(200)

    const res = await app.inject({
      method: 'DELETE',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(204)

    // La mise est revenue : c'est la seule chose qui survit a la cascade,
    // donc la seule chose observable — et la seule qui compte.
    const dustAfterDelete = await prisma.user
      .findUnique({ where: { id: userIdA } })
      .then((u: { dust: number }) => u.dust)
    expect(dustAfterDelete).toBe(5000)
    expect(dustAfterDelete - dustAfterPlacement).toBe(stake)

    // L'equipe et ses lignes ont bien disparu (cascade), et aucun duel
    // fantome ne reste a verrouiller les cartes des deux joueurs.
    expect(await prisma.team.findUnique({ where: { id: teamId } })).toBeNull()
    expect(await prisma.bet.findUnique({ where: { id: betId } })).toBeNull()
    expect(await prisma.duel.findUnique({ where: { id: duelId } })).toBeNull()
    const stillOpen = await prisma.duel.findMany({
      where: {
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [{ challengerId: userIdA }, { opponentId: userIdA }],
      },
    })
    expect(stillOpen).toHaveLength(0)
  })
})
