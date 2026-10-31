import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// Catalogue normal : COMMON 90 / RARE 8 / EPIC 1 / LEGENDARY 1, plus une
// unique carte LIGHT RARE dans le pool astral. Étant la seule candidate de
// son pool, chaque tirage astral rend A COUP SÛR cette RARE — qualifiante
// pour un pari RARE si la fenêtre la comptait.
const WEIGHT_COMMON = 90
const WEIGHT_RARE = 8
const WEIGHT_EPIC = 1
const WEIGHT_LEGENDARY = 1

describe('fenêtre des paris : les tirages astraux restent invisibles', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookiesA: string
  let cookiesB: string
  let userIdA: string
  let userIdB: string
  let teamId: string
  let betId: string
  let baselineActiveSetIds: string[]
  let mixedSetId: string
  let pureRareSetId: string
  let originalPullWindow: number

  const suffix = Date.now()
  const password = 'Password123!'
  const PULL_WINDOW = 3

  async function registerAndLogin(tag: string) {
    const email = `astralwin${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `astralwin${tag}${suffix}`, email, password },
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

  function setCapsules(userId: string, quantity: number) {
    return prisma.userCapsule.upsert({
      where: { userId_type: { userId, type: 'ASTRAL' } },
      create: { userId, type: 'ASTRAL', quantity },
      update: { quantity },
    })
  }

  function entryOf(betId: string, userId: string) {
    return prisma.betEntry.findFirstOrThrow({ where: { betId, userId } })
  }

  async function activateOnly(setId: string) {
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    await prisma.cardSet.update({
      where: { id: setId },
      data: { isActive: true },
    })
  }

  beforeAll(async () => {
    app = await buildTestApp()
    ;({ postgresOrm: { prisma }, configService } = (app as any).iocContainer)

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
      payload: { name: `AstralWinTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdB, role: 'MEMBER' },
    })

    // Capturé AVANT la modification : `economy-config.e2e.test.ts` lit ce
    // réglage et attend sa valeur par défaut (10), partagée entre fichiers
    // e2e sous --runInBand — sans restauration, cette suite le laisserait
    // à 3 pour tout le reste du run.
    ;({ 'bet.pullWindow': originalPullWindow } = await configService.getMany(
      'bet.pullWindow',
    ))
    await configService.set('bet.pullWindow', PULL_WINDOW)
    await configService.set('bet.minStake', 50)
    await configService.set('bet.maxStake', 2000)
    await configService.set('bet.houseFeePct', 10)
    await configService.set('bet.maxOpenPerBettor', 3)
    await configService.set('bet.maxOpenPerTarget', 3)
    await configService.set('pityThreshold', 300)

    // Snapshot du catalogue actif : cette suite partage la base avec les
    // autres fichiers e2e.
    const active = await prisma.cardSet.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    baselineActiveSetIds = active.map((s: { id: string }) => s.id)

    const mixedSet = await prisma.cardSet.create({
      data: {
        nameFr: `AstralWinMixed${suffix}`,
        nameEn: `AstralWinMixed${suffix}`,
        isActive: false,
      },
    })
    mixedSetId = mixedSet.id
    await prisma.card.createMany({
      data: [
        {
          nameFr: `AWCommon${suffix}`,
          nameEn: `AWCommon${suffix}`,
          rarity: 'COMMON',
          dropWeight: WEIGHT_COMMON,
          setId: mixedSetId,
        },
        {
          nameFr: `AWRare${suffix}`,
          nameEn: `AWRare${suffix}`,
          rarity: 'RARE',
          dropWeight: WEIGHT_RARE,
          setId: mixedSetId,
        },
        {
          nameFr: `AWEpic${suffix}`,
          nameEn: `AWEpic${suffix}`,
          rarity: 'EPIC',
          dropWeight: WEIGHT_EPIC,
          setId: mixedSetId,
        },
        {
          nameFr: `AWLegendary${suffix}`,
          nameEn: `AWLegendary${suffix}`,
          rarity: 'LEGENDARY',
          dropWeight: WEIGHT_LEGENDARY,
          setId: mixedSetId,
        },
      ],
    })
    // Unique candidate du pool astral : chaque tirage astral rend cette
    // RARE LIGHT, quelle que soit la rareté tirée aux poids ci-dessus.
    await prisma.card.create({
      data: {
        nameFr: `AWAstral${suffix}`,
        nameEn: `AWAstral${suffix}`,
        rarity: 'RARE',
        element: 'LIGHT',
        dropWeight: 1,
        setId: mixedSetId,
      },
    })

    const pureRareSet = await prisma.cardSet.create({
      data: {
        nameFr: `AstralWinPureRare${suffix}`,
        nameEn: `AstralWinPureRare${suffix}`,
        isActive: false,
      },
    })
    pureRareSetId = pureRareSet.id
    await prisma.card.create({
      data: {
        nameFr: `AWPureRare${suffix}`,
        nameEn: `AWPureRare${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: pureRareSetId,
      },
    })

    await activateOnly(mixedSetId)
  })

  afterAll(async () => {
    await configService.set('bet.pullWindow', originalPullWindow)
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    if (baselineActiveSetIds.length > 0) {
      await prisma.cardSet.updateMany({
        where: { id: { in: baselineActiveSetIds } },
        data: { isActive: true },
      })
    }
    await app.close()
  })

  it("N tirages astraux de B : le pari ouvert par A sur B n'avance ni ne se règle", async () => {
    await activateOnly(mixedSetId)
    await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

    const stake = 200
    const placed = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake },
    })
    expect(placed.statusCode).toBe(201)
    betId = placed.json().id
    const dustAfterPlacement = (
      await prisma.user.findUnique({ where: { id: userIdA } })
    ).dust

    await setCapsules(userIdB, PULL_WINDOW)
    for (let i = 0; i < PULL_WINDOW; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/pulls/astral',
        headers: { cookie: cookiesB },
        payload: { count: 1 },
      })
      expect(res.statusCode).toBe(201)
      const card = res.json().pulls[0].card
      expect(['LIGHT', 'DARK']).toContain(card.element)
      // La seule carte astrale du catalogue est RARE : qualifierait le pari
      // si la fenêtre la comptait.
      expect(card.rarity).toBe('RARE')
    }

    expect(
      await prisma.gachaPull.count({
        where: { userId: userIdB, source: 'ASTRAL' },
      }),
    ).toBe(PULL_WINDOW)

    // La route astrale ne déclenche aucun règlement (fire-and-forget absent).
    // On force explicitement le règlement pour vérifier que même lui ne
    // trouve rien à trancher : la fenêtre ne voit que des tirages TOKEN.
    const { betDomain } = (app as any).iocContainer
    await betDomain.settleForUser(userIdB)

    const row = await prisma.bet.findUnique({ where: { id: betId } })
    expect(row.status).toBe('ACTIVE')
    expect(row.pullsSeen).toBe(0)
    expect(row.settledAt).toBeNull()
    expect(
      (await prisma.user.findUnique({ where: { id: userIdA } })).dust,
    ).toBe(dustAfterPlacement)
  })

  it('N tirages normaux de B ensuite : le même pari se règle (WON)', async () => {
    await activateOnly(pureRareSetId)
    await prisma.user.update({
      where: { id: userIdB },
      data: { tokens: PULL_WINDOW, lastTokenAt: new Date() },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().card.rarity).toBe('RARE')

    const start = Date.now()
    let row = await prisma.bet.findUnique({ where: { id: betId } })
    while (row?.status === 'ACTIVE' && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 25))
      row = await prisma.bet.findUnique({ where: { id: betId } })
    }

    expect(row?.status).toBe('WON')
    // Un seul tirage TOKEN comptabilisé : les 3 tirages ASTRAL antérieurs
    // n'ont pas avancé la fenêtre avant celui-ci.
    expect(row?.pullsSeen).toBe(1)
    expect(row?.settledAt).not.toBeNull()
    const entry = await entryOf(betId, userIdA)
    expect(entry.payout).toBeGreaterThan(0)
  })
})
