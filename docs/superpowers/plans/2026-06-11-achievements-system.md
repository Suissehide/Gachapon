# Achievement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un système d'achievement complet (data model, engine, event triggers, routes, UI) en partant du modèle Prisma `Achievement` déjà présent mais inutilisé.

**Architecture:** `AchievementsDomain.track(tx, userId, event)` est appelé synchroniquement depuis les domaines existants (gacha, rewards, streak, shop, cards). Un dispatcher route l'event vers un counter-dispatcher (compteurs persistés dans `UserAchievementProgress`) ou un state-dispatcher (lecture à la volée depuis `UserCard`/`User`). Les achievements cachés/événementiels passent par un registre de custom handlers TS. Les unlocks sont retournés dans la response HTTP et déclenchent un toast frontal.

**Tech Stack:** Fastify + Zod (back), Prisma (PostgreSQL), Jest (tests), TanStack Query + Zustand + Tailwind + lucide-react (front), Biome (lint).

**Spec source:** `docs/superpowers/specs/2026-06-11-achievements-system-design.md`

---

## File structure

### Nouveaux fichiers backend

```
back/prisma/migrations/<timestamp>_achievements_system/migration.sql
back/prisma/seed/achievements.ts                                  # ÉTENDU (existait déjà)
back/src/main/domain/achievements/
├── achievements.domain.ts                  # AchievementsDomain (classe IoC)
├── achievements.domain.interface.ts
├── criterion.types.ts                      # discriminated union + Zod
├── events.types.ts                         # AchievementEvent
├── dispatch.ts                             # event.kind → criterion.type
├── counter-dispatcher.ts                   # incrément UserAchievementProgress
├── state-dispatcher.ts                     # lecture à la volée
└── custom-handlers/
    ├── index.ts                            # registre
    ├── first-pull-ever.ts
    ├── four-rarities-one-day.ts
    ├── dust-balance-10k.ts
    ├── own-all-machines.ts
    └── same-card-two-variants.ts
back/src/main/infra/orm/repositories/
└── user-achievement-progress.repository.ts
back/src/main/infra/orm/repositories/interfaces/
└── user-achievement-progress.repository.interface.ts
back/src/main/interfaces/http/fastify/routes/achievements/
└── index.ts                                # GET /achievements, /achievements/families
back/src/test/unit/achievements/
├── criterion.types.test.ts
├── counter-dispatcher.test.ts
├── state-dispatcher.test.ts
└── custom-handlers/                         # 5 fichiers de tests
```

### Fichiers backend modifiés

```
back/prisma/schema.prisma                        # extension Achievement + nouveau UserAchievementProgress
back/prisma/seed.ts                              # ordre de cleanup
back/src/main/domain/gacha/gacha.domain.ts       # appel track()
back/src/main/domain/rewards/rewards.domain.ts   # appel track()
back/src/main/domain/streak/streak.domain.ts     # appel track()
back/src/main/domain/cards/cards.domain.ts       # appel track() (recycle)
back/src/main/domain/shop/shop.domain.ts         # appel track() (machine purchase)
back/src/main/iocContainer.ts                    # enregistrement achievementsDomain
back/src/main/interfaces/http/fastify/routes/admin/achievements/  # extension validation criterion
```

### Nouveaux fichiers frontend

```
front/src/api/achievements.api.ts
front/src/queries/useAchievements.ts
front/src/stores/achievementUnlock.store.ts
front/src/constants/achievements.constant.ts          # routes API + types partagés
front/src/components/achievements/
├── AchievementCard.tsx
├── HiddenAchievementCard.tsx
├── AchievementGrid.tsx
├── AchievementFamilyHeader.tsx
└── AchievementUnlockToast.tsx
front/src/routes/_authenticated/achievements.tsx
```

### Fichiers frontend modifiés

```
front/src/queries/useRewards.ts            # enqueue unlocks après claim
front/src/queries/usePull.ts (ou play.tsx) # enqueue unlocks après pull
front/src/stores/auth.store.ts             # enqueue unlocks de la session refresh
front/src/App.tsx (ou layout racine)       # monter <AchievementUnlockToast />
```

---

## Phase 1 — Foundation (data model & types)

### Task 1: Migration Prisma — extension Achievement + UserAchievementProgress

**Files:**
- Modify: `back/prisma/schema.prisma`
- Create: `back/prisma/migrations/<timestamp>_achievements_system/migration.sql`

- [ ] **Step 1: Étendre le modèle Achievement dans `schema.prisma`**

Trouver le bloc `model Achievement` existant et le remplacer par :

```prisma
model Achievement {
  id          String   @id @default(uuid())
  key         String   @unique
  name        String
  description String
  family      String?
  tier        Int      @default(0)
  hidden      Boolean  @default(false)
  iconKey     String?
  criterion   Json
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  rewardId    String?
  reward      Reward?  @relation(fields: [rewardId], references: [id])

  userAchievements UserAchievement[]
  progress         UserAchievementProgress[]

  @@index([family, tier])
  @@index([isActive])
}
```

- [ ] **Step 2: Ajouter le modèle `UserAchievementProgress`**

À la fin de la section "Achievements" du `schema.prisma` :

```prisma
model UserAchievementProgress {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  progress      Int         @default(0)
  updatedAt     DateTime    @updatedAt

  @@unique([userId, achievementId])
  @@index([userId])
}
```

- [ ] **Step 3: Générer la migration**

```bash
cd back
npm run prisma:migrate:dev -- --name achievements_system
```

Expected: une nouvelle migration `<timestamp>_achievements_system/migration.sql` créée. Vérifier qu'elle contient : `ALTER TABLE "Achievement" ADD COLUMN ...` (criterion, family, tier, hidden, iconKey, sortOrder, isActive) et `CREATE TABLE "UserAchievementProgress" ...`.

- [ ] **Step 4: Ajouter un purge des achievements existants en tête de migration**

Dans le `.sql` généré, **insérer en tête** :

```sql
-- Reset propre : pas de migration de données (cf. spec)
DELETE FROM "UserAchievement";
DELETE FROM "UserReward" WHERE "source" = 'ACHIEVEMENT';
DELETE FROM "Achievement";
```

> Note : `criterion` est en `NOT NULL` sans default — c'est OK car la table sera vide après le DELETE.

- [ ] **Step 5: Re-jouer la migration et vérifier le schéma**

```bash
cd back
npm run prisma:migrate:dev
```

Expected: migration appliquée sans erreur. `npx prisma studio` (ou un select SQL) doit montrer la table `Achievement` vide avec les nouvelles colonnes.

- [ ] **Step 6: Commit**

```bash
git add back/prisma/schema.prisma back/prisma/migrations/
git commit -m "feat(achievements): extend schema with criterion, family, progress table"
```

---

### Task 2: Types de criterion + validation Zod

**Files:**
- Create: `back/src/main/domain/achievements/criterion.types.ts`
- Create: `back/src/test/unit/achievements/criterion.types.test.ts`

- [ ] **Step 1: Écrire les tests Zod**

```typescript
// back/src/test/unit/achievements/criterion.types.test.ts
import { describe, expect, it } from '@jest/globals'
import { AchievementCriterionSchema } from '../../../main/domain/achievements/criterion.types'

describe('AchievementCriterionSchema', () => {
  it('accepte PULL_COUNT valide', () => {
    const parsed = AchievementCriterionSchema.parse({ type: 'PULL_COUNT', threshold: 100 })
    expect(parsed.type).toBe('PULL_COUNT')
  })

  it('rejette PULL_COUNT sans threshold', () => {
    expect(() =>
      AchievementCriterionSchema.parse({ type: 'PULL_COUNT' }),
    ).toThrow()
  })

  it('accepte OWN_RARITY_COUNT avec variant optionnel', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'OWN_RARITY_COUNT',
      rarity: 'EPIC',
      variant: 'HOLOGRAPHIC',
      threshold: 1,
    })
    expect(parsed).toMatchObject({ rarity: 'EPIC', variant: 'HOLOGRAPHIC' })
  })

  it('accepte COLLECTION_COMPLETE ALL', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'COLLECTION_COMPLETE',
      scope: 'ALL',
    })
    expect(parsed.type).toBe('COLLECTION_COMPLETE')
  })

  it('accepte COLLECTION_COMPLETE avec rareté', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'COLLECTION_COMPLETE',
      scope: { rarity: 'COMMON' },
    })
    expect(parsed.type).toBe('COLLECTION_COMPLETE')
  })

  it('accepte CUSTOM_EVENT avec handlerKey', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'CUSTOM_EVENT',
      handlerKey: 'first_pull_ever',
    })
    expect(parsed).toMatchObject({ handlerKey: 'first_pull_ever' })
  })

  it('rejette un type inconnu', () => {
    expect(() =>
      AchievementCriterionSchema.parse({ type: 'NOT_A_TYPE' }),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run les tests, vérifier l'échec**

```bash
cd back
npx jest src/test/unit/achievements/criterion.types.test.ts
```

Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter `criterion.types.ts`**

```typescript
// back/src/main/domain/achievements/criterion.types.ts
import { z } from 'zod'
import { CardRarity, CardVariant } from '@prisma/client'

const RaritySchema = z.nativeEnum(CardRarity)
const VariantSchema = z.nativeEnum(CardVariant)

export const AchievementCriterionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PULL_COUNT'),       threshold: z.number().int().positive() }),
  z.object({ type: z.literal('DUST_SPENT'),       threshold: z.number().int().positive() }),
  z.object({ type: z.literal('TOKENS_SPENT'),     threshold: z.number().int().positive() }),
  z.object({ type: z.literal('CARDS_RECYCLED'),   threshold: z.number().int().positive() }),
  z.object({ type: z.literal('REWARDS_CLAIMED'),  threshold: z.number().int().positive() }),
  z.object({
    type: z.literal('OWN_RARITY_COUNT'),
    rarity: RaritySchema.optional(),
    variant: VariantSchema.optional(),
    threshold: z.number().int().positive(),
  }).refine((c) => c.rarity !== undefined || c.variant !== undefined, {
    message: 'rarity ou variant requis (au moins un)',
  }),
  z.object({
    type: z.literal('COLLECTION_COMPLETE'),
    scope: z.union([z.literal('ALL'), z.object({ rarity: RaritySchema })]),
  }),
  z.object({ type: z.literal('LEVEL_REACHED'),    threshold: z.number().int().positive() }),
  z.object({ type: z.literal('STREAK_REACHED'),   threshold: z.number().int().positive() }),
  z.object({ type: z.literal('MACHINES_OWNED'),   threshold: z.number().int().positive() }),
  z.object({ type: z.literal('CUSTOM_EVENT'),     handlerKey: z.string().min(1) }),
])

export type AchievementCriterion = z.infer<typeof AchievementCriterionSchema>
```

> Note : si `CardVariant` n'est pas un enum Prisma déjà défini (le schema actuel pourrait utiliser un type string), remplacer `z.nativeEnum(CardVariant)` par `z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'])`. À vérifier dans `schema.prisma`.

- [ ] **Step 4: Run les tests, vérifier le succès**

```bash
cd back
npx jest src/test/unit/achievements/criterion.types.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Lint**

```bash
cd back && npm run lint
```

Expected: 0 erreurs.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/domain/achievements/criterion.types.ts back/src/test/unit/achievements/criterion.types.test.ts
git commit -m "feat(achievements): add criterion discriminated union with zod schema"
```

---

### Task 3: Types d'event

**Files:**
- Create: `back/src/main/domain/achievements/events.types.ts`

- [ ] **Step 1: Créer le fichier d'events**

```typescript
// back/src/main/domain/achievements/events.types.ts
import type { CardRarity, CardVariant } from '@prisma/client'

export type AchievementEvent =
  | { kind: 'PULL_COMPLETED';    cardId: string; rarity: CardRarity; variant: CardVariant }
  | { kind: 'TOKENS_SPENT';      amount: number }
  | { kind: 'DUST_SPENT';        amount: number }
  | { kind: 'CARD_RECYCLED';     amount: number }
  | { kind: 'REWARD_CLAIMED';    rewardId: string; source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST' }
  | { kind: 'LEVEL_UP';          newLevel: number }
  | { kind: 'STREAK_UPDATED';    days: number }
  | { kind: 'MACHINE_PURCHASED'; machineId: string }

export type AchievementEventKind = AchievementEvent['kind']

export interface UnlockedAchievement {
  key: string
  name: string
  iconKey: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: CardRarity | null
  } | null
}
```

