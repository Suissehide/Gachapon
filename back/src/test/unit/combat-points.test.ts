import { describe, expect, it } from '@jest/globals'

import { calculateCombatPoints } from '../../main/domain/combat-points/combat-points.domain'
import {
  effectiveCombatConfig,
  effectiveSweepCost,
} from '../../main/domain/combat-points/combat-points.tx'
import { CombatPointsTx } from '../../main/domain/combat-points/combat-points.tx'
import type { IocContainer } from '../../main/types/application/ioc'

describe('calculateCombatPoints', () => {
  it('returns same value when already at max', () => {
    const state = calculateCombatPoints(new Date(), 60, 360, 60)
    expect(state.combatPoints).toBe(60)
    expect(state.nextCombatPointAt).toBeNull()
  })

  it('returns same value when over max (defensive)', () => {
    const state = calculateCombatPoints(new Date(), 65, 360, 60)
    expect(state.combatPoints).toBe(65)
    expect(state.nextCombatPointAt).toBeNull()
  })

  it('initializes clock when lastCombatPointAt is null', () => {
    const state = calculateCombatPoints(null, 30, 360, 60)
    expect(state.combatPoints).toBe(30)
    expect(state.newLastCombatPointAt).toBeInstanceOf(Date)
    expect(state.nextCombatPointAt).toBeInstanceOf(Date)
    // next = now + 360s
    const diffMs = state.nextCombatPointAt!.getTime() - state.newLastCombatPointAt.getTime()
    expect(diffMs).toBe(360 * 1000)
  })

  it('returns same value when elapsed < one interval', () => {
    const last = new Date(Date.now() - 100 * 1000) // 100 seconds ago
    const state = calculateCombatPoints(last, 30, 360, 60)
    expect(state.combatPoints).toBe(30)
    expect(state.nextCombatPointAt).toBeInstanceOf(Date)
  })

  it('adds N points when elapsed >= N intervals', () => {
    // 3 intervals = 1080 seconds
    const last = new Date(Date.now() - 1080 * 1000 - 100)
    const state = calculateCombatPoints(last, 30, 360, 60)
    expect(state.combatPoints).toBe(33)
  })

  it('caps at maxStock when elapsed exceeds full regen', () => {
    // 1000 intervals worth of time
    const last = new Date(Date.now() - 1000 * 360 * 1000)
    const state = calculateCombatPoints(last, 10, 360, 60)
    expect(state.combatPoints).toBe(60)
    expect(state.nextCombatPointAt).toBeNull()
  })

  it('advances newLastCombatPointAt by N intervals (not just elapsed)', () => {
    const baseMs = Date.now() - 1080 * 1000 - 50
    const last = new Date(baseMs)
    const state = calculateCombatPoints(last, 10, 360, 60)
    expect(state.combatPoints).toBe(13)
    // newLast should be base + 3 × 360s
    expect(state.newLastCombatPointAt.getTime()).toBe(baseMs + 3 * 360 * 1000)
  })
})

describe('effectiveCombatConfig', () => {
  const RAW = { maxStock: 60, regenSeconds: 900, battleCost: 5, sweepCost: 5 }

  it('applique vault et regen reduction avec plancher 60s', () => {
    const out = effectiveCombatConfig(RAW, {
      pcVaultBonus: 15,
      pcRegenReductionSeconds: 900,
      sweepCostReduction: 0,
    })
    expect(out.maxStock).toBe(75)
    expect(out.regenSeconds).toBe(60)
  })

  it('neutre = identité', () => {
    const out = effectiveCombatConfig(RAW, {
      pcVaultBonus: 0,
      pcRegenReductionSeconds: 0,
      sweepCostReduction: 0,
    })
    expect(out).toEqual(RAW)
  })

  // Le coût de balayage affiché doit refléter la remise de l'arbre de
  // compétences : il ne le faisait pas, si bien que le bouton annonçait un
  // prix que le joueur ne payait pas (le débit, lui, appliquait la remise).
  it('applique la remise de balayage au coût affiché', () => {
    const out = effectiveCombatConfig(RAW, {
      pcVaultBonus: 0,
      pcRegenReductionSeconds: 0,
      sweepCostReduction: 2,
    })
    expect(out.sweepCost).toBe(3)
    expect(out.battleCost).toBe(5)
  })

  it('le balayage ne descend jamais sous 1, même avec une grosse remise', () => {
    const out = effectiveCombatConfig(RAW, {
      pcVaultBonus: 0,
      pcRegenReductionSeconds: 0,
      sweepCostReduction: 99,
    })
    expect(out.sweepCost).toBe(1)
  })
})

describe('effectiveSweepCost', () => {
  it('soustrait la remise', () => {
    expect(effectiveSweepCost(5, 2)).toBe(3)
  })

  it('plancher à 1', () => {
    expect(effectiveSweepCost(5, 5)).toBe(1)
    expect(effectiveSweepCost(5, 99)).toBe(1)
  })

  it('sans remise, renvoie le coût brut', () => {
    expect(effectiveSweepCost(5, 0)).toBe(5)
  })
})

