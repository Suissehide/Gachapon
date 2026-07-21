import type React from 'react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { RARITY_COLOR_VAR } from '../../libs/rarity.ts'
import { Select } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import { RARITY_LABELS, RARITY_ORDER } from './CollectionCard.tsx'

type Rarity = Card['rarity']
export type RarityFilter = Rarity | 'all'
export type VariantFilter = CardVariant | 'all'
export type GroupMode = 'rarity' | 'set'
export type OwnershipFilter = 'all' | 'owned'
export type SortMode = 'default' | 'power' | 'level' | 'copies' | 'name'

const GROUP_OPTIONS = [
  { value: 'rarity' as const, label: 'Par rareté' },
  { value: 'set' as const, label: 'Par set' },
]

const VARIANT_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HOLOGRAPHIC', label: 'Holo', icon: <Swatch kind="holo" /> },
  { value: 'BRILLIANT', label: 'Doré', icon: <Swatch kind="dore" /> },
]

const OWNERSHIP_OPTIONS = [
  { value: 'owned' as const, label: 'Possédées' },
  { value: 'all' as const, label: 'Toutes' },
]

const RARITY_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  ...RARITY_ORDER.map((r) => ({
    value: r,
    label: RARITY_LABELS[r],
    icon: <RarityDot color={RARITY_COLOR_VAR[r]} />,
  })),
]

const SORT_OPTIONS = [
  { value: 'default', label: 'Par défaut' },
  { value: 'power', label: 'Puissance' },
  { value: 'level', label: 'Niveau' },
  { value: 'copies', label: 'Doublons' },
  { value: 'name', label: 'Nom' },
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
  sort: SortMode
  onSortChange: (s: SortMode) => void
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
  sort,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — Ownership + Grouping */}
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
      </div>

      {/* Row 2 — Rarity / Variant / Sort selects */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <FilterField id="filter-rarity" label="Rareté">
          <Select
            id="filter-rarity"
            options={RARITY_OPTIONS}
            value={rarity}
            onValueChange={(v) => onRarityChange(v as RarityFilter)}
            clearable={false}
          />
        </FilterField>
        <FilterField id="filter-variant" label="Type">
          <Select
            id="filter-variant"
            options={VARIANT_OPTIONS}
            value={variant}
            onValueChange={(v) => onVariantChange(v as VariantFilter)}
            clearable={false}
          />
        </FilterField>
        <FilterField id="filter-sort" label="Tri">
          <Select
            id="filter-sort"
            options={SORT_OPTIONS}
            value={sort}
            onValueChange={(v) => onSortChange(v as SortMode)}
            clearable={false}
          />
        </FilterField>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex w-40 flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-text-light">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Divider() {
  return <span aria-hidden className="h-7 w-px bg-[rgba(27,23,38,0.12)]" />
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

export function RarityDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
      style={{ background: color }}
    />
  )
}
