import { useTranslation } from 'react-i18next'

interface Props {
  family: string
  total: number
  unlocked: number
}

// Réutilise `achievements:family.*` — déjà consommé par
// `constants/achievements.constant.ts` (FAMILY_VISUAL) — ce composant avait
// sa propre copie française figée, avec des libellés qui avaient même
// divergé de la version canonique (« Complétion » vs « Collection —
// Complétion », « Sets » vs « Collection — Sets »).
const FAMILY_KEYS: Record<string, string> = {
  pulls: 'pulls',
  dust: 'dust',
  collection_rarity: 'collectionRarity',
  collection_variants: 'collectionVariants',
  collection_complete: 'collectionComplete',
  collection_sets: 'collectionSets',
  streak: 'streak',
  machines: 'machines',
}

export function AchievementFamilyHeader({ family, total, unlocked }: Props) {
  const { t } = useTranslation('achievements')
  const familyKey = FAMILY_KEYS[family]
  const label = familyKey ? t(`achievements:family.${familyKey}`) : family
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-black text-text">{label}</h2>
      <span className="text-xs text-text-light/70 tabular-nums">
        {unlocked} / {total}
      </span>
    </div>
  )
}