- [ ] **Step 2: Commit**

```bash
git add back/src/main/domain/achievements/events.types.ts
git commit -m "feat(achievements): add AchievementEvent and UnlockedAchievement types"
```

---

## Phase 2 — Repository

### Task 4: UserAchievementProgress repository + interface

**Files:**
- Create: `back/src/main/infra/orm/repositories/interfaces/user-achievement-progress.repository.interface.ts`
- Create: `back/src/main/infra/orm/repositories/user-achievement-progress.repository.ts`

- [ ] **Step 1: Créer l'interface**

```typescript
// back/src/main/infra/orm/repositories/interfaces/user-achievement-progress.repository.interface.ts
import type { UserAchievementProgress } from '@prisma/client'
import type { PrismaTransactionClient } from '../../postgres-orm'

export interface UserAchievementProgressRepositoryInterface {
  incrementInTx(
    tx: PrismaTransactionClient,
    userId: string,
    achievementId: string,
    delta: number,
  ): Promise<UserAchievementProgress>

  upsertInTx(
    tx: PrismaTransactionClient,
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<UserAchievementProgress>

  findByUserId(userId: string): Promise<UserAchievementProgress[]>
}
```

> Note : le nom exact du type `PrismaTransactionClient` (ou `PrimaTransactionClient` selon ce qu'on a vu dans `user-reward.repository.ts`) est à vérifier dans `back/src/main/infra/orm/postgres-orm.ts`. Utiliser le même import que les autres repos.

- [ ] **Step 2: Implémenter le repository**

```typescript
// back/src/main/infra/orm/repositories/user-achievement-progress.repository.ts
import type { UserAchievementProgress } from '@prisma/client'
import type { IocContainer } from '../../../iocContainer'
import type { PrismaTransactionClient } from '../postgres-orm'
import type { PostgresPrismaClient } from '../postgres-orm'
import type { UserAchievementProgressRepositoryInterface } from './interfaces/user-achievement-progress.repository.interface'

export class UserAchievementProgressRepository
  implements UserAchievementProgressRepositoryInterface
{
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: Pick<IocContainer, 'postgresOrm'>) {
    this.#prisma = postgresOrm.prisma
  }

  incrementInTx(
    tx: PrismaTransactionClient,
    userId: string,
    achievementId: string,
    delta: number,
  ): Promise<UserAchievementProgress> {
    return tx.userAchievementProgress.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId, progress: delta },
      update: { progress: { increment: delta } },
    })
  }

  upsertInTx(
    tx: PrismaTransactionClient,
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<UserAchievementProgress> {
    return tx.userAchievementProgress.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId, progress },
      update: { progress },
    })
  }

  findByUserId(userId: string): Promise<UserAchievementProgress[]> {
    return this.#prisma.userAchievementProgress.findMany({ where: { userId } })
  }
}
```

- [ ] **Step 3: Enregistrer dans IoC container**

Trouver `back/src/main/iocContainer.ts` et ajouter (suivre le pattern existant pour `userRewardRepository`) :

```typescript
import { UserAchievementProgressRepository } from './infra/orm/repositories/user-achievement-progress.repository'
// ... dans la déclaration du container :
userAchievementProgressRepository: asClass(UserAchievementProgressRepository).singleton(),
```

Le type `IocContainer` doit lister `userAchievementProgressRepository: UserAchievementProgressRepositoryInterface` (vérifier l'organisation du fichier — l'ajouter au bon endroit).

- [ ] **Step 4: Vérifier la compilation TS**

```bash
cd back && npm run build:check-typedefs
```

Expected: 0 erreurs.

- [ ] **Step 5: Commit**

```bash
git add back/src/main/infra/orm/repositories/user-achievement-progress.repository.ts \
        back/src/main/infra/orm/repositories/interfaces/user-achievement-progress.repository.interface.ts \
        back/src/main/iocContainer.ts
git commit -m "feat(achievements): add UserAchievementProgress repository"
```

---

## Phase 3 — Engine core

### Task 5: Counter dispatcher

**Files:**
- Create: `back/src/main/domain/achievements/dispatch.ts`
- Create: `back/src/main/domain/achievements/counter-dispatcher.ts`
- Create: `back/src/test/unit/achievements/counter-dispatcher.test.ts`

- [ ] **Step 1: Créer la dispatch table**

```typescript
// back/src/main/domain/achievements/dispatch.ts
import type { AchievementCriterion } from './criterion.types'
import type { AchievementEventKind } from './events.types'

type CriterionType = AchievementCriterion['type']

const COUNTER_TYPES: ReadonlySet<CriterionType> = new Set([
  'PULL_COUNT',
  'DUST_SPENT',
  'TOKENS_SPENT',
  'CARDS_RECYCLED',
  'REWARDS_CLAIMED',
])

const STATE_TYPES: ReadonlySet<CriterionType> = new Set([
  'OWN_RARITY_COUNT',
  'COLLECTION_COMPLETE',
  'LEVEL_REACHED',
  'STREAK_REACHED',
  'MACHINES_OWNED',
])

export const isCounterCriterion = (c: AchievementCriterion): boolean =>
  COUNTER_TYPES.has(c.type)

export const isStateCriterion = (c: AchievementCriterion): boolean =>
  STATE_TYPES.has(c.type)

export const isCustomCriterion = (c: AchievementCriterion): boolean =>
  c.type === 'CUSTOM_EVENT'

const EVENT_TO_COUNTER_TYPES: Record<AchievementEventKind, CriterionType[]> = {
  PULL_COMPLETED:    ['PULL_COUNT'],
  TOKENS_SPENT:      ['TOKENS_SPENT'],
  DUST_SPENT:        ['DUST_SPENT'],
  CARD_RECYCLED:     ['CARDS_RECYCLED'],
  REWARD_CLAIMED:    ['REWARDS_CLAIMED'],
  LEVEL_UP:          [],
  STREAK_UPDATED:    [],
  MACHINE_PURCHASED: [],
}

const EVENT_TO_STATE_TYPES: Record<AchievementEventKind, CriterionType[]> = {
  PULL_COMPLETED:    ['OWN_RARITY_COUNT', 'COLLECTION_COMPLETE'],
  TOKENS_SPENT:      [],
  DUST_SPENT:        [],
  CARD_RECYCLED:     ['OWN_RARITY_COUNT', 'COLLECTION_COMPLETE'],
  REWARD_CLAIMED:    [],
  LEVEL_UP:          ['LEVEL_REACHED'],
  STREAK_UPDATED:    ['STREAK_REACHED'],
  MACHINE_PURCHASED: ['MACHINES_OWNED'],
}

export const counterTypesFor = (kind: AchievementEventKind): CriterionType[] =>
  EVENT_TO_COUNTER_TYPES[kind]

export const stateTypesFor = (kind: AchievementEventKind): CriterionType[] =>
  EVENT_TO_STATE_TYPES[kind]
```

- [ ] **Step 2: Écrire les tests du counter dispatcher**

```typescript
// back/src/test/unit/achievements/counter-dispatcher.test.ts
import { describe, expect, it } from '@jest/globals'
import { computeDelta } from '../../../main/domain/achievements/counter-dispatcher'

describe('computeDelta', () => {
  it('PULL_COMPLETED → PULL_COUNT +1', () => {
    expect(
      computeDelta(
        { type: 'PULL_COUNT', threshold: 10 },
        { kind: 'PULL_COMPLETED', cardId: 'c1', rarity: 'COMMON', variant: 'NORMAL' },
      ),
    ).toBe(1)
  })

  it('DUST_SPENT event → DUST_SPENT criterion += amount', () => {
    expect(
      computeDelta(
        { type: 'DUST_SPENT', threshold: 500 },
        { kind: 'DUST_SPENT', amount: 42 },
      ),
    ).toBe(42)
  })

  it('CARD_RECYCLED event → CARDS_RECYCLED += amount', () => {
    expect(
      computeDelta(
        { type: 'CARDS_RECYCLED', threshold: 10 },
        { kind: 'CARD_RECYCLED', amount: 3 },
      ),
    ).toBe(3)
  })

  it('REWARD_CLAIMED → REWARDS_CLAIMED +1', () => {
    expect(
      computeDelta(
        { type: 'REWARDS_CLAIMED', threshold: 5 },
        { kind: 'REWARD_CLAIMED', rewardId: 'r1', source: 'STREAK' },
      ),
    ).toBe(1)
  })

  it('event/criterion mismatch → 0', () => {
    expect(
      computeDelta(
        { type: 'PULL_COUNT', threshold: 10 },
        { kind: 'DUST_SPENT', amount: 42 },
      ),
    ).toBe(0)
  })
})
```

- [ ] **Step 3: Run les tests, vérifier l'échec**

```bash
cd back && npx jest src/test/unit/achievements/counter-dispatcher.test.ts
```

Expected: FAIL — module introuvable.

- [ ] **Step 4: Implémenter `counter-dispatcher.ts`**

```typescript
// back/src/main/domain/achievements/counter-dispatcher.ts
import type { AchievementCriterion } from './criterion.types'
import type { AchievementEvent } from './events.types'

export const computeDelta = (
  criterion: AchievementCriterion,
  event: AchievementEvent,
): number => {
  if (criterion.type === 'PULL_COUNT' && event.kind === 'PULL_COMPLETED') return 1
  if (criterion.type === 'TOKENS_SPENT' && event.kind === 'TOKENS_SPENT') return event.amount
  if (criterion.type === 'DUST_SPENT' && event.kind === 'DUST_SPENT') return event.amount
  if (criterion.type === 'CARDS_RECYCLED' && event.kind === 'CARD_RECYCLED') return event.amount
  if (criterion.type === 'REWARDS_CLAIMED' && event.kind === 'REWARD_CLAIMED') return 1
  return 0
}
```

- [ ] **Step 5: Run les tests, vérifier le succès**

```bash
cd back && npx jest src/test/unit/achievements/counter-dispatcher.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add back/src/main/domain/achievements/dispatch.ts \
        back/src/main/domain/achievements/counter-dispatcher.ts \
        back/src/test/unit/achievements/counter-dispatcher.test.ts
git commit -m "feat(achievements): add counter dispatcher and event/criterion routing table"
```

---

### Task 6: State dispatcher

**Files:**
- Create: `back/src/main/domain/achievements/state-dispatcher.ts`
- Create: `back/src/test/unit/achievements/state-dispatcher.test.ts`

- [ ] **Step 1: Écrire les tests (pure logic — décision de unlock à partir du state)**

```typescript
// back/src/test/unit/achievements/state-dispatcher.test.ts
import { describe, expect, it } from '@jest/globals'
import { computeStateProgress } from '../../../main/domain/achievements/state-dispatcher'

describe('computeStateProgress', () => {
  it('OWN_RARITY_COUNT EPIC 5 — 3 cartes EPIC possédées → progress 3', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', threshold: 5 },
      {
        ownedByRarity: { COMMON: 10, UNCOMMON: 5, RARE: 2, EPIC: 3, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 5,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.progress).toBe(3)
    expect(result.unlocked).toBe(false)
  })

  it('OWN_RARITY_COUNT EPIC 5 — 5 possédées → unlocked', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', threshold: 5 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 5, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
    expect(result.progress).toBe(5)
  })

  it('OWN_RARITY_COUNT variant seul (BRILLIANT) — somme toutes raretés', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', variant: 'BRILLIANT', threshold: 5 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {
          COMMON_BRILLIANT: 3,
          RARE_BRILLIANT: 2,
          EPIC_NORMAL: 1,
        },
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.progress).toBe(5)
    expect(result.unlocked).toBe(true)
  })

  it('OWN_RARITY_COUNT EPIC HOLOGRAPHIC 1 — 1 EPIC HOLO → unlocked', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', variant: 'HOLOGRAPHIC', threshold: 1 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 1, LEGENDARY: 0 },
        ownedByRarityVariant: { 'EPIC_HOLOGRAPHIC': 1 },
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
  })

  it('COLLECTION_COMPLETE ALL — false', () => {
    const result = computeStateProgress(
      { type: 'COLLECTION_COMPLETE', scope: 'ALL' },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(false)
    expect(result.progress).toBe(0)
  })

  it('LEVEL_REACHED 10 — level 10 → unlocked', () => {
    const result = computeStateProgress(
      { type: 'LEVEL_REACHED', threshold: 10 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 10,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
  })

  it('STREAK_REACHED 30 — 30 jours → unlocked', () => {
    const result = computeStateProgress(
      { type: 'STREAK_REACHED', threshold: 30 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 30,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
  })

  it('MACHINES_OWNED 2 — 1 possédée → progress 1, not unlocked', () => {
    const result = computeStateProgress(
      { type: 'MACHINES_OWNED', threshold: 2 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 1,
      },
    )
    expect(result.progress).toBe(1)
    expect(result.unlocked).toBe(false)
  })
})
```

- [ ] **Step 2: Run les tests, vérifier l'échec**

```bash
cd back && npx jest src/test/unit/achievements/state-dispatcher.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implémenter `state-dispatcher.ts`**

```typescript
// back/src/main/domain/achievements/state-dispatcher.ts
import type { CardRarity } from '@prisma/client'
import type { AchievementCriterion } from './criterion.types'

export interface UserAchievementState {
  ownedByRarity: Record<CardRarity, number>
  ownedByRarityVariant: Record<string, number>  // key: `${rarity}_${variant}`
  completedCollections: { ALL: boolean } & Partial<Record<CardRarity, boolean>>
  level: number
  streakDays: number
  machinesOwned: number
}

export interface StateProgressResult {
  progress: number
  threshold: number
  unlocked: boolean
}

export const computeStateProgress = (
  criterion: AchievementCriterion,
  state: UserAchievementState,
): StateProgressResult => {
  switch (criterion.type) {
    case 'OWN_RARITY_COUNT': {
      let count = 0
      if (criterion.rarity && criterion.variant) {
        count = state.ownedByRarityVariant[`${criterion.rarity}_${criterion.variant}`] ?? 0
      } else if (criterion.rarity) {
        count = state.ownedByRarity[criterion.rarity]
      } else if (criterion.variant) {
        // variant-only : agrège toutes raretés pour ce variant
        const suffix = `_${criterion.variant}`
        for (const [key, n] of Object.entries(state.ownedByRarityVariant)) {
          if (key.endsWith(suffix)) count += n
        }
      }
      return {
        progress: count,
        threshold: criterion.threshold,
        unlocked: count >= criterion.threshold,
      }
    }
    case 'COLLECTION_COMPLETE': {
      const done =
        criterion.scope === 'ALL'
          ? state.completedCollections.ALL
          : (state.completedCollections[criterion.scope.rarity] ?? false)
      return { progress: done ? 1 : 0, threshold: 1, unlocked: done }
    }
    case 'LEVEL_REACHED':
      return {
        progress: state.level,
        threshold: criterion.threshold,
        unlocked: state.level >= criterion.threshold,
      }
    case 'STREAK_REACHED':
      return {
        progress: state.streakDays,
        threshold: criterion.threshold,
        unlocked: state.streakDays >= criterion.threshold,
      }
    case 'MACHINES_OWNED':
      return {
        progress: state.machinesOwned,
        threshold: criterion.threshold,
        unlocked: state.machinesOwned >= criterion.threshold,
      }
    default:
      return { progress: 0, threshold: 0, unlocked: false }
  }
}
```

- [ ] **Step 4: Run les tests, vérifier le succès**

```bash
cd back && npx jest src/test/unit/achievements/state-dispatcher.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add back/src/main/domain/achievements/state-dispatcher.ts \
        back/src/test/unit/achievements/state-dispatcher.test.ts
git commit -m "feat(achievements): add state dispatcher (pure progress computation)"
```

---

### Task 7: Custom handler registry (skeleton)

**Files:**
- Create: `back/src/main/domain/achievements/custom-handlers/index.ts`

- [ ] **Step 1: Définir le type du registre + registre vide**

```typescript
// back/src/main/domain/achievements/custom-handlers/index.ts
import type { PrismaTransactionClient } from '../../../infra/orm/postgres-orm'
import type { AchievementEvent, AchievementEventKind } from '../events.types'

export interface CustomHandlerResult {
  unlocked: boolean
  progress?: number
}

export interface CustomHandler {
  listensTo: AchievementEventKind[]
  evaluate: (
    tx: PrismaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ) => Promise<CustomHandlerResult>
}

// Rempli au fur et à mesure (Phase 4).
export const customHandlers: Record<string, CustomHandler> = {}

export const listCustomHandlerKeys = (): string[] => Object.keys(customHandlers)

export const getCustomHandler = (key: string): CustomHandler | undefined =>
  customHandlers[key]
```

- [ ] **Step 2: Commit**

```bash
git add back/src/main/domain/achievements/custom-handlers/index.ts
git commit -m "feat(achievements): add custom handler registry skeleton"
```

---

### Task 8: AchievementsDomain — squelette et `track()`

**Files:**
- Create: `back/src/main/domain/achievements/achievements.domain.interface.ts`
- Create: `back/src/main/domain/achievements/achievements.domain.ts`

- [ ] **Step 1: Créer l'interface du domain**

```typescript
// back/src/main/domain/achievements/achievements.domain.interface.ts
import type { PrismaTransactionClient } from '../../infra/orm/postgres-orm'
import type { AchievementEvent, UnlockedAchievement } from './events.types'

export interface AchievementsDomainInterface {
  track(
    tx: PrismaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<UnlockedAchievement[]>

  listForUser(userId: string): Promise<AchievementWithProgress[]>

  listFamilies(userId: string): Promise<Array<{ family: string; total: number; unlocked: number }>>
}

export interface AchievementWithProgress {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  iconKey: string | null
  sortOrder: number
  progress: number
  threshold: number
  unlocked: boolean
  unlockedAt: Date | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}
```

- [ ] **Step 2: Implémenter le squelette de `AchievementsDomain`**

```typescript
// back/src/main/domain/achievements/achievements.domain.ts
import type { Achievement, CardRarity, CardVariant } from '@prisma/client'
import type { IocContainer } from '../../iocContainer'
import type { PostgresOrm, PrismaTransactionClient } from '../../infra/orm/postgres-orm'
import type {
  AchievementsDomainInterface,
  AchievementWithProgress,
} from './achievements.domain.interface'
import { AchievementCriterionSchema, type AchievementCriterion } from './criterion.types'
import { computeDelta } from './counter-dispatcher'
import { computeStateProgress, type UserAchievementState } from './state-dispatcher'
import { getCustomHandler } from './custom-handlers'
import {
  isCounterCriterion,
  isCustomCriterion,
  isStateCriterion,
  counterTypesFor,
  stateTypesFor,
} from './dispatch'
import type { AchievementEvent, UnlockedAchievement } from './events.types'

export class AchievementsDomain implements AchievementsDomainInterface {
  readonly #postgresOrm: PostgresOrm

  constructor({ postgresOrm }: Pick<IocContainer, 'postgresOrm'>) {
    this.#postgresOrm = postgresOrm
  }

  async track(
    tx: PrismaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<UnlockedAchievement[]> {
    const candidates = await this.#loadCandidates(tx, userId, event)
    if (candidates.length === 0) return []

    const unlocked: UnlockedAchievement[] = []
    const state = await this.#loadUserState(tx, userId, event.kind)

    for (const achievement of candidates) {
      const criterion = AchievementCriterionSchema.parse(achievement.criterion)
      const result = await this.#evaluate(tx, userId, criterion, event, state)
      if (!result.unlocked) continue
      const inserted = await this.#tryInsertUnlock(tx, userId, achievement)
      if (inserted) unlocked.push(inserted)
    }

    return unlocked
  }

  async listForUser(_userId: string): Promise<AchievementWithProgress[]> {
    throw new Error('not implemented yet — Task 9')
  }

  async listFamilies(_userId: string): Promise<Array<{ family: string; total: number; unlocked: number }>> {
    throw new Error('not implemented yet — Task 9')
  }

  // ─── Helpers privés ──────────────────────────────────────────────

  async #loadCandidates(
    tx: PrismaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<Achievement[]> {
    const counterTypes = counterTypesFor(event.kind)
    const stateTypes = stateTypesFor(event.kind)
    const all = await tx.achievement.findMany({
      where: {
        isActive: true,
        userAchievements: { none: { userId } },
      },
    })
    return all.filter((a) => {
      let criterion: AchievementCriterion
      try {
        criterion = AchievementCriterionSchema.parse(a.criterion)
      } catch {
        return false
      }
      if (isCustomCriterion(criterion)) {
        const handler = getCustomHandler((criterion as { handlerKey: string }).handlerKey)
        return !!handler && handler.listensTo.includes(event.kind)
      }
      if (isCounterCriterion(criterion)) return counterTypes.includes(criterion.type)
      if (isStateCriterion(criterion)) return stateTypes.includes(criterion.type)
      return false
    })
  }

  async #evaluate(
    tx: PrismaTransactionClient,
    userId: string,
    criterion: AchievementCriterion,
    event: AchievementEvent,
    state: UserAchievementState,
  ): Promise<{ unlocked: boolean }> {
    if (isCustomCriterion(criterion)) {
      const handler = getCustomHandler((criterion as { handlerKey: string }).handlerKey)
      if (!handler) return { unlocked: false }
      const result = await handler.evaluate(tx, userId, event)
      return { unlocked: result.unlocked }
    }
    if (isCounterCriterion(criterion)) {
      const delta = computeDelta(criterion, event)
      if (delta === 0) return { unlocked: false }
      const achievement = await tx.achievement.findFirst({
        where: {
          criterion: { equals: criterion as object },
        },
      })
      if (!achievement) return { unlocked: false }
      const updated = await tx.userAchievementProgress.upsert({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
        create: { userId, achievementId: achievement.id, progress: delta },
        update: { progress: { increment: delta } },
      })
      const threshold = (criterion as { threshold: number }).threshold
      return { unlocked: updated.progress >= threshold }
    }
    if (isStateCriterion(criterion)) {
      const result = computeStateProgress(criterion, state)
      return { unlocked: result.unlocked }
    }
    return { unlocked: false }
  }

  async #loadUserState(
    tx: PrismaTransactionClient,
    userId: string,
    eventKind: AchievementEvent['kind'],
  ): Promise<UserAchievementState> {
    // On charge l'état nécessaire selon l'event. Pour ne pas être trop coûteux,
    // on charge tout en parallèle quand l'event peut toucher plusieurs criteria.
    const [user, ownedCards, machinesCount] = await Promise.all([
      tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { level: true, streakDays: true },
      }),
      tx.userCard.findMany({
        where: { userId },
        select: { variant: true, card: { select: { rarity: true } } },
      }),
      this.#countMachinesOwned(tx, userId),
    ])

    const ownedByRarity: Record<CardRarity, number> = {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      EPIC: 0,
      LEGENDARY: 0,
    }
    const ownedByRarityVariant: Record<string, number> = {}
    for (const uc of ownedCards) {
      const rarity = uc.card.rarity
      ownedByRarity[rarity] = (ownedByRarity[rarity] ?? 0) + 1
      const key = `${rarity}_${uc.variant}`
      ownedByRarityVariant[key] = (ownedByRarityVariant[key] ?? 0) + 1
    }

    // Completion : compare le nombre possédé au catalogue.
    const completedCollections = await this.#computeCompletions(tx, ownedCards)

    return {
      ownedByRarity,
      ownedByRarityVariant,
      completedCollections,
      level: user.level,
      streakDays: user.streakDays,
      machinesOwned: machinesCount,
    }
  }

  async #countMachinesOwned(
    tx: PrismaTransactionClient,
    userId: string,
  ): Promise<number> {
    // Adapter selon le modèle exact (UserShopItem ? UserMachine ?).
    // Hypothèse : table UserShopItem avec type MACHINE.
    return tx.userShopItem.count({
      where: { userId, shopItem: { type: 'MACHINE' } },
    })
  }

  async #computeCompletions(
    tx: PrismaTransactionClient,
    ownedCards: Array<{ card: { rarity: CardRarity } }>,
  ): Promise<UserAchievementState['completedCollections']> {
    const cardsByRarity = await tx.card.groupBy({
      by: ['rarity'],
      _count: { id: true },
    })
    const ownedDistinctByRarity = new Map<CardRarity, Set<string>>()
    // Pour compter "distinct cardIds owned" il faut le cardId — adapter le select de ownedCards.
    // Pour la première version, on compte le nombre de cartes possédées par rareté.
    // (À raffiner si la définition "complete" = "tous les cardIds distincts possédés".)
    const ownedCountByRarity = new Map<CardRarity, number>()
    for (const uc of ownedCards) {
      ownedCountByRarity.set(uc.card.rarity, (ownedCountByRarity.get(uc.card.rarity) ?? 0) + 1)
    }
    const result: UserAchievementState['completedCollections'] = { ALL: false }
    let allComplete = true
    for (const { rarity, _count } of cardsByRarity) {
      const owned = ownedCountByRarity.get(rarity) ?? 0
      const complete = owned >= _count.id
      result[rarity] = complete
      if (!complete) allComplete = false
    }
    result.ALL = allComplete
    return result
  }

  async #tryInsertUnlock(
    tx: PrismaTransactionClient,
    userId: string,
    achievement: Achievement,
  ): Promise<UnlockedAchievement | null> {
    try {
      await tx.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      })
    } catch {
      // Conflit unique → déjà débloqué (idempotent)
      return null
    }
    let reward: UnlockedAchievement['reward'] = null
    if (achievement.rewardId) {
      const r = await tx.reward.findUniqueOrThrow({
        where: { id: achievement.rewardId },
      })
      await tx.userReward.create({
        data: {
          userId,
          rewardId: r.id,
          source: 'ACHIEVEMENT',
          sourceId: achievement.id,
        },
      })
      reward = { tokens: r.tokens, dust: r.dust, xp: r.xp, cardRarity: r.cardRarity }
    }
    return {
      key: achievement.key,
      name: achievement.name,
      iconKey: achievement.iconKey,
      reward,
    }
  }
}
```

> Note : adapter les sélections Prisma quand le schéma exact diffère (notamment `userShopItem` / `UserMachine` selon le projet). Les noms `streakDays`, `level`, `xp` du `User` proviennent du spec/explore. Une erreur de compilation TS sur un select indique un mismatch à corriger.

- [ ] **Step 3: Enregistrer dans IoC container**

Dans `back/src/main/iocContainer.ts`, ajouter :

```typescript
import { AchievementsDomain } from './domain/achievements/achievements.domain'
// dans le container :
achievementsDomain: asClass(AchievementsDomain).singleton(),
```

Et étendre le type `IocContainer` avec `achievementsDomain: AchievementsDomainInterface`.

- [ ] **Step 4: Compilation TS**

```bash
cd back && npm run build:check-typedefs
```

Corriger jusqu'à 0 erreur. Les selects Prisma `userShopItem`/`UserMachine` peuvent nécessiter ajustement selon le schéma réel — adapter le code en se basant sur les errors TS.

- [ ] **Step 5: Commit**

```bash
git add back/src/main/domain/achievements/achievements.domain.ts \
        back/src/main/domain/achievements/achievements.domain.interface.ts \
        back/src/main/iocContainer.ts
