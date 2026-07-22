import {
  bossLoot,
  lootTableNormal,
} from '../../../prisma/seed/campaign'
import { SHOP_ITEMS } from '../../../prisma/seed/shop'
import { DEFAULTS } from '../../main/infra/config/config.service'
import { calculateLevel } from '../../main/domain/shared/xp'

/**
 * Simulation en espérance (aucun RNG) de 90 jours d'un joueur actif
 * (~30-45 min/jour). Garde-fou du retuning « partie complète en 3 mois »
 * (spec 2026-07-21). Les valeurs d'économie viennent des VRAIES sources
 * (DEFAULTS, SHOP_ITEMS, loot campagne) — seuls les knobs MODEL: sont
 * propres à la simulation.
 */

// ── Pool gacha (état du catalogue importé, 2026-07-21) ────────────────────────
// Barème dropWeight par rareté (import-cards) × nombre de cartes en base.
const POOL = [
  { rarity: 'COMMON', cards: 157, weight: 85, dust: DEFAULTS.dustCommon },
  { rarity: 'UNCOMMON', cards: 67, weight: 38, dust: DEFAULTS.dustUncommon },
  { rarity: 'RARE', cards: 57, weight: 16, dust: DEFAULTS.dustRare },
  { rarity: 'EPIC', cards: 31, weight: 8, dust: DEFAULTS.dustEpic },
  { rarity: 'LEGENDARY', cards: 17, weight: 2, dust: DEFAULTS.dustLegendary },
] as const
const TOTAL_CARDS = POOL.reduce((s, p) => s + p.cards, 0)
const LEGENDARY_CARDS = POOL[4].cards
const TOTAL_WEIGHT = POOL.reduce((s, p) => s + p.cards * p.weight, 0)
const pRarity = (p: (typeof POOL)[number]) => (p.cards * p.weight) / TOTAL_WEIGHT

// ── Constantes économie (sources réelles) ─────────────────────────────────────
const REGEN_TOKENS_PER_DAY = (24 * 60) / DEFAULTS.tokenRegenIntervalMinutes
const bestTokenPack = SHOP_ITEMS.filter((i) => i.type === 'TOKEN_PACK')
  .map((i) => ({ tokens: (i.value as { tokens: number }).tokens, cost: i.cost }))
  .sort((a, b) => a.cost / a.tokens - b.cost / b.tokens)[0]
const LEGENDARY_PRICE = DEFAULTS.dailyShopPriceLegendary
const XP_BASE = DEFAULTS['xp.base']
const XP_SLOPE = DEFAULTS['xp.slope']

// ── Knobs MODEL: (ajustables dans les bornes commentées, PAS au-delà) ─────────
const SKILL_MATURITY_DAY = 15 // MODEL: jour où le build skills est mature [10..25]
const TEAM_SIZE = 4
const AVG_RARITY_MULT = 1.7 // MODEL: coût leveling, équipe typique RARE [1.3..2.3]
const QUEST_TOKENS_PER_DAY = 15 / 7 // 3 quêtes hebdo × 5 jetons
const QUEST_XP_PER_DAY = 450 / 7 // 3 × 150 XP
const QUEST_DUST_PER_DAY = 240 / 7 // 3 × 80 poussière
const STREAK_XP_PER_DAY = 875 / 30 // milestones cumulés sur 30 j
const GIFTED_LEGENDARY_DAYS = [60, 75, 85] // MODEL: succès offrant une LEGENDARY

// Or requis pour monter une carte du niveau 1 à L : Σ 5·l^1.6·mult
function goldToLevel(target: number): number {
  let sum = 0
  for (let l = 1; l < target; l++) {
    sum += DEFAULTS['card.goldCostBase'] * l ** DEFAULTS['card.goldCostExp'] * AVG_RARITY_MULT
  }
  return Math.round(sum)
}

// MODEL: post-ATB, les ennemis scalent comme les joueurs (rarity+level+palier,
// niveau ennemi = numéro de stage global — cf. enemyPower, campaign.ts). La
// porte de progression est donc la parité de niveau, pas la courbe de butin
// (difficultyMult, désormais loot-only). LEVEL_PARITY ∈ [0.8, 1.2].
const LEVEL_PARITY = 1.0
function levelRequired(globalStage: number): number {
  return Math.max(1, Math.ceil(globalStage * LEVEL_PARITY))
}

