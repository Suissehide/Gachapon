# Profile Page Redesign — Direction "Arcade clair" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la page `/profile/$username` au pixel près sur la référence "Arcade clair", avec sélection manuelle des cartes vedettes (fallback auto sur les 5 plus rares) et progression par set affichée avec une teinte par set.

**Architecture:** Backend layered (domain pur + repos + endpoints Fastify Zod via Awilix). Nouveau `ProfileDomain` + 2 endpoints GET + 1 PUT. Frontend : thème scopé `.arcade-theme` (sans toucher le reste de l'app), composants découpés sous `components/profile/arcade/`, 3 queries TanStack en parallèle.

**Tech Stack:** Prisma 7 + PostgreSQL, Fastify 5 + Zod, Awilix DI, Jest. React 19, TanStack Router/Query, Tailwind v4, Zustand, Lucide React. Polices Bricolage Grotesque + DM Sans + JetBrains Mono via Google Fonts.

**Spec source:** `docs/superpowers/specs/2026-06-11-profile-arcade-redesign-design.md`
**Design handoff:** `~/Downloads/design_handoff_profil_arcade/` (référence visuelle non éditable — copier les styles depuis `reference/arcade.css` quand explicitement référencé).

---

## File Structure

### Backend — Modified
- `back/prisma/schema.prisma` — add `User.featuredCardIds` + `CardSet.hue`
- `back/src/main/types/application/ioc.ts` — add `profileDomain`
- `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` — register `ProfileDomain`
- `back/src/main/types/infra/orm/repositories/user.repository.interface.ts` — add `updateFeaturedCardIds`
- `back/src/main/infra/orm/repositories/user.repository.ts` — impl
- `back/src/main/types/infra/orm/repositories/user-card.repository.interface.ts` — add `countUniqueBySet`
- `back/src/main/infra/orm/repositories/user-card.repository.ts` — impl
- `back/src/main/interfaces/http/fastify/routes/users/index.ts` — add 3 routes
- `back/src/main/interfaces/http/fastify/schemas/users.schema.ts` — add Zod schemas

### Backend — Created
- `back/src/main/types/domain/profile/profile.types.ts`
- `back/src/main/types/domain/profile/profile.domain.interface.ts`
- `back/src/main/domain/profile/profile.domain.ts`
- `back/src/test/unit/profile.domain.test.ts`
- `back/src/test/e2e/profile/featured-cards-fallback.test.ts`
- `back/src/test/e2e/profile/featured-cards-manual.test.ts`
- `back/src/test/e2e/profile/featured-cards-orphaned.test.ts`
- `back/src/test/e2e/profile/set-featured-cards.test.ts`
- `back/src/test/e2e/profile/sets-progression.test.ts`

### Frontend — Modified
- `front/index.html` — preload Google Fonts
- `front/src/styles/_globals.css` — import `_arcade.css`
- `front/src/constants/profile.constant.ts` — add routes + types
- `front/src/api/profile.api.ts` — add 3 methods
- `front/src/queries/useProfile.ts` — add hooks + mutation
- `front/src/routes/_authenticated/profile/$username.tsx` — devient un wrapper

### Frontend — Created
- `front/src/styles/_arcade.css`
- `front/src/components/profile/arcade/utils.ts`
- `front/src/components/profile/arcade/ArcadeBackground.tsx`
- `front/src/components/profile/arcade/FoilAvatar.tsx`
- `front/src/components/profile/arcade/cardArt.tsx`
- `front/src/components/profile/arcade/FeaturedCardsFan.tsx`
- `front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx`
- `front/src/components/profile/arcade/ArcadeHero.tsx`
- `front/src/components/profile/arcade/StatCard.tsx`
- `front/src/components/profile/arcade/StatGrid.tsx`
- `front/src/components/profile/arcade/XPCard.tsx`
- `front/src/components/profile/arcade/StreakCard.tsx`
- `front/src/components/profile/arcade/SetsProgressionCard.tsx`
- `front/src/components/profile/arcade/ArcadeTopbar.tsx`
- `front/src/components/profile/arcade/CollectionCTA.tsx`
- `front/src/components/profile/arcade/ArcadeProfile.tsx`

---

## Task 1: Prisma migration — featured cards & set hue

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Add `featuredCardIds` to `User`**

Open `back/prisma/schema.prisma`, dans le `model User`, après `bestStreak    Int        @default(0)` ajouter :

```prisma
  featuredCardIds String[]   @default([])
```

- [ ] **Step 2: Add `hue` to `CardSet`**

Trouver `model CardSet` (recherche `model CardSet`) et ajouter le champ optionnel :

```prisma
  hue Int?
```

- [ ] **Step 3: Run migration**

```bash
cd back && npm run prisma:migrate:dev -- --name profile_featured_and_set_hue
```

Expected: migration créée dans `back/prisma/migrations/<ts>_profile_featured_and_set_hue/migration.sql` + DB locale mise à jour + `npm run prisma:generate` déclenché automatiquement.

- [ ] **Step 4: Commit**

```bash
git add back/prisma/schema.prisma back/prisma/migrations/
git commit -m "feat(profile): add User.featuredCardIds and CardSet.hue"
```

---

## Task 2: Profile domain types & interface

**Files:**
- Create: `back/src/main/types/domain/profile/profile.types.ts`
- Create: `back/src/main/types/domain/profile/profile.domain.interface.ts`

- [ ] **Step 1: Create types file**

```ts
// back/src/main/types/domain/profile/profile.types.ts
import type { CardRarity, CardVariant } from '../gacha/gacha.types'

export type FeaturedCardDto = {
  id: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  variant: CardVariant
  setId: string
  setName: string
}

export type SetProgressionDto = {
  id: string
  name: string
  short: string
  hue: number
  owned: number
  total: number
  percent: number
}
```

- [ ] **Step 2: Create domain interface**

```ts
// back/src/main/types/domain/profile/profile.domain.interface.ts
import type { FeaturedCardDto, SetProgressionDto } from './profile.types'

export interface ProfileDomainInterface {
  getFeaturedCards(username: string): Promise<FeaturedCardDto[]>
  getSetsProgression(username: string): Promise<SetProgressionDto[]>
  setFeaturedCards(userId: string, cardIds: string[]): Promise<string[]>
}
```

- [ ] **Step 3: Commit**

```bash
git add back/src/main/types/domain/profile/
git commit -m "feat(profile): add domain types and interface"
```

---

## Task 3: Extend user repository — updateFeaturedCardIds

**Files:**
- Modify: `back/src/main/types/infra/orm/repositories/user.repository.interface.ts`
- Modify: `back/src/main/infra/orm/repositories/user.repository.ts`

- [ ] **Step 1: Extend interface**

Dans `user.repository.interface.ts`, ajouter dans `UserRepositoryInterface` :

```ts
  updateFeaturedCardIds(userId: string, cardIds: string[]): Promise<void>
```

- [ ] **Step 2: Implement in repository**

Dans `user.repository.ts`, ajouter la méthode (juste après `update`) :

```ts
  async updateFeaturedCardIds(userId: string, cardIds: string[]): Promise<void> {
    await this.#prisma.user.update({
      where: { id: userId },
      data: { featuredCardIds: cardIds },
    })
  }
```

- [ ] **Step 3: Type-check**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json
```

Expected: pas d'erreur (le champ `featuredCardIds` existe maintenant dans le client Prisma généré).

- [ ] **Step 4: Commit**

```bash
git add back/src/main/types/infra/orm/repositories/user.repository.interface.ts back/src/main/infra/orm/repositories/user.repository.ts
git commit -m "feat(profile): add updateFeaturedCardIds to user repository"
```

---

## Task 4: Extend user-card repository — countUniqueBySet

**Files:**
- Modify: `back/src/main/types/infra/orm/repositories/user-card.repository.interface.ts`
- Modify: `back/src/main/infra/orm/repositories/user-card.repository.ts`

- [ ] **Step 1: Extend interface**

Dans `user-card.repository.interface.ts`, ajouter :

```ts
  countUniqueBySet(userId: string): Promise<Map<string, number>>
```

- [ ] **Step 2: Implement aggregate**

Dans `user-card.repository.ts`, ajouter après `countByUser` :

```ts
  async countUniqueBySet(userId: string): Promise<Map<string, number>> {
    // `groupBy` sur cardId puis join — on veut compter les cardIds uniques par set.
    // Le plus simple : récupérer (cardId, setId) distincts puis grouper en mémoire.
    const rows = await this.#prisma.userCard.findMany({
      where: { userId },
      select: { card: { select: { setId: true, id: true } } },
      distinct: ['cardId'],
    })
    const counts = new Map<string, number>()
    for (const row of rows) {
      const setId = row.card.setId
      counts.set(setId, (counts.get(setId) ?? 0) + 1)
    }
    return counts
  }
```

- [ ] **Step 3: Type-check**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json
```

Expected: pas d'erreur.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/types/infra/orm/repositories/user-card.repository.interface.ts back/src/main/infra/orm/repositories/user-card.repository.ts
git commit -m "feat(profile): add countUniqueBySet to user-card repository"
```

---

## Task 5: ProfileDomain — pickTopByRarity (TDD)

**Files:**
- Create: `back/src/main/domain/profile/profile.domain.ts` (squelette + 1ʳᵉ export)
- Create: `back/src/test/unit/profile.domain.test.ts`

- [ ] **Step 1: Write the failing test**

Créer `back/src/test/unit/profile.domain.test.ts` :

```ts
import { describe, expect, it } from '@jest/globals'

import { pickTopByRarity } from '../../main/domain/profile/profile.domain'