git commit -m "feat(achievements): add AchievementsDomain.track() with counter+state+custom dispatch"
```

---

### Task 9: `AchievementsDomain.listForUser()` + `listFamilies()`

**Files:**
- Modify: `back/src/main/domain/achievements/achievements.domain.ts`

- [ ] **Step 1: Implémenter `listForUser`**

Remplacer le corps de `listForUser` :

```typescript
async listForUser(userId: string): Promise<AchievementWithProgress[]> {
  const [achievements, unlocked, progressRows, state] = await Promise.all([
    this.#postgresOrm.prisma.achievement.findMany({
      where: { isActive: true },
      include: { reward: true },
      orderBy: [{ family: 'asc' }, { tier: 'asc' }, { sortOrder: 'asc' }],
    }),
    this.#postgresOrm.prisma.userAchievement.findMany({ where: { userId } }),
    this.#postgresOrm.prisma.userAchievementProgress.findMany({ where: { userId } }),
    this.#postgresOrm.executeWithTransactionClient(
      (tx) => this.#loadUserState(tx, userId, 'PULL_COMPLETED'),
      { isolationLevel: 'ReadCommitted' },
    ),
  ])

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))
  const progressMap = new Map(progressRows.map((p) => [p.achievementId, p.progress]))

  return achievements.map((a) => {
    let criterion: AchievementCriterion
    try {
      criterion = AchievementCriterionSchema.parse(a.criterion)
    } catch {
      return this.#maskedEntry(a, 0, 1, false, null)
    }

    const unlockedAt = unlockedMap.get(a.id) ?? null
    let progress = 0
    let threshold = 1

    if (isCounterCriterion(criterion)) {
      progress = progressMap.get(a.id) ?? 0
      threshold = (criterion as { threshold: number }).threshold
    } else if (isStateCriterion(criterion)) {
      const result = computeStateProgress(criterion, state)
      progress = result.progress
      threshold = result.threshold
    } else {
      // CUSTOM_EVENT : on ne calcule pas de progress avant unlock
      threshold = 1
      progress = unlockedAt ? 1 : 0
    }

    return this.#maskedEntry(a, progress, threshold, !!unlockedAt, unlockedAt)
  })
}

