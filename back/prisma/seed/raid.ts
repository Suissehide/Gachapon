import type { PrismaClient } from '../../src/generated/client'
import {
  TOWER_ELEMENTS,
  type TowerElement,
} from '../../src/main/domain/tower/tower-slots'
import { RARITY_BASE } from './campaign'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

// Profil épique de campagne, même source unique que les tours.
const BASE = RARITY_BASE.EPIC

/**
 * Échelle de puissance du boss (même logique que FLOOR_SCALE en tour, où
 * l'étage 10 vaut 16,9). Mesurée le 2026-09-08 (docs/superpowers/mesures/
 * 2026-09-08-raid/rapport.md) : à 12, l'équipe de référence (3 épiques
 * palier 5, gear epic, un contre-pick) subit ~8,7 attaques du boss en
 * moyenne avant d'être anéantie — dans la cible de 7 à 9 tours sur 10 — donc
 * la valeur provisoire est conservée telle quelle plutôt que déplacée à
 * l'aveugle.
 */
export const RAID_BOSS_SCALE = 12

/**
 * Images de boss déjà présentes dans MinIO (monsters/bosses/BOSS-001..019).
 * La campagne consomme 001..009 : on prend quatre numéros libres pour qu'un
 * boss de raid ne ressemble pas à un boss de chapitre.
 */
export const RAID_BOSS_APPEARANCE: Record<TowerElement, string> = {
  FIRE: 'monsters/bosses/BOSS-010',
  WATER: 'monsters/bosses/BOSS-011',
  NATURE: 'monsters/bosses/BOSS-012',
  EARTH: 'monsters/bosses/BOSS-013',
}

export const RAID_BOSS_NAME: Record<TowerElement, string> = {
  FIRE: 'Ignis, le Brasier',
  WATER: 'Nérée, la Marée',
  NATURE: 'Sylva, la Ronce',
  EARTH: 'Gorm, le Roc',
}

/** Même forme que towerEnemyTeam (prisma/seed/tower.ts), une seule unité. */
export function raidBossSpec(element: TowerElement) {
  return {
    // Ignoré en combat (PV simulés infinis, RAID_BOSS_SIM_HP) — gardé pour
    // rester conforme à enemySpecSchema.
    baseHp: BASE.hp,
    baseAtk: Math.round(BASE.atk * RAID_BOSS_SCALE),
    baseDef: Math.round(BASE.def * RAID_BOSS_SCALE),
    baseSpd: BASE.spd,
    level: 1,
    palier: 1,
    attackPattern: 'AOE_3',
    passiveKey: null,
    element,
    appearance: RAID_BOSS_APPEARANCE[element],
    mitigationScale: RAID_BOSS_SCALE,
  }
}

export const RAID_TIERS = [
  { pct: 25, tokens: 5, gold: 200, dust: 50, xp: 0, cardRarity: null },
  { pct: 50, tokens: 10, gold: 400, dust: 100, xp: 0, cardRarity: null },
  { pct: 75, tokens: 15, gold: 600, dust: 150, xp: 0, cardRarity: null },
  {
    pct: 100,
    tokens: 25,
    gold: 1000,
    dust: 300,
    xp: 0,
    cardRarity: 'EPIC' as const,
  },
] as const

export async function seedRaid(tx: Tx): Promise<void> {
  for (const element of TOWER_ELEMENTS) {
    await tx.raidBoss.upsert({
      where: { element },
      create: {
        element,
        name: RAID_BOSS_NAME[element],
        spec: raidBossSpec(element),
      },
      update: { name: RAID_BOSS_NAME[element], spec: raidBossSpec(element) },
    })
  }

  for (const t of RAID_TIERS) {
    const rewardData = {
      tokens: t.tokens,
      gold: t.gold,
      dust: t.dust,
      xp: t.xp,
      cardRarity: t.cardRarity,
      label: `Raid d'équipe — palier ${t.pct} %`,
    }
    const existing = await tx.raidTier.findUnique({ where: { pct: t.pct } })
    if (existing) {
      await tx.reward.update({
        where: { id: existing.rewardId },
        data: rewardData,
      })
      continue
    }
    const reward = await tx.reward.create({ data: rewardData })
    await tx.raidTier.create({ data: { pct: t.pct, rewardId: reward.id } })
  }

  console.log('  4 boss de raid + 4 paliers créés')
}
