import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : le bonus d'équipe `xp` (task 5, refonte équipe) multiplie l'XP DE
 * CAMPAGNE annoncée ET créditée — jamais l'or, jamais les quêtes (celles-ci
 * passent par rewards.domain.ts, hors périmètre). Deux surfaces observées :
 *
 *  - `GET /campaign` → `rewardPreview.firstClear.xp` / `.farm.xp` (annoncé,
 *    `extractRewardPreview`, résolu une seule fois par requête) ;
 *  - `POST /campaign/stages/:id/battle` → `rewards.xp` (réellement crédité,
 *    `attackStage`).
 *
 * Chapitre 98, réservé à ce fichier (1 = campaign.test.ts, 99 =
 * levelup-refill.test.ts) — aucune collision sur `campaignStage`, table
 * partagée par tous les fichiers e2e du dossier.
 */
describe('Bonus équipe `xp` — XP de campagne', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let stageId: string
  let cardId: string
  let xpPct: number

  const suffix = Date.now()
  const password = 'Password123!'
  const FIRST_CLEAR_XP = 100
  const FARM_XP = 20

  async function registerAndLogin(tag: string) {
    const email = `teamperkxp${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tpxp${tag}${suffix}`, email, password },
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

  async function makeTeam(ownerTag: string, memberUserId: string) {
    const owner = await prisma.user.create({
      data: {
        username: `tpxpowner${ownerTag}${suffix}`,
        email: `tpxpowner${ownerTag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await prisma.team.create({
      data: {
        name: `TeamPerkXp${ownerTag}${suffix}`,
        slug: `team-perk-xp-${ownerTag}-${suffix}`,
        ownerId: owner.id,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: memberUserId, role: 'MEMBER' },
    })
    return team.id as string
  }

  /** Carte à stats énormes, déployée seule : gagne le combat à coup sûr contre
   *  l'ennemi quasi nul du stage 98-1. */
  async function deployWinningTeam(userId: string, cookies: string) {
    const uc = await prisma.userCard.create({
      data: {
        userId,
        cardId,
        variant: 'NORMAL',
        quantity: 1,
        level: 60,
        palier: 6,
      },
    })
    const res = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [uc.id] },
    })
    expect(res.statusCode).toBe(200)
    // Stage 98-1 = highestIndex(0) + 1 → 'current', attaquable.
    await prisma.userCampaignProgress.upsert({
      where: { userId },
      create: { userId, highestChapter: 98, highestIndex: 0 },
      update: { highestChapter: 98, highestIndex: 0 },
    })
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    xpPct = 5 * (await configService.getMany('teamPerk.xp.perRank'))['teamPerk.xp.perRank']

    const set = await prisma.cardSet.create({
      data: { name: `TpXpSet${suffix}`, isActive: false },
    })
    const card = await prisma.card.create({
      data: {
        name: `TpXpCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 5000,
        baseAtk: 500,
        baseDef: 100,
        baseSpd: 200,
      },
    })
    cardId = card.id

    const stage = await prisma.campaignStage.upsert({
      where: { chapter_index: { chapter: 98, index: 1 } },
      update: {},
      create: {
        chapter: 98,
        index: 1,
        label: '98-1 team-perk-xp',
        isBoss: false,
        order: 9801,
        enemyTeam: [
          {
            baseHp: 10,
            baseAtk: 1,
            baseDef: 0,
            baseSpd: 50,
            level: 1,
            palier: 1,
            attackPattern: 'BASIC',
            mitigationScale: 1,
          },
        ],
        lootTable: {
          firstClear: {
            gold: 10,
            dust: 5,
            xp: FIRST_CLEAR_XP,
            guaranteedEquipment: null,
            guaranteedCard: null,
          },
          farm: {
            gold: 5,
            dust: 1,
            xp: FARM_XP,
            equipmentDropChance: 0,
            equipmentWeights: {},
            cardChance: 0,
          },
        },
      },
    })
    stageId = stage.id
  })

  afterAll(async () => {
    await app.close()
  })

  function findStage98(campaignBody: any) {
    const chapter = campaignBody.chapters.find((c: any) => c.chapter === 98)
    expect(chapter).toBeDefined()
    const stage = chapter.stages.find((s: any) => s.id === stageId)
    expect(stage).toBeDefined()
    return stage
  }

  it('sans bonus : XP annoncée = XP brute de la table de loot', async () => {
    const { cookies } = await registerAndLogin('PreviewBase')
    const res = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const stage = findStage98(res.json())
    expect(stage.rewardPreview.firstClear.xp).toBe(FIRST_CLEAR_XP)
    expect(stage.rewardPreview.farm.xp).toBe(FARM_XP)
  })

  it("rang 5 : l'XP annoncée ET l'XP créditée montent du même pourcentage", async () => {
    expect(xpPct).toBeGreaterThan(0)
    const expectedFirstClear = Math.round(FIRST_CLEAR_XP * (1 + xpPct / 100))
    const expectedFarm = Math.round(FARM_XP * (1 + xpPct / 100))

    const { userId, cookies } = await registerAndLogin('Bonus')
    const teamId = await makeTeam('Xp', userId)
    await prisma.teamPerk.create({
      data: { teamId, key: 'xp', rank: 5 },
    })

    // Annoncé.
    const preview = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie: cookies },
    })
    expect(preview.statusCode).toBe(200)
    const stage = findStage98(preview.json())
    expect(stage.rewardPreview.firstClear.xp).toBe(expectedFirstClear)
    expect(stage.rewardPreview.farm.xp).toBe(expectedFarm)

    // Réellement crédité (premier clear de CE joueur sur 98-1).
    await deployWinningTeam(userId, cookies)
    const battle = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stageId}/battle`,
      headers: { cookie: cookies },
    })
    expect(battle.statusCode).toBe(200)
    const body = battle.json()
    expect(body.won).toBe(true)
    expect(body.rewards.isFirstClear).toBe(true)
    expect(body.rewards.xp).toBe(expectedFirstClear)
  })

  // Site DISTINCT de `attackStage` (revue coordinateur) : `sweepStage` a son
  // propre calcul de l'XP farm bonusée, jamais exercé par le test de combat
  // ci-dessus. Le sweep ne simule aucun combat — pas de `deployWinningTeam`
  // nécessaire — mais exige que le stage soit DÉJÀ marqué comme cleared,
  // donc `userCampaignProgress.highestIndex` est posé directement à 1.
  it('sweep (runs=1) : rang 5 augmente aussi l\'XP farm créditée', async () => {
    expect(xpPct).toBeGreaterThan(0)
    const expectedFarm = Math.round(FARM_XP * (1 + xpPct / 100))

    const { userId, cookies } = await registerAndLogin('Sweep')
    const teamId = await makeTeam('Sweep', userId)
    await prisma.teamPerk.create({
      data: { teamId, key: 'xp', rank: 5 },
    })
    // Stage 98-1 déjà DEFEAT — highestIndex = 1 = index du stage : condition
    // `isAlreadyCleared` de sweepStage, sans passer par un combat.
    await prisma.userCampaignProgress.upsert({
      where: { userId },
      create: { userId, highestChapter: 98, highestIndex: 1 },
      update: { highestChapter: 98, highestIndex: 1 },
    })

    const sweep = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stageId}/sweep`,
      headers: { cookie: cookies },
      payload: { runs: 1 },
    })
    expect(sweep.statusCode).toBe(200)
    expect(sweep.json().totalXp).toBe(expectedFarm)
  })
})
