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
  let cookies: string
  let userId: string
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
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    expect(login.statusCode).toBe(200)
    return {
      userId: user.id as string,
      cookies: login.headers['set-cookie'] as string,
    }
  }

  /**
   * Une équipe neuve par test : le niveau se dérive de SON historique.
   * Créée en base plutôt que par `POST /teams` — la suite dépasse à la fois
   * la limite de 5 inscriptions par quart d'heure (register.router.ts) et le
   * plafond de 3 équipes par joueur (MAX_TEAMS_PER_USER). Ce que ces tests
   * exercent est la règle de difficulté, pas la création d'équipe.
   */
  async function freshTeam(tag: string) {
    const team = await prisma.team.create({
      data: {
        name: `RaidDiff${tag}${suffix}`,
        slug: `raid-diff-${tag}-${suffix}`.toLowerCase(),
        ownerId: userId,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId, role: 'OWNER' },
    })
    return { teamId: team.id, cookies }
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

    const account = await registerAndLogin('OWNER')
    cookies = account.cookies
    userId = account.userId
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

  it('une équipe solo affronte un boss calibré pour `minMembers`', async () => {
    const { teamId, cookies } = await freshTeam('SOLO')
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().memberCountAtStart).toBe(1)
    expect(res.json().maxHp).toBe(HP_PER_MEMBER * 10)
  })

  it('le niveau compose le bonus de PV par-dessus le plancher', async () => {
    const { teamId, cookies } = await freshTeam('HP2')
    await pastRaid(teamId, 1, 1, true) // victoire au niveau 1 → niveau 2
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookies },
    })
    // 1000 × 10 × 1,1² = 12 100
    expect(res.json().maxHp).toBe(12100)
  })
})
