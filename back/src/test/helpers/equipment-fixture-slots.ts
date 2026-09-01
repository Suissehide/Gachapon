import type { EquipmentSlot } from '../../generated/client'
import type { SetKey } from '../../main/domain/equipment/set-bonuses'

/**
 * Réservations de (slot, setKey) pour les fixtures e2e qui créent des
 * `Equipment`.
 *
 * Pourquoi ce fichier existe : `Equipment` porte `@@unique([slot, setKey,
 * rarity])`, une contrainte GLOBALE à toute la table — pas isolée par
 * fichier de test. `src/test/globalSetup.ts` ne TRUNCATE la base qu'UNE
 * SEULE FOIS par exécution complète de la suite e2e (pas par fichier), donc
 * toutes les fixtures `Equipment` de tous les fichiers e2e partagent le même
 * catalogue en base pendant un run. Deux fichiers qui créeraient chacun une
 * pièce (WEAPON, FUREUR, COMMON) se marcheraient dessus avec une violation
 * de contrainte unique — un échec qui ressemble à l'instabilité aléatoire
 * connue de cette suite, pas à une régression évidente à diagnostiquer.
 *
 * Le slot n'entre dans aucun calcul de stats actuel (vérifié :
 * `equipment.domain.ts` ne s'en sert que pour l'exclusivité d'équipement par
 * slot sur une carte ; le pool de drop de campagne, `campaign.domain.ts`,
 * filtre uniquement par rareté). C'est donc un espace de noms libre, pas une
 * donnée de test — on peut se permettre de le dédier par fichier.
 *
 * Convention : chaque fichier qui appelle `prisma.equipment.create(Many)`
 * importe SA réservation ci-dessous plutôt que d'écrire le littéral
 * `slot: 'WEAPON', setKey: 'FUREUR'` à la main, et fait varier librement la
 * rareté à l'intérieur. Deux fichiers peuvent partager un même slot s'ils
 * utilisent des setKey différents (voir CAMPAIGN / LEVELUP_REFILL) : c'est
 * le couple (slot, setKey), pas le seul slot, qui doit rester unique.
 *
 * Ajout d'un nouveau fichier de fixtures `Equipment` : ajoutez une constante
 * ici avec un couple (slot, setKey) encore inutilisé et importez-la. La
 * vérification runtime en bas de ce fichier fait échouer IMMÉDIATEMENT
 * l'import (avant même le premier test) si vous en réutilisez un par erreur.
 */

function reservation(slot: EquipmentSlot, setKey: SetKey) {
  return { slot, setKey } as const
}

// equipment.test.ts — seul fichier où le slot est sémantiquement nécessaire :
// il teste l'exclusivité d'équipement par slot (2 pièces WEAPON, une ARMOR).
export const EQUIPMENT_TEST_WEAPON = reservation('WEAPON', 'FUREUR')
export const EQUIPMENT_TEST_ARMOR = reservation('ARMOR', 'FUREUR')

// equipment-progression.test.ts — 1 pièce, jamais équipée.
export const EQUIPMENT_PROGRESSION = reservation('ACCESSORY', 'FUREUR')

// equipment-progression-rarity.test.ts — pièces par rareté, jamais équipées.
export const EQUIPMENT_PROGRESSION_RARITY = reservation('SAP', 'FUREUR')

// equipment-salvage.test.ts — pièces à détruire, une seule équipée seule sur
// sa carte (pas de palier de set possible).
export const EQUIPMENT_SALVAGE = reservation('EMBER', 'FUREUR')

// equipment-initial-substats.test.ts — pièces jamais équipées.
export const EQUIPMENT_INITIAL_SUBSTATS = reservation('PRISM', 'FUREUR')

// campaign.test.ts et levelup-refill.test.ts — pool de drop firstClear
// (jamais équipé sur une carte), même besoin de 5 raretés dans les deux
// fichiers. Partagent le slot MONOLITH, distingués par setKey.
export const CAMPAIGN = reservation('MONOLITH', 'FUREUR')
export const LEVELUP_REFILL = reservation('MONOLITH', 'PRECISION')

const ALL_RESERVATIONS = [
  EQUIPMENT_TEST_WEAPON,
  EQUIPMENT_TEST_ARMOR,
  EQUIPMENT_PROGRESSION,
  EQUIPMENT_PROGRESSION_RARITY,
  EQUIPMENT_SALVAGE,
  EQUIPMENT_INITIAL_SUBSTATS,
  CAMPAIGN,
  LEVELUP_REFILL,
]

const seen = new Set<string>()
for (const r of ALL_RESERVATIONS) {
  const key = `${r.slot}:${r.setKey}`
  if (seen.has(key)) {
    throw new Error(
      `Réservation Equipment en double sur (slot, setKey) = ${key} — ` +
        'deux fixtures e2e vont se marcher dessus sous ' +
        '@@unique([slot, setKey, rarity]) car la base de test n\'est ' +
        'purgée qu\'une fois par exécution complète. Corrigez ' +
        'back/src/test/helpers/equipment-fixture-slots.ts.',
    )
  }
  seen.add(key)
}
