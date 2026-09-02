import {
  CardRarity,
  EquipmentSet,
  EquipmentSlot,
  type PrismaClient,
} from '../../src/generated/client'
import type { EquipmentBonuses } from '../../src/main/domain/combat/combat-stats.domain'

// Dérivés des enums Prisma plutôt que redupliqués en unions littérales — le
// même motif de duplication a déjà été corrigé côté domain/schema (commit
// « derive slot types from the Prisma enum instead of duplicating »).
const SLOTS: EquipmentSlot[] = [
  EquipmentSlot.WEAPON,
  EquipmentSlot.ARMOR,
  EquipmentSlot.RING,
  EquipmentSlot.AMULET,
  EquipmentSlot.GLOVES,
  EquipmentSlot.BOOTS,
  EquipmentSlot.BELT,
]
const SETS: EquipmentSet[] = [
  EquipmentSet.FUREUR,
  EquipmentSet.PRECISION,
  EquipmentSet.PERCEE,
  EquipmentSet.SANGSUE,
]
const RARITIES: CardRarity[] = [
  CardRarity.COMMON,
  CardRarity.UNCOMMON,
  CardRarity.RARE,
  CardRarity.EPIC,
  CardRarity.LEGENDARY,
]

/**
 * Le slot dicte la stat principale — c'est ce qui rend les slots distincts
 * les uns des autres. Le set est orthogonal (§5 de la spec) : il ne joue que
 * sur les bonus de set (2/4 pièces), pas sur la stat de base de la pièce.
 */
const SLOT_MAIN_STAT: Record<EquipmentSlot, keyof EquipmentBonuses> = {
  WEAPON: 'atkFlat',
  ARMOR: 'defFlat',
  RING: 'spdFlat',
  AMULET: 'hpFlat',
  GLOVES: 'critDmgPct',
  BOOTS: 'critRatePct',
  BELT: 'armorPenPct',
}

/**
 * Barème de la stat principale par slot et rareté. Les stats de stuff
 * (critDmg, critRate, armorPen) ont leur propre échelle : ce sont des points
 * de pourcentage, pas des valeurs brutes comparables aux PV ou à l'ATQ.
 *
 * Point de calibrage ouvert : ces valeurs sont un point de départ plausible,
 * à simuler avant de figer (§12 de la spec).
 */
const MAIN_STAT_SCALE: Record<string, Record<CardRarity, number>> = {
  atkFlat: { COMMON: 5, UNCOMMON: 8, RARE: 15, EPIC: 25, LEGENDARY: 40 },
  defFlat: { COMMON: 8, UNCOMMON: 13, RARE: 25, EPIC: 43, LEGENDARY: 70 },
  spdFlat: { COMMON: 3, UNCOMMON: 5, RARE: 8, EPIC: 12, LEGENDARY: 18 },
  hpFlat: { COMMON: 25, UNCOMMON: 40, RARE: 70, EPIC: 120, LEGENDARY: 200 },
  critRatePct: { COMMON: 3, UNCOMMON: 5, RARE: 8, EPIC: 12, LEGENDARY: 18 },
  critDmgPct: { COMMON: 6, UNCOMMON: 10, RARE: 16, EPIC: 25, LEGENDARY: 40 },
  armorPenPct: { COMMON: 3, UNCOMMON: 5, RARE: 9, EPIC: 14, LEGENDARY: 22 },
}

const RARITY_DROP_WEIGHT: Record<CardRarity, number> = {
  COMMON: 50,
  UNCOMMON: 25,
  RARE: 10,
  EPIC: 4,
  LEGENDARY: 1,
}

const SET_LABEL: Record<EquipmentSet, string> = {
  FUREUR: 'Fureur',
  PRECISION: 'Précision',
  PERCEE: 'Percée',
  SANGSUE: 'Sangsue',
}

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  WEAPON: 'Arme',
  ARMOR: 'Armure',
  RING: 'Anneau',
  AMULET: 'Amulette',
  GLOVES: 'Gants',
  BOOTS: 'Bottes',
  BELT: 'Ceinture',
}

const RARITY_LABEL: Record<CardRarity, string> = {
  COMMON: 'commune',
  UNCOMMON: 'peu commune',
  RARE: 'rare',
  EPIC: 'épique',
  LEGENDARY: 'légendaire',
}

export interface EquipmentSeedRow {
  name: string
  slot: EquipmentSlot
  setKey: EquipmentSet
  rarity: CardRarity
  bonuses: EquipmentBonuses
  dropWeight: number
}

/**
 * Catalogue généré : 4 sets × 7 slots × 5 raretés = 140 pièces. Remplace les
 * 33 lignes écrites à la main — la variété plat/pourcentage des anciens
 * bonus de base disparaît, absorbée par le système de substats (§5 de la
 * spec).
 */
export function buildEquipmentCatalog(): EquipmentSeedRow[] {
  const rows: EquipmentSeedRow[] = []
  for (const setKey of SETS) {
    for (const slot of SLOTS) {
      const stat = SLOT_MAIN_STAT[slot]
      for (const rarity of RARITIES) {
        rows.push({
          name: `${SLOT_LABEL[slot]} de ${SET_LABEL[setKey]} (${RARITY_LABEL[rarity]})`,
          slot,
          setKey,
          rarity,
          bonuses: { [stat]: MAIN_STAT_SCALE[stat][rarity] },
          dropWeight: RARITY_DROP_WEIGHT[rarity],
        })
      }
    }
  }
  return rows
}

// Type juste : le vrai appelant (prisma/seed.ts) passe le client de
// transaction (tx), structurellement plus étroit que PrismaClient (pas de
// $transaction/$connect). Même expression que l'ancien seed.
export async function seedEquipment(
  prisma: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
): Promise<void> {
  const catalogue = buildEquipmentCatalog()
  for (const row of catalogue) {
    await prisma.equipment.upsert({
      where: {
        // Clé naturelle : une pièce est identifiée par son triplet.
        slot_setKey_rarity: {
          slot: row.slot,
          setKey: row.setKey,
          rarity: row.rarity,
        },
      },
      create: row,
      update: {
        name: row.name,
        bonuses: row.bonuses,
        dropWeight: row.dropWeight,
      },
    })
  }
  console.log(`  Equipment pool : ${catalogue.length} pièces créées`)
}
