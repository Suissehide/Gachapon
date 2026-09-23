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
  persistLocaleCookie,
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
 *
 * Calculé AVANT `dayjs.locale(locale)` juste en dessous : dayjs est un
 * singleton global (pas un formateur par composant), donc sa locale ne peut
 * être fixée qu'une fois, ici, au tout premier chargement du module — mais
 * elle doit suivre `locale`, pas être figée en dur sur `'fr'` (piège
 * transverse du lot 2 : un formateur qui capture la langue du premier rendu
 * la sert ensuite à tout le monde, pour toujours).
 */
const pathname = window.location.pathname
const pathLocaleSegment = firstPathSegment(pathname)
const locale = localeFromPath(pathname)

dayjs.extend(isoWeek)
dayjs.extend(advancedFormat)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(localizedFormat)
// 'en' est la locale intégrée par défaut de dayjs (aucun import requis) ;
// 'fr' vient de l'import statique `dayjs/locale/fr` ci-dessus.
dayjs.locale(locale)

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
 * Recopie la préférence de `localStorage` dans le cookie que nginx lit pour
 * rediriger `/` (voir `persistLocaleCookie`).
 *
 * Existe pour les visiteurs D'AVANT le lot 3 : ils ont une préférence en
 * `localStorage` mais aucun cookie, et n'en auraient un qu'au prochain
 * changement de langue explicite — c'est-à-dire jamais, puisqu'ils ont déjà
 * la langue qu'ils veulent. Sans ce miroir, la correction n'atteindrait que
 * les nouveaux visiteurs.
 *
 * Inconditionnel et au démarrage : appelé aussi depuis une URL préfixée, car
 * c'est le SEUL moment où ce code tourne pour ces visiteurs (sur `/`, nginx
 * redirige avant que React ne démarre). Ne fait rien si la préférence est
 * absente ou illisible — écrire le cookie depuis l'URL courante à la place
 * transformerait une simple visite d'un lien `/en` en changement de
 * préférence.
 */
function mirrorStoredLocaleToCookie(): void {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isSupportedLocale(stored)) {
      persistLocaleCookie(stored)
    }
  } catch {
    // localStorage indisponible (navigation privée, quota…) — sans
    // préférence à recopier, il n'y a rien à faire.
  }
}

mirrorStoredLocaleToCookie()

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
              {/* Même locale que `dayjs.locale(locale)` plus haut : figée à
                  'fr', les sélecteurs MUI X affichaient mois et jours en
                  français sur le site anglais. */}
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={locale}
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
