# Admin Cards Page Refonte — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaire `src/routes/_admin/admin.cards.tsx` avec sidebar sets, table de cartes (poids + barre %), config holo inline, et Sheets CRUD.

**Architecture:** Sidebar gauche fixe listant les sets + ReactTable des cartes du set sélectionné (vue "par set") ou ReactTable plein-largeur de toutes les cartes (vue "toutes"). Bandeau HoloConfigPanel en haut avec inputs inline éditables. Composants extraits dans `src/components/admin/cards/`.

**Tech Stack:** React 18, TypeScript, TanStack Router, TanStack Table (ReactTable), TanStack Query, TanStack Form (`useAppForm`), Radix UI Sheet, Lucide icons, Tailwind CSS, Biome lint.

---

## Fichiers créés / modifiés

**Backend**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/config.router.ts` — ajouter 3 clés holo

**Frontend — nouveaux fichiers**
- Create: `front/src/constants/card.constant.ts` — RARITY_OPTIONS, RARITY_COLORS, HOLO_ELIGIBLE_RARITIES
- Create: `front/src/components/admin/cards/CardColumns.tsx` — colonnes vue "par set"
- Create: `front/src/components/admin/cards/CardColumnsAll.tsx` — colonnes vue "toutes les cartes"
- Create: `front/src/components/admin/cards/EditCardSheet.tsx` — Sheet édition carte
- Create: `front/src/components/admin/cards/CreateCardSheet.tsx` — Sheet création carte + upload
- Create: `front/src/components/admin/cards/HoloConfigPanel.tsx` — bandeau config holo inline
- Create: `front/src/components/admin/cards/SetSidebar.tsx` — sidebar sets + CreateSetSheet + EditSetSheet
- Create: `front/src/components/admin/cards/index.ts` — barrel export

**Frontend — fichiers modifiés**
- Modify: `front/src/api/admin-config.api.ts` — étendre AdminConfig avec 3 clés holo optionnelles
- Modify: `front/src/api/admin-cards.api.ts` — ajouter `variant` optionnel à updateCard
- Modify: `front/src/queries/useAdminCards.ts` — ajouter param `enabled` à useAdminCards
- Rewrite: `front/src/routes/_admin/admin.cards.tsx` — nouvelle page (~80 lignes)

**Fichiers NON modifiés**
- `front/src/queries/useAdminConfig.ts` — existe déjà avec useAdminConfig + useAdminSaveConfig
- `front/src/api/admin-config.api.ts` — uniquement étendu (pas réécrit)

---

## Task 1: Backend — Holo config keys

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/config.router.ts`

**Contexte :** Le backend stocke la config dans `GlobalConfig` (key-value). Les clés autorisées sont dans `CONFIG_KEYS` (whitelist pour GET) et dans le schéma Zod (validation pour PUT). Il faut modifier les deux — oublier l'un rend la feature silencieusement cassée.

- [ ] **Step 1: Ajouter les 3 clés à CONFIG_KEYS**

```ts
// config.router.ts ligne 5 — remplacer la ligne entière par :
const CONFIG_KEYS = ['tokenRegenIntervalHours', 'tokenMaxStock', 'pityThreshold', 'dustCommon', 'dustUncommon', 'dustRare', 'dustEpic', 'dustLegendary', 'holoRateRare', 'holoRateEpic', 'holoRateLegendary'] as const
```

- [ ] **Step 2: Ajouter les 3 champs au schéma Zod du PUT**

Dans le `z.object({...})` du PUT, ajouter les 3 lignes **après** `dustLegendary` (ne pas dupliquer `dustLegendary`) :

```ts
holoRateRare: z.number().min(0).max(100).optional(),
holoRateEpic: z.number().min(0).max(100).optional(),
holoRateLegendary: z.number().min(0).max(100).optional(),
```

- [ ] **Step 3: Vérifier la compilation backend**

```bash
cd /Users/couffinhal/Documents/Gachapon/back && npx tsc --noEmit
```

