import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

/**
 * `GET /teams/:id/duels/:duelId/hands` : les tirages COMPTES des deux
 * joueurs, ce qui a fait le score. Sert l'ecran de resultat ouvert depuis la
 * pastille de notification.
 *
 * La route ne repond que sur un duel REGLE, et ce n'est pas une commodite :
 * la fenetre de tirages ne se lit ailleurs qu'EN TRANSACTION, parce que
 * c'est elle qui decide quelles cartes le reglement saisit. Une fois le duel
 * regle, `acceptedAt` est fige et la fenetre ne peut plus bouger — la lecture
 * hors verrou devient sure, mais seulement a cette condition.
 */
describe('GET /teams/:id/duels/:duelId/hands', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookiesChallenger: string
  let cookiesBystander: string
  let cookiesOutsider: string
  let userIdChallenger: string
  let userIdOpponent: string
  let userIdBystander: string
  let teamId: string
  let cardIds: string[] = []

  const suffix = Date.now()
  const password = 'Password123!'
  const PULL_COUNT = 3

  async function registerAndLogin(tag: string) {
    const email = `hand${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `hand${tag}${suffix}`, email, password },
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
   * Duel deja regle, avec des tirages poses de part et d'autre. On ecrit les
   * lignes directement : ce qui est teste ici est la LECTURE de la fenetre,
   * pas le reglement — `duels.test.ts` couvre celui-la de bout en bout.
   */
  async function settledDuelWithPulls() {
    const acceptedAt = new Date(Date.now() - 60 * 60 * 1000)
    const duel = await prisma.duel.create({
      data: {
        teamId,
        challengerId: userIdChallenger,
        opponentId: userIdOpponent,
        status: 'SETTLED',
        pullCount: PULL_COUNT,
        acceptedAt,
        settledAt: new Date(),
        winnerId: userIdChallenger,
        challengerScore: 24,
        opponentScore: 10,
      },
    })
    // PULL_COUNT + 1 tirages chacun : le dernier est HORS fenetre et ne doit
    // pas remonter, sinon la main affichee ne serait pas celle qui a score.
    for (const userId of [userIdChallenger, userIdOpponent]) {
      for (let i = 0; i <= PULL_COUNT; i += 1) {
        await prisma.gachaPull.create({
          data: {
            userId,
            cardId: cardIds[i % cardIds.length],
            variant: i === 0 ? 'HOLOGRAPHIC' : 'NORMAL',
            pulledAt: new Date(acceptedAt.getTime() + (i + 1) * 1000),
          },
        })
      }
    }
    return duel.id as string
  }

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma

    const challenger = await registerAndLogin('Chal')
    const opponent = await registerAndLogin('Opp')
    const bystander = await registerAndLogin('By')
    const outsider = await registerAndLogin('Out')
    userIdChallenger = challenger.userId
    userIdOpponent = opponent.userId
    userIdBystander = bystander.userId
    cookiesChallenger = challenger.cookies
    cookiesBystander = bystander.cookies
    cookiesOutsider = outsider.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesChallenger },
      payload: { name: `HandTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdOpponent, role: 'MEMBER' },
    })
    await prisma.teamMember.create({
      data: { teamId, userId: userIdBystander, role: 'MEMBER' },
    })

    const set = await prisma.cardSet.create({
      data: { name: `HandSet${suffix}`, isActive: false },
    })
    for (const rarity of ['COMMON', 'RARE', 'LEGENDARY']) {
      const card = await prisma.card.create({
        data: {
          name: `Hand${rarity}${suffix}`,
          rarity,
          dropWeight: 10,
          setId: set.id,
          imageUrl: `staging/cards/hand-${rarity.toLowerCase()}.png`,
        },
      })
      cardIds.push(card.id)
    }
  })

  afterAll(() => app.close())

  it('refuse un non-membre', async () => {
    const duelId = await settledDuelWithPulls()
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/duels/${duelId}/hands`,
      headers: { cookie: cookiesOutsider },
    })
    expect(res.statusCode).toBe(403)
  })

  it("refuse un duel qui n'est pas regle", async () => {
    const duel = await prisma.duel.create({
      data: {
        teamId,
        challengerId: userIdChallenger,
        opponentId: userIdOpponent,
        status: 'ACTIVE',
        pullCount: PULL_COUNT,
        acceptedAt: new Date(),
      },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/duels/${duel.id}/hands`,
      headers: { cookie: cookiesChallenger },
    })
    expect(res.statusCode).toBe(409)
    await prisma.duel.update({
      where: { id: duel.id },
      data: { status: 'CANCELLED' },
    })
  })

  it('rend les deux mains, bornees a la fenetre et dans l\'ordre des tirages', async () => {
    const duelId = await settledDuelWithPulls()
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/duels/${duelId}/hands`,
      headers: { cookie: cookiesChallenger },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.duelId).toBe(duelId)
    expect(body.winnerId).toBe(userIdChallenger)
    // Scores en points affichables : la colonne stocke des demi-points.
    expect(body.challenger.score).toBe(12)
    expect(body.opponent.score).toBe(5)
    expect(body.challenger.id).toBe(userIdChallenger)
    expect(body.opponent.id).toBe(userIdOpponent)

    for (const side of [body.challenger, body.opponent]) {
      expect(side.pulls).toHaveLength(PULL_COUNT)
      // Le 4e tirage, hors fenetre, est bien ecarte.
      const times = side.pulls.map((p: any) => p.pulledAt)
      expect([...times].sort()).toEqual(times)
      // De quoi dessiner la carte, pas seulement son identifiant.
      expect(side.pulls[0].name).toContain(`Hand`)
      expect(side.pulls[0].rarity).toBeDefined()
      expect(side.pulls[0].variant).toBe('HOLOGRAPHIC')
      expect(side.pulls[0].imageUrl).toContain('hand-')
    }
  })

  it('un coequipier spectateur peut lire les mains', async () => {
    const duelId = await settledDuelWithPulls()
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/duels/${duelId}/hands`,
      headers: { cookie: cookiesBystander },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().challenger.pulls).toHaveLength(PULL_COUNT)
  })
})
