import { Check, Coins, Crown, Flame, Gem, Sparkles, Star } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

import type { CardRarity } from '../../constants/card.constant.ts'
import type {
  StreakDayEntry,
  StreakSummary,
} from '../../constants/streak.constant.ts'
import { useStreakSummary } from '../../queries/useStreak.ts'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type Props = {
  open: boolean
  onClose: () => void
}

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>

const plural = (n: number, suffix = 's') => (n !== 1 ? suffix : '')

// ── Rarity visual config ──────────────────────────────────────────────────
const RARITY_LABEL: Record<CardRarity, string> = {
  COMMON: 'Commune',
  UNCOMMON: 'Peu commune',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

const RARITY_ICON_COLOR: Record<CardRarity, string> = {
  COMMON: 'text-slate-300',
  UNCOMMON: 'text-emerald-400',
  RARE: 'text-sky-400',
  EPIC: 'text-violet-400',
  LEGENDARY: 'text-amber-400',
}

const RARITY_ICON: Record<CardRarity, LucideIcon> = {
  COMMON: Gem,
  UNCOMMON: Gem,
  RARE: Gem,
  EPIC: Star,
  LEGENDARY: Crown,
}

// ── Reward picker ─────────────────────────────────────────────────────────
type DisplayReward = {
  key: 'card' | 'tokens' | 'dust' | 'xp'
  icon: LucideIcon
  iconClass: string
  label: string
}

function getDisplayRewards(
  entry: Pick<StreakDayEntry, 'tokens' | 'dust' | 'xp' | 'cardRarity'>,
): DisplayReward[] {
  const rewards: DisplayReward[] = []
  if (entry.cardRarity) {
    rewards.push({
      key: 'card',
      icon: RARITY_ICON[entry.cardRarity],
      iconClass: RARITY_ICON_COLOR[entry.cardRarity],
      label: `Carte ${RARITY_LABEL[entry.cardRarity]}`,
    })
  }
  if (entry.tokens > 0) {
    rewards.push({
      key: 'tokens',
      icon: Coins,
      iconClass: 'text-amber-400',
      label: `${entry.tokens} Jeton${plural(entry.tokens)}`,
    })
  }
  if (entry.dust > 0) {
    rewards.push({
      key: 'dust',
      icon: Sparkles,
      iconClass: 'text-violet-400',
      label: `${entry.dust} poussière`,
    })
  }
  if (entry.xp > 0) {
    rewards.push({
      key: 'xp',
      icon: Star,
      iconClass: 'text-pink-400',
      label: `${entry.xp} XP`,
    })
  }
  return rewards
}

// ── 7-day window ──────────────────────────────────────────────────────────
const WINDOW_SIZE = 7

function buildWindow(
  summary: StreakSummary,
): { day: number; entry: StreakDayEntry; label: string }[] {
  const cycleDay =
    summary.streakDays === 0 ? 1 : ((summary.streakDays - 1) % 30) + 1

  let start = cycleDay - 2
  if (start < 1) {
    start = 1
  }
  if (start > 30 - WINDOW_SIZE + 1) {
    start = 30 - WINDOW_SIZE + 1
  }

  const slots: { day: number; entry: StreakDayEntry; label: string }[] = []
  for (let offset = 0; offset < WINDOW_SIZE; offset++) {
    const day = start + offset
    const entry = summary.days[day - 1]
    if (!entry) {
      continue
    }
    slots.push({ day, entry, label: labelForDay(day, cycleDay) })
  }
  return slots
}

function labelForDay(day: number, cycleDay: number): string {
  if (day === cycleDay) {
    return "AUJOURD'HUI"
  }
  if (day === cycleDay + 1) {
    return 'DEMAIN'
  }
  return `J${day}`
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function StreakSummaryModal({ open, onClose }: Props) {
  const { data, isLoading } = useStreakSummary()

  return (
    <Popup
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose()
        }
      }}
    >
      <PopupContent size="xl" className="overflow-hidden">
        <PopupHeader className="border-b-0 pb-2">
          <PopupTitle
            icon={<Flame className="h-4 w-4" />}
            subtitle="Connecte-toi chaque jour pour des bonus exclusifs"
          >
            <span className="font-display tracking-tight">
              Streak de connexion
            </span>
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="bg-transparent">
          {isLoading || !data ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : (
            <StreakBody summary={data} />
          )}
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}