Expected : aucune erreur TypeScript.

- [ ] **Step 4: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add back/src/main/interfaces/http/fastify/routes/admin/config.router.ts
git commit -m "feat(back): add holoRateRare/Epic/Legendary config keys"
```

---

## Task 2: Frontend types + constants + query update

**Files:**
- Modify: `front/src/api/admin-config.api.ts`
- Modify: `front/src/api/admin-cards.api.ts`
- Modify: `front/src/queries/useAdminCards.ts`
- Create: `front/src/constants/card.constant.ts`

- [ ] **Step 1: Étendre AdminConfig avec les 3 clés holo**

Dans `front/src/api/admin-config.api.ts`, ajouter les 3 champs optionnels à `AdminConfig` :

```ts
export type AdminConfig = {
  tokenRegenIntervalHours: number
  tokenMaxStock: number
  pityThreshold: number
  dustCommon: number
  dustUncommon: number
  dustRare: number
  dustEpic: number
  dustLegendary: number
  holoRateRare?: number
  holoRateEpic?: number
  holoRateLegendary?: number
}
```

- [ ] **Step 2: (skipped)** — aucune modification de `admin-cards.api.ts` requise pour cette feature. Le champ `variant` n'est pas utilisé dans ce plan.

- [ ] **Step 3: Ajouter param `enabled` à useAdminCards**

Dans `front/src/queries/useAdminCards.ts`, modifier `useAdminCards` :

```ts
export function useAdminCards(
  params: { setId?: string; rarity?: string } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'cards', params],
    queryFn: () => AdminCardsApi.getCards(params),
    enabled: options?.enabled,
  })
}
```

- [ ] **Step 4: Créer `front/src/constants/card.constant.ts`**

```ts
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

// Utilisé par HoloConfigPanel pour itérer les 3 champs
export const HOLO_ELIGIBLE_RARITIES = ['RARE', 'EPIC', 'LEGENDARY'] as const
```

- [ ] **Step 5: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 6: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/api/admin-config.api.ts front/src/api/admin-cards.api.ts front/src/queries/useAdminCards.ts front/src/constants/card.constant.ts
git commit -m "feat(front): extend AdminConfig holo keys, add card constants, update useAdminCards"
```

---

## Task 3: CardColumns (vue par set)

**Files:**
- Create: `front/src/components/admin/cards/CardColumns.tsx`

**Contexte :** Pattern identique à `src/components/admin/shop/ShopColumns.tsx`. Le hook `useCardColumns(data, onEdit, onDelete)` retourne un `ColumnDef<AdminCard>[]` memoized. Le `totalWeight` est calculé en interne depuis `data` pour afficher le % dans la barre.

- [ ] **Step 1: Créer `front/src/components/admin/cards/CardColumns.tsx`**

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import notFoundImg from '../../../assets/data/not-found.png'
import { RARITY_COLORS } from '../../../constants/card.constant'
import type { AdminCard } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'

