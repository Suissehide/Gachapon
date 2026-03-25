import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Calendar,
  Layers,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
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
            <h1 className="text-xl font-black text-text">
              @{profile.username}
            </h1>
            <div className="flex items-center gap-3 text-xs text-text-light">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Membre depuis {joinedYear}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Niv. {profile.level}
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

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        {/* Lien collection */}
        <div className="mt-8 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">
            {isOwnProfile ? 'Ma collection' : `Collection de ${username}`}
          </h2>
          <Button asChild variant="default">
            {isOwnProfile ? (
              <Link to="/collection">
                <Layers className="h-4 w-4" />
                Voir ma collection →
              </Link>
            ) : (
              <Link to="/profile/$username/collection" params={{ username }}>
                <Layers className="h-4 w-4" />
                Voir la collection →
              </Link>
            )}
          </Button>
        </div>
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
