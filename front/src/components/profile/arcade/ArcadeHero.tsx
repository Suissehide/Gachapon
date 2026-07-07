import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile, FeaturedCard } from '../../../api/profile.api'
import { Button } from '../../ui/button'
import { Card, CardTitle } from '../../ui/card'
import { DEFAULT_ECONOMY, useEconomyConfig } from '../../../queries/useEconomyConfig'
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
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const isMax = profile.level >= economy.xp.levelCap
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <Card className="rounded-3xl p-8 overflow-visible">
      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)' }}
      >
        {/* Identity column */}
        <div className="flex flex-col gap-5 min-w-0">
          <FoilAvatar initials={initials} isMax={isMax} />
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[.2em] text-primary-light">
              {isMax ? `NIV. MAX · MEMBRE ${joinedYear}` : `NIV. ${profile.level} · MEMBRE ${joinedYear}`}
            </div>
            <h1 className="font-display text-[44px] font-extrabold leading-none text-text mt-1 truncate">
              {profile.username}
            </h1>
          </div>
        </div>

        {/* Featured cards column */}
        <div className="relative min-w-0">
          <div className="flex items-baseline justify-between mb-4 gap-2">
            <CardTitle className="text-sm uppercase tracking-wider">Cartes vedettes</CardTitle>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-text-light hidden md:inline">
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
