import { describe, expect, it, jest } from '@jest/globals'
import { GachaDomain, pickWeightedRandom, pickVariant } from '../../main/domain/gacha/gacha.domain'
import type { CardWithSet } from '../../main/types/domain/gacha/gacha.types'

function makeCard(name: string, weight: number, rarity = 'COMMON'): CardWithSet {
  return {
    id: name,
    name,
    rarity: rarity as any,
    dropWeight: weight,
    imageUrl: '',
    setId: 'set1',
    createdAt: new Date(),
    set: { id: 'set1', name: 'Test', description: null, coverImage: null, isActive: true, createdAt: new Date(), hue: null },
  }
}

describe('pickWeightedRandom', () => {
  it('retourne toujours une carte de la liste', () => {
    const cards = [makeCard('A', 10), makeCard('B', 5), makeCard('C', 1)]
    for (let i = 0; i < 100; i++) {
      const result = pickWeightedRandom(cards)
      expect(['A', 'B', 'C']).toContain(result.name)
    }
  })

  it('retourne la seule carte si liste de taille 1', () => {
    const cards = [makeCard('Solo', 99)]
    expect(pickWeightedRandom(cards).name).toBe('Solo')
  })

  it('respecte approximativement les poids (test statistique grossier)', () => {
    const cards = [makeCard('Heavy', 90), makeCard('Light', 10)]
    let heavyCount = 0
    for (let i = 0; i < 1000; i++) {
      if (pickWeightedRandom(cards).name === 'Heavy') heavyCount++
    }
    // ~90% avec une tolérance de ±10%
    expect(heavyCount).toBeGreaterThan(750)
    expect(heavyCount).toBeLessThan(950)
  })

  it('throw si liste vide', () => {
    expect(() => pickWeightedRandom([])).toThrow()
  })
})

const RATES = {
  brilliantRateRare: 2, brilliantRateEpic: 3, brilliantRateLegendary: 5,
  holoRateRare: 5, holoRateEpic: 8, holoRateLegendary: 10,
}

describe('pickVariant', () => {
  afterEach(() => jest.restoreAllMocks())

  it('retourne NORMAL pour COMMON (non éligible aux variantes)', () => {
    expect(pickVariant('COMMON', RATES)).toBe('NORMAL')
  })

  it('retourne NORMAL pour UNCOMMON (non éligible aux variantes)', () => {
    expect(pickVariant('UNCOMMON', RATES)).toBe('NORMAL')
  })

  it('retourne BRILLIANT si roll < brilliantRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01) // roll = 1 < 2
    expect(pickVariant('RARE', RATES)).toBe('BRILLIANT')
  })

  it('retourne HOLOGRAPHIC si brilliantRate <= roll < brilliantRate + holoRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.04) // roll = 4, 2<=4<7
    expect(pickVariant('RARE', RATES)).toBe('HOLOGRAPHIC')
  })

  it('retourne NORMAL si roll >= brilliantRate + holoRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.10) // roll = 10 >= 7
    expect(pickVariant('RARE', RATES)).toBe('NORMAL')
  })

  it('utilise les bons taux selon la rareté (LEGENDARY)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.04) // roll=4, brilliantLegendary=5 → BRILLIANT
    expect(pickVariant('LEGENDARY', RATES)).toBe('BRILLIANT')
  })

  it('régression unité: taux 100 => variante garantie (BRILLIANT pour RARE)', () => {
    const ratesMax = {
      brilliantRateRare: 100, brilliantRateEpic: 100, brilliantRateLegendary: 100,
      holoRateRare: 100, holoRateEpic: 100, holoRateLegendary: 100,
    }
    for (let i = 0; i < 20; i++) {
      expect(pickVariant('RARE', ratesMax)).toBe('BRILLIANT')
      expect(pickVariant('EPIC', ratesMax)).toBe('BRILLIANT')
      expect(pickVariant('LEGENDARY', ratesMax)).toBe('BRILLIANT')
    }
  })

  it('régression unité: taux 0 => toujours NORMAL', () => {
    const ratesZero = {
      brilliantRateRare: 0, brilliantRateEpic: 0, brilliantRateLegendary: 0,
      holoRateRare: 0, holoRateEpic: 0, holoRateLegendary: 0,
    }
    for (let i = 0; i < 20; i++) {
      expect(pickVariant('RARE', ratesZero)).toBe('NORMAL')
      expect(pickVariant('EPIC', ratesZero)).toBe('NORMAL')
      expect(pickVariant('LEGENDARY', ratesZero)).toBe('NORMAL')
    }
  })
})

