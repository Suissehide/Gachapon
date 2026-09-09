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

      // LEGENDARY : pas acquis (le pool garanti contient encore l'EPIC du
      // catalogue), mais surtout PAS la cote catalogue non plus — le tirage
      // n° 5 se joue dans {EPIC, LEG}, ou le legendaire sort une fois sur
      // deux. Derivation a la main, garantie EPIC < LEGENDARY donc
      // desamorcable par un EPIC qui ne gagne pas le pari :
      //   a = P(>= LEG)          = 1/100 = 0,01
      //   b = P(EPIC <= r < LEG) = 2/100 - 1/100 = 0,01   (desamorce sans gagner)
      //   aGarantie = P(>= LEG | pool {EPIC 1, LEG 1}) = 1/2
      const a = 0.01
      const b = 0.01
      const intact4 = (1 - a - b) ** 4
      const alive4 = (1 - a) ** 4
      // Au tirage 5 : intact -> pool garanti ; deja desamorce -> pool normal.
      const survive5 = intact4 * (1 - 0.5) + (alive4 - intact4) * (1 - a)
      const pGuaranteedEpic = 1 - survive5 * (1 - a) ** 5 // 0.5254277

      const legendary = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'LEGENDARY'),
        headers: { cookie: cookiesA },
      })
      expect(legendary.json().probability).toBeCloseTo(pGuaranteedEpic, 6)
      expect(legendary.json().multiplier).toBe(
        expectedMultiplier(pGuaranteedEpic),
      )
      // Tres loin de la cote catalogue : c'est tout l'ecart que l'ancienne
      // version offrait a la maison.
      expect(legendary.json().probability).toBeGreaterThan(
        LEGENDARY_PROBABILITY * 5,
      )

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

  it("garantie LEGENDARY sur un pari LEGENDARY : le tirage garanti se paie a son vrai prix", async () => {
    // Ici la garantie ne peut etre desamorcee QUE par un legendaire, qui
    // gagne deja le pari : le terme de desamorcage est nul et la composition
    // se reduit a « 9 tirages ordinaires + 1 tirage dans {EPIC, LEG} ».
    const boost = await prisma.userBoost.create({
      data: {
        userId: userIdB,
        guaranteedRarity: 'LEGENDARY',
        pullsRemaining: 5,
        satisfied: false,
      },
    })
    try {
      const res = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'LEGENDARY'),
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(200)
      // p = 1 - 0,99^9 x 1/2
      const expected = 1 - 0.99 ** (PULL_WINDOW - 1) * 0.5 // 0.5432414
      expect(res.json().probability).toBeCloseTo(expected, 6)
      expect(res.json().multiplier).toBe(expectedMultiplier(expected))
    } finally {
      await prisma.userBoost.delete({ where: { id: boost.id } })
    }
  })

  it("garantie SOUS la rarete visee : desamorcable, donc pas de certitude", async () => {
    // Garantie RARE, pari EPIC. Le pool garanti {EPIC, LEG} gagnerait le
    // pari a coup sur... mais un RARE naturel satisfait le boost sans gagner
    // le pari, et un boost satisfait ne se declenche plus jamais. Vendre la
    // certitude ici, c'est faire payer plein tarif pour un gain plafonne sur
    // un evenement a ~3/4.
    const boost = await prisma.userBoost.create({
      data: {
        userId: userIdB,
        guaranteedRarity: 'RARE',
        pullsRemaining: 5,
        satisfied: false,
      },
    })
    try {
      const res = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'EPIC'),
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(200)
      //   a = P(>= EPIC)           = 2/100 = 0,02
      //   b = P(RARE <= r < EPIC)  = 10/100 - 2/100 = 0,08
      //   aGarantie = P(>= EPIC | pool {EPIC, LEG}) = 1
      const a = 0.02
      const b = 0.08
      const intact4 = (1 - a - b) ** 4
      const alive4 = (1 - a) ** 4
      const survive5 = intact4 * (1 - 1) + (alive4 - intact4) * (1 - a)
      const expected = 1 - survive5 * (1 - a) ** 5 // 0.7641283

      expect(res.json().probability).toBeCloseTo(expected, 6)
      expect(res.json().multiplier).toBe(expectedMultiplier(expected))
      // Ni certitude...
      expect(res.json().probability).toBeLessThan(1)
      expect(res.json().multiplier).toBeGreaterThan(1)
      // ...ni cote catalogue : la garantie compte quand meme, quand elle
      // survit jusqu'au tirage n° 5.
      expect(res.json().probability).toBeGreaterThan(EPIC_PROBABILITY)
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

    // Les boosts crees dans les phases ci-dessous sont enregistres ici pour
    // que le `finally` les supprime QUOI QU'IL ARRIVE : un boost de 50
    // tirages laisse sur A ou B decalerait silencieusement toutes les cotes
    // du fichier, transformant un echec en cascade.
    const createdBoostIds: string[] = []

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
      createdBoostIds.push(bettorBoost.id)
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
      createdBoostIds.push(targetBoost.id)
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
      await prisma.userBoost.deleteMany({
        where: { id: { in: createdBoostIds } },
      })
      await prisma.userSkill.deleteMany({ where: { nodeId: node.id } })
      await prisma.skillNodeLevel.deleteMany({ where: { nodeId: node.id } })
      await prisma.skillNode.delete({ where: { id: node.id } })
      await prisma.skillBranch.delete({ where: { id: branch.id } })
    }
  })

  it("boule d'or de la cible : le pool restreint entre dans la cote", async () => {
    // Le moteur roule la boule d'or sur chaque tirage ordinaire avec la
    // probabilite du skill tree (en POINTS de pourcentage) et restreint alors
    // le pool a {RARE, EPIC, LEGENDARY}. Ne pas la lire, c'est sous-estimer
    // les chances des joueurs sur qui les autres voudront justement parier.
    const branch = await prisma.skillBranch.create({
      data: {
        name: `BetGoldBranch${suffix}`,
        description: 'test',
        icon: 'x',
        color: '#fff',
        order: 998,
      },
    })
    const node = await prisma.skillNode.create({
      data: {
        branchId: branch.id,
        name: `BetGoldNode${suffix}`,
        description: 'test',
        icon: 'x',
        maxLevel: 1,
        effectType: 'GOLDEN_BALL_CHANCE',
        posX: 0,
        posY: 0,
      },
    })
    // effect 40 -> goldenBallChance = 40 points de pourcentage
    await prisma.skillNodeLevel.create({
      data: { nodeId: node.id, level: 1, effect: 40 },
    })

    try {
      await prisma.userSkill.create({
        data: { userId: userIdB, nodeId: node.id, level: 1 },
      })

      const gamma = 0.4
      // Pool dore : {RARE 8, EPIC 1, LEG 1}, poids total 10.
      const goldenTotal = WEIGHT_RARE + WEIGHT_EPIC + WEIGHT_LEGENDARY

      // Pari LEGENDARY : 1/10 dans le pool dore contre 1/100 au catalogue.
      const aLegendary =
        gamma * (WEIGHT_LEGENDARY / goldenTotal) + (1 - gamma) * 0.01
      const pLegendary = 1 - (1 - aLegendary) ** PULL_WINDOW // 0.375518
      const legendary = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB, 'LEGENDARY'),
        headers: { cookie: cookiesA },
      })
      expect(legendary.statusCode).toBe(200)
      expect(legendary.json().probability).toBeCloseTo(pLegendary, 6)
      expect(legendary.json().multiplier).toBe(expectedMultiplier(pLegendary))
      // La cote ne peut que MONTER en probabilite (baisser en multiplicateur)
      // par rapport a un joueur sans boule d'or.
      expect(legendary.json().probability).toBeGreaterThan(
        LEGENDARY_PROBABILITY,
      )
      expect(legendary.json().multiplier).toBeLessThan(LEGENDARY_MULTIPLIER)

      // Pari RARE+ : le pool dore est entierement gagnant, q vaut 1 sur les
      // tirages dores.
      const aRare = gamma * 1 + (1 - gamma) * 0.1
      const pRare = 1 - (1 - aRare) ** PULL_WINDOW
      const rare = await app.inject({
        method: 'GET',
        url: quoteUrl(userIdB),
        headers: { cookie: cookiesA },
      })
      expect(rare.json().probability).toBeCloseTo(pRare, 6)
      expect(rare.json().probability).toBeGreaterThan(EXPECTED_PROBABILITY)
    } finally {
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

  // ---------------------------------------------------------------------
  // Reglement (tache 11)
  // ---------------------------------------------------------------------
  describe('reglement du pari', () => {
    let rareSetId: string
    let commonSetId: string
    let rareCardId: string
    let wonBetId: string

    // Deactive tous les CardSet puis n'active que celui donne. Le catalogue
    // est un etat partage entre fichiers e2e : l'afterAll du describe parent
    // restaure le snapshot pris avant ce fichier.
    async function activateOnly(setId: string) {
      await prisma.cardSet.updateMany({ data: { isActive: false } })
      await prisma.cardSet.update({
        where: { id: setId },
        data: { isActive: true },
      })
    }

    // Le declenchement au tirage est fire-and-forget (`void betDomain
    // .settleForUser(...).catch(...)`) : la reponse HTTP du tirage revient
    // avant que le reglement n'ait forcement fini. On sonde donc la ligne.
    async function waitForBetStatus(
      betId: string,
      status: string,
      timeoutMs = 5000,
    ) {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const row = await prisma.bet.findUnique({ where: { id: betId } })
        if (row?.status === status) {
          return row
        }
        await new Promise((r) => setTimeout(r, 25))
      }
      throw new Error(
        `Timeout: le pari ${betId} n'a pas atteint le statut ${status}`,
      )
    }

    // Meme raison que waitForBetStatus, pour un pari qui n'est PAS encore
    // tranche : c'est `pullsSeen` qui bouge, pas le statut.
    async function waitForPullsSeen(
      betId: string,
      pullsSeen: number,
      timeoutMs = 5000,
    ) {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const row = await prisma.bet.findUnique({ where: { id: betId } })
        if (row?.pullsSeen === pullsSeen) {
          return row
        }
        await new Promise((r) => setTimeout(r, 25))
      }
      throw new Error(
        `Timeout: le pari ${betId} n'a pas atteint ${pullsSeen} tirages vus`,
      )
    }

    async function wagersOf(cookie: string) {
      const res = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/wagers`,
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
      return res.json()
    }

    function dustOf(userId: string): Promise<number> {
      return prisma.user
        .findUnique({ where: { id: userId } })
        .then((u: { dust: number }) => u.dust)
    }

    beforeAll(async () => {
      // Les paris ACTIVE laisses par les tests de plafond saturent le
      // plafond de B et seraient regles par ses tirages : on repart d'une
      // table vide pour cette equipe.
      await prisma.bet.deleteMany({ where: { teamId } })

      const rareSet = await prisma.cardSet.create({
        data: { name: `BetRareOnly${suffix}`, isActive: false },
      })
      const rareCard = await prisma.card.create({
        data: {
          name: `BetRareOnlyCard${suffix}`,
          rarity: 'RARE',
          dropWeight: 10,
          setId: rareSet.id,
        },
      })
      rareSetId = rareSet.id
      rareCardId = rareCard.id

      const commonSet = await prisma.cardSet.create({
        data: { name: `BetCommonOnly${suffix}`, isActive: false },
      })
      await prisma.card.create({
        data: {
          name: `BetCommonOnlyCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 10,
          setId: commonSet.id,
        },
      })
      commonSetId = commonSet.id

      await activateOnly(betSetId)
    })

    afterAll(async () => {
      await activateOnly(betSetId)
    })

    it('pari RARE sur B : une RARE des le premier tirage -> WON, A creditee de round(mise x cote) MISE COMPRISE', async () => {
      // La cote est figee sur le catalogue de controle (1,38) : c'est ce qui
      // rend le paiement discernable a la fois de la mise seule (200) et du
      // seul benefice (76).
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      wonBetId = placed.json().id
      expect(placed.json().multiplier).toBe(EXPECTED_MULTIPLIER)

      const dustAfterPlacement = await dustOf(userIdA)
      expect(dustAfterPlacement).toBe(5000 - stake)

      // Catalogue 100 % RARE : le premier tirage de B gagne le pari.
      await activateOnly(rareSetId)
      await prisma.user.update({
        where: { id: userIdB },
        data: { tokens: 20, lastTokenAt: new Date() },
      })
      const pull = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookiesB },
      })
      expect(pull.statusCode).toBe(201)
      expect(pull.json().card.rarity).toBe('RARE')

      const row = await waitForBetStatus(wonBetId, 'WON')
      const expectedPayout = Math.round(stake * EXPECTED_MULTIPLIER)
      // Verrou explicite : round(200 x 1,38) = 276, mise comprise.
      expect(expectedPayout).toBe(276)
      expect(row.payout).toBe(expectedPayout)
      expect(row.pullsSeen).toBe(1)
      expect(row.settledAt).not.toBeNull()

      const dustAfterSettle = await dustOf(userIdA)
      expect(dustAfterSettle).toBe(dustAfterPlacement + expectedPayout)
      // Ce n'est ni le seul benefice (76), ni un simple remboursement (200).
      expect(dustAfterSettle - dustAfterPlacement).toBe(276)

      // Assertion sur la REPONSE HTTP : le provider Zod retire du JSON toute
      // cle absente du schema, un controle sur la valeur de retour du
      // domaine ne verrait pas cette perte.
      const body = await wagersOf(cookiesA)
      const view = body.settledBets.find((b: any) => b.id === wonBetId)
      expect(view).toBeDefined()
      expect(view.status).toBe('WON')
      expect(view.payout).toBe(expectedPayout)
      expect(view.pullsSeen).toBe(1)
      expect(view.settledAt).not.toBeNull()
      expect(view.myRole).toBe('BETTOR')
      expect(body.bets.some((b: any) => b.id === wonBetId)).toBe(false)
    })

    it('plafond de la cote : un boost achete par la CIBLE apres le placement fait payer la cote recalculee', async () => {
      // La boutique vend un boost qui double le poids d'une rarete sur
      // exactement la longueur de la fenetre. Sans plafond, la cible
      // l'achetait APRES le placement : la vraie probabilite doublait
      // pendant que le paiement restait fige sur l'ancienne cote — une
      // esperance positive pour le parieur, boost paye compris.
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id
      expect(placed.json().multiplier).toBe(EXPECTED_MULTIPLIER)
      const dustAfterPlacement = await dustOf(userIdA)

      const boost = await prisma.userBoost.create({
        data: {
          userId: userIdB,
          weightMultiplier: 2,
          weightRarity: 'RARE',
          pullsRemaining: PULL_WINDOW,
        },
      })
      try {
        // Tirage insere DIRECTEMENT en base : la route decrementerait le
        // boost, or on veut le voir intact au reglement. Horodate juste
        // APRES la creation du pari et jamais dans le futur : un tirage
        // post-date deborderait sur la fenetre des paris suivants.
        const placedRow = await prisma.bet.findUnique({ where: { id: betId } })
        await prisma.gachaPull.create({
          data: {
            userId: userIdB,
            cardId: rareCardId,
            variant: 'NORMAL',
            pulledAt: new Date(placedRow.createdAt.getTime() + 1),
          },
        })
        const { betDomain } = (app as any).iocContainer
        await betDomain.settleBet(betId)

        // Poids sous boost : COMMON 90, RARE 8x2 = 16, EPIC 1, LEG 1 -> 108.
        const qBoost =
          (WEIGHT_RARE * 2 + WEIGHT_EPIC + WEIGHT_LEGENDARY) /
          (WEIGHT_COMMON + WEIGHT_RARE * 2 + WEIGHT_EPIC + WEIGHT_LEGENDARY)
        const capped = expectedMultiplier(1 - (1 - qBoost) ** PULL_WINDOW)
        expect(capped).toBeLessThan(EXPECTED_MULTIPLIER)

        const row = await prisma.bet.findUnique({ where: { id: betId } })
        expect(row.status).toBe('WON')
        expect(row.payout).toBe(Math.round(stake * capped))
        // Verrou explicite : 214 et non 276.
        expect(row.payout).toBe(214)
        expect(row.payout).not.toBe(Math.round(stake * EXPECTED_MULTIPLIER))
        expect(await dustOf(userIdA)).toBe(dustAfterPlacement + row.payout)
        // La cote annoncee reste ecrite telle quelle : c'est un PLAFOND, pas
        // une reecriture de ce qui a ete promis au parieur.
        expect(row.multiplier).toBe(EXPECTED_MULTIPLIER)
      } finally {
        await prisma.userBoost.delete({ where: { id: boost.id } })
      }
    })

    it('plafond de la cote : sans rien qui bouge, le paiement est EXACTEMENT la cote figee', async () => {
      // Garde-fou inverse du test precedent : un recalcul qui ne repartirait
      // pas des valeurs GELEES au placement (pitie, chance) ou qui derive a
      // l'arrondi ferait mordre le plafond alors que rien n'a change.
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })
      const pityBefore = (
        await prisma.user.findUnique({ where: { id: userIdB } })
      ).pityCurrent

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id
      const dustAfterPlacement = await dustOf(userIdA)

      const stored = await prisma.bet.findUnique({ where: { id: betId } })
      expect(stored.placementPity).toBe(pityBefore)
      expect(stored.placementLuck).toBe(1)

      await prisma.gachaPull.create({
        data: {
          userId: userIdB,
          cardId: rareCardId,
          variant: 'NORMAL',
          pulledAt: new Date(stored.createdAt.getTime() + 1),
        },
      })
      // La pitie de la cible avance pendant la fenetre : la relire au lieu
      // de repartir de `placementPity` deplacerait la cote recalculee.
      await prisma.user.update({
        where: { id: userIdB },
        data: { pityCurrent: pityBefore + 5 },
      })
      const { betDomain } = (app as any).iocContainer
      await betDomain.settleBet(betId)

      const row = await prisma.bet.findUnique({ where: { id: betId } })
      expect(row.status).toBe('WON')
      expect(row.payout).toBe(Math.round(stake * EXPECTED_MULTIPLIER))
      expect(row.payout).toBe(276)
      expect(await dustOf(userIdA)).toBe(dustAfterPlacement + row.payout)
    })

    it('plafond de la cote : des chances DEGRADEES apres le placement ne rabaissent pas le paiement', async () => {
      // Sens inverse du plafond : si les vraies chances de la cible BAISSENT
      // apres le placement (son boost expire), le parieur garde la cote qui
      // lui a ete annoncee. Sans le `min`, on lui paierait la cote recalculee
      // — plus genereuse ici, mais ce serait la meme mecanique qui, dans
      // l'autre sens, le sous-paierait. Le fige est un PLAFOND, pas un
      // remplacement.
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      // Le boost existe AVANT le placement : il entre donc dans la cote figee.
      const boost = await prisma.userBoost.create({
        data: {
          userId: userIdB,
          weightMultiplier: 2,
          weightRarity: 'RARE',
          pullsRemaining: PULL_WINDOW,
        },
      })
      const qBoost =
        (WEIGHT_RARE * 2 + WEIGHT_EPIC + WEIGHT_LEGENDARY) /
        (WEIGHT_COMMON + WEIGHT_RARE * 2 + WEIGHT_EPIC + WEIGHT_LEGENDARY)
      const boostedMultiplier = expectedMultiplier(
        1 - (1 - qBoost) ** PULL_WINDOW,
      )

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id
      expect(placed.json().multiplier).toBe(boostedMultiplier)
      const dustAfterPlacement = await dustOf(userIdA)

      // Le boost disparait : les vraies chances retombent au catalogue nu,
      // donc la cote recalculee REMONTE au-dessus de la cote figee.
      await prisma.userBoost.delete({ where: { id: boost.id } })
      expect(EXPECTED_MULTIPLIER).toBeGreaterThan(boostedMultiplier)

      const stored = await prisma.bet.findUnique({ where: { id: betId } })
      await prisma.gachaPull.create({
        data: {
          userId: userIdB,
          cardId: rareCardId,
          variant: 'NORMAL',
          pulledAt: new Date(stored.createdAt.getTime() + 1),
        },
      })
      const { betDomain } = (app as any).iocContainer
      await betDomain.settleBet(betId)

      const row = await prisma.bet.findUnique({ where: { id: betId } })
      expect(row.status).toBe('WON')
      expect(row.payout).toBe(Math.round(stake * boostedMultiplier))
      // Verrou explicite : 214 (cote annoncee) et non 276 (cote recalculee).
      expect(row.payout).toBe(214)
      expect(row.payout).not.toBe(Math.round(stake * EXPECTED_MULTIPLIER))
      expect(await dustOf(userIdA)).toBe(dustAfterPlacement + row.payout)
    })

    it('pari LEGENDARY : B fait ses 10 tirages sans legendaire -> LOST, la poussiere de A ne bouge plus', async () => {
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'LEGENDARY', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id
      expect(placed.json().multiplier).toBe(LEGENDARY_MULTIPLIER)

      // La mise est deja debitee au placement : c'est CE solde qui ne doit
      // plus bouger d'un point une fois le pari perdu.
      const dustAfterPlacement = await dustOf(userIdA)
      expect(dustAfterPlacement).toBe(5000 - stake)

      await activateOnly(commonSetId)
      await prisma.user.update({
        where: { id: userIdB },
        data: { tokens: 30, lastTokenAt: new Date() },
      })
      for (let i = 0; i < PULL_WINDOW; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesB },
        })
        expect(res.statusCode).toBe(201)
        expect(res.json().card.rarity).toBe('COMMON')
      }

      const row = await waitForBetStatus(betId, 'LOST')
      expect(row.payout).toBe(0)
      expect(row.pullsSeen).toBe(PULL_WINDOW)
      expect(row.settledAt).not.toBeNull()
      expect(await dustOf(userIdA)).toBe(dustAfterPlacement)

      const body = await wagersOf(cookiesA)
      const view = body.settledBets.find((b: any) => b.id === betId)
      expect(view).toBeDefined()
      expect(view.status).toBe('LOST')
      expect(view.payout).toBe(0)
    })

    it("verdict encore indecidable : la ligne est ECRITE quand meme (pullsSeen), sans rien trancher ni crediter", async () => {
      // TOUTE branche du reglement reecrit la ligne Bet, y compris celle ou
      // le verdict est indecidable. C'est cette ecriture systematique qui,
      // sous isolation Serializable, met deux reglements concurrents du meme
      // pari en conflit — et donc qui donne sa portee a la relecture du
      // statut en tete de transaction. La supprimer retirerait ce verrou en
      // silence : ce test la rend observable.
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id
      const dustAfterPlacement = await dustOf(userIdA)

      // 3 COMMON sur une fenetre de 10 : ni succes, ni fenetre epuisee, ni
      // echeance atteinte.
      await activateOnly(commonSetId)
      await prisma.user.update({
        where: { id: userIdB },
        data: { tokens: 10, lastTokenAt: new Date() },
      })
      for (let i = 0; i < 3; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesB },
        })
        expect(res.statusCode).toBe(201)
      }

      const row = await waitForPullsSeen(betId, 3)
      expect(row.status).toBe('ACTIVE')
      expect(row.payout).toBe(0)
      expect(row.settledAt).toBeNull()
      expect(await dustOf(userIdA)).toBe(dustAfterPlacement)

      const body = await wagersOf(cookiesA)
      const view = body.bets.find((b: any) => b.id === betId)
      expect(view).toBeDefined()
      expect(view.status).toBe('ACTIVE')
      expect(view.pullsSeen).toBe(3)
    })

    it('rejouer le reglement sur un pari deja regle ne recredite rien', async () => {
      const { betDomain } = (app as any).iocContainer
      const before = await prisma.bet.findUnique({ where: { id: wonBetId } })
      const dustBefore = await dustOf(userIdA)

      // `settleBet` entre DANS la transaction sans passer par le filtre
      // `status: ACTIVE` du repository : seule la relecture du statut a
      // l'interieur de la transaction peut alors empecher un second credit.
      // Passer uniquement par `settleForUser` testerait le filtre SQL, pas
      // le garde-fou d'idempotence.
      await betDomain.settleBet(wonBetId)
      await betDomain.settleForUser(userIdB)

      expect(await dustOf(userIdA)).toBe(dustBefore)
      const after = await prisma.bet.findUnique({ where: { id: wonBetId } })
      expect(after.status).toBe('WON')
      expect(after.payout).toBe(before.payout)
      expect(after.settledAt.getTime()).toBe(before.settledAt.getTime())
    })

    it('deux reglements concurrents du meme pari ne creditent qu\'une fois', async () => {
      const { betDomain } = (app as any).iocContainer
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 200
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id

      // Tirage insere DIRECTEMENT en base : il ne passe pas par la route,
      // donc aucun reglement automatique ne vient decider avant nous.
      await prisma.gachaPull.create({
        data: {
          userId: userIdB,
          cardId: rareCardId,
          variant: 'NORMAL',
          pulledAt: new Date(Date.now() + 1000),
        },
      })

      const dustBefore = await dustOf(userIdA)
      await Promise.all([
        betDomain.settleBet(betId),
        betDomain.settleBet(betId),
        betDomain.settleBet(betId),
      ])

      const row = await prisma.bet.findUnique({ where: { id: betId } })
      expect(row.status).toBe('WON')
      expect(await dustOf(userIdA)).toBe(dustBefore + row.payout)
      expect(row.payout).toBe(Math.round(stake * EXPECTED_MULTIPLIER))
    })

    it('echeance depassee et cible inactive : la LECTURE de GET /teams/:id/wagers passe le pari EXPIRED et REMBOURSE la mise', async () => {
      await activateOnly(betSetId)
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 300
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/bets`,
        headers: { cookie: cookiesA },
        // D est un compte sans session HTTP : il ne tirera jamais.
        payload: { targetId: userIdD, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id
      const dustAfterPlacement = await dustOf(userIdA)
      expect(dustAfterPlacement).toBe(5000 - stake)

      await prisma.bet.update({
        where: { id: betId },
        data: { deadlineAt: new Date(Date.now() - 60 * 1000) },
      })

      // Aucun tirage ne se produira : sans reglement paresseux a la lecture,
      // ce pari resterait ACTIVE pour toujours et la mise serait perdue.
      const body = await wagersOf(cookiesA)
      const view = body.settledBets.find((b: any) => b.id === betId)
      expect(view).toBeDefined()
      expect(view.status).toBe('EXPIRED')
      expect(view.settledAt).not.toBeNull()
      // Un pari expire ne doit pas disparaitre de la vue : le joueur doit
      // pouvoir constater son remboursement.
      expect(body.bets.some((b: any) => b.id === betId)).toBe(false)

      expect(await dustOf(userIdA)).toBe(dustAfterPlacement + stake)
      const row = await prisma.bet.findUnique({ where: { id: betId } })
      expect(row.status).toBe('EXPIRED')
      expect(row.pullsSeen).toBe(0)

      // Une seconde lecture ne rembourse pas deux fois, et le pari reste
      // visible.
      const again = await wagersOf(cookiesA)
      expect(
        again.settledBets.some(
          (b: any) => b.id === betId && b.status === 'EXPIRED',
        ),
      ).toBe(true)
      expect(await dustOf(userIdA)).toBe(dustAfterPlacement + stake)
    })

    it("echeance depassee avec une fenetre ENTAMEE mais incomplete : PERDU, pas de remboursement", async () => {
      // Le remboursement est reserve a la cible genuinement ABSENTE. Une
      // cible qui tire puis s'arrete a un tirage de la fin rendait le pari
      // imperdable (gagne si une carte qualifiante sortait, rembourse sinon)
      // : deux comptes complices en tiraient une imprimante a poussiere.
      const stake = 250
      const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const bet = await prisma.bet.create({
        data: {
          teamId,
          bettorId: userIdA,
          targetId: userIdE,
          stake,
          minRarity: 'RARE',
          pullWindow: PULL_WINDOW,
          multiplier: EXPECTED_MULTIPLIER,
          createdAt,
          deadlineAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      })
      // Un seul tirage COMMON sur une fenetre de 10 : entamee, incomplete,
      // et sans succes.
      const commonCard = await prisma.card.findFirst({
        where: { setId: commonSetId },
      })
      await prisma.gachaPull.create({
        data: {
          userId: userIdE,
          cardId: commonCard.id,
          variant: 'NORMAL',
          pulledAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        },
      })

      const dustBefore = await dustOf(userIdA)
      const body = await wagersOf(cookiesA)
      const view = body.settledBets.find((b: any) => b.id === bet.id)
      expect(view).toBeDefined()
      expect(view.status).toBe('LOST')
      expect(view.payout).toBe(0)
      expect(view.pullsSeen).toBe(1)
      // La mise reste a la maison : le solde du parieur ne bouge pas.
      expect(await dustOf(userIdA)).toBe(dustBefore)
    })

    it('un succes obtenu AVANT une echeance depassee gagne quand meme', async () => {
      // Pari insere a la main dans le passe (createdAt il y a 2 h, echeance
      // il y a 1 h) avec un tirage qualifiant entre les deux : le verdict
      // doit voir le succes AVANT de regarder l'echeance.
      const stake = 200
      const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const bet = await prisma.bet.create({
        data: {
          teamId,
          bettorId: userIdA,
          targetId: userIdF,
          stake,
          minRarity: 'RARE',
          pullWindow: PULL_WINDOW,
          multiplier: EXPECTED_MULTIPLIER,
          createdAt,
          deadlineAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      })
      await prisma.gachaPull.create({
        data: {
          userId: userIdF,
          cardId: rareCardId,
          variant: 'NORMAL',
          pulledAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        },
      })

      const dustBefore = await dustOf(userIdA)
      const body = await wagersOf(cookiesA)
      const view = body.settledBets.find((b: any) => b.id === bet.id)
      expect(view).toBeDefined()
      expect(view.status).toBe('WON')

      const expectedPayout = Math.round(stake * EXPECTED_MULTIPLIER)
      expect(view.payout).toBe(expectedPayout)
      expect(await dustOf(userIdA)).toBe(dustBefore + expectedPayout)
      // Et surtout : pas un remboursement de la mise.
      expect(expectedPayout).not.toBe(stake)
    })
  })
})
