import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

/**
 * `GET /me/bets` : les paris en cours places SUR moi, toutes equipes
 * confondues — la source « pari » de la pastille de notification, jumelle de
 * `GET /me/duels`.
 *
 * Contrairement a un defi ou une invitation, un pari ne se repond pas : la
 * ligne est informative et vit le temps du pari. Rien a accepter, donc rien a
 * marquer comme lu — c'est le reglement qui la retire.
 */
describe('GET /me/bets', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookiesBettor: string
  let cookiesTarget: string
  let cookiesBystander: string
  let userIdBettor: string
  let userIdTarget: string
  let userIdBystander: string
  let teamId: string
  let betSetId: string
  let baselineActiveSetIds: string[] = []

  const suffix = Date.now()
  const password = 'Password123!'
  const STAKE = 200

  async function registerAndLogin(tag: string) {
    const email = `mbet${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `mbet${tag}${suffix}`, email, password },
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

  async function placeBet() {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/bets`,
      headers: { cookie: cookiesBettor },
      payload: { targetId: userIdTarget, minRarity: 'RARE', stake: STAKE },
    })
    expect(res.statusCode).toBe(201)
    return res.json().id as string
  }

  async function myBets(cookie: string) {
    const res = await app.inject({
      method: 'GET',
      url: '/me/bets',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    return res.json().bets as { id: string }[]
  }

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma

    const bettor = await registerAndLogin('Bet')
    const target = await registerAndLogin('Tgt')
    const bystander = await registerAndLogin('By')
    userIdBettor = bettor.userId
    userIdTarget = target.userId
    userIdBystander = bystander.userId
    cookiesBettor = bettor.cookies
    cookiesTarget = target.cookies
    cookiesBystander = bystander.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesBettor },
      payload: { name: `MeBetTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdTarget, role: 'MEMBER' },
    })
    await prisma.teamMember.create({
      data: { teamId, userId: userIdBystander, role: 'MEMBER' },
    })

    // La cote d'un pari se calcule sur le catalogue ACTIF : sans set actif
    // portant la rarete visee, `place` echoue en 500. On pose donc un
    // catalogue minimal, et on rend les CardSet exactement comme on les a
    // trouves (globalSetup ne tronque la base qu'une fois par run, ces
    // fichiers la partagent). Meme motif que `bets.test.ts`.
    const active = await prisma.cardSet.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    baselineActiveSetIds = active.map((s: { id: string }) => s.id)

    const set = await prisma.cardSet.create({
      data: { name: `MeBetSet${suffix}`, isActive: false },
    })
    betSetId = set.id
    await prisma.card.createMany({
      data: [
        {
          name: `MeBetCommon${suffix}`,
          rarity: 'COMMON',
          dropWeight: 90,
          setId: betSetId,
        },
        {
          name: `MeBetRare${suffix}`,
          rarity: 'RARE',
          dropWeight: 10,
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

  // `bet.maxOpenPerBettor` et `bet.maxOpenPerTarget` plafonnent les paris
  // ouverts : sans cette remise a zero, un test qui echoue laisse un ACTIVE
  // derriere lui et les suivants se cassent au placement, masquant leur
  // vraie cause. La poussiere est recreditee pour la meme raison.
  beforeEach(async () => {
    await prisma.bet.updateMany({
      where: { teamId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    })
    await prisma.user.update({
      where: { id: userIdBettor },
      data: { dust: 50_000 },
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

  it('exige une session', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/bets' })
    expect(res.statusCode).toBe(401)
  })

  it('la cible voit le pari place sur elle, avec de quoi le rendre', async () => {
    const betId = await placeBet()

    const bets = await myBets(cookiesTarget)
    expect(bets).toHaveLength(1)
    const bet: any = bets[0]
    expect(bet.id).toBe(betId)
    expect(bet.teamId).toBe(teamId)
    expect(bet.team.name).toBe(`MeBetTeam${suffix}`)
    expect(bet.bettor.id).toBe(userIdBettor)
    expect(bet.bettor.username).toBe(`mbetBet${suffix}`)
    expect(bet.minRarity).toBe('RARE')
    expect(bet.stake).toBe(STAKE)
    expect(bet.pullWindow).toBeGreaterThan(0)
    expect(typeof bet.deadlineAt).toBe('string')
  })

  it('ni le parieur ni un coequipier tiers ne le voient', async () => {
    await placeBet()

    expect(await myBets(cookiesBettor)).toHaveLength(0)
    expect(await myBets(cookiesBystander)).toHaveLength(0)
  })

  it('un pari regle quitte la liste', async () => {
    const betId = await placeBet()
    await prisma.bet.update({
      where: { id: betId },
      data: { status: 'WON', settledAt: new Date() },
    })

    expect(await myBets(cookiesTarget)).toHaveLength(0)
  })

  // Le reglement d'un pari est PARESSEUX : un ACTIVE hors echeance le reste
  // en base jusqu'a ce qu'un tirage de la cible ou une lecture de l'equipe le
  // tranche. Filtrer sur le seul statut ferait donc trainer un pari mort dans
  // la pastille.
  it("un pari ACTIVE dont l'echeance est passee n'apparait plus", async () => {
    const betId = await placeBet()
    await prisma.bet.update({
      where: { id: betId },
      data: { deadlineAt: new Date(Date.now() - 60_000) },
    })

    expect(await myBets(cookiesTarget)).toHaveLength(0)
  })
})