describe('CombatPointsTx.creditInTx', () => {
  const DEFAULT_CFG = {
    'combat.pointsMax': 60,
    'combat.regenSeconds': 600,
    'combat.battleCost': 5,
    'combat.sweepCost': 5,
  }

  const makeCpTx = () =>
    new CombatPointsTx({
      postgresOrm: {},
      configService: { getMany: async () => DEFAULT_CFG },
      skillTreeRepository: {},
    } as unknown as IocContainer)

  const makeTx = (user: {
    combatPoints: number
    lastCombatPointAt: Date | null
  }) => {
    const calls: { update: unknown[] } = { update: [] }
    const tx = {
      user: {
        findUnique: async () => user,
        update: async (args: unknown) => {
          calls.update.push(args)
          return {}
        },
      },
    }
    return { tx: tx as never, calls }
  }

  it('crédite au-delà du plafond sans clamp (overcap)', async () => {
    // Utilisateur au max (60) : la regen est nulle, le crédit doit dépasser 60.
    const { tx, calls } = makeTx({
      combatPoints: 60,
      lastCombatPointAt: new Date(),
    })
    const result = await makeCpTx().creditInTx(tx, 'u1', 15)
    expect(result.combatPointsAfter).toBe(75)
    expect(calls.update).toHaveLength(1)
    const args = calls.update[0] as { data: { combatPoints: number } }
    expect(args.data.combatPoints).toBe(75)
  })

  it('règle la regen lazy avant de créditer', async () => {
    // 3 intervalles écoulés (3 × 600s) : 30 PC deviennent 33, puis +15 = 48.
    const last = new Date(Date.now() - 3 * 600 * 1000 - 100)
    const { tx, calls } = makeTx({ combatPoints: 30, lastCombatPointAt: last })
    const result = await makeCpTx().creditInTx(tx, 'u1', 15)
    expect(result.combatPointsAfter).toBe(48)
    const args = calls.update[0] as {
      data: { combatPoints: number; lastCombatPointAt: Date }
    }
    expect(args.data.combatPoints).toBe(48)
    // Clock avancé de 3 intervalles exactement (fenêtre partielle préservée).
    expect(args.data.lastCombatPointAt.getTime()).toBe(
      last.getTime() + 3 * 600 * 1000,
    )
  })

  it('applique les effets PC_VAULT au plafond de regen', async () => {
    // Vault +15 → max effectif 75 : un user à 60 avec un vieux clock regen
    // jusqu'à 75, puis crédit +15 = 90.
    const last = new Date(Date.now() - 100 * 600 * 1000)
    const { tx } = makeTx({ combatPoints: 60, lastCombatPointAt: last })
    const result = await makeCpTx().creditInTx(tx, 'u1', 15, {
      pcVaultBonus: 15,
      pcRegenReductionSeconds: 0,
    })
    expect(result.combatPointsAfter).toBe(90)
  })

  it('amount <= 0 : no-op, aucune écriture', async () => {
    const { tx, calls } = makeTx({
      combatPoints: 42,
      lastCombatPointAt: new Date(),
    })
    const result = await makeCpTx().creditInTx(tx, 'u1', 0)
    expect(result.combatPointsAfter).toBe(42)
    expect(calls.update).toHaveLength(0)
  })
})

describe('CombatPointsTx.refillToMaxInTx', () => {
  const DEFAULT_CFG = {
    'combat.pointsMax': 60,
    'combat.regenSeconds': 600,
    'combat.battleCost': 5,
    'combat.sweepCost': 5,
  }

  const makeCpTx = () =>
    new CombatPointsTx({
      postgresOrm: {},
      configService: { getMany: async () => DEFAULT_CFG },
      skillTreeRepository: {},
    } as unknown as IocContainer)

  const makeTx = (user: {
    combatPoints: number
    lastCombatPointAt: Date | null
  }) => {
    const calls: { update: unknown[] } = { update: [] }
    const tx = {
      user: {
        findUnique: async () => user,
        update: async (args: unknown) => {
          calls.update.push(args)
          return {}
        },
      },
    }
    return { tx: tx as never, calls }
  }

  it('remonte au cap quand sous le cap', async () => {
    const { tx, calls } = makeTx({
      combatPoints: 12,
      lastCombatPointAt: new Date(),
    })
    const result = await makeCpTx().refillToMaxInTx(tx, 'u1')
    expect(result.combatPointsAfter).toBe(60)
    expect(calls.update).toHaveLength(1)
    const args = calls.update[0] as {
      data: { combatPoints: number; lastCombatPointAt: Date }
    }
    expect(args.data.combatPoints).toBe(60)
    expect(args.data.lastCombatPointAt).toBeInstanceOf(Date)
  })

  it('ne réduit jamais un overfill au-dessus du cap', async () => {
    const { tx, calls } = makeTx({
      combatPoints: 75,
      lastCombatPointAt: new Date(),
    })
    const result = await makeCpTx().refillToMaxInTx(tx, 'u1')
    expect(result.combatPointsAfter).toBe(75)
    const args = calls.update[0] as {
      data: { combatPoints: number; lastCombatPointAt: Date }
    }
    expect(args.data.combatPoints).toBe(75)
    expect(args.data.lastCombatPointAt).toBeInstanceOf(Date)
  })

  it('règle la regen lazy avant de comparer au cap', async () => {
    // 3 intervalles écoulés : 12 → 15, toujours sous 60 → remonté à 60.
    const last = new Date(Date.now() - 3 * 600 * 1000 - 100)
    const { tx, calls } = makeTx({ combatPoints: 12, lastCombatPointAt: last })
    const result = await makeCpTx().refillToMaxInTx(tx, 'u1')
    expect(result.combatPointsAfter).toBe(60)
    const args = calls.update[0] as { data: { combatPoints: number } }
    expect(args.data.combatPoints).toBe(60)
  })

  it('utilise le cap boosté par PC_VAULT', async () => {
    const { tx } = makeTx({ combatPoints: 60, lastCombatPointAt: new Date() })
    const result = await makeCpTx().refillToMaxInTx(tx, 'u1', {
      pcVaultBonus: 15,
      pcRegenReductionSeconds: 0,
    })
    // cap effectif = 60 + 15 = 75, user à 60 → remonté à 75.
    expect(result.combatPointsAfter).toBe(75)
  })
})
