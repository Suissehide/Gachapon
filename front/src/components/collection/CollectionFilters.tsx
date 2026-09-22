import type React from 'react'
import { useTranslation } from 'react-i18next'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import {
  type CardElement,
  ELEMENT_COLOR,
  ELEMENT_LABELS,
  ELEMENT_ORDER,
} from '../../constants/card.constant.ts'
import i18n from '../../i18n/index.ts'
import { RARITY_COLOR_VAR } from '../../libs/rarity.ts'
import { Select } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import { RARITY_ORDER } from './CollectionCard.tsx'

type Rarity = Card['rarity']
export type RarityFilter = Rarity | 'all'
export type VariantFilter = CardVariant | 'all'
export type ElementFilter = CardElement | 'all'
export type GroupMode = 'rarity' | 'set' | 'element'
export type OwnershipFilter = 'all' | 'owned'
export type SortMode = 'default' | 'power' | 'level' | 'copies' | 'name'

const GROUP_OPTIONS = [
  {
    value: 'rarity' as const,
    label: i18n.t('collection:filters.group.rarity'),
  },
  {
    value: 'element' as const,
    label: i18n.t('collection:filters.group.element'),
  },
  { value: 'set' as const, label: i18n.t('collection:filters.group.set') },
]

const ELEMENT_OPTIONS = [
  { value: 'all', label: i18n.t('collection:filters.allMasculine') },
  ...ELEMENT_ORDER.map((el) => ({
    value: el,
    label: ELEMENT_LABELS[el],
    icon: <RarityDot color={ELEMENT_COLOR[el]} />,
  })),
]

const VARIANT_OPTIONS = [
  { value: 'all', label: i18n.t('collection:filters.allMasculine') },
  { value: 'NORMAL', label: i18n.t('collection:filters.variant.normal') },
  {
    value: 'HOLOGRAPHIC',
    label: i18n.t('collection:filters.variant.holographic'),
    icon: <Swatch kind="holo" />,
  },
  {
    value: 'BRILLIANT',
    label: i18n.t('collection:filters.variant.brilliant'),
    icon: <Swatch kind="dore" />,
  },
]

const OWNERSHIP_OPTIONS = [
  {
    value: 'owned' as const,
    label: i18n.t('collection:filters.ownership.owned'),
  },
  { value: 'all' as const, label: i18n.t('collection:filters.ownership.all') },
]

// Copie locale de `RARITY_OPTIONS` (constants/card.constant.ts) : ces options
// qualifient une RARETÉ, donc accord au féminin — `common:rarity.*`
// (« Commune », « Peu commune »), comme la constante partagée corrigée en
// tâche 6, et non `common:cardRarity.*` (masculin) qu'elle lisait avant.
const RARITY_OPTIONS = [
  { value: 'all', label: i18n.t('collection:filters.allFeminine') },
  ...RARITY_ORDER.map((r) => ({
    value: r,
    label: i18n.t(`common:rarity.${r.toLowerCase()}`),
    icon: <RarityDot color={RARITY_COLOR_VAR[r]} />,
  })),
]

const SORT_OPTIONS = [
  { value: 'default', label: i18n.t('collection:filters.sort.default') },
  { value: 'power', label: i18n.t('collection:filters.sort.power') },
  { value: 'level', label: i18n.t('collection:filters.sort.level') },
  { value: 'copies', label: i18n.t('collection:filters.sort.copies') },
  { value: 'name', label: i18n.t('collection:filters.sort.name') },
]

interface Props {
  group: GroupMode
  onGroupChange: (mode: GroupMode) => void
  rarity: RarityFilter
  onRarityChange: (r: RarityFilter) => void
  variant: VariantFilter
  onVariantChange: (v: VariantFilter) => void
  element: ElementFilter
  onElementChange: (e: ElementFilter) => void
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
  element,
  onElementChange,
  ownership,
  onOwnershipChange,
  sort,
  onSortChange,
}: Props) {
  const { t } = useTranslation('collection')
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
        <FilterField
          id="filter-rarity"
          label={t('collection:filters.labels.rarity')}
        >
          <Select
            id="filter-rarity"
            options={RARITY_OPTIONS}
            value={rarity}
            onValueChange={(v) => onRarityChange(v as RarityFilter)}
            clearable={false}
          />
        </FilterField>
        <FilterField
          id="filter-variant"
          label={t('collection:filters.labels.variant')}
        >
          <Select
            id="filter-variant"
            options={VARIANT_OPTIONS}
            value={variant}
            onValueChange={(v) => onVariantChange(v as VariantFilter)}
            clearable={false}
          />
        </FilterField>
        <FilterField
          id="filter-element"
          label={t('collection:filters.labels.element')}
        >
          <Select
            id="filter-element"
            options={ELEMENT_OPTIONS}
            value={element}
            onValueChange={(v) => onElementChange(v as ElementFilter)}
            clearable={false}
          />
        </FilterField>
        <FilterField
          id="filter-sort"
          label={t('collection:filters.labels.sort')}
        >
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

export function FilterField({
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
