import { Gem, Layers, Sparkles } from 'lucide-react'

import type { Card } from '../../api/collection.api.ts'
import DropdownFilter from '../ui/dropdownFilter.tsx'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import { RARITY_LABELS, RARITY_ORDER } from './CollectionCard.tsx'

type Rarity = Card['rarity']
type Variant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

const DISPLAY_MODE_OPTIONS = [
  { value: 'rarity' as const, label: 'Par rareté' },
  { value: 'set' as const, label: 'Par set' },
]

const RARITY_COLOR: Record<string, string> = {
  COMMON:    'text-text-light',
  UNCOMMON:  'text-green-400',
  RARE:      'text-accent',
  EPIC:      'text-secondary',
  LEGENDARY: 'text-primary',
}

const VARIANT_OPTIONS = [
  {
    id: 'NORMAL' as Variant,
    label: 'Normal',
    icon: <Layers className="h-3.5 w-3.5" />,
    colorClass: 'text-text-light',
  },
  {
    id: 'BRILLIANT' as Variant,
    label: 'Brillante',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    colorClass: 'text-yellow-400',
  },
  {
    id: 'HOLOGRAPHIC' as Variant,
    label: 'Holographique',
    icon: <Gem className="h-3.5 w-3.5" />,
    colorClass: 'text-indigo-400',
  },
]

interface CollectionFiltersProps {
  displayMode: 'rarity' | 'set'
  onDisplayModeChange: (mode: 'rarity' | 'set') => void
  selectedRarities: Rarity[]
  onRaritiesChange: (rarities: Rarity[]) => void
  selectedVariants: Variant[]
  onVariantsChange: (variants: Variant[]) => void
}

export function CollectionFilters({
  displayMode,
  onDisplayModeChange,
  selectedRarities,
  onRaritiesChange,
  selectedVariants,
  onVariantsChange,
}: CollectionFiltersProps) {
  const rarityFilters = RARITY_ORDER.map((r) => ({
    id: r,
    label: RARITY_LABELS[r],
    checked: selectedRarities.includes(r),
    colorClass: RARITY_COLOR[r],
  }))

  const variantFilters = VARIANT_OPTIONS.map((v) => ({
    id: v.id,
    label: v.label,
    checked: selectedVariants.includes(v.id),
    icon: v.icon,
    colorClass: v.colorClass,
  }))

  const handleRarityChange = (id: string, checked: boolean) => {
    const rarity = id as Rarity
    onRaritiesChange(
      checked
        ? [...selectedRarities, rarity]
        : selectedRarities.filter((r) => r !== rarity),
    )
  }

  const handleVariantChange = (id: string, checked: boolean) => {
    const variant = id as Variant
    onVariantsChange(
      checked
        ? [...selectedVariants, variant]
        : selectedVariants.filter((v) => v !== variant),
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <SegmentedControl
        options={DISPLAY_MODE_OPTIONS}
        value={displayMode}
        onChange={onDisplayModeChange}
      />

      {displayMode === 'rarity' && (
        <>
          <div className="h-5 w-px bg-border/60" />
          <DropdownFilter
            label="Rareté"
            filters={rarityFilters}
            onFilterChange={handleRarityChange}
            onClear={() => onRaritiesChange([])}
          />
          <DropdownFilter
            label="Variante"
            filters={variantFilters}
            onFilterChange={handleVariantChange}
            onClear={() => onVariantsChange([])}
          />
        </>
      )}
    </div>
  )
}