// ---------------------------------------------------------------------------
// Helpers for GachaDomain unit tests
// ---------------------------------------------------------------------------

function makeCardWithSet(id: string, rarity: string): CardWithSet {
  return {
    id,
    name: id,
    rarity: rarity as any,
    dropWeight: 10,
    imageUrl: null as any,
    setId: 'set1',
    createdAt: new Date(),
    set: {
      id: 'set1',
      name: 'Test Set',
      description: null,
      coverImage: null,
      isActive: true,
      createdAt: new Date(),
      hue: null,
    },
  }
}

function buildFakeUser(tokens: number, pity: number, xp: number) {
  return {
    id: 'user-1',
    tokens,
    lastTokenAt: null,
    pityCurrent: pity,
    xp,
    level: 1,
    dust: 0,
    username: 'tester',
    email: 'tester@test.com',
    role: 'USER',
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    banner: null,
    passwordHash: null,
    emailVerifiedAt: null,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    streakDays: 0,
    bestStreak: 0,
    lastLoginAt: null,
    machineId: null,
    featuredCardIds: [],
  }
}

function buildDomain(opts: {
  tokens: number
  pity: number
  xp: number
  cardFactory?: (forceLegendary: boolean) => CardWithSet
  pullTokenCost?: number
  pityThreshold?: number
  xpPerPull?: number
  updateAfterPullInTx?: ReturnType<typeof jest.fn>
  createInTx?: ReturnType<typeof jest.fn>
  upsertInTx?: ReturnType<typeof jest.fn>
}): { domain: GachaDomain; mocks: Record<string, ReturnType<typeof jest.fn>> } {
  const pullTokenCost = opts.pullTokenCost ?? 1
  const pityThreshold = opts.pityThreshold ?? 50
  const xpPerPull = opts.xpPerPull ?? 5

  const tx = {}

  const user = buildFakeUser(opts.tokens, opts.pity, opts.xp)

  const updateAfterPullInTx = opts.updateAfterPullInTx ?? jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const createInTx = opts.createInTx ?? jest.fn().mockImplementation((_tx: any, data: any) =>
    Promise.resolve({
      id: `pull-${Math.random()}`,
      userId: 'user-1',
      cardId: data.cardId,
      variant: data.variant,
      wasDuplicate: data.wasDuplicate,
      dustEarned: data.dustEarned,
      pulledAt: new Date(),
    }),
  )
  const upsertInTx = opts.upsertInTx ?? jest.fn<() => Promise<{ wasDuplicate: boolean }>>().mockResolvedValue({ wasDuplicate: false })

  const defaultCard = makeCardWithSet('common-card', 'COMMON')
  const findActiveForPullInTx = jest.fn().mockImplementation((_tx: any, forceLegendary: boolean) => {
    if (opts.cardFactory) {
      return Promise.resolve([opts.cardFactory(forceLegendary)])
    }
    return Promise.resolve([defaultCard])
  })

  const postgresOrm = {
    executeWithTransactionClient: jest.fn().mockImplementation((fn: any) => fn(tx)),
  }

  const configService = {
    getMany: jest.fn().mockResolvedValue({
      tokenRegenIntervalMinutes: 30,
      tokenMaxStock: 100,
      pityThreshold,
      dustCommon: 1,
      dustUncommon: 2,
      dustRare: 5,
      dustEpic: 10,
      dustLegendary: 50,
      brilliantRateRare: 0,
      brilliantRateEpic: 0,
      brilliantRateLegendary: 0,
      holoRateRare: 0,
      holoRateEpic: 0,
      holoRateLegendary: 0,
      xpPerPull,
      'gacha.pullTokenCost': pullTokenCost,
      'xp.base': 100,
      'xp.slope': 30,
      'xp.levelCap': 100,
    }),
  }

  const userRepository = {
    findByIdOrThrowInTx: jest.fn().mockResolvedValue(user),
    updateAfterPullInTx,
  }

  const cardRepository = { findActiveForPullInTx }

  const userCardRepository = { upsertInTx }

  const gachaPullRepository = { createInTx }

  const skillTreeRepository = {
    getEffectsForUser: jest.fn().mockResolvedValue({
      luckMultiplier: 1.0,
      regenReductionMinutes: 0,
      tokenVaultBonus: 0,
    }),
  }

  const achievementsDomain = {
    track: jest.fn<() => Promise<[]>>().mockResolvedValue([]),
  }

  const domain = new GachaDomain({
    postgresOrm,
    configService,
    userRepository,
    cardRepository,
    userCardRepository,
    gachaPullRepository,
    skillTreeRepository,
    achievementsDomain,
  } as any)

  return {
    domain,
    mocks: {
      updateAfterPullInTx,
      createInTx,
      upsertInTx,
      findActiveForPullInTx,
    },
  }
}

