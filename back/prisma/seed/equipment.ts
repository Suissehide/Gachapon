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
  EquipmentSet.ASSAUT,
  EquipmentSet.COLOSSE,
  EquipmentSet.CELERITE,
]
const RARITIES: CardRarity[] = [
  CardRarity.COMMON,
  CardRarity.UNCOMMON,
  CardRarity.RARE,
  CardRarity.EPIC,
  CardRarity.LEGENDARY,
]

/**
 * Pool de stats principales par emplacement — une pièce en tire UNE seule,
 * fixée à sa création. C'est ce qui rend deux pièces du même emplacement, du
 * même set et de la même rareté réellement différentes : avant, un anneau
 * légendaire de Fureur était le seul objet possible dans tout le jeu.
 *
 * La stat historique de chaque emplacement reste en tête de son pool — les
 * pièces déjà possédées par les joueurs continuent de correspondre à une
 * ligne du catalogue, et leur stat principale ne change pas.
 *
 * Le set reste orthogonal (§5 de la spec) : il ne joue que sur les bonus de
 * set (2/4 pièces), jamais sur la stat principale.
 *
 * Les emplacements gardent une identité malgré les variantes :
 *   arme = offensive · armure = défensive · anneau = vitesse ·
 *   amulette = vitalité · gants = dégâts critiques · bottes = taux critique ·
 *   ceinture = pénétration.
 */
const SLOT_MAIN_STATS: Record<EquipmentSlot, (keyof EquipmentBonuses)[]> = {
  WEAPON: ['atkFlat', 'atkPct'],
  ARMOR: ['defFlat', 'hpFlat', 'defPct', 'hpPct'],
  RING: ['spdFlat', 'atkPct'],
  AMULET: ['hpFlat', 'hpPct', 'atkPct'],
  GLOVES: ['critDmgPct', 'atkPct', 'defPct'],
  BOOTS: ['critRatePct', 'hpPct'],
  BELT: ['armorPenPct', 'atkPct', 'defPct'],
}

