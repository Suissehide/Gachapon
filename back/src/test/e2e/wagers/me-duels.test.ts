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
 * `GET /me/duels` : les defis en attente de MA reponse, toutes equipes
 * confondues — la source de la pastille de notification, jumelle de
 * `GET /me/invitations`.
 *
 * Fichier isole de `duels.test.ts` a dessein : celui-la porte un etat
 * partage lourd (catalogue de cartes, `duel.pullCount` global, duels
 * laisses ouverts d'un test a l'autre) et la question posee ici — « qui
 * voit quoi » — n'a rien a y gagner.
 */
describe('GET /me/duels', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookiesChallenger: string
  let cookiesOpponent: string
  let cookiesBystander: string
  let userIdChallenger: string
  let userIdOpponent: string
  let userIdBystander: string
  let teamId: string
  let acceptHours: number

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `mduel${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `mduel${tag}${suffix}`, email, password },
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

  async function proposeDuel() {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesChallenger },
      payload: { opponentId: userIdOpponent },
    })
    expect(res.statusCode).toBe(201)
    return res.json().id as string
  }

  async function myDuels(cookie: string) {
    const res = await app.inject({
      method: 'GET',
      url: '/me/duels',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    return res.json().duels as { id: string }[]
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService
    acceptHours = (await configService.getMany('duel.acceptHours'))[
      'duel.acceptHours'
    ]

    const challenger = await registerAndLogin('Chal')
    const opponent = await registerAndLogin('Opp')
    const bystander = await registerAndLogin('By')
    userIdChallenger = challenger.userId
    userIdOpponent = opponent.userId
    userIdBystander = bystander.userId
    cookiesChallenger = challenger.cookies
    cookiesOpponent = opponent.cookies
    cookiesBystander = bystander.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesChallenger },
      payload: { name: `MeDuelTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdOpponent, role: 'MEMBER' },
    })
    await prisma.teamMember.create({
      data: { teamId, userId: userIdBystander, role: 'MEMBER' },
    })
  })

  // Un seul duel ouvert par joueur est autorise : sans cette remise a zero,
  // le premier test qui echoue laisse un PENDING derriere lui et TOUS les
  // suivants se cassent en 409 a la proposition, masquant leur vraie cause.
  beforeEach(async () => {
    await prisma.duel.updateMany({
      where: { teamId, status: { in: ['PENDING', 'ACTIVE'] } },
      data: { status: 'CANCELLED' },
    })
  })

  afterAll(() => app.close())

  it('exige une session', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/duels' })
    expect(res.statusCode).toBe(401)
  })

  it('le defie voit le duel en attente, avec de quoi le rendre et y repondre', async () => {
    const duelId = await proposeDuel()

    const duels = await myDuels(cookiesOpponent)
    expect(duels).toHaveLength(1)
    const duel: any = duels[0]
    expect(duel.id).toBe(duelId)
    // `teamId` est indispensable : les routes accept/decline sont sous
    // /teams/:id/duels/:duelId, la pastille n'a aucun autre moyen de
    // reconstruire l'URL depuis une liste inter-equipes.
    expect(duel.teamId).toBe(teamId)
    expect(duel.team.name).toBe(`MeDuelTeam${suffix}`)
    expect(duel.challenger.id).toBe(userIdChallenger)
    expect(duel.challenger.username).toBe(`mduelChal${suffix}`)
    expect(duel.pullCount).toBeGreaterThan(0)

  })

  it('ni le defieur ni un coequipier spectateur ne le voient', async () => {
    const duelId = await proposeDuel()

    expect(await myDuels(cookiesChallenger)).toHaveLength(0)
    expect(await myDuels(cookiesBystander)).toHaveLength(0)

  })

  it('un duel accepte quitte la liste', async () => {
    const duelId = await proposeDuel()
    const accepted = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duelId}/accept`,
      headers: { cookie: cookiesOpponent },
    })
    expect(accepted.statusCode).toBe(200)

    expect(await myDuels(cookiesOpponent)).toHaveLength(0)

  })

  // L'expiration d'un PENDING est PARESSEUSE : la ligne reste PENDING en
  // base jusqu'a ce qu'un accept ou un listForTeam la reecrive. Filtrer sur
  // le seul statut ferait donc trainer indefiniment un defi mort dans la
  // pastille, avec deux boutons que le back rejette.
  it("un duel en attente depuis plus que le delai d'acceptation n'apparait plus", async () => {
    const duelId = await proposeDuel()
    await prisma.duel.update({
      where: { id: duelId },
      data: {
        createdAt: new Date(Date.now() - (acceptHours + 1) * 3600_000),
      },
    })

    expect(await myDuels(cookiesOpponent)).toHaveLength(0)

  })
})
