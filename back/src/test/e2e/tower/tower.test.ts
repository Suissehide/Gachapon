import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { mondayOfUtcWeek } from '../../../main/domain/quests/quest-matching'
import { buildTestApp } from '../../helpers/build-test-app'
import {
  EQUIPMENT_SALVAGE,
  TOWER_FIRE_PERCEE,
  TOWER_FIRE_PRECISION,
  TOWER_FIRE_SANGSUE,
} from '../../helpers/equipment-fixture-slots'

describe('routes de tour', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let userId: string

  const suffix = Date.now()
  const email = `tower${suffix}@test.com`
  const password = 'Password123!'
  const username = `toweruser${suffix}`

  // G2 (relecture finale, passe 2) : preuve bout-en-bout qu'un combat de
  // tour alimente les quêtes mais pas les compteurs de progression de
  // campagne. Quête hebdo dédiée + achievement STAGES_CLEARED_COUNT dédié,
  // vérifiés juste après le combat gagnant plus bas dans ce fichier.
  const questKey = `tower_quest_${suffix}`
  const achievementKey = `tower_stages_cleared_${suffix}`
  const periodKey = mondayOfUtcWeek(new Date())
  let questId: string
  let achievementId: string

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Carte + équipe très forte pour garantir la victoire (motif de
    // campaign.test.ts).
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `TowerSet${suffix}`, isActive: true },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `TowerCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 5000,
        baseAtk: 500,
        baseDef: 100,
        baseSpd: 200,
      },
    })

    // Étage 1 de la tour FEU — ennemi très faible, victoire garantie. Le
    // plancher de premier passage ET les poids de farm ne pointent que sur
    // LEGENDARY : le tirage du set (uniforme parmi les 4) reste aléatoire,
    // mais la rareté ne l'est jamais — un seul candidat existe par set dans
    // le pool ci-dessous, donc n'importe quel set tiré résout toujours.
    await postgresOrm.prisma.towerFloor.create({
      data: {
        element: 'FIRE',
        index: 1,
        label: 'Étage 1',
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
            mitigationScale: 1,
          },
        ],
        lootTable: {
          firstClear: {
            gold: 200,
            dust: 50,
            xp: 30,
            guaranteedEquipment: { minRarity: 'LEGENDARY' },
          },
          farm: {
            gold: 20,
            dust: 5,
            xp: 3,
            equipmentWeights: { LEGENDARY: 1 },
          },
        },
      },
    })

    // Étage 5 — jamais nettoyé, sert au test d'étage verrouillé. N'a pas
    // besoin d'un lootTable exploitable puisque la demande doit échouer
    // avant tout tirage.
    await postgresOrm.prisma.towerFloor.create({
      data: {
        element: 'FIRE',
        index: 5,
        label: 'Étage 5',
        order: 5,
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
          firstClear: { gold: 0, dust: 0, xp: 0, guaranteedEquipment: null },
          farm: { gold: 0, dust: 0, xp: 0, equipmentWeights: {} },
        },
      },
    })

    // Pool de drop garanti — slot GLOVES (tour FEU), les 4 setKeys en
    // LEGENDARY (cf. equipment-fixture-slots.ts pour le pourquoi).
    for (const reservation of [
      EQUIPMENT_SALVAGE,
      TOWER_FIRE_PRECISION,
      TOWER_FIRE_PERCEE,
      TOWER_FIRE_SANGSUE,
    ]) {
      await postgresOrm.prisma.equipment.create({
        data: {
          name: `TowerEq-${reservation.setKey}-${suffix}`,
          ...reservation,
          rarity: 'LEGENDARY',
          bonuses: { atkFlat: 50 },
          dropWeight: 1,
        },
      })
    }

    // Quête hebdo STAGE_CLEARED (comme les vraies, quests.ts:128) — doit
    // compter le combat de tour ci-dessous puisqu'elle ne filtre que sur
    // `kind` (quest-matching.ts). Créée AVANT tout combat de la suite pour
    // que le cache process-level de QuestsDomain (vide au boot, TTL 60s)
    // la charge dès le premier trackInTx — même motif que
    // quest-progress.test.ts.
    const quest = await postgresOrm.prisma.quest.create({
      data: {
        key: questKey,
        name: `Quête tour ${suffix}`,
        description: 'Test: un combat de tour compte pour une quête',
        period: 'WEEKLY',
        criterion: { event: 'STAGE_CLEARED', target: 1 },
        isActive: true,
      },
    })
    questId = quest.id

    // Achievement STAGES_CLEARED_COUNT — compteur de progression de
    // CAMPAGNE : un combat de tour ne doit JAMAIS créer de ligne de
    // progression pour lui (G2 : source: 'TOWER' fait renvoyer 0 à
    // stageClearedDelta, donc achievements.domain.ts#evaluate court-circuite
    // avant l'upsert de userAchievementProgress).
    const achievement = await postgresOrm.prisma.achievement.create({
      data: {
        key: achievementKey,
        name: `Étages franchis (test tour) ${suffix}`,
        description: 'Test: un combat de tour ne compte pas ici',
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
      data: { emailVerifiedAt: new Date(), combatPoints: 100 },
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

  it('GET /tower exige une session', async () => {
    const res = await app.inject({ method: 'GET', url: '/tower' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /tower/:element exige une session', async () => {
    const res = await app.inject({ method: 'GET', url: '/tower/FIRE' })
    expect(res.statusCode).toBe(401)
  })

  it('POST .../battle exige une session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/1/battle',
      payload: { userCardIds: [] },
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /tower liste les 4 tours avec leur progression et leur slot', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      towers: {
        element: string
        slot: string
        highestFloor: number
        totalFloors: number
      }[]
    }
    expect(body.towers).toHaveLength(4)
    expect(body.towers.map((t) => t.element).sort()).toEqual([
      'EARTH',
      'FIRE',
      'NATURE',
      'WATER',
    ])
    const fire = body.towers.find((t) => t.element === 'FIRE')
    expect(fire?.highestFloor).toBe(0)
    expect(fire?.totalFloors).toBe(10)
    expect(fire?.slot).toBe('GLOVES')
  })

  it('GET /tower/LIGHT refuse un élément hors du cycle', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower/LIGHT',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /tower/DARK refuse un élément hors du cycle', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower/DARK',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /tower/LIGHT/1/battle refuse un élément hors du cycle', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/LIGHT/1/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuse un étage verrouillé (au niveau domaine, pas seulement l’équipe vide)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/5/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuse une équipe vide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/1/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuse une équipe avec des cartes en double', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/1/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId, userCardId, userCardId] },
    })
    expect(res.statusCode).toBe(400)
    // Épingle la RAISON du refus : sans ça, un futur changement de la taille
    // maximale d'équipe garderait ce test au vert tout en cessant
    // silencieusement de tester la déduplication.
    expect(res.json().message).toContain('distinct')
  })

  it('GET /tower/FIRE — étage 1 disponible, étage 5 verrouillé', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower/FIRE',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      element: string
      highestFloor: number
      floors: { index: number; status: string; label: string }[]
    }
    expect(body.element).toBe('FIRE')
    expect(body.highestFloor).toBe(0)
    expect(body.floors.find((f) => f.index === 1)?.status).toBe('current')
    expect(body.floors.find((f) => f.index === 5)?.status).toBe('locked')
  })

  // Le domaine calculait `rewardPreview` mais le schéma Zod de réponse ne le
  // déclarait pas : fastify-type-provider-zod retire les clés non déclarées,
  // la fenêtre de préparation recevait `undefined` et plantait sur
  // `rp.rarityWeights`. Le test interroge la ROUTE, seul endroit où le
  // filtrage de sérialisation se produit — un test du domaine seul serait
  // passé au vert tout du long.
  it('GET /tower/:element — chaque étage annonce son butin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower/FIRE',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      floors: {
        index: number
        rewardPreview?: {
          gold: number
          dust: number
          xp: number
          guaranteedMinRarity: string | null
          rarityWeights: Record<string, number>
        }
      }[]
    }
    for (const floor of body.floors) {
      expect(floor.rewardPreview).toBeDefined()
    }
    // Étage 1 jamais franchi : un plancher de rareté garanti et AUCUN poids de
    // farm — c'est la branche que la fenêtre de préparation affiche, et celle
    // qui plantait. La rareté exacte vient de la fixture d'étage ci-dessus, on
    // n'y touche pas : ce test porte sur la forme du contrat, pas sur le
    // barème.
    const premier = body.floors.find((f) => f.index === 1)?.rewardPreview
    expect(premier?.gold).toBeGreaterThan(0)
    expect(premier?.guaranteedMinRarity).not.toBeNull()
    expect(premier?.rarityWeights).toEqual({})
  })

  it('POST /tower/FIRE/1/battle — gagne, récompenses de premier passage et pièce garantie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/1/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: boolean
      log: unknown[]
      rewards: {
        gold: number
        dust: number
        xp: number
        isFirstClear: boolean
        equipmentDrop: { userEquipmentId: string; rarity: string } | null
      } | null
      teamA: unknown[]
      teamB: unknown[]
    }
    expect(body.won).toBe(true)
    expect(body.rewards?.isFirstClear).toBe(true)
    expect(body.rewards?.gold).toBe(200)
    expect(body.rewards?.dust).toBe(50)
    expect(body.rewards?.xp).toBe(30)
    expect(body.rewards?.equipmentDrop?.rarity).toBe('LEGENDARY')
    expect(typeof body.rewards?.equipmentDrop?.userEquipmentId).toBe('string')
    expect(Array.isArray(body.log)).toBe(true)
    expect(body.teamA).toHaveLength(1)
    expect(body.teamB).toHaveLength(1)
  })

  it('le combat de tour ci-dessus compte pour la quête mais pas pour le compteur de campagne (G2)', async () => {
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
    // Aucune ligne créée : achievements.domain.ts#evaluate court-circuite
    // avant l'upsert dès que stageClearedDelta renvoie 0 (source TOWER).
    expect(progress).toBeNull()
  })

  it('GET /tower/FIRE après la victoire — étage 1 franchi, étage 5 toujours verrouillé', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower/FIRE',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      highestFloor: number
      floors: { index: number; status: string }[]
    }
    expect(body.highestFloor).toBe(1)
    expect(body.floors.find((f) => f.index === 1)?.status).toBe('cleared')
    expect(body.floors.find((f) => f.index === 5)?.status).toBe('locked')
  })

  it('POST /tower/FIRE/1/battle — rejoué, récompenses de farm (plus jamais premier passage)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/1/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: boolean
      rewards: { isFirstClear: boolean; gold: number; dust: number; xp: number } | null
    }
    expect(body.won).toBe(true)
    expect(body.rewards?.isFirstClear).toBe(false)
    expect(body.rewards?.gold).toBe(20)
    expect(body.rewards?.dust).toBe(5)
    expect(body.rewards?.xp).toBe(3)
  })

  it('refuse toujours un étage verrouillé après avoir franchi le 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tower/FIRE/5/battle',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(res.statusCode).toBe(400)
  })
})
