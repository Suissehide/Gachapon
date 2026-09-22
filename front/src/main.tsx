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
 */
const locale = localeFromPath(window.location.pathname)

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

const pathLocaleSegment = window.location.pathname.split('/')[1]

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
  // Pas de préfixe de langue dans l'URL : on redirige avant tout rendu React,
  // par remplacement d'historique (`replace`, pas `assign`). Un rendu suivi
  // d'une navigation produirait un clignotement visible et une entrée
  // d'historique parasite — le bouton « précédent » ramènerait l'utilisateur
  // sur la redirection elle-même plutôt que sur la page d'avant.
  const target = resolveRedirectLocale()
  const rest = window.location.pathname === '/' ? '' : window.location.pathname
  window.location.replace(
    `/${target}${rest}${window.location.search}${window.location.hash}`,
  )
}
