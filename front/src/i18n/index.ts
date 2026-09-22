import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEn from './locales/en/common.json'
import errorsEn from './locales/en/errors.json'
import notificationsEn from './locales/en/notifications.json'
import commonFr from './locales/fr/common.json'
import errorsFr from './locales/fr/errors.json'
import notificationsFr from './locales/fr/notifications.json'

/** Langues supportées, dans l'ordre d'affichage voulu pour un futur sélecteur. */
export const SUPPORTED_LOCALES = ['fr', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Langue servie par défaut. Choix produit assumé (spec §2, lot 2 §5.1) :
 * ce n'est pas une erreur, ne pas le "corriger".
 */
export const DEFAULT_LOCALE: Locale = 'en'

/** Clé localStorage pour la préférence de langue mémorisée (spec §5.4). */
export const LOCALE_STORAGE_KEY = 'gachapon:locale'

export function isSupportedLocale(value: string | undefined): value is Locale {
  return (
    value !== undefined &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

/**
 * Premier segment d'un chemin (`/fr/shop` → `fr`, `/` → `''`). Point unique
 * de cette extraction : `localeFromPath` ci-dessous, `main.tsx` (pour décider
 * s'il faut rediriger) et `useLocale.ts` en dépendent tous — ne pas
 * réimplémenter `pathname.split('/')[1]` ailleurs.
 */
export function firstPathSegment(pathname: string): string {
  return pathname.split('/')[1] ?? ''
}

/**
 * La langue vit dans le premier segment de l'URL (voir main.tsx, qui en fait
 * le `basepath` du routeur) : i18next doit démarrer synchronisé dessus pour
 * que le tout premier rendu soit déjà dans la bonne langue.
 */
export function localeFromPath(pathname: string): Locale {
  const first = firstPathSegment(pathname)
  return isSupportedLocale(first) ? first : DEFAULT_LOCALE
}

/**
 * Locale actuelle, à lire à CHAQUE appel (jamais mémorisée dans une variable
 * de module ou fermée dans un formateur construit une seule fois au
 * chargement) : un `Intl.NumberFormat`/`Intl.DateTimeFormat` capturé au
 * niveau module figerait la langue du tout premier rendu pour tout le monde,
 * pour toujours — voir `dayjs.locale(locale)` dans `main.tsx` pour le même
 * piège côté dates. Volontairement une fonction simple et non un hook `use…`
 * React : elle ne lit rien de réactif (changer de langue déclenche une
 * navigation dure, voir `useLocale.switchTo`), donc les composants qui n'ont
 * besoin que de lire la langue pour formater — pas de la changer — peuvent
 * l'appeler directement à chaque rendu sans payer le coût de `useLocale()`
 * (store auth + mutation de préférence).
 */
export function currentLocale(): Locale {
  return localeFromPath(window.location.pathname)
}

/**
 * En-tête `Accept-Language` à poser sur CHAQUE appel réseau du front, sans
 * quoi le back résout la langue du contenu (cartes, quêtes, compétences,
 * messages d'erreur, mails déclenchés par la requête…) depuis l'en-tête du
 * NAVIGATEUR plutôt que celle du site — la langue de l'inscription en
 * particulier scelle `User.locale`, donc la langue des mails transactionnels
 * pour tout le compte (lot 1). Point unique de cette construction : avant
 * la tâche 5 round 2, `fetchWithAuth.ts`, `api/auth.api.ts`, `api/stats.api.ts`
 * et `lib/api.ts` la recopiaient chacun (ou, pour les trois derniers, ne la
 * posaient pas du tout).
 *
 * `currentLocale()` est lue ICI, à l'appel — jamais mémorisée — pour la même
 * raison que `currentLocale()` elle-même : un en-tête calculé une fois au
 * chargement d'un module servirait la langue du premier onglet ouvert à
 * toutes les requêtes suivantes de la session, y compris depuis un autre
 * onglet resté sous un préfixe différent.
 *
 * Ne remplace jamais un `Accept-Language` déjà présent dans `init` : un
 * appelant qui aurait une raison de forcer une langue reste prioritaire.
 */
export function withAcceptLanguage(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', currentLocale())
  }
  return headers
}

/**
 * Pluriels (tâches 6 à 11) : i18next résout `key_one`/`key_other` via
 * `Intl.PluralRules(locale).select(count)` — voir `t(key, { count })`.
 * Vérifié avec la version d'i18next de ce dépôt : la catégorie "one" du
 * français CLDR couvre 0 ET 1 (`i = 0,1`), donc `key_one` affiche déjà
 * "0 carte" au singulier ; l'anglais ne classe que 1 dans "one", donc
 * `key_other` affiche "0 cards" au pluriel. Aucun suffixe `_zero` n'est
 * nécessaire ni supporté par ce résolveur — fournir seulement `_one` et
 * `_other` sur toute clé comptée, et tester explicitement le cas 0 (c'est le
 * seul endroit où FR et EN divergent structurellement, pas seulement sur
 * l'orthographe du mot).
 */

// Chargement statique des ressources : pas de lazy-loading, le gain sur le
// bundle est marginal ici et un flash de clés brutes coûte plus cher.
void i18next.use(initReactI18next).init({
  resources: {
    fr: { common: commonFr, errors: errorsFr, notifications: notificationsFr },
    en: { common: commonEn, errors: errorsEn, notifications: notificationsEn },
  },
  lng: localeFromPath(window.location.pathname),
  defaultNS: 'common',
  ns: ['common', 'errors', 'notifications'],
  interpolation: {
    // React échappe déjà le rendu — un double échappement casserait les
    // apostrophes/accents dans les traductions.
    escapeValue: false,
  },
  // Aucun repli silencieux sur le français : une traduction manquante doit
  // se voir. Le contenu de jeu, lui, se replie — mais côté serveur (lot 1).
  fallbackLng: false,
  returnEmptyString: false,
  parseMissingKeyHandler: (key) => key,
})

export default i18next
