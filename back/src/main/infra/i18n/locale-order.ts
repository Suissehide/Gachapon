import { getCurrentLocale } from './locale-context'

/**
 * Tris alphabétiques sur une colonne localisée.
 *
 * Le champ calculé de `localized.extension.ts` n'existe qu'en sortie : il
 * est assemblé en JS après la requête, Postgres ne le connaît pas et ne peut
 * donc pas trier dessus. Un `ORDER BY` doit viser une VRAIE colonne, d'où
 * ce choix explicite entre `*Fr` et `*En` (spec §4.7 : l'ordre alphabétique
 * suit la langue demandée, il ne reste pas figé sur le français).
 *
 * Fonctions et non constantes : la locale se lit au moment de la requête,
 * pas au chargement du module — une constante évaluée à l'import figerait
 * la locale du premier import pour tout le processus.
 *
 * Le type de retour est une UNION de littéraux, pas `Record<string, string>` :
 * le `orderBy` de Prisma est typé sur les colonnes réelles du modèle et
 * rejette une clé élargie en `string` (même piège que le `needs` de
 * l'extension, voir son commentaire).
 */
export function localizedNameOrder(): { nameFr: 'asc' } | { nameEn: 'asc' } {
  return getCurrentLocale() === 'FR'
    ? ({ nameFr: 'asc' } as const)
    : ({ nameEn: 'asc' } as const)
}

export function localizedLabelOrder(): { labelFr: 'asc' } | { labelEn: 'asc' } {
  return getCurrentLocale() === 'FR'
    ? ({ labelFr: 'asc' } as const)
    : ({ labelEn: 'asc' } as const)
}