type Card = { id: string; name: string; rarity: string; setId: string; setName: string; imageUrl: string | null; variant: string }
const card = (over: Partial<Card>): Card => ({
  id: 'c1', name: 'C', rarity: 'COMMON', setId: 's1', setName: 'S', imageUrl: null, variant: 'NORMAL', ...over,
})

describe('pickTopByRarity', () => {
  it('returns one card per rarity from LEGENDARY to COMMON', () => {
    const owned = [
      card({ id: 'a', rarity: 'COMMON' }),
      card({ id: 'b', rarity: 'UNCOMMON' }),
      card({ id: 'c', rarity: 'RARE' }),
      card({ id: 'd', rarity: 'EPIC' }),
      card({ id: 'e', rarity: 'LEGENDARY' }),
    ]
    const result = pickTopByRarity(owned)
    expect(result.map((c) => c.id)).toEqual(['e', 'd', 'c', 'b', 'a'])
  })

  it('returns [] when no cards owned', () => {
    expect(pickTopByRarity([])).toEqual([])
  })

  it('caps at 5 cards', () => {
    const owned = Array.from({ length: 8 }, (_, i) => card({ id: `x${i}`, rarity: 'COMMON' }))
    expect(pickTopByRarity(owned)).toHaveLength(5)
  })

  it('completes with next-most-rare when a tier is missing', () => {
    // No EPIC. We have 1 LEGENDARY, 0 EPIC, 2 RARE, 1 UNCOMMON, 3 COMMON.
    const owned = [
      card({ id: 'leg', rarity: 'LEGENDARY' }),
      card({ id: 'r1', rarity: 'RARE' }),
      card({ id: 'r2', rarity: 'RARE' }),
      card({ id: 'un', rarity: 'UNCOMMON' }),
      card({ id: 'co1', rarity: 'COMMON' }),
      card({ id: 'co2', rarity: 'COMMON' }),
      card({ id: 'co3', rarity: 'COMMON' }),
    ]
    const result = pickTopByRarity(owned)
    // Expect 5 cards, ordered by rarity desc, completing missing slots with extras from existing rarities (highest first).
    expect(result).toHaveLength(5)
    expect(result[0]!.id).toBe('leg')
    // Slot 2 (EPIC missing) → fall to RARE
    expect(['r1', 'r2']).toContain(result[1]!.id)
    expect(['r1', 'r2']).toContain(result[2]!.id)
    expect(result[3]!.id).toBe('un')
    // Last slot fills with one COMMON
    expect(['co1', 'co2', 'co3']).toContain(result[4]!.id)
  })
})
```

- [ ] **Step 2: Create the domain file with the function**

```ts
// back/src/main/domain/profile/profile.domain.ts

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

type OwnedCardLike = { id: string; rarity: string }

/** Returns up to 5 owned cards: 1 per rarity (LEGENDARY→COMMON), filling missing
 *  slots with extras from rarer tiers first. */
export function pickTopByRarity<T extends OwnedCardLike>(ownedCards: T[]): T[] {
  if (ownedCards.length === 0) {
    return []
  }
  // Group by rarity
  const byRarity = new Map<string, T[]>()
  for (const card of ownedCards) {
    const arr = byRarity.get(card.rarity) ?? []
    arr.push(card)
    byRarity.set(card.rarity, arr)
  }
  // First pass — take one of each rarity in order
  const picked: T[] = []
  const used = new Set<string>()
  for (const rarity of RARITY_ORDER) {
    const arr = byRarity.get(rarity)
    if (arr && arr.length > 0) {
      const card = arr[0]!
      picked.push(card)
      used.add(card.id)
    }
    if (picked.length === 5) {
      return picked
    }
  }
  // Second pass — fill remaining slots with extras (rarest tier first)
  for (const rarity of RARITY_ORDER) {
    const arr = byRarity.get(rarity)
    if (!arr) {
      continue
    }
    for (const card of arr) {
      if (used.has(card.id)) {
        continue
      }
      picked.push(card)
      used.add(card.id)
      if (picked.length === 5) {
        return picked
      }
    }
  }
  return picked
}
```

- [ ] **Step 3: Run the tests**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/unit/profile.domain.test.ts
```

Expected: 4 tests passent.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/domain/profile/profile.domain.ts back/src/test/unit/profile.domain.test.ts
git commit -m "feat(profile): add pickTopByRarity pure function"
```

---

## Task 6: ProfileDomain — resolveFeaturedCards (TDD)

**Files:**
- Modify: `back/src/main/domain/profile/profile.domain.ts`
- Modify: `back/src/test/unit/profile.domain.test.ts`

- [ ] **Step 1: Add tests**

Ajouter en bas de `profile.domain.test.ts` :

```ts
import { resolveFeaturedCards } from '../../main/domain/profile/profile.domain'

