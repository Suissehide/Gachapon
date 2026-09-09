import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// Catalogue controle : COMMON 90 / RARE 9 / LEGENDARY 1, poids total 100.
// q(RARE+) = 10/100 = 0,1 exactement, ce qui rend la cote previsible.
const WEIGHT_COMMON = 90
const WEIGHT_RARE = 9
const WEIGHT_LEGENDARY = 1

// Valeurs epinglees en beforeAll pour que les attentes chiffrees ci-dessous
// ne dependent pas des defauts de config.service.ts.
const PULL_WINDOW = 10
const MIN_STAKE = 50
const MAX_STAKE = 2000
const HOUSE_FEE_PCT = 10
const MAX_OPEN_PER_BETTOR = 3
const MAX_OPEN_PER_TARGET = 3
const PITY_THRESHOLD = 300

// p = 1 - (1 - 0,1)^10 et cote = (1 - 10 %) / p, arrondie au centieme.
const EXPECTED_PROBABILITY = 1 - 0.9 ** PULL_WINDOW // 0.6513215599
const EXPECTED_MULTIPLIER =
  Math.round((((100 - HOUSE_FEE_PCT) / 100 / EXPECTED_PROBABILITY) * 100)) / 100 // 1.38

describe('cote et placement du pari', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookiesA: string
  let cookiesB: string
  let cookiesC: string
  let userIdA: string
  let userIdB: string
  let userIdC: string
  let userIdD: string
  let userIdE: string
  let userIdF: string
  let teamId: string
  let betSetId: string
  let baselineActiveSetIds: string[]

  const suffix = Date.now()
  const password = 'Password123!'

  // `/auth/register` est limite a 5 comptes par 15 minutes et par instance
  // Fastify. On n'en depense que 3 (A, B, C — les seuls qui ont besoin d'une
  // vraie session) et on cree D/E/F directement en base : ils ne servent que
  // de cibles ou de parieurs de lignes Bet inserees a la main, jamais
  // d'appelants HTTP.
  async function registerAndLogin(tag: string) {
    const email = `bet${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `bet${tag}${suffix}`, email, password },
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

  async function createBareUser(tag: string): Promise<string> {
    const user = await prisma.user.create({
      data: {
        username: `bet${tag}${suffix}`,
        email: `bet${tag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    await prisma.teamMember.create({
      data: { teamId, userId: user.id, role: 'MEMBER' },
    })
    return user.id as string
  }

  function openBets(bettorId: string, targetId: string) {
    return prisma.bet.count({
      where: { bettorId, targetId, status: 'ACTIVE' },
    })
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
      payload: { name: `BetTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdB, role: 'MEMBER' },
    })
    userIdD = await createBareUser('D')
    userIdE = await createBareUser('E')
    userIdF = await createBareUser('F')

    // Config epinglee : toutes les attentes chiffrees en dependent.
    await configService.set('bet.pullWindow', PULL_WINDOW)
    await configService.set('bet.minStake', MIN_STAKE)
    await configService.set('bet.maxStake', MAX_STAKE)
    await configService.set('bet.houseFeePct', HOUSE_FEE_PCT)
    await configService.set('bet.maxOpenPerBettor', MAX_OPEN_PER_BETTOR)
    await configService.set('bet.maxOpenPerTarget', MAX_OPEN_PER_TARGET)
    await configService.set('pityThreshold', PITY_THRESHOLD)

    // Snapshot du catalogue actif : cette suite partage la base avec les
    // autres fichiers e2e (globalSetup ne tronque qu'une fois par run), il
    // faut donc rendre les CardSet exactement comme on les a trouves.
    const active = await prisma.cardSet.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    baselineActiveSetIds = active.map((s: { id: string }) => s.id)

    const set = await prisma.cardSet.create({
      data: { name: `BetSet${suffix}`, isActive: false },
    })
    betSetId = set.id
    await prisma.card.createMany({
      data: [
        {
          name: `BetCommon${suffix}`,
          rarity: 'COMMON',
          dropWeight: WEIGHT_COMMON,
          setId: betSetId,
        },
        {
          name: `BetRare${suffix}`,
          rarity: 'RARE',
          dropWeight: WEIGHT_RARE,
          setId: betSetId,
        },
        {
          name: `BetLegendary${suffix}`,
          rarity: 'LEGENDARY',
          dropWeight: WEIGHT_LEGENDARY,
          setId: betSetId,
        },
      ],
    })
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    await prisma.cardSet.update({
      where: { id: betSetId },
      data: { isActive: true },
    })
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

  function quoteUrl(targetId: string, minRarity = 'RARE') {
    return `/teams/${teamId}/bets/quote?targetId=${targetId}&minRarity=${minRarity}`
  }

  it('GET /teams/:id/bets/quote exige une session', async () => {
    const res = await app.inject({ method: 'GET', url: quoteUrl(userIdB) })
    expect(res.statusCode).toBe(401)
  })

  it('GET /teams/:id/bets/quote refuse un non-membre', async () => {
    const res = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdB),
      headers: { cookie: cookiesC },
    })
    expect(res.statusCode).toBe(403)
  })

  it('GET /teams/:id/bets/quote : A ne peut pas parier sur lui-meme', async () => {
    const res = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdA),
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /teams/:id/bets/quote : A sur B, RARE -> cote > 1, probabilite dans ]0,1[, bornes de la config', async () => {
    const res = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdB),
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.probability).toBeGreaterThan(0)
    expect(body.probability).toBeLessThan(1)
    expect(body.multiplier).toBeGreaterThan(1)

    // Catalogue 90/9/1 : q = 0,1, p = 1 - 0,9^10, cote = 0,9 / p.
    expect(body.probability).toBeCloseTo(EXPECTED_PROBABILITY, 6)
    expect(body.multiplier).toBe(EXPECTED_MULTIPLIER)

    const cfg = await configService.getMany(
      'bet.pullWindow',
      'bet.minStake',
      'bet.maxStake',
    )
    expect(body.pullWindow).toBe(cfg['bet.pullWindow'])
    expect(body.minStake).toBe(cfg['bet.minStake'])
    expect(body.maxStake).toBe(cfg['bet.maxStake'])
  })

  it('POST /teams/:id/bets refuse une mise sous bet.minStake', async () => {
    await prisma.user.update({
      where: { id: userIdA },
      data: { dust: 100000 },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake: MIN_STAKE - 1 },
    })
    expect(res.statusCode).toBe(400)
    expect(await prisma.bet.count({ where: { teamId } })).toBe(0)
  })

  it('POST /teams/:id/bets refuse une mise au-dessus de bet.maxStake', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake: MAX_STAKE + 1 },
    })
    expect(res.statusCode).toBe(400)
    expect(await prisma.bet.count({ where: { teamId } })).toBe(0)
  })

  it('POST /teams/:id/bets : poussiere insuffisante -> 402 et rien de cree', async () => {
    await prisma.user.update({ where: { id: userIdA }, data: { dust: 10 } })
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake: 100 },
    })
    expect(res.statusCode).toBe(402)
    expect(await prisma.bet.count({ where: { teamId } })).toBe(0)
    const a = await prisma.user.findUnique({ where: { id: userIdA } })
    expect(a.dust).toBe(10)
  })

  let bet1Id: string

  it('POST /teams/:id/bets valide -> 201, poussiere debitee, ACTIVE, cote identique a celle du devis', async () => {
    await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

    const quote = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdB),
      headers: { cookie: cookiesA },
    })
    expect(quote.statusCode).toBe(200)
    const quoted = quote.json()

    const stake = 200
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    bet1Id = body.id

    expect(body.status).toBe('ACTIVE')
    expect(body.bettor.id).toBe(userIdA)
    expect(body.target.id).toBe(userIdB)
    expect(body.stake).toBe(stake)
    expect(body.minRarity).toBe('RARE')
    expect(body.pullWindow).toBe(PULL_WINDOW)
    expect(body.myRole).toBe('BETTOR')
    // La cote stockee est EXACTEMENT celle annoncee par le devis.
    expect(body.multiplier).toBe(quoted.multiplier)

    const a = await prisma.user.findUnique({ where: { id: userIdA } })
    expect(a.dust).toBe(5000 - stake)

    const row = await prisma.bet.findUnique({ where: { id: bet1Id } })
    expect(row.status).toBe('ACTIVE')
    expect(row.multiplier).toBe(quoted.multiplier)
    expect(row.stake).toBe(stake)
    expect(row.deadlineAt.getTime()).toBeGreaterThan(Date.now())
  })

  it("POST /teams/:id/bets ignore toute cote envoyee par le client : la cote stockee est celle du serveur", async () => {
    const quote = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdD),
      headers: { cookie: cookiesA },
    })
    const serverMultiplier = quote.json().multiplier

    // Corps hostile : un parieur qui pourrait nommer sa propre cote
    // imprimerait de la poussiere. Le schema n'a aucun champ de cote, donc
    // ces cles doivent etre inertes.
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: {
        targetId: userIdD,
        minRarity: 'RARE',
        stake: 100,
        multiplier: 999,
        probability: 0.999,
        pullWindow: 9999,
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().multiplier).toBe(serverMultiplier)
    expect(res.json().pullWindow).toBe(PULL_WINDOW)

    const row = await prisma.bet.findUnique({ where: { id: res.json().id } })
    expect(row.multiplier).toBe(serverMultiplier)
    expect(row.multiplier).not.toBe(999)
    expect(row.pullWindow).toBe(PULL_WINDOW)
  })

  it("court-circuit de pitie : une cible a moins d'une fenetre du pity donne probabilite 1 et cote 1", async () => {
    // 290 + 10 >= 300 : un legendaire est certain dans la fenetre, donc la
    // cote ne doit PAS refleter le catalogue (elle vaudrait 1,38).
    await prisma.user.update({
      where: { id: userIdB },
      data: { pityCurrent: PITY_THRESHOLD - PULL_WINDOW },
    })
    const res = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdB),
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().probability).toBe(1)
    expect(res.json().multiplier).toBe(1)

    // Un cran en dessous du seuil, la cote redevient celle du catalogue :
    // c'est bien la pitie, et non un effet de bord, qui produit le 1.
    await prisma.user.update({
      where: { id: userIdB },
      data: { pityCurrent: PITY_THRESHOLD - PULL_WINDOW - 1 },
    })
    const below = await app.inject({
      method: 'GET',
      url: quoteUrl(userIdB),
      headers: { cookie: cookiesA },
    })
    expect(below.json().probability).toBeCloseTo(EXPECTED_PROBABILITY, 6)
    expect(below.json().multiplier).toBe(EXPECTED_MULTIPLIER)

    await prisma.user.update({
      where: { id: userIdB },
      data: { pityCurrent: 0 },
    })
  })

  it('plafond parieur : le 4e pari ouvert de A est refuse', async () => {
    // A a deja 2 paris ouverts (sur B et sur D). Le 3e vise E, si bien que
    // chaque cible reste a 1 pari : seul le compteur du PARIEUR peut
    // atteindre son plafond ici.
    const third = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdE, minRarity: 'RARE', stake: 100 },
    })
    expect(third.statusCode).toBe(201)

    expect(
      await prisma.bet.count({ where: { bettorId: userIdA, status: 'ACTIVE' } }),
    ).toBe(MAX_OPEN_PER_BETTOR)
    for (const targetId of [userIdB, userIdD, userIdE]) {
      expect(
        await prisma.bet.count({ where: { targetId, status: 'ACTIVE' } }),
      ).toBe(1)
    }

    const dustBefore = (await prisma.user.findUnique({ where: { id: userIdA } }))
      .dust
    const fourth = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake: 100 },
    })
    expect(fourth.statusCode).toBe(400)
    expect(
      await prisma.bet.count({ where: { bettorId: userIdA, status: 'ACTIVE' } }),
    ).toBe(MAX_OPEN_PER_BETTOR)
    const dustAfter = (await prisma.user.findUnique({ where: { id: userIdA } }))
      .dust
    expect(dustAfter).toBe(dustBefore)
  })

  it('plafond cible : un pari de plus sur B, par un parieur libre, est refuse', async () => {
    // On solde les paris d'A pour que SON plafond ne puisse plus fausser le
    // verdict, puis on ouvre 3 paris sur B par TROIS parieurs differents.
    await prisma.bet.updateMany({
      where: { bettorId: userIdA, status: 'ACTIVE' },
      data: { status: 'LOST', settledAt: new Date() },
    })
    expect(
      await prisma.bet.count({ where: { bettorId: userIdA, status: 'ACTIVE' } }),
    ).toBe(0)

    for (const bettorId of [userIdD, userIdE, userIdF]) {
      await prisma.bet.create({
        data: {
          teamId,
          bettorId,
          targetId: userIdB,
          stake: 100,
          minRarity: 'RARE',
          pullWindow: PULL_WINDOW,
          multiplier: EXPECTED_MULTIPLIER,
          deadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      })
    }
    expect(
      await prisma.bet.count({ where: { targetId: userIdB, status: 'ACTIVE' } }),
    ).toBe(MAX_OPEN_PER_TARGET)

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesA },
      payload: { targetId: userIdB, minRarity: 'RARE', stake: 100 },
    })
    expect(res.statusCode).toBe(400)
    expect(await openBets(userIdA, userIdB)).toBe(0)
    expect(
      await prisma.bet.count({ where: { targetId: userIdB, status: 'ACTIVE' } }),
    ).toBe(MAX_OPEN_PER_TARGET)
  })

  it('GET /teams/:id/wagers expose les paris ouverts et les paris regles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.bets)).toBe(true)
    expect(Array.isArray(body.settledBets)).toBe(true)

    // Les 3 paris ACTIVE ouverts sur B par D/E/F.
    expect(body.bets).toHaveLength(MAX_OPEN_PER_TARGET)
    for (const bet of body.bets) {
      expect(bet.target.id).toBe(userIdB)
      expect(bet.status).toBe('ACTIVE')
      expect(bet.myRole).toBe('TARGET')
      expect(bet.multiplier).toBe(EXPECTED_MULTIPLIER)
      expect(bet.pullWindow).toBe(PULL_WINDOW)
    }

    // Les 3 paris d'A soldes en LOST plus haut.
    expect(body.settledBets).toHaveLength(3)
    const settled = body.settledBets.find((b: any) => b.id === bet1Id)
    expect(settled).toBeDefined()
    expect(settled.status).toBe('LOST')
    expect(settled.bettor.id).toBe(userIdA)
  })
})
