import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('admin raid routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookies: string
  const suffix = Date.now()
  const email = `raidadmin${suffix}@test.com`

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `raidadmin${suffix}`, email, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    cookies = login.headers['set-cookie'] as string

    await prisma.raidBoss.upsert({
      where: { element: 'WATER' },
      create: {
        element: 'WATER',
        name: 'Nérée',
        spec: {
          baseHp: 100, baseAtk: 10, baseDef: 5, baseSpd: 100, level: 1, palier: 1,
          attackPattern: 'BASIC', passiveKey: null, element: 'WATER',
          appearance: 'monsters/bosses/BOSS-011', mitigationScale: 1,
        },
      },
      update: {
        name: 'Nérée',
        spec: {
          baseHp: 100, baseAtk: 10, baseDef: 5, baseSpd: 100, level: 1, palier: 1,
          attackPattern: 'BASIC', passiveKey: null, element: 'WATER',
          appearance: 'monsters/bosses/BOSS-011', mitigationScale: 1,
        },
      },
    })
    const existing = await prisma.raidTier.findUnique({
      where: { pct_level: { pct: 50, level: 0 } },
    })
    if (!existing) {
      const reward = await prisma.reward.create({ data: { tokens: 10, gold: 400, dust: 100 } })
      await prisma.raidTier.create({ data: { pct: 50, rewardId: reward.id } })
    }
  })

  afterAll(() => app.close())

  it('GET /admin/raid/bosses liste les boss avec leur spec', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/raid/bosses', headers: { cookie: cookies } })
    expect(res.statusCode).toBe(200)
    const water = res.json().bosses.find((b: any) => b.element === 'WATER')
    expect(water.name).toBe('Nérée')
    expect(water.spec.appearance).toBe('monsters/bosses/BOSS-011')
  })

  it('PATCH /admin/raid/bosses/:element met à jour nom et spec', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/bosses/WATER',
      headers: { cookie: cookies },
      payload: {
        name: 'Nérée, la Marée',
        spec: {
          baseHp: 100, baseAtk: 20, baseDef: 5, baseSpd: 100, level: 1, palier: 1,
          attackPattern: 'AOE_3', passiveKey: null, element: 'WATER',
          appearance: 'monsters/bosses/BOSS-015', mitigationScale: 2,
        },
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Nérée, la Marée')
    expect(res.json().spec.baseAtk).toBe(20)
    expect(res.json().spec.appearance).toBe('monsters/bosses/BOSS-015')
  })

  it('PATCH /admin/raid/bosses/LIGHT est refusé (pas de boss hors cycle)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/bosses/LIGHT',
      headers: { cookie: cookies },
      payload: { name: 'x' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET + PATCH /admin/raid/tiers', async () => {
    const list = await app.inject({ method: 'GET', url: '/admin/raid/tiers', headers: { cookie: cookies } })
    expect(list.statusCode).toBe(200)
    expect(list.json().tiers.some((t: any) => t.pct === 50)).toBe(true)

    const patch = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/tiers/50',
      headers: { cookie: cookies },
      payload: { gold: 450, cardRarity: 'RARE' },
    })
    expect(patch.statusCode).toBe(200)
    expect(patch.json()).toMatchObject({ pct: 50, gold: 450, cardRarity: 'RARE', tokens: 10 })
  })

  it('PATCH /admin/raid/tiers/50 purge les paliers dérivés (niveau > 0) sans supprimer leurs Reward, régénérés à la nouvelle valeur au prochain franchissement', async () => {
    const { raidRepository, configService } = (app as any).iocContainer
    // Pct dédié à ce test, pour ne pas interférer avec les pct 25/50/75/100
    // partagés par les suites src/test/e2e/raids/*.ts.
    const pct = 61
    const perLevel = { tokens: 2, gold: 100, dust: 30 }
    await configService.set('raid.levelRewardTokens', perLevel.tokens)
    await configService.set('raid.levelRewardGold', perLevel.gold)
    await configService.set('raid.levelRewardDust', perLevel.dust)

    const baseReward = await prisma.reward.create({
      data: { tokens: 20, gold: 800, dust: 200 },
    })
    await prisma.raidTier.upsert({
      where: { pct_level: { pct, level: 0 } },
      create: { pct, level: 0, rewardId: baseReward.id },
      update: { rewardId: baseReward.id },
    })

    // Les `RaidTier` de niveau > 0 sont partagées par toutes les équipes,
    // toutes suites confondues (ex. `raid-difficulte.test.ts` compte les
    // lignes de niveau 2 pour l'ensemble de la base). Ce `try/finally` évite
    // que le pct dédié à ce test pollue ces comptages une fois le test fini.
    const rewardIds = new Set<string>([baseReward.id])
    try {
      // 1. Paliers dérivés niveau 1 et 2, comme le ferait le jeu en
      // franchissant ces niveaux (`RaidRepository#ensureTiersForLevel`,
      // appelée par `raid.domain.ts#tiersFor`).
      const level1 = await raidRepository.ensureTiersForLevel(1, perLevel)
      const level2 = await raidRepository.ensureTiersForLevel(2, perLevel)
      const tier1 = level1.find((t: any) => t.pct === pct)
      const tier2 = level2.find((t: any) => t.pct === pct)
      expect(tier1.reward.gold).toBe(900) // 800 + 1 × 100
      expect(tier2.reward.gold).toBe(1000) // 800 + 2 × 100
      const rewardId1 = tier1.rewardId
      const rewardId2 = tier2.rewardId
      rewardIds.add(rewardId1).add(rewardId2)

      // 2. PATCH du palier de référence (niveau 0) — c'est lui qui doit
      // déclencher la purge des lignes dérivées.
      const patch = await app.inject({
        method: 'PATCH',
        url: `/admin/raid/tiers/${pct}`,
        headers: { cookie: cookies },
        payload: { gold: 850 },
      })
      expect(patch.statusCode).toBe(200)
      expect(patch.json().gold).toBe(850)

      // Les lignes RaidTier de niveau > 0 pour ce pct ont bien disparu.
      const remainingTiers = await prisma.raidTier.findMany({
        where: { pct, level: { gt: 0 } },
      })
      expect(remainingTiers).toHaveLength(0)

      // 3. Mais les Reward qu'elles pointaient survivent — ils sont pointés
      // par des UserReward déjà distribués, donc de l'historique immuable.
      const survivingReward1 = await prisma.reward.findUnique({ where: { id: rewardId1 } })
      const survivingReward2 = await prisma.reward.findUnique({ where: { id: rewardId2 } })
      expect(survivingReward1).not.toBeNull()
      expect(survivingReward2).not.toBeNull()
      expect(survivingReward1.gold).toBe(900)

      // 4. Le prochain franchissement du niveau 1 régénère une nouvelle
      // ligne, à la NOUVELLE valeur patchée + le bonus de niveau — pas
      // l'ancienne ressuscitée.
      const regenerated = await raidRepository.ensureTiersForLevel(1, perLevel)
      const regeneratedTier = regenerated.find((t: any) => t.pct === pct)
      expect(regeneratedTier.reward.gold).toBe(950) // 850 (patché) + 1 × 100
      expect(regeneratedTier.rewardId).not.toBe(rewardId1)
      rewardIds.add(regeneratedTier.rewardId)
    } finally {
      await prisma.raidTier.deleteMany({ where: { pct } })
      await prisma.reward.deleteMany({ where: { id: { in: [...rewardIds] } } })
    }
  })

  it('PATCH /admin/raid/tiers/33 → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/tiers/33',
      headers: { cookie: cookies },
      payload: { gold: 1 },
    })
    expect(res.statusCode).toBe(404)
  })

  it('refuse une requête non authentifiée', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/raid/bosses' })
    expect(res.statusCode).toBe(401)
  })

  it('refuse un utilisateur authentifié sans rôle SUPER_ADMIN', async () => {
    const playerSuffix = Date.now()
    const playerEmail = `player${playerSuffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `player${playerSuffix}`, email: playerEmail, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: playerEmail },
      data: { emailVerifiedAt: new Date() },
    })
    const playerLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: playerEmail, password: 'Password123!' },
    })
    const playerCookies = playerLogin.headers['set-cookie'] as string
    const res = await app.inject({ method: 'GET', url: '/admin/raid/bosses', headers: { cookie: playerCookies } })
    expect(res.statusCode).toBe(403)
  })
})
