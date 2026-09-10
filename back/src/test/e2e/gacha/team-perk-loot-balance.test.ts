import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { perkEffect } from '../../../main/domain/team-progression/team-progression-rules'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : le bonus d'équipe `loot` doit aussi accélérer le compteur de jetons
 * réellement vu par le joueur, pas seulement le rattrapage fait au moment
 * de réclamer une récompense (`team-perk-loot.e2e.test.ts`, dans
 * `rewards/`). La formule dupliquée dans `gacha.domain.ts#pull`/`#pullBatch`
 * et dans les deux routes `GET /tokens/balance` / `GET /tokens/next-at`
 * échappait à la portée initiale de la tâche 5 — ce fichier couvre le trou.
 *
 * Chaque test isole UN site : `GET /tokens/balance` est interrogé en boucle
 * par le front ; `GET /tokens/next-at` a son propre calcul, jamais exercé
 * par le test précédent ; `POST /pulls` est le chemin qui décide si le
 * joueur peut réellement tirer, pas seulement ce qu'il en voit affiché.
 *
 * UN SEUL couple baseline/bonusé, réutilisé par les trois tests (`setElapsed`
 * réinitialise l'état entre chacun) : `/auth/register` est limité à 5 comptes
 * par 15 minutes et par instance Fastify, et ce fichier n'en a besoin que de
 * deux.
 *
 * Même piège et même parade partout : `calculateTokens` plafonne à
 * `tokenMaxStock` et ne distinguerait pas les deux scénarios si
 * `lastTokenAt` n'était pas placé dans une fenêtre calculée depuis la
 * config réelle (jamais codée en dur).
 */
describe('Bonus équipe `loot` — chemins gacha (balance, next-at, pull)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any

  let intervalMinutes: number
  let maxStock: number
  let lootPct: number
  let pullTokenCost: number

  let baselineUserId: string
  let baselineCookies: string
  let bonusedUserId: string
  let bonusedCookies: string

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

  /** Fenêtre où l'intervalle DE BASE régénère `maxStock - 1` jetons et
   *  l'intervalle BONUSÉ atteint `maxStock` pile. */
  function maxStockBoundary() {
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
    return { elapsedMin, baselineTokens, bonusedTokens }
  }

  /** Fenêtre où l'intervalle DE BASE n'a régénéré AUCUN jeton et
   *  l'intervalle BONUSÉ en a régénéré exactement un — juste assez pour
   *  payer `pullTokenCost` (1 par défaut). */
  function firstTokenBoundary() {
    const mult = 1 + lootPct / 100
    const lowBoundMin = intervalMinutes / mult
    const highBoundMin = intervalMinutes
    return (lowBoundMin + highBoundMin) / 2
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
      'gacha.pullTokenCost',
    )
    intervalMinutes = cfg.tokenRegenIntervalMinutes
    maxStock = cfg.tokenMaxStock
    // Importé depuis les règles pures, jamais réimplémenté ici — même motif
    // que team-perk-loot.e2e.test.ts.
    lootPct = perkEffect('loot', 5, cfg['teamPerk.loot.perRank'])
    pullTokenCost = cfg['gacha.pullTokenCost']

    // Catalogue minimal pour que POST /pulls puisse réussir.
    const set = await prisma.cardSet.create({
      data: { name: `TpLootPullSet${suffix}`, isActive: true },
    })
    await prisma.card.create({
      data: {
        name: `TpLootPullCard${suffix}`,
        rarity: 'COMMON',
        dropWeight: 10,
        setId: set.id,
      },
    })

    const baseline = await registerAndLogin('Base')
    const bonused = await registerAndLogin('Bonus')
    baselineUserId = baseline.userId
    baselineCookies = baseline.cookies
    bonusedUserId = bonused.userId
    bonusedCookies = bonused.cookies

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
      data: { teamId: team.id, userId: bonusedUserId, role: 'MEMBER' },
    })
    await prisma.teamPerk.create({
      data: { teamId: team.id, key: 'loot', rank: 5 },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /tokens/balance — rang 5 annonce plus de jetons régénérés, à durée égale', async () => {
    const { elapsedMin, baselineTokens, bonusedTokens } = maxStockBoundary()

    await setElapsed(baselineUserId, elapsedMin)
    await setElapsed(bonusedUserId, elapsedMin)

    const baselineRes = await app.inject({
      method: 'GET',
      url: '/tokens/balance',
      headers: { cookie: baselineCookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    expect(baselineRes.json().tokens).toBe(baselineTokens)

    const bonusedRes = await app.inject({
      method: 'GET',
      url: '/tokens/balance',
      headers: { cookie: bonusedCookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    expect(bonusedRes.json().tokens).toBe(bonusedTokens)
  })

  // Site distinct de /tokens/balance : /tokens/next-at a son propre calcul
  // d'`effectiveInterval` dans la route, jamais exercé par le test au-dessus.
  it('GET /tokens/next-at — rang 5 annonce plus de jetons régénérés, à durée égale', async () => {
    const { elapsedMin, baselineTokens, bonusedTokens } = maxStockBoundary()

    await setElapsed(baselineUserId, elapsedMin)
    await setElapsed(bonusedUserId, elapsedMin)

    const baselineRes = await app.inject({
      method: 'GET',
      url: '/tokens/next-at',
      headers: { cookie: baselineCookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    expect(baselineRes.json().tokens).toBe(baselineTokens)

    const bonusedRes = await app.inject({
      method: 'GET',
      url: '/tokens/next-at',
      headers: { cookie: bonusedCookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    expect(bonusedRes.json().tokens).toBe(bonusedTokens)
  })

  // Site distinct des deux routes de lecture : gacha.domain.ts#pull recalcule
  // l'intervalle effectif lui-même, dans la transaction du tirage. Assertion
  // volontairement binaire (échec/réussite) plutôt qu'un compte de jetons :
  // c'est la preuve la plus directe que le bonus atteint le chemin qui
  // décide si le joueur peut réellement tirer.
  it('POST /pulls — rang 5 permet un tirage que la base refuse, à durée égale', async () => {
    const elapsedMin = firstTokenBoundary()

    await setElapsed(baselineUserId, elapsedMin)
    await setElapsed(bonusedUserId, elapsedMin)

    const baselineRes = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: baselineCookies },
    })
    // Pas encore assez de temps écoulé sous l'intervalle de base : 0 jeton
    // régénéré, insuffisant pour payer `pullTokenCost`.
    expect(baselineRes.statusCode).toBe(402)

    const bonusedRes = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: bonusedCookies },
    })
    expect(bonusedRes.statusCode).toBe(201)
    expect(pullTokenCost).toBeGreaterThan(0)
  })
})
