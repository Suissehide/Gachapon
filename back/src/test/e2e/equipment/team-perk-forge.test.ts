import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { EQUIPMENT_TEAM_PERK_FORGE } from '../../helpers/equipment-fixture-slots'

/**
 * E2E : le bonus d'équipe `forge` (task 5, refonte équipe) réduit le coût en
 * or d'une amélioration d'équipement — multiplicatif sur le résultat déjà
 * arrondi de `upgradeGoldCost`, jamais injecté plus tôt dans le calcul :
 * `Math.round(upgradeGoldCost(...) * (1 - forge / 100))`.
 *
 * Observé via `POST /equipment/:id/upgrade` (equipment.domain.ts#upgrade),
 * champ `goldSpent`.
 */
describe('Bonus équipe `forge` — coût d\'amélioration', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let forgePct: number

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `teamperkforge${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tpforge${tag}${suffix}`, email, password },
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

  async function makeTeam(ownerTag: string, memberUserId: string) {
    const owner = await prisma.user.create({
      data: {
        username: `tpforgeowner${ownerTag}${suffix}`,
        email: `tpforgeowner${ownerTag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await prisma.team.create({
      data: {
        name: `TeamPerkForge${ownerTag}${suffix}`,
        slug: `team-perk-forge-${ownerTag}-${suffix}`,
        ownerId: owner.id,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: memberUserId, role: 'MEMBER' },
    })
    return team.id as string
  }

  // Une SEULE ligne de catalogue `Equipment` : (slot, setKey, rareté,
  // mainStat) est une contrainte unique GLOBALE (@@unique), partagée par
  // tous les fichiers e2e. Les deux joueurs reçoivent chacun leur propre
  // `UserEquipment` sur ce même catalogue.
  let weaponEquipmentId: string

  async function makeWeapon(userId: string) {
    const ue = await prisma.userEquipment.create({
      data: { userId, equipmentId: weaponEquipmentId },
    })
    return ue.id as string
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    forgePct =
      5 * (await configService.getMany('teamPerk.forge.perRank'))['teamPerk.forge.perRank']

    const weapon = await prisma.equipment.create({
      data: {
        name: `TpForgeW-${suffix}`,
        ...EQUIPMENT_TEAM_PERK_FORGE,
        rarity: 'RARE',
        bonuses: { atkFlat: 10 },
        dropWeight: 10,
      },
    })
    weaponEquipmentId = weapon.id
  })

  afterAll(async () => {
    await app.close()
  })

  it("rang 5 : le coût en or facturé baisse du pourcentage du bonus, arrondi", async () => {
    expect(forgePct).toBeGreaterThan(0)

    const baseline = await registerAndLogin('Base')
    const bonused = await registerAndLogin('Bonus')

    const teamId = await makeTeam('Forge', bonused.userId)
    await prisma.teamPerk.create({
      data: { teamId, key: 'forge', rank: 5 },
    })

    const baselineWeaponId = await makeWeapon(baseline.userId)
    const bonusedWeaponId = await makeWeapon(bonused.userId)

    const baselineRes = await app.inject({
      method: 'POST',
      url: `/equipment/${baselineWeaponId}/upgrade`,
      headers: { cookie: baseline.cookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    const baselineCost = baselineRes.json().goldSpent as number
    expect(baselineCost).toBeGreaterThan(0)

    const bonusedRes = await app.inject({
      method: 'POST',
      url: `/equipment/${bonusedWeaponId}/upgrade`,
      headers: { cookie: bonused.cookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    const bonusedCost = bonusedRes.json().goldSpent as number

    expect(bonusedCost).toBe(
      Math.round(baselineCost * (1 - forgePct / 100)),
    )
    expect(bonusedCost).toBeLessThan(baselineCost)
  })

  it("GET /equipment annonce le MÊME coût que celui réellement facturé (revue coordinateur : plus de recalcul côté front)", async () => {
    const bonused = await registerAndLogin('Announced')
    const teamId = await makeTeam('Announced', bonused.userId)
    await prisma.teamPerk.create({
      data: { teamId, key: 'forge', rank: 5 },
    })

    const weaponId = await makeWeapon(bonused.userId)

    const listRes = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: bonused.cookies },
    })
    expect(listRes.statusCode).toBe(200)
    const item = listRes.json().items.find((i: any) => i.id === weaponId)
    expect(item).toBeDefined()
    const announcedCost = item.nextUpgradeCost as number
    expect(announcedCost).toBeGreaterThan(0)

    const upgradeRes = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponId}/upgrade`,
      headers: { cookie: bonused.cookies },
    })
    expect(upgradeRes.statusCode).toBe(200)
    expect(upgradeRes.json().goldSpent).toBe(announcedCost)
  })
})