function stageLoot(globalStage: number) {
  const chapter = Math.ceil(globalStage / 10)
  const index = globalStage - (chapter - 1) * 10
  return index === 10 ? bossLoot(chapter) : lootTableNormal(chapter, index)
}

type Snapshot = {
  day: number
  pullsToday: number
  boughtTokensToday: number
  stage: number
  level: number
  legendaries: number
}

function simulate(days: number): Snapshot[] {
  const out: Snapshot[] = []
  let gold = 0
  let dust = 0
  let xp = 0
  let stageCleared = 0 // dernier stage global validé (0..50)
  let teamLevel = 1 // niveau moyen des 4 cartes de l'équipe
  let totalPulls = 0
  let boughtLegendaries = 0

  for (let day = 1; day <= days; day++) {
    const mature = day >= SKILL_MATURITY_DAY
    // Énergie : régén continue, réduite par Récupération r3 une fois mature
    const regenSeconds = Math.max(
      60,
      DEFAULTS['combat.regenSeconds'] - (mature ? 180 : 0),
    )
    const sweepCost = DEFAULTS['combat.sweepCost'] - (mature ? 1 : 0) // Logistique r1
    const battles = Math.floor(86400 / regenSeconds / sweepCost)
    const goldBonus = mature ? 0.3 : 0 // Butin doré r3
    const xpBonus = mature ? 0.3 : 0 // Vétéran r3

    // First-clears du jour : on avance tant que l'équipe est au niveau requis
    let battlesLeft = battles
    let dayXp = 0
    while (
      battlesLeft > 0 &&
      stageCleared < 50 &&
      teamLevel >= levelRequired(stageCleared + 1)
    ) {
      const loot = stageLoot(stageCleared + 1)
      gold += Math.round(loot.firstClear.gold * (1 + goldBonus))
      dust += loot.firstClear.dust
      dayXp += Math.round(loot.firstClear.xp * (1 + xpBonus))
      stageCleared += 1
      battlesLeft -= 1
    }
    // Farm du reste au meilleur stage validé
    if (stageCleared > 0 && battlesLeft > 0) {
      const farm = stageLoot(stageCleared).farm
      gold += battlesLeft * Math.round(farm.gold * (1 + goldBonus))
      dust += battlesLeft * Math.round(farm.dust) // dust jamais bonusée (design)
      dayXp += battlesLeft * Math.round(farm.xp * (1 + xpBonus))
    }

    // Or : priorité au leveling requis pour le prochain stage, surplus → packs
    const nextRequired = stageCleared < 50 ? levelRequired(stageCleared + 1) : teamLevel
    while (teamLevel < nextRequired) {
      const cost = TEAM_SIZE * (goldToLevel(teamLevel + 1) - goldToLevel(teamLevel))
      if (gold < cost) {
        break
      }
      gold -= cost
      teamLevel += 1
    }
    let boughtTokensToday = 0
    while (gold >= bestTokenPack.cost / (bestTokenPack.tokens / 10)) {
      // achat par tranches de 10 jetons au ratio du meilleur pack
      gold -= (bestTokenPack.cost / bestTokenPack.tokens) * 10
      boughtTokensToday += 10
    }

    // Tirages : régén REGEN_TOKENS_PER_DAY/j + quêtes + achats du jour
    const pullsToday = REGEN_TOKENS_PER_DAY + QUEST_TOKENS_PER_DAY + boughtTokensToday
    totalPulls += pullsToday

    // Poussière de recyclage : part de doublons ≈ complétion collection
    const completion = Math.min(
      1,
      POOL.reduce((s, p) => {
        const pCard = pRarity(p) / p.cards
        return s + p.cards * (1 - (1 - pCard) ** totalPulls)
      }, 0) / TOTAL_CARDS,
    )
    const dustPerPull = POOL.reduce((s, p) => s + pRarity(p) * p.dust, 0)
    dust += pullsToday * dustPerPull * completion + QUEST_DUST_PER_DAY

    // Boutique quotidienne : acheter les LEGENDARY manquantes en priorité
    // Pity : une LEGENDARY forcée tous les pityThreshold tirages
    // (card.repository.ts, forceLegendary) — en plus du taux naturel.
    // Approximation additive : le vrai compteur pity se reset à chaque LEGENDARY
    // (surestime ~20 %), et pityReduction (skills) est ignoré (sous-estime) —
    // directions opposées, acceptable dans la bande [J75, J95].
    const legendaryDraws =
      totalPulls * pRarity(POOL[4]) +
      Math.floor(totalPulls / DEFAULTS.pityThreshold)
    const pulledLegendaries = LEGENDARY_CARDS * (1 - (1 - 1 / LEGENDARY_CARDS) ** legendaryDraws)
    const gifted = GIFTED_LEGENDARY_DAYS.filter((d) => d <= day).length
    if (
      pulledLegendaries + boughtLegendaries + gifted < LEGENDARY_CARDS &&
      dust >= LEGENDARY_PRICE
    ) {
      dust -= LEGENDARY_PRICE
      boughtLegendaries += 1
    }

    // XP du jour
    xp += dayXp + pullsToday * DEFAULTS.xpPerPull + QUEST_XP_PER_DAY + STREAK_XP_PER_DAY

    out.push({
      day,
      pullsToday,
      boughtTokensToday,
      stage: stageCleared,
      level: calculateLevel(xp, XP_BASE, XP_SLOPE, DEFAULTS['xp.levelCap']),
      legendaries: Math.floor(pulledLegendaries) + boughtLegendaries + gifted,
    })
  }
  return out
}

