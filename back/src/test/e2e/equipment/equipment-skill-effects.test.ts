import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { EQUIPMENT_SKILL_EFFECTS } from '../../helpers/equipment-fixture-slots'

/**
 * E2E : les deux effets de compétence liés à l'équipement.
 *
 * - EQUIP_UPGRADE_DISCOUNT (Forgeron) : remise en % sur le coût en or d'une
 *   amélioration, additive au bonus d'équipe `forge` et appliquée par la
 *   même fonction pure (`discountedUpgradeGoldCost`). Observé via
 *   `POST /equipment/:id/upgrade` (`goldSpent`) et `GET /equipment`
 *   (`nextUpgradeCost`), qui doivent annoncer le même prix.
 * - SALVAGE_BONUS (Ferrailleur) : bonus en % sur l'or rendu par le
 *   recyclage, appliqué pièce par pièce puis arrondi. Observé via
 *   `POST /equipment/salvage` (`goldEarned`).
 */
describe('Compétences équipement — Forgeron et Ferrailleur', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let equipmentId: string
  let salvageRareGold: number
  /** Branches créées ici — supprimées en afterAll (cascade sur nœuds et
   * UserSkill) : la base n'est purgée qu'une fois par run, et
   * skills/index.test.ts compte les branches présentes. */
  const createdBranchIds: string[] = []

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `equipskill${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `equipskill${tag}${suffix}`, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), gold: 100000 },
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

  /** Nœud dédié au test (l'arbre seedé n'est pas chargé en e2e). */
  async function giveSkill(
    userId: string,
    effectType: 'EQUIP_UPGRADE_DISCOUNT' | 'SALVAGE_BONUS',
    effect: number,
  ) {
    const branch = await prisma.skillBranch.create({
      data: {
        nameFr: `EquipSkill${effectType}${suffix}`,
        nameEn: `EquipSkill${effectType}${suffix}`,
        descriptionFr: '',
        descriptionEn: '',
        icon: 'Anvil',
        color: '#000000',
        order: 99,
      },
    })
    createdBranchIds.push(branch.id)
    const node = await prisma.skillNode.create({
      data: {
        branchId: branch.id,
        nameFr: effectType,
        nameEn: effectType,
        descriptionFr: '',
        descriptionEn: '',
        icon: 'Anvil',
        maxLevel: 1,
        effectType,
        posX: 0,
        posY: 0,
        levels: { create: [{ level: 1, effect }] },
      },
    })
    await prisma.userSkill.create({
      data: { userId, nodeId: node.id, level: 1 },
    })
  }

  async function makePiece(userId: string) {
    const ue = await prisma.userEquipment.create({
      data: { userId, equipmentId },
    })
    return ue.id as string
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    salvageRareGold = (
      await container.configService.getMany('equip.salvageGoldRare')
    )['equip.salvageGoldRare']

    const piece = await prisma.equipment.create({
      data: {
        nameFr: `EquipSkill-${suffix}`,
        nameEn: `EquipSkill-${suffix}`,
        ...EQUIPMENT_SKILL_EFFECTS,
        rarity: 'RARE',
        bonuses: { atkFlat: 10 },
        dropWeight: 10,
      },
    })
    equipmentId = piece.id
  })

  afterAll(async () => {
    await prisma.skillBranch.deleteMany({
      where: { id: { in: createdBranchIds } },
    })
    await app.close()
  })

  it('Forgeron 15 % : le coût facturé baisse de 15 %, arrondi, et GET /equipment annonce le même prix', async () => {
    const baseline = await registerAndLogin('Base')
    const skilled = await registerAndLogin('Forge')
    await giveSkill(skilled.userId, 'EQUIP_UPGRADE_DISCOUNT', 15)

    const baselinePieceId = await makePiece(baseline.userId)
    const skilledPieceId = await makePiece(skilled.userId)

    const listRes = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: skilled.cookies },
    })
    expect(listRes.statusCode).toBe(200)
    const announced = listRes
      .json()
      .items.find((i: any) => i.id === skilledPieceId).nextUpgradeCost as number

    const baselineRes = await app.inject({
      method: 'POST',
      url: `/equipment/${baselinePieceId}/upgrade`,
      headers: { cookie: baseline.cookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    const baselineCost = baselineRes.json().goldSpent as number
    expect(baselineCost).toBeGreaterThan(0)

    const skilledRes = await app.inject({
      method: 'POST',
      url: `/equipment/${skilledPieceId}/upgrade`,
      headers: { cookie: skilled.cookies },
    })
    expect(skilledRes.statusCode).toBe(200)
    const skilledCost = skilledRes.json().goldSpent as number

    expect(skilledCost).toBe(Math.round(baselineCost * 0.85))
    expect(skilledCost).toBeLessThan(baselineCost)
    expect(announced).toBe(skilledCost)
  })

  it('Ferrailleur 30 % : le recyclage rend 30 % d\'or en plus, arrondi par pièce', async () => {
    const skilled = await registerAndLogin('Salvage')
    await giveSkill(skilled.userId, 'SALVAGE_BONUS', 30)
    const a = await makePiece(skilled.userId)
    const b = await makePiece(skilled.userId)

    const res = await app.inject({
      method: 'POST',
      url: '/equipment/salvage',
      headers: { cookie: skilled.cookies, 'content-type': 'application/json' },
      payload: { userEquipmentIds: [a, b] },
    })
    expect(res.statusCode).toBe(200)
    const perPiece = Math.round(salvageRareGold * 1.3)
    expect(perPiece).toBeGreaterThan(salvageRareGold)
    expect(res.json().goldEarned).toBe(2 * perPiece)
    expect(res.json().destroyedCount).toBe(2)
  })
})
