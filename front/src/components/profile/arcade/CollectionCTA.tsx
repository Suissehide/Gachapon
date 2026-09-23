import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { SetProgression, UserProfile } from '../../../api/profile.api'
import { Button } from '../../ui/button'

type Props = {
  profile: UserProfile
  sets: SetProgression[]
  username: string
  isOwnProfile: boolean
}

export function CollectionCTA({
  profile,
  sets,
  username,
  isOwnProfile,
}: Props) {
  const { t } = useTranslation('profile')
  const exploredSets = sets.filter((s) => s.owned > 0).length

  return (
    <div
      className="rounded-2xl p-6 border flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #fff7ed, #fee2e2, #ede9fe)',
        borderColor: '#fed7aa',
      }}
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-text-light">
          {isOwnProfile
            ? t('collectionCTA.myCollectionLabel')
            : t('collectionCTA.otherCollectionLabel', { username })}
        </div>
        <div className="font-display text-[36px] font-extrabold mt-1 text-text">
          {t('collectionCTA.cardsCount', { count: profile.stats.ownedCards })}
          {' · '}
          {t('collectionCTA.setsCount', { count: exploredSets })}
        </div>
      </div>
      <Button asChild variant="gradient" size="lg">
        <Link
          to={isOwnProfile ? '/collection' : '/profile/$username/collection'}
          params={isOwnProfile ? undefined : ({ username } as any)}
        >
          {isOwnProfile
            ? t('collectionCTA.viewMyCollectionButton')
            : t('collectionCTA.exploreButton')}
        </Link>
      </Button>
    </div>
  )
}
