import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

/**
 * Les notifications WS du cycle de vie d'un duel, hors acceptation.
 *
 * `propose` et `accept` notifiaient, `decline` et `cancel` non : un defi
 * retire restait affiche chez l'autre — dans le panneau de l'equipe comme
 * dans la pastille de notification — avec des boutons que le serveur
 * rejette, jusqu'au prochain refetch.
 */
describe('notifications WS du duel', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let wsManager: any
  let cookiesChallenger: string
  let cookiesOpponent: string
  let userIdChallenger: string
  let userIdOpponent: string
  let userIdBystander: string
  let teamId: string

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `dws${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `dws${tag}${suffix}`, email, password },
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

  /**
   * Branche un faux socket par membre et renvoie les evenements recus.
   * Modele : `teams/perks.test.ts`.
   */
  function listen() {
    const received: Record<string, any[]> = {
      [userIdChallenger]: [],
      [userIdOpponent]: [],
      [userIdBystander]: [],
    }
    for (const [userId, sink] of Object.entries(received)) {
      wsManager.register(
        userId,
        {
          readyState: 1,
          send: (data: string) => sink.push(JSON.parse(data)),
          on: () => {},
        } as any,
      )
    }
    return received
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

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    wsManager = container.wsManager

    const challenger = await registerAndLogin('Chal')
    const opponent = await registerAndLogin('Opp')
    const bystander = await registerAndLogin('By')
    userIdChallenger = challenger.userId
    userIdOpponent = opponent.userId
    userIdBystander = bystander.userId
    cookiesChallenger = challenger.cookies
    cookiesOpponent = opponent.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesChallenger },
      payload: { name: `DuelWsTeam${suffix}` },
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

  // Un seul duel ouvert par joueur : sans cette remise a zero, un test qui
  // echoue laisse un PENDING derriere lui et le suivant se casse en 409 a la
  // proposition, masquant sa vraie cause.
  beforeEach(async () => {
    await prisma.duel.updateMany({
      where: { teamId, status: { in: ['PENDING', 'ACTIVE'] } },
      data: { status: 'CANCELLED' },
    })
  })

  afterAll(() => app.close())

  it('refuser un defi notifie toute l\'equipe, statut DECLINED', async () => {
    const duelId = await proposeDuel()
    const received = listen()

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duelId}/decline`,
      headers: { cookie: cookiesOpponent },
    })
    expect(res.statusCode).toBe(200)

    for (const userId of [userIdChallenger, userIdOpponent, userIdBystander]) {
      const updates = received[userId]!.filter(
        (event) => event.type === 'duel:update' && event.duelId === duelId,
      )
      expect(updates).toHaveLength(1)
      expect(updates[0].status).toBe('DECLINED')
      expect(updates[0].teamId).toBe(teamId)
    }
  })

  it('annuler un defi notifie toute l\'equipe, statut CANCELLED', async () => {
    const duelId = await proposeDuel()
    const received = listen()

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duelId}/cancel`,
      headers: { cookie: cookiesChallenger },
    })
    expect(res.statusCode).toBe(200)

    for (const userId of [userIdChallenger, userIdOpponent, userIdBystander]) {
      const updates = received[userId]!.filter(
        (event) => event.type === 'duel:update' && event.duelId === duelId,
      )
      expect(updates).toHaveLength(1)
      expect(updates[0].status).toBe('CANCELLED')
      expect(updates[0].teamId).toBe(teamId)
    }
  })
})
