import { Prisma } from '../../../generated/client'
import { getCurrentLocale } from '../i18n/locale-context'

/**
 * Renvoie la valeur de la locale courante, ou celle de l'autre langue si
 * elle est vide. Un contenu créé en production hors des seeds n'a pas
 * toujours ses deux langues : mieux vaut un nom dans la mauvaise langue
 * qu'une carte sans nom.
 *
 * Deux signatures : sur des colonnes `NOT NULL` (comme `Quest.nameFr`/
 * `nameEn`), le résultat ne peut jamais être `null` — seule une chaîne vide
 * est possible si les deux langues sont vides — donc le type de retour doit
 * rester `string`, pas `string | null`. Sans ça, tout appelant (comme
 * `QuestStateItem.name: string` dans `quests.domain.ts`) serait forcé de
 * caster ou de lire les colonnes brutes lui-même, ce qui est exactement ce
 * que ce helper existe pour éviter. La deuxième signature couvre les
 * colonnes nullable (ex. `CardSet.description`, tâche 5).
 */
function pick(fr: string, en: string): string
function pick(fr: string | null, en: string | null): string | null
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
// `tsc --noEmit` seul le voit, `swc`/Jest ne type-check pas). Les dix-huit
// champs calculés des douze modèles restent donc écrits en clair.
//
// ATTENTION, MÉMORISATION : Prisma exécute `compute()` à la PREMIÈRE lecture
// de la propriété et fige la valeur sur l'objet. La locale est donc capturée
// au premier lecteur, pas relue à chaque accès. Conséquence : tout objet
// portant un de ces champs qui SURVIT à sa requête (cache mémoire, singleton
// qui retient des lignes, sérialisation vers Redis, diffusion WebSocket vers
// d'autres joueurs) sert la langue de son premier lecteur à tout le monde.
// Un cache de lignes localisées doit donc porter la locale dans sa clé —
// voir `quests.domain.ts#getActiveQuestPool`, le seul cas de ce dépôt.
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
    cardSet: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
      description: {
        needs: { descriptionFr: true, descriptionEn: true },
        compute(row) {
          return pick(row.descriptionFr, row.descriptionEn)
        },
      },
    },
    card: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
    },
    equipment: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
    },
    shopItem: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
      description: {
        needs: { descriptionFr: true, descriptionEn: true },
        compute(row) {
          return pick(row.descriptionFr, row.descriptionEn)
        },
      },
    },
    achievement: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
      description: {
        needs: { descriptionFr: true, descriptionEn: true },
        compute(row) {
          return pick(row.descriptionFr, row.descriptionEn)
        },
      },
    },
    reward: {
      label: {
        needs: { labelFr: true, labelEn: true },
        compute(row) {
          return pick(row.labelFr, row.labelEn)
        },
      },
    },
    skillBranch: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
      description: {
        needs: { descriptionFr: true, descriptionEn: true },
        compute(row) {
          return pick(row.descriptionFr, row.descriptionEn)
        },
      },
    },
    skillNode: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
      description: {
        needs: { descriptionFr: true, descriptionEn: true },
        compute(row) {
          return pick(row.descriptionFr, row.descriptionEn)
        },
      },
    },
    campaignStage: {
      label: {
        needs: { labelFr: true, labelEn: true },
        compute(row) {
          return pick(row.labelFr, row.labelEn)
        },
      },
    },
    towerFloor: {
      label: {
        needs: { labelFr: true, labelEn: true },
        compute(row) {
          return pick(row.labelFr, row.labelEn)
        },
      },
    },
    raidBoss: {
      name: {
        needs: { nameFr: true, nameEn: true },
        compute(row) {
          return pick(row.nameFr, row.nameEn)
        },
      },
    },
  },
})