describe('resolveFeaturedCards', () => {
  const owned = [
    card({ id: 'leg', rarity: 'LEGENDARY' }),
    card({ id: 'ep',  rarity: 'EPIC' }),
    card({ id: 'r',   rarity: 'RARE' }),
    card({ id: 'un',  rarity: 'UNCOMMON' }),
    card({ id: 'co',  rarity: 'COMMON' }),
  ]

  it('returns featured ids in order when all are owned', () => {
    const result = resolveFeaturedCards(['ep', 'leg', 'r'], owned)
    expect(result.map((c) => c.id)).toEqual(['ep', 'leg', 'r'])
  })

  it('filters orphaned ids (cards no longer owned)', () => {
    const result = resolveFeaturedCards(['leg', 'recycled-id', 'r'], owned)
    expect(result.map((c) => c.id)).toEqual(['leg', 'r'])
  })

  it('falls back to pickTopByRarity when featured is empty', () => {
    const result = resolveFeaturedCards([], owned)
    expect(result).toHaveLength(5)
    expect(result[0]!.id).toBe('leg')
  })

  it('falls back to pickTopByRarity when all featured were recycled', () => {
    const result = resolveFeaturedCards(['gone1', 'gone2'], owned)
    expect(result).toHaveLength(5)
    expect(result[0]!.id).toBe('leg')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/unit/profile.domain.test.ts -t resolveFeaturedCards
```

Expected: FAIL (`resolveFeaturedCards` not exported).

- [ ] **Step 3: Implement `resolveFeaturedCards`**

Ajouter dans `profile.domain.ts` (sous `pickTopByRarity`) :

```ts
/** Returns the user's featured cards, falling back to pickTopByRarity when
 *  the manual selection is empty or all selected ids have been recycled. */
export function resolveFeaturedCards<T extends OwnedCardLike>(
  featuredIds: string[],
  ownedCards: T[],
): T[] {
  if (featuredIds.length === 0) {
    return pickTopByRarity(ownedCards)
  }
  const byId = new Map(ownedCards.map((c) => [c.id, c]))
  const resolved = featuredIds
    .map((id) => byId.get(id))
    .filter((c): c is T => c !== undefined)
  if (resolved.length === 0) {
    return pickTopByRarity(ownedCards)
  }
  return resolved
}
```

- [ ] **Step 4: Run tests**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/unit/profile.domain.test.ts
```

Expected: 8 tests passent (4 + 4 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add back/src/main/domain/profile/profile.domain.ts back/src/test/unit/profile.domain.test.ts
git commit -m "feat(profile): add resolveFeaturedCards with orphan filtering"
```

---

## Task 7: ProfileDomain — helpers (hashHue, deriveShort)

**Files:**
- Modify: `back/src/main/domain/profile/profile.domain.ts`
- Modify: `back/src/test/unit/profile.domain.test.ts`

- [ ] **Step 1: Add tests**

Ajouter dans `profile.domain.test.ts` :

```ts
import { hashHue, deriveShort } from '../../main/domain/profile/profile.domain'

describe('hashHue', () => {
  it('returns 0–359', () => {
    expect(hashHue('Aube Primordiale')).toBeGreaterThanOrEqual(0)
    expect(hashHue('Aube Primordiale')).toBeLessThan(360)
  })

  it('is deterministic', () => {
    expect(hashHue('Crépuscule')).toBe(hashHue('Crépuscule'))
  })

  it('differs across distinct inputs', () => {
    expect(hashHue('A')).not.toBe(hashHue('B'))
  })
})

describe('deriveShort', () => {
  it('returns 3 uppercase letters from the first word', () => {
    expect(deriveShort('Aube Primordiale')).toBe('AUB')
    expect(deriveShort('Échos d\'Étoiles')).toBe('ECH')
    expect(deriveShort('Crépuscule')).toBe('CRE')
  })

  it('handles short single-word names', () => {
    expect(deriveShort('Ab')).toBe('AB')
  })
})
```

- [ ] **Step 2: Implement helpers**

Ajouter dans `profile.domain.ts` :

```ts
/** Stable hue 0–359 derived from a string (FNV-1a). */
export function hashHue(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 360
}

/** First 3 letters of the first word, ASCII-folded and uppercase. */
export function deriveShort(name: string): string {
  const folded = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, ' ')
    .trim()
    .split(/\s+/)[0] ?? ''
  return folded.slice(0, 3).toUpperCase()
}
```

- [ ] **Step 3: Run tests**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/unit/profile.domain.test.ts
```

Expected: tous les tests passent (8 + 5 = 13).

- [ ] **Step 4: Commit**

```bash
git add back/src/main/domain/profile/profile.domain.ts back/src/test/unit/profile.domain.test.ts
git commit -m "feat(profile): add hashHue and deriveShort helpers"
```

---

## Task 8: ProfileDomain class (with repos)

**Files:**
- Modify: `back/src/main/domain/profile/profile.domain.ts`

- [ ] **Step 1: Add the class at the bottom of profile.domain.ts**

```ts
import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { ProfileDomainInterface } from '../../types/domain/profile/profile.domain.interface'
import type {
  FeaturedCardDto,
  SetProgressionDto,
} from '../../types/domain/profile/profile.types'

export class ProfileDomain implements ProfileDomainInterface {
  readonly #userRepository: IocContainer['userRepository']
  readonly #userCardRepository: IocContainer['userCardRepository']
  readonly #cardRepository: IocContainer['cardRepository']

  constructor({
    userRepository,
    userCardRepository,
    cardRepository,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#userCardRepository = userCardRepository
    this.#cardRepository = cardRepository
  }

  async getFeaturedCards(username: string): Promise<FeaturedCardDto[]> {
    const user = await this.#userRepository.findByUsername(username)
    if (!user) {
      throw Boom.notFound('User not found')
    }
    const owned = await this.#userCardRepository.findByUser(user.id)
    // Pick first variant of each card (the owned list has one row per (cardId, variant)).
    // For featured display we want unique cardIds — prefer the rarer variant.
    const variantPriority: Record<string, number> = {
      HOLOGRAPHIC: 2,
      BRILLIANT: 1,
      NORMAL: 0,
    }
    const byCardId = new Map<string, typeof owned[number]>()
    for (const uc of owned) {
      const current = byCardId.get(uc.card.id)
      if (!current || (variantPriority[uc.variant] ?? 0) > (variantPriority[current.variant] ?? 0)) {
        byCardId.set(uc.card.id, uc)
      }
    }
    const uniqueOwned = Array.from(byCardId.values()).map((uc) => ({
      id: uc.card.id,
      name: uc.card.name,
      imageUrl: uc.card.imageUrl,
      rarity: uc.card.rarity,
      variant: uc.variant,
      setId: uc.card.set.id,
      setName: uc.card.set.name,
    }))
    const resolved = resolveFeaturedCards(user.featuredCardIds, uniqueOwned)
    return resolved
  }

  async getSetsProgression(username: string): Promise<SetProgressionDto[]> {
    const user = await this.#userRepository.findByUsername(username)
    if (!user) {
      throw Boom.notFound('User not found')
    }
    const [sets, counts, allActiveCards] = await Promise.all([
      this.#cardRepository.findActiveSets(),
      this.#userCardRepository.countUniqueBySet(user.id),
      this.#cardRepository.findAllActive(),
    ])
    const totalsBySet = new Map<string, number>()
    for (const c of allActiveCards) {
      totalsBySet.set(c.setId, (totalsBySet.get(c.setId) ?? 0) + 1)
    }
    const progression: SetProgressionDto[] = sets.map((s) => {
      const owned = counts.get(s.id) ?? 0
      const total = totalsBySet.get(s.id) ?? 0
      const percent = total === 0 ? 0 : Math.round((owned / total) * 1000) / 10
      return {
        id: s.id,
        name: s.name,
        short: deriveShort(s.name),
        hue: s.hue ?? hashHue(s.name),
        owned,
        total,
        percent,
      }
    })
    progression.sort((a, b) => b.percent - a.percent)
    return progression
  }

  async setFeaturedCards(userId: string, cardIds: string[]): Promise<string[]> {
    const deduped = Array.from(new Set(cardIds))
    if (deduped.length === 0) {
      await this.#userRepository.updateFeaturedCardIds(userId, [])
      return []
    }
    const owned = await this.#userCardRepository.findByUser(userId)
    const ownedIds = new Set(owned.map((uc) => uc.card.id))
    const invalidIds = deduped.filter((id) => !ownedIds.has(id))
    if (invalidIds.length > 0) {
      throw Boom.badData('Card not in your collection', { invalidIds })
    }
    await this.#userRepository.updateFeaturedCardIds(userId, deduped)
    return deduped
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json
```

Expected: pas d'erreur. Note : la propriété `user.featuredCardIds` requiert que Prisma soit régénéré (Task 1 step 3).

- [ ] **Step 3: Commit**

```bash
git add back/src/main/domain/profile/profile.domain.ts
git commit -m "feat(profile): add ProfileDomain class with featured + sets progression"
```

---

## Task 9: Wire ProfileDomain into IoC

**Files:**
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`

- [ ] **Step 1: Add to IocContainer interface**

Dans `ioc.ts`, ajouter l'import (en cohérence avec les autres) :

```ts
import type { ProfileDomainInterface } from '../domain/profile/profile.domain.interface'
```

Puis dans `interface IocContainer`, ajouter :

```ts
  readonly profileDomain: ProfileDomainInterface
```

- [ ] **Step 2: Register in Awilix**

Dans `awilix-ioc-container.ts`, ajouter l'import en haut :

```ts
import { ProfileDomain } from '../../../domain/profile/profile.domain'
```

Puis ajouter dans le constructor (à côté des autres `#reg(...domain, asClass(...).singleton())`) :

```ts
    this.#reg('profileDomain', asClass(ProfileDomain).singleton())
```

- [ ] **Step 3: Type-check + lint**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json && npm run lint
```

Expected: pas d'erreur.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/types/application/ioc.ts back/src/main/application/ioc/awilix/awilix-ioc-container.ts
git commit -m "feat(profile): register ProfileDomain in IoC container"
```

---

## Task 10: Extend existing profile response with lastLoginAt

The StreakCard's 7-day row needs to know if the user was active *today*. The existing `GET /users/:username/profile` doesn't return `lastLoginAt`. Adding it is a 2-line change to the existing endpoint.

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/schemas/users.schema.ts` (extend `userProfileResponseSchema`)
- Modify: `back/src/main/interfaces/http/fastify/routes/users/index.ts` (handler)

- [ ] **Step 1: Add `lastLoginAt` to the response schema**

Dans `users.schema.ts`, modifier `userProfileResponseSchema` :

```ts
export const userProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  level: z.number().int(),
  xp: z.number().int(),
  dust: z.number().int(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),  // ← NEW
  stats: z.object({
    totalPulls: z.number().int(),
    ownedCards: z.number().int(),
    legendaryCount: z.number().int(),
    dustGenerated: z.number().int(),
  }),
  streakDays: z.number().int(),
  bestStreak: z.number().int(),
})
```

- [ ] **Step 2: Include `lastLoginAt` in the handler response**

Dans `routes/users/index.ts`, dans le handler de `/users/:username/profile`, ajouter dans l'objet retourné :

```ts
        lastLoginAt: user.lastLoginAt,
```

(à insérer juste après `createdAt: user.createdAt,`).

- [ ] **Step 3: Type-check**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json
```

Expected: pas d'erreur.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/interfaces/http/fastify/schemas/users.schema.ts back/src/main/interfaces/http/fastify/routes/users/index.ts
git commit -m "feat(profile): include lastLoginAt in profile response"
```

---

## Task 10b: Zod schemas for new profile endpoints

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/schemas/users.schema.ts`

- [ ] **Step 1: Add the schemas**

Ajouter à la fin de `users.schema.ts` :

```ts
const rarityEnum = z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])
const variantEnum = z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'])

export const featuredCardDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  rarity: rarityEnum,
  variant: variantEnum,
  setId: z.string(),
  setName: z.string(),
})

export const featuredCardsResponseSchema = z.object({
  cards: z.array(featuredCardDtoSchema),
})

export const setProgressionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  hue: z.number().int().min(0).max(360),
  owned: z.number().int().min(0),
  total: z.number().int().min(0),
  percent: z.number().min(0).max(100),
})

export const setsProgressionResponseSchema = z.object({
  sets: z.array(setProgressionDtoSchema),
})

export const setFeaturedCardsBodySchema = z.object({
  cardIds: z.array(z.uuid()).max(5),
})

export const setFeaturedCardsResponseSchema = z.object({
  cardIds: z.array(z.string()),
})
```

- [ ] **Step 2: Type-check**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add back/src/main/interfaces/http/fastify/schemas/users.schema.ts
git commit -m "feat(profile): add Zod schemas for featured cards and sets progression"
```

---

## Task 11: GET /users/:username/profile/featured-cards endpoint

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/users/index.ts`

- [ ] **Step 1: Wire profileDomain + storageClient + register the endpoint**

Au début du `usersRouter`, ajouter `profileDomain` et `storageClient` à la destructuration :

```ts
  const { userRepository, gachaPullRepository, userCardRepository, profileDomain, storageClient } =
    fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null
```

Ajouter aussi en haut du fichier l'import des nouveaux schemas :

```ts
import {
  featuredCardsResponseSchema,
  setsProgressionResponseSchema,
  setFeaturedCardsBodySchema,
  setFeaturedCardsResponseSchema,
  // …les existants
  userProfileResponseSchema,
  usersProfileParamSchema,
  usersSearchQuerySchema,
} from '../../schemas/users.schema'
```

Puis ajouter le handler (après le `/users/:username/profile` existant) :

```ts
  fastify.get(
    '/users/:username/profile/featured-cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: usersProfileParamSchema,
        response: { 200: featuredCardsResponseSchema },
      },
    },
    async (request) => {
      const cards = await profileDomain.getFeaturedCards(request.params.username)
      return {
        cards: cards.map((c) => ({ ...c, imageUrl: resolveUrl(c.imageUrl) })),
      }
    },
  )
```

- [ ] **Step 2: Type-check + lint**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json && npm run lint
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/users/index.ts
git commit -m "feat(profile): add GET /users/:username/profile/featured-cards"
```

---

## Task 12: GET /users/:username/profile/sets-progression endpoint

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/users/index.ts`

- [ ] **Step 1: Register the endpoint**

Sous le précédent, ajouter :

```ts
  fastify.get(
    '/users/:username/profile/sets-progression',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: usersProfileParamSchema,
        response: { 200: setsProgressionResponseSchema },
      },
    },
    async (request) => {
      const sets = await profileDomain.getSetsProgression(request.params.username)
      return { sets }
    },
  )
```

- [ ] **Step 2: Type-check + lint**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json && npm run lint
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/users/index.ts
git commit -m "feat(profile): add GET /users/:username/profile/sets-progression"
```

---

## Task 13: PUT /users/me/featured-cards endpoint

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/users/index.ts`

- [ ] **Step 1: Register the endpoint**

Sous le précédent :

```ts
  fastify.put(
    '/users/me/featured-cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: setFeaturedCardsBodySchema,
        response: { 200: setFeaturedCardsResponseSchema },
      },
    },
    async (request) => {
      const cardIds = await profileDomain.setFeaturedCards(
        request.user.userID,
        request.body.cardIds,
      )
      return { cardIds }
    },
  )
```

- [ ] **Step 2: Type-check + lint**

```bash
cd back && npx tsc --noEmit -p src/main/tsconfig.json && npm run lint
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/users/index.ts
git commit -m "feat(profile): add PUT /users/me/featured-cards"
```

---

## Task 14: E2E test — featured-cards fallback

**Files:**
- Create: `back/src/test/e2e/profile/featured-cards-fallback.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/featured-cards — fallback', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const username = `featfb${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Register user
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    // Seed a set + 5 cards (one per rarity) and give them to the user
    const set = await prisma.cardSet.create({
      data: { name: `FbSet${suffix}`, isActive: true },
    })
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
    for (const rarity of rarities) {
      const card = await prisma.card.create({
        data: { name: `${rarity}-${suffix}`, rarity, dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 5 cards in rarity order when no manual selection', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/featured-cards`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards).toHaveLength(5)
    expect(body.cards.map((c: any) => c.rarity)).toEqual([
      'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON',
    ])
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/e2e/profile/featured-cards-fallback.test.ts
```

Expected: passe.

- [ ] **Step 3: Commit**

```bash
git add back/src/test/e2e/profile/featured-cards-fallback.test.ts
git commit -m "test(profile): e2e test for featured-cards fallback"
```

---

## Task 15: E2E test — featured-cards manual selection

**Files:**
- Create: `back/src/test/e2e/profile/featured-cards-manual.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/featured-cards — manual selection', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let manualIds: string[]

  const suffix = Date.now()
  const username = `featman${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    const set = await prisma.cardSet.create({
      data: { name: `ManSet${suffix}`, isActive: true },
    })
    const ids: string[] = []
    for (const rarity of ['COMMON', 'COMMON', 'EPIC', 'LEGENDARY', 'RARE'] as const) {
      const card = await prisma.card.create({
        data: { name: `${rarity}-${suffix}-${ids.length}`, rarity, dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
      ids.push(card.id)
    }

    // Manual selection: pick 3 cards in a specific order (EPIC, COMMON1, LEGENDARY)
    manualIds = [ids[2]!, ids[0]!, ids[3]!]
    await prisma.user.update({ where: { id: user!.id }, data: { featuredCardIds: manualIds } })
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns featured cards in the saved order, not the fallback', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/featured-cards`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards.map((c: any) => c.id)).toEqual(manualIds)
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/e2e/profile/featured-cards-manual.test.ts
```

Expected: passe.

- [ ] **Step 3: Commit**

```bash
git add back/src/test/e2e/profile/featured-cards-manual.test.ts
git commit -m "test(profile): e2e test for manual featured cards"
```

---

## Task 16: E2E test — featured-cards orphaned

**Files:**
- Create: `back/src/test/e2e/profile/featured-cards-orphaned.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/featured-cards — orphaned ids', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  const suffix = Date.now()
  const username = `featorph${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password },
    })
    const cookies = loginRes.headers['set-cookie'] as string
    ;(global as any).__orphCookies = cookies

    const user = await prisma.user.findUnique({ where: { email } })
    const set = await prisma.cardSet.create({
      data: { name: `OrphSet${suffix}`, isActive: true },
    })
    const ids: string[] = []
    for (const rarity of ['RARE', 'EPIC', 'LEGENDARY'] as const) {
      const card = await prisma.card.create({
        data: { name: `${rarity}-${suffix}`, rarity, dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
      ids.push(card.id)
    }
    // Save 3 in featured then delete one userCard (simulate recycle)
    await prisma.user.update({ where: { id: user!.id }, data: { featuredCardIds: ids } })
    await prisma.userCard.deleteMany({ where: { userId: user!.id, cardId: ids[0] } })
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns only owned cards, orphans filtered', async () => {
    const cookies = (global as any).__orphCookies as string
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/featured-cards`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/e2e/profile/featured-cards-orphaned.test.ts
```

Expected: passe.

- [ ] **Step 3: Commit**

```bash
git add back/src/test/e2e/profile/featured-cards-orphaned.test.ts
git commit -m "test(profile): e2e test for orphaned featured cards"
```

---

## Task 17: E2E test — PUT /users/me/featured-cards

**Files:**
- Create: `back/src/test/e2e/profile/set-featured-cards.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('PUT /users/me/featured-cards', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let ownedIds: string[]

  const suffix = Date.now()
  const username = `setfeat${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    const set = await prisma.cardSet.create({
      data: { name: `PutSet${suffix}`, isActive: true },
    })
    ownedIds = []
    for (let i = 0; i < 6; i++) {
      const card = await prisma.card.create({
        data: { name: `C${i}-${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
      ownedIds.push(card.id)
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('saves up to 5 cards (200)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: ownedIds.slice(0, 5) },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().cardIds).toEqual(ownedIds.slice(0, 5))
  })

  it('rejects more than 5 ids (422 via Zod)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: ownedIds },
    })
    expect(res.statusCode).toBe(400) // Zod renvoie 400 par défaut via fastify-type-provider-zod
  })

  it('rejects unowned card ids with invalidIds in payload', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000'
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: [ownedIds[0], fakeId] },
    })
    expect(res.statusCode).toBe(422)
    const body = res.json()
    expect(body.data?.invalidIds ?? body.invalidIds).toContain(fakeId)
  })

  it('deduplicates silently', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: [ownedIds[0], ownedIds[0], ownedIds[1]] },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().cardIds).toEqual([ownedIds[0], ownedIds[1]])
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/e2e/profile/set-featured-cards.test.ts
```

Expected: 4 tests passent. Note : si le test "invalidIds" échoue à cause de l'enveloppe Boom, ajuster l'accès au champ — `body.data?.invalidIds` est le shape Boom standard.

- [ ] **Step 3: Commit**

```bash
git add back/src/test/e2e/profile/set-featured-cards.test.ts
git commit -m "test(profile): e2e tests for PUT featured-cards"
```

---

## Task 18: E2E test — sets-progression

**Files:**
- Create: `back/src/test/e2e/profile/sets-progression.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/sets-progression', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const username = `setprog${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    // 2 active sets — own 2/3 in set A, 0/2 in set B
    const setA = await prisma.cardSet.create({ data: { name: `SetA${suffix}`, isActive: true, hue: 35 } })
    const setB = await prisma.cardSet.create({ data: { name: `SetB${suffix}`, isActive: true } })
    const a1 = await prisma.card.create({ data: { name: 'a1', rarity: 'COMMON', dropWeight: 10, setId: setA.id } })
    const a2 = await prisma.card.create({ data: { name: 'a2', rarity: 'COMMON', dropWeight: 10, setId: setA.id } })
    await prisma.card.create({ data: { name: 'a3', rarity: 'COMMON', dropWeight: 10, setId: setA.id } })
    await prisma.card.create({ data: { name: 'b1', rarity: 'COMMON', dropWeight: 10, setId: setB.id } })
    await prisma.card.create({ data: { name: 'b2', rarity: 'COMMON', dropWeight: 10, setId: setB.id } })
    await prisma.userCard.create({ data: { userId: user!.id, cardId: a1.id, variant: 'NORMAL', quantity: 1 } })
    await prisma.userCard.create({ data: { userId: user!.id, cardId: a2.id, variant: 'NORMAL', quantity: 1 } })
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns owned/total/percent for each active set sorted by percent desc', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/sets-progression`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const setA = body.sets.find((s: any) => s.name.startsWith('SetA'))
    const setB = body.sets.find((s: any) => s.name.startsWith('SetB'))
    expect(setA).toMatchObject({ owned: 2, total: 3, hue: 35 })
    expect(setB).toMatchObject({ owned: 0, total: 2 })
    expect(typeof setB.hue).toBe('number') // fallback hash
    expect(body.sets[0].percent).toBeGreaterThanOrEqual(body.sets[1].percent)
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/e2e/profile/sets-progression.test.ts
```

Expected: passe.

- [ ] **Step 3: Commit**

```bash
git add back/src/test/e2e/profile/sets-progression.test.ts
git commit -m "test(profile): e2e test for sets-progression"
```

---

## Task 19: Backend final check

- [ ] **Step 1: Run all profile tests**

```bash
cd back && npx jest -c src/test/jest.config.ts src/test/unit/profile.domain.test.ts src/test/e2e/profile/
```

Expected: tous les tests passent.

- [ ] **Step 2: Full validate**

```bash
cd back && npm run lint && npm run build
```

Expected: lint et build OK.

- [ ] **Step 3: If anything fails, fix inline before continuing**

Le backend doit être totalement vert avant d'attaquer le front.

---

## Task 20: Load Google Fonts in index.html

**Files:**
- Modify: `front/index.html`

- [ ] **Step 1: Add font preconnect + stylesheet in `<head>`**

Avant `</head>` dans `front/index.html`, ajouter :

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Visual verification (manual)**

Lancer le dev server et confirmer que les polices ne cassent pas la page (Figtree/Nunito existants restent appliqués sur le `body`).

```bash
cd front && npm run dev
```

Ouvrir `http://localhost:4269/`, vérifier qu'aucune page existante n'a changé visuellement.

