import type { Card, CardVariant } from '../../api/collection.api.ts'
import { Button } from '../ui/button.tsx'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import { RARITY_LABELS, RARITY_ORDER } from './CollectionCard.tsx'

type Rarity = Card['rarity']
export type RarityFilter = Rarity | 'all'
export type VariantFilter = CardVariant | 'all'
export type GroupMode = 'rarity' | 'set'

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

interface Props {
  group: GroupMode
  onGroupChange: (mode: GroupMode) => void
  rarity: RarityFilter
  onRarityChange: (r: RarityFilter) => void
  variant: VariantFilter
  onVariantChange: (v: VariantFilter) => void
}

export function CollectionFilters({
  group,
  onGroupChange,
  rarity,
  onRarityChange,
  variant,
  onVariantChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — Grouping + Variant */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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

      {/* Row 2 — Rarity chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <RarityChip
          label="Toutes"
          active={rarity === 'all'}
          onClick={() => onRarityChange('all')}
        />
        {RARITY_ORDER.map((r) => (
          <RarityChip
            key={r}
            label={RARITY_LABELS[r]}
            color={RARITY_HEX[r]}
            active={rarity === r}
            onClick={() => onRarityChange(r)}
          />
        ))}
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

function RarityChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  const activeColored = active && color
  const activeNeutral = active && !color

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`h-auto gap-1.5 rounded-full border px-3 py-[5px] font-body text-[12px] font-semibold transition-all duration-200 ${
        activeColored
          ? 'text-text shadow-[0_1px_3px_rgba(27,23,38,0.08)]'
          : activeNeutral
            ? 'border-[#1b1726] bg-[#1b1726] text-white hover:bg-[#1b1726] hover:text-white'
            : 'border-[rgba(27,23,38,0.12)] bg-card text-text-light/70 hover:border-[rgba(27,23,38,0.24)] hover:bg-card hover:text-text'
      }`}
      style={
        activeColored
          ? {
              backgroundColor: `color-mix(in oklab, ${color} 14%, white)`,
              borderColor: `color-mix(in oklab, ${color} 65%, transparent)`,
            }
          : undefined
      }
    >
      {color && (
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-opacity duration-150 ${
            active ? 'opacity-100' : 'opacity-70'
          }`}
          style={{ background: color }}
        />
      )}
      {label}
    </Button>
  )
}
