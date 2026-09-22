import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEn from './locales/en/common.json'
import commonFr from './locales/fr/common.json'

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
 * La langue vit dans le premier segment de l'URL (voir main.tsx, qui en fait
 * le `basepath` du routeur) : i18next doit démarrer synchronisé dessus pour
 * que le tout premier rendu soit déjà dans la bonne langue.
 */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/')[1]
  return isSupportedLocale(first) ? first : DEFAULT_LOCALE
}

// Chargement statique des ressources : pas de lazy-loading, le gain sur le
// bundle est marginal ici et un flash de clés brutes coûte plus cher.
void i18next.use(initReactI18next).init({
  resources: {
    fr: { common: commonFr },
    en: { common: commonEn },
  },
  lng: localeFromPath(window.location.pathname),
  defaultNS: 'common',
  ns: ['common'],
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
