import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { EQUIPMENT_QUESTS } from '../../helpers/equipment-fixture-slots'

/**
 * Vérifie que les gestes d'équipement alimentent bien le moteur de quêtes :
 * `equipment.domain` → `achievementsDomain.track` → `questsDomain.trackInTx`.
 *
 * Les quêtes de test sont des ONESHOT : contrairement aux hebdomadaires, elles
 * sont TOUTES actives (pas de tirage de 3 parmi le pool), donc le suivi est
 * déterministe. Elles sont créées avant toute action pour que le premier
 * chargement du pool (cache vide au boot, TTL 60 s) les voie.
 */
describe('Progression des quêtes équipement e2e', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  // biome-ignore lint/suspicious/noExplicitAny: accès au cradle IoC comme les autres e2e
  let orm: any
  let cookies: string
  let userId: string
  let pieceToUpgradeId: string
  let salvageIds: string[]

  const suffix = Date.now()
  const email = `equipquest${suffix}@test.com`
  const password = 'Password123!'
  const username = `equipquest${suffix}`

  const upgradeQuestKey = `test_equip_upgraded_${suffix}`
  const salvageQuestKey = `test_equip_salvaged_${suffix}`
  const goldQuestKey = `test_equip_gold_${suffix}`
  const questKeys = [upgradeQuestKey, salvageQuestKey, goldQuestKey]

  const progressOf = async (key: string): Promise<number> => {
    const quest = await orm.prisma.quest.findUnique({ where: { key } })
    const uq = await orm.prisma.userQuest.findFirst({
      where: { userId, questId: quest.id, periodKey: 'oneshot' },
    })
    return uq?.progress ?? 0
  }

  beforeAll(async () => {
    app = await buildTestApp()
    // biome-ignore lint/suspicious/noExplicitAny: idem
    orm = (app as any).iocContainer.postgresOrm

    // Quêtes de test — AVANT toute action suivie.
    for (const [key, event, target] of [
      [upgradeQuestKey, 'EQUIPMENT_UPGRADED', 3],
      [salvageQuestKey, 'EQUIPMENT_SALVAGED', 2],
      [goldQuestKey, 'GOLD_SPENT', 100_000],
    ] as const) {
      await orm.prisma.quest.create({
        data: {
          key,
          name: key,
          description: key,
          period: 'ONESHOT',
          criterion: { event, target },
          isActive: true,
        },
      })
    }

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await orm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), gold: 100_000 },
    })
    userId = user.id

    const mkPiece = (name: string, rarity: string) =>
      orm.prisma.equipment.create({
        data: {
          name: `${name}-${suffix}`,
          ...EQUIPMENT_QUESTS,
          rarity,
          bonuses: { atkFlat: 5 },
          dropWeight: 10,
        },
      })
    const common = await mkPiece('EqQuestC', 'COMMON')
    const rare = await mkPiece('EqQuestR', 'RARE')

    pieceToUpgradeId = (
      await orm.prisma.userEquipment.create({
        data: { userId, equipmentId: common.id },
      })
    ).id
    salvageIds = [
      (
        await orm.prisma.userEquipment.create({
          data: { userId, equipmentId: common.id },
        })
      ).id,
      (
        await orm.prisma.userEquipment.create({
          data: { userId, equipmentId: rare.id },
        })
      ).id,
    ]

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await orm.prisma.userQuest.deleteMany({
      where: { quest: { key: { in: questKeys } } },
    })
    await orm.prisma.quest.deleteMany({ where: { key: { in: questKeys } } })
    await app.close()
  })

  it('fait progresser la quête EQUIPMENT_UPGRADED d un niveau par amélioration', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${pieceToUpgradeId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    expect(await progressOf(upgradeQuestKey)).toBe(1)
  })

  // Régression : `equipment.upgrade()` dépensait de l'or sans émettre
  // GOLD_SPENT, si bien que la quête hebdo « Dépensier » ignorait le principal
  // puits d'or du jeu.
  it("compte l'or dépensé par une amélioration dans la quête GOLD_SPENT", async () => {
    const before = await progressOf(goldQuestKey)

    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${pieceToUpgradeId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const goldSpent = res.json().goldSpent as number
    expect(goldSpent).toBeGreaterThan(0)

    expect(await progressOf(goldQuestKey)).toBe(before + goldSpent)
  })

  // `amount` et non 1 : un recyclage groupé doit compter chaque pièce.
  it('compte chaque pièce détruite dans la quête EQUIPMENT_SALVAGED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/equipment/salvage',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userEquipmentIds: salvageIds },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().destroyedCount).toBe(2)

    expect(await progressOf(salvageQuestKey)).toBe(2)
  })
})
