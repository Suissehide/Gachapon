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

// French pluralisation helper — anything other than 1 gets the -s.
// We can't just check `> 1` because 0 is plural in French ("0 jours").
const plural = (n: number, suffix = 's') => (n !== 1 ? suffix : '')

// ── Card rarity visual config ──────────────────────────────────────────────
// Keep visual identity centralised so the modal stays in sync with other
// rarity-aware components (CardReveal, etc.).
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

// Lower-rarity cards use the simple Gem; higher tiers get something flashier.
const RARITY_ICON: Record<CardRarity, LucideIcon> = {
  COMMON: Gem,
  UNCOMMON: Gem,
  RARE: Gem,
  EPIC: Star,
  LEGENDARY: Crown,
}

// ── Reward → primary display picker ───────────────────────────────────────
// A milestone can grant multiple reward types at once (tokens + dust + …).
// We display every type that's set, but pick a "primary" one for the headline
// label inside each tile (e.g. "150 Dust" or "Carte Rare").
type DisplayReward = {
  key: 'card' | 'tokens' | 'dust' | 'xp'
  icon: LucideIcon
  iconClass: string
  label: string
}

// Priority order — first match becomes the tile's "primary" reward (big orb +
// headline label). Tokens rank above dust because they're the rarer drop.
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
      iconClass: 'text-yellow-400',
      label: `${entry.tokens} Jeton${plural(entry.tokens)}`,
    })
  }
  if (entry.dust > 0) {
    rewards.push({
      key: 'dust',
      icon: Sparkles,
      iconClass: 'text-sky-400',
      label: `${entry.dust} Dust`,
    })
  }
  if (entry.xp > 0) {
    rewards.push({
      key: 'xp',
      icon: Star,
      iconClass: 'text-purple-400',
      label: `${entry.xp} XP`,
    })
  }
  return rewards
}

// ── 7-day window computation ──────────────────────────────────────────────
// Always render exactly 7 day tiles. The window slides as the streak grows,
// keeping today near the centre. Milestone days inside the visible window
// pop visually (gold/amber treatment) — same idea as the "Final" tile in the
// original mock-up, but inlined wherever the milestone actually lands.
const WINDOW_SIZE = 7

function buildWindow(
  summary: StreakSummary,
): { day: number; entry: StreakDayEntry; label: string }[] {
  const cycleDay =
    summary.streakDays === 0 ? 1 : ((summary.streakDays - 1) % 30) + 1

  // Centre on today, then clamp so we never overshoot the 30-day cycle.
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
  return `JOUR ${day}`
}

// ── Component ─────────────────────────────────────────────────────────────
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
      {/* overflow-hidden — keeps PopupBody's bg from spilling past the
          rounded corners of PopupContent. */}
      <PopupContent size="xl" className="overflow-hidden">
        <PopupHeader>
          <PopupTitle
            icon={<Flame className="h-4 w-4" />}
            subtitle="Connectez-vous chaque jour pour des bonus exclusifs"
          >
            Résumé des Récompenses
          </PopupTitle>
        </PopupHeader>

        <PopupBody>
          {isLoading || !data ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
    <div className="space-y-5">
      {/* ── 7-day window ── */}
      <div className="grid grid-cols-7 gap-1.5">
        {slots.map((slot) => (
          <DayTile key={slot.day} entry={slot.entry} label={slot.label} />
        ))}
      </div>

      {/* ── Streak banner ── */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-primary/5 px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/15">
          <Flame className="h-6 w-6 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">Vous êtes en feu&nbsp;!</p>
          <p className="text-xs text-text-light">
            {summary.streakDays} jour{plural(summary.streakDays)} consécutif
            {plural(summary.streakDays)}
            {daysToNextMilestone !== null && daysToNextMilestone > 0
              ? `. Plus que ${daysToNextMilestone} jour${plural(daysToNextMilestone)} pour le prochain jalon.`
              : '.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black leading-none tabular-nums text-text">
            {summary.streakDays}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-light">
            Jour{plural(summary.streakDays)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Tile renderer ─────────────────────────────────────────────────────────
// Status + isMilestone produce 6 visual variants. We model them as an enum-ish
// "kind" so the styling tables below stay readable.
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

  // Wrapper styling — milestone variants share an amber accent ramp,
  // non-milestone variants keep the original neutral/primary ramp.
  const wrapClass = (() => {
    switch (kind) {
      case 'current':
        return 'border-primary/60 bg-primary/10 ring-1 ring-primary/40 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.5)]'
      case 'current-milestone':
        return 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/60 shadow-[0_10px_28px_-10px_rgba(245,158,11,0.6)]'
      case 'past':
        return 'border-border/60 bg-card'
      case 'past-milestone':
        return 'border-amber-500/40 bg-amber-500/8'
      case 'future':
        return 'border-border bg-card'
      case 'future-milestone':
        return 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent'
    }
  })()

  const isMilestone = entry.isMilestone
  const isCurrent = entry.status === 'current'
  const isPast = entry.status === 'past'
  const isFuture = entry.status === 'future'

  // Chip label colour: milestones always amber, otherwise follows status.
  const dayChipClass = [
    'text-[9.5px] font-bold uppercase tracking-[0.12em] leading-none truncate w-full',
    isMilestone
      ? 'text-amber-500'
      : isCurrent
        ? 'text-primary'
        : 'text-text-light',
  ].join(' ')

  return (
    <div
      className={[
        'relative flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition-colors',
        wrapClass,
        isPast ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Milestone badge in the corner — clear visual cue independent of label */}
      {isMilestone && entry.status !== 'past' && (
        <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-50 shadow-sm">
          Jalon
        </span>
      )}

      <span className={dayChipClass}>{label}</span>

      <RewardOrb reward={primary} kind={kind} />

      {primary && (
        <span
          className={[
            'text-[10.5px] font-semibold leading-tight line-clamp-2',
            isFuture && !isMilestone ? 'text-text-light/60' : 'text-text',
            isMilestone && !isPast ? 'text-amber-600' : '',
          ].join(' ')}
        >
          {primary.label}
        </span>
      )}

      {/* Secondary rewards rendered as a thin icon strip when the milestone
          grants more than one type — keeps each tile information-dense without
          overwhelming the primary label. */}
      {rewards.length > 1 && (
        <div className="flex gap-0.5">
          {rewards.slice(1).map((r, i) => (
            <r.icon
              key={i}
              className={['h-2.5 w-2.5', r.iconClass].join(' ')}
            />
          ))}
        </div>
      )}

      {/* Past: tiny check badge in the corner */}
      {isPast && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
          <Check className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </div>
  )
}

// Orb behind the reward icon — colour shifts with status × milestone.
// Filled variants (current / milestone-current) carry their own contrast,
// so the icon adopts the bubble's foreground colour. Faded variants let the
// reward's intrinsic colour (e.g. rarity tint) show through.
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
            'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgba(99,102,241,0.7)]',
          useBubbleFg: true,
        }
      case 'current-milestone':
        return {
          orbClass:
            'bg-amber-500 text-amber-50 shadow-[0_8px_22px_-6px_rgba(245,158,11,0.7)]',
          useBubbleFg: true,
        }
      case 'past':
        return { orbClass: 'bg-primary/15 text-primary/70', useBubbleFg: false }
      case 'past-milestone':
        return {
          orbClass: 'bg-amber-500/20 text-amber-500/80',
          useBubbleFg: false,
        }
      case 'future':
        return {
          orbClass: 'bg-card-foreground/5 text-text-light/60',
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
