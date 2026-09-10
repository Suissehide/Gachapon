import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : le bonus d'équipe `loot` doit aussi accélérer le compteur de jetons
 * réellement vu par le joueur, pas seulement le rattrapage fait au moment
 * de réclamer une récompense (`team-perk-loot.e2e.test.ts`, dans
 * `rewards/`). La formule dupliquée dans `gacha.domain.ts#pull`/`#pullBatch`
 * et dans les deux routes `GET /tokens/balance` / `GET /tokens/next-at`
 * échappait à la portée initiale de la tâche 5 — ce fichier couvre le trou.
 *
 * `GET /tokens/balance` est interrogé en boucle par le front ; observé ici
 * directement, sans écriture, pour rester représentatif de ce chemin chaud.
 *
 * Même piège et même parade que pour le rattrapage de claim :
 * `calculateTokens` plafonne à `tokenMaxStock` et ne distinguerait pas les
 * deux scénarios si `lastTokenAt` n'était pas placé dans une fenêtre
 * calculée depuis la config réelle (jamais codée en dur) pour que
 * l'intervalle de base retombe à `maxStock - 1` jetons et l'intervalle
 * bonusé à `maxStock` pile.
 */
describe('Bonus équipe `loot` — GET /tokens/balance', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any

  let intervalMinutes: number
  let maxStock: number
  let lootPct: number

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `teamperklootbal${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tplootbal${tag}${suffix}`, email, password },
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

  async function setElapsed(userId: string, elapsedMin: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokens: 0,
        lastTokenAt: new Date(Date.now() - elapsedMin * 60 * 1000),
      },
    })
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    const cfg = await configService.getMany(
      'tokenRegenIntervalMinutes',
      'tokenMaxStock',
      'teamPerk.loot.perRank',
    )
    intervalMinutes = cfg.tokenRegenIntervalMinutes
    maxStock = cfg.tokenMaxStock
    lootPct = 5 * cfg['teamPerk.loot.perRank']
  })

  afterAll(async () => {
    await app.close()
  })

  it('rang 5 : GET /tokens/balance annonce plus de jetons régénérés, à durée égale', async () => {
    const mult = 1 + lootPct / 100
    const lowBoundMin = (intervalMinutes * maxStock) / mult
    const highBoundMin = intervalMinutes * maxStock
    const elapsedMin = (lowBoundMin + highBoundMin) / 2

    const baselineTokens = Math.min(
      Math.floor(elapsedMin / intervalMinutes),
      maxStock,
    )
    const bonusedTokens = Math.min(
      Math.floor(elapsedMin / (intervalMinutes / mult)),
      maxStock,
    )
    expect(bonusedTokens).toBeGreaterThan(baselineTokens)

    const baseline = await registerAndLogin('Base')
    const bonused = await registerAndLogin('Bonus')

    const owner = await prisma.user.create({
      data: {
        username: `tplootbalowner${suffix}`,
        email: `tplootbalowner${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await prisma.team.create({
      data: {
        name: `TeamPerkLootBal${suffix}`,
        slug: `team-perk-loot-bal-${suffix}`,
        ownerId: owner.id,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: bonused.userId, role: 'MEMBER' },
    })
    await prisma.teamPerk.create({
      data: { teamId: team.id, key: 'loot', rank: 5 },
    })

    await setElapsed(baseline.userId, elapsedMin)
    await setElapsed(bonused.userId, elapsedMin)

    const baselineRes = await app.inject({
      method: 'GET',
      url: '/tokens/balance',
      headers: { cookie: baseline.cookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    expect(baselineRes.json().tokens).toBe(baselineTokens)

    const bonusedRes = await app.inject({
      method: 'GET',
      url: '/tokens/balance',
      headers: { cookie: bonused.cookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    expect(bonusedRes.json().tokens).toBe(bonusedTokens)
  })
})