// ---------------------------------------------------------------------------
// GachaDomain.pullBatch tests
// ---------------------------------------------------------------------------

describe('GachaDomain.pullBatch', () => {
  it('performs 10 pulls in a single transaction and accumulates totals', async () => {
    const { domain, mocks } = buildDomain({
      tokens: 10,
      pity: 0,
      xp: 0,
      xpPerPull: 5,
    })

    const result = await domain.pullBatch('user-1', 10)

    expect(result.pulls).toHaveLength(10)
    expect(result.tokensRemaining).toBe(0)   // 10 tokens - 10 * 1 cost = 0
    expect(result.xpGained).toBe(50)          // 10 * 5 xp

    // Final write must happen exactly once with accumulated values
    expect(mocks.updateAfterPullInTx).toHaveBeenCalledTimes(1)
    expect(mocks.updateAfterPullInTx).toHaveBeenCalledWith(
      expect.anything(), // tx
      'user-1',
      expect.objectContaining({
        tokens: 0,
        xpIncrement: 50,
      }),
    )

    // Pull + card-upsert each called once per pull
    expect(mocks.createInTx).toHaveBeenCalledTimes(10)
    expect(mocks.upsertInTx).toHaveBeenCalledTimes(10)
  })

  it('rejects with paymentRequired when tokens < count * pullTokenCost', async () => {
    const { domain } = buildDomain({
      tokens: 5,
      pity: 0,
      xp: 0,
      pullTokenCost: 1,
    })

    await expect(domain.pullBatch('user-1', 10)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 402 },
    })
  })

  it('increments pity per pull and resets on legendary mid-batch', async () => {
    const commonCard = makeCardWithSet('common-card', 'COMMON')
    const legendaryCard = makeCardWithSet('legendary-card', 'LEGENDARY')

    const { domain, mocks } = buildDomain({
      tokens: 5,
      pity: 2,
      xp: 0,
      pityThreshold: 3,
      pullTokenCost: 1,
      cardFactory: (forceLegendary) => (forceLegendary ? legendaryCard : commonCard),
    })

    const result = await domain.pullBatch('user-1', 5)

    // Pull #2 (index 1) must be LEGENDARY (pity reached threshold at end of pull #1)
    const rarities = result.pulls.map((p) => p.card.rarity)
    expect(rarities).toContain('LEGENDARY')
    expect(rarities[1]).toBe('LEGENDARY')

    // After pull #1 pity=3, legendary resets to 0, then climbs 1,2,3 over pulls 3-5
    // So final pityCurrent on last pull item is 3
    expect(result.pulls[4]?.pityCurrent).toBe(3)

    // updateAfterPullInTx called once with final pity = 3
    expect(mocks.updateAfterPullInTx).toHaveBeenCalledTimes(1)
    expect(mocks.updateAfterPullInTx).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ pityCurrent: 3 }),
    )
  })
})
