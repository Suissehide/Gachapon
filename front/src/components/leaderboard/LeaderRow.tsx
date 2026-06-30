import { Zap } from 'lucide-react'

import { FoilAvatar } from '../profile/arcade/FoilAvatar'
import { cn } from '../../libs/utils'
import type {
  CollectorEntry,
  CombatEntry,
  TeamEntry,
} from '../../constants/leaderboard.constant'
import { ProgressBar } from './ProgressBar'
import { LevelChip } from './LevelChip'
import { MedalRank } from './MedalRank'

type Props =
  | { mode: 'collectors'; entry: CollectorEntry; isMe: boolean }
  | { mode: 'teams'; entry: TeamEntry; isMe: boolean }
  | { mode: 'combat'; entry: CombatEntry; isMe: boolean }

const fmt = (n: number) => n.toLocaleString('fr-FR')

export function LeaderRow(props: Props) {
  const { mode, entry, isMe } = props
  const displayName =
    mode === 'teams' ? entry.team.name : entry.user.username
  const initials = displayName.slice(0, 1).toUpperCase()

  return (
    <div
      className={cn(
        // 4-col grid on desktop, stacked on small screens.
        'grid items-center gap-x-5 gap-y-3 rounded-[16px] border p-4 transition-[transform,box-shadow,border-color] duration-200 sm:p-[16px_22px]',
        'grid-cols-[48px_1fr] sm:grid-cols-[48px_minmax(190px,1.1fr)_2fr_auto]',
        'hover:-translate-y-[1px] motion-reduce:transform-none motion-reduce:transition-none',
        isMe
          ? 'border-[#fcd34d] bg-[linear-gradient(135deg,#fff7ed,#fffdf9)] shadow-[0_2px_0_rgba(245,158,11,0.1),0_14px_30px_-16px_rgba(245,158,11,0.3)]'
          : 'border-[rgba(27,23,38,0.06)] bg-white shadow-[0_2px_0_rgba(27,23,38,0.03),0_10px_24px_-16px_rgba(27,23,38,0.1)] hover:border-[rgba(27,23,38,0.12)]',
      )}
    >
      {/* Rank */}
      <div className="flex justify-center">
        <MedalRank rank={entry.rank} />
      </div>

      {/* Identity */}
      <div className="flex min-w-0 items-center gap-[14px]">
        <FoilAvatar initials={initials} size={42} />
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="inline-flex items-center gap-2 truncate text-[16px] font-bold text-[#1b1726]">
            {displayName}
            {isMe && (
              <span className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-[7px] py-[2px] font-mono text-[10px] font-bold tracking-[0.08em] text-[#d97706]">
                moi
              </span>
            )}
          </span>
          <div className="mt-[3px]">
            {mode === 'teams' ? (
              <span className="font-mono text-[11px] tracking-[0.04em] text-[rgba(27,23,38,0.5)]">
                {entry.team.memberCount} membres
              </span>
            ) : (
              <LevelChip level={entry.user.level} />
            )}
          </div>
        </div>
      </div>

      {/* Bars — span full width on mobile (col 2), normal on sm+ (col 3) */}
      <div className="col-span-2 sm:col-span-1">
        {mode === 'combat' ? (
          <ProgressBar
            variant="combat"
            value={
              entry.maxPalier > 0
                ? (entry.palier / entry.maxPalier) * 100
                : 0
            }
            label="PALIER ATTEINT"
            displayValue={`${entry.palier} / ${entry.maxPalier}`}
          />
        ) : (
          <div className="grid grid-cols-2 gap-[18px]">
            <ProgressBar
              variant="cards"
              value={entry.cardPercentage}
              label="CARTES"
              displayValue={`${entry.cardPercentage}%`}
            />
            <ProgressBar
              variant="variants"
              value={entry.variantPercentage}
              label="VARIANTES"
              displayValue={`${entry.variantPercentage}%`}
            />
          </div>
        )}
      </div>

      {/* Side metric */}
      <div className="col-span-2 flex min-w-[96px] flex-col items-end gap-[2px] text-right sm:col-span-1">
        {mode === 'collectors' && (
          <>
            <span className="font-display text-[26px] font-extrabold leading-none tabular-nums text-[#1b1726]">
              {fmt(entry.pulls)}
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[rgba(27,23,38,0.5)]">
              TIRAGES
              {entry.legendaries > 0 ? ` · ${entry.legendaries} LÉG.` : ''}
            </span>
          </>
        )}
        {mode === 'teams' && (
          <>
            <span className="font-display text-[26px] font-extrabold leading-none tabular-nums text-[#1b1726]">
              {fmt(entry.pullsTotal)}
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[rgba(27,23,38,0.5)]">
              TIRAGES CUMULÉS
            </span>
          </>
        )}
        {mode === 'combat' && (
          <>
            <span className="inline-flex items-center gap-[5px] font-display text-[26px] font-extrabold leading-none tabular-nums text-[#ea580c]">
              <Zap size={18} className="text-[#f59e0b]" />
              {fmt(entry.combatPower)}
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[rgba(27,23,38,0.5)]">
              FORCE D'ÉQUIPE
            </span>
          </>
        )}
      </div>
    </div>
  )
}
