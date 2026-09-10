import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : le bonus d'équipe `loot` (task 5, refonte équipe) accélère la
 * régénération de jetons — multiplicatif, APRÈS la réduction du skill tree
 * — `(interval - reduction) / (1 + loot / 100)`.
 *
 * Observé via `POST /rewards/:id/claim` (rewards.domain.ts#claimOne), le
 * seul champ HTTP qui expose le résultat de `calculateTokens` : `tokens`.
 *
 * Piège : `calculateTokens` plafonne à `tokenMaxStock` et ne calcule RIEN
 * (retourne les jetons courants tels quels) si le joueur est déjà au max —
 * un scénario où le bonus ne changerait jamais rien à observer. Pour rendre
 * le bonus visible, `lastTokenAt` est placé assez loin dans le passé pour
 * que l'intervalle DE BASE regénère tout juste `tokenMaxStock - 1` jetons
 * (un cran sous le plafond) alors que l'intervalle BONUSÉ (plus court)
 * regénère tout juste `tokenMaxStock` jetons (le plafond, sans le dépasser).
 * La fenêtre en minutes est calculée depuis la config réelle, jamais
 * codée en dur, pour ne pas dépendre des valeurs par défaut.
 */
describe('Bonus équipe `loot` — régénération de jetons', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any

  let intervalMinutes: number
  let maxStock: number
  let lootPct: number

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `teamperkloot${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tploot${tag}${suffix}`, email, password },
    })
    expect(reg.statusCode).toBe(201)
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    const user = await prisma.user.findUnique({ where: { email } })
    return {
      userId: user.id as string,
      cookies: login.headers['set-cookie'] as string,
    }
  }

  /**
   * Place le joueur à `tokens: 0` avec `lastTokenAt` reculé de `elapsedMin`
   * minutes, puis crée une récompense NEUTRE (tokens/dust/xp/gold à 0) déjà
   * en attente : `claimOne` isole ainsi la régénération pure, sans qu'aucun
   * montant crédité par la récompense elle-même ne s'y mélange.
   */
  async function setupClaimant(userId: string, elapsedMin: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokens: 0,
        lastTokenAt: new Date(Date.now() - elapsedMin * 60 * 1000),
      },
    })
    const reward = await prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0, gold: 0 },
    })
    const userReward = await prisma.userReward.create({
      data: {
        userId,
        rewardId: reward.id,
        source: 'ACHIEVEMENT',
        sourceId: `loot-perk-${userId}`,
      },
    })
    return userReward.id as string
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

  it('rang 5 : baisse le nombre de minutes par jeton, donc augmente les jetons régénérés à durée égale', async () => {
    const mult = 1 + lootPct / 100
    // Fenêtre choisie pour que l'intervalle DE BASE tombe juste sous le
    // plafond et l'intervalle BONUSÉ l'atteigne pile — marge confortable
    // par rapport aux quelques dizaines de ms d'aller-retour HTTP.
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
    // Le scénario ne prouve rien si les deux issues coïncident.
    expect(bonusedTokens).toBeGreaterThan(baselineTokens)

    const baseline = await registerAndLogin('Base')
    const bonused = await registerAndLogin('Bonus')

    // Équipe avec le bonus `loot` au rang maximum (5), dont seul le second
    // joueur est membre.
    const owner = await prisma.user.create({
      data: {
        username: `tplootowner${suffix}`,
        email: `tplootowner${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await prisma.team.create({
      data: {
        name: `TeamPerkLoot${suffix}`,
        slug: `team-perk-loot-${suffix}`,
        ownerId: owner.id,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: bonused.userId, role: 'MEMBER' },
    })
    await prisma.teamPerk.create({
      data: { teamId: team.id, key: 'loot', rank: 5 },
    })

    const baselineRewardId = await setupClaimant(baseline.userId, elapsedMin)
    const bonusedRewardId = await setupClaimant(bonused.userId, elapsedMin)

    const baselineRes = await app.inject({
      method: 'POST',
      url: `/rewards/${baselineRewardId}/claim`,
      headers: { cookie: baseline.cookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    expect(baselineRes.json().tokens).toBe(baselineTokens)

    const bonusedRes = await app.inject({
      method: 'POST',
      url: `/rewards/${bonusedRewardId}/claim`,
      headers: { cookie: bonused.cookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    expect(bonusedRes.json().tokens).toBe(bonusedTokens)
  })
})
