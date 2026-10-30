import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { CAMPAIGN_TEAM_KEY } from '../../../main/domain/combat/combat-team-keys'
import { buildTestApp } from '../../helpers/build-test-app'
import { setCombatTeam } from '../../helpers/combat-team-fixture'
import { randomTestIpv6 } from '../../helpers/guest'

const MINUTE = 60 * 1000

describe('GET /campaign/wanderer', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  const suffix = Date.now()
  let seq = 0
  // Chapitre propre au fichier : jamais touché par les étages de production
  // ni par les autres suites e2e de campagne (pas de TRUNCATE global ici).
  const chapter = 900 + (Date.now() % 50)

  async function registerUser() {
    seq++
    const name = `wnd${seq}x${suffix}`
    const email = `${name}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { username: name, email, password: 'Password123!' },
    })
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { email, password: 'Password123!' },
    })
    return {
      id: user.id as string,
      cookie: login.headers['set-cookie'] as unknown as string,
    }
  }

  const setProgress = (userId: string, highestIndex: number) =>
    prisma.userCampaignProgress.create({
      data: { userId, highestChapter: chapter, highestIndex },
    })

  const wanderer = (cookie?: string) =>
    app.inject({
      method: 'GET',
      url: '/campaign/wanderer',
      headers: cookie ? { cookie } : {},
    })

  const findRow = (userId: string) =>
    prisma.wanderingMonster.findFirst({ where: { userId } })

  // Étages du combat : index 5 = un ennemi de 1 PV (victoire assurée),
  // index 6 = un colosse (défaite assurée). Jamais battus par les joueurs de
  // ce fichier, donc jamais tirés par la planification ci-dessus.
  const WEAK_FARM = { gold: 20, dust: 12 }
  const stageIds: Record<'weak' | 'strong', string> = { weak: '', strong: '' }
  let cardId = ''
  let questId = ''

  async function registerFighter() {
    const u = await registerUser()
    const uc = await prisma.userCard.create({
      data: {
        userId: u.id,
        cardId,
        variant: 'NORMAL',
        quantity: 1,
        level: 10,
        palier: 1,
      },
    })
    await setCombatTeam(app, u.cookie, CAMPAIGN_TEAM_KEY, [uc.id])
    return u
  }

  const spawnMonster = (
    userId: string,
    stageId: string,
    appearsAt = new Date(Date.now() - 1 * MINUTE),
    expiresAt = new Date(Date.now() + 60 * MINUTE),
  ) =>
    prisma.wanderingMonster.create({
      data: {
        userId,
        stageId,
        appearsAt,
        expiresAt,
      },
    })

  const fight = (cookie: string) =>
    app.inject({
      method: 'POST',
      url: '/campaign/wanderer/battle',
      headers: { cookie },
    })

  const snapshot = async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        gold: true,
        dust: true,
        dustGenerated: true,
        tokens: true,
        xp: true,
        combatPoints: true,
      },
    })
    const cards = await prisma.userCard.aggregate({
      where: { userId },
      _sum: { quantity: true },
    })
    return { ...user, cardCount: cards._sum.quantity as number }
  }

  // Effet en base attendu pour chacun des quatre lots.
  function expectLootApplied(
    loot: { kind: string; amount: number },
    before: Awaited<ReturnType<typeof snapshot>>,
    after: Awaited<ReturnType<typeof snapshot>>,
  ) {
    const expected = { ...before }
    switch (loot.kind) {
      case 'GOLD':
        expect(loot.amount).toBe(5 * WEAK_FARM.gold)
        expected.gold += loot.amount
        break
      case 'DUST':
        expect(loot.amount).toBe(5 * WEAK_FARM.dust)
        expected.dust += loot.amount
        expected.dustGenerated += loot.amount
        break
      case 'TOKENS':
        expect(loot.amount).toBe(5)
        expected.tokens += loot.amount
        break
      case 'CARD':
        expect(loot.amount).toBe(1)
        expected.cardCount += 1
        break
      default:
        throw new Error(`lot inattendu : ${loot.kind}`)
    }
    expect(after).toEqual(expected)
  }

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma

    const enemy = (n: number) => ({
      baseHp: 100,
      baseAtk: 10,
      baseDef: 5,
      baseSpd: 50,
      level: 1,
      palier: 1,
     
      attackPattern: 'BASIC',
      element: 'FIRE',
      appearance: `monsters/slimes/SLIME-${suffix}-${n}`,
    })
    const lootTable = {
      firstClear: { gold: 10, dust: 5, xp: 1 },
      farm: {
        gold: 1,
        dust: 1,
        xp: 1,
        equipmentDropChance: 0,
        equipmentWeights: {},
        cardChance: 0,
      },
    }
    for (let index = 1; index <= 4; index++) {
      await prisma.campaignStage.create({
        data: {
          chapter,
          index,
          labelFr: `${chapter}-${index}`,
          labelEn: `${chapter}-${index}`,
          isBoss: false,
          order: chapter * 100 + index,
          enemyTeam: [enemy(index)],
          lootTable,
        },
      })
    }

    const fightStage = (index: number, spec: Record<string, number>) =>
      prisma.campaignStage.create({
        data: {
          chapter,
          index,
          labelFr: `${chapter}-${index}`,
          labelEn: `${chapter}-${index}`,
          isBoss: false,
          order: chapter * 100 + index,
          enemyTeam: [{ ...enemy(index), ...spec }],
          lootTable: { ...lootTable, farm: { ...lootTable.farm, ...WEAK_FARM } },
        },
      })
    stageIds.weak = (
      await fightStage(5, { baseHp: 1, baseAtk: 1, baseDef: 0, baseSpd: 1 })
    ).id
    stageIds.strong = (
      await fightStage(6, {
        baseHp: 100_000_000,
        baseAtk: 10_000_000,
        baseDef: 100_000,
        baseSpd: 10_000,
      })
    ).id

    // La carte de l'équipe sert aussi de pool non vide pour le lot « carte ».
    const set = await prisma.cardSet.create({
      data: { nameFr: `WndSet${suffix}`, nameEn: `WndSet${suffix}`, isActive: true },
    })
    cardId = (
      await prisma.card.create({
        data: {
          nameFr: `WndCard${suffix}`,
          nameEn: `WndCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 1,
          setId: set.id,
          baseHp: 500,
          baseAtk: 50,
          baseDef: 10,
          baseSpd: 100,
        },
      })
    ).id

    // Créée avant tout combat : le pool de quêtes est mis en cache au premier
    // suivi.
    questId = (
      await prisma.quest.create({
        data: {
          key: `test_wanderer_stage_cleared_${suffix}`,
          nameFr: 'Test Errant',
          nameEn: 'Test Wanderer',
          descriptionFr: 'Test',
          descriptionEn: 'Test',
          period: 'ONESHOT',
          criterion: { event: 'STAGE_CLEARED', target: 10 },
          isActive: true,
        },
      })
    ).id
  })

  afterAll(async () => {
    await prisma.userQuest.deleteMany({ where: { questId } })
    await prisma.quest.deleteMany({ where: { id: questId } })
    await app.close()
  })

  it('planifie un passage de 3 h quand 3 étages du chapitre sont battus', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)

    const before = new Date()
    const res = await wanderer(u.cookie)
    expect(res.statusCode).toBe(200)

    const row = await findRow(u.id)
    expect(row).not.toBeNull()

    const stage = await prisma.campaignStage.findUnique({
      where: { id: row.stageId },
    })
    expect(stage.chapter).toBe(chapter)
    expect(stage.index).toBeLessThanOrEqual(3)

    const delayMinutes = Math.round(
      (row.appearsAt.getTime() - before.getTime()) / MINUTE,
    )
    expect(delayMinutes).toBeGreaterThanOrEqual(60)
    expect(delayMinutes).toBeLessThanOrEqual(360)

    expect(row.expiresAt.getTime() - row.appearsAt.getTime()).toBe(
      180 * MINUTE,
    )
  })

  it('ne renvoie rien avant appearsAt', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)
    await wanderer(u.cookie)

    const res = await wanderer(u.cookie)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ wanderer: null })
  })

  it('renvoie la vue une fois appearsAt passé, cohérente avec la ligne', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)
    await wanderer(u.cookie)
    const row = await findRow(u.id)
    await prisma.wanderingMonster.update({
      where: { id: row.id },
      data: { appearsAt: new Date(Date.now() - 1 * MINUTE) },
    })

    const res = await wanderer(u.cookie)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.wanderer).not.toBeNull()
    expect(body.wanderer.stageId).toBe(row.stageId)
    expect(body.wanderer.expiresAt).toBe(row.expiresAt.toISOString())
  })

  it('ne renvoie rien après expiresAt', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)
    await wanderer(u.cookie)
    const row = await findRow(u.id)
    await prisma.wanderingMonster.update({
      where: { id: row.id },
      data: {
        appearsAt: new Date(Date.now() - 2 * MINUTE),
        expiresAt: new Date(Date.now() - 1 * MINUTE),
      },
    })

    const res = await wanderer(u.cookie)
    expect(res.json()).toEqual({ wanderer: null })
  })

  it('ne renvoie rien si defeatedAt est renseigné', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)
    await wanderer(u.cookie)
    const row = await findRow(u.id)
    await prisma.wanderingMonster.update({
      where: { id: row.id },
      data: {
        appearsAt: new Date(Date.now() - 1 * MINUTE),
        defeatedAt: new Date(),
      },
    })

    const res = await wanderer(u.cookie)
    expect(res.json()).toEqual({ wanderer: null })
  })

  it('des lectures répétées ne planifient qu’un passage', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)
    await Promise.all([wanderer(u.cookie), wanderer(u.cookie)])
    const first = await findRow(u.id)

    await wanderer(u.cookie)
    const rows = await prisma.wanderingMonster.findMany({
      where: { userId: u.id },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(first.id)
  })

  it('revient après la défaite du passage précédent', async () => {
    const u = await registerUser()
    await setProgress(u.id, 3)
    await wanderer(u.cookie)
    const first = await findRow(u.id)
    const defeatedAt = new Date(Date.now() - 1 * MINUTE)
    await prisma.wanderingMonster.update({
      where: { id: first.id },
      data: { appearsAt: new Date(Date.now() - 2 * MINUTE), defeatedAt },
    })

    await wanderer(u.cookie)
    const next = await prisma.wanderingMonster.findFirst({
      where: { userId: u.id, id: { not: first.id } },
    })
    expect(next).not.toBeNull()
    const delayMinutes = Math.round(
      (next.appearsAt.getTime() - defeatedAt.getTime()) / MINUTE,
    )
    expect(delayMinutes).toBeGreaterThanOrEqual(60)
    expect(delayMinutes).toBeLessThanOrEqual(360)
    expect(next.expiresAt.getTime() - next.appearsAt.getTime()).toBe(
      180 * MINUTE,
    )
  })

  it('un compte neuf sans progression n’a aucune ligne', async () => {
    const u = await registerUser()

    const res = await wanderer(u.cookie)
    expect(res.statusCode).toBe(200)
    const row = await findRow(u.id)
    expect(row).toBeNull()
  })

  it('sans session → 401', async () => {
    const res = await wanderer()
    expect(res.statusCode).toBe(401)
  })

  describe('POST /campaign/wanderer/battle', () => {
    it('victoire : un lot crédité, monstre vaincu, rien d’autre ne bouge', async () => {
      const u = await registerFighter()
      await setProgress(u.id, 3)
      const row = await spawnMonster(u.id, stageIds.weak)
      const progressBefore = await prisma.userCampaignProgress.findUnique({
        where: { userId: u.id },
      })
      const before = await snapshot(u.id)

      const res = await fight(u.cookie)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.won).toBe(true)
      expect(body.teamA.length).toBe(1)
      expect(body.teamB.length).toBe(1)
      expect(['GOLD', 'DUST', 'TOKENS', 'CARD']).toContain(body.loot.kind)
      if (body.loot.kind === 'CARD') {
        expect(typeof body.loot.card.cardId).toBe('string')
      }

      expectLootApplied(body.loot, before, await snapshot(u.id))

      const after = await prisma.wanderingMonster.findUnique({
        where: { id: row.id },
      })
      expect(after.defeatedAt).not.toBeNull()
      expect((await wanderer(u.cookie)).json()).toEqual({ wanderer: null })
      expect(
        await prisma.userCampaignProgress.findUnique({ where: { userId: u.id } }),
      ).toEqual(progressBefore)
      expect(await prisma.battleResult.count({ where: { userId: u.id } })).toBe(0)
      const uq = await prisma.userQuest.findFirst({
        where: { userId: u.id, questId },
      })
      expect(uq?.progress ?? 0).toBe(0)
    })

    it('défaite : pas de lot, monstre toujours là, énergie intacte, nouvel essai possible', async () => {
      const u = await registerFighter()
      await spawnMonster(u.id, stageIds.strong)
      const before = await snapshot(u.id)

      const res = await fight(u.cookie)
      expect(res.statusCode).toBe(200)
      expect(res.json().won).toBe(false)
      expect(res.json().loot).toBeNull()
      expect(await snapshot(u.id)).toEqual(before)
      expect((await wanderer(u.cookie)).json().wanderer).not.toBeNull()

      const again = await fight(u.cookie)
      expect(again.statusCode).toBe(200)
      expect(again.json().won).toBe(false)
    })

    it('deux combats simultanés : un seul butin', async () => {
      const u = await registerFighter()
      await spawnMonster(u.id, stageIds.weak)
      const before = await snapshot(u.id)

      const results = await Promise.all([fight(u.cookie), fight(u.cookie)])
      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 404])
      const ok = results.find((r) => r.statusCode === 200)
      expectLootApplied(ok?.json().loot, before, await snapshot(u.id))
    })

    it('monstre expiré, pas encore apparu ou absent → 404', async () => {
      const expired = await registerFighter()
      await spawnMonster(
        expired.id,
        stageIds.weak,
        new Date(Date.now() - 2 * MINUTE),
        new Date(Date.now() - 1 * MINUTE),
      )
      expect((await fight(expired.cookie)).statusCode).toBe(404)

      const early = await registerFighter()
      await spawnMonster(
        early.id,
        stageIds.weak,
        new Date(Date.now() + 1 * MINUTE),
        new Date(Date.now() + 60 * MINUTE),
      )
      expect((await fight(early.cookie)).statusCode).toBe(404)

      const none = await registerFighter()
      const res = await fight(none.cookie)
      expect(res.statusCode).toBe(404)
    })

    it('sans équipe de campagne → 400', async () => {
      const u = await registerUser()
      await spawnMonster(u.id, stageIds.weak)
      expect((await fight(u.cookie)).statusCode).toBe(400)
    })
  })
})
