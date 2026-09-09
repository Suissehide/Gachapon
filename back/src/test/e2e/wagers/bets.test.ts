import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// Catalogue controle : COMMON 90 / RARE 8 / EPIC 1 / LEGENDARY 1, total 100.
// q(RARE+) = 10/100 = 0,1 exactement, ce qui rend la cote previsible.
// L'EPIC est indispensable au scenario de garantie : le moteur filtre le pool
// sur {EPIC, LEGENDARY}, donc sans carte EPIC au catalogue la garantie
// forcerait un LEGENDARY et un pari sur LEGENDARY deviendrait certain lui
// aussi — le test n'opposerait plus rien.
const WEIGHT_COMMON = 90
const WEIGHT_RARE = 8
const WEIGHT_EPIC = 1
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

// p = 1 - (1 - q)^10 et cote = (1 - 10 %) / p, arrondie au centieme. Ces
// valeurs sont re-derivees a la main ici, sans passer par le code de prod.
function expectedMultiplier(probability: number): number {
  return (
    Math.round(((100 - HOUSE_FEE_PCT) / 100 / probability) * 100) / 100
  )
}

// RARE+ : q = (8 + 1 + 1) / 100 = 0,1
const EXPECTED_PROBABILITY = 1 - 0.9 ** PULL_WINDOW // 0.6513215599
const EXPECTED_MULTIPLIER = expectedMultiplier(EXPECTED_PROBABILITY) // 1.38
// EPIC+ : q = (1 + 1) / 100 = 0,02
const EPIC_PROBABILITY = 1 - 0.98 ** PULL_WINDOW // 0.1829271932
const EPIC_MULTIPLIER = expectedMultiplier(EPIC_PROBABILITY) // 4.92
// LEGENDARY : q = 1 / 100 = 0,01
const LEGENDARY_PROBABILITY = 1 - 0.99 ** PULL_WINDOW // 0.0956179250
const LEGENDARY_MULTIPLIER = expectedMultiplier(LEGENDARY_PROBABILITY) // 9.41

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
          name: `BetEpic${suffix}`,
          rarity: 'EPIC',
          dropWeight: WEIGHT_EPIC,
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

  it("court-circuit de pitie : la certitude commence a T - N + 1, pas a T - N", async () => {
    // Le moteur force un LEGENDARY quand le compteur LU AVANT le tirage a
    // deja atteint T, et ce compteur avance d'un par tirage non legendaire.
    // Depuis un compteur persiste P, le tirage n° k voit P + (k - 1) : la
    // pitie tombe dans une fenetre de N tirages ssi P + N - 1 >= T.
    //
    // A P = T - N + 1 = 291 : le 10e tirage voit 300 -> legendaire force.
    try {
      await prisma.user.update({
        where: { id: userIdB },
        data: { pityCurrent: PITY_THRESHOLD - PULL_WINDOW + 1 },
      })
      const certain = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB),
        headers: { cookie: cookiesA },
      })
      expect(certain.statusCode).toBe(200)
      expect(certain.json().probability).toBe(1)
      expect(certain.json().multiplier).toBe(1)

      // A P = T - N = 290 : le 10e tirage voit 299, un cran SOUS le seuil.
      // Rien n'est force, la cote doit rester celle du catalogue. C'est la
      // borne que la premiere version du code vendait a tort comme certaine.
      await prisma.user.update({
        where: { id: userIdB },
        data: { pityCurrent: PITY_THRESHOLD - PULL_WINDOW },
      })
      const notYet = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB),
        headers: { cookie: cookiesA },
      })
      expect(notYet.json().probability).toBeCloseTo(EXPECTED_PROBABILITY, 6)
      expect(notYet.json().multiplier).toBe(EXPECTED_MULTIPLIER)
    } finally {
      // Etat partage : la remise a zero doit avoir lieu meme si une
      // assertion casse, sinon l'echec se propage aux tests suivants.
      await prisma.user.update({
        where: { id: userIdB },
        data: { pityCurrent: 0 },
      })
    }
  })

  it("boost de garantie : certain jusqu'a EPIC, pas sur LEGENDARY", async () => {
    // Le moteur declenche la garantie au tirage ou le compteur du boost vaut
    // exactement 1 (donc au tirage n° R depuis un compteur persiste R), et
    // filtre alors le pool sur l'ensemble CODE EN DUR {EPIC, LEGENDARY} — il
    // ne lit PAS `guaranteedRarity` pour choisir le pool. R = 5 <= 10 : la
    // garantie tombe dans la fenetre.
    const boost = await prisma.userBoost.create({
      data: {
        userId: userIdB,
        guaranteedRarity: 'EPIC',
        pullsRemaining: 5,
        satisfied: false,
      },
    })

    try {
      for (const rarity of ['COMMON', 'UNCOMMON', 'RARE', 'EPIC']) {
        const res = await app.inject({
          method: 'GET',
          url: quoteUrl(userIdB, rarity),
          headers: { cookie: cookiesA },
        })
        expect(res.statusCode).toBe(200)
        // Un EPIC garanti satisfait toutes ces raretes.
        expect(res.json().probability).toBe(1)
        expect(res.json().multiplier).toBe(1)
      }

      // LEGENDARY : le pool garanti contient encore l'EPIC du catalogue, donc
      // rien n'est acquis. La cote reste celle du catalogue.
      const legendary = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'LEGENDARY'),
        headers: { cookie: cookiesA },
      })
      expect(legendary.json().probability).toBeCloseTo(LEGENDARY_PROBABILITY, 6)
      expect(legendary.json().multiplier).toBe(LEGENDARY_MULTIPLIER)

      // R = 11 > 10 : la garantie tombe HORS de la fenetre, plus aucune
      // certitude — c'est la borne R <= N.
      await prisma.userBoost.update({
        where: { id: boost.id },
        data: { pullsRemaining: PULL_WINDOW + 1 },
      })
      const outOfWindow = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'EPIC'),
        headers: { cookie: cookiesA },
      })
      expect(outOfWindow.json().probability).toBeCloseTo(EPIC_PROBABILITY, 6)
      expect(outOfWindow.json().multiplier).toBe(EPIC_MULTIPLIER)

      // Un boost deja satisfait ne se declenche jamais.
      await prisma.userBoost.update({
        where: { id: boost.id },
        data: { pullsRemaining: 5, satisfied: true },
      })
      const satisfied = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'EPIC'),
        headers: { cookie: cookiesA },
      })
      expect(satisfied.json().probability).toBeCloseTo(EPIC_PROBABILITY, 6)
    } finally {
      await prisma.userBoost.delete({ where: { id: boost.id } })
    }
  })

  it('boost de poids qui expire en cours de fenetre : cote strictement entre les deux extremes', async () => {
    // 3 tirages boostes puis 7 sans. Un boost qui expire ne doit pas etre
    // facture comme s'il durait toute la fenetre.
    const boost = await prisma.userBoost.create({
      data: {
        userId: userIdB,
        weightMultiplier: 3,
        weightRarity: 'RARE',
        pullsRemaining: 3,
      },
    })

    try {
      // Poids sous boost : COMMON 90, RARE 8x3 = 24, EPIC 1, LEG 1 -> total 116
      const qBoosted = (WEIGHT_RARE * 3 + WEIGHT_EPIC + WEIGHT_LEGENDARY) /
        (WEIGHT_COMMON + WEIGHT_RARE * 3 + WEIGHT_EPIC + WEIGHT_LEGENDARY)
      const qPlain = 0.1
      const pMixed = 1 - (1 - qBoosted) ** 3 * (1 - qPlain) ** 7
      const pFullyBoosted = 1 - (1 - qBoosted) ** PULL_WINDOW

      const res = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB),
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(200)
      const p = res.json().probability

      // Strictement entre le prix non booste et le prix « booste partout ».
      expect(p).toBeGreaterThan(EXPECTED_PROBABILITY)
      expect(p).toBeLessThan(pFullyBoosted)
      expect(p).toBeCloseTo(pMixed, 6)
      expect(res.json().multiplier).toBe(expectedMultiplier(pMixed))

      // Le meme boost prolonge au-dela de la fenetre redonne exactement le
      // prix « booste partout » : la modelisation par tirage se reduit bien au
      // cas constant.
      await prisma.userBoost.update({
        where: { id: boost.id },
        data: { pullsRemaining: PULL_WINDOW },
      })
      const full = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB),
        headers: { cookie: cookiesA },
      })
      expect(full.json().probability).toBeCloseTo(pFullyBoosted, 6)
    } finally {
      await prisma.userBoost.delete({ where: { id: boost.id } })
    }
  })

  it("la cote lit la chance et les boosts de la CIBLE, jamais ceux du parieur", async () => {
    // Sans ce test, echanger targetId contre bettorId dans l'un ou l'autre
    // des deux appels laisserait toute la suite verte : les fixtures donnent
    // aux deux joueurs exactement les memes effets par defaut.
    const branch = await prisma.skillBranch.create({
      data: {
        name: `BetLuckBranch${suffix}`,
        description: 'test',
        icon: 'x',
        color: '#fff',
        order: 999,
      },
    })
    const node = await prisma.skillNode.create({
      data: {
        branchId: branch.id,
        name: `BetLuckNode${suffix}`,
        description: 'test',
        icon: 'x',
        maxLevel: 1,
        effectType: 'LUCK',
        posX: 0,
        posY: 0,
      },
    })
    // effect 50 -> luckMultiplier = 1 + 50/100 = 1,5
    await prisma.skillNodeLevel.create({
      data: { nodeId: node.id, level: 1, effect: 50 },
    })

    const quote = async () => {
      const res = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB),
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(200)
      return res.json().probability as number
    }

    try {
      expect(await quote()).toBeCloseTo(EXPECTED_PROBABILITY, 6)

      // Phase 1 — c'est le PARIEUR qui detient chance et boost. La cote sur
      // la cible ne doit pas bouger d'un iota.
      await prisma.userSkill.create({
        data: { userId: userIdA, nodeId: node.id, level: 1 },
      })
      const bettorBoost = await prisma.userBoost.create({
        data: {
          userId: userIdA,
          weightMultiplier: 3,
          weightRarity: 'RARE',
          pullsRemaining: 50,
        },
      })
      expect(await quote()).toBeCloseTo(EXPECTED_PROBABILITY, 6)

      await prisma.userSkill.deleteMany({ where: { userId: userIdA } })
      await prisma.userBoost.delete({ where: { id: bettorBoost.id } })

      // Phase 2 — la CIBLE detient la chance : luck 1,5 applique aux RARE+
      // donne poids 12 / 1,5 / 1,5 pour un total de 105.
      await prisma.userSkill.create({
        data: { userId: userIdB, nodeId: node.id, level: 1 },
      })
      const qLuck =
        (WEIGHT_RARE * 1.5 + WEIGHT_EPIC * 1.5 + WEIGHT_LEGENDARY * 1.5) /
        (WEIGHT_COMMON +
          WEIGHT_RARE * 1.5 +
          WEIGHT_EPIC * 1.5 +
          WEIGHT_LEGENDARY * 1.5)
      const pLuck = 1 - (1 - qLuck) ** PULL_WINDOW
      const withLuck = await quote()
      expect(withLuck).toBeCloseTo(pLuck, 6)
      expect(withLuck).toBeGreaterThan(EXPECTED_PROBABILITY)
      await prisma.userSkill.deleteMany({ where: { userId: userIdB } })

      // Phase 3 — la CIBLE detient le boost de poids (plus long que la
      // fenetre, donc sans expiration a modeliser ici).
      const targetBoost = await prisma.userBoost.create({
        data: {
          userId: userIdB,
          weightMultiplier: 3,
          weightRarity: 'RARE',
          pullsRemaining: 50,
        },
      })
      const qBoost =
        (WEIGHT_RARE * 3 + WEIGHT_EPIC + WEIGHT_LEGENDARY) /
        (WEIGHT_COMMON + WEIGHT_RARE * 3 + WEIGHT_EPIC + WEIGHT_LEGENDARY)
      const withBoost = await quote()
      expect(withBoost).toBeCloseTo(1 - (1 - qBoost) ** PULL_WINDOW, 6)
      expect(withBoost).toBeGreaterThan(EXPECTED_PROBABILITY)
      await prisma.userBoost.delete({ where: { id: targetBoost.id } })

      expect(await quote()).toBeCloseTo(EXPECTED_PROBABILITY, 6)
    } finally {
      // Le catalogue de competences est partage entre fichiers e2e : on
      // remet la base exactement comme on l'a trouvee.
      await prisma.userSkill.deleteMany({ where: { nodeId: node.id } })
      await prisma.skillNodeLevel.deleteMany({ where: { nodeId: node.id } })
      await prisma.skillNode.delete({ where: { id: node.id } })
      await prisma.skillBranch.delete({ where: { id: branch.id } })
    }
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
