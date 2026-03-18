# Admin Cards Page — Refonte

## Objectif

Refaire `src/routes/_admin/admin.cards.tsx` pour offrir une gestion complète du pool de cartes : sets, cartes, poids de drop avec visualisation relative, et configuration des taux holo/brilliant par rareté.

## Architecture

Deux modes de vue switchables via toggle. En mode "Par sets" : sidebar gauche fixe listant les sets + ReactTable des cartes du set sélectionné. En mode "Toutes les cartes" : ReactTable plein-largeur de toutes les cartes avec colonne Set filtrable. En haut de la zone principale : panneau de config holo avec inputs inline directement éditables.

**Tech Stack :** React 18, TypeScript, TanStack Router, TanStack Table, TanStack Query, `useAppForm` / `AppField`, Radix UI Sheet, Lucide icons, Tailwind CSS.

---

## Données & API

### Types existants (inchangés)

```ts
type AdminCardSet = {
  id: string; name: string; description?: string
  isActive: boolean; createdAt: string; _count: { cards: number }
}

type AdminCard = {
  id: string; name: string; imageUrl: string
  rarity: string; variant?: string; dropWeight: number
  set: { id: string; name: string }
}
```

### Endpoints existants (aucune modification backend requise pour CRUD)

- `GET /admin/sets` → `{ sets: AdminCardSet[] }`
- `POST /admin/sets`, `PATCH /admin/sets/:id`, `DELETE /admin/sets/:id`
- `GET /admin/cards?setId=&rarity=` → `{ cards: AdminCard[] }`
- `POST /admin/cards` (multipart/form-data : name, setId, rarity, dropWeight, image)
- `PATCH /admin/cards/:id` (name?, rarity?, dropWeight?)
- `DELETE /admin/cards/:id`

### Config holo — modifications backend nécessaires

Ajouter 3 nouvelles clés à `CONFIG_KEYS` dans `config.router.ts` :

```ts
'holoRateRare' | 'holoRateEpic' | 'holoRateLegendary'
```

Le `PUT /admin/config` existant supporte déjà des clés optionnelles. Il faut uniquement ajouter les 3 clés à la whitelist `CONFIG_KEYS`. Les valeurs sont des pourcentages décimaux (ex: `5` = 5%).

---

## Structure des fichiers

```
src/components/admin/cards/
  SetSidebar.tsx          # Sidebar fixe : liste sets, CRUD sets
  CardColumns.tsx         # Colonnes table vue "par set"
  CardColumnsAll.tsx      # Colonnes table vue "toutes les cartes" (+ colonne Set)
  CreateCardSheet.tsx     # Sheet création carte (avec upload image)
  EditCardSheet.tsx       # Sheet édition carte (nom, rareté, poids)
  HoloConfigPanel.tsx     # Bandeau config holo avec inputs inline
  index.ts                # Barrel exports

src/constants/card.constant.ts   # RARITY_OPTIONS (déplacé depuis admin.cards.tsx)
src/api/admin-cards.api.ts       # Ajouter updateCard avec variant optionnel
src/queries/useAdminCards.ts     # Ajouter useAdminHoloConfig + useAdminUpdateHoloConfig
```

---

## Comportement des composants

### `AdminCards` (route)

State :
- `view: 'sets' | 'all'` — mode d'affichage
- `selectedSetId: string | null` — set actif en vue "par set"
- `showCreate: boolean` — Sheet création carte
- `editCard: AdminCard | null` — Sheet édition carte

Requêtes : `useAdminSets()`, `useAdminCards({ setId: selectedSetId })` en vue "par set" ou `useAdminCards()` en vue "all", `useAdminHoloConfig()`.

### `SetSidebar`

- Liste verticale des sets. Set actif surligné (accent amber).
- Par set : nom + badge count + badge actif/inactif.
- Boutons inline (icônes) : toggle actif/inactif (`Power`), éditer (`Pencil` → `EditSetSheet`), supprimer (`Trash2`).
- `EditSetSheet` : champs nom (Input), description (Input), isActive (Toggle).
- En bas de sidebar : bouton "+ Nouveau set" → `CreateSetSheet` : champs nom, description.
- Largeur fixe `w-52`.

### `CardColumns` (vue par set)

Colonnes `ColumnDef<AdminCard>[]` :

| id | header | détail |
|---|---|---|
| image | — | miniature 28×38px, `notFoundImg` si `imageUrl` vide, `size: 44` |
| name | Nom | `meta: { grow: true }` |
| rarity | Rareté | badge coloré selon rareté |
| dropWeight | Poids | chiffre brut + barre % calculée sur la somme des `dropWeight` du set affiché |
| actions | — | icônes Pencil + Trash2, `size: 72` |

