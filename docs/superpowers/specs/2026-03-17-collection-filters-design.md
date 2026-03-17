# Collection Filters & Display — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Overview

Amélioration de la page "Ma Collection" avec trois fonctionnalités :
1. Toggle d'affichage Par rareté / Par set
2. Couleurs de rareté visibles dans les chips de filtre avant sélection
3. Filtre variante (Brillante / Holographique)

## Features

### 1. Toggle Par rareté / Par set

Un contrôle segmenté dans le header (deux `Button` côte à côte, `variant="ghost"`, l'actif reçoit `bg-muted`) permet de basculer entre deux modes d'affichage :

- **Par rareté** (défaut) : chips de filtre rareté + chips variante + grille plate
- **Par set** : cartes groupées par set, filtres masqués

**Changement de mode** : lorsqu'on bascule vers "Par set", `selectedRarity` et `selectedVariant` sont réinitialisés à `null`. Lorsqu'on revient vers "Par rareté", les filtres restent `null` (pas de restauration de l'état précédent).

**Mode "Par set"** :
- Chaque section affiche `NOM DU SET · X / Y cartes` où (depuis `CollectionSetGroup`, les `cards` passées en props sont déjà pré-filtrées par set par le parent) :
  - X = `cards.filter(c => owned.has(c.id)).length`
  - Y = `cards.length`
- L'ordre des sections suit l'ordre de première apparition des sets dans `allCards?.cards`
- Les sections dont X = 0 sont quand même affichées (toutes les cartes en silhouette)
- Si `allCards?.cards` est vide (collection vide ou chargement), aucune section n'est rendue
- `useCardSets` n'est pas utilisé

**Sous-titre en mode "Par set"** : `X / Y cartes · N sets` où :
- X = `(allCards?.cards ?? []).filter(c => owned.has(c.id)).length`
- Y = `(allCards?.cards ?? []).length`
- N = nombre de sets distincts dans `allCards?.cards`

**État de chargement** : uniquement via `cardsLoading` (un seul hook).

### 2. Couleurs de rareté dans les chips

Le bouton "Tout" existant est **supprimé**. Cliquer sur un chip actif le désélectionne (toggle → null).

Deux nouvelles constantes `RARITY_CHIP_INACTIVE` et `RARITY_CHIP_ACTIVE` sont ajoutées dans `CollectionCard.tsx`. `RARITY_COLORS` est **conservé sans modification** (utilisé pour la bordure des cartes).

| Rareté | `RARITY_CHIP_INACTIVE` | `RARITY_CHIP_ACTIVE` |
|---|---|---|
| COMMON | `border-border/60 text-text-light/60` | `border-border text-text-light bg-border/20` |
| UNCOMMON | `border-green-500/40 text-green-400/60` | `border-green-500 text-green-400 bg-green-500/10` |
| RARE | `border-accent/40 text-accent/60` | `border-accent text-accent bg-accent/10` |
| EPIC | `border-secondary/40 text-secondary/60` | `border-secondary text-secondary bg-secondary/10` |
| LEGENDARY | `border-primary/40 text-primary/60` | `border-primary text-primary bg-primary/10` |

Notes :
- COMMON utilise intentionnellement `/60` pour les deux tokens (border et texte), contrairement aux autres rarités. C'est un choix visuel assumé — COMMON n'a pas de couleur propre, juste une légère atténuation.
- LEGENDARY utilise `border-primary/40` (inactif) vs `border-primary/50` dans `RARITY_COLORS`. La divergence est intentionnelle — les chips ont leur propre traitement visuel, indépendant des bordures de cartes.

### 3. Filtre variante

`Card.variant` est typé `'BRILLIANT' | 'HOLOGRAPHIC' | null` (confirmé dans `collection.api.ts`). Le `selectedVariant` est donc assignable sans cast.

Deux chips sous le groupe rareté, comportement toggle identique (cliquer sur actif = null) :
- `✨ Brillante` → filtre `card.variant === 'BRILLIANT'`
- `🌈 Holographique` → filtre `card.variant === 'HOLOGRAPHIC'`

Pas de chip "Toutes". Filtres rareté et variante cumulables.

**État vide** : si la combinaison de filtres donne 0 cartes, afficher un message centré : `"Aucune carte ne correspond à ces filtres."`.

### 4. Labels de groupe

Chaque rangée de chips est précédée d'un label en petites majuscules : **Rareté** / **Variante**.

### 5. Sous-titre dynamique (mode Par rareté)

```ts
const subtitle = `${filteredCards.filter(c => owned.has(c.id)).length} / ${filteredCards.length} cartes`
  + (selectedRarity ? ` · ${RARITY_LABELS[selectedRarity]}` : '')
  + (selectedVariant ? ` · ${selectedVariant === 'BRILLIANT' ? '✨ Brillante' : '🌈 Holographique'}` : '')
```

## Architecture

### Changement clé : filtrage client

`useCards` est appelé **sans filtre**. C'est le seul consommateur de `useCards` dans le codebase. Le filtrage se fait via `useMemo` côté client.

```ts
const { data: allCards, isLoading: cardsLoading } = useCards()
const filteredCards = useMemo(() =>
  (allCards?.cards ?? [])
    .filter(c => !selectedRarity || c.rarity === selectedRarity)
    .filter(c => !selectedVariant || c.variant === selectedVariant),
  [allCards, selectedRarity, selectedVariant]
)
```

### Migration `CollectionCard`

`front/src/components/custom/collectionCard.tsx` est **supprimé**, recréé en `front/src/components/collection/CollectionCard.tsx`. Les constantes `RARITY_COLORS`, `RARITY_LABELS`, `RARITY_ORDER`, `RARITY_CHIP_INACTIVE`, `RARITY_CHIP_ACTIVE` sont exportées depuis ce fichier. Les imports dans `collection.tsx` sont mis à jour vers le nouveau chemin.

### Nouveau dossier : `front/src/components/collection/`

| Fichier | Rôle |
|---|---|
| `CollectionCard.tsx` | Déplacé depuis `custom/`. Contient toutes les constantes RARITY_* |
| `FilterChip.tsx` | Chip générique pour rareté et variante |
| `CollectionFilters.tsx` | Barre complète : toggle + groupe rareté + groupe variante |
| `CollectionGrid.tsx` | Grille plate (mode Par rareté) |
| `CollectionSetGroup.tsx` | Section groupée par set |

### Interfaces des composants

**`FilterChip.tsx`**
```tsx
interface FilterChipProps {
  label: string
  isActive: boolean
  activeClass: string    // ex: RARITY_CHIP_ACTIVE['RARE']
  inactiveClass: string  // ex: RARITY_CHIP_INACTIVE['RARE']
  onClick: () => void
}
```
Rendu : `Button` avec `variant="ghost"` `size="sm"`, classes `rounded-full border h-auto px-3 py-1 text-xs font-semibold` + classes actif/inactif conditionnelles.

**`CollectionFilters.tsx`**
```tsx
type Rarity = Card['rarity']  // 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
type Variant = 'BRILLIANT' | 'HOLOGRAPHIC'

interface CollectionFiltersProps {
  displayMode: 'rarity' | 'set'
  onDisplayModeChange: (mode: 'rarity' | 'set') => void
  selectedRarity: Rarity | null
  onRarityChange: (rarity: Rarity | null) => void
  selectedVariant: Variant | null
  onVariantChange: (variant: Variant | null) => void
}
```

**`CollectionGrid.tsx`**
```tsx
interface CollectionGridProps {
  cards: Card[]
  owned: Map<string, number>
  onRecycle: (cardId: string) => void
  recyclingId: string | null
}
```
Extraction directe du JSX grille existant dans `collection.tsx`.

**`CollectionSetGroup.tsx`**
```tsx
interface CollectionSetGroupProps {
  setName: string
  cards: Card[]
  owned: Map<string, number>
  onRecycle: (cardId: string) => void
  recyclingId: string | null
}
```

## Data

Aucune modification API requise.

### Map `owned`

La map `owned: Map<string, number>` est construite depuis `useUserCollection` exactement comme aujourd'hui (clé = `card.id`, valeur = quantité). Elle est passée telle quelle à `CollectionGrid`, `CollectionSetGroup`, et utilisée dans le sous-titre. Si `userColl` n'est pas encore chargé, `owned` est une `Map` vide — les cartes s'affichent alors toutes en silhouette jusqu'à la résolution de la query. Ce comportement est acceptable (pas de spinner spécifique requis pour `userColl`).
