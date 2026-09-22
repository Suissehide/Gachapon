import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { I18nextProvider } from 'react-i18next'

import i18n, {
  DEFAULT_LOCALE,
  firstPathSegment,
  isSupportedLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
  localeFromPath,
} from './i18n/index.ts'
import { routeTree } from './routeTree.gen.ts'

import 'dayjs/locale/fr'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import isoWeek from 'dayjs/plugin/isoWeek'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

import './styles/_globals.css'

dayjs.extend(isoWeek)
dayjs.extend(advancedFormat)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(localizedFormat)
dayjs.locale('fr')

import { queryClient } from './lib/queryClient'

/**
 * La langue vit dans le premier segment de l'URL. On la lit ici pour en
 * faire le `basepath` du routeur, ce qui évite de déplacer les fichiers de
 * `src/routes/` sous un dossier `$locale/` : chaque `<Link to="/shop">`
 * existant produit alors `/en/shop` sans être modifié. Si le segment n'est
 * pas une langue supportée (racine sans préfixe, ancienne URL...), on retombe
 * sur la langue par défaut — sans conséquence puisque ce cas déclenche une
 * redirection plus bas, avant tout rendu.
 *
 * `pathname` et `pathLocaleSegment` sont calculés une seule fois ici — via
 * `firstPathSegment`/`localeFromPath` de `./i18n/index.ts`, seul endroit qui
 * sait découper un chemin — et réutilisés plus bas, plutôt que recalculés.
 */
const pathname = window.location.pathname
const pathLocaleSegment = firstPathSegment(pathname)
const locale = localeFromPath(pathname)

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  basepath: `/${locale}`,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/**
 * Résout la langue de destination pour une URL sans préfixe (`/`, `/shop`…).
 * Ordre : `?lang=` s'il est présent et valide, sinon la préférence mémorisée
 * dans localStorage, sinon la langue du navigateur, sinon l'anglais.
 */
function resolveRedirectLocale(): Locale {
  const langParam = new URLSearchParams(window.location.search).get('lang')
  if (langParam && isSupportedLocale(langParam)) {
    return langParam
  }

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isSupportedLocale(stored)) {
      return stored
    }
  } catch {
    // localStorage indisponible (navigation privée, quota…) — on continue
    // avec les repères suivants.
  }

  const browserLocale = window.navigator.language?.slice(0, 2).toLowerCase()
  if (browserLocale && isSupportedLocale(browserLocale)) {
    return browserLocale
  }

  return DEFAULT_LOCALE
}

/**
 * Un segment qui "ressemble" à un code de langue BCP 47 simplifié : deux
 * lettres minuscules (ISO 639-1), éventuellement suivies d'un tiret et d'une
 * variante régionale/script (`de`, `es`, `pt-BR`, `zh-Hans`). Sert seulement
 * à décider, pour une URL sans préfixe `fr`/`en` reconnu, si le premier
 * segment doit être REMPLACÉ (`/de/shop` → `/en/shop` : quelqu'un a
 * visiblement tenté un préfixe de langue qu'on ne sert pas) plutôt que
 * PRÉSERVÉ ET PRÉFIXÉ (`/shop` → `/en/shop` : c'est un vrai segment de
 * route).
 *
 * Volontairement permissive : l'objectif n'est pas de valider une langue,
 * seulement de la distinguer d'un segment de route. Sûre aujourd'hui parce
 * qu'aucune route de ce dépôt n'a un premier segment de deux lettres
 * (vérifié dans `src/routes/`) — elle cesserait de l'être si une route à
 * deux lettres était ajoutée un jour (ex. `/ok`, `/hi`) : dans ce cas,
 * resserrer l'heuristique (liste blanche de codes plausibles, ou
 * vérification contre les routes déclarées) plutôt que la supprimer.
 */
function isPlausibleLanguageCode(segment: string): boolean {
  return /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(segment)
}

/**
 * Calcule ce qui doit survivre du chemin d'origine une fois le préfixe de
 * langue posé. Deux cas (voir `isPlausibleLanguageCode`) : le premier
 * segment est remplacé s'il ressemble à un code de langue non supporté,
 * sinon le chemin entier est préservé et simplement préfixé.
 */
function redirectRest(currentPathname: string, localeSegment: string): string {
  if (isPlausibleLanguageCode(localeSegment)) {
    // "/de/shop" → "/shop" ; "/de" seul → ""
    return currentPathname.slice(1 + localeSegment.length)
  }
  // "/shop" → "/shop" (inchangé) ; "/" → "" (pas de double slash)
  return currentPathname === '/' ? '' : currentPathname
}

if (isSupportedLocale(pathLocaleSegment)) {
  // Ce que lisent les lecteurs d'écran et les moteurs — posé au démarrage
  // depuis la locale résolue plutôt qu'en dur dans index.html.
  document.documentElement.lang = locale

  const rootElement = document.getElementById('root')
  if (rootElement && !rootElement.innerHTML) {
    // Contenu prérendu par scripts/prerender-seo.mjs, posé à côté de #root
    // (jamais dedans, sinon la garde ci-dessus ne passerait plus).
    document.getElementById('seo-static')?.remove()

    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <HelmetProvider>
            <QueryClientProvider client={queryClient}>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="fr"
              >
                <RouterProvider router={router} />
              </LocalizationProvider>
              <ReactQueryDevtools initialIsOpen={false} position={'right'} />
            </QueryClientProvider>
          </HelmetProvider>
        </I18nextProvider>
      </StrictMode>,
    )
  }
} else {
  // Pas de préfixe de langue reconnu dans l'URL : on redirige avant tout
  // rendu React, par remplacement d'historique (`replace`, pas `assign`).
  // Un rendu suivi d'une navigation produirait un clignotement visible et
  // une entrée d'historique parasite — le bouton « précédent » ramènerait
  // l'utilisateur sur la redirection elle-même plutôt que sur la page
  // d'avant.
  const target = resolveRedirectLocale()
  const rest = redirectRest(pathname, pathLocaleSegment)
  window.location.replace(
    `/${target}${rest}${window.location.search}${window.location.hash}`,
  )
}
