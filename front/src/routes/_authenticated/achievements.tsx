import { createFileRoute, Link } from '@tanstack/react-router'
import { Award, Lock } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { AchievementGrid } from '../../components/achievements/AchievementGrid'
import { PageShell } from '../../components/shared/PageShell'
import { Button } from '../../components/ui/button'
import { SegmentedControl } from '../../components/ui/segmentedControl'
import type { AchievementWithProgress } from '../../queries/useAchievements'
import { useAchievements } from '../../queries/useAchievements'
import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/achievements')({
  component: AchievementsPage,
})

type AchievementFilter = 'all' | 'unlocked' | 'locked'

function matchesFilter(a: AchievementWithProgress, filter: AchievementFilter) {
  if (filter === 'unlocked') {
    return a.unlocked
  }
  if (filter === 'locked') {
    return !a.unlocked
  }
  return true
}

function EmptyPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="rounded-[22px] border border-dashed px-6 py-12 text-center"
      style={{ background: '#fff', borderColor: 'rgba(27,23,38,.12)' }}
    >
      <p
        className="font-display text-lg font-bold"
        style={{ color: 'rgba(27,23,38,.5)' }}
      >
        {title}
      </p>
      <p
        className="mt-1 font-mono text-[11px] uppercase tracking-wider"
        style={{ color: 'rgba(27,23,38,.4)' }}
      >
        {subtitle}
      </p>
    </div>
  )
}

// Filtre + grille : gère son propre état de filtre pour garder la page légère.
function AchievementsBody({
  achievements,
}: {
  achievements: AchievementWithProgress[]
}) {
  const [filter, setFilter] = useState<AchievementFilter>('all')

  const total = achievements.length
  const totalUnlocked = achievements.filter((a) => a.unlocked).length
  const filtered = achievements.filter((a) => matchesFilter(a, filter))

  const filterOptions: {
    value: AchievementFilter
    label: string
    icon?: ReactNode
  }[] = [
    { value: 'all', label: `Tous (${total})` },
    {
      value: 'unlocked',
      label: `Réussis (${totalUnlocked})`,
      icon: <Award className="h-3.5 w-3.5" />,
    },
    {
      value: 'locked',
      label: `À débloquer (${total - totalUnlocked})`,
      icon: <Lock className="h-3.5 w-3.5" />,
    },
  ]

  return (
    <>
      {/* Filtre : tous / réussis / à débloquer */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border p-4 sm:px-6"
        style={{
          background: '#fff',
          borderColor: 'rgba(27,23,38,.06)',
          boxShadow:
            '0 2px 0 rgba(27,23,38,.03), 0 16px 36px -20px rgba(27,23,38,.12)',
        }}
      >
        <span
          className="font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: 'rgba(27,23,38,.5)' }}
        >
          Filtrer
        </span>
        <SegmentedControl
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyPanel
          title={
            filter === 'unlocked'
              ? 'Aucun succès réussi pour le moment'
              : 'Tous les succès sont débloqués'
          }
          subtitle={filter === 'unlocked' ? 'Continue de jouer' : 'Bravo !'}
        />
      ) : (
        <AchievementGrid achievements={filtered} />
      )}
    </>
  )
}

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
        <EmptyPanel
          title="Aucun succès disponible"
          subtitle="Reviens plus tard"
        />
      ) : (
        <AchievementsBody achievements={achievements} />
      )}
    </PageShell>
  )
}
