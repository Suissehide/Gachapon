import { Globe } from 'lucide-react'

import { type Locale, SUPPORTED_LOCALES } from '../../i18n/index.ts'
import { useLocale } from '../../i18n/useLocale.ts'
import { SegmentedControl } from '../ui/segmentedControl.tsx'

const LOCALE_LABELS: Record<Locale, string> = { fr: 'FR', en: 'EN' }

const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((locale, index) => ({
  value: locale,
  label: LOCALE_LABELS[locale],
  // Globe seulement sur la première option : de quoi identifier le contrôle
  // au premier coup d'œil sans le répéter sur chaque segment.
  icon: index === 0 ? <Globe className="h-3.5 w-3.5" /> : undefined,
}))

/**
 * Sélecteur de langue FR/EN — bâti sur `SegmentedControl`, jamais de contrôle
 * fabriqué à la main (voir global-constraints.md). Toute la logique de
 * bascule (localStorage, appel API si connecté, navigation dure) vit dans
 * `useLocale()` : ce composant ne fait qu'afficher l'état courant.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, switchTo } = useLocale()

  return (
    <SegmentedControl
      options={LOCALE_OPTIONS}
      value={locale}
      onChange={switchTo}
      className={className}
    />
  )
}
