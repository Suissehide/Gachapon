import type { AchievementWithProgress } from '../../constants/achievements.constant'
import { Card, CardTitle } from '../ui/card'
import { AchievementCard } from './AchievementCard'
import { HiddenAchievementCard } from './HiddenAchievementCard'

interface Props {
  achievements: AchievementWithProgress[]
}

const HIDDEN_FAMILY = '__hidden__'

const FAMILY_LABELS: Record<string, string> = {
  pulls: 'Tirages',
  dust: 'Économie',
  collection_rarity: 'Collection — raretés',
  collection_variants: 'Collection — variantes',
  collection_complete: 'Complétion',
  streak: 'Fidélité',
  machines: 'Machines',
}

const FAMILY_ORDER = [
  'pulls',
  'collection_rarity',
  'collection_variants',
  'collection_complete',
  'machines',
  'streak',
  'dust',
]

export function AchievementGrid({ achievements }: Props) {
  const grouped = new Map<string, AchievementWithProgress[]>()
  for (const a of achievements) {
    const key = a.family ?? HIDDEN_FAMILY
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    const list = grouped.get(key)
    if (list) {
      list.push(a)
    }
  }

  // Stable, intentional order: known families first (by FAMILY_ORDER),
  // unknown families next (alphabetical), hidden last.
  const orderedKeys = [
    ...FAMILY_ORDER.filter((k) => grouped.has(k)),
    ...[...grouped.keys()]
      .filter((k) => k !== HIDDEN_FAMILY && !FAMILY_ORDER.includes(k))
      .sort(),
    ...(grouped.has(HIDDEN_FAMILY) ? [HIDDEN_FAMILY] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      {orderedKeys.map((family) => {
        const items = grouped.get(family) ?? []
        const total = items.length
        const unlocked = items.filter((a) => a.unlocked).length
        const isHidden = family === HIDDEN_FAMILY

        return (
          <Card key={family} className="p-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <CardTitle className="text-sm uppercase tracking-wider">
                {isHidden ? 'Succès cachés' : (FAMILY_LABELS[family] ?? family)}
              </CardTitle>
              <span className="font-mono text-[11px] tabular-nums text-text-light">
                {unlocked} / {total}
                <span className="hidden sm:inline"> DÉBLOQUÉS</span>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) =>
                isHidden && !a.unlocked ? (
                  <HiddenAchievementCard key={a.key} />
                ) : (
                  <AchievementCard key={a.key} achievement={a} />
                ),
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