- [ ] **Step 3: Commit**

```bash
git add front/index.html
git commit -m "feat(profile): preload Bricolage Grotesque + DM Sans + JetBrains Mono"
```

---

## Task 21: Create _arcade.css tokens

**Files:**
- Create: `front/src/styles/_arcade.css`
- Modify: `front/src/styles/_globals.css`

- [ ] **Step 1: Create the arcade tokens file**

```css
/* front/src/styles/_arcade.css
 * Scoped tokens for the "Arcade clair" theme. Activated by wrapping content
 * in <div className="arcade-theme">. Designed to be promotable to :root
 * in a future global-theme-migration project.
 */
.arcade-theme {
  --arcade-bg: #fbf8f3;
  --arcade-surface: #ffffff;
  --arcade-surface-2: #fafaf7;
  --arcade-surface-3: #f4f0eb;
  --arcade-text: #1b1726;
  --arcade-text-muted: rgba(27, 23, 38, 0.55);
  --arcade-border: rgba(27, 23, 38, 0.08);
  --arcade-border-strong: rgba(27, 23, 38, 0.12);
  --arcade-amber: #f59e0b;
  --arcade-amber-light: #fbbf24;
  --arcade-amber-deep: #d97706;
  --arcade-amber-soft: #fde68a;

  --rarity-common: #22c55e;
  --rarity-uncommon: #3b82f6;
  --rarity-rare: #8b5cf6;
  --rarity-epic: #ec4899;
  --rarity-legendary: #f59e0b;

  --shadow-card:
    0 2px 0 rgba(27, 23, 38, 0.04),
    0 12px 30px -12px rgba(27, 23, 38, 0.08);

  background-color: var(--arcade-bg);
  color: var(--arcade-text);
  font-family: "DM Sans", system-ui, -apple-system, sans-serif;
}

.arcade-theme .font-display {
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  letter-spacing: -0.02em;
}

.arcade-theme .font-mono {
  font-family: "JetBrains Mono", ui-monospace, monospace;
}

@keyframes foilSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .arcade-theme *,
  .arcade-theme *::before,
  .arcade-theme *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Import it from `_globals.css`**

Dans `front/src/styles/_globals.css`, après `@import "./_variables.css";` :

```css
@import "./_arcade.css";
```

- [ ] **Step 3: Commit**

```bash
git add front/src/styles/_arcade.css front/src/styles/_globals.css
git commit -m "feat(profile): add scoped arcade-theme tokens"
```

---

## Task 22: Extend profile constants and routes

**Files:**
- Modify: `front/src/constants/profile.constant.ts`

- [ ] **Step 1: Add types and routes**

Remplacer le bloc `PROFILE_ROUTES` et ajouter les types en haut :

```ts
// Types — exposed via re-export from profile.api.ts
// (Update the existing `UserProfile` type — add `lastLoginAt`)
//
// export type UserProfile = {
//   …
//   createdAt: string
//   lastLoginAt: string | null  // ← NEW
//   stats: { … }
//   …
// }
//
// Add this field to the existing UserProfile type definition.

