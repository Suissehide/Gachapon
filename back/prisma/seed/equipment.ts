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
// Barème de la stat principale, par rareté.
//
// Elle doit DOMINER les sous-stats : c'est l'identité de la pièce, les
// sous-stats n'en sont que l'assaisonnement. L'ancien barème faisait
// l'inverse — à légendaire, quatre sous-stats d'attaque au maximum totalisaient
// 60 pour une principale à 40, et 36 contre 18 en vitesse. Les valeurs
// ci-dessous placent la principale à environ 2× la somme des quatre
// sous-stats maximales, et ~7× une sous-stat seule.
//
// Bornes de sous-stat de référence (config.service.ts, DEFAULTS) :
//   hpFlat 20-60 · atkFlat/defFlat 5-15 · spdFlat 3-9
//   critRate 2-5 · critDmg 4-10 · armorPen 2-6 · lifesteal 1-4
const MAIN_STAT_SCALE: Record<string, Record<CardRarity, number>> = {
  atkFlat: { COMMON: 18, UNCOMMON: 28, RARE: 45, EPIC: 72, LEGENDARY: 115 },
  defFlat: { COMMON: 18, UNCOMMON: 28, RARE: 45, EPIC: 72, LEGENDARY: 115 },
  spdFlat: { COMMON: 10, UNCOMMON: 16, RARE: 26, EPIC: 40, LEGENDARY: 62 },
  hpFlat: { COMMON: 80, UNCOMMON: 130, RARE: 210, EPIC: 340, LEGENDARY: 540 },
  critRatePct: { COMMON: 6, UNCOMMON: 9, RARE: 14, EPIC: 21, LEGENDARY: 32 },
  critDmgPct: { COMMON: 12, UNCOMMON: 19, RARE: 30, EPIC: 46, LEGENDARY: 70 },
  armorPenPct: { COMMON: 7, UNCOMMON: 11, RARE: 17, EPIC: 26, LEGENDARY: 40 },
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

/**
 * Nom propre de chaque pièce, par set et par emplacement — 28 noms.
 *
 * Les pièces s'appelaient « Arme de Percée (rare) » : la formule décrivait la
 * ligne du tableau au lieu de nommer l'objet, et répétait une rareté que la
 * fiche affiche déjà en pastille. Les cinq raretés d'une même combinaison
 * partagent désormais le même nom — c'est la pastille qui les distingue.
 */
const PIECE_NAME: Record<EquipmentSet, Record<EquipmentSlot, string>> = {
  FUREUR: {
    WEAPON: 'Hache du Courroux',
    ARMOR: 'Cuirasse Ardente',
    RING: 'Anneau du Brasier',
    AMULET: 'Amulette de Rage',
    GLOVES: 'Poings Incandescents',
    BOOTS: 'Grèves du Fracas',
    BELT: 'Ceinturon du Berserk',
  },
  PRECISION: {
    WEAPON: 'Lame du Guetteur',
    ARMOR: 'Plastron du Tireur',
    RING: "Anneau de l'Œil Juste",
    AMULET: 'Amulette du Viseur',
    GLOVES: 'Gants du Duelliste',
    BOOTS: 'Bottes du Traqueur',
    BELT: "Ceinture d'Aplomb",
  },
  PERCEE: {
    WEAPON: 'Estoc Brise-Écaille',
    ARMOR: 'Harnois Perforant',
    RING: 'Anneau de la Faille',
    AMULET: 'Amulette de la Vrille',
    GLOVES: 'Gants du Perce-Armure',
    BOOTS: 'Bottes de la Charge',
    BELT: 'Ceinture du Bélier',
  },
  SANGSUE: {
    WEAPON: 'Croc Assoiffé',
    ARMOR: 'Carapace Vorace',
    RING: 'Anneau de Sangsue',
    AMULET: 'Amulette du Calice',
    GLOVES: 'Serres Avides',
    BOOTS: 'Bottes du Suaire',
    BELT: 'Ceinture du Festin',
  },
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
          name: PIECE_NAME[setKey][slot],
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
