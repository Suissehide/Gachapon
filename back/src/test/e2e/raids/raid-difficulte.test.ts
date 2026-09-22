import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import {
  raidElementForWeek,
  raidWeekKey,
} from '../../../main/domain/raid/raid-rules'
import { buildTestApp } from '../../helpers/build-test-app'

const WEAK_BOSS_SPEC = {
  baseHp: 100,
  baseAtk: 1,
  baseDef: 0,
  baseSpd: 50,
  level: 1,
  palier: 1,
  attackPattern: 'BASIC',
  passiveKey: null,
  element: 'FIRE',
  appearance: 'monsters/bosses/BOSS-010',
  mitigationScale: 1,
}

const HP_PER_MEMBER = 1000
const DAY_MS = 86_400_000

describe('raid — difficulté progressive', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let bossId: string
  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `raiddiff${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `raiddiff${tag}${suffix}`, email, password },
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
    expect(login.statusCode).toBe(200)
    return login.headers['set-cookie'] as string
  }

  /** Une équipe neuve par test : le niveau se dérive de SON historique. */
  async function freshTeam(tag: string) {
    const cookies = await registerAndLogin(tag)
    const res = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookies },
      payload: { name: `RaidDiff${tag}${suffix}` },
    })
    expect(res.statusCode).toBe(201)
    return { teamId: res.json().id as string, cookies }
  }

  /** Raid d'une semaine révolue, posé directement en base. */
  async function pastRaid(
    teamId: string,
    weeksAgo: number,
    level: number,
    killed: boolean,
  ) {
    const date = new Date(Date.now() - weeksAgo * 7 * DAY_MS)
    await prisma.teamRaid.create({
      data: {
        teamId,
        weekKey: raidWeekKey(date),
        bossId,
        maxHp: HP_PER_MEMBER,
        hp: killed ? 0 : HP_PER_MEMBER,
        memberCountAtStart: 1,
        level,
        killedAt: killed ? date : null,
      },
    })
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm, configService } = (app as any).iocContainer
    prisma = postgresOrm.prisma

    await configService.set('raid.baseHpPerMember', HP_PER_MEMBER)
    await configService.set('raid.minMembers', 10)
    await configService.set('raid.levelHpBonusPct', 10)

    const element = raidElementForWeek(raidWeekKey(new Date()))
    const boss = await prisma.raidBoss.upsert({
      where: { element },
      create: {
        element,
        name: 'Boss de difficulté',
        spec: { ...WEAK_BOSS_SPEC, element },
      },
      update: {
        name: 'Boss de difficulté',
        spec: { ...WEAK_BOSS_SPEC, element },
      },
    })
    bossId = boss.id
  })

  afterAll(async () => {
    await app.close()
  })

  it('une équipe sans passé ouvre son raid au niveau 0', async () => {
    const { teamId, cookies } = await freshTeam('N0')
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const row = await prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey: raidWeekKey(new Date()) } },
    })
    expect(row.level).toBe(0)
  })

  it('une victoire la semaine dernière ouvre le raid au niveau suivant', async () => {
    const { teamId, cookies } = await freshTeam('UP')
    await pastRaid(teamId, 1, 2, true)
    await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookies },
    })
    const row = await prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey: raidWeekKey(new Date()) } },
    })
    expect(row.level).toBe(3)
  })

  it('une semaine sans victoire fait redescendre, sans passer sous 0', async () => {
    const { teamId, cookies } = await freshTeam('DOWN')
    await pastRaid(teamId, 1, 0, false)
    await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookies },
    })
    const row = await prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey: raidWeekKey(new Date()) } },
    })
    expect(row.level).toBe(0)
  })

  it('les semaines entièrement sautées coûtent un cran chacune', async () => {
    const { teamId, cookies } = await freshTeam('SKIP')
    await pastRaid(teamId, 3, 3, true)
    await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookies },
    })
    const row = await prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey: raidWeekKey(new Date()) } },
    })
    expect(row.level).toBe(2)
  })
})