export type FeaturedCard = {
  id: string
  name: string
  imageUrl: string | null
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  variant: 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'
  setId: string
  setName: string
}

export type SetProgression = {
  id: string
  name: string
  short: string
  hue: number
  owned: number
  total: number
  percent: number
}
```

Et dans `PROFILE_ROUTES`, ajouter :

```ts
export const PROFILE_ROUTES = {
  profile: (username: string) => `/users/${username}/profile`,
  featuredCards: (username: string) => `/users/${username}/profile/featured-cards`,
  setsProgression: (username: string) => `/users/${username}/profile/sets-progression`,
  mySetFeaturedCards: '/users/me/featured-cards',
  apiKeys: '/api-keys',
  apiKey: (id: string) => `/api-keys/${id}`,
} as const
```

- [ ] **Step 2: Type-check**

```bash
cd front && npx tsc -b
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/constants/profile.constant.ts
git commit -m "feat(profile): add featured cards and sets progression types/routes"
```

---

## Task 23: Extend profile.api.ts

**Files:**
- Modify: `front/src/api/profile.api.ts`

- [ ] **Step 1: Add methods**

Ajouter dans l'import : `FeaturedCard, SetProgression`. Ajouter dans `ProfileApi` :

```ts
  getFeaturedCards: async (
    username: string,
  ): Promise<{ cards: FeaturedCard[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.featuredCards(username)}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des cartes vedettes')
    }
    return res.json()
  },

  getSetsProgression: async (
    username: string,
  ): Promise<{ sets: SetProgression[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.setsProgression(username)}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération de la progression')
    }
    return res.json()
  },

  setFeaturedCards: async (
    cardIds: string[],
  ): Promise<{ cardIds: string[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.mySetFeaturedCards}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIds }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de l\'enregistrement des cartes vedettes')
    }
    return res.json()
  },
```

Et étendre le `export type` en haut :

```ts
export type { UserProfile, ApiKey, ApiKeyCreated, FeaturedCard, SetProgression }
```

- [ ] **Step 2: Type-check**

```bash
cd front && npx tsc -b
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/api/profile.api.ts
git commit -m "feat(profile): add api methods for featured cards and sets"
```

---

## Task 24: Extend useProfile.ts hooks + mutation

**Files:**
- Modify: `front/src/queries/useProfile.ts`

- [ ] **Step 1: Add hooks and mutation**

Ajouter en bas du fichier (avec les imports nécessaires de `useQuery`, `useMutation`, `useQueryClient`, `ProfileApi`) :

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ProfileApi } from '../api/profile.api'
import { useAuthStore } from '../stores/auth.store'

export function useUserFeaturedCards(username: string) {
  return useQuery({
    queryKey: ['profile', username, 'featured-cards'],
    queryFn: () => ProfileApi.getFeaturedCards(username),
  })
}

export function useUserSetsProgression(username: string) {
  return useQuery({
    queryKey: ['profile', username, 'sets-progression'],
    queryFn: () => ProfileApi.getSetsProgression(username),
  })
}

export function useSetFeaturedCardsMutation() {
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user?.username)
  return useMutation({
    mutationFn: (cardIds: string[]) => ProfileApi.setFeaturedCards(cardIds),
    onSuccess: () => {
      if (me) {
        qc.invalidateQueries({ queryKey: ['profile', me, 'featured-cards'] })
      }
    },
  })
}
```

Note : si `useUserProfile` est déjà importé/exporté depuis ce fichier, garde-le tel quel. Ne pas dupliquer.

- [ ] **Step 2: Type-check**

```bash
cd front && npx tsc -b
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/queries/useProfile.ts
git commit -m "feat(profile): add hooks and mutation for featured cards"
```

---

## Task 25: Front utils (hashHue, deriveShort, weekDays)

**Files:**
- Create: `front/src/components/profile/arcade/utils.ts`

- [ ] **Step 1: Create the file**

```ts
// front/src/components/profile/arcade/utils.ts

/** Stable hue 0–359 derived from a string (FNV-1a). Mirrors backend hashHue. */
export function hashHue(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 360
}

/** First 3 letters of the first word, ASCII-folded, uppercase. */
export function deriveShort(name: string): string {
  const folded = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, ' ')
    .trim()
    .split(/\s+/)[0] ?? ''
  return folded.slice(0, 3).toUpperCase()
}

/** Returns the labels and ISO day-of-week for the current week, Monday-first. */
export function weekDays(today = new Date()): Array<{ label: string; isToday: boolean; dow: number }> {
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayDow = ((today.getUTCDay() + 6) % 7) // Monday = 0
  return labels.map((label, i) => ({ label, dow: i, isToday: i === todayDow }))
}

/** True if `lastLoginAt` is the same UTC day as today. */
export function isLoggedInToday(lastLoginAt: string | Date | null): boolean {
  if (!lastLoginAt) return false
  const last = new Date(lastLoginAt)
  const now = new Date()
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  )
}

export const RARITY_COLORS = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  EPIC: 'var(--rarity-epic)',
  LEGENDARY: 'var(--rarity-legendary)',
} as const

export type ArcadeRarity = keyof typeof RARITY_COLORS
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/utils.ts
git commit -m "feat(profile): add arcade utils (hue, short, weekDays)"
```

---

## Task 26: ArcadeBackground component

**Files:**
- Create: `front/src/components/profile/arcade/ArcadeBackground.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/ArcadeBackground.tsx
// Aurora + grid decorative layers. See reference/arcade.css `.bg-aurora` and
// `.bg-grid` in the design handoff for the exact gradients and grid step.

export function ArcadeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.18), transparent 55%),
            radial-gradient(circle at 80% 12%, rgba(139, 92, 246, 0.14), transparent 55%),
            radial-gradient(circle at 50% 90%, rgba(236, 72, 153, 0.10), transparent 55%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(27,23,38,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(27,23,38,.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeBackground.tsx
git commit -m "feat(profile): add ArcadeBackground (aurora + grid)"
```

---

## Task 27: FoilAvatar component

