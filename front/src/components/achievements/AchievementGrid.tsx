import {
  Cog,
  Coins,
  Flame,
  Gem,
  HelpCircle,
  Layers,
  Sparkles,
  Ticket,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

import {
  type AchievementWithProgress,
  FAMILY_VISUAL,
  HIDDEN_FAMILY_VISUAL,
} from '../../constants/achievements.constant'
import { AchievementCard } from './AchievementCard'
import { HiddenAchievementCard } from './HiddenAchievementCard'

interface Props {
  achievements: AchievementWithProgress[]
}

const HIDDEN_FAMILY = '__hidden__'

const ICON_MAP: Record<
  string,
  ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
> = {
  Sparkles,
  Gem,
  Zap,
  Coins,
  Ticket,
  Flame,
  Cog,
  Layers,
  HelpCircle,
}

const FAMILY_ORDER = [
  'pulls',
  'collection_rarity',
  'collection_variants',
  'collection_complete',
  'collection_sets',
  'machines',
  'streak',
  'dust',
]

function getVisual(family: string) {
  if (family === HIDDEN_FAMILY) {
    return HIDDEN_FAMILY_VISUAL
  }
  return (
    FAMILY_VISUAL[family] ?? {
      hue: 35,
      label: family,
      icon: 'Sparkles' as const,
    }
  )
}

export function AchievementGrid({ achievements }: Props) {
  const grouped = new Map<string, AchievementWithProgress[]>()
  for (const a of achievements) {
    const key = a.family ?? HIDDEN_FAMILY
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(a)
  }

  const orderedKeys = [
    ...FAMILY_ORDER.filter((k) => grouped.has(k)),
    ...[...grouped.keys()]
      .filter((k) => k !== HIDDEN_FAMILY && !FAMILY_ORDER.includes(k))
      .sort(),
    ...(grouped.has(HIDDEN_FAMILY) ? [HIDDEN_FAMILY] : []),
  ]

  return (
    <div className="flex flex-col gap-[22px]">
      {orderedKeys.map((family) => {
        const items = grouped.get(family) ?? []
        const total = items.length
        const unlocked = items.filter((a) => a.unlocked).length
        const isHidden = family === HIDDEN_FAMILY
        const visual = getVisual(family)
        const Icon = ICON_MAP[visual.icon] ?? Sparkles

        return (
          <section
            key={family}
            className="rounded-[22px] border p-[26px_28px_28px]"
            style={{
              background: '#fff',
              borderColor: 'rgba(27,23,38,.06)',
              boxShadow:
                '0 2px 0 rgba(27,23,38,.03), 0 16px 36px -20px rgba(27,23,38,.12)',
            }}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border"
                  style={{
                    background: `hsl(${visual.hue}, 70%, 95%)`,
                    borderColor: `hsl(${visual.hue}, 60%, 84%)`,
                    color: `hsl(${visual.hue}, 65%, 42%)`,
                  }}
                >
                  <Icon width={16} height={16} />
                </span>
                <h2
                  className="font-display text-[22px] font-extrabold tracking-tight"
                  style={{ color: '#1b1726' }}
                >
                  {visual.label}
                </h2>
              </div>
              <span
                className="font-mono text-[11px] uppercase tracking-[0.15em]"
                style={{ color: 'rgba(27,23,38,.5)' }}
              >
                {unlocked} / {total} DÉBLOQUÉS
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) =>
                isHidden && !a.unlocked ? (
                  <HiddenAchievementCard key={a.key} />
                ) : (
                  <AchievementCard key={a.key} achievement={a} />
                ),
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