export function useCardColumns(
  data: AdminCard[],
  onEdit: (card: AdminCard) => void,
  onDelete: (id: string) => void,
) {
  const totalWeight = useMemo(
    () => data.reduce((sum, c) => sum + c.dropWeight, 0),
    [data],
  )

  return useMemo<ColumnDef<AdminCard>[]>(
    () => [
      {
        id: 'image',
        header: '',
        size: 44,
        cell: ({ row }) => (
          <img
            src={row.original.imageUrl || notFoundImg}
            alt={row.original.name}
            className="h-[38px] w-[28px] rounded object-cover"
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nom',
        meta: { grow: true },
      },
      {
        accessorKey: 'rarity',
        header: 'Rareté',
        size: 110,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITY_COLORS[row.original.rarity] ?? 'bg-border text-text-light'}`}
          >
            {row.original.rarity}
          </span>
        ),
      },
      {
        accessorKey: 'dropWeight',
        header: 'Poids',
        size: 130,
        cell: ({ row }) => {
          const pct =
            totalWeight > 0
              ? (row.original.dropWeight / totalWeight) * 100
              : 0
          return (
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-primary">
                  {row.original.dropWeight}
                </span>
                <span className="text-text-light">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-1 rounded-full bg-border">
                <div
                  className="h-1 rounded-full bg-primary/60"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        size: 72,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row.original)
              }}
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-red-400 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original.id)
              }}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [totalWeight, onEdit, onDelete],
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/CardColumns.tsx
git commit -m "feat(front): add CardColumns hook for admin cards table (par set view)"
```

---

## Task 4: CardColumnsAll (vue toutes les cartes)

**Files:**
- Create: `front/src/components/admin/cards/CardColumnsAll.tsx`

**Contexte :** Même pattern que CardColumns mais sans la barre de poids (pas de notion de total cross-sets) et avec une colonne Set supplémentaire.

- [ ] **Step 1: Créer `front/src/components/admin/cards/CardColumnsAll.tsx`**

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import notFoundImg from '../../../assets/data/not-found.png'
import { RARITY_COLORS } from '../../../constants/card.constant'
import type { AdminCard } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'

export function useCardColumnsAll(
  onEdit: (card: AdminCard) => void,
  onDelete: (id: string) => void,
) {
  return useMemo<ColumnDef<AdminCard>[]>(
    () => [
      {
        id: 'image',
        header: '',
        size: 44,
        cell: ({ row }) => (
          <img
            src={row.original.imageUrl || notFoundImg}
            alt={row.original.name}
            className="h-[38px] w-[28px] rounded object-cover"
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nom',
        meta: { grow: true },
      },
      {
        id: 'set',
        header: 'Set',
        size: 140,
        accessorFn: (row) => row.set.name,
      },
      {
        accessorKey: 'rarity',
        header: 'Rareté',
        size: 110,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITY_COLORS[row.original.rarity] ?? 'bg-border text-text-light'}`}
          >
            {row.original.rarity}
          </span>
        ),
      },
      {
        accessorKey: 'dropWeight',
        header: 'Poids',
        size: 80,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-primary">
            {row.original.dropWeight}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 72,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row.original)
              }}
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-red-400 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original.id)
              }}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/CardColumnsAll.tsx
git commit -m "feat(front): add CardColumnsAll hook for admin cards table (all cards view)"
```

---

## Task 5: EditCardSheet

**Files:**
- Create: `front/src/components/admin/cards/EditCardSheet.tsx`

**Contexte :** Pattern identique à `src/components/admin/shop/EditShopItemSheet.tsx`. `key={item.id}` sur le formulaire interne force le remount au changement de carte. Pas de champ `variant` (appliqué au drop, pas stocké par carte).

- [ ] **Step 1: Créer `front/src/components/admin/cards/EditCardSheet.tsx`**

```tsx
import { Button } from '../../ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'
import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCard } from '../../../queries/useAdminCards'

export type EditCardPayload = {
  name: string
  rarity: string
  dropWeight: number
}

interface EditCardSheetProps {
  item: AdminCard | null
  onOpenChange: (open: boolean) => void
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}

export function EditCardSheet({
  item,
  onOpenChange,
  onSave,
  onDelete,
}: EditCardSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {item && (
          <div className="mt-6 px-6">
            <EditCardForm
              key={item.id}
              item={item}
              onSave={onSave}
              onDelete={onDelete}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditCardForm({
  item,
  onSave,
  onDelete,
}: {
  item: AdminCard
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}) {
  const form = useAppForm({
    defaultValues: {
      name: item.name,
      rarity: item.rarity,
      dropWeight: item.dropWeight as number | undefined,
    },
    onSubmit: ({ value }) => {
      onSave({
        name: value.name,
        rarity: value.rarity,
        dropWeight: value.dropWeight ?? 1,
      })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="rarity">
        {(f) => <f.Select label="Rareté" options={RARITY_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dropWeight">
        {(f) => <f.Number label="Poids de drop" />}
      </form.AppField>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Sauvegarder
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-red-500/30 text-red-400 hover:text-red-400"
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/EditCardSheet.tsx
git commit -m "feat(front): add EditCardSheet for admin cards"
```

---

## Task 6: CreateCardSheet

**Files:**
- Create: `front/src/components/admin/cards/CreateCardSheet.tsx`

**Contexte :** `useAppForm` gère les champs texte. Le fichier image est géré séparément avec `useState<File | null>` car TanStack Form ne supporte pas les fichiers. Le submit construit un `FormData` manuellement. `key={defaultSetId}` sur le formulaire interne remet le set par défaut à zéro quand le set actif change.

- [ ] **Step 1: Créer `front/src/components/admin/cards/CreateCardSheet.tsx`**

```tsx
import { useState } from 'react'

import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'
import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'

interface CreateCardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (fd: FormData) => void
  sets: AdminCardSet[]
  defaultSetId?: string | null
}

export function CreateCardSheet({
  open,
  onOpenChange,
  onCreate,
  sets,
  defaultSetId,
}: CreateCardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Ajouter une carte</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <CreateCardForm
            key={defaultSetId ?? 'none'}
            sets={sets}
            defaultSetId={defaultSetId}
            onCreate={(fd) => {
              onCreate(fd)
              onOpenChange(false)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CreateCardForm({
  sets,
  defaultSetId,
  onCreate,
}: {
  sets: AdminCardSet[]
  defaultSetId?: string | null
  onCreate: (fd: FormData) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)

  const setOptions = sets.map((s) => ({ value: s.id, label: s.name }))

  const form = useAppForm({
    defaultValues: {
      name: '',
      setId: defaultSetId ?? (sets[0]?.id ?? ''),
      rarity: 'COMMON',
      dropWeight: 1 as number | undefined,
    },
    onSubmit: ({ value }) => {
      if (!file) {
        return
      }
      const fd = new FormData()
      fd.append('name', value.name)
      fd.append('setId', value.setId)
      fd.append('rarity', value.rarity)
      fd.append('dropWeight', String(value.dropWeight ?? 1))
      fd.append('image', file)
      onCreate(fd)
      setFile(null)
      setFileKey((k) => k + 1)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="setId">
        {(f) => <f.Select label="Set" options={setOptions} />}
      </form.AppField>
      <form.AppField name="rarity">
        {(f) => <f.Select label="Rareté" options={RARITY_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dropWeight">
        {(f) => <f.Number label="Poids de drop" />}
      </form.AppField>
      <div className="flex flex-col gap-1">
        <Label>Image (jpeg/png/webp)</Label>
        <input
          key={fileKey}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-text-light"
        />
      </div>
      <Button type="submit" className="w-full" disabled={!file}>
        Créer
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/CreateCardSheet.tsx
git commit -m "feat(front): add CreateCardSheet with image upload for admin cards"
```

---

## Task 7: HoloConfigPanel

**Files:**
- Create: `front/src/components/admin/cards/HoloConfigPanel.tsx`

**Contexte :** Bandeau compact avec 3 champs Number inline. Utilise `useAdminConfig()` et `useAdminSaveConfig()` depuis `queries/useAdminConfig.ts` (fichier existant, pas à modifier). `useEffect` synchronise le state local quand les données serveur arrivent. Bouton "Sauvegarder" visible uniquement si `dirty`.

- [ ] **Step 1: Créer `front/src/components/admin/cards/HoloConfigPanel.tsx`**

```tsx
import { useEffect, useState } from 'react'

import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { HOLO_ELIGIBLE_RARITIES } from '../../../constants/card.constant'
import { useAdminConfig, useAdminSaveConfig } from '../../../queries/useAdminConfig'

type HoloRates = {
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
}

// Chaque entrée correspond à une rareté de HOLO_ELIGIBLE_RARITIES
const RATE_FIELDS = [
  { key: 'holoRateRare' as const, label: HOLO_ELIGIBLE_RARITIES[0] },
  { key: 'holoRateEpic' as const, label: HOLO_ELIGIBLE_RARITIES[1] },
  { key: 'holoRateLegendary' as const, label: HOLO_ELIGIBLE_RARITIES[2] },
] satisfies { key: keyof HoloRates; label: string }[]

export function HoloConfigPanel() {
  const { data, isLoading } = useAdminConfig()
  const saveConfig = useAdminSaveConfig()

  const [rates, setRates] = useState<HoloRates>({
    holoRateRare: 0,
    holoRateEpic: 0,
    holoRateLegendary: 0,
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setRates({
        holoRateRare: data.holoRateRare ?? 0,
        holoRateEpic: data.holoRateEpic ?? 0,
        holoRateLegendary: data.holoRateLegendary ?? 0,
      })
      setDirty(false)
    }
  }, [data])

  const handleChange = (key: keyof HoloRates, value: number) => {
    setRates((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="flex items-center gap-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">
        ✨ Holo drop rates
      </span>
      <div className="flex items-center gap-4">
        {RATE_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Label className="text-xs text-text-light">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              disabled={isLoading}
              value={rates[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-16 text-center"
            />
            <span className="text-xs text-text-light">%</span>
          </div>
        ))}
      </div>
      {dirty && (
        <Button
          size="sm"
          onClick={() => saveConfig.mutate(rates)}
          disabled={saveConfig.isPending}
        >
          Sauvegarder
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/HoloConfigPanel.tsx
git commit -m "feat(front): add HoloConfigPanel with inline editable drop rates"
```

---

## Task 8: SetSidebar

**Files:**
- Create: `front/src/components/admin/cards/SetSidebar.tsx`

**Contexte :** Sidebar fixe `w-52`. Chaque set affiche nom + count + badge actif/inactif. Les 3 boutons d'action (Power, Pencil, Trash2) apparaissent au hover. `CreateSetSheet` et `EditSetSheet` sont des fonctions dans le même fichier. `EditSetForm` avec `key={set.id}` pour reset au changement de set.

- [ ] **Step 1: Créer `front/src/components/admin/cards/SetSidebar.tsx`**

```tsx
import { Pencil, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'
import {
  useAdminCreateSet,
  useAdminDeleteSet,
  useAdminSets,
  useAdminUpdateSet,
} from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'

interface SetSidebarProps {
  selectedSetId: string | null
  onSelect: (id: string) => void
}

export function SetSidebar({ selectedSetId, onSelect }: SetSidebarProps) {
  const { data } = useAdminSets()
  const updateSet = useAdminUpdateSet()
  const deleteSet = useAdminDeleteSet()
  const [showCreate, setShowCreate] = useState(false)
  const [editSet, setEditSet] = useState<AdminCardSet | null>(null)

  const sets = data?.sets ?? []

  return (
    <div className="flex w-52 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sets.map((set) => (
          <div
            key={set.id}
            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
              selectedSetId === set.id
                ? 'border border-primary/30 bg-primary/10'
                : 'hover:bg-surface'
            }`}
            onClick={() => onSelect(set.id)}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${
                  selectedSetId === set.id ? 'text-primary' : 'text-text'
                }`}
              >
                {set.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs text-text-light">
                  {set._count.cards}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    set.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-border text-text-light'
                  }`}
                >
                  {set.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
            <div
              className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  updateSet.mutate({ id: set.id, isActive: !set.isActive })
                }
                title="Toggle actif"
              >
                <Power className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditSet(set)}
                title="Modifier"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-red-400 hover:text-red-400"
                onClick={() => deleteSet.mutate(set.id)}
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-2">
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start text-xs"
          onClick={() => setShowCreate(true)}
        >
          + Nouveau set
        </Button>
      </div>

      <CreateSetSheet
        open={showCreate}
        onOpenChange={(o) => !o && setShowCreate(false)}
      />
      <EditSetSheet
        set={editSet}
        onOpenChange={(o) => !o && setEditSet(null)}
      />
    </div>
  )
}

function CreateSetSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const createSet = useAdminCreateSet()

  const form = useAppForm({
    defaultValues: { name: '', description: '' },
    onSubmit: ({ value }) => {
      createSet.mutate({
        name: value.name,
        description: value.description || undefined,
        isActive: false,
      })
      onOpenChange(false)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau set</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-3"
          >
            <form.AppField name="name">
              {(f) => <f.Input label="Nom" />}
            </form.AppField>
            <form.AppField name="description">
              {(f) => <f.Input label="Description (optionnelle)" />}
            </form.AppField>
            <Button type="submit" className="w-full">
              Créer
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EditSetSheet({
  set,
  onOpenChange,
}: {
  set: AdminCardSet | null
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Sheet open={!!set} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{set?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {set && (
          <div className="mt-6 px-6">
            <EditSetForm
              key={set.id}
              set={set}
              onClose={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditSetForm({
  set,
  onClose,
}: {
  set: AdminCardSet
  onClose: () => void
}) {
  const updateSet = useAdminUpdateSet()

  const form = useAppForm({
    defaultValues: {
      name: set.name,
      description: set.description ?? '',
      isActive: set.isActive,
    },
    onSubmit: ({ value }) => {
      updateSet.mutate({
        id: set.id,
        name: value.name,
        description: value.description || undefined,
        isActive: value.isActive,
      })
      onClose()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.AppField name="isActive">
        {(f) => <f.Toggle label="Statut" options={['Actif', 'Inactif']} />}
      </form.AppField>
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="description">
        {(f) => <f.Input label="Description" />}
      </form.AppField>
      <Button type="submit" className="w-full">
        Sauvegarder
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/SetSidebar.tsx
git commit -m "feat(front): add SetSidebar with Create/EditSetSheet for admin cards"
```

---

## Task 9: Barrel export + réécriture de la route

**Files:**
- Create: `front/src/components/admin/cards/index.ts`
- Rewrite: `front/src/routes/_admin/admin.cards.tsx`

**Contexte :** La route passe de ~317 lignes à ~100 lignes. Elle orchestre les composants extraits. `useCardColumns` reçoit `cards` pour calculer le totalWeight. En vue "par set", la table n'est affichée que si un set est sélectionné. Le bouton "Nouvelle carte" est désactivé en vue "par set" si aucun set n'est sélectionné.

- [ ] **Step 1: Créer `front/src/components/admin/cards/index.ts`**

```ts
export { useCardColumns } from './CardColumns'
export { useCardColumnsAll } from './CardColumnsAll'
export { CreateCardSheet } from './CreateCardSheet'
export { EditCardSheet } from './EditCardSheet'
export type { EditCardPayload } from './EditCardSheet'
export { HoloConfigPanel } from './HoloConfigPanel'
export { SetSidebar } from './SetSidebar'
```

- [ ] **Step 2: Réécrire `front/src/routes/_admin/admin.cards.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useState } from 'react'

import {
  CreateCardSheet,
  EditCardSheet,
  HoloConfigPanel,
  SetSidebar,
  useCardColumns,
  useCardColumnsAll,
} from '../../components/admin/cards'
import { ReactTable } from '../../components/table/reactTable'
import { Button } from '../../components/ui/button'
import {
  type AdminCard,
  useAdminCards,
  useAdminCreateCard,
  useAdminDeleteCard,
  useAdminSets,
  useAdminUpdateCard,
} from '../../queries/useAdminCards'

export const Route = createFileRoute('/_admin/admin/cards')({
  component: AdminCards,
})

function AdminCards() {
  const [view, setView] = useState<'sets' | 'all'>('sets')
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editCard, setEditCard] = useState<AdminCard | null>(null)

  const { data: setsData } = useAdminSets()
  const { data: cardsData, isLoading } = useAdminCards(
    view === 'sets' ? { setId: selectedSetId ?? undefined } : {},
    { enabled: view === 'all' || !!selectedSetId },
  )

  const createCard = useAdminCreateCard()
  const updateCard = useAdminUpdateCard()
  const deleteCard = useAdminDeleteCard()

  const sets = setsData?.sets ?? []
  const cards = cardsData?.cards ?? []

  const columns = useCardColumns(cards, setEditCard, (id) =>
    deleteCard.mutate(id),
  )
  const columnsAll = useCardColumnsAll(setEditCard, (id) =>
    deleteCard.mutate(id),
  )

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Cartes & Sets</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm transition-colors ${
                view === 'sets'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-light hover:text-text'
              }`}
              onClick={() => setView('sets')}
              title="Vue par sets"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm transition-colors ${
                view === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-light hover:text-text'
              }`}
              onClick={() => setView('all')}
              title="Toutes les cartes"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            disabled={view === 'sets' && !selectedSetId}
          >
            <Plus className="h-4 w-4" />
            Nouvelle carte
          </Button>
        </div>
      </div>

      <HoloConfigPanel />

      <div className="mt-4 flex min-h-0 flex-1 gap-4 overflow-hidden">
        {view === 'sets' && (
          <SetSidebar
            selectedSetId={selectedSetId}
            onSelect={setSelectedSetId}
          />
        )}

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
          {view === 'sets' && !selectedSetId ? (
            <div className="flex h-full items-center justify-center text-sm text-text-light">
              Sélectionne un set pour voir ses cartes
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-text-light">
              Chargement…
            </div>
          ) : (
            <ReactTable
              columns={view === 'sets' ? columns : columnsAll}
              data={cards}
              filterId={`admin-cards-${view}`}
            />
          )}
        </div>
      </div>

      <CreateCardSheet
        open={showCreate}
        onOpenChange={(o) => !o && setShowCreate(false)}
        onCreate={(fd) => createCard.mutate(fd)}
        sets={sets}
        defaultSetId={selectedSetId}
      />

      <EditCardSheet
        item={editCard}
        onOpenChange={(o) => !o && setEditCard(null)}
        onSave={(fields) => {
          if (editCard) {
            updateCard.mutate({ id: editCard.id, ...fields })
          }
          setEditCard(null)
        }}
        onDelete={() => {
          if (editCard) {
            deleteCard.mutate(editCard.id)
          }
          setEditCard(null)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Vérifier TypeScript et lint**

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx tsc --noEmit
```

Expected : aucune erreur TypeScript.

```bash
cd /Users/couffinhal/Documents/Gachapon/front && npx biome lint src
```

Expected : aucune erreur Biome (corriger si nécessaire).

- [ ] **Step 4: Commit**

```bash
cd /Users/couffinhal/Documents/Gachapon
git add front/src/components/admin/cards/index.ts front/src/routes/_admin/admin.cards.tsx
git commit -m "feat(front): rewrite admin cards page — sidebar sets, table view, holo config"
```

---

## Vérification finale

- [ ] Lancer le serveur de développement et naviguer vers `/admin/cards`
- [ ] Vérifier vue "par set" : sidebar affichée, sélection d'un set charge la table, poids + barre visibles
- [ ] Vérifier vue "toutes les cartes" : table plein-largeur avec colonne Set
- [ ] Vérifier HoloConfigPanel : champs éditables, bouton Sauvegarder apparaît quand dirty
- [ ] Vérifier CreateCardSheet : set pré-sélectionné, upload image obligatoire
- [ ] Vérifier EditCardSheet : données pré-remplies, reset au changement de carte
- [ ] Vérifier SetSidebar : toggle actif/inactif, Pencil ouvre EditSetSheet, Trash2 supprime