**Files:**
- Create: `front/src/components/profile/arcade/FoilAvatar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/FoilAvatar.tsx
import { cn } from '../../../libs/utils'

type Props = {
  initials: string
  isMax?: boolean
  size?: number
  className?: string
}

export function FoilAvatar({ initials, isMax = false, size = 112, className }: Props) {
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-[24%]"
        style={{
          background:
            'conic-gradient(from 0deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #22c55e, #f59e0b)',
          animation: 'foilSpin 6s linear infinite',
          padding: 6,
          filter: isMax ? 'drop-shadow(0 0 14px rgba(245,158,11,.55))' : undefined,
        }}
      >
        <div
          className="h-full w-full rounded-[20%] flex items-center justify-center text-white font-display"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
            fontSize: size * 0.45,
            fontWeight: 800,
          }}
        >
          {initials}
        </div>
      </div>
      {isMax && (
        <div
          className="absolute -top-1 -right-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold"
          style={{
            background: 'linear-gradient(135deg, #fde68a, #f59e0b, #d97706)',
            color: '#422006',
            transform: 'rotate(8deg)',
            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)',
          }}
        >
          MAX
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/FoilAvatar.tsx
git commit -m "feat(profile): add FoilAvatar component"
```

---

## Task 28: cardArt placeholder

**Files:**
- Create: `front/src/components/profile/arcade/cardArt.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/cardArt.tsx
// Placeholder SVG card art when card.imageUrl is null.
// Inspired by the design reference's <CardArt /> abstract emblem-per-rarity.
import type { ArcadeRarity } from './utils'

const RARITY_FRAME: Record<ArcadeRarity, string> = {
  COMMON: 'linear-gradient(135deg, #86efac, #22c55e)',
  UNCOMMON: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
  RARE: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)',
  EPIC: 'linear-gradient(135deg, #f9a8d4, #ec4899)',
  LEGENDARY: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
}

type Props = {
  rarity: ArcadeRarity
  name: string
  setName?: string
  imageUrl?: string | null
}

export function CardArt({ rarity, name, setName, imageUrl }: Props) {
  return (
    <div
      className="relative aspect-[3/4] w-full overflow-hidden rounded-xl"
      style={{ background: RARITY_FRAME[rarity], padding: 4 }}
    >
      <div className="absolute inset-1 rounded-lg bg-white flex flex-col">
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            background: imageUrl
              ? `url(${imageUrl}) center/cover`
              : `radial-gradient(circle at center, ${RARITY_FRAME[rarity]
                  .replace('linear-gradient(135deg, ', '')
                  .split(',')[0]}, transparent 70%)`,
          }}
        >
          {!imageUrl && (
            <svg width="60%" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="1.5" opacity="0.85">
              <circle cx="50" cy="50" r="32" />
              <polygon points="50,18 82,82 18,82" />
            </svg>
          )}
        </div>
        <div className="px-2 py-1.5 border-t border-[var(--arcade-border)]">
          <div className="font-display text-[11px] font-extrabold text-[var(--arcade-text)] truncate">{name}</div>
          {setName && (
            <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--arcade-text-muted)] truncate">
              {setName}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/cardArt.tsx
git commit -m "feat(profile): add CardArt placeholder component"
```

---

## Task 29: FeaturedCardsFan component

**Files:**
- Create: `front/src/components/profile/arcade/FeaturedCardsFan.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/FeaturedCardsFan.tsx
import { useState } from 'react'

import type { FeaturedCard } from '../../../api/profile.api'
import { CardArt } from './cardArt'
import type { ArcadeRarity } from './utils'

type Props = {
  cards: FeaturedCard[]
}

export function FeaturedCardsFan({ cards }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-[var(--arcade-border)] text-[var(--arcade-text-muted)] font-mono text-sm">
        Aucune carte encore — fais ton premier tirage.
      </div>
    )
  }

  return (
    <div className="relative flex justify-center items-end" style={{ minHeight: 280, paddingLeft: 40 }}>
      {cards.map((card, i) => {
        const rotation = (i - 2) * 5
        const offset = Math.abs(i - 2) * 10
        const isHovered = hovered === i
        const isDimmed = hovered !== null && hovered !== i
        return (
          <div
            key={card.id}
            className="w-[170px] transition-all duration-[350ms]"
            style={{
              transform: isHovered
                ? 'translateY(-26px) rotate(0deg) scale(1.06)'
                : `translateY(${offset}px) rotate(${rotation}deg)`,
              transformOrigin: '50% 100%',
              marginLeft: i === 0 ? 0 : -38,
              filter: isDimmed
                ? 'brightness(.65) saturate(.7)'
                : 'drop-shadow(0 14px 24px rgba(27,23,38,.18))',
              transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
              zIndex: isHovered ? 50 : i,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${card.name} — ${card.rarity}`}
          >
            <CardArt
              rarity={card.rarity as ArcadeRarity}
              name={card.name}
              setName={card.setName}
              imageUrl={card.imageUrl}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/FeaturedCardsFan.tsx
git commit -m "feat(profile): add FeaturedCardsFan with hover interactions"
```

---

## Task 30: FeaturedCardsEditorModal

**Files:**
- Create: `front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx
import { useState } from 'react'
import { X } from 'lucide-react'

import { useUserCollection } from '../../../queries/useCollection'
import { useSetFeaturedCardsMutation } from '../../../queries/useProfile'
import { useAuthStore } from '../../../stores/auth.store'
import { CardArt } from './cardArt'
import type { ArcadeRarity } from './utils'

type Props = {
  open: boolean
  initialIds: string[]
  onClose: () => void
  onSaved?: () => void
}

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

export function FeaturedCardsEditorModal({ open, initialIds, onClose, onSaved }: Props) {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: collection } = useUserCollection(userId)
  const mutation = useSetFeaturedCardsMutation()
  const [selected, setSelected] = useState<string[]>(initialIds.slice(0, 5))

  if (!open) return null

  // Flatten and dedup userCards by cardId — featured uses cardId, not userCardId.
  const ownedById = new Map<string, { id: string; name: string; rarity: ArcadeRarity; setName: string; imageUrl: string | null }>()
  for (const uc of collection?.cards ?? []) {
    if (!ownedById.has(uc.card.id)) {
      ownedById.set(uc.card.id, {
        id: uc.card.id,
        name: uc.card.name,
        rarity: uc.card.rarity as ArcadeRarity,
        setName: uc.card.set.name,
        imageUrl: uc.card.imageUrl,
      })
    }
  }
  const owned = Array.from(ownedById.values()).sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  const save = async () => {
    await mutation.mutateAsync(selected)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="arcade-theme max-w-4xl w-[92%] max-h-[85vh] rounded-2xl bg-[var(--arcade-surface)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--arcade-border)]">
          <div>
            <h2 className="font-display text-xl font-extrabold">Cartes vedettes</h2>
            <p className="font-mono text-xs text-[var(--arcade-text-muted)]">
              {selected.length} / 5 sélectionnées · clique pour ajouter / retirer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--arcade-surface-2)]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {owned.map((c) => {
            const isSelected = selected.includes(c.id)
            const order = selected.indexOf(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`relative text-left ${isSelected ? 'ring-2 ring-[var(--arcade-amber)] rounded-xl' : ''}`}
                style={{ opacity: !isSelected && selected.length >= 5 ? 0.4 : 1 }}
                disabled={!isSelected && selected.length >= 5}
              >
                <CardArt rarity={c.rarity} name={c.name} setName={c.setName} imageUrl={c.imageUrl} />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[var(--arcade-amber)] text-white text-xs font-bold flex items-center justify-center font-mono">
                    {order + 1}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-[var(--arcade-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--arcade-border-strong)] font-medium"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{
              background: 'linear-gradient(135deg, var(--arcade-amber), #ec4899)',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
            }}
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

Note : `useUserCollection(userId)` existe déjà dans `front/src/queries/useCollection.ts` et renvoie `{ cards: UserCard[] }` où chaque UserCard a la shape `{ card: { id, name, imageUrl, rarity, set: { name, id } }, variant, quantity, obtainedAt }`. Le `userId` vient de `useAuthStore(s => s.user?.id)`.

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx
git commit -m "feat(profile): add FeaturedCardsEditorModal (pick-5)"
```

---

## Task 31: ArcadeHero

**Files:**
- Create: `front/src/components/profile/arcade/ArcadeHero.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/ArcadeHero.tsx
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile, FeaturedCard } from '../../../api/profile.api'
import { FeaturedCardsEditorModal } from './FeaturedCardsEditorModal'
import { FeaturedCardsFan } from './FeaturedCardsFan'
import { FoilAvatar } from './FoilAvatar'

type Props = {
  profile: UserProfile
  featuredCards: FeaturedCard[]
  isOwnProfile: boolean
}

