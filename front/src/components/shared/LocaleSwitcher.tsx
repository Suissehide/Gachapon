import { ChevronDown, Globe } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTranslation } from 'react-i18next'

import { type Locale, SUPPORTED_LOCALES } from '../../i18n/index.ts'
import { useLocale } from '../../i18n/useLocale.ts'
import { Button } from '../ui/button.tsx'
import {
  DropdownMenuCustomContent,
  DropdownMenuCustomRadioItem,
} from '../ui/dropdownMenu.tsx'

/**
 * Nom de chaque langue **dans cette langue**. Ces libellés ne passent pas par
 * les fichiers de locale, et c'est voulu : un anglophone arrivé par erreur sur
 * la version française doit reconnaître « English » sans effort. Les traduire
 * rendrait le menu illisible à celui qui en a le plus besoin.
 */
const LOCALE_ENDONYMS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
}

/** Code court du déclencheur, seul endroit où la langue courante s'affiche. */
const LOCALE_CODES: Record<Locale, string> = { fr: 'FR', en: 'EN' }

/**
 * Sélecteur de langue FR/EN — un menu déroulant discret, bâti sur les
 * primitives de `components/ui/`, jamais de contrôle fabriqué à la main.
 *
 * Toute la logique de bascule (localStorage, cookie lu par nginx, appel API si
 * connecté, navigation dure) vit dans `useLocale()` : ce composant ne fait
 * qu'afficher l'état courant et signaler le choix.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { locale, switchTo } = useLocale()

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          title={t('layout:localeSwitcher.menuTitle')}
          aria-label={t('layout:localeSwitcher.menuTitle')}
        >
          <Globe className="h-3.5 w-3.5" />
          {LOCALE_CODES[locale]}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenuCustomContent align="end" className="min-w-[160px]">
        <DropdownMenu.RadioGroup
          value={locale}
          // `onValueChange` rend une `string` : le groupe ne connaît pas le
          // type des valeurs qu'on lui confie. Le filtre sur
          // `SUPPORTED_LOCALES` restreint au type attendu sans affirmation de
          // type — la consigne du projet interdit `as`.
          onValueChange={(value) => {
            const next = SUPPORTED_LOCALES.find((l) => l === value)
            if (next) {
              switchTo(next)
            }
          }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <DropdownMenuCustomRadioItem key={l} value={l}>
              {LOCALE_ENDONYMS[l]}
            </DropdownMenuCustomRadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenuCustomContent>
    </DropdownMenu.Root>
  )
}
