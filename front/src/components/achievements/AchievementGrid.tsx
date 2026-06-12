import type { AchievementWithProgress } from '../../constants/achievements.constant'
import { AchievementCard } from './AchievementCard'
import { AchievementFamilyHeader } from './AchievementFamilyHeader'
import { HiddenAchievementCard } from './HiddenAchievementCard'

interface Props {
  achievements: AchievementWithProgress[]
}

const HIDDEN_FAMILY = '__hidden__'

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

  return (
    <div className="flex flex-col gap-6">
      {[...grouped.entries()].map(([family, items]) => {
        if (family === HIDDEN_FAMILY) {
          return (
            <section key="hidden">
              <h2 className="mb-3 text-base font-black text-text">Succès cachés</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) =>
                  a.unlocked ? (
                    <AchievementCard key={a.key} achievement={a} />
                  ) : (
                    <HiddenAchievementCard key={a.key} />
                  ),
                )}
              </div>
            </section>
          )
        }
        const total = items.length
        const unlocked = items.filter((a) => a.unlocked).length
        return (
          <section key={family}>
            <AchievementFamilyHeader family={family} total={total} unlocked={unlocked} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <AchievementCard key={a.key} achievement={a} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
