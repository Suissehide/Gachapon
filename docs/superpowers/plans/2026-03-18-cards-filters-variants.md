# Cards Filters, CardVariantPanel & Gacha Variant Roll Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin card table filters (search/rarity/set), replace HoloConfigPanel with CardVariantPanel (HOLO + BRILLIANT rates, precision inputs, persistent save button), and roll card variants dynamically during gacha pulls using a single weighted roll.

**Architecture:** Backend config gains 3 `brilliantRate*` fields; `GachaPull` gains a `variant` column populated by a pure `pickVariant()` function; the gacha route returns the rolled variant instead of the static card variant. Frontend adds client-side filters above the card table and a redesigned `CardVariantPanel`.

**Tech Stack:** Prisma 6, Fastify + Zod v4, Jest (backend unit tests), React + TanStack Query/Table, Biome (lint), TypeScript

---

## File Map

| File | Change |
|------|--------|
| `back/prisma/schema.prisma` | Add `variant CardVariant?` to `GachaPull` |
| `back/src/main/interfaces/http/fastify/routes/admin/config.router.ts` | Add `brilliantRate*` to CONFIG_KEYS + Zod schema |
| `back/src/main/domain/gacha/gacha.domain.ts` | Export `pickVariant()`, extend `PullCfg`, store rolled variant in GachaPull |
| `back/src/main/interfaces/http/fastify/routes/gacha/index.ts` | Return `pull.variant` instead of `card.variant` |
| `back/src/test/unit/gacha.domain.test.ts` | Add tests for `pickVariant` |
| `front/src/api/admin-config.api.ts` | Add `brilliantRate*` to `AdminConfig` type |
| `front/src/components/admin/cards/HoloConfigPanel.tsx` → `CardVariantPanel.tsx` | Full rewrite: two sections (HOLO + BRILLIANT), step=0.001, save always visible |
| `front/src/components/admin/cards/index.ts` | Update export: `CardVariantPanel` replaces `HoloConfigPanel` |
| `front/src/routes/_admin/admin.cards.tsx` | Add filter bar, replace `HoloConfigPanel` with `CardVariantPanel` |

---