export function ArcadeHero({ profile, featuredCards, isOwnProfile }: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  // NOTE: Click → ouvrir le détail de la carte est OUT OF SCOPE pour ce tour.
  // `CardViewModal` existant attend une `DisplayEntry` (shape différente du
  // FeaturedCardDto). On laissera les cartes hoverables mais non cliquables.
  const isMax = profile.level >= 100
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <section
      className="relative rounded-3xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-8"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="grid gap-8" style={{ gridTemplateColumns: '360px 1fr' }}>
        {/* Identity */}
        <div className="flex flex-col gap-5">
          <FoilAvatar initials={initials} isMax={isMax} />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[.2em] text-[var(--arcade-amber-light)]">
              {isMax ? `NIV. MAX · MEMBRE ${joinedYear}` : `NIV. ${profile.level} · MEMBRE ${joinedYear}`}
            </div>
            <h1 className="font-display text-[52px] font-extrabold leading-none text-[var(--arcade-text)] mt-1">
              @{profile.username}
            </h1>
            <div className="flex gap-2 mt-3 flex-wrap">
              {isMax ? (
                <span
                  className="font-mono text-[10px] px-2 py-1 rounded-full font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #fde68a, #fbbf24)',
                    color: '#6b3a00',
                  }}
                >
                  LV. MAX
                </span>
              ) : (
                <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-[var(--arcade-surface-2)]">
                  LV. {profile.level}
                </span>
              )}
              <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-[var(--arcade-surface-2)]">
                {profile.stats.ownedCards} cartes
              </span>
            </div>
          </div>
        </div>

        {/* Featured cards column */}
        <div className="relative">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">Cartes vedettes</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-[var(--arcade-text-muted)]">
                TOP {featuredCards.length} · PAR RARETÉ
              </span>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="font-mono text-[11px] px-2 py-1 rounded-full flex items-center gap-1 hover:bg-[var(--arcade-surface-2)]"
                >
                  <Pencil size={12} />
                  Éditer
                </button>
              )}
            </div>
          </div>
          <FeaturedCardsFan cards={featuredCards} />
        </div>
      </div>

      {isOwnProfile && (
        <FeaturedCardsEditorModal
          open={editorOpen}
          initialIds={featuredCards.map((c) => c.id)}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </section>
  )
}
```

Note : la spec mentionnait "Clic → ouvre CardViewModal existant" mais ce composant prend une `DisplayEntry` propre à la page collection (shape différente du `FeaturedCardDto`). Brancher un détail de carte cliquable depuis la page profil sera fait dans un projet ultérieur.

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeHero.tsx
git commit -m "feat(profile): add ArcadeHero with identity + featured fan"
```

---

## Task 32: StatCard + StatGrid

**Files:**
- Create: `front/src/components/profile/arcade/StatCard.tsx`
- Create: `front/src/components/profile/arcade/StatGrid.tsx`

- [ ] **Step 1: StatCard**