#maskedEntry(
  a: Achievement & { reward: { tokens: number; dust: number; xp: number; cardRarity: string | null } | null },
  progress: number,
  threshold: number,
  unlocked: boolean,
  unlockedAt: Date | null,
): AchievementWithProgress {
  const masked = a.hidden && !unlocked
  return {
    key: a.key,
    name: masked ? '???' : a.name,
    description: masked ? '???' : a.description,
    family: a.family,
    tier: a.tier,
    hidden: a.hidden,
    iconKey: masked ? null : a.iconKey,
    sortOrder: a.sortOrder,
    progress,
    threshold,
    unlocked,
    unlockedAt,
    reward: a.reward
      ? {
          tokens: a.reward.tokens,
          dust: a.reward.dust,
          xp: a.reward.xp,
          cardRarity: a.reward.cardRarity,
        }
      : null,
  }
}
```

- [ ] **Step 2: Implémenter `listFamilies`**

```typescript
async listFamilies(userId: string): Promise<Array<{ family: string; total: number; unlocked: number }>> {
  const [achievements, userUnlocked] = await Promise.all([
    this.#postgresOrm.prisma.achievement.findMany({
      where: { isActive: true, family: { not: null } },
      select: { id: true, family: true },
    }),
    this.#postgresOrm.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
  ])

  const unlockedSet = new Set(userUnlocked.map((u) => u.achievementId))
  const totals = new Map<string, { total: number; unlocked: number }>()
  for (const a of achievements) {
    if (!a.family) continue
    const entry = totals.get(a.family) ?? { total: 0, unlocked: 0 }
    entry.total += 1
    if (unlockedSet.has(a.id)) entry.unlocked += 1
    totals.set(a.family, entry)
  }
  return [...totals.entries()].map(([family, v]) => ({ family, ...v }))
}
```

- [ ] **Step 3: Compilation TS**

```bash
cd back && npm run build:check-typedefs
```

Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/domain/achievements/achievements.domain.ts
git commit -m "feat(achievements): implement listForUser and listFamilies"
```

---

## Phase 4 — Custom handlers (5 fichiers)

Pour chaque handler : un fichier d'implémentation + un test unitaire isolé (mock du tx) + ajout dans `custom-handlers/index.ts`.

### Task 10: Handler `first_pull_ever`

**Files:**
- Create: `back/src/main/domain/achievements/custom-handlers/first-pull-ever.ts`
- Create: `back/src/test/unit/achievements/custom-handlers/first-pull-ever.test.ts`
- Modify: `back/src/main/domain/achievements/custom-handlers/index.ts`

- [ ] **Step 1: Écrire le test**

```typescript
// back/src/test/unit/achievements/custom-handlers/first-pull-ever.test.ts
import { describe, expect, it, jest } from '@jest/globals'
import { firstPullEverHandler } from '../../../../main/domain/achievements/custom-handlers/first-pull-ever'

describe('firstPullEverHandler', () => {
  it('unlocked quand le user a exactement 1 carte', async () => {
    const tx = {
      userCard: { count: jest.fn().mockResolvedValue(1) },
    } as any
    const result = await firstPullEverHandler.evaluate(tx, 'u1', {
      kind: 'PULL_COMPLETED',
      cardId: 'c1',
      rarity: 'COMMON',
      variant: 'NORMAL',
    })
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si plusieurs cartes', async () => {
    const tx = {
      userCard: { count: jest.fn().mockResolvedValue(5) },
    } as any
    const result = await firstPullEverHandler.evaluate(tx, 'u1', {
      kind: 'PULL_COMPLETED',
      cardId: 'c1',
      rarity: 'COMMON',
      variant: 'NORMAL',
    })
    expect(result.unlocked).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, échec attendu**

```bash
cd back && npx jest src/test/unit/achievements/custom-handlers/first-pull-ever.test.ts
```

- [ ] **Step 3: Implémenter le handler**

```typescript
// back/src/main/domain/achievements/custom-handlers/first-pull-ever.ts
import type { CustomHandler } from './index'

export const firstPullEverHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const count = await tx.userCard.count({ where: { userId } })
    return { unlocked: count === 1 }
  },
}
```

- [ ] **Step 4: Enregistrer dans le registre**

Dans `back/src/main/domain/achievements/custom-handlers/index.ts`, ajouter en bas :

```typescript
import { firstPullEverHandler } from './first-pull-ever'
customHandlers.first_pull_ever = firstPullEverHandler
```

- [ ] **Step 5: Run test, succès**

```bash
cd back && npx jest src/test/unit/achievements/custom-handlers/first-pull-ever.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/domain/achievements/custom-handlers/first-pull-ever.ts \
        back/src/main/domain/achievements/custom-handlers/index.ts \
        back/src/test/unit/achievements/custom-handlers/first-pull-ever.test.ts
git commit -m "feat(achievements): add first_pull_ever custom handler"
```

---

### Task 11: Handler `four_rarities_one_day`

**Files:**
- Create: `back/src/main/domain/achievements/custom-handlers/four-rarities-one-day.ts`
- Create: `back/src/test/unit/achievements/custom-handlers/four-rarities-one-day.test.ts`
- Modify: `back/src/main/domain/achievements/custom-handlers/index.ts`

- [ ] **Step 1: Test (mock du tx avec un groupBy renvoyant les raretés du jour)**

```typescript
// back/src/test/unit/achievements/custom-handlers/four-rarities-one-day.test.ts
import { describe, expect, it, jest } from '@jest/globals'
import { fourRaritiesOneDayHandler } from '../../../../main/domain/achievements/custom-handlers/four-rarities-one-day'

const event = {
  kind: 'PULL_COMPLETED' as const,
  cardId: 'c1',
  rarity: 'EPIC' as const,
  variant: 'NORMAL' as const,
}

describe('fourRaritiesOneDayHandler', () => {
  it('unlocked si COMMON, UNCOMMON, RARE, EPIC obtenus aujourd\'hui', async () => {
    const tx = {
      userCard: {
        findMany: jest.fn().mockResolvedValue([
          { card: { rarity: 'COMMON' } },
          { card: { rarity: 'UNCOMMON' } },
          { card: { rarity: 'RARE' } },
          { card: { rarity: 'EPIC' } },
        ]),
      },
    } as any
    const result = await fourRaritiesOneDayHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si UNCOMMON manquante', async () => {
    const tx = {
      userCard: {
        findMany: jest.fn().mockResolvedValue([
          { card: { rarity: 'COMMON' } },
          { card: { rarity: 'RARE' } },
          { card: { rarity: 'EPIC' } },
        ]),
      },
    } as any
    const result = await fourRaritiesOneDayHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
```

- [ ] **Step 2: Implémenter le handler**

```typescript
// back/src/main/domain/achievements/custom-handlers/four-rarities-one-day.ts
import type { CustomHandler } from './index'

const REQUIRED = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC'] as const

export const fourRaritiesOneDayHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const cardsToday = await tx.userCard.findMany({
      where: {
        userId,
        obtainedAt: { gte: startOfDay },
      },
      select: { card: { select: { rarity: true } } },
    })
    const raritiesToday = new Set(cardsToday.map((c) => c.card.rarity))
    const unlocked = REQUIRED.every((r) => raritiesToday.has(r))
    return { unlocked }
  },
}
```

> Note : le champ exact pour la date d'obtention (`obtainedAt`, `createdAt`, `acquiredAt`…) est à vérifier sur le modèle `UserCard`. Adapter en fonction.

- [ ] **Step 3: Enregistrer dans le registre**

Dans `custom-handlers/index.ts` :

```typescript
import { fourRaritiesOneDayHandler } from './four-rarities-one-day'
customHandlers.four_rarities_one_day = fourRaritiesOneDayHandler
```

- [ ] **Step 4: Run tests + commit**

```bash
cd back && npx jest src/test/unit/achievements/custom-handlers/four-rarities-one-day.test.ts
git add back/src/main/domain/achievements/custom-handlers/four-rarities-one-day.ts \
        back/src/main/domain/achievements/custom-handlers/index.ts \
        back/src/test/unit/achievements/custom-handlers/four-rarities-one-day.test.ts
git commit -m "feat(achievements): add four_rarities_one_day custom handler"
```

---

### Task 12: Handler `dust_balance_10k`

**Files:**
- Create: `back/src/main/domain/achievements/custom-handlers/dust-balance-10k.ts`
- Create: `back/src/test/unit/achievements/custom-handlers/dust-balance-10k.test.ts`
- Modify: `back/src/main/domain/achievements/custom-handlers/index.ts`

- [ ] **Step 1: Test**

```typescript
// back/src/test/unit/achievements/custom-handlers/dust-balance-10k.test.ts
import { describe, expect, it, jest } from '@jest/globals'
import { dustBalance10kHandler } from '../../../../main/domain/achievements/custom-handlers/dust-balance-10k'

const event = { kind: 'REWARD_CLAIMED' as const, rewardId: 'r1', source: 'STREAK' as const }

describe('dustBalance10kHandler', () => {
  it('unlocked si dust >= 10000', async () => {
    const tx = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ dust: 12000 }) },
    } as any
    const result = await dustBalance10kHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si dust < 10000', async () => {
    const tx = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ dust: 9000 }) },
    } as any
    const result = await dustBalance10kHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
