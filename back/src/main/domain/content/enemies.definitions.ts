/**
 * Textes affichés pour les ennemis de combat — nom de famille (slug MinIO
 * -> libellé) et repli générique quand l'apparence ne permet pas de nommer
 * l'ennemi.
 *
 * Contenu de jeu calculé en code (pas de ligne en base, pas de backfill de
 * traduction) : `enemy-appearance.ts` résout la locale de la requête au
 * moment de la lecture, sur le modèle de `towerName` (`tower-slots.ts`) —
 * pas besoin de repli FR/EN, les deux langues sont toujours renseignées ici
 * et le garde-fou (`content-translations.test.ts`) l'exige.
 */

export interface EnemyFamilyText {
  nameFr: string
  nameEn: string
}

/** Nom d'affichage par famille (slug MinIO -> libellé singulier). */
export const ENEMY_FAMILIES: Record<string, EnemyFamilyText> = {
  slimes: { nameFr: 'Slime', nameEn: 'Slime' },
  mushrooms: { nameFr: 'Champignon', nameEn: 'Mushroom' },
  kobolds: { nameFr: 'Kobold', nameEn: 'Kobold' },
  wisps: { nameFr: 'Feu follet', nameEn: 'Wisp' },
  gnolls: { nameFr: 'Gnoll', nameEn: 'Gnoll' },
  wolves: { nameFr: 'Loup', nameEn: 'Wolf' },
  mimics: { nameFr: 'Mimic', nameEn: 'Mimic' },
  specters: { nameFr: 'Spectre', nameEn: 'Specter' },
  elementals: { nameFr: 'Élémentaire', nameEn: 'Elemental' },
  minotaurs: { nameFr: 'Minotaure', nameEn: 'Minotaur' },
  basilisks: { nameFr: 'Basilic', nameEn: 'Basilisk' },
  hydras: { nameFr: 'Hydre', nameEn: 'Hydra' },
  krakens: { nameFr: 'Kraken', nameEn: 'Kraken' },
  wyverns: { nameFr: 'Wyverne', nameEn: 'Wyvern' },
  bosses: { nameFr: 'Boss', nameEn: 'Boss' },
}

/**
 * Repli générique quand `appearance` est absente ou porte un slug inconnu —
 * `enemyNameFromAppearance` renvoie alors `null` et l'appelant affiche
 * `"${GENERIC_ENEMY_NAME} ${n}"` (voir `genericEnemyName` dans
 * `enemy-appearance.ts`).
 */
export const GENERIC_ENEMY_NAME_FR = 'Ennemi'
export const GENERIC_ENEMY_NAME_EN = 'Enemy'
