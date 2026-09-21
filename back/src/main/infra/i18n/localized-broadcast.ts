import { DEFAULT_LOCALE } from './locale'

/**
 * PONT DE LECTURE — même logique que l'ancien pont d'écriture mono-langue
 * (supprimé en tâche 10 : l'API d'administration est bilingue), en miroir
 * côté lecture.
 *
 * Partout ailleurs dans ce dépôt, lire une colonne `*Fr`/`*En` directement
 * est interdit : `localized.extension.ts` expose un champ calculé (`name`,
 * `description`, `label`) résolu dans `getCurrentLocale()`, précisément pour
 * qu'aucun appelant n'ait à connaître qu'il y a deux colonnes derrière.
 *
 * Cette règle suppose un lecteur unique par locale — une requête HTTP, un
 * job de fond. `wsManager.broadcast` la brise : un seul message part vers
 * TOUTES les connexions ouvertes, donc potentiellement vers des locales
 * différentes à la fois. Un champ mono-locale ne peut pas servir cette
 * frontière — même logique en miroir que l'ancien pont d'écriture : un seul
 * champ mono-locale en ENTRÉE ne pouvait pas remplir deux colonnes sans aide
 * explicite.
 *
 * Envelopper la construction du message dans `runWithLocale(...)` ne suffit
 * PAS : le champ calculé Prisma est MÉMORISÉ par objet et par propriété dès
 * sa première lecture (voir l'ATTENTION dans `localized.extension.ts`), et
 * la route qui diffuse a déjà lu `card.name` ailleurs dans la même requête
 * (construction de la réponse HTTP) avant ou autour de l'appel à
 * `broadcast`. Changer la locale courante après coup ne re-déclenche pas le
 * calcul : la valeur figée reste celle du premier lecteur.
 *
 * D'où ce helper : il lit les deux colonnes `*Fr`/`*En` directement sur la
 * ligne Prisma, en CONTOURNANT le champ calculé plutôt qu'en essayant de le
 * relire sous une autre locale. C'est légitime ICI et SEULEMENT ICI, parce
 * que c'est le seul endroit du code qui s'adresse à plusieurs locales
 * simultanément. Aucun autre appelant ne doit importer ce module pour
 * s'épargner un `runWithLocale` — ce serait recréer, ailleurs, le
 * contournement que le reste du lot s'interdit.
 *
 * Repli identique à `pick()` de `localized.extension.ts` : si la colonne
 * demandée est vide, on sert l'autre langue plutôt qu'une chaîne vide — même
 * politique de repli que pour toute lecture de contenu de jeu (voir
 * global-constraints.md, « Repli du contenu de jeu »).
 */
type BilingualNameRow = { nameFr: string; nameEn: string }

export type BilingualName = { fr: string; en: string }

function withFallback(primary: string, fallback: string): string {
  return primary !== '' ? primary : fallback
}

export function readNameInBothLocales(row: BilingualNameRow): BilingualName {
  return {
    fr: withFallback(row.nameFr, row.nameEn),
    en: withFallback(row.nameEn, row.nameFr),
  }
}

/**
 * Valeur à placer dans le champ mono-locale historique du message
 * (`cardName`, `setName`) pour que le front actuel, qui ne connaît que ce
 * champ, continue de fonctionner sans modification — voir task-12-brief.md,
 * option 1 retenue. `DEFAULT_LOCALE` et non une langue codée en dur : si la
 * locale par défaut du site change, ce champ suit sans qu'on ait à repasser
 * ici.
 */
export function defaultLocaleName(name: BilingualName): string {
  return DEFAULT_LOCALE === 'FR' ? name.fr : name.en
}
