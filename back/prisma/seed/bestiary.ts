import type { Element } from '../../src/main/domain/combat/element'

/**
 * Le bestiaire cosmétique — source UNIQUE des sprites de monstres, partagée
 * par la campagne (`seed/campaign.ts`) et les tours (`seed/tower.ts`).
 *
 * Chaque famille = un dossier MinIO sous `cards/monsters/` contenant
 * `PREFIX-001..PREFIX-{count}.png`. La clé du Record EST le nom du dossier :
 * une seule orthographe pour une famille, du seed jusqu'à l'URL de l'image.
 * (Avant l'extraction de ce fichier, la table était clé en français —
 * `champignons`, `feuxfollets` — alors que `FAMILY_ELEMENTS` était clé en
 * slug, et deux commentaires de `campaign.ts` prévenaient du piège.)
 *
 * `count` doit refléter EXACTEMENT le nombre de fichiers présents dans le
 * dossier : un count trop haut fait pointer des étages vers des images qui
 * n'existent pas, et l'écran affiche un placeholder sans rien signaler.
 */
export type MonsterFamily = { count: number; prefix: string }

export const FAMILIES = {
  slimes: { prefix: 'SLIME', count: 9 },
  mushrooms: { prefix: 'MYCO', count: 3 },
  kobolds: { prefix: 'KOBO', count: 6 },
  wisps: { prefix: 'WISP', count: 11 },
  gnolls: { prefix: 'GNOL', count: 12 },
  wolves: { prefix: 'WOLF', count: 13 },
  mimics: { prefix: 'MIMC', count: 3 },
  specters: { prefix: 'SPEC', count: 10 },
  elementals: { prefix: 'ELEM', count: 16 },
  minotaurs: { prefix: 'MINO', count: 13 },
  basilisks: { prefix: 'BSLK', count: 7 },
  hydras: { prefix: 'HYDRA', count: 5 },
  krakens: { prefix: 'KRAK', count: 12 },
  wyverns: { prefix: 'WYVN', count: 18 },
} as const satisfies Record<string, MonsterFamily>

export type FamilySlug = keyof typeof FAMILIES

/**
 * Élément par famille de bestiaire. Une famille = un élément fixe : le joueur
 * apprend « les loups sont NATURE » et c'est vrai partout — en campagne comme
 * dans les tours.
 */
export const FAMILY_ELEMENTS: Record<FamilySlug, Element> = {
  slimes: 'WATER',
  mushrooms: 'NATURE',
  kobolds: 'FIRE',
  wisps: 'LIGHT',
  gnolls: 'DARK',
  wolves: 'NATURE',
  mimics: 'NATURE',
  specters: 'DARK',
  elementals: 'FIRE',
  minotaurs: 'FIRE',
  basilisks: 'EARTH',
  hydras: 'WATER',
  krakens: 'WATER',
  wyverns: 'FIRE',
}

/**
 * Familles regroupées par élément — DÉRIVÉ de `FAMILY_ELEMENTS`, jamais écrit
 * à la main : une famille ajoutée ci-dessus se range toute seule, et les deux
 * tables ne peuvent pas diverger.
 *
 * L'ordre suit celui de `FAMILIES`, donc il est stable : les tours s'en
 * servent pour choisir leurs sprites, et un ordre qui bougerait redistribuerait
 * silencieusement les monstres de tous les étages déjà en base.
 */
export const FAMILIES_BY_ELEMENT: Readonly<Record<Element, FamilySlug[]>> =
  Object.keys(FAMILIES).reduce(
    (acc, slug) => {
      const element = FAMILY_ELEMENTS[slug as FamilySlug]
      acc[element] = [...(acc[element] ?? []), slug as FamilySlug]
      return acc
    },
    {} as Record<Element, FamilySlug[]>,
  )

/**
 * Sous-chemin MinIO d'un sprite (sans `cards/` ni `.png`) — la forme que
 * `resolveEnemyImageUrl` attend dans `appearance`.
 *
 * `index` est un compteur libre : il est ramené modulo `count`, si bien qu'un
 * appelant peut avancer indéfiniment sans jamais sortir des fichiers qui
 * existent réellement.
 */
export function spriteKey(slug: FamilySlug, index: number): string {
  const fam = FAMILIES[slug]
  const num = String((index % fam.count) + 1).padStart(3, '0')
  return `monsters/${slug}/${fam.prefix}-${num}`
}

/**
 * Un curseur de sprites : chaque appel rend le sprite suivant de la famille
 * demandée, en tournant en boucle sur les fichiers du dossier.
 *
 * Chaque appelant crée le sien — la campagne et les tours avancent
 * indépendamment, sinon ajouter une tour décalerait les sprites de toute la
 * campagne.
 */
export function makeSpriteCursor(): (slug: FamilySlug) => string {
  const seen: Partial<Record<FamilySlug, number>> = {}
  return (slug) => {
    const index = seen[slug] ?? 0
    seen[slug] = index + 1
    return spriteKey(slug, index)
  }
}