/**
 * Barème de la stat principale par stat et rareté. Les stats de stuff
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
//
// La vitesse ne figure QUE sous forme plate parmi les stats principales : sous
// ATB elle multiplie le rendement de l'unité au lieu de s'y ajouter, donc un
// pourcentage y serait hors-échelle face aux autres stats. Elle reste
// disponible en sous-stat (spdPct), où sa magnitude est bornée.
//
// Les barèmes en pourcentage (hpPct/atkPct/defPct) sont calibrés sur
// le budget que la spec donne déjà à la stat principale : « bonus de base
// ×2.1 au niveau 12, soit 25.2 % sur la stat principale » (repris tel quel
// dans GEAR_PROFILES de scripts/balance-sim.ts). D'où 12 % à légendaire
// niveau 1, qui redonne 25.2 % au niveau 12. La vitesse est plafonnée plus
// bas : sous ATB elle multiplie le rendement au lieu de s'y ajouter.
// Le plancher des raretés basses est relevé par rapport à la courbe des
// barèmes plats (qui donnerait 1.9 % à commune) pour qu'une principale en
// pourcentage ne vaille jamais moins qu'une sous-stat du même type (3-8 %).
const MAIN_STAT_SCALE: Record<string, Record<CardRarity, number>> = {
  atkFlat: { COMMON: 18, UNCOMMON: 28, RARE: 45, EPIC: 72, LEGENDARY: 115 },
  defFlat: { COMMON: 18, UNCOMMON: 28, RARE: 45, EPIC: 72, LEGENDARY: 115 },
  spdFlat: { COMMON: 10, UNCOMMON: 16, RARE: 26, EPIC: 40, LEGENDARY: 62 },
  hpFlat: { COMMON: 80, UNCOMMON: 130, RARE: 210, EPIC: 340, LEGENDARY: 540 },
  hpPct: { COMMON: 3, UNCOMMON: 4.5, RARE: 6.5, EPIC: 9, LEGENDARY: 12 },
  atkPct: { COMMON: 3, UNCOMMON: 4.5, RARE: 6.5, EPIC: 9, LEGENDARY: 12 },
  defPct: { COMMON: 3, UNCOMMON: 4.5, RARE: 6.5, EPIC: 9, LEGENDARY: 12 },
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
  ASSAUT: 'Assaut',
  COLOSSE: 'Colosse',
  CELERITE: 'Célérité',
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
 * Nom propre de chaque pièce, par set et par emplacement — 49 noms.
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
  ASSAUT: {
    WEAPON: 'Espadon de Siège',
    ARMOR: 'Cotte du Bélier',
    RING: "Anneau de l'Élan",
    AMULET: "Amulette de l'Offensive",
    GLOVES: 'Gantelets de Siège',
    BOOTS: 'Bottes de la Ruée',
    BELT: "Ceinture de l'Assaut",
  },
  COLOSSE: {
    WEAPON: 'Masse du Colosse',
    ARMOR: 'Muraille de Pierre',
    RING: 'Anneau Monolithe',
    AMULET: 'Amulette du Menhir',
    GLOVES: 'Poings de Granit',
    BOOTS: 'Sabots de Basalte',
    BELT: 'Ceinture de Titan',
  },
  CELERITE: {
    WEAPON: 'Dague Fugace',
    ARMOR: 'Casaque Légère',
    RING: 'Anneau du Zéphyr',
    AMULET: 'Amulette du Sillage',
    GLOVES: 'Mitaines Vives',
    BOOTS: 'Bottes de Célérité',
    BELT: 'Ceinture du Vif',
  },
}

export interface EquipmentSeedRow {
  name: string
  slot: EquipmentSlot
  setKey: EquipmentSet
  rarity: CardRarity
  /**
   * Clé de la stat principale, redondante avec l'unique clé de `bonuses`.
   * Elle existe en colonne parce que Postgres ne sait pas indexer une clé de
   * JSON : c'est elle qui porte la contrainte d'unicité, donc ce qui autorise
   * plusieurs variantes d'un même (slot, set, rareté).
   */
  mainStat: keyof EquipmentBonuses
  bonuses: EquipmentBonuses
  dropWeight: number
}

/**
 * Catalogue généré : pour chaque set (7) et chaque emplacement (7), une
 * pièce par stat principale possible (SLOT_MAIN_STATS) et par rareté (5) —
 * soit 7 × 19 × 5 = 665 pièces.
 *
 * Le `dropWeight` de rareté est DIVISÉ par la taille du pool de
 * l'emplacement : les deux tirages (pickEquipmentForRarity côté campagne,
 * findMany + pick côté tour) somment les poids, donc sans cette division un
 * emplacement à 4 variantes sortirait deux fois plus souvent qu'un
 * emplacement à 2. La répartition par emplacement, par set et par rareté
 * reste ainsi exactement celle d'avant les variantes ; seule la stat
 * principale est désormais tirée au sort.
 */
export function buildEquipmentCatalog(): EquipmentSeedRow[] {
  const rows: EquipmentSeedRow[] = []
  for (const setKey of SETS) {
    for (const slot of SLOTS) {
      const pool = SLOT_MAIN_STATS[slot]
      for (const stat of pool) {
        for (const rarity of RARITIES) {
          rows.push({
            name: PIECE_NAME[setKey][slot],
            slot,
            setKey,
            rarity,
            mainStat: stat,
            bonuses: { [stat]: MAIN_STAT_SCALE[stat][rarity] },
            dropWeight: RARITY_DROP_WEIGHT[rarity] / pool.length,
          })
        }
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
        // Clé naturelle : une pièce est identifiée par son emplacement, son
        // set, sa rareté ET sa stat principale — c'est cette dernière qui
        // distingue les variantes d'un même emplacement.
        slot_setKey_rarity_mainStat: {
          slot: row.slot,
          setKey: row.setKey,
          rarity: row.rarity,
          mainStat: row.mainStat,
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
