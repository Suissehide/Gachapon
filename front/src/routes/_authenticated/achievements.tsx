import { createFileRoute } from '@tanstack/react-router'

import { AchievementGrid } from '../../components/achievements/AchievementGrid'
import { useAchievements } from '../../queries/useAchievements'

export const Route = createFileRoute('/_authenticated/achievements')({
  component: AchievementsPage,
})

function AchievementsPage() {
  const { data, isLoading } = useAchievements()

  const totalUnlocked = data?.filter((a) => a.unlocked).length ?? 0
  const total = data?.length ?? 0

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-text">Succès</h1>
          <span className="text-sm text-text-light/70 tabular-nums">
            {totalUnlocked} / {total} débloqués
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <AchievementGrid achievements={data ?? []} />
        )}
      </div>
    </div>
  )
}
