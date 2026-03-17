# Collection Filters & Display Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un toggle Par rareté/Par set, les couleurs de rareté sur les chips de filtre, et un filtre variante (Brillante/Holographique) dans la page "Ma Collection".

**Architecture:** Toutes les cartes sont chargées une seule fois sans filtre API, le filtrage se fait côté client via `useMemo`. Les composants sont extraits dans `front/src/components/collection/`. `collection.tsx` ne gère que l'état et délègue l'affichage.

**Tech Stack:** React 18, TypeScript, TanStack Query, Tailwind CSS, `class-variance-authority`, composant `Button` depuis `components/ui/button.tsx`.

---

## File Map

| Action | Fichier |
|---|---|
| Créer | `front/src/components/collection/CollectionCard.tsx` |
| Créer | `front/src/components/collection/FilterChip.tsx` |
| Créer | `front/src/components/collection/CollectionGrid.tsx` |
| Créer | `front/src/components/collection/CollectionSetGroup.tsx` |
| Créer | `front/src/components/collection/CollectionFilters.tsx` |
| Modifier | `front/src/routes/_authenticated/collection.tsx` |
| Supprimer | `front/src/components/custom/collectionCard.tsx` |

---

## Task 1 : Déplacer CollectionCard + ajouter les constantes RARITY_CHIP

**Files:**
- Create: `front/src/components/collection/CollectionCard.tsx`
- Delete: `front/src/components/custom/collectionCard.tsx`

- [ ] **Step 1 : Créer le dossier et le fichier CollectionCard**

Copier le contenu de `front/src/components/custom/collectionCard.tsx` dans `front/src/components/collection/CollectionCard.tsx`, puis ajouter les deux nouvelles constantes après `RARITY_COLORS` :

