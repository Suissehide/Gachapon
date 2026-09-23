import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useLevelUpStore } from '../../../stores/levelUp.store'
import { Button } from '../../ui/button'

type Props = {
  isOwnProfile: boolean
  isAdmin: boolean
  currentLevel: number
}

const baseChip =
  'font-mono text-[11px] font-bold uppercase tracking-[0.25em] transition-colors'

export function ArcadeTopbar({ isOwnProfile, isAdmin, currentLevel }: Props) {
  const { t } = useTranslation(['profile', 'common', 'collection'])
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  return (
    <div className="flex items-center justify-between">
      <nav
        aria-label={t('common:pageHeader.breadcrumbAriaLabel')}
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
      >
        <Link
          to="/play"
          className={`${baseChip} text-text-light/70 hover:text-text`}
        >
          Gachapon
        </Link>
        <span className={`${baseChip} text-text-light/40`} aria-hidden>
          /
        </span>
        <span className={`${baseChip} text-text-light`} aria-current="page">
          {t('collection:page.breadcrumbProfile')}
        </span>
      </nav>
      {isOwnProfile && (
        <div className="flex gap-2">
          {import.meta.env.DEV && (
            <Button
              variant="pill"
              size="pill"
              onClick={() => triggerLevelUp(currentLevel + 1)}
            >
              <Sparkles size={14} />
              {t('profile:arcadeTopbar.testLevelUpButton')}
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="pill" size="pill">
              <Link to="/admin">
                <LayoutDashboard size={14} />
                {t('profile:arcadeTopbar.adminButton')}
              </Link>
            </Button>
          )}
          <Button asChild variant="pill" size="pill">
            <Link to="/settings">
              <Settings size={14} />
              {t('profile:arcadeTopbar.settingsButton')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
