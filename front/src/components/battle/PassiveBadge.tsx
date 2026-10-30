import { useTranslation } from 'react-i18next'

import { cn } from '../../libs/utils.ts'

type Props = {
  passiveKey: string
  /** Un ultime d'archétype plutôt qu'un passif : libellé fourni, rendu plus marqué. */
  kind?: 'passive' | 'ultimate'
  label?: string
}

// Réutilise le glossaire `passives:<KEY>.name`, déjà consommé par
// `constants/passives.constant.ts` — ce composant avait sa propre copie
// figée en français des mêmes libellés.
export function PassiveBadge({ passiveKey, kind = 'passive', label }: Props) {
  const { t, i18n } = useTranslation('passives')
  const key = `passives:${passiveKey}.name`
  // `t(key) === key` est un garde-fou inatteignable : i18next renvoie la clé
  // manquante SANS le préfixe de namespace, jamais telle qu'on l'a écrite.
  // `i18n.exists()` comprend le préfixe et teste la vraie présence.
  const text = label ?? (i18n.exists(key) ? t(key) : passiveKey)
  const ultimate = kind === 'ultimate'
  return (
    <span
      className={cn(
        'pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 animate-[floatUp_900ms_ease-out_forwards] rounded-full border px-2 py-0.5 font-bold uppercase tracking-wider',
        ultimate
          ? 'border-primary/60 bg-primary/25 text-[10px] text-text'
          : 'border-amber-400/40 bg-amber-500/20 text-[9px] text-amber-200',
      )}
    >
      {ultimate ? '⚡' : '✨'} {text}
    </span>
  )
}
