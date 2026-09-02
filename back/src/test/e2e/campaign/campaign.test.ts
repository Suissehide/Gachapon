import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { mondayOfUtcWeek } from '../../../main/domain/quests/quest-matching'
import { buildTestApp } from '../../helpers/build-test-app'
import {
  CAMPAIGN,
  CAMPAIGN_SLOT_FILTER_CLASSIC,
  CAMPAIGN_SLOT_FILTER_TOWER,
} from '../../helpers/equipment-fixture-slots'

describe('Campaign routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let stage1Id: string
  let stage2Id: string
  let towerSlotPieceId: string
  let userId: string
  let questId: string
  let achievementId: string

  const suffix = Date.now()
  const email = `camp${suffix}@test.com`
  const password = 'Password123!'
  const username = `campuser${suffix}`

  // G2 (relecture finale, passe 2) : pendant de tower.test.ts — un combat de
  // campagne DOIT toujours faire progresser STAGES_CLEARED_COUNT (source
  // 'CAMPAIGN'), contrairement à un combat de tour.
  const questKey = `campaign_quest_${suffix}`
  const achievementKey = `campaign_stages_cleared_${suffix}`
  const periodKey = mondayOfUtcWeek(new Date())

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Clean campaign-related tables that aren't in globalSetup TRUNCATE
    await postgresOrm.prisma.battleResult.deleteMany({})
    await postgresOrm.prisma.userCampaignProgress.deleteMany({})
    await postgresOrm.prisma.campaignStage.deleteMany({})

    // Card set + 1 high-stat card so player wins
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `CampSet${suffix}`, isActive: true },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `CampCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 5000,
        baseAtk: 500,
        baseDef: 100,
        baseSpd: 200,
      },
    })

    // Some equipment to allow firstClear drop to succeed across rarities.
    // Ces pièces ne sont jamais équipées sur une carte (pool de drop, cf.
    // campaign.domain.ts qui interroge tx.equipment filtré sur
    // CAMPAIGN_EQUIPMENT_SLOTS — d'où le slot classique WEAPON réservé
    // ci-dessous). Slot/setKey réservés dans equipment-fixture-slots.ts
    // (CAMPAIGN).
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqC${suffix}`,
        ...CAMPAIGN,
        rarity: 'COMMON',
        bonuses: { atkFlat: 1 },
        dropWeight: 10,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqU${suffix}`,
        ...CAMPAIGN,
        rarity: 'UNCOMMON',
        bonuses: { atkFlat: 2 },
        dropWeight: 10,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqR${suffix}`,
        ...CAMPAIGN,
        rarity: 'RARE',
        bonuses: { atkFlat: 5 },
        dropWeight: 10,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqE${suffix}`,
        ...CAMPAIGN,
        rarity: 'EPIC',
        bonuses: { atkFlat: 20 },
        dropWeight: 1,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqL${suffix}`,
        ...CAMPAIGN,
        rarity: 'LEGENDARY',
        bonuses: { atkFlat: 50 },
        dropWeight: 1,
      },
    })

    // Stage 1-1 with very weak enemies so the player wins instantly
    const stage = await postgresOrm.prisma.campaignStage.create({
      data: {
        chapter: 1,
        index: 1,
        label: '1-1',
        isBoss: false,
        order: 1,
        enemyTeam: [
          {
            baseHp: 10,
            baseAtk: 1,
            baseDef: 0,
            baseSpd: 50,
            level: 1,
            palier: 1,
            attackPattern: 'BASIC',
            // Stats écrites à la main (non mises à l'échelle par enemyScale) => 1.
            mitigationScale: 1,
          },
        ],
        lootTable: {
          firstClear: {
            gold: 200,
            dust: 50,
            xp: 30,
            guaranteedEquipment: { minRarity: 'RARE' },
            guaranteedCard: null,
          },
          farm: {
            gold: 20,
            dust: 3,
            xp: 3,
            equipmentDropChance: 0.0,
            equipmentWeights: { COMMON: 100 },
            cardChance: 0.0,
          },
        },
      },
    })
    stage1Id = stage.id

    // Stage 2 — dédié à la preuve G1 : le pool de drop de campagne ne doit
    // jamais offrir un slot de tour. Catalogue à deux pièces COMMON, une
    // classique (RING) et une de tour (BELT), même dropWeight : si
    // le filtre CAMPAIGN_EQUIPMENT_SLOTS venait à disparaître, la pièce de
    // tour redeviendrait un candidat valide et ce test la verrait sortir.
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `SlotFilterClassic${suffix}`,
        ...CAMPAIGN_SLOT_FILTER_CLASSIC,
        rarity: 'COMMON',
        bonuses: { atkFlat: 1 },
        dropWeight: 10,
      },
    })
    const towerPiece = await postgresOrm.prisma.equipment.create({
      data: {
        name: `SlotFilterTower${suffix}`,
        ...CAMPAIGN_SLOT_FILTER_TOWER,
        rarity: 'COMMON',
        bonuses: { atkFlat: 1 },
        dropWeight: 10,
      },
    })
    towerSlotPieceId = towerPiece.id

    const stage2 = await postgresOrm.prisma.campaignStage.create({
      data: {
        chapter: 1,
        index: 2,
        label: '1-2',
        isBoss: false,
        order: 2,
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
            dust: 1,
            xp: 1,
            guaranteedEquipment: null,
            guaranteedCard: null,
          },
          farm: {
            gold: 10,
            dust: 1,
            xp: 1,
            // 100% de chance de drop pour rendre le test déterministe.
            equipmentDropChance: 1.0,
            equipmentWeights: { COMMON: 100 },
            cardChance: 0.0,
          },
        },
      },
    })
    stage2Id = stage2.id

    // Quête hebdo + achievement STAGES_CLEARED_COUNT (pendant du même setup
    // dans tower.test.ts) : preuve G2 qu'un combat de CAMPAGNE, lui,
    // continue de faire progresser les deux. Créés avant tout combat pour
    // que le cache process-level de QuestsDomain les charge (motif
    // quest-progress.test.ts).
    const quest = await postgresOrm.prisma.quest.create({
      data: {
        key: questKey,
        name: `Quête campagne ${suffix}`,
        description: 'Test: un combat de campagne compte pour une quête',
        period: 'WEEKLY',
        criterion: { event: 'STAGE_CLEARED', target: 1 },
        isActive: true,
      },
    })
    questId = quest.id
    const achievement = await postgresOrm.prisma.achievement.create({
      data: {
        key: achievementKey,
        name: `Étages franchis (test campagne) ${suffix}`,
        description: 'Test: un combat de campagne doit compter ici',
        criterion: { type: 'STAGES_CLEARED_COUNT', threshold: 100 },
        isActive: true,
      },
    })
    achievementId = achievement.id

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await postgresOrm.prisma.user.update({
      where: { email },
      // Bump combatPoints to a high value so battle + sweep×3 on stage 1
      // AND battle + sweep×10 on stage 2 (G1 slot-filter proof) never trip
      // the stamina gate, regardless of how the global combat.battleCost /
      // combat.sweepCost configuration evolves.
      data: { emailVerifiedAt: new Date(), combatPoints: 300 },
    })
    userId = user.id

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 60,
        palier: 6,
      },
    })
    userCardId = uc.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string

    // Deploy team
    const teamRes = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(teamRes.statusCode).toBe(200)
  })

  afterAll(async () => {
    const { postgresOrm } = (app as any).iocContainer
    // Nettoyage dans l'ordre des FK (motif quest-progress.test.ts).
    await postgresOrm.prisma.userReward.deleteMany({
      where: { userId, source: 'QUEST', sourceId: { startsWith: `${questKey}:` } },
    })
    const bonus = await postgresOrm.prisma.userReward.findFirst({
      where: { userId, source: 'QUEST', sourceId: `weekly-bonus:${periodKey}` },
    })
    if (bonus) {
      await postgresOrm.prisma.userReward.delete({ where: { id: bonus.id } })
      await postgresOrm.prisma.reward.deleteMany({ where: { id: bonus.rewardId } })
    }
    await postgresOrm.prisma.userQuest.deleteMany({ where: { questId } })
    await postgresOrm.prisma.quest.deleteMany({ where: { key: questKey } })
    await postgresOrm.prisma.userAchievementProgress.deleteMany({
      where: { achievementId },
    })
    await postgresOrm.prisma.userAchievement.deleteMany({ where: { achievementId } })
    await postgresOrm.prisma.achievement.deleteMany({ where: { key: achievementKey } })
    await app.close()
  })

  it('GET /campaign — returns stage 1-1 as current', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      highestChapter: number
      highestIndex: number
      chapters: { chapter: number; stages: { id: string; status: string }[] }[]
    }
    expect(body.highestChapter).toBe(1)
    expect(body.highestIndex).toBe(0)
    const stage = body.chapters
      .flatMap((c) => c.stages)
      .find((s) => s.id === stage1Id)
    expect(stage?.status).toBe('current')
  })

  it('POST /battle — wins stage 1 with firstClear rewards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: boolean
      rewards: { isFirstClear: boolean; gold: number; dust: number; xp: number } | null
      teamA: unknown[]
      teamB: unknown[]
    }
    expect(body.won).toBe(true)
    expect(body.rewards?.isFirstClear).toBe(true)
    expect(body.rewards?.gold).toBe(200)
    expect(body.rewards?.dust).toBe(50)
    expect(body.rewards?.xp).toBe(30)
    expect(Array.isArray(body.teamA)).toBe(true)
    expect(Array.isArray(body.teamB)).toBe(true)
    expect(body.teamA.length).toBe(1)
    expect(body.teamB.length).toBe(1)
  })

  it('le combat de campagne ci-dessus compte pour la quête ET pour le compteur STAGES_CLEARED_COUNT (G2)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const uq = await postgresOrm.prisma.userQuest.findFirst({
      where: { userId, questId, periodKey },
    })
    expect(uq).not.toBeNull()
    expect(uq!.progress).toBe(1)
    expect(uq!.completed).toBe(true)

    const progress = await postgresOrm.prisma.userAchievementProgress.findUnique(
      {
        where: { userId_achievementId: { userId, achievementId } },
      },
    )
    // Contrairement à tower.test.ts : une source CAMPAIGN doit incrémenter
    // STAGES_CLEARED_COUNT.
    expect(progress).not.toBeNull()
    expect(progress!.progress).toBe(1)
  })

  it('GET /campaign after first clear — stage marked cleared', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      highestIndex: number
      chapters: { stages: { id: string; status: string }[] }[]
    }
    expect(body.highestIndex).toBe(1)
    const stage = body.chapters
      .flatMap((c) => c.stages)
      .find((s) => s.id === stage1Id)
    expect(stage?.status).toBe('cleared')
  })

  it('POST /battle on cleared stage — farm rewards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: boolean
      rewards: { isFirstClear: boolean; gold: number } | null
    }
    expect(body.won).toBe(true)
    expect(body.rewards?.isFirstClear).toBe(false)
    expect(body.rewards?.gold).toBe(20)
  })

  it('POST /sweep — 3 runs of farm rewards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/sweep`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { runs: 3 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      runs: number
      totalGold: number
      totalDust: number
      totalXp: number
    }
    expect(body.runs).toBe(3)
    expect(body.totalGold).toBe(60)
    expect(body.totalDust).toBe(9)
    expect(body.totalXp).toBe(9)
  })

  it('POST /sweep on stage 2 — never drops a tower-slot equipment (G1)', async () => {
    // Clear stage 2 first (sweep requires a cleared stage).
    const battleRes = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage2Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(battleRes.statusCode).toBe(200)
    expect((battleRes.json() as { won: boolean }).won).toBe(true)

    const sweepRes = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage2Id}/sweep`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { runs: 10 },
    })
    expect(sweepRes.statusCode).toBe(200)
    const body = sweepRes.json() as {
      equipmentDrops: { equipmentId: string; rarity: string }[]
    }
    // equipmentDropChance: 1.0 → un drop garanti par run.
    expect(body.equipmentDrops).toHaveLength(10)

    // Le catalogue de drop de campagne interroge TOUTE la table Equipment
    // (filtrée par slot) : la suite e2e partage la même base, donc d'autres
    // fichiers ont pu créer d'autres pièces COMMON de slot classique. On ne
    // peut donc pas affirmer sur quelle pièce précise le tirage retombe —
    // seulement qu'il ne retombe JAMAIS sur la pièce canari
    // `towerSlotPieceId` (slot BELT), et que chaque pièce tirée est bien
    // sur un slot classique.
    const { postgresOrm } = (app as any).iocContainer
    const droppedIds = [...new Set(body.equipmentDrops.map((d) => d.equipmentId))]
    const droppedPieces = await postgresOrm.prisma.equipment.findMany({
      where: { id: { in: droppedIds } },
      select: { id: true, slot: true },
    })
    for (const drop of body.equipmentDrops) {
      expect(drop.equipmentId).not.toBe(towerSlotPieceId)
    }
    for (const piece of droppedPieces) {
      expect(['WEAPON', 'ARMOR', 'RING']).toContain(piece.slot)
    }
  })

  it('POST /battle — refuses 400 when no team deployed', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const noTeamEmail = `noteam${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `noTeam${suffix}`,
        email: noTeamEmail,
        password,
      },
    })
    expect(reg.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email: noTeamEmail },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: noTeamEmail, password },
    })
    const noTeamCookies = loginRes.headers['set-cookie'] as string

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: noTeamCookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /sweep — refuses uncleared stage with 403', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const noClearEmail = `noclear${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `noClear${suffix}`,
        email: noClearEmail,
        password,
      },
    })
    expect(reg.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email: noClearEmail },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: noClearEmail, password },
    })
    const noClearCookies = loginRes.headers['set-cookie'] as string

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/sweep`,
      headers: { cookie: noClearCookies, 'content-type': 'application/json' },
      payload: { runs: 1 },
    })
    expect(res.statusCode).toBe(403)
  })
})