function StreakBody({ summary }: { summary: StreakSummary }) {
  const slots = buildWindow(summary)
  const cycleDay =
    summary.streakDays === 0 ? 0 : ((summary.streakDays - 1) % 30) + 1
  const daysToNextMilestone = summary.nextMilestone
    ? Math.max(0, summary.nextMilestone.day - cycleDay)
    : null

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/30 p-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(236,72,153,0.06) 60%, transparent)',
        }}
      >
        <div
          className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.4), transparent 70%)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_8px_24px_-6px_rgba(245,158,11,0.5)]">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700/80">
              Tu es en feu
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-4xl font-black leading-none tabular-nums text-text">
                {summary.streakDays}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-light">
                jour{plural(summary.streakDays)} consécutif
                {plural(summary.streakDays)}
              </span>
            </div>
            {daysToNextMilestone !== null && daysToNextMilestone > 0 && (
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-light/80 mt-1">
                Prochain jalon dans{' '}
                <span className="font-bold text-amber-600">
                  {daysToNextMilestone} jour{plural(daysToNextMilestone)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 7-day window ── */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-text-light">
            Cycle en cours
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-light/70 tabular-nums">
            Jour {cycleDay} / 30
          </span>
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pt-2.5 pb-1">
          <div className="grid min-w-[420px] grid-cols-7 gap-1.5">
            {slots.map((slot) => (
              <DayTile key={slot.day} entry={slot.entry} label={slot.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tile ──────────────────────────────────────────────────────────────────
type TileKind =
  | 'past'
  | 'past-milestone'
  | 'current'
  | 'current-milestone'
  | 'future'
  | 'future-milestone'

function tileKind(entry: StreakDayEntry): TileKind {
  const base = entry.status
  return entry.isMilestone ? (`${base}-milestone` as TileKind) : base
}

function DayTile({ entry, label }: { entry: StreakDayEntry; label: string }) {
  const rewards = getDisplayRewards(entry)
  const primary = rewards[0]
  const kind = tileKind(entry)

  const wrapClass = (() => {
    switch (kind) {
      case 'current':
        return 'border-amber-400/60 bg-amber-400/10 shadow-[0_8px_22px_-10px_rgba(245,158,11,0.5)]'
      case 'current-milestone':
        return 'border-amber-500 bg-gradient-to-br from-amber-400/25 to-amber-500/10 shadow-[0_10px_28px_-8px_rgba(245,158,11,0.7)]'
      case 'past':
        return 'border-border/60 bg-card'
      case 'past-milestone':
        return 'border-amber-500/30 bg-amber-500/8'
      case 'future':
        return 'border-border bg-card/50'
      case 'future-milestone':
        return 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent'
    }
  })()

  const isMilestone = entry.isMilestone
  const isCurrent = entry.status === 'current'
  const isPast = entry.status === 'past'
  const isFuture = entry.status === 'future'

  const dayChipClass = [
    'font-mono text-[9px] font-bold uppercase tracking-[0.15em] leading-none truncate w-full',
    isMilestone
      ? 'text-amber-600'
      : isCurrent
        ? 'text-amber-500'
        : 'text-text-light/70',
  ].join(' ')

  return (
    <div
      className={[
        'relative flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1.5 py-3 text-center transition-colors',
        wrapClass,
        isPast ? 'opacity-50' : '',
      ].join(' ')}
    >
      {isMilestone && entry.status !== 'past' && (
        <span
          className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-wider text-amber-50 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          }}
        >
          Jalon
        </span>
      )}

      <span className={dayChipClass}>{label}</span>

      <RewardOrb reward={primary} kind={kind} />

      {primary && (
        <span
          className={[
            'font-display text-[10.5px] font-bold leading-tight line-clamp-2',
            isFuture && !isMilestone ? 'text-text-light/60' : 'text-text',
            isMilestone && !isPast ? 'text-amber-700' : '',
          ].join(' ')}
        >
          {primary.label}
        </span>
      )}

      {rewards.length > 1 && (
        <div className="flex gap-0.5">
          {rewards.slice(1).map((r) => (
            <r.icon
              key={r.key}
              className={['h-2.5 w-2.5', r.iconClass].join(' ')}
            />
          ))}
        </div>
      )}

      {isPast && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
          <Check className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </div>
  )
}

// ── Orb ───────────────────────────────────────────────────────────────────
function RewardOrb({
  reward,
  kind,
}: {
  reward: DisplayReward | undefined
  kind: TileKind
}) {
  const { orbClass, useBubbleFg } = (() => {
    switch (kind) {
      case 'current':
        return {
          orbClass:
            'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-[0_6px_18px_-6px_rgba(245,158,11,0.7)]',
          useBubbleFg: true,
        }
      case 'current-milestone':
        return {
          orbClass:
            'bg-gradient-to-br from-amber-400 via-amber-500 to-pink-500 text-white shadow-[0_8px_22px_-6px_rgba(236,72,153,0.6)]',
          useBubbleFg: true,
        }
      case 'past':
        return {
          orbClass: 'bg-amber-500/15 text-amber-500/70',
          useBubbleFg: false,
        }
      case 'past-milestone':
        return {
          orbClass: 'bg-amber-500/20 text-amber-600/80',
          useBubbleFg: false,
        }
      case 'future':
        return {
          orbClass: 'bg-muted text-text-light/50',
          useBubbleFg: false,
        }
      case 'future-milestone':
        return {
          orbClass: 'bg-amber-500/15 text-amber-500',
          useBubbleFg: false,
        }
    }
  })()

  return (
    <span
      className={[
        'flex h-10 w-10 items-center justify-center rounded-full',
        orbClass,
      ].join(' ')}
    >
      {reward ? (
        <reward.icon
          className={[
            'h-4.5 w-4.5',
            useBubbleFg ? 'text-current' : reward.iconClass,
          ].join(' ')}
          width={18}
          height={18}
        />
      ) : (
        <Sparkles className="h-4 w-4 opacity-30" />
      )}
    </span>
  )
}
