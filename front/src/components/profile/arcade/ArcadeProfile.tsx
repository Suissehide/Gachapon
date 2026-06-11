import {
  useUserFeaturedCards,
  useUserProfile,
  useUserSetsProgression,
} from '../../../queries/useProfile'
import { useAuthStore } from '../../../stores/auth.store'
import { ArcadeBackground } from './ArcadeBackground'
import { ArcadeHero } from './ArcadeHero'
import { ArcadeTopbar } from './ArcadeTopbar'
import { CollectionCTA } from './CollectionCTA'
import { SetsProgressionCard } from './SetsProgressionCard'
import { StatGrid } from './StatGrid'
import { StreakCard } from './StreakCard'
import { XPCard } from './XPCard'

type Props = { username: string }

export function ArcadeProfile({ username }: Props) {
  const { data: profile, isLoading, isError } = useUserProfile(username)
  const featured = useUserFeaturedCards(username)
  const progression = useUserSetsProgression(username)
  const currentUser = useAuthStore((s) => s.user)
  const isOwnProfile = currentUser?.username === username
  const isAdmin = currentUser?.role === 'SUPER_ADMIN'

  if (isLoading) {
    return (
      <div className="arcade-theme min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--arcade-amber)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="arcade-theme min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold">Joueur introuvable</p>
          <p className="font-mono text-sm text-[var(--arcade-text-muted)] mt-2">
            @{username} n'existe pas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="arcade-theme relative min-h-[calc(100vh-4rem)]">
      <ArcadeBackground />
      <div className="relative max-w-[1280px] mx-auto px-8 py-7 flex flex-col gap-4 z-10">
        <ArcadeTopbar isOwnProfile={!!isOwnProfile} isAdmin={!!isAdmin} />

        <ArcadeHero
          profile={profile}
          featuredCards={featured.data?.cards ?? []}
          isOwnProfile={!!isOwnProfile}
        />

        <StatGrid profile={profile} />

        <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <XPCard profile={profile} />
          <StreakCard
            profile={profile}
            lastLoginAt={profile.lastLoginAt}
            isOwnProfile={!!isOwnProfile}
          />
        </div>

        <SetsProgressionCard sets={progression.data?.sets ?? []} />

        <CollectionCTA
          profile={profile}
          sets={progression.data?.sets ?? []}
          username={username}
          isOwnProfile={!!isOwnProfile}
        />
      </div>
    </div>
  )
}
