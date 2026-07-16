import { Layers, Sparkles, Star, Zap } from 'lucide-react'

import type { UserProfile } from '../../../api/profile.api'
import { StatCard } from './StatCard'

type Props = { profile: UserProfile }

export function StatGrid({ profile }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Star} label="Tirages" value={profile.stats.totalPulls} rarity="LEGENDARY" />
      <StatCard icon={Layers} label="Cartes uniques" value={profile.stats.ownedCards} rarity="UNCOMMON" />
      <StatCard
        icon={Sparkles}
        label="Légendaires"
        value={profile.stats.legendaryCount}
        rarity="EPIC"
        hint={profile.stats.legendaryCount === 0 ? 'première en attente' : undefined}
      />
      <StatCard icon={Zap} label="Poussière générée" value={profile.stats.dustGenerated} rarity="RARE" />
    </div>
  )
}