## Task 1: Backend — add `brilliantRate*` to config

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/config.router.ts`

- [ ] **Step 1: Add the 3 fields to CONFIG_KEYS and Zod schema**

```ts
// config.router.ts — line 5
const CONFIG_KEYS = [
  'tokenRegenIntervalHours', 'tokenMaxStock', 'pityThreshold',
  'dustCommon', 'dustUncommon', 'dustRare', 'dustEpic', 'dustLegendary',
  'holoRateRare', 'holoRateEpic', 'holoRateLegendary',
  'brilliantRateRare', 'brilliantRateEpic', 'brilliantRateLegendary',
] as const
```

In the Zod body schema, add after `holoRateLegendary`:
```ts
brilliantRateRare: z.number().min(0).max(100).optional(),
brilliantRateEpic: z.number().min(0).max(100).optional(),
brilliantRateLegendary: z.number().min(0).max(100).optional(),
```

- [ ] **Step 2: TypeCheck**

```bash
cd back && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/admin/config.router.ts
git commit -m "feat(back): add brilliantRate config keys"
```

---

## Task 2: DB migration — `GachaPull.variant` + clean DB

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Add variant field to GachaPull**

In `back/prisma/schema.prisma`, update the `GachaPull` model:
```prisma
model GachaPull {
  id           String       @id @default(uuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId       String
  card         Card         @relation(fields: [cardId], references: [id])
  variant      CardVariant?          // ← add this line
  wasDuplicate Boolean      @default(false)
  dustEarned   Int          @default(0)
  pulledAt     DateTime     @default(now())

  @@index([userId])
  @@index([pulledAt])
  @@index([cardId])
}
```

- [ ] **Step 2: Run migration**

```bash
cd back && npx dotenv -e .env -- npx prisma migrate dev --name add-gachapull-variant
```
Expected: migration file created, Prisma client regenerated

- [ ] **Step 3: Reset DB for clean state**

Since there is no production data, reset completely:
```bash
cd back && npx dotenv -e .env -- npx prisma migrate reset --force
```
Expected: all tables dropped, all migrations re-applied, seed executed

- [ ] **Step 4: Commit**

```bash
git add back/prisma/schema.prisma back/prisma/migrations/
git commit -m "feat(back): add variant to GachaPull, reset DB"
```

---

## Task 3: Gacha domain — `pickVariant` function + integration

**Files:**
- Modify: `back/src/main/domain/gacha/gacha.domain.ts`
- Test: `back/src/test/unit/gacha.domain.test.ts`

- [ ] **Step 1: Write failing tests for `pickVariant`**

Add to `back/src/test/unit/gacha.domain.test.ts`:

```ts
import { pickVariant } from '../../main/domain/gacha/gacha.domain'

const RATES = {
  brilliantRateRare: 2, brilliantRateEpic: 3, brilliantRateLegendary: 5,
  holoRateRare: 5, holoRateEpic: 8, holoRateLegendary: 10,
}

describe('pickVariant', () => {
  it('retourne null pour COMMON', () => {
    expect(pickVariant('COMMON', RATES)).toBeNull()
  })

  it('retourne null pour UNCOMMON', () => {
    expect(pickVariant('UNCOMMON', RATES)).toBeNull()
  })

  it('retourne BRILLIANT si roll < brilliantRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01) // roll = 1 < 2
    expect(pickVariant('RARE', RATES)).toBe('BRILLIANT')
    jest.restoreAllMocks()
  })

  it('retourne HOLOGRAPHIC si brilliantRate <= roll < brilliantRate + holoRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.04) // roll = 4, 2<=4<7
    expect(pickVariant('RARE', RATES)).toBe('HOLOGRAPHIC')
    jest.restoreAllMocks()
  })

  it('retourne null si roll >= brilliantRate + holoRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.10) // roll = 10 >= 7
    expect(pickVariant('RARE', RATES)).toBeNull()
    jest.restoreAllMocks()
  })

  it('utilise les bons taux selon la rareté (LEGENDARY)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.04) // roll=4, brilliant=5 → BRILLIANT
    expect(pickVariant('LEGENDARY', RATES)).toBe('BRILLIANT')
    jest.restoreAllMocks()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd back && CI=true npm run test:unit 2>&1 | tail -20
```
Expected: FAIL — `pickVariant` is not exported

- [ ] **Step 3: Export `pickVariant` from gacha.domain.ts**

Add after `pickWeightedRandom` in `back/src/main/domain/gacha/gacha.domain.ts`:

```ts
type VariantRates = {
  brilliantRateRare: number
  brilliantRateEpic: number
  brilliantRateLegendary: number
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
}

const VARIANT_ELIGIBLE = ['RARE', 'EPIC', 'LEGENDARY'] as const
type VariantEligibleRarity = (typeof VARIANT_ELIGIBLE)[number]

function rarityKey(rarity: VariantEligibleRarity): 'Rare' | 'Epic' | 'Legendary' {
  const map = { RARE: 'Rare', EPIC: 'Epic', LEGENDARY: 'Legendary' } as const
  return map[rarity]
}

export function pickVariant(rarity: string, rates: VariantRates): 'BRILLIANT' | 'HOLOGRAPHIC' | null {
  if (!(VARIANT_ELIGIBLE as readonly string[]).includes(rarity)) return null
  const key = rarityKey(rarity as VariantEligibleRarity)
  const brilliantRate = rates[`brilliantRate${key}`] ?? 0
  const holoRate = rates[`holoRate${key}`] ?? 0
  const roll = Math.random() * 100
  if (roll < brilliantRate) return 'BRILLIANT'
  if (roll < brilliantRate + holoRate) return 'HOLOGRAPHIC'
  return null
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd back && CI=true npm run test:unit 2>&1 | tail -20
```
Expected: all tests pass

- [ ] **Step 5: Extend PullCfg and integrate into domain pull**

In `gacha.domain.ts`, update `PullCfg`:
```ts
type PullCfg = {
  tokenRegenIntervalHours: number
  tokenMaxStock: number
  pityThreshold: number
  dustByRarity: Record<string, number>
  variantRates: VariantRates
}
```

In `#executePullTx`, after step 4 (tirage pondéré), add:
```ts
// 4b. Roll variant
const rolledVariant = pickVariant(card.rarity, cfg.variantRates)
```

Update step 7 (GachaPull.create):
```ts
const pull = await tx.gachaPull.create({
  data: { userId, cardId: card.id, variant: rolledVariant, wasDuplicate, dustEarned },
})
```

In the `pull()` method, load variant rates alongside other config:
```ts
const [
  tokenRegenIntervalHours, tokenMaxStock, pityThreshold,
  dustCommon, dustUncommon, dustRare, dustEpic, dustLegendary,
  brilliantRateRare, brilliantRateEpic, brilliantRateLegendary,
  holoRateRare, holoRateEpic, holoRateLegendary,
] = await Promise.all([
  this.#configService.get('tokenRegenIntervalHours'),
  this.#configService.get('tokenMaxStock'),
  this.#configService.get('pityThreshold'),
  this.#configService.get('dustCommon'),
  this.#configService.get('dustUncommon'),
  this.#configService.get('dustRare'),
  this.#configService.get('dustEpic'),
  this.#configService.get('dustLegendary'),
  this.#configService.get('brilliantRateRare'),
  this.#configService.get('brilliantRateEpic'),
  this.#configService.get('brilliantRateLegendary'),
  this.#configService.get('holoRateRare'),
  this.#configService.get('holoRateEpic'),
  this.#configService.get('holoRateLegendary'),
])
const cfg: PullCfg = {
  tokenRegenIntervalHours,
  tokenMaxStock,
  pityThreshold,
  dustByRarity: { COMMON: dustCommon, UNCOMMON: dustUncommon, RARE: dustRare, EPIC: dustEpic, LEGENDARY: dustLegendary },
  variantRates: {
    brilliantRateRare, brilliantRateEpic, brilliantRateLegendary,
    holoRateRare, holoRateEpic, holoRateLegendary,
  },
}
```

- [ ] **Step 6: TypeCheck**

```bash
cd back && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Run tests**

```bash
cd back && CI=true npm run test:unit 2>&1 | tail -20
```
Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add back/src/main/domain/gacha/gacha.domain.ts back/src/test/unit/gacha.domain.test.ts
git commit -m "feat(back): roll card variant during pull using weighted threshold"
```

---

## Task 4: Gacha route — return rolled variant

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/gacha/index.ts`

- [ ] **Step 1: Use `pull.variant` in the POST /pulls response**

In `gacha/index.ts`, update the two places where `variant: result.card.variant` appears:

```ts
// In wsManager.notify and reply.status(201).send:
card: {
  id: result.card.id,
  name: result.card.name,
  imageUrl: result.card.imageUrl,
  rarity: result.card.rarity,
  variant: result.pull.variant,    // ← was result.card.variant
  set: { id: result.card.set.id, name: result.card.set.name },
},
```

- [ ] **Step 2: TypeCheck**

```bash
cd back && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/gacha/index.ts
git commit -m "feat(back): return rolled variant from pull instead of static card variant"
```

---

## Task 5: Frontend — `AdminConfig` type

**Files:**
- Modify: `front/src/api/admin-config.api.ts`

- [ ] **Step 1: Add brilliantRate fields to the type**

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
  brilliantRateRare?: number     // ← new
  brilliantRateEpic?: number     // ← new
  brilliantRateLegendary?: number // ← new
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/api/admin-config.api.ts
git commit -m "feat(front): add brilliantRate fields to AdminConfig type"
```

---

## Task 6: Frontend — `CardVariantPanel` replaces `HoloConfigPanel`

**Files:**
- Modify: `front/src/components/admin/cards/HoloConfigPanel.tsx` (full rewrite → rename to `CardVariantPanel.tsx`)
- Modify: `front/src/components/admin/cards/index.ts`

- [ ] **Step 1: Rewrite as `CardVariantPanel.tsx`**

Delete the content of `HoloConfigPanel.tsx` and replace with (or rename the file to `CardVariantPanel.tsx`):

```tsx
// front/src/components/admin/cards/CardVariantPanel.tsx
import { useEffect, useState } from 'react'

import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { HOLO_ELIGIBLE_RARITIES } from '../../../constants/card.constant'
import { useAdminConfig, useAdminSaveConfig } from '../../../queries/useAdminConfig'

type VariantRates = {
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
  brilliantRateRare: number
  brilliantRateEpic: number
  brilliantRateLegendary: number
}

const HOLO_FIELDS = [
  { key: 'holoRateRare' as const, label: HOLO_ELIGIBLE_RARITIES[0] },
  { key: 'holoRateEpic' as const, label: HOLO_ELIGIBLE_RARITIES[1] },
  { key: 'holoRateLegendary' as const, label: HOLO_ELIGIBLE_RARITIES[2] },
]

const BRILLIANT_FIELDS = [
  { key: 'brilliantRateRare' as const, label: HOLO_ELIGIBLE_RARITIES[0] },
  { key: 'brilliantRateEpic' as const, label: HOLO_ELIGIBLE_RARITIES[1] },
  { key: 'brilliantRateLegendary' as const, label: HOLO_ELIGIBLE_RARITIES[2] },
]

export function CardVariantPanel() {
  const { data, isLoading } = useAdminConfig()
  const saveConfig = useAdminSaveConfig()

  const [rates, setRates] = useState<VariantRates>({
    holoRateRare: 0, holoRateEpic: 0, holoRateLegendary: 0,
    brilliantRateRare: 0, brilliantRateEpic: 0, brilliantRateLegendary: 0,
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setRates({
        holoRateRare: data.holoRateRare ?? 0,
        holoRateEpic: data.holoRateEpic ?? 0,
        holoRateLegendary: data.holoRateLegendary ?? 0,
        brilliantRateRare: data.brilliantRateRare ?? 0,
        brilliantRateEpic: data.brilliantRateEpic ?? 0,
        brilliantRateLegendary: data.brilliantRateLegendary ?? 0,
      })
      setDirty(false)
    }
  }, [data])

  const handleChange = (key: keyof VariantRates, value: number) => {
    setRates((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
      {/* HOLOGRAPHIC section */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          🌈 Holographic
        </span>
        {HOLO_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <Label className="text-xs text-text-light">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.001}
              disabled={isLoading}
              value={rates[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-20 text-center"
            />
            <span className="text-xs text-text-light">%</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="hidden h-8 w-px bg-primary/20 sm:block" />

      {/* BRILLIANT section */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          ✨ Brilliant
        </span>
        {BRILLIANT_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <Label className="text-xs text-text-light">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.001}
              disabled={isLoading}
              value={rates[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-20 text-center"
            />
            <span className="text-xs text-text-light">%</span>
          </div>
        ))}
      </div>

      {/* Save — always rendered, disabled when clean */}
      <Button
        size="sm"
        onClick={() => saveConfig.mutate(rates)}
        disabled={!dirty || saveConfig.isPending}
      >
        Sauvegarder
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Update barrel export in `index.ts`**

Replace `HoloConfigPanel` with `CardVariantPanel`:

```ts
// front/src/components/admin/cards/index.ts
export { useCardColumns } from './CardColumns'
export { useCardColumnsAll } from './CardColumnsAll'
export { CreateCardSheet } from './CreateCardSheet'
export { EditCardSheet } from './EditCardSheet'
export type { EditCardPayload } from './EditCardSheet'
export { CardVariantPanel } from './CardVariantPanel'
export { SetSidebar } from './SetSidebar'
```

Note: if `HoloConfigPanel.tsx` was renamed to `CardVariantPanel.tsx`, also delete `HoloConfigPanel.tsx` to avoid stale files.

- [ ] **Step 3: Update import in `admin.cards.tsx`**

In `front/src/routes/_admin/admin.cards.tsx`, replace:
```ts
import { ..., HoloConfigPanel, ... } from '../../components/admin/cards'
```
with:
```ts
import { ..., CardVariantPanel, ... } from '../../components/admin/cards'
```

And replace `<HoloConfigPanel />` with `<CardVariantPanel />`.

- [ ] **Step 4: Frontend lint + typecheck**

```bash
cd front && npm run lint && npm run build 2>&1 | tail -20
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add front/src/components/admin/cards/CardVariantPanel.tsx \
        front/src/components/admin/cards/index.ts \
        front/src/routes/_admin/admin.cards.tsx
# also stage deletion if HoloConfigPanel.tsx was renamed:
git add -u front/src/components/admin/cards/HoloConfigPanel.tsx
git commit -m "feat(front): replace HoloConfigPanel with CardVariantPanel (HOLO + BRILLIANT, precision inputs)"
```

---

## Task 7: Frontend — filter bar above the card table

**Files:**
- Modify: `front/src/routes/_admin/admin.cards.tsx`

- [ ] **Step 1: Add filter state and filtered cards logic**

In `AdminCards`, add after the existing state:

```tsx
const [searchQuery, setSearchQuery] = useState('')
const [selectedRarities, setSelectedRarities] = useState<string[]>([])
const [selectedSetIds, setSelectedSetIds] = useState<string[]>([])
```

Add a derived `filteredCards` before the `return`:

```tsx
const filteredCards = cards.filter((card) => {
  if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
  if (selectedRarities.length > 0 && !selectedRarities.includes(card.rarity)) return false
  if (view === 'all' && selectedSetIds.length > 0 && !selectedSetIds.includes(card.set.id)) return false
  return true
})
```

Note: `AdminCard` must expose `card.set.id`. Check the type — if it only has `set.name`, adjust to filter by name or add `id` to the API type. See `front/src/api/admin-cards.api.ts` for the shape.

- [ ] **Step 2: Check AdminCard type for set field**

Read `front/src/api/admin-cards.api.ts` to confirm the shape of `AdminCard`. If `set` only has `name` (not `id`), filter by `card.set.name` instead, or update the API type + backend route to include `set.id`.

- [ ] **Step 3: Add filter bar JSX**

Between the header div and `<HoloConfigPanel />` (now `<CardVariantPanel />`), add:

```tsx
{/* Filter bar */}
<div className="mt-4 flex flex-wrap items-center gap-2">
  <Input
    placeholder="Rechercher une carte…"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="h-8 w-52 text-sm"
  />
  <DropdownFilter
    filters={RARITY_OPTIONS.map((r) => ({
      id: r.value,
      label: r.label,
      checked: selectedRarities.includes(r.value),
    }))}
    onFilterChange={(id, checked) =>
      setSelectedRarities((prev) =>
        checked ? [...prev, id] : prev.filter((r) => r !== id),
      )
    }
  />
  {view === 'all' && (
    <DropdownFilter
      filters={sets.map((s) => ({
        id: s.id,
        label: s.name,
        checked: selectedSetIds.includes(s.id),
      }))}
      onFilterChange={(id, checked) =>
        setSelectedSetIds((prev) =>
          checked ? [...prev, id] : prev.filter((sid) => sid !== id),
        )
      }
    />
  )}
</div>
```

Add required imports at the top:
```tsx
import DropdownFilter from '../../components/ui/dropdownFilter'
import { Input } from '../../components/ui/input'
import { RARITY_OPTIONS } from '../../constants/card.constant'
```

- [ ] **Step 4: Pass `filteredCards` to the table**

In `CardTableArea` invocation, replace `cards={cards}` with `cards={filteredCards}`:

```tsx
<CardTableArea
  view={view}
  selectedSetId={selectedSetId}
  isLoading={isLoading}
  columns={view === 'sets' ? columns : columnsAll}
  cards={filteredCards}
/>
```

Keep `useCardColumns(cards, ...)` using unfiltered `cards` so `totalWeight` (used for drop % display) is always based on the full set.

- [ ] **Step 5: Reset filters when switching views**

Add a `useEffect` to clear set/rarity filters on view change:

```tsx
useEffect(() => {
  setSearchQuery('')
  setSelectedRarities([])
  setSelectedSetIds([])
}, [view])
```

- [ ] **Step 5b: Add label prop to `DropdownFilter`**

`DropdownFilter` renders a hardcoded "Filtres" button. To distinguish the two instances (rarity vs set), update `front/src/components/ui/dropdownFilter.tsx` to accept an optional `label` prop:

```tsx
const DropdownFilter = ({
  filters,
  onFilterChange,
  label = 'Filtres',
}: {
  filters: { id: string; label: string; checked: boolean }[]
  onFilterChange: (id: string, checked: boolean) => void
  label?: string
}) => {
  // ...inside the Button:
  <Filter size={16} />
  {label}
```

Then pass labels in `admin.cards.tsx`:
```tsx
<DropdownFilter label="Rareté" filters={...} onFilterChange={...} />
{view === 'all' && (
  <DropdownFilter label="Set" filters={...} onFilterChange={...} />
)}
```

> **Note on `saveConfig.mutate(rates)`:** Safe to pass only the 6 rate fields — the backend `PUT /admin/config` filters with `Object.entries(request.body).filter(([, v]) => v !== undefined)` and updates only provided keys. No other config values are overwritten.

- [ ] **Step 6: Frontend lint + typecheck**

```bash
cd front && npm run lint && npm run build 2>&1 | tail -20
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add front/src/routes/_admin/admin.cards.tsx front/src/components/ui/dropdownFilter.tsx
git commit -m "feat(front): add search/rarity/set filter bar above admin card table"
```