describe('economy-progression — partie complète en ~3 mois', () => {
  const traj = simulate(90)
  const steady = traj.filter((s) => s.day >= 20 && s.day <= 80)
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

  it('loggue la trajectoire pour calibration', () => {
    for (const d of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
      const s = traj[d - 1]
      console.info(
        `J${s.day}: ${s.pullsToday.toFixed(1)} tirages (${s.boughtTokensToday} achetés), stage ${s.stage}, niveau ${s.level}, ${s.legendaries} LEG`,
      )
    }
    expect(traj).toHaveLength(90)
  })

  it('tirages/jour en régime établi ∈ [28, 42]', () => {
    const avgPulls = avg(steady.map((s) => s.pullsToday))
    expect(avgPulls).toBeGreaterThanOrEqual(28)
    expect(avgPulls).toBeLessThanOrEqual(42)
  })

  it('jetons achetés/jour en régime établi ≤ 8', () => {
    expect(avg(steady.map((s) => s.boughtTokensToday))).toBeLessThanOrEqual(8)
  })

  it('campagne (50 stages) terminée entre J40 et J65', () => {
    const doneDay = traj.find((s) => s.stage >= 50)?.day
    expect(doneDay).toBeGreaterThanOrEqual(40)
    expect(doneDay).toBeLessThanOrEqual(65)
  })

  it('17 LEGENDARY atteints entre J75 et J95', () => {
    const doneDay = traj.find((s) => s.legendaries >= LEGENDARY_CARDS)?.day
    // undefined accepté si atteint entre J91 et J95 : on simule 95 jours pour vérifier
    if (doneDay == null) {
      const ext = simulate(95)
      const extDay = ext.find((s) => s.legendaries >= LEGENDARY_CARDS)?.day
      expect(extDay).toBeDefined()
      expect(extDay).toBeLessThanOrEqual(95)
    } else {
      expect(doneDay).toBeGreaterThanOrEqual(75)
    }
  })

  it('niveau 100 atteint entre J80 et J95', () => {
    const doneDay = traj.find((s) => s.level >= 100)?.day
    if (doneDay == null) {
      const ext = simulate(95)
      const extDay = ext.find((s) => s.level >= 100)?.day
      expect(extDay).toBeDefined()
      expect(extDay).toBeLessThanOrEqual(95)
    } else {
      expect(doneDay).toBeGreaterThanOrEqual(80)
    }
  })

  it('le boost épique du seed est bien ×2 / 800 / 10 tirages', () => {
    const boost = SHOP_ITEMS.find((i) => i.name === 'Boost Épique')
    expect(boost?.cost).toBe(800)
    expect(boost?.value).toEqual({ multiplier: 2, rarity: 'EPIC', pulls: 10 })
  })
})
