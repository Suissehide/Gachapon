import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import {
  raidElementForWeek,
  raidWeekKey,
} from '../../../main/domain/raid/raid-rules'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * Boss volontairement inoffensif et sans défense : le joueur ne meurt
 * jamais et inflige des dégâts à chaque tour, ce qui rend les assertions
 * sur `damage > 0` déterministes quelle que soit la seed.
 */
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

const TIERS = [
  { pct: 25, tokens: 5, gold: 200, dust: 50 },
  { pct: 50, tokens: 10, gold: 400, dust: 100 },
  { pct: 75, tokens: 15, gold: 600, dust: 150 },
  { pct: 100, tokens: 25, gold: 1000, dust: 300, cardRarity: 'EPIC' as const },
]

// PV par membre énormes : aucune attaque de test ne franchit un palier par
// accident. Les paliers sont testés en forçant `hp` directement en base.
const HUGE_HP_PER_MEMBER = 100_000_000

describe('routes de raid', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookiesA: string
  let cookiesB: string
  let cookiesC: string
  let userIdA: string
  let userIdB: string
  let teamId: string
  let cardIdA: string
  let cardIdB: string

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `raid${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `raid${tag}${suffix}`, email, password },
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
    return { userId: user.id as string, cookies: login.headers['set-cookie'] as string }
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm, configService } = (app as any).iocContainer
    prisma = postgresOrm.prisma

    await configService.set('raid.baseHpPerMember', HUGE_HP_PER_MEMBER)
    await configService.set('raid.attacksPerDay', 2)

    const element = raidElementForWeek(raidWeekKey(new Date()))
    await prisma.raidBoss.upsert({
      where: { element },
      create: { element, name: 'Boss de test', spec: { ...WEAK_BOSS_SPEC, element } },
      update: { name: 'Boss de test', spec: { ...WEAK_BOSS_SPEC, element } },
    })
    for (const t of TIERS) {
      const existing = await prisma.raidTier.findUnique({ where: { pct: t.pct } })
      if (!existing) {
        const reward = await prisma.reward.create({
          data: {
            tokens: t.tokens,
            gold: t.gold,
            dust: t.dust,
            cardRarity: t.cardRarity ?? null,
          },
        })
        await prisma.raidTier.create({ data: { pct: t.pct, rewardId: reward.id } })
      }
    }

    const set = await prisma.cardSet.create({
      data: { name: `RaidSet${suffix}`, isActive: true },
    })
    const card = await prisma.card.create({
      data: {
        name: `RaidCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 5000,
        baseAtk: 500,
        baseDef: 100,
        baseSpd: 200,
      },
    })

    const a = await registerAndLogin('A')
    const b = await registerAndLogin('B')
    const c = await registerAndLogin('C')
    userIdA = a.userId
    userIdB = b.userId
    cookiesA = a.cookies
    cookiesB = b.cookies
    cookiesC = c.cookies

    for (const [uid, setter] of [
      [userIdA, (id: string) => (cardIdA = id)],
      [userIdB, (id: string) => (cardIdB = id)],
    ] as const) {
      const uc = await prisma.userCard.create({
        data: { userId: uid, cardId: card.id, variant: 'NORMAL', quantity: 1, level: 60, palier: 6 },
      })
      setter(uc.id)
    }

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `RaidTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdB, role: 'MEMBER' },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /teams/:id/raid exige une session', async () => {
    const res = await app.inject({ method: 'GET', url: `/teams/${teamId}/raid` })
    expect(res.statusCode).toBe(401)
  })

  it('GET /teams/:id/raid refuse un non-membre', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookiesC },
    })
    expect(res.statusCode).toBe(403)

    // Le refus doit précéder la création paresseuse : aucune ligne TeamRaid
    // ne doit exister pour cette équipe/semaine après ce rejet.
    const orphan = await prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey: raidWeekKey(new Date()) } },
    })
    expect(orphan).toBeNull()
  })

  it('GET /teams/:id/raid crée le raid de la semaine une seule fois', async () => {
    const first = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookiesA },
    })
    expect(first.statusCode).toBe(200)
    const body = first.json()
    expect(body.weekKey).toBe(raidWeekKey(new Date()))
    expect(body.boss.element).toBe(raidElementForWeek(body.weekKey))
    expect(body.boss.name).toBe('Boss de test')
    expect(body.memberCountAtStart).toBe(2)
    expect(body.maxHp).toBe(HUGE_HP_PER_MEMBER * 2)
    expect(body.hp).toBe(body.maxHp)
    expect(body.damageDone).toBe(0)
    expect(body.killedAt).toBeNull()
    expect(body.tiers.map((t: any) => t.pct)).toEqual([25, 50, 75, 100])
    expect(body.tiers.every((t: any) => t.reached === false)).toBe(true)
    expect(body.tiers[3].reward.cardRarity).toBe('EPIC')
    expect(body.me).toEqual({
      attacksPerDay: 2,
      attacksRemainingToday: 2,
      damage: 0,
      attacks: 0,
    })
    expect(body.contributions).toEqual([])

    const second = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookiesB },
    })
    expect(second.json().id).toBe(body.id)
  })

  it('GET /teams/:id/raid/contributions renvoie une liste vide au départ', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid/contributions`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ contributions: [] })
  })

  it('POST attack : inflige des dégâts, décrémente hp, enregistre la contribution', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/raid/attack`,
      headers: { cookie: cookiesA },
      payload: { userCardIds: [cardIdA] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.damage).toBeGreaterThan(0)
    expect(body.hpBefore).toBe(HUGE_HP_PER_MEMBER * 2)
    expect(body.hpAfter).toBe(body.hpBefore - body.damage)
    expect(body.killed).toBe(false)
    expect(body.newTiers).toEqual([])
    expect(body.attacksRemainingToday).toBe(1)
    expect(body.teamA).toHaveLength(1)
    expect(body.teamB).toHaveLength(1)
    expect(body.teamB[0].name).toBe('Boss de test')
    expect(Array.isArray(body.log)).toBe(true)

    const view = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookiesA },
    })
    const v = view.json()
    expect(v.hp).toBe(body.hpAfter)
    expect(v.damageDone).toBe(body.damage)
    expect(v.me.attacks).toBe(1)
    expect(v.me.damage).toBe(body.damage)
    expect(v.contributions[0].user.id).toBe(userIdA)
    expect(v.contributions[0].attacks).toBe(1)
  })

  it('POST attack : refuse une carte qui n’appartient pas au joueur', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/raid/attack`,
      headers: { cookie: cookiesB },
      payload: { userCardIds: [cardIdA] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST attack : la 3e attaque du jour est refusée (429), quota partagé entre équipes', async () => {
    const second = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/raid/attack`,
      headers: { cookie: cookiesA },
      payload: { userCardIds: [cardIdA] },
    })
    expect(second.statusCode).toBe(200)
    expect(second.json().attacksRemainingToday).toBe(0)

    const third = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/raid/attack`,
      headers: { cookie: cookiesA },
      payload: { userCardIds: [cardIdA] },
    })
    expect(third.statusCode).toBe(429)

    // Une seconde équipe ne rouvre pas le quota.
    const team2 = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `RaidTeam2${suffix}` },
    })
    const team2Id = team2.json().id
    const other = await app.inject({
      method: 'POST',
      url: `/teams/${team2Id}/raid/attack`,
      headers: { cookie: cookiesA },
      payload: { userCardIds: [cardIdA] },
    })
    expect(other.statusCode).toBe(429)
  })

  it('POST attack : franchir les paliers récompense tous les participants, sans doublon, puis bloque (409)', async () => {
    // On amène le boss au bord de la mort : l’attaque suivante le tue et
    // franchit 100 %. 25/50/75 comptent comme « déjà franchis » sans avoir
    // été distribués (hp forcé en base) : le rattrapage doit les donner
    // aussi, à A (2 attaques plus tôt) comme à B (attaquant).
    const raid = await prisma.teamRaid.findFirst({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    })
    await prisma.teamRaid.update({ where: { id: raid.id }, data: { hp: 1 } })

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/raid/attack`,
      headers: { cookie: cookiesB },
      payload: { userCardIds: [cardIdB] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.hpAfter).toBe(0)
    expect(body.killed).toBe(true)
    expect(body.newTiers.map((t: any) => t.pct)).toEqual([100])

    for (const uid of [userIdA, userIdB]) {
      const rewards = await prisma.userReward.findMany({
        where: { userId: uid, source: 'RAID', sourceId: { startsWith: `${raid.id}:` } },
        orderBy: { sourceId: 'asc' },
      })
      expect(rewards.map((r: any) => r.sourceId)).toEqual([
        `${raid.id}:100`,
        `${raid.id}:25`,
        `${raid.id}:50`,
        `${raid.id}:75`,
      ])
      expect(rewards.every((r: any) => r.claimedAt === null)).toBe(true)
    }

    const view = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/raid`,
      headers: { cookie: cookiesB },
    })
    expect(view.json().killedAt).not.toBeNull()
    expect(view.json().tiers.every((t: any) => t.reached)).toBe(true)

    // B a encore une attaque, mais le boss est mort.
    const again = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/raid/attack`,
      headers: { cookie: cookiesB },
      payload: { userCardIds: [cardIdB] },
    })
    expect(again.statusCode).toBe(409)
  })
})
