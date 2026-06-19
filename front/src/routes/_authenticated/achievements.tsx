import { createFileRoute, Link } from '@tanstack/react-router'

import { AchievementGrid } from '../../components/achievements/AchievementGrid'
import { PageShell } from '../../components/shared/PageShell'
import { Button } from '../../components/ui/button'
import { useAchievements } from '../../queries/useAchievements'
import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/achievements')({
  component: AchievementsPage,
})

function AchievementsPage() {
  const { data, isLoading } = useAchievements()
  const username = useAuthStore((s) => s.user?.username ?? '')
  const enqueueUnlock = useAchievementUnlockStore((s) => s.enqueue)

  const achievements = data ?? []
  const totalUnlocked = achievements.filter((a) => a.unlocked).length
  const total = achievements.length
  const pct = total > 0 ? Math.round((totalUnlocked / total) * 100) : 0

  // Dev-only helper: pick the first non-hidden achievement and fire the
  // unlock toast with its data so designers can iterate on the popup
  // without having to actually earn a success.
  const triggerTestUnlock = () => {
    const sample =
      achievements.find((a) => !a.hidden && a.reward) ??
      achievements.find((a) => !a.hidden) ??
      achievements[0]
    if (!sample) {
      return
    }
    enqueueUnlock([
      {
        key: sample.key,
        name: sample.name,
        iconKey: sample.iconKey,
        reward: sample.reward,
      },
    ])
  }

  return (
    <PageShell>
      {/* Hero header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <nav
              aria-label="Fil d'Ariane"
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
            >
              <Link
                to="/play"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors"
                style={{ color: 'rgba(27,23,38,.5)' }}
              >
                GACHAPON
              </Link>
              <span
                className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'rgba(27,23,38,.3)' }}
                aria-hidden
              >
                /
              </span>
              <Link
                to="/profile/$username"
                params={{ username }}
                className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'rgba(27,23,38,.5)' }}
              >
                PROFIL
              </Link>
              <span
                className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'rgba(27,23,38,.3)' }}
                aria-hidden
              >
                /
              </span>
              <span
                className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'rgba(27,23,38,.5)' }}
                aria-current="page"
              >
                SUCCÈS
              </span>
            </nav>
            <h1
              className="mt-2 font-display text-[48px] font-extrabold leading-none tracking-[-0.03em]"
              style={{ color: '#1b1726' }}
            >
              Galerie des succès
            </h1>
          </div>

          <div className="flex items-end gap-3">
            {import.meta.env.DEV && (
              <Button
                size="sm"
                variant="outline"
                onClick={triggerTestUnlock}
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                Test unlock
              </Button>
            )}
            <div className="text-right">
              <div className="font-display text-[44px] font-extrabold leading-none tabular-nums">
                <span style={{ color: '#f59e0b' }}>{totalUnlocked}</span>
                <span style={{ color: 'rgba(27,23,38,.25)' }}> / </span>
                <span style={{ color: 'rgba(27,23,38,.35)' }}>{total}</span>
              </div>
              <div
                className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.15em]"
                style={{ color: 'rgba(27,23,38,.5)' }}
              >
                DÉBLOQUÉS · {pct}%
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : achievements.length === 0 ? (
          <div
            className="rounded-[22px] border border-dashed px-6 py-12 text-center"
            style={{
              background: '#fff',
              borderColor: 'rgba(27,23,38,.12)',
            }}
          >
            <p
              className="font-display text-lg font-bold"
              style={{ color: 'rgba(27,23,38,.5)' }}
            >
              Aucun succès disponible
            </p>
            <p
              className="mt-1 font-mono text-[11px] uppercase tracking-wider"
              style={{ color: 'rgba(27,23,38,.4)' }}
            >
              Reviens plus tard
            </p>
          </div>
      ) : (
        <AchievementGrid achievements={achievements} />
      )}
    </PageShell>
  )
}