```tsx
// front/src/components/profile/arcade/StatCard.tsx
import type { LucideIcon } from 'lucide-react'

import type { ArcadeRarity } from './utils'
import { RARITY_COLORS } from './utils'

type Props = {
  icon: LucideIcon
  label: string
  value: number
  rarity: ArcadeRarity
  hint?: string
}

export function StatCard({ icon: Icon, label, value, rarity, hint }: Props) {
  const color = RARITY_COLORS[rarity]
  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-[22px] pl-[18px] flex items-center gap-4"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Top color bar */}
      <span className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      {/* Decorative disc */}
      <span
        className="absolute -right-12 -top-12 w-44 h-44 rounded-full -z-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-30"
        style={{ background: color, opacity: 0.12 }}
      />
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 18%, white)`,
          color,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--arcade-text-muted)]">
          {label}
        </span>
        <span className="font-display text-[48px] font-extrabold leading-none tabular-nums text-[var(--arcade-text)]">
          {value.toLocaleString('fr-FR')}
        </span>
        {hint && (
          <span className="italic text-xs text-[var(--arcade-text-muted)] mt-1">{hint}</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: StatGrid**

```tsx
// front/src/components/profile/arcade/StatGrid.tsx
import { Layers, Sparkles, Star, Zap } from 'lucide-react'

import type { UserProfile } from '../../../api/profile.api'
import { StatCard } from './StatCard'

type Props = { profile: UserProfile }

export function StatGrid({ profile }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Star} label="Tirages" value={profile.stats.totalPulls} rarity="LEGENDARY" />
      <StatCard icon={Layers} label="Cartes uniques" value={profile.stats.ownedCards} rarity="UNCOMMON" />
      <StatCard
        icon={Sparkles}
        label="Légendaires"
        value={profile.stats.legendaryCount}
        rarity="EPIC"
        hint={profile.stats.legendaryCount === 0 ? 'première en attente' : undefined}
      />
      <StatCard icon={Zap} label="Dust généré" value={profile.stats.dustGenerated} rarity="RARE" />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/StatCard.tsx front/src/components/profile/arcade/StatGrid.tsx
git commit -m "feat(profile): add StatCard and StatGrid"
```

---

## Task 33: XPCard

**Files:**
- Create: `front/src/components/profile/arcade/XPCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/XPCard.tsx
import type { UserProfile } from '../../../api/profile.api'

type Props = { profile: UserProfile }

export function XPCard({ profile }: Props) {
  const isMax = profile.level >= 100
  const xpForLevel = (n: number) => (n - 1) ** 2 * 100
  const xpInLevel = profile.xp - xpForLevel(profile.level)
  const xpNeeded = xpForLevel(profile.level + 1) - xpForLevel(profile.level)
  const percent = isMax ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return (
    <div
      className="rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">Expérience</h3>
        <span
          className="font-mono text-[11px] font-bold uppercase"
          style={{
            color: isMax ? 'var(--arcade-amber)' : 'var(--arcade-text-muted)',
          }}
        >
          {isMax ? `LV. ${profile.level} · MAX` : `LV. ${profile.level}`}
        </span>
      </div>
      <div className="relative h-[22px] rounded-full bg-[var(--arcade-surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background:
              'linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6, #ec4899, #f59e0b)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 4s linear infinite',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
          }}
        />
        {/* 20 tick separators */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="flex-1 border-r border-white/45 last:border-r-0"
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[11px] mt-3">
        <span className="text-[var(--arcade-text-muted)]">
          {isMax ? '00 / MAX' : `${xpInLevel.toLocaleString('fr-FR')} / ${xpNeeded.toLocaleString('fr-FR')}`}
        </span>
        <span style={{ color: 'var(--arcade-amber)' }}>+ Prestige bientôt</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/XPCard.tsx
git commit -m "feat(profile): add XPCard with shimmer rainbow bar"
```

---

## Task 34: StreakCard

**Files:**
- Create: `front/src/components/profile/arcade/StreakCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/StreakCard.tsx
import { ChevronRight, Flame, Trophy } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile } from '../../../api/profile.api'
import { StreakSummaryModal } from '../../streak/StreakSummaryModal'
import { isLoggedInToday, weekDays } from './utils'

type Props = {
  profile: UserProfile
  lastLoginAt?: string | null
  isOwnProfile: boolean
}

export function StreakCard({ profile, lastLoginAt, isOwnProfile }: Props) {
  const [open, setOpen] = useState(false)
  const days = weekDays()
  const todayActive = isLoggedInToday(lastLoginAt ?? null)

  return (
    <>
      <div
        className={`rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-6 ${
          isOwnProfile ? 'cursor-pointer hover:border-[var(--arcade-border-strong)]' : ''
        }`}
        style={{ boxShadow: 'var(--shadow-card)' }}
        onClick={() => isOwnProfile && setOpen(true)}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">Streak de connexion</h3>
          {isOwnProfile && <ChevronRight size={16} className="text-[var(--arcade-text-muted)]" />}
        </div>
        <div className="flex items-end gap-8">
          <div>
            <div className="flex items-center gap-2">
              <Flame size={28} color="#fb923c" style={{ filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.5))' }} />
              <span className="font-display text-[64px] font-extrabold leading-none">{profile.streakDays}</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--arcade-text-muted)]">Jour</div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-[var(--arcade-amber-light)]" />
              <span className="font-display text-[36px] font-extrabold leading-none">{profile.bestStreak}</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--arcade-text-muted)]">Record</div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          {days.map((d) => {
            const active = d.isToday && todayActive
            return (
              <div key={d.dow} className="flex-1 flex flex-col items-center gap-1">
                <span
                  className="h-[6px] w-full rounded-full"
                  style={{
                    background: active
                      ? 'linear-gradient(90deg, #fbbf24, #fb923c)'
                      : 'var(--arcade-surface-2)',
                    boxShadow: active ? '0 0 8px rgba(251, 146, 60, 0.5)' : undefined,
                  }}
                />
                <span className="font-mono text-[10px] text-[var(--arcade-text-muted)]">{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
      {isOwnProfile && <StreakSummaryModal open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
```

Note : si `UserProfile` n'inclut pas `lastLoginAt`, le prop reste optionnel et le streak du jour reste juste l'indicateur "pas actif aujourd'hui". On peut le rajouter au backend dans une étape ultérieure si besoin.

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/StreakCard.tsx
git commit -m "feat(profile): add StreakCard with 7-day row"
```

---

## Task 35: SetsProgressionCard

**Files:**
- Create: `front/src/components/profile/arcade/SetsProgressionCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/SetsProgressionCard.tsx
import type { SetProgression } from '../../../api/profile.api'

type Props = { sets: SetProgression[] }

export function SetsProgressionCard({ sets }: Props) {
  const totalOwned = sets.reduce((acc, s) => acc + s.owned, 0)
  const totalCards = sets.reduce((acc, s) => acc + s.total, 0)

  return (
    <div
      className="rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">Progression par extension</h3>
        <span className="font-mono text-[11px] text-[var(--arcade-text-muted)]">
          {sets.length} SETS · {totalOwned} / {totalCards}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sets.map((s) => (
          <div
            key={s.id}
            className="relative overflow-hidden rounded-xl p-4 border"
            style={{
              background: `hsl(${s.hue}, 100%, 96%)`,
              borderColor: `hsl(${s.hue}, 60%, 85%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] shrink-0 text-white font-display font-extrabold"
                style={{ background: `hsl(${s.hue}, 70%, 50%)` }}
              >
                {s.short}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[var(--arcade-text)] truncate">{s.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--arcade-text-muted)]">
                  {s.owned} / {s.total} CARTES
                </div>
              </div>
              <div
                className="font-display text-[28px] font-extrabold leading-none"
                style={{ color: `hsl(${s.hue}, 60%, 28%)` }}
              >
                {Math.round(s.percent)}%
              </div>
            </div>
            <div className="mt-4 h-[6px] rounded-full overflow-hidden" style={{ background: `hsl(${s.hue}, 50%, 92%)` }}>
              <div
                className="h-full"
                style={{
                  width: `${s.percent}%`,
                  background: `linear-gradient(90deg, hsl(${s.hue}, 70%, 60%), hsl(${s.hue}, 70%, 45%))`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/SetsProgressionCard.tsx
git commit -m "feat(profile): add SetsProgressionCard"
```

---

## Task 36: ArcadeTopbar + CollectionCTA

**Files:**
- Create: `front/src/components/profile/arcade/ArcadeTopbar.tsx`
- Create: `front/src/components/profile/arcade/CollectionCTA.tsx`

- [ ] **Step 1: ArcadeTopbar**

```tsx
// front/src/components/profile/arcade/ArcadeTopbar.tsx
import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

type Props = {
  isOwnProfile: boolean
  isAdmin: boolean
}

export function ArcadeTopbar({ isOwnProfile, isAdmin }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-mono text-[11px] uppercase tracking-[.15em] opacity-55">
        GACHAPON / PROFIL
      </div>
      {isOwnProfile && (
        <div className="flex gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--arcade-surface)] border border-[var(--arcade-border)] font-mono text-[13px] font-semibold hover:-translate-y-px hover:border-[var(--arcade-border-strong)] transition-transform"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <LayoutDashboard size={14} />
              Admin
            </Link>
          )}
          <Link
            to="/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--arcade-surface)] border border-[var(--arcade-border)] font-mono text-[13px] font-semibold hover:-translate-y-px hover:border-[var(--arcade-border-strong)] transition-transform"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <Settings size={14} />
            Paramètres
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: CollectionCTA**

```tsx
// front/src/components/profile/arcade/CollectionCTA.tsx
import { Link } from '@tanstack/react-router'

import type { UserProfile, SetProgression } from '../../../api/profile.api'

type Props = {
  profile: UserProfile
  sets: SetProgression[]
  username: string
  isOwnProfile: boolean
}

export function CollectionCTA({ profile, sets, username, isOwnProfile }: Props) {
  const exploredSets = sets.filter((s) => s.owned > 0).length

  return (
    <div
      className="rounded-2xl p-6 border flex items-center justify-between overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #fff7ed, #fee2e2, #ede9fe)',
        borderColor: '#fed7aa',
      }}
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--arcade-text-muted)]">
          {isOwnProfile ? 'Ma collection' : `Collection de ${username}`}
        </div>
        <div className="font-display text-[36px] font-extrabold mt-1">
          {profile.stats.ownedCards} cartes · {exploredSets} sets
        </div>
      </div>
      <Link
        to={isOwnProfile ? '/collection' : '/profile/$username/collection'}
        params={isOwnProfile ? undefined : ({ username } as any)}
        className="px-5 py-3 rounded-xl text-white font-bold"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
          boxShadow: '0 8px 24px rgba(236, 72, 153, 0.35)',
        }}
      >
        {isOwnProfile ? 'Voir ma collection' : 'Explorer'}
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeTopbar.tsx front/src/components/profile/arcade/CollectionCTA.tsx
git commit -m "feat(profile): add ArcadeTopbar and CollectionCTA"
```

---

## Task 37: ArcadeProfile orchestrator

**Files:**
- Create: `front/src/components/profile/arcade/ArcadeProfile.tsx`

- [ ] **Step 1: Create the file**

```tsx
// front/src/components/profile/arcade/ArcadeProfile.tsx
import {
  useUserFeaturedCards,
  useUserProfile,
  useUserSetsProgression,
} from '../../../queries/useProfile'
import { useAuthStore } from '../../../stores/auth.store'
import { ArcadeBackground } from './ArcadeBackground'
import { ArcadeHero } from './ArcadeHero'
import { ArcadeTopbar } from './ArcadeTopbar'
import { CollectionCTA } from './CollectionCTA'
import { SetsProgressionCard } from './SetsProgressionCard'
import { StatGrid } from './StatGrid'
import { StreakCard } from './StreakCard'
import { XPCard } from './XPCard'

type Props = { username: string }

export function ArcadeProfile({ username }: Props) {
  const { data: profile, isLoading, isError } = useUserProfile(username)
  const featured = useUserFeaturedCards(username)
  const progression = useUserSetsProgression(username)
  const currentUser = useAuthStore((s) => s.user)
  const isOwnProfile = currentUser?.username === username
  const isAdmin = currentUser?.role === 'SUPER_ADMIN'

  if (isLoading) {
    return (
      <div className="arcade-theme min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--arcade-amber)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="arcade-theme min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold">Joueur introuvable</p>
          <p className="font-mono text-sm text-[var(--arcade-text-muted)] mt-2">
            @{username} n'existe pas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="arcade-theme relative min-h-[calc(100vh-4rem)]">
      <ArcadeBackground />
      <div className="relative max-w-[1280px] mx-auto px-8 py-7 flex flex-col gap-4 z-10">
        <ArcadeTopbar isOwnProfile={!!isOwnProfile} isAdmin={!!isAdmin} />

        <ArcadeHero
          profile={profile}
          featuredCards={featured.data?.cards ?? []}
          isOwnProfile={!!isOwnProfile}
        />

        <StatGrid profile={profile} />

        <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <XPCard profile={profile} />
          <StreakCard
            profile={profile}
            lastLoginAt={(profile as any).lastLoginAt ?? null}
            isOwnProfile={!!isOwnProfile}
          />
        </div>

        <SetsProgressionCard sets={progression.data?.sets ?? []} />

        <CollectionCTA
          profile={profile}
          sets={progression.data?.sets ?? []}
          username={username}
          isOwnProfile={!!isOwnProfile}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeProfile.tsx
git commit -m "feat(profile): add ArcadeProfile orchestrator"
```

---

## Task 38: Wire the route to ArcadeProfile

**Files:**
- Modify: `front/src/routes/_authenticated/profile/$username.tsx`

- [ ] **Step 1: Replace contents**

Remplacer tout le fichier par :

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { ArcadeProfile } from '../../../components/profile/arcade/ArcadeProfile'

export const Route = createFileRoute('/_authenticated/profile/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  return <ArcadeProfile username={username} />
}
```

- [ ] **Step 2: Type-check + build**

```bash
cd front && npm run build
```

Expected: build passe (tsc + vite + prerender-seo).

- [ ] **Step 3: Commit**

```bash
git add front/src/routes/_authenticated/profile/$username.tsx
git commit -m "feat(profile): swap profile route to ArcadeProfile"
```

---

## Task 39: Manual verification + lint + final fixes

- [ ] **Step 1: Start dev server**

```bash
cd front && npm run dev
```

Ouvrir `http://localhost:4269/profile/<ton-username>`.

- [ ] **Step 2: Manual checklist**

Tester et confirmer chaque ligne :
- [ ] Hero — éventail rendu, hover lift+redress+scale+dim (cartes non cliquables pour ce tour).
- [ ] Bouton "Éditer" visible **uniquement** sur own profile.
- [ ] Modal pick-5 — sélection, déselection, le 6ᵉ clic est ignoré, save invalide la query et ferme la modal.
- [ ] Stats — 4 cards avec disque coloré qui grossit au hover, valeurs au bon format `fr-FR`.
- [ ] XP card — barre shimmer arc-en-ciel, `LV. {N} · MAX` quand level >= 100.
- [ ] Streak card — chiffres lisibles, rangée 7 jours, samedi/dimanche grisé si pas connecté.
- [ ] Sets — tuiles colorées HSL, % et barre cohérents.
- [ ] CTA collection — bouton mène à `/collection` (own) ou `/profile/$username/collection` (autre).
- [ ] Pile responsive < 1024px : hero 1 col, stats 2 cols, sets 1 col.
- [ ] `prefers-reduced-motion: reduce` (DevTools → Rendering → Emulate CSS media feature) → animations coupées.
- [ ] Autres pages (play, collection, shop) inchangées visuellement.

- [ ] **Step 3: Lint + build**

```bash
cd front && npm run lint && npm run build
cd ../back && npm run lint && npm test
```

Expected: tout passe vert.

- [ ] **Step 4: Final commit (si fixes nécessaires)**

```bash
git add -A
git commit -m "fix(profile): polish after manual verification"
```

Si rien à fixer, passer.

---

## Self-Review Checklist

Avant de présenter le plan exécutable, vérifier :

- [ ] Tous les fichiers Backend de la spec sont touchés (Tasks 1–18).
- [ ] Tous les fichiers Frontend de la spec sont touchés (Tasks 20–38).
- [ ] Aucune section de la spec n'est sans Task associée :
  - Schema Prisma → T1 ✅
  - profile.types + interface → T2 ✅
  - User repo updateFeaturedCardIds → T3 ✅
  - UserCard repo countUniqueBySet → T4 ✅
  - pickTopByRarity (pur, unit-tested) → T5 ✅
  - resolveFeaturedCards (pur, unit-tested) → T6 ✅
  - hashHue / deriveShort (purs, unit-tested) → T7 ✅
  - ProfileDomain class → T8 ✅
  - IoC wiring → T9 ✅
  - Extend existing profile with lastLoginAt → T10 ✅
  - Zod schemas for new endpoints → T10b ✅
  - 3 endpoints → T11, T12, T13 ✅
  - 5 e2e tests → T14, T15, T16, T17, T18 ✅
  - Backend final validation → T19 ✅
  - Polices Google Fonts → T20 ✅
  - Tokens `.arcade-theme` → T21 ✅
  - constants + api + queries → T22, T23, T24 ✅
  - utils.ts → T25 ✅
  - 13 composants front → T26–T36 ✅
  - Orchestrator → T37 ✅
  - Route → T38 ✅
  - Verif manuelle → T39 ✅
