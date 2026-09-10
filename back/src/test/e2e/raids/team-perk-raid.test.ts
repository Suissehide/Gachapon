import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import {
  raidElementForWeek,
  raidWeekKey,
} from '../../../main/domain/raid/raid-rules'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : le bonus d'équipe `raid` (task 5, refonte équipe) s'ajoute en ENTIER
 * au quota quotidien d'attaques — `raid.attacksPerDay + effect`, jamais un
 * recalcul depuis le rang. Observé sur `GET /teams/:id/raid`, champ
 * `me.attacksPerDay`, exposé par `raid.domain.ts#buildView`.
 */
describe('Bonus équipe `raid` — attaques par jour', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let baseAttacksPerDay: number
  let raidPct: number

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `teamperkraid${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tpraid${tag}${suffix}`, email, password },
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
        username: `tpraidowner${ownerTag}${suffix}`,
        email: `tpraidowner${ownerTag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await prisma.team.create({
      data: {
        name: `TeamPerkRaid${ownerTag}${suffix}`,
        slug: `team-perk-raid-${ownerTag}-${suffix}`,
        ownerId: owner.id,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: memberUserId, role: 'MEMBER' },
    })
    return team.id as string
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    const cfg = await configService.getMany(
      'raid.attacksPerDay',
      'teamPerk.raid.perRank',
    )
    baseAttacksPerDay = cfg['raid.attacksPerDay']
    // `perkEffect('raid', rank, perRank)` plancher (Math.floor) le produit —
    // recalculé ici avec la même règle que team-progression-rules.ts,
    // jamais une valeur codée en dur.
    raidPct = Math.floor(5 * cfg['teamPerk.raid.perRank'])

    const weekKey = raidWeekKey(new Date())
    const element = raidElementForWeek(weekKey)
    await prisma.raidBoss.upsert({
      where: { element },
      create: {
        element,
        name: 'Boss bonus raid',
        spec: {
          baseHp: 100,
          baseAtk: 1,
          baseDef: 0,
          baseSpd: 50,
          level: 1,
          palier: 1,
          attackPattern: 'BASIC',
          passiveKey: null,
          element,
          appearance: 'monsters/bosses/BOSS-010',
          mitigationScale: 1,
        },
      },
      update: {},
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it("rang 5 : ajoute l'effet ENTIER du bonus au quota de base", async () => {
    expect(raidPct).toBeGreaterThan(0)

    const baseline = await registerAndLogin('Base')
    const bonused = await registerAndLogin('Bonus')

    // team1 (baseline) : le joueur en est membre mais SANS bonus investi —
    // rang 0 par défaut (aucune ligne TeamPerk). team2 (bonus) : rang 5 sur
    // `raid`.
    const team1Id = await makeTeam('Base', baseline.userId)
    const team2Id = await makeTeam('Bonus', bonused.userId)
    await prisma.teamPerk.create({
      data: { teamId: team2Id, key: 'raid', rank: 5 },
    })

    const baselineRes = await app.inject({
      method: 'GET',
      url: `/teams/${team1Id}/raid`,
      headers: { cookie: baseline.cookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    expect(baselineRes.json().me.attacksPerDay).toBe(baseAttacksPerDay)

    const bonusedRes = await app.inject({
      method: 'GET',
      url: `/teams/${team2Id}/raid`,
      headers: { cookie: bonused.cookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    expect(bonusedRes.json().me.attacksPerDay).toBe(
      baseAttacksPerDay + raidPct,
    )
  })
})
