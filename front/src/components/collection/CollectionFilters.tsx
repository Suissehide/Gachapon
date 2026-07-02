import type { Card, CardVariant } from '../../api/collection.api.ts'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import { RARITY_LABELS, RARITY_ORDER } from './CollectionCard.tsx'

type Rarity = Card['rarity']
export type RarityFilter = Rarity | 'all'
export type VariantFilter = CardVariant | 'all'
export type GroupMode = 'rarity' | 'set'
export type OwnershipFilter = 'all' | 'owned'

const RARITY_HEX: Record<string, string> = {
  COMMON: '#22c55e',
  UNCOMMON: '#3b82f6',
  RARE: '#8b5cf6',
  EPIC: '#ec4899',
  LEGENDARY: '#f59e0b',
}

const GROUP_OPTIONS = [
  { value: 'rarity' as const, label: 'Par rareté' },
  { value: 'set' as const, label: 'Par set' },
]

const VARIANT_OPTIONS = [
  { value: 'all' as const, label: 'Toutes' },
  { value: 'NORMAL' as const, label: 'Normal' },
  {
    value: 'HOLOGRAPHIC' as const,
    label: 'Holo',
    icon: <Swatch kind="holo" />,
  },
  {
    value: 'BRILLIANT' as const,
    label: 'Doré',
    icon: <Swatch kind="dore" />,
  },
]

const OWNERSHIP_OPTIONS = [
  { value: 'owned' as const, label: 'Possédées' },
  { value: 'all' as const, label: 'Toutes' },
]

const RARITY_OPTIONS: {
  value: RarityFilter
  label: string
  icon?: React.ReactNode
}[] = [
  { value: 'all', label: 'Toutes' },
  ...RARITY_ORDER.map((r) => ({
    value: r as RarityFilter,
    label: RARITY_LABELS[r],
    icon: <RarityDot color={RARITY_HEX[r]} />,
  })),
]

interface Props {
  group: GroupMode
  onGroupChange: (mode: GroupMode) => void
  rarity: RarityFilter
  onRarityChange: (r: RarityFilter) => void
  variant: VariantFilter
  onVariantChange: (v: VariantFilter) => void
  ownership: OwnershipFilter
  onOwnershipChange: (o: OwnershipFilter) => void
}

export function CollectionFilters({
  group,
  onGroupChange,
  rarity,
  onRarityChange,
  variant,
  onVariantChange,
  ownership,
  onOwnershipChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — Ownership + Grouping + Variant */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <SegmentedControl
          options={OWNERSHIP_OPTIONS}
          value={ownership}
          onChange={onOwnershipChange}
        />
        <Divider />
        <SegmentedControl
          options={GROUP_OPTIONS}
          value={group}
          onChange={onGroupChange}
        />
        <Divider />
        <SegmentedControl
          options={VARIANT_OPTIONS}
          value={variant}
          onChange={onVariantChange}
        />
      </div>

      {/* Row 2 — Rarity */}
      <div className="flex flex-wrap">
        <SegmentedControl
          options={RARITY_OPTIONS}
          value={rarity}
          onChange={onRarityChange}
        />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return (
    <span
      aria-hidden
      className="h-7 w-px bg-[rgba(27,23,38,0.12)]"
    />
  )
}

function Swatch({ kind }: { kind: 'holo' | 'dore' }) {
  const bg =
    kind === 'holo'
      ? 'linear-gradient(115deg, #f9a8d4, #93c5fd, #86efac, #fcd34d)'
      : 'linear-gradient(135deg, #fde68a, #f59e0b)'
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_0_0_1px_rgba(27,23,38,0.08)]"
      style={{ background: bg }}
    />
  )
}

function RarityDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
      style={{ background: color }}
    />
  )
}
