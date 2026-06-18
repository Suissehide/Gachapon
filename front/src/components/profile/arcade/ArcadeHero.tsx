import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile, FeaturedCard } from '../../../api/profile.api'
import { Button } from '../../ui/button'
import { Card, CardTitle } from '../../ui/card'
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
    <Card className="rounded-3xl p-8 overflow-visible">
      <div className="grid gap-8" style={{ gridTemplateColumns: '360px 1fr' }}>
        {/* Identity column */}
        <div className="flex flex-col gap-5">
          <FoilAvatar initials={initials} isMax={isMax} />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[.2em] text-primary-light">
              {isMax ? `NIV. MAX · MEMBRE ${joinedYear}` : `NIV. ${profile.level} · MEMBRE ${joinedYear}`}
            </div>
            <h1 className="font-display text-[52px] font-extrabold leading-none text-text mt-1">
              {profile.username}
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
                <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-muted">
                  LV. {profile.level}
                </span>
              )}
              <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-muted">
                {profile.stats.ownedCards} cartes
              </span>
            </div>
          </div>
        </div>

        {/* Featured cards column */}
        <div className="relative">
          <div className="flex items-baseline justify-between mb-4">
            <CardTitle className="text-sm uppercase tracking-wider">Cartes vedettes</CardTitle>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-text-light">
                TOP {featuredCards.length} · PAR RARETÉ
              </span>
              {isOwnProfile && (
                <Button variant="pill" size="pill" onClick={() => setEditorOpen(true)}>
                  <Pencil size={12} />
                  Éditer
                </Button>
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
    </Card>
  )
}
