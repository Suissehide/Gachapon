/**
 * PONT TEMPORAIRE — à supprimer en tâche 10.
 *
 * Les corps de requête d'administration portent encore UN seul champ
 * (`name`, `description`, `label`) : rendre l'API admin bilingue est le
 * périmètre explicite de la tâche 10 (sept routeurs, leurs schémas Zod, les
 * `Create*Input`/`Update*Input`) et de la tâche 11 (les formulaires du
 * front). Les colonnes, elles, sont bilingues dès maintenant.
 *
 * Ces fonctions comblent l'écart au SEUL endroit qui doit le connaître — la
 * frontière du repository — en recopiant la valeur reçue dans les deux
 * colonnes. C'est exactement la politique du backfill de la migration et des
 * seeds : le français dans les deux langues, aucune traduction inventée.
 *
 * Pourquoi ici et pas un cast sur le `data` de Prisma : un cast ferait
 * compiler l'écriture et la ferait échouer à l'EXÉCUTION, sur une colonne
 * `name` qui n'existe plus. C'était précisément le cas d'`achievement` et de
 * `shopItem`, dont le `data as any` — posé pour leur champ JSON — masquait
 * complètement le problème au compilateur. Ces casts ont depuis disparu :
 * les champs JSON sont typés `Prisma.InputJsonValue`/`InputJsonObject`, et
 * `src/main` ne contient plus aucun `as any`.
 *
 * LIMITE ASSUMÉE, et c'est pourquoi ce pont doit mourir en tâche 10 : une
 * mise à jour admin réécrit les DEUX colonnes. Tant qu'aucune traduction
 * anglaise réelle n'existe — la tâche 8 ne fait que recopier le français, et
 * la tâche 10 arrive avant les vraies traductions — cette réécriture ne perd
 * rien. Après, elle écraserait l'anglais.
 *
 * Surcharges : appelée avec un `string`, le résultat porte les deux colonnes
 * de façon certaine (création) ; appelée avec un `string | undefined`, elles
 * deviennent facultatives et un `undefined` ne produit AUCUNE clé, pour ne
 * pas écraser la colonne lors d'une mise à jour partielle.
 */
export function nameToBothLocales(name: string): {
  nameFr: string
  nameEn: string
}
export function nameToBothLocales(name: string | undefined): {
  nameFr?: string
  nameEn?: string
}
export function nameToBothLocales(name: string | undefined): {
  nameFr?: string
  nameEn?: string
} {
  return name === undefined ? {} : { nameFr: name, nameEn: name }
}

export function descriptionToBothLocales(description: string): {
  descriptionFr: string
  descriptionEn: string
}
export function descriptionToBothLocales(description: string | undefined): {
  descriptionFr?: string
  descriptionEn?: string
}
export function descriptionToBothLocales(description: string | undefined): {
  descriptionFr?: string
  descriptionEn?: string
} {
  return description === undefined
    ? {}
    : { descriptionFr: description, descriptionEn: description }
}

export function labelToBothLocales(label: string): {
  labelFr: string
  labelEn: string
}
export function labelToBothLocales(label: string | null | undefined): {
  labelFr?: string | null
  labelEn?: string | null
}
export function labelToBothLocales(label: string | null | undefined): {
  labelFr?: string | null
  labelEn?: string | null
} {
  return label === undefined ? {} : { labelFr: label, labelEn: label }
}