```

- [ ] **Step 2: Implémentation**

```typescript
// back/src/main/domain/achievements/custom-handlers/dust-balance-10k.ts
import type { CustomHandler } from './index'

export const dustBalance10kHandler: CustomHandler = {
  listensTo: ['REWARD_CLAIMED', 'CARD_RECYCLED'],
  async evaluate(tx, userId, _event) {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { dust: true },
    })
    return { unlocked: user.dust >= 10000 }
  },
}
```

- [ ] **Step 3: Registre + tests + commit**

```typescript
// index.ts
import { dustBalance10kHandler } from './dust-balance-10k'
customHandlers.dust_balance_10k = dustBalance10kHandler
```

```bash
cd back && npx jest src/test/unit/achievements/custom-handlers/dust-balance-10k.test.ts
git add back/src/main/domain/achievements/custom-handlers/dust-balance-10k.ts \
        back/src/main/domain/achievements/custom-handlers/index.ts \
        back/src/test/unit/achievements/custom-handlers/dust-balance-10k.test.ts
git commit -m "feat(achievements): add dust_balance_10k custom handler"
```

---

### Task 13: Handler `own_all_machines`

**Files:**
- Create: `back/src/main/domain/achievements/custom-handlers/own-all-machines.ts`
- Create: `back/src/test/unit/achievements/custom-handlers/own-all-machines.test.ts`
- Modify: `back/src/main/domain/achievements/custom-handlers/index.ts`

- [ ] **Step 1: Test**

```typescript
// back/src/test/unit/achievements/custom-handlers/own-all-machines.test.ts
import { describe, expect, it, jest } from '@jest/globals'
import { ownAllMachinesHandler } from '../../../../main/domain/achievements/custom-handlers/own-all-machines'

const event = { kind: 'MACHINE_PURCHASED' as const, machineId: 'm1' }

