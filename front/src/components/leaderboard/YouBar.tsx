import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type {
  CollectorEntry,
  CombatEntry,
  TeamEntry,
} from '../../constants/leaderboard.constant'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber, ordinal } from '../../libs/utils.ts'
import { FoilAvatar } from '../profile/arcade/FoilAvatar'
import { Button } from '../ui/button.tsx'
import { MedalRank } from './MedalRank'

type Props =
  | {
      mode: 'collectors'
      entry: CollectorEntry
      entries: CollectorEntry[]
      total: number
      /** Ouvre la page du classement où je figure. */
      onJump: (rank: number) => void
    }
  | {
      mode: 'teams'
      entry: TeamEntry
      entries: TeamEntry[]
      total: number
      /** Ouvre la page du classement où je figure. */
      onJump: (rank: number) => void
    }
  | {
      mode: 'combat'
      entry: CombatEntry
      entries: CombatEntry[]
      total: number
      /** Ouvre la page du classement où je figure. */
      onJump: (rank: number) => void
    }

const fmt = (n: number) => formatNumber(n, currentLocale())

function refAbove<E extends { rank: number }>(
  entry: E,
  entries: E[],
): E | null {
  if (entry.rank <= 1) {
    return null
  }
  const above = entries.find((e) => e.rank === entry.rank - 1)
  if (above) {
    return above
  }
  // Repli sur la dernière ligne affichée — seulement si elle me précède :
  // sur une page plus loin que moi, elle est DERRIÈRE, et l'écart n'a plus
  // de sens.
  const last = entries[entries.length - 1]
  return last && last.rank < entry.rank ? last : null
}

export function YouBar(props: Props) {
  const { t } = useTranslation('leaderboard')
  const locale = currentLocale()
  // Pas de sortie anticipée au 1er rang : la barre ne s'affiche que quand je
  // ne suis PAS sur la page affichée, et même premier, « Y aller » y ramène.
  const { mode, entry, entries, total, onJump } = props

  const above = refAbove(entry, entries)
  const aboveRank = above?.rank ?? entry.rank - 1

  let gapText = ''
  if (above) {
    if (mode === 'collectors' || mode === 'teams') {
      const g = Math.max(
        0,
        (above as CollectorEntry | TeamEntry).cardPercentage -
          (entry as CollectorEntry | TeamEntry).cardPercentage,
      )
      gapText = t('youBar.gapPercent', {
        gap: g,
        rankOrdinal: ordinal(aboveRank, locale),
      })
    } else {
      const g = Math.max(0, (above as CombatEntry).palier - entry.palier)
      gapText = t('youBar.gapTiers', {
        count: g,
        gap: g,
        rankOrdinal: ordinal(aboveRank, locale),
      })
    }
  }

  const displayName = mode === 'teams' ? entry.team.name : entry.user.username
  const initials = displayName.slice(0, 1).toUpperCase()

  const stats =
    mode === 'collectors' || mode === 'teams'
      ? [
          { lab: t('leaderRow.cardsLabel'), val: `${entry.cardPercentage}%` },
          {
            lab: t('leaderRow.variantsLabel'),
            val: `${entry.variantPercentage}%`,
          },
        ]
      : [
          {
            lab: t('youBar.tierLabel'),
            val: `${entry.palier} / ${entry.maxPalier}`,
          },
          { lab: t('youBar.powerLabel'), val: fmt(entry.combatPower) },
        ]

  return (
    <div
      className="sticky bottom-4 mt-[18px] flex flex-col gap-4 rounded-[18px] p-[16px_22px] shadow-[0_16px_40px_-12px_rgba(27,23,38,0.5)] sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: 'linear-gradient(135deg, #1b1726, #2a2336)',
      }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <MedalRank rank={entry.rank} />
        <FoilAvatar initials={initials} size={42} />
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 truncate text-[16px] font-bold text-white">
            {displayName}
            <span className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-[7px] py-[2px] font-mono text-[10px] font-bold tracking-[0.08em] text-[#d97706]">
              {t('leaderRow.me')}
            </span>
          </div>
          <div className="font-mono text-[11px] tracking-[0.04em] text-white/60">
            {t('youBar.rankOfTotal', {
              rankOrdinal: ordinal(entry.rank, locale),
              total,
            })}
            {gapText && ` · ${gapText}`}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
        {stats.map((s) => (
          <div key={s.lab} className="flex flex-col items-center gap-[2px]">
            <span className="font-display text-[26px] font-extrabold leading-none tabular-nums text-white">
              {s.val}
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-white/60">
              {s.lab}
            </span>
          </div>
        ))}
        <Button
          variant="gradient"
          size="action"
          onClick={() => onJump(entry.rank)}
          className="gap-2 px-5 py-3 text-[15px] transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] motion-reduce:transform-none motion-reduce:transition-none"
        >
          {t('youBar.goThere')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
