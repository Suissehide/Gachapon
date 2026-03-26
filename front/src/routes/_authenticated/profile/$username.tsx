import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Calendar,
  ChevronRight,
  Flame,
  Layers,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../../../components/ui/button.tsx'
import { useUserProfile } from '../../../queries/useProfile.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/profile/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  const { data: profile, isLoading, isError } = useUserProfile(username)
  const currentUser = useAuthStore((s) => s.user)

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-black text-text">Joueur introuvable</p>
          <p className="mt-2 text-text-light">@{username} n'existe pas.</p>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.username === username
  const isAdmin = currentUser?.role === 'SUPER_ADMIN'
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  // XP progression — mirrors back/src/main/domain/shared/xp.ts
  const isMaxLevel = profile.level >= 100
  const xpForLevel = (n: number) => (n - 1) ** 2 * 100
  const xpInLevel = profile.xp - xpForLevel(profile.level)
  const xpNeeded = xpForLevel(profile.level + 1) - xpForLevel(profile.level)
  const xpPercent = isMaxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Banner */}
      <div className="h-32 w-full bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/10" />

      <div className="mx-auto max-w-4xl px-4 pb-12">
        {/* Avatar + infos principales */}
        <div className="-mt-12 flex items-end gap-4 pb-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-3xl font-black text-white ring-4 ring-background">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-black text-text">@{profile.username}</h1>
            <div className="flex items-center gap-3 text-xs text-text-light">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Membre depuis {joinedYear}
              </span>
            </div>
          </div>
          {isOwnProfile && (
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">
                  <Settings className="h-3.5 w-3.5" />
                  Paramètres
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Niveau + XP + Streak */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Level + XP card */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">NIV.</span>
                <span className="text-xl font-black leading-tight text-primary">{profile.level}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-text">Expérience</span>
                  {isMaxLevel ? (
                    <span className="text-xs font-bold text-primary">MAX</span>
                  ) : (
                    <span className="text-[11px] tabular-nums text-text-light">
                      {xpInLevel.toLocaleString('fr-FR')} / {xpNeeded.toLocaleString('fr-FR')} XP
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                {!isMaxLevel && (
                  <p className="mt-1.5 text-[10px] text-text-light">
                    encore {(xpNeeded - xpInLevel).toLocaleString('fr-FR')} XP avant le niveau {profile.level + 1}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Streak card */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-light">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              Streak de connexion
            </div>
            <div className="flex items-end gap-5">
              <div>
                <p className="text-2xl font-black text-text">
                  {profile.streakDays}
                  <span className="ml-1 text-sm font-medium text-text-light">j</span>
                </p>
                <p className="mt-0.5 text-xs text-text-light">Actuel</p>
              </div>
              <div className="mb-0.5 h-7 w-px bg-border" />
              <div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                  <p className="text-2xl font-black text-text">
                    {profile.bestStreak}
                    <span className="ml-1 text-sm font-medium text-text-light">j</span>
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-text-light">Record</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Star className="h-4 w-4 text-yellow-400" />}
            label="Tirages"
            value={profile.stats.totalPulls}
          />
          <StatCard
            icon={<Layers className="h-4 w-4 text-accent" />}
            label="Cartes uniques"
            value={profile.stats.ownedCards}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            label="Légendaires"
            value={profile.stats.legendaryCount}
          />
          <StatCard
            icon={<Zap className="h-4 w-4 text-secondary" />}
            label="Dust généré"
            value={profile.stats.dustGenerated}
          />
        </div>

        {/* Collection CTA */}
        <Link
          to={isOwnProfile ? '/collection' : '/profile/$username/collection'}
          params={isOwnProfile ? undefined : { username }}
          className="group mt-3 flex items-center justify-between overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-5 transition-colors hover:border-primary/35 hover:from-primary/15"
        >
          <div>
            <p className="text-xs font-medium text-text-light">
              {isOwnProfile ? 'Ma collection' : `Collection de ${username}`}
            </p>
            <p className="mt-0.5 text-lg font-black text-text">
              {profile.stats.ownedCards.toLocaleString('fr-FR')} cartes
              {profile.stats.legendaryCount > 0 && (
                <span className="ml-2 text-sm font-semibold text-primary">
                  · {profile.stats.legendaryCount} légendaires
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
            {isOwnProfile ? 'Voir ma collection' : 'Explorer'}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-text-light">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-black text-text">
        {value.toLocaleString('fr-FR')}
      </p>
    </div>
  )
}