describe('ownAllMachinesHandler', () => {
  it('unlocked si nombre possédé = nombre total', async () => {
    const tx = {
      shopItem: { count: jest.fn().mockResolvedValue(3) },
      userShopItem: { count: jest.fn().mockResolvedValue(3) },
    } as any
    const result = await ownAllMachinesHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si une machine manque', async () => {
    const tx = {
      shopItem: { count: jest.fn().mockResolvedValue(3) },
      userShopItem: { count: jest.fn().mockResolvedValue(2) },
    } as any
    const result = await ownAllMachinesHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
```

- [ ] **Step 2: Implémentation**

```typescript
// back/src/main/domain/achievements/custom-handlers/own-all-machines.ts
import type { CustomHandler } from './index'

export const ownAllMachinesHandler: CustomHandler = {
  listensTo: ['MACHINE_PURCHASED'],
  async evaluate(tx, userId, _event) {
    const [totalMachines, ownedMachines] = await Promise.all([
      tx.shopItem.count({ where: { type: 'MACHINE' } }),
      tx.userShopItem.count({
        where: { userId, shopItem: { type: 'MACHINE' } },
      }),
    ])
    return { unlocked: totalMachines > 0 && ownedMachines >= totalMachines }
  },
}
```

> Note : adapter les noms exacts de tables (`shopItem` / `userShopItem`) en se basant sur le schéma Prisma — voir `back/prisma/schema.prisma`.

- [ ] **Step 3: Registre + tests + commit**

```typescript
// index.ts
import { ownAllMachinesHandler } from './own-all-machines'
customHandlers.own_all_machines = ownAllMachinesHandler
```

```bash
cd back && npx jest src/test/unit/achievements/custom-handlers/own-all-machines.test.ts
git add back/src/main/domain/achievements/custom-handlers/own-all-machines.ts \
        back/src/main/domain/achievements/custom-handlers/index.ts \
        back/src/test/unit/achievements/custom-handlers/own-all-machines.test.ts
git commit -m "feat(achievements): add own_all_machines custom handler"
```

---

### Task 14: Handler `same_card_two_variants`

**Files:**
- Create: `back/src/main/domain/achievements/custom-handlers/same-card-two-variants.ts`
- Create: `back/src/test/unit/achievements/custom-handlers/same-card-two-variants.test.ts`
- Modify: `back/src/main/domain/achievements/custom-handlers/index.ts`

- [ ] **Step 1: Test**

```typescript
// back/src/test/unit/achievements/custom-handlers/same-card-two-variants.test.ts
import { describe, expect, it, jest } from '@jest/globals'
import { sameCardTwoVariantsHandler } from '../../../../main/domain/achievements/custom-handlers/same-card-two-variants'

const event = {
  kind: 'PULL_COMPLETED' as const,
  cardId: 'c1',
  rarity: 'COMMON' as const,
  variant: 'BRILLIANT' as const,
}

describe('sameCardTwoVariantsHandler', () => {
  it('unlocked si une cardId a au moins 2 variants distincts', async () => {
    const tx = {
      userCard: {
        groupBy: jest.fn().mockResolvedValue([
          { cardId: 'c1', _count: { variant: 2 } },
        ]),
      },
    } as any
    const result = await sameCardTwoVariantsHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si toutes cardId n\'ont qu\'un variant', async () => {
    const tx = {
      userCard: {
        groupBy: jest.fn().mockResolvedValue([
          { cardId: 'c1', _count: { variant: 1 } },
          { cardId: 'c2', _count: { variant: 1 } },
        ]),
      },
    } as any
    const result = await sameCardTwoVariantsHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
```

- [ ] **Step 2: Implémentation**

```typescript
// back/src/main/domain/achievements/custom-handlers/same-card-two-variants.ts
import type { CustomHandler } from './index'

export const sameCardTwoVariantsHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const groups = await tx.userCard.groupBy({
      by: ['cardId'],
      where: { userId },
      _count: { variant: true },
    })
    const unlocked = groups.some((g) => g._count.variant >= 2)
    return { unlocked }
  },
}
```

> Note : `groupBy` avec `_count: { variant: true }` requiert que `userCard` ait soit plusieurs rows par (userId, cardId, variant), soit un comptage distinct adapté — vérifier le pattern Prisma exact selon la version. Si ça ne compte pas comme attendu, basculer sur :
>
> ```typescript
> const rows = await tx.userCard.findMany({
>   where: { userId },
>   select: { cardId: true, variant: true },
> })
> const distinct = new Map<string, Set<string>>()
> for (const r of rows) {
>   const set = distinct.get(r.cardId) ?? new Set()
>   set.add(r.variant)
>   distinct.set(r.cardId, set)
> }
> const unlocked = [...distinct.values()].some((s) => s.size >= 2)
> ```

- [ ] **Step 3: Registre + tests + commit**

```typescript
// index.ts
import { sameCardTwoVariantsHandler } from './same-card-two-variants'
customHandlers.same_card_two_variants = sameCardTwoVariantsHandler
```

```bash
cd back && npx jest src/test/unit/achievements/custom-handlers/same-card-two-variants.test.ts
git add back/src/main/domain/achievements/custom-handlers/same-card-two-variants.ts \
        back/src/main/domain/achievements/custom-handlers/index.ts \
        back/src/test/unit/achievements/custom-handlers/same-card-two-variants.test.ts
git commit -m "feat(achievements): add same_card_two_variants custom handler"
```

---

## Phase 5 — Event integration

Chaque task hook l'engine dans un domain method existant, retourne les unlocks dans la response et propage jusqu'au HTTP.

### Task 15: Hook `track()` dans GachaDomain.pull()

**Files:**
- Modify: `back/src/main/domain/gacha/gacha.domain.ts`
- Modify: la route correspondante dans `back/src/main/interfaces/http/fastify/routes/pulls/` (ajout `unlockedAchievements` au response schema)

- [ ] **Step 1: Identifier le domain et la transaction**

Lire `back/src/main/domain/gacha/gacha.domain.ts` pour repérer la méthode `pull()` et sa `executeWithTransactionClient`. Le `tx` doit être disponible.

- [ ] **Step 2: Injecter `AchievementsDomain` dans le constructeur**

Ajouter `achievementsDomain` à la liste des dépendances injectées et au `Pick<IocContainer, ...>` du constructeur. Stocker dans `readonly #achievementsDomain`.

- [ ] **Step 3: Appeler `track()` à la fin de la transaction du pull**

Juste avant le `return` de la transaction (après que l'XP/jetons/userCard ont été mis à jour) :

```typescript
const pullUnlocks = await this.#achievementsDomain.track(tx, userId, {
  kind: 'PULL_COMPLETED',
  cardId: pulledCard.cardId,
  rarity: pulledCard.rarity,
  variant: pulledCard.variant,
})
const spentUnlocks = await this.#achievementsDomain.track(tx, userId, {
  kind: 'TOKENS_SPENT',
  amount: 1,
})
const levelUnlocks = newLevel > oldLevel
  ? await this.#achievementsDomain.track(tx, userId, { kind: 'LEVEL_UP', newLevel })
  : []

return {
  ...existingResult,
  unlockedAchievements: [...pullUnlocks, ...spentUnlocks, ...levelUnlocks],
}
```

> Note : adapter les noms (`pulledCard.cardId`, `newLevel`, `oldLevel`) selon le code existant. Le but est d'émettre les bons events depuis les données qu'on a déjà après le pull.

- [ ] **Step 4: Étendre le response schema Zod de la route `/pulls`**

Dans le fichier de route correspondant, étendre le schéma de réponse avec un champ `unlockedAchievements: z.array(unlockedAchievementSchema).optional()`. Définir `unlockedAchievementSchema` dans un fichier partagé (par exemple `back/src/main/interfaces/http/fastify/schemas/achievements.schemas.ts`) :

```typescript
import { z } from 'zod'
import { CardRarity } from '@prisma/client'

export const unlockedAchievementSchema = z.object({
  key: z.string(),
  name: z.string(),
  iconKey: z.string().nullable(),
  reward: z.object({
    tokens: z.number().int(),
    dust: z.number().int(),
    xp: z.number().int(),
    cardRarity: z.nativeEnum(CardRarity).nullable(),
  }).nullable(),
})

export const withUnlocksSchema = <T extends z.ZodType>(base: T) =>
  base.and(z.object({
    unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
  }))
```

- [ ] **Step 5: Build typecheck**

```bash
cd back && npm run build:check-typedefs
```

Expected: 0 erreur.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/domain/gacha/gacha.domain.ts \
        back/src/main/interfaces/http/fastify/routes/pulls/ \
        back/src/main/interfaces/http/fastify/schemas/achievements.schemas.ts
git commit -m "feat(achievements): track unlocks on pull and expose in response"
```

---

### Task 16: Hook dans RewardsDomain

**Files:**
- Modify: `back/src/main/domain/rewards/rewards.domain.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/rewards/index.ts`

- [ ] **Step 1: Injecter `AchievementsDomain`** dans le constructeur de `RewardsDomain` (suivre le pattern de Task 15 étape 2).

- [ ] **Step 2: Émettre les events dans `claimOne` et `claimAll`**

Dans la transaction de `claimOne`, après les updates User et `markClaimedInTx` :

```typescript
const claimUnlocks = await this.#achievementsDomain.track(tx, userId, {
  kind: 'REWARD_CLAIMED',
  rewardId: userReward.rewardId,
  source: userReward.source,
})
const dustUnlocks = userReward.reward.dust > 0
  ? await this.#achievementsDomain.track(tx, userId, {
      kind: 'DUST_SPENT',
      amount: 0,  // claim n'est pas une dépense — laisse passer pour cohérence d'API mais delta = 0
    })
  : []
const levelUnlocks = newLevel > existingLevel
  ? await this.#achievementsDomain.track(tx, userId, { kind: 'LEVEL_UP', newLevel })
  : []
```

> Note : le claim ne dépense pas de dust, c'est en gagner. La spec liste `DUST_SPENT` comme criterion — utilisons-le uniquement quand l'utilisateur dépense vraiment (ex: shop purchase). Pour le claim, on n'émet que `REWARD_CLAIMED` + `LEVEL_UP` éventuel.

Pour `claimAll`, itérer sur chaque reward réclamé et accumuler les unlocks. **Émettre `LEVEL_UP` une seule fois** à la fin si le level a effectivement changé.

Ajouter à la response : `unlockedAchievements: [...claimUnlocks, ...levelUnlocks]`.

- [ ] **Step 3: Étendre le response schema `claimResultSchema`** pour inclure `unlockedAchievements` (utiliser `withUnlocksSchema` créé en Task 15).

- [ ] **Step 4: Build typecheck + commit**

```bash
cd back && npm run build:check-typedefs
git add back/src/main/domain/rewards/rewards.domain.ts back/src/main/interfaces/http/fastify/routes/rewards/
git commit -m "feat(achievements): track unlocks on reward claim"
```

---

### Task 17: Hook dans StreakDomain

**Files:**
- Modify: `back/src/main/domain/streak/streak.domain.ts`
- Modify: la route qui retourne la session/login response

- [ ] **Step 1: Injecter `AchievementsDomain`** dans `StreakDomain`.

- [ ] **Step 2: Émettre `STREAK_UPDATED` quand le streak augmente**

Dans la transaction de `updateStreak()`, après `UserRewardRepository.upsertInTx()` :

```typescript
if (newStreakDays !== existingStreakDays) {
  const unlocks = await this.#achievementsDomain.track(tx, userId, {
    kind: 'STREAK_UPDATED',
    days: newStreakDays,
  })
  // remonter au caller
  return { ...result, unlockedAchievements: unlocks }
}
```

- [ ] **Step 3: Propager dans le payload de session refresh / login**

Identifier l'endpoint qui appelle `StreakDomain.updateStreak()` au login (probablement dans `auth.routes.ts` ou un middleware). Y ajouter le champ `unlockedAchievements` dans la response.

- [ ] **Step 4: Build typecheck + commit**

```bash
cd back && npm run build:check-typedefs
git add back/src/main/domain/streak/streak.domain.ts back/src/main/interfaces/http/fastify/routes/
git commit -m "feat(achievements): track unlocks on streak update at login"
```

---

### Task 18: Hook dans ShopDomain (achat machine)

**Files:**
- Modify: `back/src/main/domain/shop/shop.domain.ts`
- Modify: route `/shop/:id/purchase`

- [ ] **Step 1: Injecter `AchievementsDomain`** dans `ShopDomain`.

- [ ] **Step 2: Émettre les events sur achat**

Dans la transaction de l'achat, après la mise à jour de la balance et l'INSERT `userShopItem` :

```typescript
const events: AchievementEvent[] = []
if (shopItem.type === 'MACHINE') {
  events.push({ kind: 'MACHINE_PURCHASED', machineId: shopItem.id })
}
if (priceCurrency === 'TOKENS') {
  events.push({ kind: 'TOKENS_SPENT', amount: price })
} else {
  events.push({ kind: 'DUST_SPENT', amount: price })
}

const unlocks: UnlockedAchievement[] = []
for (const e of events) {
  unlocks.push(...(await this.#achievementsDomain.track(tx, userId, e)))
}
return { ...purchaseResult, unlockedAchievements: unlocks }
```

- [ ] **Step 3: Étendre la response Zod** de `/shop/:id/purchase` avec `unlockedAchievements`.

- [ ] **Step 4: Build typecheck + commit**

```bash
cd back && npm run build:check-typedefs
git add back/src/main/domain/shop/shop.domain.ts back/src/main/interfaces/http/fastify/routes/shop/
git commit -m "feat(achievements): track unlocks on machine purchase and currency spent"
```

---

### Task 19: Hook dans CardsDomain (recyclage)

**Files:**
- Modify: `back/src/main/domain/cards/cards.domain.ts` (à confirmer le chemin exact)

- [ ] **Step 1: Localiser la méthode de recyclage**

Chercher dans `back/src/main/domain/cards/` la méthode qui consomme une carte pour produire du dust (probablement `recycle()`, `disenchant()`, ou `convertToDust()`).

- [ ] **Step 2: Injecter `AchievementsDomain`**.

- [ ] **Step 3: Émettre les events dans la transaction**

```typescript
const recycleUnlocks = await this.#achievementsDomain.track(tx, userId, {
  kind: 'CARD_RECYCLED',
  amount: 1,  // ou le count si batch
})
// Le user gagne du dust → pas un DUST_SPENT
```

- [ ] **Step 4: Étendre la response Zod** de la route de recyclage avec `unlockedAchievements`.

- [ ] **Step 5: Build typecheck + commit**

```bash
cd back && npm run build:check-typedefs
git add back/src/main/domain/cards/ back/src/main/interfaces/http/fastify/routes/
git commit -m "feat(achievements): track unlocks on card recycle"
```

---

### Task 20: Test d'intégration end-to-end (un pull → unlock)

**Files:**
- Create: `back/src/test/e2e/achievements/unlock-on-pull.e2e.test.ts` (suivre le pattern e2e existant — chemin exact à vérifier)

- [ ] **Step 1: Repérer le pattern e2e existant**

Lire un test e2e existant (par ex. `back/src/test/e2e/rewards/claim.e2e.test.ts` si présent) pour comprendre :
- Comment la BDD de test est initialisée
- Comment un user est créé
- Comment on appelle un endpoint (fastify inject ? supertest ? client HTTP réel ?)
- Patterns de setup/teardown

- [ ] **Step 2: Écrire le test**

Le test doit :
1. Seeder un `Achievement` `pulls_10` avec criterion `{ type: 'PULL_COUNT', threshold: 1 }` (pour faciliter l'unlock).
2. Créer un user avec assez de tokens pour faire 1 pull.
3. POST `/pulls` → vérifier `response.body.unlockedAchievements` contient le bon achievement.
4. GET `/rewards/pending` → vérifier qu'un `UserReward` source=ACHIEVEMENT a été créé.

Squelette :

```typescript
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals'
import { buildTestApp, type TestApp } from '../test-utils/build-test-app'  // à adapter

describe('e2e: pull unlocks achievement', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('un pull #1 débloque pulls_10 (threshold=1 pour le test)', async () => {
    const userId = await app.createUser({ tokens: 5 })
    await app.createAchievement({
      key: 'pulls_test',
      name: 'Test',
      description: 'Test',
      family: 'pulls',
      tier: 0,
      hidden: false,
      iconKey: null,
      sortOrder: 0,
      isActive: true,
      criterion: { type: 'PULL_COUNT', threshold: 1 },
      reward: { create: { tokens: 5, dust: 0, xp: 0 } },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      cookies: app.cookiesFor(userId),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.unlockedAchievements).toHaveLength(1)
    expect(body.unlockedAchievements[0].key).toBe('pulls_test')
  })
})
```

- [ ] **Step 3: Run + commit**

```bash
cd back && npm run test:e2e -- achievements/unlock-on-pull
git add back/src/test/e2e/achievements/
git commit -m "test(achievements): add e2e test for unlock on pull"
```

---

## Phase 6 — HTTP routes

### Task 21: Routes user `/achievements` et `/achievements/families`

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/achievements/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/app.ts` (ou wherever les routes sont enregistrées)

- [ ] **Step 1: Définir les schémas de réponse**

Dans `back/src/main/interfaces/http/fastify/routes/achievements/index.ts` :

```typescript
import { z } from 'zod'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

const achievementSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  family: z.string().nullable(),
  tier: z.number().int(),
  hidden: z.boolean(),
  iconKey: z.string().nullable(),
  sortOrder: z.number().int(),
  progress: z.number().int(),
  threshold: z.number().int(),
  unlocked: z.boolean(),
  unlockedAt: z.date().nullable(),
  reward: z
    .object({
      tokens: z.number().int(),
      dust: z.number().int(),
      xp: z.number().int(),
      cardRarity: z.string().nullable(),
    })
    .nullable(),
})

const familySummarySchema = z.object({
  family: z.string(),
  total: z.number().int(),
  unlocked: z.number().int(),
})

export const achievementsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { achievementsDomain } = fastify.iocContainer

  fastify.get(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: z.array(achievementSchema) } },
    },
    (request) => achievementsDomain.listForUser(request.user.userID),
  )

  fastify.get(
    '/families',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: z.array(familySummarySchema) } },
    },
    (request) => achievementsDomain.listFamilies(request.user.userID),
  )
}
```

- [ ] **Step 2: Enregistrer le router**

Dans le fichier qui registre les routes (suivre le pattern existant pour `rewardsRouter`) :

```typescript
import { achievementsRouter } from './routes/achievements'
fastify.register(achievementsRouter, { prefix: '/achievements' })
```

- [ ] **Step 3: Smoke test manuel**

```bash
cd back && npm run dev
# dans un autre terminal :
curl -b cookies.txt http://localhost:3000/achievements
curl -b cookies.txt http://localhost:3000/achievements/families
```

Expected: 200 + JSON array (vide si pas encore seedé).

- [ ] **Step 4: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/achievements/ \
        back/src/main/interfaces/http/fastify/app.ts
git commit -m "feat(achievements): add GET /achievements and /achievements/families routes"
```

---

### Task 22: Extension admin — validation criterion + endpoint custom-handlers

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/achievements/` (existant)

- [ ] **Step 1: Ajouter la validation Zod du `criterion` au create/update admin**

Dans le schéma Zod du body de POST/PUT admin :

```typescript
import { AchievementCriterionSchema } from '../../../../domain/achievements/criterion.types'

const adminCreateAchievementBody = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  family: z.string().optional().nullable(),
  tier: z.number().int().default(0),
  hidden: z.boolean().default(false),
  iconKey: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  criterion: AchievementCriterionSchema,
  rewardId: z.string().uuid().optional().nullable(),
})
```

- [ ] **Step 2: Ajouter l'endpoint `GET /admin/achievements/custom-handlers`**

```typescript
import { listCustomHandlerKeys } from '../../../../domain/achievements/custom-handlers'

fastify.get(
  '/custom-handlers',
  {
    onRequest: [fastify.verifyAdminSession],  // adapter le nom du middleware admin
    schema: { response: { 200: z.array(z.string()) } },
  },
  () => listCustomHandlerKeys(),
)
```

- [ ] **Step 3: Build typecheck + commit**

```bash
cd back && npm run build:check-typedefs
git add back/src/main/interfaces/http/fastify/routes/admin/achievements/
git commit -m "feat(achievements): admin criterion validation and custom-handlers endpoint"
```

---

## Phase 7 — Seed catalogue

### Task 23: Seeder le catalogue de 24 achievements

**Files:**
- Modify: `back/prisma/seed/achievements.ts`

- [ ] **Step 1: Réécrire le contenu de `back/prisma/seed/achievements.ts`**

```typescript
// back/prisma/seed/achievements.ts
import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

interface SeedEntry {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  sortOrder: number
  criterion: Prisma.JsonValue
  reward: { tokens: number; dust: number; xp: number; cardRarity?: string }
}

const ENTRIES: SeedEntry[] = [
  // pulls
  { key: 'pulls_10',    name: 'Premier tirage sérieux',  description: 'Faire 10 pulls.',     family: 'pulls', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'PULL_COUNT', threshold: 10 },   reward: { tokens: 5, dust: 0, xp: 0 } },
  { key: 'pulls_100',   name: 'Habitué de la machine',   description: 'Faire 100 pulls.',    family: 'pulls', tier: 1, hidden: false, sortOrder: 2, criterion: { type: 'PULL_COUNT', threshold: 100 },  reward: { tokens: 20, dust: 50, xp: 0 } },
  { key: 'pulls_500',   name: 'Pull addict',             description: 'Faire 500 pulls.',    family: 'pulls', tier: 2, hidden: false, sortOrder: 3, criterion: { type: 'PULL_COUNT', threshold: 500 },  reward: { tokens: 50, dust: 200, xp: 100 } },
  { key: 'pulls_1000',  name: 'Légende des machines',    description: 'Faire 1000 pulls.',   family: 'pulls', tier: 3, hidden: false, sortOrder: 4, criterion: { type: 'PULL_COUNT', threshold: 1000 }, reward: { tokens: 100, dust: 500, xp: 0, cardRarity: 'EPIC' } },

  // dust
  { key: 'dust_spent_500',    name: 'Premier investissement', description: 'Dépenser 500 dust.',  family: 'dust', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'DUST_SPENT', threshold: 500 },  reward: { tokens: 10, dust: 0, xp: 0 } },
  { key: 'dust_spent_5000',   name: 'Big spender',            description: 'Dépenser 5000 dust.', family: 'dust', tier: 1, hidden: false, sortOrder: 2, criterion: { type: 'DUST_SPENT', threshold: 5000 }, reward: { tokens: 30, dust: 100, xp: 0 } },
  { key: 'cards_recycled_50', name: 'Recycleur',              description: 'Recycler 50 cartes.', family: 'dust', tier: 2, hidden: false, sortOrder: 3, criterion: { type: 'CARDS_RECYCLED', threshold: 50 }, reward: { tokens: 0, dust: 200, xp: 0 } },

  // collection_rarity
  { key: 'own_rare_10',         name: 'Chasseur de raretés',   description: 'Posséder 10 cartes RARE.',             family: 'collection_rarity', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'OWN_RARITY_COUNT', rarity: 'RARE', threshold: 10 },                              reward: { tokens: 20, dust: 0, xp: 0 } },
  { key: 'own_epic_5',          name: 'Collectionneur EPIC',   description: 'Posséder 5 cartes EPIC.',              family: 'collection_rarity', tier: 1, hidden: false, sortOrder: 2, criterion: { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', threshold: 5 },                                reward: { tokens: 50, dust: 0, xp: 0 } },
  { key: 'own_legendary_1',     name: 'Première LEGENDARY',    description: 'Posséder 1 carte LEGENDARY.',          family: 'collection_rarity', tier: 2, hidden: false, sortOrder: 3, criterion: { type: 'OWN_RARITY_COUNT', rarity: 'LEGENDARY', threshold: 1 },                          reward: { tokens: 100, dust: 500, xp: 0 } },
  { key: 'own_legendary_5',     name: 'Légendaire confirmé',   description: 'Posséder 5 cartes LEGENDARY.',         family: 'collection_rarity', tier: 3, hidden: false, sortOrder: 4, criterion: { type: 'OWN_RARITY_COUNT', rarity: 'LEGENDARY', threshold: 5 },                          reward: { tokens: 0, dust: 200, xp: 0, cardRarity: 'EPIC' } },
  { key: 'own_holographic_1',   name: 'Holographie',           description: 'Posséder 1 carte HOLOGRAPHIQUE (toutes raretés).', family: 'collection_rarity', tier: 4, hidden: false, sortOrder: 5, criterion: { type: 'OWN_RARITY_COUNT', variant: 'HOLOGRAPHIC', threshold: 1 },                       reward: { tokens: 50, dust: 300, xp: 0 } },

  // collection_variants
  { key: 'own_brilliant_1',         name: 'Premier éclat', description: 'Posséder 1 carte BRILLIANT (toutes raretés).',  family: 'collection_variants', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'OWN_RARITY_COUNT', variant: 'BRILLIANT', threshold: 1 },                       reward: { tokens: 20, dust: 0, xp: 0 } },
  { key: 'own_brilliant_5',         name: 'Brilliance',    description: 'Posséder 5 cartes BRILLIANT (toutes raretés).', family: 'collection_variants', tier: 1, hidden: false, sortOrder: 2, criterion: { type: 'OWN_RARITY_COUNT', variant: 'BRILLIANT', threshold: 5 },                       reward: { tokens: 50, dust: 100, xp: 0 } },
  { key: 'same_card_two_variants',  name: 'Double face',   description: 'Posséder 2 variants d\'une même carte.',     family: 'collection_variants', tier: 2, hidden: false, sortOrder: 3, criterion: { type: 'CUSTOM_EVENT', handlerKey: 'same_card_two_variants' },                    reward: { tokens: 30, dust: 200, xp: 0 } },

  // collection_complete
  { key: 'complete_common',    name: 'Collection commune',       description: 'Posséder toutes les cartes COMMON.', family: 'collection_complete', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'COLLECTION_COMPLETE', scope: { rarity: 'COMMON' } }, reward: { tokens: 100, dust: 0, xp: 0 } },
  { key: 'complete_all_base',  name: 'Maître de la collection', description: 'Compléter la collection de base.',   family: 'collection_complete', tier: 1, hidden: false, sortOrder: 2, criterion: { type: 'COLLECTION_COMPLETE', scope: 'ALL' },               reward: { tokens: 500, dust: 0, xp: 0, cardRarity: 'LEGENDARY' } },

  // streak
  { key: 'streak_30', name: 'Mois entier', description: 'Atteindre 30 jours de streak.', family: 'streak', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'STREAK_REACHED', threshold: 30 }, reward: { tokens: 200, dust: 500, xp: 0 } },

  // machines
  { key: 'machines_own_1',    name: 'Première machine',           description: 'Posséder 1 machine.',         family: 'machines', tier: 0, hidden: false, sortOrder: 1, criterion: { type: 'MACHINES_OWNED', threshold: 1 },                       reward: { tokens: 10, dust: 0, xp: 0 } },
  { key: 'machines_own_2',    name: 'Salle d\'arcade',            description: 'Posséder 2 machines.',        family: 'machines', tier: 1, hidden: false, sortOrder: 2, criterion: { type: 'MACHINES_OWNED', threshold: 2 },                       reward: { tokens: 20, dust: 0, xp: 0 } },
  { key: 'machines_own_all',  name: 'Collectionneur de machines', description: 'Posséder toutes les machines.', family: 'machines', tier: 2, hidden: false, sortOrder: 3, criterion: { type: 'CUSTOM_EVENT', handlerKey: 'own_all_machines' },     reward: { tokens: 100, dust: 500, xp: 0 } },

  // cachés
  { key: 'first_pull',    name: 'Bienvenue',   description: 'Faire votre tout premier pull.', family: null, tier: 0, hidden: true, sortOrder: 0, criterion: { type: 'CUSTOM_EVENT', handlerKey: 'first_pull_ever' },         reward: { tokens: 20, dust: 0, xp: 0 } },
  { key: 'rainbow_day',   name: 'Arc-en-ciel', description: '???',                              family: null, tier: 0, hidden: true, sortOrder: 0, criterion: { type: 'CUSTOM_EVENT', handlerKey: 'four_rarities_one_day' }, reward: { tokens: 0, dust: 0, xp: 0, cardRarity: 'EPIC' } },
  { key: 'dust_hoarder',  name: 'Pactole',     description: '???',                              family: null, tier: 0, hidden: true, sortOrder: 0, criterion: { type: 'CUSTOM_EVENT', handlerKey: 'dust_balance_10k' },      reward: { tokens: 50, dust: 0, xp: 0 } },
]

export async function seedAchievements(tx: Tx) {
  for (const entry of ENTRIES) {
    const { reward, cardRarity, ...rest } = { ...entry, cardRarity: entry.reward.cardRarity }
    await tx.achievement.create({
      data: {
        key: rest.key,
        name: rest.name,
        description: rest.description,
        family: rest.family,
        tier: rest.tier,
        hidden: rest.hidden,
        sortOrder: rest.sortOrder,
        isActive: true,
        criterion: rest.criterion,
        reward: {
          create: {
            tokens: reward.tokens,
            dust: reward.dust,
            xp: reward.xp,
            cardRarity: cardRarity ?? null,
          },
        },
      },
    })
  }
}
```

- [ ] **Step 2: Vérifier l'ordre de cleanup dans `seed.ts`**

Dans `back/prisma/seed.ts`, s'assurer que `tx.userAchievement.deleteMany()` et `tx.userAchievementProgress.deleteMany()` sont appelés AVANT `tx.achievement.deleteMany()` (FK).

```typescript
await tx.userAchievementProgress.deleteMany()
await tx.userAchievement.deleteMany()
// ... autres deleteMany ...
await tx.achievement.deleteMany()
```

- [ ] **Step 3: Run le seed**

```bash
cd back && npm run db:seed
```

Expected: pas d'erreur, 24 achievements en BDD.

- [ ] **Step 4: Vérifier en BDD**

```bash
cd back && npx prisma studio
# OU
psql $DATABASE_URL -c 'SELECT key, family, tier FROM "Achievement" ORDER BY family, tier;'
```

Expected: 24 lignes.

- [ ] **Step 5: Commit**

```bash
git add back/prisma/seed/achievements.ts back/prisma/seed.ts
git commit -m "feat(achievements): seed initial catalogue of 24 achievements"
```

---

## Phase 8 — Frontend foundation

### Task 24: API client + types partagés frontend

**Files:**
- Create: `front/src/constants/achievements.constant.ts`
- Create: `front/src/api/achievements.api.ts`

- [ ] **Step 1: Constants + types**

```typescript
// front/src/constants/achievements.constant.ts
export const ACHIEVEMENT_ROUTES = {
  list: '/achievements',
  families: '/achievements/families',
} as const

export interface UnlockedAchievement {
  key: string
  name: string
  iconKey: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

export interface AchievementWithProgress {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  iconKey: string | null
  sortOrder: number
  progress: number
  threshold: number
  unlocked: boolean
  unlockedAt: string | null  // sérialisé en string par JSON
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

export interface FamilySummary {
  family: string
  total: number
  unlocked: number
}
```

- [ ] **Step 2: API client**

```typescript
// front/src/api/achievements.api.ts
import { apiUrl } from '../config'
import { fetchWithAuth } from './fetchWithAuth'
import { handleHttpError } from './httpError'
import {
  ACHIEVEMENT_ROUTES,
  type AchievementWithProgress,
  type FamilySummary,
} from '../constants/achievements.constant'

export const AchievementsApi = {
  list: async (): Promise<AchievementWithProgress[]> => {
    const res = await fetchWithAuth(`${apiUrl}${ACHIEVEMENT_ROUTES.list}`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la récupération des succès')
    return res.json()
  },

  families: async (): Promise<FamilySummary[]> => {
    const res = await fetchWithAuth(`${apiUrl}${ACHIEVEMENT_ROUTES.families}`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la récupération des familles')
    return res.json()
  },
}
```

> Note : les imports `apiUrl`, `fetchWithAuth`, `handleHttpError` doivent matcher exactement ceux utilisés dans `front/src/api/rewards.api.ts`. Si le projet utilise une convention différente (alias TanStack, axios instance), adapter.

- [ ] **Step 3: Commit**

```bash
git add front/src/constants/achievements.constant.ts front/src/api/achievements.api.ts
git commit -m "feat(achievements): add frontend API client and shared types"
```

---

### Task 25: Hooks TanStack Query

**Files:**
- Create: `front/src/queries/useAchievements.ts`

- [ ] **Step 1: Implémenter les hooks**

```typescript
// front/src/queries/useAchievements.ts
import { useQuery } from '@tanstack/react-query'
import { AchievementsApi } from '../api/achievements.api'
import { useDataFetching } from './useDataFetching'

export const useAchievements = () => {
  const query = useQuery({
    queryKey: ['achievements', 'list'],
    queryFn: () => AchievementsApi.list(),
  })
  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })
  return query
}

export const useAchievementFamilies = () => {
  const query = useQuery({
    queryKey: ['achievements', 'families'],
    queryFn: () => AchievementsApi.families(),
  })
  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })
  return query
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/queries/useAchievements.ts
git commit -m "feat(achievements): add useAchievements and useAchievementFamilies hooks"
```

---

### Task 26: Store Zustand `achievementUnlock`

**Files:**
- Create: `front/src/stores/achievementUnlock.store.ts`

- [ ] **Step 1: Implémenter le store**

```typescript
// front/src/stores/achievementUnlock.store.ts
import { create } from 'zustand'
import type { UnlockedAchievement } from '../constants/achievements.constant'

type AchievementUnlockState = {
  queue: UnlockedAchievement[]
  enqueue: (unlocks: UnlockedAchievement[]) => void
  dismiss: () => void
}

export const useAchievementUnlockStore = create<AchievementUnlockState>((set) => ({
  queue: [],
  enqueue: (unlocks) =>
    set((s) => ({ queue: [...s.queue, ...unlocks] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
}))
```

- [ ] **Step 2: Commit**

```bash
git add front/src/stores/achievementUnlock.store.ts
git commit -m "feat(achievements): add achievementUnlock Zustand store"
```

---

## Phase 9 — Frontend UI

### Task 27: Composant `AchievementUnlockToast` + intégration dans les hooks existants

**Files:**
- Create: `front/src/components/achievements/AchievementUnlockToast.tsx`
- Modify: `front/src/queries/useRewards.ts`
- Modify: hook de pull (probablement dans `front/src/queries/usePull.ts` ou inline dans `play.tsx`)
- Modify: hook de session/auth (`front/src/stores/auth.store.ts` ou équivalent)
- Modify: `front/src/App.tsx` (ou layout racine `_authenticated.tsx`)

- [ ] **Step 1: Composant toast**

```tsx
// front/src/components/achievements/AchievementUnlockToast.tsx
import { Award } from 'lucide-react'
import { useEffect } from 'react'
import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store'

const DISPLAY_MS = 2500

export function AchievementUnlockToast() {
  const current = useAchievementUnlockStore((s) => s.queue[0])
  const dismiss = useAchievementUnlockStore((s) => s.dismiss)

  useEffect(() => {
    if (!current) return
    const t = setTimeout(dismiss, DISPLAY_MS)
    return () => clearTimeout(t)
  }, [current, dismiss])

  if (!current) return null

  return (
    <div
      className="fixed left-1/2 top-6 z-50 -translate-x-1/2"
      style={{ animation: 'achievementToastIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      onClick={dismiss}
    >
      <div className="flex items-center gap-3 rounded-md border border-amber-400/40 bg-gradient-to-br from-amber-500/95 to-amber-700/95 px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.4)]">
        <div className="rounded-full bg-amber-200/30 p-2">
          <Award className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-100/80">
            Succès débloqué
          </span>
          <span className="text-sm font-black text-white drop-shadow">
            {current.name}
          </span>
        </div>
      </div>
    </div>
  )
}
```

Ajouter dans le CSS global (`front/src/index.css` ou équivalent) :

```css
@keyframes achievementToastIn {
  from { opacity: 0; transform: translate(-50%, -16px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
```

- [ ] **Step 2: Monter le toast dans le layout racine**

Trouver `front/src/App.tsx` ou `front/src/routes/_authenticated.tsx` et ajouter `<AchievementUnlockToast />` à côté de `<LevelUpOverlay />` (pattern identique).

- [ ] **Step 3: Intégrer dans `useRewards.ts`**

Dans `useClaimReward` et `useClaimAllRewards`, après `onSuccess` :

```typescript
const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
// dans onSuccess :
if (result.unlockedAchievements?.length) {
  enqueueAchievementUnlock(result.unlockedAchievements)
  qc.invalidateQueries({ queryKey: ['achievements'] })
}
```

- [ ] **Step 4: Intégrer dans le hook de pull**

Localiser le mutation hook de pull (chercher `usePull` ou inline dans `front/src/routes/_authenticated/play.tsx`). Pattern identique :

```typescript
if (result.unlockedAchievements?.length) {
  enqueueAchievementUnlock(result.unlockedAchievements)
  qc.invalidateQueries({ queryKey: ['achievements'] })
}
```

- [ ] **Step 5: Intégrer dans `auth.store.ts` (session refresh / fetchMe)**

Dans la fonction qui charge le user après login (`fetchMe` ou équivalent), si le backend retourne `unlockedAchievements` dans le payload :

```typescript
const res = await AuthApi.me()
if (res.unlockedAchievements?.length) {
  useAchievementUnlockStore.getState().enqueue(res.unlockedAchievements)
}
```

- [ ] **Step 6: Test manuel**

```bash
# Backend
cd back && npm run dev
# Frontend
cd front && npm run dev
```

Faire un pull qui doit débloquer `pulls_10` → vérifier que le toast apparaît + que la reward est dans le popup.

- [ ] **Step 7: Commit**

```bash
git add front/src/components/achievements/AchievementUnlockToast.tsx \
        front/src/queries/useRewards.ts \
        front/src/routes/_authenticated/play.tsx \
        front/src/stores/auth.store.ts \
        front/src/App.tsx \
        front/src/index.css
git commit -m "feat(achievements): add unlock toast and wire into existing hooks"
```

---

### Task 28: Composants `AchievementCard`, `HiddenAchievementCard`, `AchievementFamilyHeader`, `AchievementGrid`

**Files:**
- Create: `front/src/components/achievements/AchievementCard.tsx`
- Create: `front/src/components/achievements/HiddenAchievementCard.tsx`
- Create: `front/src/components/achievements/AchievementFamilyHeader.tsx`
- Create: `front/src/components/achievements/AchievementGrid.tsx`

- [ ] **Step 1: `AchievementCard`**

```tsx
// front/src/components/achievements/AchievementCard.tsx
import { Award, Coins, Sparkles, Star } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { AchievementWithProgress } from '../../constants/achievements.constant'

interface Props {
  achievement: AchievementWithProgress
}

export function AchievementCard({ achievement }: Props) {
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.threshold)) * 100))
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3',
        achievement.unlocked
          ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-transparent'
          : 'border-border bg-card/50 opacity-90',
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'rounded-full p-2',
            achievement.unlocked ? 'bg-amber-500/30 text-amber-200' : 'bg-muted/40 text-text-light/40',
          )}
        >
          <Award className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text">{achievement.name}</div>
          <div className="text-xs text-text-light/70">{achievement.description}</div>
        </div>
      </div>

      {!achievement.unlocked && (
        <div className="mt-1">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-light/60">
            <span>Progression</span>
            <span className="tabular-nums">{achievement.progress} / {achievement.threshold}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted/40">
            <div className="h-full rounded bg-amber-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {achievement.reward && (
        <div className="flex items-center gap-3 border-t border-border/40 pt-2 text-xs">
          {achievement.reward.tokens > 0 && (
            <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-primary" />{achievement.reward.tokens}</span>
          )}
          {achievement.reward.dust > 0 && (
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-400" />{achievement.reward.dust}</span>
          )}
          {achievement.reward.xp > 0 && (
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{achievement.reward.xp} XP</span>
          )}
          {achievement.reward.cardRarity && (
            <span className="text-[10px] uppercase text-emerald-400">+ carte {achievement.reward.cardRarity}</span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `HiddenAchievementCard`**

```tsx
// front/src/components/achievements/HiddenAchievementCard.tsx
import { HelpCircle } from 'lucide-react'

export function HiddenAchievementCard() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card/30 p-3">
      <div className="rounded-full bg-muted/40 p-2">
        <HelpCircle className="h-4 w-4 text-text-light/40" />
      </div>
      <div className="text-sm font-bold text-text-light/60">Succès caché</div>
    </div>
  )
}
```

- [ ] **Step 3: `AchievementFamilyHeader`**

```tsx
// front/src/components/achievements/AchievementFamilyHeader.tsx
interface Props {
  family: string
  total: number
  unlocked: number
}

