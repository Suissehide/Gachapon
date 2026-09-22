import { useCallback } from 'react'

import { LOCALE_STORAGE_KEY, type Locale, localeFromPath } from './index.ts'

export type UseLocaleResult = {
  locale: Locale
  switchTo: (locale: Locale) => void
}

/**
 * Le préfixe d'URL est la vérité d'affichage (spec §5.4) : ce hook lit la
 * locale directement depuis le chemin plutôt que de dupliquer un état React,
 * pour ne jamais diverger du `basepath` posé dans main.tsx.
 *
 * `switchTo` mémorise la préférence puis déclenche une navigation dure vers
 * le même chemin sous l'autre préfixe (spec §5.1) : le changement de langue
 * est rare, et recharger garantit qu'aucun état React ne subsiste dans
 * l'ancienne langue.
 */
export function useLocale(): UseLocaleResult {
  const switchTo = useCallback((locale: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // localStorage indisponible (navigation privée, quota…) — la
      // navigation dure ci-dessous fonctionne de toute façon.
    }

    const segments = window.location.pathname.split('/')
    segments[1] = locale
    window.location.assign(
      `${segments.join('/')}${window.location.search}${window.location.hash}`,
    )
  }, [])

  return { locale: localeFromPath(window.location.pathname), switchTo }
}
