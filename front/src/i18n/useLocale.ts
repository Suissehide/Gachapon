import { useCallback } from 'react'

import type { ApiLocale } from '../api/profile.api.ts'
import { useUpdateLocaleMutation } from '../queries/useProfile.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import {
  LOCALE_STORAGE_KEY,
  type Locale,
  localeFromPath,
  persistLocaleCookie,
} from './index.ts'

export type UseLocaleResult = {
  locale: Locale
  switchTo: (locale: Locale) => void
}

// `Locale` (ce module) est le préfixe d'URL en minuscules ; `ApiLocale`
// (back) est en majuscules — voir la doc de `ApiLocale` dans
// `constants/profile.constant.ts`.
const TO_API_LOCALE: Record<Locale, ApiLocale> = { fr: 'FR', en: 'EN' }

/**
 * Le préfixe d'URL est la vérité d'affichage (spec §5.4) : ce hook lit la
 * locale directement depuis le chemin plutôt que de dupliquer un état React,
 * pour ne jamais diverger du `basepath` posé dans main.tsx.
 *
 * `switchTo` mémorise la préférence, la pousse en base pour un compte
 * connecté (elle pilote la langue des mails transactionnels — voir
 * amendement A3 du lot 1), puis déclenche dans tous les cas une navigation
 * dure vers le même chemin sous l'autre préfixe (spec §5.1) : le changement
 * de langue est rare, et recharger garantit qu'aucun état React ne subsiste
 * dans l'ancienne langue.
 */
export function useLocale(): UseLocaleResult {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { mutateAsync: updateLocale } = useUpdateLocaleMutation()

  const switchTo = useCallback(
    (locale: Locale) => {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
      } catch {
        // localStorage indisponible (navigation privée, quota…) — la
        // navigation dure ci-dessous fonctionne de toute façon.
      }

      // Le même choix, sous une forme que nginx sait lire : c'est lui qui
      // redirige `/` depuis le lot 3, avant que ce code ne s'exécute. Les deux
      // écritures sont volontairement côte à côte — `localStorage` reste la
      // source que lit `resolveRedirectLocale()`, le cookie n'existe que pour
      // le serveur.
      persistLocaleCookie(locale)

      const navigateHard = () => {
        const segments = window.location.pathname.split('/')
        segments[1] = locale
        window.location.assign(
          `${segments.join('/')}${window.location.search}${window.location.hash}`,
        )
      }

      if (!isAuthenticated) {
        // Un visiteur anonyme doit pouvoir basculer la langue depuis
        // n'importe quelle page publique : l'appel à la route est simplement
        // omis, jamais bloquant.
        navigateHard()
        return
      }

      // Une erreur de cette requête ne doit jamais empêcher la bascule
      // d'affichage — au pire la langue des mails reste périmée jusqu'au
      // prochain changement de langue réussi.
      void updateLocale(TO_API_LOCALE[locale])
        .catch(() => {
          // Volontairement silencieux — voir le commentaire ci-dessus.
        })
        .finally(navigateHard)
    },
    [isAuthenticated, updateLocale],
  )

  return { locale: localeFromPath(window.location.pathname), switchTo }
}
