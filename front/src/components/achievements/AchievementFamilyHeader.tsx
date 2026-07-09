interface Props {
  family: string
  total: number
  unlocked: number
}

const FAMILY_LABELS: Record<string, string> = {
  pulls: 'Tirages',
  dust: 'Économie',
  collection_rarity: 'Collection — raretés',
  collection_variants: 'Collection — variantes',
  collection_complete: 'Complétion',
  collection_sets: 'Sets',
  streak: 'Fidélité',
  machines: 'Machines',
}

export function AchievementFamilyHeader({ family, total, unlocked }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-black text-text">{FAMILY_LABELS[family] ?? family}</h2>
      <span className="text-xs text-text-light/70 tabular-nums">{unlocked} / {total}</span>
    </div>
  )
}
