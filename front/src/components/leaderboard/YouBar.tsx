import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import type {
  CollectorEntry,
  CombatEntry,
  TeamEntry,
} from '../../constants/leaderboard.constant'
import { FoilAvatar } from '../profile/arcade/FoilAvatar'
import { MedalRank } from './MedalRank'

type Props =
  | {
      mode: 'collectors'
      entry: CollectorEntry
      entries: CollectorEntry[]
      total: number
    }
  | {
      mode: 'teams'
      entry: TeamEntry
      entries: TeamEntry[]
      total: number
    }
  | {
      mode: 'combat'
      entry: CombatEntry
      entries: CombatEntry[]
      total: number
    }

const ordinalFr = (n: number) => (n === 1 ? '1er' : `${n}e`)
const fmt = (n: number) => n.toLocaleString('fr-FR')

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
  return entries[entries.length - 1] ?? null
}

export function YouBar(props: Props) {
  const { mode, entry, entries, total } = props
  if (entry.rank === 1) {
    return null
  }

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
      gapText = `à ${g}% du ${ordinalFr(aboveRank)}`
    } else {
      const g = Math.max(0, (above as CombatEntry).palier - entry.palier)
      gapText = `à ${g} palier${g > 1 ? 's' : ''} du ${ordinalFr(aboveRank)}`
    }
  }

  const displayName = mode === 'teams' ? entry.team.name : entry.user.username
  const initials = displayName.slice(0, 1).toUpperCase()

  const stats =
    mode === 'collectors' || mode === 'teams'
      ? [
          { lab: 'CARTES', val: `${entry.cardPercentage}%` },
          { lab: 'VARIANTES', val: `${entry.variantPercentage}%` },
        ]
      : [
          { lab: 'PALIER', val: `${entry.palier} / ${entry.maxPalier}` },
          { lab: 'FORCE', val: fmt(entry.combatPower) },
        ]

  const ctaTo: '/play' | '/combat' = mode === 'combat' ? '/combat' : '/play'

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
              moi
            </span>
          </div>
          <div className="font-mono text-[11px] tracking-[0.04em] text-white/60">
            {ordinalFr(entry.rank)} sur {total}
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
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-2 rounded-[12px] px-5 py-3 text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(236,72,153,0.4)] transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_26px_rgba(236,72,153,0.5)] motion-reduce:transform-none motion-reduce:transition-none"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
          }}
        >
          Grimper
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
