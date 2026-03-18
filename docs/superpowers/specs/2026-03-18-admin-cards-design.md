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

**Deux** changements dans `back/src/main/interfaces/http/fastify/routes/admin/config.router.ts` :

1. Ajouter les 3 clés à la whitelist `CONFIG_KEYS` (ligne 5) — utilisée par `GET /admin/config`
2. Ajouter les 3 champs au schéma Zod `z.object({...})` du `PUT /admin/config` — sans cette étape, les clés sont silencieusement ignorées à l'écriture

```ts
// CONFIG_KEYS
'holoRateRare' | 'holoRateEpic' | 'holoRateLegendary'

// Schéma Zod body (PUT)
holoRateRare: z.number().min(0).max(100).optional(),
holoRateEpic: z.number().min(0).max(100).optional(),
holoRateLegendary: z.number().min(0).max(100).optional(),
```

Les valeurs sont des pourcentages (ex: `5` = 5%).

**Modifications frontend nécessaires dans `admin-config.api.ts`** :

Étendre `AdminConfig` avec les 3 nouvelles clés optionnelles :

```ts
export type AdminConfig = {
  // ... clés existantes ...
  holoRateRare?: number
  holoRateEpic?: number
  holoRateLegendary?: number
}
```

`AdminConfigApi.getConfig()` et `AdminConfigApi.saveConfig(updates)` sont réutilisés directement — aucune nouvelle méthode à créer.

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
src/queries/useAdminConfig.ts    # Fichier existant — aucune modification requise
```

---

## Comportement des composants

### `AdminCards` (route)

State :
- `view: 'sets' | 'all'` — mode d'affichage
- `selectedSetId: string | null` — set actif en vue "par set"
- `showCreate: boolean` — Sheet création carte
- `editCard: AdminCard | null` — Sheet édition carte

Requêtes : `useAdminSets()`, `useAdminCards({ setId: selectedSetId }, { enabled: !!selectedSetId })` en vue "par set" (guard pour éviter un fetch inutile avant sélection) ou `useAdminCards()` en vue "all", `useAdminConfig()` (depuis `src/queries/useAdminConfig.ts`).

### `SetSidebar`

- Liste verticale des sets. Set actif surligné (accent amber).
- Par set : nom + badge count + badge actif/inactif.
- Boutons inline (icônes) : toggle actif/inactif (`Power`), éditer (`Pencil` → `EditSetSheet`), supprimer (`Trash2`).
- `EditSetSheet` : champs nom (Input), description (Input), isActive (Toggle).
- En bas de sidebar : bouton "+ Nouveau set" → `CreateSetSheet` : champs nom, description. `EditSetSheet` et `CreateSetSheet` sont définis dans `SetSidebar.tsx` — pas de fichier séparé.
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

Mêmes colonnes + colonne `set.name` (header "Set", `size: 140`). Le filtrage passe par la search bar globale du `ReactTable` (le `filterId` unique filtre sur toutes les colonnes texte, incluant nom et set). Pas de filtre colonne-level distinct.

### `CreateCardSheet`

Champs :
- Nom (Input)
- Set (Select, options = liste des sets ; pré-sélectionné au `selectedSetId` actif)
- Rareté (Select, `RARITY_OPTIONS`)
- Poids de drop (Number, défaut `1.0`)
- Image (input file natif : jpeg/png/webp)

Submit : construit un `FormData` et appelle `createCard.mutate(fd)`.

### `EditCardSheet`

Props : `item: AdminCard | null`, `onOpenChange: (open: boolean) => void`, `onSave: (data: { name: string; rarity: string; dropWeight: number }) => void`, `onDelete: () => void`.

Champs : Nom (Input), Rareté (Select), Poids (Number). Pas de réupload d'image (supprimer + recréer). Pas de champ `variant` — le variant est déterminé au moment du drop par les probabilités de la `HoloConfigPanel`, pas stocké par carte. Boutons Sauvegarder + Supprimer.

Pattern : `key={item?.id}` sur le formulaire interne pour reset au changement d'item (même pattern que `EditShopItemSheet`).

### `HoloConfigPanel`

- Bandeau horizontal compact avec 3 champs `Number` labellisés : RARE %, EPIC %, LEGENDARY %.
- Utilise `useAdminConfig()` (query key `['admin', 'config']`) pour charger les valeurs.
- State local : `{ holoRateRare, holoRateEpic, holoRateLegendary }` initialisé via `useEffect` dès que `data` est disponible. Les inputs sont désactivés (`disabled`) pendant le chargement.
- State local `dirty: boolean` — true si une valeur a changé depuis la synchronisation avec les données du serveur.
- Bouton "Sauvegarder" visible uniquement si `dirty`, appelle `AdminConfigApi.saveConfig({ holoRateRare, holoRateEpic, holoRateLegendary })` puis invalide `['admin', 'config']`.
- Bouton "Sauvegarder" appelle `saveConfig.mutate({ holoRateRare, holoRateEpic, holoRateLegendary })` où `saveConfig = useAdminSaveConfig()` (hook existant dans `useAdminConfig.ts` — l'invalidation de cache est gérée par le hook).

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

`src/queries/useAdminConfig.ts` **existe déjà** et expose `useAdminConfig()` et `useAdminSaveConfig()`. Aucune modification requise. `HoloConfigPanel` importe directement depuis ce fichier :

```ts
import { useAdminConfig, useAdminSaveConfig } from '../../../queries/useAdminConfig'
```

`saveConfig.mutate({ holoRateRare, holoRateEpic, holoRateLegendary })` — seules les 3 clés holo sont envoyées dans le payload.

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

// Utilisé par HoloConfigPanel pour itérer les 3 champs de saisie
export const HOLO_ELIGIBLE_RARITIES = ['RARE', 'EPIC', 'LEGENDARY'] as const
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