```tsx
// front/src/components/collection/CollectionCard.tsx
import { RefreshCw } from 'lucide-react'

import type { Card } from '../../api/collection.api.ts'

export const RARITY_ORDER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const

export const RARITY_COLORS: Record<string, string> = {
  COMMON: 'border-border text-text-light',
  UNCOMMON: 'border-green-500/40 text-green-400',
  RARE: 'border-accent/40 text-accent',
  EPIC: 'border-secondary/40 text-secondary',
  LEGENDARY: 'border-primary/50 text-primary',
}

export const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

export const RARITY_CHIP_INACTIVE: Record<string, string> = {
  COMMON: 'border-border/60 text-text-light/60',
  UNCOMMON: 'border-green-500/40 text-green-400/60',
  RARE: 'border-accent/40 text-accent/60',
  EPIC: 'border-secondary/40 text-secondary/60',
  LEGENDARY: 'border-primary/40 text-primary/60',
}

export const RARITY_CHIP_ACTIVE: Record<string, string> = {
  COMMON: 'border-border text-text-light bg-border/20',
  UNCOMMON: 'border-green-500 text-green-400 bg-green-500/10',
  RARE: 'border-accent text-accent bg-accent/10',
  EPIC: 'border-secondary text-secondary bg-secondary/10',
  LEGENDARY: 'border-primary text-primary bg-primary/10',
}

export function CollectionCard({
  card,
  quantity,
  isOwned,
  onRecycle,
  recycling,
}: {
  card: Card
  quantity: number
  isOwned: boolean
  onRecycle: () => void
  recycling: boolean
}) {
  return (
    <div className="group relative">
      <div
        className={`relative aspect-[3/4] rounded-xl overflow-hidden border transition-transform duration-200 group-hover:-translate-y-0.5 ${
          isOwned
            ? (RARITY_COLORS[card.rarity]?.split(' ')[0] ?? 'border-border')
            : 'border-border'
        }`}
      >
        {isOwned ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="h-full w-full bg-muted/40 flex items-center justify-center">
            <div
              className="h-3/4 w-full opacity-20"
              style={{
                backgroundImage: `url(${card.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0)',
              }}
            />
          </div>
        )}

        {quantity > 1 && (
          <div className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            ×{quantity}
          </div>
        )}

        {card.variant && isOwned && (
          <div className="absolute top-1 left-1 text-xs">
            {card.variant === 'BRILLIANT' ? '✨' : '🌈'}
          </div>
        )}
      </div>

      <div className="mt-1 px-0.5">
        <p className="truncate text-[10px] font-semibold text-text-light">
          {isOwned ? card.name : '???'}
        </p>
      </div>

      {quantity > 1 && (
        <button
          type="button"
          onClick={onRecycle}
          disabled={recycling}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-yellow-400 hover:bg-black transition-colors"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Recycler
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Supprimer l'ancien fichier**

```bash
rm front/src/components/custom/collectionCard.tsx
```

- [ ] **Step 3 : Vérifier que TypeScript compile sans erreur**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

Expected : des erreurs d'import dans `collection.tsx` (on les corrigera dans la dernière tâche) mais **pas** d'erreurs dans le nouveau `CollectionCard.tsx`.

- [ ] **Step 4 : Commit**

```bash
git add front/src/components/collection/CollectionCard.tsx
git rm front/src/components/custom/collectionCard.tsx
git commit -m "refactor: move CollectionCard to collection/ + add RARITY_CHIP constants"
```

---

## Task 2 : Créer FilterChip

**Files:**
- Create: `front/src/components/collection/FilterChip.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// front/src/components/collection/FilterChip.tsx
import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'

interface FilterChipProps {
  label: string
  isActive: boolean
  activeClass: string
  inactiveClass: string
  onClick: () => void
}

export function FilterChip({
  label,
  isActive,
  activeClass,
  inactiveClass,
  onClick,
}: FilterChipProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'rounded-full border h-auto px-3 py-1 text-xs font-semibold',
        isActive ? activeClass : inactiveClass,
        isActive
          ? 'hover:opacity-90'
          : 'hover:border-primary/40',
      )}
    >
      {label}
    </Button>
  )
}
```

- [ ] **Step 2 : Vérifier compilation**

```bash
cd front && npx tsc --noEmit 2>&1 | grep -i "FilterChip" || echo "OK"
```

Expected : aucune erreur liée à `FilterChip.tsx`.

- [ ] **Step 3 : Commit**

```bash
git add front/src/components/collection/FilterChip.tsx
git commit -m "feat: add FilterChip component"
```

---

## Task 3 : Créer CollectionGrid

**Files:**
- Create: `front/src/components/collection/CollectionGrid.tsx`

- [ ] **Step 1 : Créer le composant**

C'est l'extraction directe du JSX grille de `collection.tsx` :

```tsx
// front/src/components/collection/CollectionGrid.tsx
import type { Card } from '../../api/collection.api.ts'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionGridProps {
  cards: Card[]
  owned: Map<string, number>
  onRecycle: (cardId: string) => void
  recyclingId: string | null
}

export function CollectionGrid({
  cards,
  owned,
  onRecycle,
  recyclingId,
}: CollectionGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-text-light">Aucune carte ne correspond à ces filtres.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {cards.map((card) => {
        const qty = owned.get(card.id) ?? 0
        return (
          <CollectionCard
            key={card.id}
            card={card}
            quantity={qty}
            isOwned={qty > 0}
            onRecycle={() => onRecycle(card.id)}
            recycling={recyclingId === card.id}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier compilation**

```bash
cd front && npx tsc --noEmit 2>&1 | grep -i "CollectionGrid" || echo "OK"
```

- [ ] **Step 3 : Commit**

```bash
git add front/src/components/collection/CollectionGrid.tsx
git commit -m "feat: add CollectionGrid component"
```

---

## Task 4 : Créer CollectionSetGroup

**Files:**
- Create: `front/src/components/collection/CollectionSetGroup.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// front/src/components/collection/CollectionSetGroup.tsx
import type { Card } from '../../api/collection.api.ts'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionSetGroupProps {
  setName: string
  cards: Card[]
  owned: Map<string, number>
  onRecycle: (cardId: string) => void
  recyclingId: string | null
}

export function CollectionSetGroup({
  setName,
  cards,
  owned,
  onRecycle,
  recyclingId,
}: CollectionSetGroupProps) {
  const ownedCount = cards.filter((c) => owned.has(c.id)).length

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-light">
          {setName} · {ownedCount} / {cards.length}
        </span>
        <span className="h-px flex-1 bg-border/40" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {cards.map((card) => {
          const qty = owned.get(card.id) ?? 0
          return (
            <CollectionCard
              key={card.id}
              card={card}
              quantity={qty}
              isOwned={qty > 0}
              onRecycle={() => onRecycle(card.id)}
              recycling={recyclingId === card.id}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier compilation**

```bash
cd front && npx tsc --noEmit 2>&1 | grep -i "CollectionSetGroup" || echo "OK"
```

- [ ] **Step 3 : Commit**

```bash
git add front/src/components/collection/CollectionSetGroup.tsx
git commit -m "feat: add CollectionSetGroup component"
```

---

## Task 5 : Créer CollectionFilters

**Files:**
- Create: `front/src/components/collection/CollectionFilters.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// front/src/components/collection/CollectionFilters.tsx
import type { Card } from '../../api/collection.api.ts'
import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'
import {
  RARITY_CHIP_ACTIVE,
  RARITY_CHIP_INACTIVE,
  RARITY_LABELS,
  RARITY_ORDER,
} from './CollectionCard.tsx'
import { FilterChip } from './FilterChip.tsx'

type Rarity = Card['rarity']
type Variant = 'BRILLIANT' | 'HOLOGRAPHIC'

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
    <div className="flex flex-col gap-3">
      {/* Toggle Par rareté / Par set */}
      <div className="flex justify-end">
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDisplayModeChange('rarity')}
            className={cn(
              'rounded-none h-auto px-3 py-1.5 text-xs font-semibold border-r border-border',
              displayMode === 'rarity' && 'bg-muted text-text',
            )}
          >
            Par rareté
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDisplayModeChange('set')}
            className={cn(
              'rounded-none h-auto px-3 py-1.5 text-xs font-semibold',
              displayMode === 'set' && 'bg-muted text-text',
            )}
          >
            Par set
          </Button>
        </div>
      </div>

      {/* Filtres rareté + variante — masqués en mode Par set */}
      {displayMode === 'rarity' && (
        <>
          {/* Groupe Rareté */}
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-text-light/50">
              Rareté
            </p>
            <div className="flex flex-wrap gap-2">
              {RARITY_ORDER.map((r) => (
                <FilterChip
                  key={r}
                  label={RARITY_LABELS[r]}
                  isActive={selectedRarity === r}
                  activeClass={RARITY_CHIP_ACTIVE[r]}
                  inactiveClass={RARITY_CHIP_INACTIVE[r]}
                  onClick={() => onRarityChange(selectedRarity === r ? null : r)}
                />
              ))}
            </div>
          </div>

          {/* Groupe Variante */}
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-text-light/50">
              Variante
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="✨ Brillante"
                isActive={selectedVariant === 'BRILLIANT'}
                activeClass="border-yellow-400 text-yellow-300 bg-yellow-400/10"
                inactiveClass="border-yellow-400/40 text-yellow-300/60"
                onClick={() =>
                  onVariantChange(selectedVariant === 'BRILLIANT' ? null : 'BRILLIANT')
                }
              />
              <FilterChip
                label="🌈 Holographique"
                isActive={selectedVariant === 'HOLOGRAPHIC'}
                activeClass="border-indigo-400 text-indigo-300 bg-indigo-400/10"
                inactiveClass="border-indigo-400/40 text-indigo-300/60"
                onClick={() =>
                  onVariantChange(selectedVariant === 'HOLOGRAPHIC' ? null : 'HOLOGRAPHIC')
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier compilation**

```bash
cd front && npx tsc --noEmit 2>&1 | grep -i "CollectionFilters" || echo "OK"
```

- [ ] **Step 3 : Commit**

```bash
git add front/src/components/collection/CollectionFilters.tsx
git commit -m "feat: add CollectionFilters component (rarity + variant + toggle)"
```

---

## Task 6 : Mettre à jour collection.tsx

**Files:**
- Modify: `front/src/routes/_authenticated/collection.tsx`

- [ ] **Step 1 : Réécrire collection.tsx**

```tsx
// front/src/routes/_authenticated/collection.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { Card } from '../../api/collection.api.ts'
import { RARITY_LABELS } from '../../components/collection/CollectionCard.tsx'
import { CollectionFilters } from '../../components/collection/CollectionFilters.tsx'
import { CollectionGrid } from '../../components/collection/CollectionGrid.tsx'
import { CollectionSetGroup } from '../../components/collection/CollectionSetGroup.tsx'
import { useCards, useRecycle, useUserCollection } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

type DisplayMode = 'rarity' | 'set'
type Rarity = Card['rarity']
type Variant = 'BRILLIANT' | 'HOLOGRAPHIC'

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rarity')
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [recyclingId, setRecyclingId] = useState<string | null>(null)

  const { data: allCards, isLoading: cardsLoading } = useCards()
  const { data: userColl } = useUserCollection(user?.id)
  const { mutate: recycle } = useRecycle()

  const owned = useMemo(() => {
    const map = new Map<string, number>()
    for (const uc of userColl?.cards ?? []) {
      map.set(uc.card.id, uc.quantity)
    }
    return map
  }, [userColl])

  const cards = allCards?.cards ?? []

  const filteredCards = useMemo(
    () =>
      (allCards?.cards ?? [])
        .filter((c) => !selectedRarity || c.rarity === selectedRarity)
        .filter((c) => !selectedVariant || c.variant === selectedVariant),
    [allCards, selectedRarity, selectedVariant],
  )

  // Sous-titre selon le mode
  const subtitle = useMemo(() => {
    if (displayMode === 'set') {
      const setCount = new Set(cards.map((c) => c.set.id)).size
      return `${cards.filter((c) => owned.has(c.id)).length} / ${cards.length} cartes · ${setCount} set${setCount > 1 ? 's' : ''}`
    }
    const base = `${filteredCards.filter((c) => owned.has(c.id)).length} / ${filteredCards.length} cartes`
    const rarityLabel = selectedRarity ? ` · ${RARITY_LABELS[selectedRarity]}` : ''
    const variantLabel = selectedVariant
      ? ` · ${selectedVariant === 'BRILLIANT' ? '✨ Brillante' : '🌈 Holographique'}`
      : ''
    return base + rarityLabel + variantLabel
  }, [displayMode, cards, filteredCards, owned, selectedRarity, selectedVariant])

  // Groupement par set pour le mode "Par set"
  const setGroups = useMemo(() => {
    if (displayMode !== 'set') return []
    const order: string[] = []
    const groups = new Map<string, { name: string; cards: Card[] }>()
    for (const card of cards) {
      if (!groups.has(card.set.id)) {
        order.push(card.set.id)
        groups.set(card.set.id, { name: card.set.name, cards: [] })
      }
      groups.get(card.set.id)!.cards.push(card)
    }
    return order.map((id) => ({ id, ...groups.get(id)! }))
  }, [displayMode, cards])

  const handleRecycle = (cardId: string) => {
    setRecyclingId(cardId)
    recycle(cardId, { onSettled: () => setRecyclingId(null) })
  }

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setSelectedRarity(null)
    setSelectedVariant(null)
    setDisplayMode(mode)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-text">Ma Collection</h1>
            <p className="text-sm text-text-light">{subtitle}</p>
          </div>

          <CollectionFilters
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
            selectedRarity={selectedRarity}
            onRarityChange={setSelectedRarity}
            selectedVariant={selectedVariant}
            onVariantChange={setSelectedVariant}
          />
        </div>

        {cardsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-text-light">Chargement…</p>
          </div>
        ) : displayMode === 'set' ? (
          setGroups.map((group) => (
            <CollectionSetGroup
              key={group.id}
              setName={group.name}
              cards={group.cards}
              owned={owned}
              onRecycle={handleRecycle}
              recyclingId={recyclingId}
            />
          ))
        ) : (
          <CollectionGrid
            cards={filteredCards}
            owned={owned}
            onRecycle={handleRecycle}
            recyclingId={recyclingId}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier que TypeScript compile sans erreur**

```bash
cd front && npx tsc --noEmit 2>&1
```

Expected : aucune erreur.

- [ ] **Step 3 : Vérifier visuellement dans le navigateur**

Lancer le dev server :
```bash
cd front && npm run dev
```

Ouvrir la page `/collection` et vérifier :
- [ ] Mode "Par rareté" s'affiche par défaut avec les filtres visibles
- [ ] Les chips de rareté montrent leurs couleurs avant de cliquer
- [ ] Cliquer sur un chip filtre les cartes, le sous-titre se met à jour
- [ ] Re-cliquer sur un chip actif le désélectionne
- [ ] Les chips Brillante / Holographique fonctionnent et sont cumulables avec la rareté
- [ ] Basculer sur "Par set" masque les filtres et regroupe les cartes par set avec les headers
- [ ] Revenir en "Par rareté" réinitialise les filtres à null
- [ ] Le sous-titre est correct dans tous les cas (aucun filtre, filtre actif, mode set)
- [ ] La page de chargement s'affiche pendant le fetch

- [ ] **Step 4 : Commit final**

```bash
git add front/src/routes/_authenticated/collection.tsx
git commit -m "feat: collection filters — toggle set/rarity, chip colors, variant filter"
```
