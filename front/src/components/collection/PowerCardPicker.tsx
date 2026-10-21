import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCardsByPower } from '../../queries/useEquipment.ts'
import { Button } from '../ui/button.tsx'
import { Input, Select } from '../ui/input.tsx'
import { CollectionCard } from './CollectionCard.tsx'
import {
  ELEMENT_OPTIONS,
  type ElementFilter,
  FilterField,
  RARITY_OPTIONS,
  type RarityFilter,
} from './CollectionFilters.tsx'

// Toute la collection en faces de carte complètes fige le mobile, jusqu'au
// crash : on affiche par tranches, les plus puissantes d'abord.
const PAGE_SIZE = 24

/**
 * Grille de choix d'une carte possédée, triée par puissance décroissante,
 * avec recherche, filtres et « Charger plus ». Sert aux fenêtres
 * « Équiper sur… » et « Échanger l'équipement avec… ».
 */
export function PowerCardPicker({
  idPrefix,
  excludeUserCardId,
  onPick,
}: {
  idPrefix: string
  excludeUserCardId?: string
  onPick: (userCardId: string) => void
}) {
  const { t } = useTranslation('collection')
  const [search, setSearch] = useState('')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [element, setElement] = useState<ElementFilter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const query = search.trim().toLowerCase()
  const cards = useCardsByPower().filter(
    (uc) =>
      uc.id !== excludeUserCardId &&
      (rarity === 'all' || uc.card.rarity === rarity) &&
      (element === 'all' || uc.card.element === element) &&
      uc.card.name.toLowerCase().includes(query),
  )
  const remaining = cards.length - limit
  return (
    <>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <FilterField
          id={`${idPrefix}-search`}
          label={t('collection:cardPicker.searchLabel')}
        >
          <Input
            id={`${idPrefix}-search`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('collection:cardPicker.searchPlaceholder')}
          />
        </FilterField>
        <FilterField
          id={`${idPrefix}-rarity`}
          label={t('collection:filters.labels.rarity')}
        >
          <Select
            id={`${idPrefix}-rarity`}
            options={RARITY_OPTIONS}
            value={rarity}
            onValueChange={(v) => setRarity(v as RarityFilter)}
            clearable={false}
          />
        </FilterField>
        <FilterField
          id={`${idPrefix}-element`}
          label={t('collection:filters.labels.element')}
        >
          <Select
            id={`${idPrefix}-element`}
            options={ELEMENT_OPTIONS}
            value={element}
            onValueChange={(v) => setElement(v as ElementFilter)}
            clearable={false}
          />
        </FilterField>
      </div>
      {cards.length === 0 && (
        <p className="py-8 text-center text-sm text-text-light">
          {t('collection:cardPicker.empty')}
        </p>
      )}
      <div className="max-h-[55vh] overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.slice(0, limit).map((uc) => (
            <CollectionCard
              key={uc.id}
              card={uc.card}
              variant={uc.variant}
              // Pas de pastille ×N : les doublons n'ont pas de sens ici.
              quantity={1}
              isOwned
              userCardId={uc.id}
              level={uc.level}
              palier={uc.palier}
              onClick={() => onPick(uc.id)}
            />
          ))}
        </div>
        {remaining > 0 && (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
          >
            {t('collection:cardPicker.loadMore', { count: remaining })}
          </Button>
        )}
      </div>
    </>
  )
}
