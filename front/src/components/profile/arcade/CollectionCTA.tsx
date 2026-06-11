import { Link } from '@tanstack/react-router'

import type { UserProfile, SetProgression } from '../../../api/profile.api'

type Props = {
  profile: UserProfile
  sets: SetProgression[]
  username: string
  isOwnProfile: boolean
}

export function CollectionCTA({ profile, sets, username, isOwnProfile }: Props) {
  const exploredSets = sets.filter((s) => s.owned > 0).length

  return (
    <div
      className="rounded-2xl p-6 border flex items-center justify-between overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #fff7ed, #fee2e2, #ede9fe)',
        borderColor: '#fed7aa',
      }}
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--arcade-text-muted)]">
          {isOwnProfile ? 'Ma collection' : `Collection de ${username}`}
        </div>
        <div className="font-display text-[36px] font-extrabold mt-1">
          {profile.stats.ownedCards} cartes · {exploredSets} sets
        </div>
      </div>
      <Link
        to={isOwnProfile ? '/collection' : '/profile/$username/collection'}
        params={isOwnProfile ? undefined : ({ username } as any)}
        className="px-5 py-3 rounded-xl text-white font-bold"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
          boxShadow: '0 8px 24px rgba(236, 72, 153, 0.35)',
        }}
      >
        {isOwnProfile ? 'Voir ma collection' : 'Explorer'}
      </Link>
    </div>
  )
}