**Calcul de la barre** : le `%` d'une carte = `card.dropWeight / totalWeight * 100`. Le `totalWeight` est calculé dans le composant parent à partir des données du set actif.

### `CardColumnsAll` (vue toutes les cartes)

Mêmes colonnes + colonne `set.name` (header "Set", `size: 140`, filtrable via search bar ReactTable).

### `CreateCardSheet`

Champs :
- Nom (Input)
- Set (Select, options = liste des sets ; pré-sélectionné au `selectedSetId` actif)
- Rareté (Select, `RARITY_OPTIONS`)
- Poids de drop (Number, défaut `1.0`)
- Image (input file natif : jpeg/png/webp)

Submit : construit un `FormData` et appelle `createCard.mutate(fd)`.

### `EditCardSheet`

Champs : Nom (Input), Rareté (Select), Poids (Number). Pas de réupload d'image. Boutons Sauvegarder + Supprimer.

### `HoloConfigPanel`

- Bandeau horizontal compact avec 3 champs `Number` labellisés : RARE %, EPIC %, LEGENDARY %.
- State local `dirty: boolean` — true si une valeur a changé depuis le chargement.
- Bouton "Sauvegarder" visible uniquement si `dirty`.
- Submit : `updateHoloConfig.mutate({ holoRateRare, holoRateEpic, holoRateLegendary })`.
- Charge les valeurs via `useAdminHoloConfig()` au montage.

---

## Raretés — couleurs de badge

| Rareté | Couleur |
|---|---|
| COMMON | `bg-green-500/20 text-green-400` |
| UNCOMMON | `bg-blue-500/20 text-blue-400` |
| RARE | `bg-violet-500/20 text-violet-400` |
| EPIC | `bg-pink-500/20 text-pink-400` |
| LEGENDARY | `bg-amber-500/20 text-amber-400` |

---

## Queries holo config

```ts
// useAdminCards.ts — ajouts
export function useAdminHoloConfig() {
  return useQuery({
    queryKey: ['admin', 'config', 'holo'],
    queryFn: () => AdminConfigApi.getHoloConfig(),
  })
}

export function useAdminUpdateHoloConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { holoRateRare?: number; holoRateEpic?: number; holoRateLegendary?: number }) =>
      AdminConfigApi.updateConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config'] }),
  })
}
```

`AdminConfigApi.updateConfig` appelle `PUT /admin/config` (déjà dans `admin-config.api.ts` ou à créer si non existant).

---

## Constantes

```ts
// src/constants/card.constant.ts
export const RARITY_OPTIONS = [
  { value: 'COMMON', label: 'Common' },
  { value: 'UNCOMMON', label: 'Uncommon' },
  { value: 'RARE', label: 'Rare' },
  { value: 'EPIC', label: 'Epic' },
  { value: 'LEGENDARY', label: 'Legendary' },
]

export const RARITY_COLORS: Record<string, string> = {
  COMMON: 'bg-green-500/20 text-green-400',
  UNCOMMON: 'bg-blue-500/20 text-blue-400',
  RARE: 'bg-violet-500/20 text-violet-400',
  EPIC: 'bg-pink-500/20 text-pink-400',
  LEGENDARY: 'bg-amber-500/20 text-amber-400',
}

export const HOLO_ELIGIBLE_RARITIES = ['RARE', 'EPIC', 'LEGENDARY']
```

---

## Layout de la route (squelette)

```tsx
function AdminCards() {
  const [view, setView] = useState<'sets' | 'all'>('sets')
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editCard, setEditCard] = useState<AdminCard | null>(null)

  return (
    <div className="flex h-screen flex-col p-8">
      {/* Header : titre + toggle vue + bouton Nouvelle carte */}
      <HoloConfigPanel />
      <div className="mt-4 flex min-h-0 flex-1 gap-4 overflow-hidden">
        {view === 'sets' && (
          <SetSidebar selectedSetId={selectedSetId} onSelect={setSelectedSetId} />
        )}
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
          <ReactTable
            columns={view === 'sets' ? columns : columnsAll}
            data={cards}
            filterId={`admin-cards-${view}`}
          />
        </div>
      </div>
      <CreateCardSheet ... />
      <EditCardSheet ... />
    </div>
  )
}
```

---

## Ce qui change dans la route existante

- `RARITY_OPTIONS` → déplacé dans `src/constants/card.constant.ts`
- `CardEditForm` → remplacé par `EditCardSheet` (Sheet au lieu de modal fixed)
- `CardUploadForm` → remplacé par `CreateCardSheet`
- La grille d'images → remplacée par `ReactTable`
- L'accordion de sets → remplacé par `SetSidebar`
