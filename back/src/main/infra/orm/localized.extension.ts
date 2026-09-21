import { Prisma } from '../../../generated/client'
import { getCurrentLocale } from '../i18n/locale-context'

/**
 * Renvoie la valeur de la locale courante, ou celle de l'autre langue si
 * elle est vide. Un contenu créé en production hors des seeds n'a pas
 * toujours ses deux langues : mieux vaut un nom dans la mauvaise langue
 * qu'une carte sans nom.
 */
function pick(fr: string | null, en: string | null): string | null {
  const current = getCurrentLocale() === 'FR' ? fr : en
  if (current !== null && current !== '') {
    return current
  }
  const other = getCurrentLocale() === 'FR' ? en : fr
  return other !== null && other !== '' ? other : current
}

// Clés littérales (pas de fabrique générique) : le `needs` de Prisma est
// typé sur les champs réels du modèle. Une fabrique `(frField, enField) =>
// ({ needs: { [frField]: true, ... } })` widen les paramètres en `string`,
// et Prisma rejette alors le `needs` (`Record<string, true>` n'est pas
// assignable à `DynamicResultExtensionNeeds<…>` — constaté à la compilation,
// `tsc --noEmit` seul le voit, `swc`/Jest ne type-check pas). Les deux
// champs de `Quest` restent donc écrits en clair.
export const localizedExtension = Prisma.defineExtension({
  name: 'localized',
  result: {
    quest: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(quest) {
          return pick(quest.nameFr, quest.nameEn)
        },
      },
      description: {
        needs: { descriptionFr: true, descriptionEn: true },
        compute(quest) {
          return pick(quest.descriptionFr, quest.descriptionEn)
        },
      },
    },
  },
})