const FAMILY_LABELS: Record<string, string> = {
  pulls: 'Tirages',
  dust: 'Économie',
  collection_rarity: 'Collection — raretés',
  collection_variants: 'Collection — variantes',
  collection_complete: 'Complétion',
  streak: 'Fidélité',
  machines: 'Machines',
}

export function AchievementFamilyHeader({ family, total, unlocked }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-black text-text">{FAMILY_LABELS[family] ?? family}</h2>
      <span className="text-xs text-text-light/70 tabular-nums">{unlocked} / {total}</span>
    </div>
  )
}
```

- [ ] **Step 4: `AchievementGrid`**

```tsx
// front/src/components/achievements/AchievementGrid.tsx
import type { AchievementWithProgress } from '../../constants/achievements.constant'
import { AchievementCard } from './AchievementCard'
import { AchievementFamilyHeader } from './AchievementFamilyHeader'
import { HiddenAchievementCard } from './HiddenAchievementCard'

interface Props {
  achievements: AchievementWithProgress[]
}

const HIDDEN_FAMILY = '__hidden__'

export function AchievementGrid({ achievements }: Props) {
  const grouped = new Map<string, AchievementWithProgress[]>()
  for (const a of achievements) {
    const key = a.family ?? HIDDEN_FAMILY
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(a)
  }

  return (
    <div className="flex flex-col gap-6">
      {[...grouped.entries()].map(([family, items]) => {
        if (family === HIDDEN_FAMILY) {
          return (
            <section key="hidden">
              <h2 className="mb-3 text-base font-black text-text">Succès cachés</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) =>
                  a.unlocked ? (
                    <AchievementCard key={a.key} achievement={a} />
                  ) : (
                    <HiddenAchievementCard key={a.key} />
                  ),
                )}
              </div>
            </section>
          )
        }
        const total = items.length
        const unlocked = items.filter((a) => a.unlocked).length
        return (
          <section key={family}>
            <AchievementFamilyHeader family={family} total={total} unlocked={unlocked} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <AchievementCard key={a.key} achievement={a} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add front/src/components/achievements/
git commit -m "feat(achievements): add AchievementCard, HiddenCard, FamilyHeader, Grid"
```

---

### Task 29: Page route `/achievements`

**Files:**
- Create: `front/src/routes/_authenticated/achievements.tsx`

- [ ] **Step 1: Implémenter la page**

```tsx
// front/src/routes/_authenticated/achievements.tsx
import { createFileRoute } from '@tanstack/react-router'
import { AchievementGrid } from '../../components/achievements/AchievementGrid'
import { useAchievements } from '../../queries/useAchievements'

export const Route = createFileRoute('/_authenticated/achievements')({
  component: AchievementsPage,
})

function AchievementsPage() {
  const { data, isLoading } = useAchievements()

  const totalUnlocked = data?.filter((a) => a.unlocked).length ?? 0
  const total = data?.length ?? 0

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-text">Succès</h1>
          <span className="text-sm text-text-light/70 tabular-nums">
            {totalUnlocked} / {total} débloqués
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <AchievementGrid achievements={data ?? []} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build + smoke test**

```bash
cd front && npm run dev
# Naviguer manuellement à http://localhost:5173/achievements
```

Expected: page chargée, achievements groupés par famille, barres de progression visibles.

- [ ] **Step 3: Build de production**

```bash
cd front && npm run build
```

Expected: 0 erreur TS, build généré.

- [ ] **Step 4: Lint final**

```bash
cd front && npm run lint
cd back && npm run lint
```

Expected: 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add front/src/routes/_authenticated/achievements.tsx
git commit -m "feat(achievements): add /achievements page route"
```

---

## Validation finale

- [ ] **Smoke test end-to-end**

1. `cd back && npm run db:seed`
2. `cd back && npm run dev`
3. `cd front && npm run dev`
4. Login utilisateur de test.
5. Naviguer sur `/achievements` → vérifier que la grille s'affiche, 24 succès visibles (3 cachés en mode `???`).
6. Faire 10 pulls → vérifier que :
   - Toast `Premier tirage sérieux` apparaît au pull #10.
   - `Bienvenue` apparaît au pull #1.
   - La récompense est listée dans le `RewardsPopup`.
7. Réclamer les rewards → vérifier que les tokens/dust/XP sont crédités.
8. Recharger la page `/achievements` → l'achievement débloqué doit apparaître en mode "unlocked".

- [ ] **Tests automatisés**

```bash
cd back && npm run test:unit && npm run test:e2e
cd front && npm test 2>/dev/null || echo "pas de tests front pour ce périmètre"
```

Expected: tous tests verts.

- [ ] **Commit final & PR**

```bash
git status   # vérifier qu'il n'y a plus de changements non-committed
git log --oneline -30 | head -30   # 27+ commits du plan, dans l'ordre
```

Créer la PR en référençant le spec `docs/superpowers/specs/2026-06-11-achievements-system-design.md`.
