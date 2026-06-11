// front/src/components/profile/arcade/ArcadeHero.tsx
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { FeaturedCard, UserProfile } from '../../../api/profile.api'
import { FeaturedCardsEditorModal } from './FeaturedCardsEditorModal'
import { FeaturedCardsFan } from './FeaturedCardsFan'
import { FoilAvatar } from './FoilAvatar'

type Props = {
  profile: UserProfile
  featuredCards: FeaturedCard[]
  isOwnProfile: boolean
}

export function ArcadeHero({ profile, featuredCards, isOwnProfile }: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  const isMax = profile.level >= 100
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <section
      className="relative rounded-3xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-8"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="grid gap-8" style={{ gridTemplateColumns: '360px 1fr' }}>
        {/* Identity column */}
        <div className="flex flex-col gap-5">
          <FoilAvatar initials={initials} isMax={isMax} />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[.2em] text-[var(--arcade-amber-light)]">
              {isMax ? `NIV. MAX · MEMBRE ${joinedYear}` : `NIV. ${profile.level} · MEMBRE ${joinedYear}`}
            </div>
            <h1 className="font-display text-[52px] font-extrabold leading-none text-[var(--arcade-text)] mt-1">
              @{profile.username}
            </h1>
            <div className="flex gap-2 mt-3 flex-wrap">
              {isMax ? (
                <span
                  className="font-mono text-[10px] px-2 py-1 rounded-full font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #fde68a, #fbbf24)',
                    color: '#6b3a00',
                  }}
                >
                  LV. MAX
                </span>
              ) : (
                <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-[var(--arcade-surface-2)]">
                  LV. {profile.level}
                </span>
              )}
              <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-[var(--arcade-surface-2)]">
                {profile.stats.ownedCards} cartes
              </span>
            </div>
          </div>
        </div>

        {/* Featured cards column */}
        <div className="relative">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">Cartes vedettes</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-[var(--arcade-text-muted)]">
                TOP {featuredCards.length} · PAR RARETÉ
              </span>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="font-mono text-[11px] px-2 py-1 rounded-full flex items-center gap-1 hover:bg-[var(--arcade-surface-2)]"
                >
                  <Pencil size={12} />
                  Éditer
                </button>
              )}
            </div>
          </div>
          <FeaturedCardsFan cards={featuredCards} />
        </div>
      </div>

      {isOwnProfile && (
        <FeaturedCardsEditorModal
          open={editorOpen}
          initialIds={featuredCards.map((c) => c.id)}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </section>
  )
}
