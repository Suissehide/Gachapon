import { useTranslation } from 'react-i18next'

type Props = {
  passiveKey: string
}

// Réutilise le glossaire `passives:<KEY>.name`, déjà consommé par
// `constants/passives.constant.ts` — ce composant avait sa propre copie
// figée en français des mêmes libellés.
export function PassiveBadge({ passiveKey }: Props) {
  const { t } = useTranslation('passives')
  const key = `passives:${passiveKey}.name`
  const translated = t(key)
  const label = translated === key ? passiveKey : translated
  return (
    <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 animate-[floatUp_900ms_ease-out_forwards] rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
      ✨ {label}
    </span>
  )
}
