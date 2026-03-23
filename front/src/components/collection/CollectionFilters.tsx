import type { Card } from '../../api/collection.api.ts'
import { SegmentedControl } from '../ui/segmentedControl.tsx'
import {
  RARITY_CHIP_ACTIVE,
  RARITY_CHIP_INACTIVE,
  RARITY_LABELS,
  RARITY_ORDER,
} from './CollectionCard.tsx'
import { FilterChip } from './FilterChip.tsx'

type Rarity = Card['rarity']
type Variant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

const DISPLAY_MODE_OPTIONS = [
  { value: 'rarity' as const, label: 'Par rareté' },
  { value: 'set' as const, label: 'Par set' },
]

interface CollectionFiltersProps {
  displayMode: 'rarity' | 'set'
  onDisplayModeChange: (mode: 'rarity' | 'set') => void
  selectedRarity: Rarity | null
  onRarityChange: (rarity: Rarity | null) => void
  selectedVariant: Variant | null
  onVariantChange: (variant: Variant | null) => void
}

export function CollectionFilters({
  displayMode,
  onDisplayModeChange,
  selectedRarity,
  onRarityChange,
  selectedVariant,
  onVariantChange,
}: CollectionFiltersProps) {
  return (
    <div className="flex flex-col items-end gap-3">
      <SegmentedControl
        options={DISPLAY_MODE_OPTIONS}
        value={displayMode}
        onChange={onDisplayModeChange}
      />

      {/* Filtres rareté + variante — masqués en mode Par set */}
      {displayMode === 'rarity' && (
        <>
          {/* Groupe Rareté */}
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-text-light/50">
              Rareté
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {RARITY_ORDER.map((r) => (
                <FilterChip
                  key={r}
                  label={RARITY_LABELS[r]}
                  isActive={selectedRarity === r}
                  activeClass={RARITY_CHIP_ACTIVE[r]}
                  inactiveClass={RARITY_CHIP_INACTIVE[r]}
                  onClick={() =>
                    onRarityChange(selectedRarity === r ? null : r)
                  }
                />
              ))}
            </div>
          </div>

          {/* Groupe Variante */}
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-text-light/50">
              Variante
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <FilterChip
                label="Normal"
                isActive={selectedVariant === 'NORMAL'}
                activeClass="border-border text-text bg-border/20"
                inactiveClass="border-border/60 text-text-light/60"
                onClick={() =>
                  onVariantChange(
                    selectedVariant === 'NORMAL' ? null : 'NORMAL',
                  )
                }
              />
              <FilterChip
                label="✨ Brillante"
                isActive={selectedVariant === 'BRILLIANT'}
                activeClass="border-yellow-400 text-yellow-300 bg-yellow-400/10"
                inactiveClass="border-yellow-400/40 text-yellow-300/60"
                onClick={() =>
                  onVariantChange(
                    selectedVariant === 'BRILLIANT' ? null : 'BRILLIANT',
                  )
                }
              />
              <FilterChip
                label="🌈 Holographique"
                isActive={selectedVariant === 'HOLOGRAPHIC'}
                activeClass="border-indigo-400 text-indigo-300 bg-indigo-400/10"
                inactiveClass="border-indigo-400/40 text-indigo-300/60"
                onClick={() =>
                  onVariantChange(
                    selectedVariant === 'HOLOGRAPHIC' ? null : 'HOLOGRAPHIC',
                  )
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
