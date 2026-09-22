import { currentLocale } from '../i18n/index.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { AuthApi } from './auth.api.ts'

// 'expired' = le serveur a explicitement rejeté le refresh token (401/403) ;
// 'transient' = échec passager (rate limit 429, 5xx, réseau) — la session est
// probablement encore valide, il ne faut surtout pas déconnecter.
type RefreshResult = 'ok' | 'expired' | 'transient'

// A single in-flight refresh promise shared by every concurrent 401 retry.
// Cleared in `.finally()` so the next 401 starts a fresh attempt.
let inFlightRefresh: Promise<RefreshResult> | null = null

function ensureFreshSession(): Promise<RefreshResult> {
  if (!inFlightRefresh) {
    inFlightRefresh = AuthApi.refresh()
      .then((res): RefreshResult => {
        if (res.ok) {
          return 'ok'
        }
        return res.status === 401 || res.status === 403
          ? 'expired'
          : 'transient'
      })
      .catch((): RefreshResult => 'transient')
      .finally(() => {
        inFlightRefresh = null
      })
  }
  return inFlightRefresh
}

export const fetchWithAuth = async (
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> => {
  const makeRequest = () => {
    // `currentLocale()` est lu ICI, à chaque appel de `makeRequest` (donc
    // à chaque tentative, y compris le retry après refresh) — jamais mis en
    // cache dans une variable de module : c'est le même piège que
    // `dayjs.locale('fr')` figé dans main.tsx, une valeur localisée capturée
    // une fois au chargement servirait la langue du premier onglet ouvert à
    // toutes les requêtes suivantes, y compris dans un autre onglet resté
    // sous un préfixe différent. Sans cet en-tête, le back résout la langue
    // depuis l'Accept-Language du NAVIGATEUR (jamais envoyé jusqu'ici), pas
    // celle du site — un francophone sur /en recevait donc du contenu de
    // jeu (noms de cartes, quêtes, messages d'erreur...) en français malgré
    // une interface anglaise, et inversement.
    const headers = new Headers(init?.headers)
    // Ne jamais écraser un Accept-Language que l'appelant aurait déjà posé
    // explicitement — cette fonction complète, elle ne prime pas.
    if (!headers.has('Accept-Language')) {
      headers.set('Accept-Language', currentLocale())
    }
    return fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    })
  }

  let response = await makeRequest()

  if (response.status === 401) {
    const refreshed = await ensureFreshSession()
    if (refreshed === 'expired') {
      // Clear the cached "logged in" state so the route guard catches the
      // next navigation immediately instead of letting it slip through.
      useAuthStore.setState({ user: null, isAuthenticated: false })
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
      return Promise.reject(new Error('Session expired'))
    }
    if (refreshed === 'transient') {
      // Session sans doute encore valide : on laisse le 401 remonter à
      // l'appelant (React Query réessaiera) sans purger l'état auth.
      return response
    }
    response = await makeRequest()
  }

  return response
}
