import { Layers, Sparkles, Star, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UserProfile } from '../../../api/profile.api'
import { StatCard } from './StatCard'

type Props = { profile: UserProfile }

export function StatGrid({ profile }: Props) {
  const { t } = useTranslation('profile')
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={Star}
        label={t('statGrid.pulls')}
        value={profile.stats.totalPulls}
        rarity="LEGENDARY"
      />
      <StatCard
        icon={Layers}
        label={t('statGrid.uniqueCards')}
        value={profile.stats.ownedCards}
        rarity="UNCOMMON"
      />
      <StatCard
        icon={Sparkles}
        label={t('statGrid.legendaries')}
        value={profile.stats.legendaryCount}
        rarity="EPIC"
        hint={
          profile.stats.legendaryCount === 0
            ? t('statGrid.legendariesHint')
            : undefined
        }
      />
      <StatCard
        icon={Zap}
        label={t('statGrid.dustGenerated')}
        value={profile.stats.dustGenerated}
        rarity="RARE"
      />
    </div>
  )
}
