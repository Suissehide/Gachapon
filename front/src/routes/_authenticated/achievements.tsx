import { createFileRoute } from '@tanstack/react-router'

import { AchievementGrid } from '../../components/achievements/AchievementGrid'
import { PageHeader } from '../../components/shared/PageHeader'
import { AuroraGrid } from '../../components/shared/decorations/AuroraGrid'
import { useAchievements } from '../../queries/useAchievements'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/achievements')({
  component: AchievementsPage,
})

function AchievementsPage() {
  const { data, isLoading } = useAchievements()
  const username = useAuthStore((s) => s.user?.username ?? '')

  const achievements = data ?? []
  const totalUnlocked = achievements.filter((a) => a.unlocked).length
  const total = achievements.length
  const pct = total > 0 ? Math.round((totalUnlocked / total) * 100) : 0

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <AuroraGrid />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Gachapon', to: '/play' },
            {
              label: 'Profil',
              to: '/profile/$username',
              params: { username },
            },
            { label: 'Succès' },
          ]}
          title="Galerie des succès"
          right={
            <>
              <div className="font-display text-3xl font-extrabold tabular-nums leading-none text-text">
                {totalUnlocked}
                <span className="text-text-light/50"> / {total}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-light mt-1">
                Débloqués · {pct}%
              </div>
            </>
          }
        />

        {/* Global progress bar */}
        {total > 0 && (
          <div className="h-[6px] overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${pct}%`,
                background:
                  'linear-gradient(90deg, #fbbf24, #f59e0b, #ec4899, #8b5cf6)',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)',
              }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : achievements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <p className="font-display text-lg font-bold text-text-light">
              Aucun succès disponible
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-text-light/60">
              Reviens plus tard
            </p>
          </div>
        ) : (
          <AchievementGrid achievements={achievements} />
        )}
      </div>
    </div>
  )
}
