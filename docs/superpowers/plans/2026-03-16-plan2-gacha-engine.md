# Gachapon — Plan 2: Gacha Engine, Economy & Collection

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le moteur de gacha serveur-authoritative (tokens lazy, weighted random, pity, doublons/dust), les endpoints de collection, WebSocket pour push des résultats, et les pages frontend Play (machine à pince 3D R3F) + Collection.

**Architecture:** `EconomyDomain` (calcul token pur/sans IO), `GachaDomain` (orchestration transactionnelle via `postgresOrm.executeWithTransactionClient`). WebSocket via `@fastify/websocket`, connexions authentifiées en mémoire (`userId → ws`). Frontend : machine 3D avec primitives Three.js + animations `@react-spring/three`, révélation 2D overlay par rareté.

**Tech Stack:** Fastify 5 + `@fastify/websocket`, Prisma 7 (Card, UserCard, GachaPull), `three` + `@react-three/fiber` + `@react-three/drei` + `@react-spring/three`, TanStack Query (mutations/queries gacha + collection).

**Conventions importantes (Plan 1) :**
- Config : `pickFromDict + toCamelCase` → clés camelCase (ex `TOKEN_MAX_STOCK` → `tokenMaxStock`)
- Zod v4 : `import { z } from 'zod/v4'`
- IoC : `diContainer.register(key, resolver)` via `this.#reg(...)`
- Repositories : constructeur `({ postgresOrm }: IocContainer)`, accès via `postgresOrm.prisma`
- Routes : `FastifyPluginAsyncZod`, auth via `onRequest: [fastify.verifySessionCookie]`
- `PrimaTransactionClient` = `Omit<PostgresPrismaClient, ITXClientDenyList>` (voir `types/infra/orm/client.ts`)
- Tests e2e : `buildTestApp()` + `app.inject()`, vraie DB postgres docker `medisync-postgres`
- Linting : Biome (pas ESLint). `npm run lint` dans `back/`

---

## Chunk 1: Backend — Couche données

### Task 1: Seed script

**Files:**
- Create: `back/prisma/seed.ts`
- Modify: `back/package.json` (ajouter script `"db:seed"` et config `"prisma.seed"`)

- [ ] **Step 1: Écrire `back/prisma/seed.ts`**

```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CARDS = [
  // COMMON — dropWeight 40 chacune
  { name: 'Gobelin',    rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Rat',        rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Champignon', rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Squelette',  rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Slime',      rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Chauve-Souris', rarity: 'COMMON', dropWeight: 40, variant: null },
  { name: 'Lézard',     rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Crabe',      rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Guêpe',      rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Escargot',   rarity: 'COMMON',    dropWeight: 40, variant: null },
  // UNCOMMON — dropWeight 20 chacune
  { name: 'Chevalier',  rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Mage',       rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Archer',     rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Druide',     rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Paladin',    rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  // RARE — dropWeight 8 chacune
  { name: 'Dragon Vert', rarity: 'RARE',     dropWeight: 8,  variant: null },
  { name: 'Phénix',      rarity: 'RARE',     dropWeight: 8,  variant: null },
  { name: 'Liche',       rarity: 'RARE',     dropWeight: 8,  variant: null },
  // EPIC — dropWeight 3 chacune
  { name: 'Dragon Rouge', rarity: 'EPIC',    dropWeight: 3,  variant: null },
  { name: 'Titan de Fer', rarity: 'EPIC',    dropWeight: 3,  variant: null },
  // LEGENDARY — dropWeight 1
  { name: 'Azéros, Dieu-Guerrier', rarity: 'LEGENDARY', dropWeight: 1, variant: null },
  // Variants RARE (BRILLIANT = 15% du poids RARE, HOLOGRAPHIC = 5%)
  { name: 'Dragon Vert Brillant',  rarity: 'RARE', dropWeight: 1.2, variant: 'BRILLIANT' },
  { name: 'Phénix Holographique',  rarity: 'RARE', dropWeight: 0.4, variant: 'HOLOGRAPHIC' },
  // Variant LEGENDARY
  { name: 'Azéros Holographique',  rarity: 'LEGENDARY', dropWeight: 0.05, variant: 'HOLOGRAPHIC' },
] as const

async function main() {
  console.log('Seeding database…')

  // Nettoyage (ordre respectant les FK)
  await prisma.gachaPull.deleteMany()
  await prisma.userCard.deleteMany()
  await prisma.card.deleteMany()
  await prisma.cardSet.deleteMany()

  const set = await prisma.cardSet.create({
    data: {
      name: 'Alpha Warriors',
      description: 'Le premier set du Gachapon. 21 guerriers à collectionner, dont des variantes rares.',
      isActive: true,
    },
  })
  console.log(`Created CardSet: ${set.name} (${set.id})`)

  for (const card of CARDS) {
    const slug = card.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    await prisma.card.create({
      data: {
        setId: set.id,
        name: card.name,
        imageUrl: `/placeholder/${slug}.jpg`,
        rarity: card.rarity,
        variant: card.variant ?? null,
        dropWeight: card.dropWeight,
      },
    })
  }
  console.log(`Created ${CARDS.length} cards.`)
  console.log('Seed done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Ajouter le script dans `back/package.json`**

Ajouter dans `"scripts"` : `"db:seed": "tsx prisma/seed.ts"`

Ajouter au niveau racine du JSON :
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Lancer le seed pour vérifier**

```bash
cd back && npm run db:seed
```

Expected : `Seed done.` sans erreur. Vérifier dans psql :
```bash
docker exec medisync-postgres psql -U postgres gachapon_dev -c 'SELECT name, rarity, "dropWeight" FROM "Card" ORDER BY "dropWeight" DESC LIMIT 5;'
```

- [ ] **Step 4: Commit**

```bash
git add back/prisma/seed.ts back/package.json
git commit -m "chore: add prisma seed script (Alpha Warriors set + 24 cards)"
```

---

### Task 2: Repositories Card, UserCard, GachaPull

**Files:**
- Create: `back/src/main/types/infra/orm/repositories/card.repository.interface.ts`
- Create: `back/src/main/types/infra/orm/repositories/user-card.repository.interface.ts`
- Create: `back/src/main/types/infra/orm/repositories/gacha-pull.repository.interface.ts`
- Create: `back/src/main/types/domain/gacha/gacha.types.ts`
- Create: `back/src/main/infra/orm/repositories/card.repository.ts`
- Create: `back/src/main/infra/orm/repositories/user-card.repository.ts`
- Create: `back/src/main/infra/orm/repositories/gacha-pull.repository.ts`

- [ ] **Step 1: Types de domaine gacha (`back/src/main/types/domain/gacha/gacha.types.ts`)**

```typescript
import type { Card, CardRarity, CardSet, CardVariant, GachaPull, UserCard } from '../../../../generated/client'

export type CardEntity = Card
export type CardSetEntity = CardSet
export type UserCardEntity = UserCard
export type GachaPullEntity = GachaPull

export type CardWithSet = Card & { set: CardSet }
export type UserCardWithCard = UserCard & { card: CardWithSet }
export type GachaPullWithCard = GachaPull & { card: CardWithSet }

export const DUST_BY_RARITY: Record<CardRarity, number> = {
  COMMON:    5,
  UNCOMMON:  15,
  RARE:      50,
  EPIC:      150,
  LEGENDARY: 500,
}

export type PullResult = {
  pull:            GachaPullEntity
  card:            CardWithSet
  wasDuplicate:    boolean
  dustEarned:      number
  tokensRemaining: number
  pityCurrent:     number
}
```

- [ ] **Step 2: Interface `ICardRepository`**

`back/src/main/types/infra/orm/repositories/card.repository.interface.ts` :

```typescript
import type { CardEntity, CardSetEntity, CardWithSet } from '../../../domain/gacha/gacha.types'

export interface ICardRepository {
  findById(id: string): Promise<CardWithSet | null>
  findAllActive(): Promise<CardWithSet[]>
  findAll(filter?: { setId?: string; rarity?: string }): Promise<CardWithSet[]>
  findActiveSets(): Promise<CardSetEntity[]>
  findAllSets(): Promise<CardSetEntity[]>
  findSetById(id: string): Promise<CardSetEntity | null>
}
```

- [ ] **Step 3: Interface `IUserCardRepository`**

`back/src/main/types/infra/orm/repositories/user-card.repository.interface.ts` :

```typescript
import type { UserCardWithCard } from '../../../domain/gacha/gacha.types'

export interface IUserCardRepository {
  findByUser(userId: string): Promise<UserCardWithCard[]>
  /** Incrémente quantity (ou crée). Retourne si c'était un doublon. */
  upsert(userId: string, cardId: string): Promise<{ wasDuplicate: boolean }>
  /** Décrémente quantity. Supprime si quantity devient 0. */
  decrementOrDelete(userId: string, cardId: string): Promise<{ quantityLeft: number }>
}
```

- [ ] **Step 4: Interface `IGachaPullRepository`**

`back/src/main/types/infra/orm/repositories/gacha-pull.repository.interface.ts` :

```typescript
import type { GachaPullWithCard } from '../../../domain/gacha/gacha.types'

export interface IGachaPullRepository {
  create(data: {
    userId: string
    cardId: string
    wasDuplicate: boolean
    dustEarned: number
  }): Promise<{ id: string; pulledAt: Date; wasDuplicate: boolean; dustEarned: number }>

  findByUser(
    userId: string,
    pagination: { skip: number; take: number },
  ): Promise<{ pulls: GachaPullWithCard[]; total: number }>
}
```

- [ ] **Step 5: Implémenter `CardRepository`**

`back/src/main/infra/orm/repositories/card.repository.ts` :

```typescript
import type { IocContainer } from '../../../types/application/ioc'
import type { CardWithSet, CardSetEntity } from '../../../types/domain/gacha/gacha.types'
import type { ICardRepository } from '../../../types/infra/orm/repositories/card.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const WITH_SET = { set: true } as const

export class CardRepository implements ICardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<CardWithSet | null> {
    return this.#prisma.card.findUnique({ where: { id }, include: WITH_SET }) as Promise<CardWithSet | null>
  }

  findAllActive(): Promise<CardWithSet[]> {
    return this.#prisma.card.findMany({
      where: { set: { isActive: true } },
      include: WITH_SET,
    }) as Promise<CardWithSet[]>
  }

  findAll(filter?: { setId?: string; rarity?: string }): Promise<CardWithSet[]> {
    return this.#prisma.card.findMany({
      where: {
        ...(filter?.setId ? { setId: filter.setId } : {}),
        ...(filter?.rarity ? { rarity: filter.rarity as any } : {}),
      },
      include: WITH_SET,
      orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
    }) as Promise<CardWithSet[]>
  }

  findActiveSets(): Promise<CardSetEntity[]> {
    return this.#prisma.cardSet.findMany({ where: { isActive: true } })
  }

  findAllSets(): Promise<CardSetEntity[]> {
    return this.#prisma.cardSet.findMany({ orderBy: { name: 'asc' } })
  }

  findSetById(id: string): Promise<CardSetEntity | null> {
    return this.#prisma.cardSet.findUnique({ where: { id } })
  }
}
```

- [ ] **Step 6: Implémenter `UserCardRepository`**

`back/src/main/infra/orm/repositories/user-card.repository.ts` :

```typescript
import type { IocContainer } from '../../../types/application/ioc'
import type { UserCardWithCard } from '../../../types/domain/gacha/gacha.types'
import type { IUserCardRepository } from '../../../types/infra/orm/repositories/user-card.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserCardRepository implements IUserCardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByUser(userId: string): Promise<UserCardWithCard[]> {
    return this.#prisma.userCard.findMany({
      where: { userId },
      include: { card: { include: { set: true } } },
      orderBy: { obtainedAt: 'desc' },
    }) as Promise<UserCardWithCard[]>
  }

  async upsert(userId: string, cardId: string): Promise<{ wasDuplicate: boolean }> {
    const existing = await this.#prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    })
    if (existing) {
      await this.#prisma.userCard.update({
        where: { userId_cardId: { userId, cardId } },
        data: { quantity: { increment: 1 } },
      })
      return { wasDuplicate: true }
    }
    await this.#prisma.userCard.create({
      data: { userId, cardId, quantity: 1, obtainedAt: new Date() },
    })
    return { wasDuplicate: false }
  }

  async decrementOrDelete(userId: string, cardId: string): Promise<{ quantityLeft: number }> {
    const uc = await this.#prisma.userCard.findUniqueOrThrow({
      where: { userId_cardId: { userId, cardId } },
    })
    if (uc.quantity <= 1) {
      await this.#prisma.userCard.delete({ where: { userId_cardId: { userId, cardId } } })
      return { quantityLeft: 0 }
    }
    const updated = await this.#prisma.userCard.update({
      where: { userId_cardId: { userId, cardId } },
      data: { quantity: { decrement: 1 } },
    })
    return { quantityLeft: updated.quantity }
  }
}
```

- [ ] **Step 7: Implémenter `GachaPullRepository`**

`back/src/main/infra/orm/repositories/gacha-pull.repository.ts` :

```typescript
import type { IocContainer } from '../../../types/application/ioc'
import type { GachaPullWithCard } from '../../../types/domain/gacha/gacha.types'
import type { IGachaPullRepository } from '../../../types/infra/orm/repositories/gacha-pull.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class GachaPullRepository implements IGachaPullRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async create(data: {
    userId: string
    cardId: string
    wasDuplicate: boolean
    dustEarned: number
  }) {
    return this.#prisma.gachaPull.create({ data })
  }

  async findByUser(userId: string, pagination: { skip: number; take: number }) {
    const [pulls, total] = await Promise.all([
      this.#prisma.gachaPull.findMany({
        where: { userId },
        include: { card: { include: { set: true } } },
        orderBy: { pulledAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.#prisma.gachaPull.count({ where: { userId } }),
    ])
    return { pulls: pulls as GachaPullWithCard[], total }
  }
}
```

- [ ] **Step 8: Vérifier la compilation**

```bash
cd back && npx tsc --noEmit 2>&1 | head -30
```

Expected : 0 erreurs (ou uniquement des erreurs liées à l'absence d'enregistrement IoC, réglées en Task 4).

- [ ] **Step 9: Commit**

```bash
git add back/src/main/types/infra/orm/repositories/card.repository.interface.ts \
        back/src/main/types/infra/orm/repositories/user-card.repository.interface.ts \
        back/src/main/types/infra/orm/repositories/gacha-pull.repository.interface.ts \
        back/src/main/types/domain/gacha/gacha.types.ts \
        back/src/main/infra/orm/repositories/card.repository.ts \
        back/src/main/infra/orm/repositories/user-card.repository.ts \
        back/src/main/infra/orm/repositories/gacha-pull.repository.ts
git commit -m "feat: add card/user-card/gacha-pull repositories"
```

---

### Task 3: Economy domain (calcul lazy des tokens)

**Files:**
- Create: `back/src/main/types/domain/economy/economy.types.ts`
- Create: `back/src/main/domain/economy/economy.domain.ts`
- Create: `back/src/test/unit/economy.domain.test.ts`

- [ ] **Step 1: Écrire le test unitaire (fail first)**

`back/src/test/unit/economy.domain.test.ts` :

```typescript
import { describe, expect, it } from '@jest/globals'
import { calculateTokens } from '../../main/domain/economy/economy.domain'

const INTERVAL = 4  // heures
const MAX = 5

describe('calculateTokens', () => {
  it('retourne 0 tokens et nextTokenAt = maintenant + 4h si lastTokenAt null et tokens 0', () => {
    const before = Date.now()
    const result = calculateTokens(null, 0, INTERVAL, MAX)
    const after = Date.now()
    expect(result.tokens).toBe(0)
    expect(result.newLastTokenAt).not.toBeNull()
    // newLastTokenAt devrait être ~= maintenant (point de départ)
    expect(result.newLastTokenAt!.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.newLastTokenAt!.getTime()).toBeLessThanOrEqual(after)
    // nextTokenAt = maintenant + 4h
    expect(result.nextTokenAt!.getTime()).toBeCloseTo(before + INTERVAL * 3600 * 1000, -3)
  })

  it('accorde 1 token après exactement 4h', () => {
    const lastTokenAt = new Date(Date.now() - 4 * 3600 * 1000)
    const result = calculateTokens(lastTokenAt, 2, INTERVAL, MAX)
    expect(result.tokens).toBe(3)
    expect(result.newLastTokenAt!.getTime()).toBeCloseTo(lastTokenAt.getTime() + 4 * 3600 * 1000, -3)
  })

  it('accorde 2 tokens après 9h (2×4h)', () => {
    const lastTokenAt = new Date(Date.now() - 9 * 3600 * 1000)
    const result = calculateTokens(lastTokenAt, 1, INTERVAL, MAX)
    expect(result.tokens).toBe(3)
  })

  it('ne dépasse pas maxStock', () => {
    const lastTokenAt = new Date(Date.now() - 20 * 3600 * 1000)
    const result = calculateTokens(lastTokenAt, 0, INTERVAL, MAX)
    expect(result.tokens).toBe(5)
    expect(result.nextTokenAt).toBeNull()
  })

  it('nextTokenAt est null si tokens === maxStock', () => {
    const lastTokenAt = new Date(Date.now() - 1000)
    const result = calculateTokens(lastTokenAt, 5, INTERVAL, MAX)
    expect(result.tokens).toBe(5)
    expect(result.nextTokenAt).toBeNull()
  })

  it('ne modifie pas lastTokenAt si aucun token gagné', () => {
    const lastTokenAt = new Date(Date.now() - 1 * 3600 * 1000) // 1h écoulée, pas encore 4h
    const result = calculateTokens(lastTokenAt, 2, INTERVAL, MAX)
    expect(result.tokens).toBe(2)
    expect(result.newLastTokenAt!.getTime()).toBeCloseTo(lastTokenAt.getTime(), -3)
  })
})
```

- [ ] **Step 2: Vérifier que le test échoue**

```bash
cd back && npx jest src/test/unit/economy.domain.test.ts --no-coverage 2>&1 | tail -20
```

Expected : FAIL avec "Cannot find module"

- [ ] **Step 3: Implémenter `calculateTokens` et `EconomyDomain`**

`back/src/main/domain/economy/economy.domain.ts` :

```typescript
export type TokenState = {
  tokens: number
  newLastTokenAt: Date | null
  nextTokenAt: Date | null
}

/**
 * Calcul lazy des tokens accumulés depuis lastTokenAt.
 * Si lastTokenAt est null : on initialise le clock à maintenant (0 tokens gagnés, regen commence).
 * Ne fait aucun IO — pur calcul.
 */
export function calculateTokens(
  lastTokenAt: Date | null,
  currentTokens: number,
  regenIntervalHours: number,
  maxStock: number,
): TokenState {
  // Déjà au max → pas de regen, pas de nextTokenAt
  if (currentTokens >= maxStock) {
    return { tokens: maxStock, newLastTokenAt: lastTokenAt, nextTokenAt: null }
  }

  // Null = premier accès, on démarre le clock maintenant
  const ref = lastTokenAt ?? new Date()
  if (!lastTokenAt) {
    const nextTokenAt = new Date(ref.getTime() + regenIntervalHours * 3600 * 1000)
    return { tokens: currentTokens, newLastTokenAt: ref, nextTokenAt }
  }

  const now = Date.now()
  const msPerToken = regenIntervalHours * 3600 * 1000
  const elapsed = now - ref.getTime()
  const gained = Math.floor(elapsed / msPerToken)

  if (gained <= 0) {
    const nextTokenAt = new Date(ref.getTime() + msPerToken)
    return { tokens: currentTokens, newLastTokenAt: ref, nextTokenAt }
  }

  const newTokens = Math.min(currentTokens + gained, maxStock)
  const actualGained = newTokens - currentTokens
  const newLastTokenAt = new Date(ref.getTime() + actualGained * msPerToken)

  const nextTokenAt = newTokens >= maxStock
    ? null
    : new Date(newLastTokenAt.getTime() + msPerToken)

  return { tokens: newTokens, newLastTokenAt, nextTokenAt }
}
```

- [ ] **Step 4: Lancer les tests**

```bash
cd back && npx jest src/test/unit/economy.domain.test.ts --no-coverage 2>&1 | tail -20
```

Expected : PASS, 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add back/src/main/domain/economy/economy.domain.ts \
        back/src/test/unit/economy.domain.test.ts
git commit -m "feat: economy domain — calculateTokens (lazy token regen)"
```

---

### Task 4: Config + IoC + Types

**Files:**
- Modify: `back/src/main/application/config.ts`
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/.env` (ajouter les nouvelles vars)
- Modify: `back/.env.example` (si existe)

- [ ] **Step 1: Ajouter les clés de config**

Dans `back/src/main/application/config.ts` :

1. Ajouter dans `configSchema` (après `tokenRegenIntervalHours`) :
```typescript
tokenMaxStock: z
  .string()
  .default('5')
  .transform((v) => Number.parseInt(v, 10)),
pityThreshold: z
  .string()
  .default('100')
  .transform((v) => Number.parseInt(v, 10)),
```

2. Ajouter dans `envVarNames` :
```typescript
'TOKEN_MAX_STOCK',
'PITY_THRESHOLD',
```

- [ ] **Step 2: Mettre à jour `IocContainer` interface**

Dans `back/src/main/types/application/ioc.ts`, ajouter les imports et les champs :

```typescript
import type { CardRepository } from '../../infra/orm/repositories/card.repository'
import type { GachaPullRepository } from '../../infra/orm/repositories/gacha-pull.repository'
import type { UserCardRepository } from '../../infra/orm/repositories/user-card.repository'
import type { GachaDomainInterface } from '../domain/gacha/gacha.domain.interface'

// Dans l'interface IocContainer, ajouter :
readonly cardRepository: CardRepository
readonly userCardRepository: UserCardRepository
readonly gachaPullRepository: GachaPullRepository
readonly gachaDomain: GachaDomainInterface
```

Note : on importe les classes concrètes pour les repos (comme pour `ApiKeyRepository` et `OAuthAccountRepository` existants).

- [ ] **Step 3: Créer l'interface du GachaDomain**

`back/src/main/types/domain/gacha/gacha.domain.interface.ts` :

```typescript
import type { PullResult } from './gacha.types'

export interface GachaDomainInterface {
  pull(userId: string): Promise<PullResult>
}
```

- [ ] **Step 4: Enregistrer dans le container Awilix**

Dans `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` :

1. Ajouter les imports :
```typescript
import { GachaDomain } from '../../../domain/gacha/gacha.domain'
import { CardRepository } from '../../../infra/orm/repositories/card.repository'
import { GachaPullRepository } from '../../../infra/orm/repositories/gacha-pull.repository'
import { UserCardRepository } from '../../../infra/orm/repositories/user-card.repository'
```

2. Dans le constructeur (après l'enregistrement de `oauthDomain`) :
```typescript
this.#reg('cardRepository', asClass(CardRepository).singleton())
this.#reg('userCardRepository', asClass(UserCardRepository).singleton())
this.#reg('gachaPullRepository', asClass(GachaPullRepository).singleton())
this.#reg('gachaDomain', asClass(GachaDomain).singleton())
```

Note : `GachaDomain` sera créé en Task 5. Pour que TypeScript compile en attendant, créer un placeholder :

`back/src/main/domain/gacha/gacha.domain.ts` (placeholder) :
```typescript
import type { IocContainer } from '../../types/application/ioc'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import type { PullResult } from '../../types/domain/gacha/gacha.types'

export class GachaDomain implements GachaDomainInterface {
  constructor(_: IocContainer) {}
  pull(_userId: string): Promise<PullResult> {
    throw new Error('Not implemented yet')
  }
}
```

- [ ] **Step 5: Ajouter les vars dans `.env` et `.env.example`**

Ajouter dans `back/.env` (gitignored, dev local) :
```
TOKEN_MAX_STOCK=5
PITY_THRESHOLD=100
```

Ajouter également dans `back/.env.example` si ce fichier existe (versionné).

- [ ] **Step 6: Vérifier la compilation**

```bash
cd back && npx tsc --noEmit 2>&1 | head -30
```

Expected : 0 erreurs TypeScript.

- [ ] **Step 7: Commit**

```bash
git add back/src/main/application/config.ts \
        back/src/main/types/application/ioc.ts \
        back/src/main/types/domain/gacha/gacha.domain.interface.ts \
        back/src/main/application/ioc/awilix/awilix-ioc-container.ts \
        back/src/main/domain/gacha/gacha.domain.ts
# Note: back/.env est gitignored — ne pas le committer
git commit -m "feat: config + IoC — tokenMaxStock, pityThreshold, gacha services"
```

---

## Chunk 2: Backend — API

### Task 5: Gacha domain (tirage atomique)

**Files:**
- Modify: `back/src/main/domain/gacha/gacha.domain.ts` (remplacer le placeholder)
- Create: `back/src/test/unit/gacha.domain.test.ts`

Le GachaDomain réalise le tirage complet dans une transaction Prisma sérialisée.
Il accède directement au `PrimaTransactionClient` pour garantir l'atomicité — les repositories normaux ne conviennent pas ici car ils opèrent hors transaction.

- [ ] **Step 1: Écrire les tests unitaires (fail first)**

`back/src/test/unit/gacha.domain.test.ts` :

```typescript
import { describe, expect, it } from '@jest/globals'
import { pickWeightedRandom } from '../../main/domain/gacha/gacha.domain'
import type { CardWithSet } from '../../main/types/domain/gacha/gacha.types'

function makeCard(name: string, weight: number, rarity = 'COMMON'): CardWithSet {
  return {
    id: name,
    name,
    rarity: rarity as any,
    dropWeight: weight,
    variant: null,
    imageUrl: '',
    setId: 'set1',
    createdAt: new Date(),
    set: { id: 'set1', name: 'Test', description: null, coverImage: null, isActive: true, createdAt: new Date() },
  }
}

describe('pickWeightedRandom', () => {
  it('retourne toujours une carte de la liste', () => {
    const cards = [makeCard('A', 10), makeCard('B', 5), makeCard('C', 1)]
    for (let i = 0; i < 100; i++) {
      const result = pickWeightedRandom(cards)
      expect(['A', 'B', 'C']).toContain(result.name)
    }
  })

  it('retourne la seule carte si liste de taille 1', () => {
    const cards = [makeCard('Solo', 99)]
    expect(pickWeightedRandom(cards).name).toBe('Solo')
  })

  it('respecte approximativement les poids (test statistique grossier)', () => {
    const cards = [makeCard('Heavy', 90), makeCard('Light', 10)]
    let heavyCount = 0
    for (let i = 0; i < 1000; i++) {
      if (pickWeightedRandom(cards).name === 'Heavy') heavyCount++
    }
    // ~90% avec une tolérance de ±10%
    expect(heavyCount).toBeGreaterThan(750)
    expect(heavyCount).toBeLessThan(950)
  })

  it('throw si liste vide', () => {
    expect(() => pickWeightedRandom([])).toThrow()
  })
})
```

- [ ] **Step 2: Run test (doit échouer)**

```bash
cd back && npx jest src/test/unit/gacha.domain.test.ts --no-coverage 2>&1 | tail -15
```

Expected : FAIL "Cannot find module 'pickWeightedRandom'"

- [ ] **Step 3: Implémenter `gacha.domain.ts`**

`back/src/main/domain/gacha/gacha.domain.ts` :

```typescript
import Boom from '@hapi/boom'

import { calculateTokens } from '../economy/economy.domain'
import type { IocContainer } from '../../types/application/ioc'
import type { PostgresORMInterface } from '../../types/infra/orm/client'
import type { Config } from '../../application/config'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import { DUST_BY_RARITY } from '../../types/domain/gacha/gacha.types'
import type { CardWithSet, PullResult } from '../../types/domain/gacha/gacha.types'

export function pickWeightedRandom(cards: CardWithSet[]): CardWithSet {
  if (cards.length === 0) throw new Error('No cards to pick from')
  const total = cards.reduce((sum, c) => sum + c.dropWeight, 0)
  let roll = Math.random() * total
  for (const card of cards) {
    roll -= card.dropWeight
    if (roll <= 0) return card
  }
  return cards[cards.length - 1]
}

export class GachaDomain implements GachaDomainInterface {
  readonly #postgresOrm: PostgresORMInterface
  readonly #config: Config

  constructor({ postgresOrm, config }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#config = config
  }

  async pull(userId: string): Promise<PullResult> {
    return this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        // 1. Lire l'utilisateur
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

        // 2. Calculer les tokens
        const { tokens, newLastTokenAt } = calculateTokens(
          user.lastTokenAt,
          user.tokens,
          this.#config.tokenRegenIntervalHours,
          this.#config.tokenMaxStock,
        )

        if (tokens < 1) {
          throw Boom.paymentRequired('Not enough tokens')
        }

        // 3. Charger les cartes (pity : forcer LEGENDARY si seuil atteint)
        const activeCards = await tx.card.findMany({
          where: {
            set: { isActive: true },
            ...(user.pityCurrent >= this.#config.pityThreshold
              ? { rarity: 'LEGENDARY' }
              : {}),
          },
          include: { set: true },
        }) as CardWithSet[]

        if (activeCards.length === 0) {
          throw Boom.internal('No active cards in any set')
        }

        // 4. Tirage pondéré
        const card = pickWeightedRandom(activeCards)

        // 5. Doublon ?
        const existing = await tx.userCard.findUnique({
          where: { userId_cardId: { userId, cardId: card.id } },
        })
        const wasDuplicate = existing !== null
        const dustEarned = wasDuplicate ? DUST_BY_RARITY[card.rarity] : 0

        // 6. Upsert UserCard
        if (existing) {
          await tx.userCard.update({
            where: { userId_cardId: { userId, cardId: card.id } },
            data: { quantity: { increment: 1 } },
          })
        } else {
          await tx.userCard.create({
            data: { userId, cardId: card.id, quantity: 1, obtainedAt: new Date() },
          })
        }

        // 7. Créer GachaPull
        const pull = await tx.gachaPull.create({
          data: { userId, cardId: card.id, wasDuplicate, dustEarned },
        })

        // 8. Mettre à jour l'utilisateur
        const isLegendary = card.rarity === 'LEGENDARY'
        const newPityCurrent = isLegendary ? 0 : user.pityCurrent + 1
        await tx.user.update({
          where: { id: userId },
          data: {
            tokens: tokens - 1,
            dust: { increment: dustEarned },
            pityCurrent: newPityCurrent,
            lastTokenAt: newLastTokenAt,
          },
        })

        return {
          pull,
          card,
          wasDuplicate,
          dustEarned,
          tokensRemaining: tokens - 1,
          pityCurrent: newPityCurrent,
        }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )
  }
}
```

- [ ] **Step 4: Lancer les tests**

```bash
cd back && npx jest src/test/unit/gacha.domain.test.ts --no-coverage 2>&1 | tail -15
```

Expected : PASS, 4 tests passing.

- [ ] **Step 5: Vérifier compilation complète**

```bash
cd back && npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/domain/gacha/gacha.domain.ts \
        back/src/test/unit/gacha.domain.test.ts
git commit -m "feat: gacha domain — weighted random pull with pity + duplicate dust"
```

---

### Task 6: Gacha routes (tokens + pulls)

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/gacha/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`
- Create: `back/src/test/e2e/gacha/pull.test.ts`

Les routes sont protégées par `onRequest: [fastify.verifySessionCookie]`.
La route `POST /pulls` appelle `gachaDomain.pull()` puis notifie le WebSocket (Task 8 le branchera — pour l'instant, log "WS: TODO").

- [ ] **Step 1: Écrire le test e2e (fail first)**

`back/src/test/e2e/gacha/pull.test.ts` :

```typescript
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Gacha routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const email = `gacha${suffix}@test.com`
  const password = 'Password123!'
  const username = `gachauser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()

    // Register + get cookies
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)
    cookies = res.headers['set-cookie'] as string

    // Give the user 3 tokens directly via DB
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 3, lastTokenAt: new Date() },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /tokens/balance — retourne le solde', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tokens/balance',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('tokens')
    expect(body).toHaveProperty('maxStock')
    expect(body).toHaveProperty('nextTokenAt')
  })

  it('POST /pulls — retourne la carte tirée', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('card')
    expect(body.card).toHaveProperty('name')
    expect(body.card).toHaveProperty('rarity')
    expect(body).toHaveProperty('wasDuplicate')
    expect(body).toHaveProperty('dustEarned')
    expect(body).toHaveProperty('tokensRemaining')
  })

  it('POST /pulls — sans token → 402', async () => {
    // Vider les tokens
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 0, lastTokenAt: new Date() },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('GET /pulls/history — retourne le historique', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/history',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('pulls')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.pulls)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test (doit échouer avec 404)**

```bash
cd back && npx jest src/test/e2e/gacha/pull.test.ts --no-coverage 2>&1 | tail -20
```

Expected : FAIL — routes non encore créées.

- [ ] **Step 3: Créer les routes gacha**

`back/src/main/interfaces/http/fastify/routes/gacha/index.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { calculateTokens } from '../../../../../domain/economy/economy.domain'

export const gachaRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { gachaDomain, userRepository, config, gachaPullRepository } = fastify.iocContainer

  // POST /pulls — consommer 1 token et tirer une carte
  fastify.post(
    '/pulls',
    { onRequest: [fastify.verifySessionCookie] },
    async (request, reply) => {
      const result = await gachaDomain.pull(request.user.userID)

      // TODO Task 8: notifier le WS ici
      // wsManager.notify(request.user.userID, { type: 'pull:result', ...result })

      return reply.status(201).send({
        card: {
          id: result.card.id,
          name: result.card.name,
          imageUrl: result.card.imageUrl,
          rarity: result.card.rarity,
          variant: result.card.variant,
          set: { id: result.card.set.id, name: result.card.set.name },
        },
        wasDuplicate: result.wasDuplicate,
        dustEarned: result.dustEarned,
        tokensRemaining: result.tokensRemaining,
        pityCurrent: result.pityCurrent,
      })
    },
  )

  // GET /tokens/balance — solde de tokens (calcul lazy, sans écriture en DB)
  fastify.get(
    '/tokens/balance',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const user = await userRepository.findById(request.user.userID)
      if (!user) throw new Error('User not found')

      const { tokens, nextTokenAt } = calculateTokens(
        user.lastTokenAt,
        user.tokens,
        config.tokenRegenIntervalHours,
        config.tokenMaxStock,
      )

      return {
        tokens,
        maxStock: config.tokenMaxStock,
        nextTokenAt: nextTokenAt?.toISOString() ?? null,
      }
    },
  )

  // GET /tokens/next-at — quand le prochain token sera prêt
  fastify.get(
    '/tokens/next-at',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const user = await userRepository.findById(request.user.userID)
      if (!user) throw new Error('User not found')

      const { tokens, nextTokenAt } = calculateTokens(
        user.lastTokenAt,
        user.tokens,
        config.tokenRegenIntervalHours,
        config.tokenMaxStock,
      )

      return {
        nextTokenAt: nextTokenAt?.toISOString() ?? null,
        tokens,
      }
    },
  )

  // GET /pulls/history — historique paginé
  fastify.get(
    '/pulls/history',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: z.object({
          page: z.string().optional().default('1').transform(Number),
          limit: z.string().optional().default('20').transform(Number),
        }),
      },
    },
    async (request) => {
      const { page, limit } = request.query
      const skip = (page - 1) * limit
      const { pulls, total } = await gachaPullRepository.findByUser(
        request.user.userID,
        { skip, take: limit },
      )

      return {
        pulls: pulls.map((p) => ({
          id: p.id,
          pulledAt: p.pulledAt.toISOString(),
          wasDuplicate: p.wasDuplicate,
          dustEarned: p.dustEarned,
          card: {
            id: p.card.id,
            name: p.card.name,
            imageUrl: p.card.imageUrl,
            rarity: p.card.rarity,
            variant: p.card.variant,
          },
        })),
        total,
        page,
        limit,
      }
    },
  )
}
```

- [ ] **Step 4: Enregistrer les routes dans `routes/index.ts`**

Dans `back/src/main/interfaces/http/fastify/routes/index.ts`, ajouter :

```typescript
import { gachaRouter } from './gacha'

// Dans la fonction de registration :
await fastify.register(gachaRouter)
```

(Les routes gacha n'ont pas de prefix fixe car `/pulls`, `/tokens/*` sont au niveau racine.)

- [ ] **Step 5: Lancer les tests**

```bash
cd back && npx jest src/test/e2e/gacha/pull.test.ts --no-coverage 2>&1 | tail -20
```

Expected : PASS. Si des cartes seed manquent, relancer `npm run db:seed` d'abord.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/gacha/index.ts \
        back/src/main/interfaces/http/fastify/routes/index.ts \
        back/src/test/e2e/gacha/pull.test.ts
git commit -m "feat: gacha routes — POST /pulls, GET /tokens/balance, GET /tokens/next-at, GET /pulls/history"
```

---

### Task 7: Collection routes

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/collection/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`
- Create: `back/src/test/e2e/collection/collection.test.ts`

- [ ] **Step 1: Écrire le test e2e (fail first)**

`back/src/test/e2e/collection/collection.test.ts` :

```typescript
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Collection routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `coll${suffix}`,
        email: `coll${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
    userId = res.json().id

    // Donner 5 tokens pour pouvoir tirer
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { tokens: 5, lastTokenAt: new Date() },
    })
  })

  afterAll(() => app.close())

  it('GET /sets — liste les sets actifs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/sets',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.sets)).toBe(true)
  })

  it('GET /cards — liste les cartes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cards',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.cards)).toBe(true)
    expect(body.cards.length).toBeGreaterThan(0)
  })

  it('GET /cards?rarity=LEGENDARY — filtre par rareté', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cards?rarity=LEGENDARY',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards.every((c: any) => c.rarity === 'LEGENDARY')).toBe(true)
  })

  it('GET /users/:id/collection — collection vide au départ', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/collection`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.cards)).toBe(true)
  })

  it('POST /collection/recycle — nécessite quantity > 0', async () => {
    // D'abord faire un tirage pour obtenir une carte
    await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })

    // Récupérer la collection
    const collRes = await app.inject({
      method: 'GET',
      url: `/users/${userId}/collection`,
      headers: { cookie: cookies },
    })
    const coll = collRes.json()
    if (coll.cards.length === 0) return // pas de carte à recycler

    const cardId = coll.cards[0].card.id
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId },
    })
    expect([200, 400]).toContain(res.statusCode)
  })
})
```

- [ ] **Step 2: Créer les routes de collection**

`back/src/main/interfaces/http/fastify/routes/collection/index.ts` :

```typescript
import Boom from '@hapi/boom'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { DUST_BY_RARITY } from '../../../../../types/domain/gacha/gacha.types'

export const collectionRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { cardRepository, userCardRepository, userRepository } = fastify.iocContainer

  // GET /sets — liste les sets (actifs)
  fastify.get(
    '/sets',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const sets = await cardRepository.findActiveSets()
      return { sets }
    },
  )

  // GET /cards — liste toutes les cartes (filtrables)
  fastify.get(
    '/cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: z.object({
          setId: z.string().optional(),
          rarity: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const cards = await cardRepository.findAll(request.query)
      return {
        cards: cards.map((c) => ({
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl,
          rarity: c.rarity,
          variant: c.variant,
          dropWeight: c.dropWeight,
          set: { id: c.set.id, name: c.set.name },
        })),
      }
    },
  )

  // GET /cards/:id — détail d'une carte
  fastify.get(
    '/cards/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) throw Boom.notFound('Card not found')
      return card
    },
  )

  // GET /users/:id/collection — collection d'un utilisateur
  fastify.get(
    '/users/:id/collection',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const user = await userRepository.findById(request.params.id)
      if (!user) throw Boom.notFound('User not found')

      const userCards = await userCardRepository.findByUser(request.params.id)
      return {
        cards: userCards.map((uc) => ({
          card: {
            id: uc.card.id,
            name: uc.card.name,
            imageUrl: uc.card.imageUrl,
            rarity: uc.card.rarity,
            variant: uc.card.variant,
            set: { id: uc.card.set.id, name: uc.card.set.name },
          },
          quantity: uc.quantity,
          obtainedAt: uc.obtainedAt.toISOString(),
        })),
      }
    },
  )

  // POST /collection/recycle — recycler une carte en dust
  fastify.post(
    '/collection/recycle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { body: z.object({ cardId: z.string().uuid() }) },
    },
    async (request) => {
      const userId = request.user.userID
      const { cardId } = request.body

      const card = await cardRepository.findById(cardId)
      if (!card) throw Boom.notFound('Card not found')

      const userCard = await userCardRepository.findByUser(userId)
      const owned = userCard.find((uc) => uc.card.id === cardId)
      if (!owned || owned.quantity < 1) {
        throw Boom.badRequest('You do not own this card')
      }

      const dustEarned = DUST_BY_RARITY[card.rarity]
      await userCardRepository.decrementOrDelete(userId, cardId)

      // Incrémenter dust atomiquement
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.update({
        where: { id: userId },
        data: { dust: { increment: dustEarned } },
      })

      return { dustEarned, newDustTotal: user.dust }
    },
  )
}
```

Note : la route `/collection/recycle` utilise `postgresOrm.prisma` directement pour l'incrément atomique. C'est acceptable pour cette opération simple sans transaction multi-étapes.

- [ ] **Step 3: Enregistrer les routes**

Dans `back/src/main/interfaces/http/fastify/routes/index.ts`, ajouter :

```typescript
import { collectionRouter } from './collection'

await fastify.register(collectionRouter)
```

- [ ] **Step 4: Ajouter `findByUser` sur `UserCardRepository` (manquant en interface)**

Vérifier que `IUserCardRepository` expose bien `findByUser` — c'est déjà le cas (Task 2). Vérifier aussi que `UserCardRepository` implémente `findByUser` avec l'include correct.

- [ ] **Step 5: Run les tests**

```bash
cd back && npx jest src/test/e2e/collection/collection.test.ts --no-coverage 2>&1 | tail -25
```

Expected : PASS. Relancer le seed si nécessaire : `npm run db:seed`.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/collection/index.ts \
        back/src/main/interfaces/http/fastify/routes/index.ts \
        back/src/test/e2e/collection/collection.test.ts
git commit -m "feat: collection routes — sets, cards, user collection, recycle"
```

---

### Task 8: WebSocket plugin + push pull:result

**Files:**
- Create: `back/src/main/interfaces/ws/ws-manager.ts`
- Create: `back/src/main/interfaces/http/fastify/plugins/websocket.plugin.ts`
- Modify: `back/src/main/interfaces/http/fastify/plugins/index.ts` (enregistrer le plugin WS parmi les autres plugins)
- Create: `back/src/main/interfaces/http/fastify/routes/ws/index.ts` (route `/ws`)
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts` (enregistrer la route WS)
- Modify: `back/src/main/interfaces/http/fastify/routes/gacha/index.ts` (brancher le push WS)
- Modify: `back/package.json` (ajouter `@fastify/websocket`)

Installer `@fastify/websocket@^9.0.0` (compatible Fastify 5).

**Architecture WS** : `@fastify/websocket` est enregistré dans `plugins/index.ts` (comme tous les plugins). La route `/ws` est dans `routes/ws/index.ts` (comme toutes les routes). Le WsManager est un singleton de process (`ws-manager.ts`).

- [ ] **Step 1: Installer le package**

```bash
cd back && npm install @fastify/websocket@^9.0.0
```

- [ ] **Step 2: Créer le WsManager**

`back/src/main/interfaces/ws/ws-manager.ts` :

```typescript
import type { WebSocket } from '@fastify/websocket'

type WsEvent = {
  type: 'pull:result'
  card: {
    id: string
    name: string
    imageUrl: string
    rarity: string
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

class WsManager {
  readonly #connections = new Map<string, WebSocket>()

  register(userId: string, ws: WebSocket): void {
    this.#connections.set(userId, ws)
    ws.on('close', () => this.#connections.delete(userId))
  }

  notify(userId: string, event: WsEvent): void {
    const ws = this.#connections.get(userId)
    if (ws?.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(event))
    }
  }

  get size(): number {
    return this.#connections.size
  }
}

// Singleton partagé (process unique — pour multi-instance, utiliser Redis pub/sub)
export const wsManager = new WsManager()
```

- [ ] **Step 3: Créer le plugin WebSocket**

`back/src/main/interfaces/http/fastify/plugins/websocket.plugin.ts` :

```typescript
import websocket from '@fastify/websocket'
import type { FastifyPluginAsync } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

const websocketPlugin: FastifyPluginAsync = fastifyPlugin(async (fastify) => {
  await fastify.register(websocket)
})

export { websocketPlugin }
```

- [ ] **Step 4: Enregistrer dans `plugins/index.ts`**

Dans `back/src/main/interfaces/http/fastify/plugins/index.ts`, ajouter l'import et l'enregistrement **avant** les autres plugins (doit être enregistré avant les routes WS) :

```typescript
import { websocketPlugin } from './websocket.plugin'

// Dans la fonction plugins, après registerPlugin(fastify, 'redis', redisPlugin) :
await registerPlugin(fastify, 'websocket', websocketPlugin)
```

- [ ] **Step 5: Créer la route WS**

`back/src/main/interfaces/http/fastify/routes/ws/index.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { wsManager } from '../../../../../ws/ws-manager'

export const wsRouter: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/ws',
    { websocket: true },
    async (socket, request) => {
      try {
        await fastify.verifySessionCookie(request)
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        socket.close()
        return
      }

      const userId = request.user.userID
      wsManager.register(userId, socket)
      socket.send(JSON.stringify({ type: 'connected', userId }))
    },
  )
}
```

Le plugin WS (`@fastify/websocket`) doit être enregistré avant cette route — ce qui est le cas car `plugins/index.ts` s'exécute avant `routes/index.ts`.

- [ ] **Step 5: Brancher le push WS dans les routes gacha**

Dans `back/src/main/interfaces/http/fastify/routes/gacha/index.ts`, remplacer le commentaire TODO par :

```typescript
import { wsManager } from '../../../../../ws/ws-manager'

// Dans POST /pulls, après gachaDomain.pull() :
wsManager.notify(request.user.userID, {
  type: 'pull:result',
  card: {
    id: result.card.id,
    name: result.card.name,
    imageUrl: result.card.imageUrl,
    rarity: result.card.rarity,
    variant: result.card.variant,
    set: { id: result.card.set.id, name: result.card.set.name },
  },
  wasDuplicate: result.wasDuplicate,
  dustEarned: result.dustEarned,
  tokensRemaining: result.tokensRemaining,
  pityCurrent: result.pityCurrent,
})
```

- [ ] **Step 6: Enregistrer la route WS dans `routes/index.ts`**

Dans `back/src/main/interfaces/http/fastify/routes/index.ts`, ajouter :

```typescript
import { wsRouter } from './ws'

await fastify.register(wsRouter)
```

- [ ] **Step 7: Relancer tous les tests e2e**

```bash
cd back && npx jest src/test/e2e --no-coverage 2>&1 | tail -30
```

Expected : tous les tests existants passent encore.

- [ ] **Step 8: Commit**

```bash
git add back/src/main/interfaces/ws/ws-manager.ts \
        back/src/main/interfaces/http/fastify/plugins/websocket.plugin.ts \
        back/src/main/interfaces/http/fastify/plugins/index.ts \
        back/src/main/interfaces/http/fastify/routes/ws/index.ts \
        back/src/main/interfaces/http/fastify/routes/index.ts \
        back/src/main/interfaces/http/fastify/routes/gacha/index.ts \
        back/package.json back/package-lock.json
git commit -m "feat: WebSocket plugin — /ws endpoint + push pull:result après tirage"
```

---

## Chunk 3: Frontend

### Task 9: TanStack Query hooks + WebSocket client

**Files:**
- Create: `front/src/lib/ws.ts`
- Create: `front/src/queries/useGacha.ts`
- Create: `front/src/queries/useCollection.ts`
- Modify: `front/package.json` (ajouter three.js + R3F packages)

- [ ] **Step 1: Installer les packages 3D**

```bash
cd front && npm install three@^0.178.0 @react-three/fiber@^9.0.0 @react-three/drei@^10.0.0 @react-spring/three@^9.7.4 && npm install --save-dev @types/three@^0.178.0
```

- [ ] **Step 2: WebSocket client (`front/src/lib/ws.ts`)**

```typescript
type WsEvent =
  | { type: 'connected'; userId: string }
  | {
      type: 'pull:result'
      card: { id: string; name: string; imageUrl: string; rarity: string; variant: string | null; set: { id: string; name: string } }
      wasDuplicate: boolean
      dustEarned: number
      tokensRemaining: number
      pityCurrent: number
    }
  | { type: 'error'; message: string }

type WsEventListener = (event: WsEvent) => void

class WsClient {
  #ws: WebSocket | null = null
  #listeners = new Set<WsEventListener>()

  connect(baseUrl: string) {
    if (this.#ws?.readyState === WebSocket.OPEN) return

    const url = baseUrl.replace(/^http/, 'ws') + '/ws'
    this.#ws = new WebSocket(url)

    this.#ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as WsEvent
        for (const listener of this.#listeners) listener(event)
      } catch {
        // ignore malformed
      }
    }

    this.#ws.onclose = () => {
      // Reconnect après 3s si fermé de manière inattendue
      setTimeout(() => this.connect(baseUrl), 3000)
    }
  }

  disconnect() {
    this.#ws?.close()
    this.#ws = null
  }

  on(listener: WsEventListener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }
}

export const wsClient = new WsClient()
export type { WsEvent }
```

- [ ] **Step 3: Gacha queries (`front/src/queries/useGacha.ts`)**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export type PullResult = {
  card: {
    id: string
    name: string
    imageUrl: string
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
    variant: 'BRILLIANT' | 'HOLOGRAPHIC' | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

export type TokenBalance = {
  tokens: number
  maxStock: number
  nextTokenAt: string | null
}

export const useTokenBalance = () =>
  useQuery({
    queryKey: ['tokens', 'balance'],
    queryFn: () => api.get<TokenBalance>('/tokens/balance'),
    refetchInterval: 60_000, // rafraîchir toutes les minutes
  })

export const usePull = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<PullResult>('/pulls'),
    onSuccess: () => {
      // Invalider le solde de tokens après un tirage
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

export type PullHistory = {
  pulls: Array<{
    id: string
    pulledAt: string
    wasDuplicate: boolean
    dustEarned: number
    card: { id: string; name: string; imageUrl: string; rarity: string; variant: string | null }
  }>
  total: number
  page: number
  limit: number
}

export const usePullHistory = (page = 1) =>
  useQuery({
    queryKey: ['pulls', 'history', page],
    queryFn: () => api.get<PullHistory>(`/pulls/history?page=${page}`),
  })
```

- [ ] **Step 4: Collection queries (`front/src/queries/useCollection.ts`)**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export type CardSet = {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  isActive: boolean
}

export type Card = {
  id: string
  name: string
  imageUrl: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  variant: 'BRILLIANT' | 'HOLOGRAPHIC' | null
  set: { id: string; name: string }
}

export type UserCard = {
  card: Card
  quantity: number
  obtainedAt: string
}

export const useCardSets = () =>
  useQuery({
    queryKey: ['sets'],
    queryFn: () => api.get<{ sets: CardSet[] }>('/sets'),
  })

export const useCards = (filter?: { setId?: string; rarity?: string }) => {
  const params = new URLSearchParams()
  if (filter?.setId) params.set('setId', filter.setId)
  if (filter?.rarity) params.set('rarity', filter.rarity)
  const qs = params.toString()
  return useQuery({
    queryKey: ['cards', filter],
    queryFn: () => api.get<{ cards: Card[] }>(`/cards${qs ? `?${qs}` : ''}`),
  })
}

export const useUserCollection = (userId: string | undefined) =>
  useQuery({
    queryKey: ['collection', userId],
    queryFn: () => api.get<{ cards: UserCard[] }>(`/users/${userId}/collection`),
    enabled: !!userId,
  })

export const useRecycle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) =>
      api.post<{ dustEarned: number; newDustTotal: number }>('/collection/recycle', { cardId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add front/src/lib/ws.ts \
        front/src/queries/useGacha.ts \
        front/src/queries/useCollection.ts \
        front/package.json front/package-lock.json
git commit -m "feat: frontend — gacha/collection queries + WS client + install three/R3F"
```

---

### Task 10: Composant machine à pince 3D (R3F)

**Files:**
- Create: `front/src/components/machine/ClawMachine.tsx`
- Create: `front/src/components/machine/CardReveal.tsx`

La machine est construite entièrement avec des primitives Three.js (BoxGeometry, SphereGeometry, CylinderGeometry, MeshPhysicalMaterial). Les animations utilisent `@react-spring/three`.

Séquence de tirage :
1. `idle` → claw en haut, boules au fond
2. `descending` → pince descend (lerp Y)
3. `grabbing` → grappins se ferment
4. `ascending` → pince remonte avec la boule
5. `releasing` → boule tombe dans la goulotte
6. `reveal` → overlay card reveal selon rareté

- [ ] **Step 1: Créer `ClawMachine.tsx`**

`front/src/components/machine/ClawMachine.tsx` :

```tsx
import { useSpring, animated } from '@react-spring/three'
import { useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react'

export type MachineState = 'idle' | 'descending' | 'grabbing' | 'ascending' | 'releasing'

export type ClawMachineHandle = {
  startAnimation: () => Promise<void>
}

// Casing extérieur (murs de la machine)
function MachineCasing() {
  return (
    <group>
      {/* Fond */}
      <mesh position={[0, 0, -1]}>
        <boxGeometry args={[2.2, 3.2, 0.1]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Côtés */}
      <mesh position={[-1.1, 0, 0]}>
        <boxGeometry args={[0.1, 3.2, 2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[1.1, 0, 0]}>
        <boxGeometry args={[0.1, 3.2, 2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Toit */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.2, 0.1, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      {/* Sol */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[2.2, 0.1, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      {/* Vitre avant (transparente) */}
      <mesh position={[0, 0, 1]}>
        <boxGeometry args={[2.2, 3.2, 0.05]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.15}
          roughness={0}
          metalness={0}
          transmission={0.9}
        />
      </mesh>
      {/* Rails */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
          <meshStandardMaterial color="#e94560" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

// Pince (3 grappins)
function Claw({ open }: { open: boolean }) {
  const armAngle = open ? 0.4 : 0

  return (
    <group>
      {/* Corps de la pince */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.15]} />
        <meshStandardMaterial color="#e94560" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* 3 grappins */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x = Math.sin(rad) * 0.1
        const z = Math.cos(rad) * 0.1
        return (
          <mesh
            key={i}
            position={[x, -0.25, z]}
            rotation={[armAngle * Math.cos(rad), 0, armAngle * Math.sin(rad)]}
          >
            <boxGeometry args={[0.04, 0.25, 0.04]} />
            <meshStandardMaterial color="#c0392b" metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

// Boules au fond de la machine
function GachaBalls({ count = 12 }: { count?: number }) {
  const positions = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 1.6,
        y: -1.2 + Math.random() * 0.3,
        z: (Math.random() - 0.5) * 1.4,
      })),
    [count],
  )

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            transparent
            opacity={0.85}
            roughness={0.05}
            metalness={0}
            transmission={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

// Boule en cours de prise (utilise animated.mesh directement)
function GrabbedBall({ yPos }: { yPos: any }) {
  return (
    <animated.mesh position-y={yPos}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshPhysicalMaterial
        color="#f0f0f0"
        transparent
        opacity={0.9}
        roughness={0.05}
        transmission={0.3}
      />
    </animated.mesh>
  )
}

export const ClawMachine = forwardRef<ClawMachineHandle>((_, ref) => {
  const [machineState, setMachineState] = useState<MachineState>('idle')
  const [clawOpen, setClawOpen] = useState(true)

  const [clawSpring, clawApi] = useSpring(() => ({ y: 1.2 }))
  const [ballSpring, ballApi] = useSpring(() => ({ y: -1.2 }))
  const [showBall, setShowBall] = useState(false)

  useImperativeHandle(ref, () => ({
    async startAnimation() {
      setMachineState('descending')
      setClawOpen(true)
      setShowBall(false)

      // 1. Descendre la pince
      await clawApi.start({ y: -1.0, config: { duration: 1200 } })[0]

      // 2. Fermer les grappins
      setMachineState('grabbing')
      setClawOpen(false)
      await new Promise((r) => setTimeout(r, 400))

      // 3. Faire apparaître la boule et remonter
      setShowBall(true)
      ballApi.start({ y: -1.0 })
      setMachineState('ascending')
      await clawApi.start({ y: 1.2, config: { duration: 1200 } })[0]
      ballApi.start({ y: 1.2 })

      // 4. Lâcher la boule (côté goulotte)
      setMachineState('releasing')
      await new Promise((r) => setTimeout(r, 600))
      await ballApi.start({ y: -0.5, config: { duration: 800 } })[0]

      setMachineState('idle')
      setClawOpen(true)
      setShowBall(false)
      clawApi.start({ y: 1.2 })
    },
  }))

  return (
    <group>
      <MachineCasing />
      <GachaBalls />

      {/* Pince animée */}
      <animated.group position-y={clawSpring.y}>
        <Claw open={clawOpen} />
        {/* Câble */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1.5, 4]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </animated.group>

      {/* Boule en cours de transport */}
      {showBall && <GrabbedBall yPos={ballSpring.y} />}

      {/* Lumière interne */}
      <pointLight position={[0, 0.5, 0]} color="#4ecdc4" intensity={0.8} distance={3} />
      <pointLight position={[0, -0.5, 0.5]} color="#e94560" intensity={0.4} distance={2} />
    </group>
  )
})

ClawMachine.displayName = 'ClawMachine'
```

- [ ] **Step 2: Créer `CardReveal.tsx`**

`front/src/components/machine/CardReveal.tsx` :

```tsx
import { useEffect, useRef } from 'react'
import type { PullResult } from '../../queries/useGacha'

const RARITY_STYLES = {
  COMMON:    { border: 'border-border',       glow: '',                      label: 'Commun',    color: 'text-text-light' },
  UNCOMMON:  { border: 'border-green-500/50', glow: 'shadow-green-500/30',   label: 'Peu commun', color: 'text-green-400' },
  RARE:      { border: 'border-accent/50',    glow: 'shadow-accent/40',      label: 'Rare',      color: 'text-accent' },
  EPIC:      { border: 'border-secondary/50', glow: 'shadow-secondary/40',   label: 'Épique',    color: 'text-secondary' },
  LEGENDARY: { border: 'border-primary/60',   glow: 'shadow-primary/50',     label: 'Légendaire', color: 'text-primary' },
}

const VARIANT_LABELS = {
  BRILLIANT:   '✨ Brillant',
  HOLOGRAPHIC: '🌈 Holographique',
}

type Props = {
  result: PullResult | null
  onClose: () => void
}

export function CardReveal({ result, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) {
      dialogRef.current?.focus()
    }
  }, [result])

  if (!result) return null

  const style = RARITY_STYLES[result.card.rarity]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-64 rounded-2xl border-2 ${style.border} bg-card p-6 shadow-2xl ${style.glow} animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image de la carte */}
        <div className="mb-4 aspect-[3/4] w-full rounded-xl bg-muted flex items-center justify-center overflow-hidden">
          <img
            src={result.card.imageUrl}
            alt={result.card.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
            }}
          />
        </div>

        {/* Nom + rareté */}
        <h2 className="mb-1 text-lg font-black text-text">{result.card.name}</h2>
        <p className={`text-sm font-bold ${style.color}`}>{style.label}</p>
        {result.card.variant && (
          <p className="text-xs text-text-light">{VARIANT_LABELS[result.card.variant]}</p>
        )}

        {/* Doublon / dust */}
        {result.wasDuplicate && (
          <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
            <p className="text-xs font-semibold text-yellow-400">
              Doublon ! +{result.dustEarned} ✨ dust
            </p>
          </div>
        )}

        {/* Tokens restants */}
        <p className="mt-3 text-center text-xs text-text-light">
          {result.tokensRemaining} token{result.tokensRemaining !== 1 ? 's' : ''} restant{result.tokensRemaining !== 1 ? 's' : ''}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/80 transition-colors"
        >
          Continuer
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs (ou uniquement des erreurs non liées aux nouveaux fichiers).

- [ ] **Step 4: Commit**

```bash
git add front/src/components/machine/ClawMachine.tsx \
        front/src/components/machine/CardReveal.tsx
git commit -m "feat: 3D claw machine component (R3F primitives) + card reveal overlay"
```

---

### Task 11: Page Play

**Files:**
- Modify: `front/src/routes/_authenticated/play.tsx`

La page Play affiche le Canvas R3F avec la machine, un compteur de tokens, et le bouton Jouer. Elle gère le WS et l'animation de tirage.

- [ ] **Step 1: Réécrire `play.tsx`**

`front/src/routes/_authenticated/play.tsx` :

```tsx
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Ticket } from 'lucide-react'

import { ClawMachine } from '../../components/machine/ClawMachine'
import type { ClawMachineHandle } from '../../components/machine/ClawMachine'
import { CardReveal } from '../../components/machine/CardReveal'
import { useTokenBalance, usePull } from '../../queries/useGacha'
import type { PullResult } from '../../queries/useGacha'
import { useAuthStore } from '../../stores/auth.store'
import { wsClient } from '../../lib/ws'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

function Play() {
  const machineRef = useRef<ClawMachineHandle>(null)
  const [pullResult, setPullResult] = useState<PullResult | null>(null)
  const [isPulling, setIsPulling] = useState(false)

  const { data: balance, isLoading: balanceLoading } = useTokenBalance()
  const { mutate: pullMutation, isPending: pullPending } = usePull()
  const user = useAuthStore((s) => s.user)

  // Connecter le WebSocket au montage (pour les futurs events temps-réel)
  useEffect(() => {
    wsClient.connect(API_URL)
  }, [])

  const handlePull = () => {
    if (isPulling || pullPending || !balance || balance.tokens < 1) return
    setIsPulling(true)

    // Lancer l'animation ET le pull en parallèle
    const animationPromise = machineRef.current?.startAnimation() ?? Promise.resolve()

    pullMutation(undefined, {
      onSuccess: (result) => {
        // Utiliser la réponse HTTP comme source de vérité (plus fiable que le WS)
        setPullResult(result)
      },
      onError: () => setIsPulling(false),
    })

    // Attendre la fin de l'animation avant d'autoriser un nouveau tirage
    animationPromise.then(() => setIsPulling(false))
  }

  const tokens = balance?.tokens ?? 0
  const maxStock = balance?.maxStock ?? 5
  const canPull = tokens > 0 && !isPulling && !pullPending

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[110px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[350px] w-[350px] rounded-full bg-secondary/6 blur-[100px]" />
      </div>

      {/* Token counter */}
      <div className="relative z-10 mb-6 flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2">
        <Ticket className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-primary">
          {balanceLoading ? '…' : `${tokens} / ${maxStock}`}
        </span>
        {balance?.nextTokenAt && tokens < maxStock && (
          <span className="text-xs text-text-light">
            · prochain dans {formatTimeLeft(balance.nextTokenAt)}
          </span>
        )}
      </div>

      {/* Canvas 3D */}
      <div className="relative z-10 h-[420px] w-[320px] rounded-2xl overflow-hidden border border-border shadow-2xl">
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 50 }}
          shadows
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <ClawMachine ref={machineRef} />
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* Bouton Jouer */}
      <button
        type="button"
        onClick={handlePull}
        disabled={!canPull}
        className={`
          relative z-10 mt-6 rounded-full px-10 py-4 text-lg font-black tracking-wide transition-all duration-200
          ${canPull
            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0'
            : 'cursor-not-allowed bg-muted text-text-light'
          }
        `}
      >
        {isPulling ? 'Tirage…' : tokens < 1 ? 'Pas de tokens' : 'Jouer (1 token)'}
      </button>

      {/* Overlay révélation carte */}
      <CardReveal
        result={pullResult}
        onClose={() => setPullResult(null)}
      />
    </div>
  )
}

function formatTimeLeft(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'bientôt'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

Corriger toute erreur TypeScript avant de continuer.

- [ ] **Step 3: Tester manuellement dans le navigateur**

```bash
cd front && npm run dev
```

Naviguer vers `http://localhost:5173/play`. Vérifier :
- La machine 3D s'affiche
- Le compteur de tokens s'affiche
- Cliquer "Jouer" déclenche l'animation de la pince
- Le card reveal apparaît après le tirage

- [ ] **Step 4: Commit**

```bash
git add front/src/routes/_authenticated/play.tsx
git commit -m "feat: play page — 3D claw machine + pull button + card reveal"
```

---

### Task 12: Page Collection

**Files:**
- Create: `front/src/routes/_authenticated/collection.tsx`
- Modify: `front/src/components/layout/Navbar.tsx` (activer le lien Collection)

La page collection affiche toutes les cartes du set actif. Les cartes non possédées ont une silhouette noire (CSS mask). Les doublons affichent `×N`. Un bouton "Recycler" permet de recycler les cartes en excédent.

- [ ] **Step 1: Créer `collection.tsx`**

`front/src/routes/_authenticated/collection.tsx` :

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { useCards, useUserCollection, useRecycle } from '../../queries/useCollection'
import type { Card } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
const RARITY_COLORS: Record<string, string> = {
  COMMON:    'border-border text-text-light',
  UNCOMMON:  'border-green-500/40 text-green-400',
  RARE:      'border-accent/40 text-accent',
  EPIC:      'border-secondary/40 text-secondary',
  LEGENDARY: 'border-primary/50 text-primary',
}
const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun', UNCOMMON: 'Peu commun', RARE: 'Rare', EPIC: 'Épique', LEGENDARY: 'Légendaire',
}

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)

  const { data: allCards, isLoading: cardsLoading } = useCards(
    selectedRarity ? { rarity: selectedRarity } : undefined,
  )
  const { data: userColl } = useUserCollection(user?.id)
  const { mutate: recycle, isPending: recycling } = useRecycle()

  // Construire un map cardId → quantity
  const owned = new Map<string, number>()
  for (const uc of userColl?.cards ?? []) {
    owned.set(uc.card.id, uc.quantity)
  }

  const cards = allCards?.cards ?? []
  const ownedCount = cards.filter((c) => owned.has(c.id)).length

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Ma Collection</h1>
            <p className="text-sm text-text-light">
              {ownedCount} / {cards.length} cartes
            </p>
          </div>

          {/* Filtres rareté */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedRarity(null)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                selectedRarity === null
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-text-light hover:border-primary/40'
              }`}
            >
              Tout
            </button>
            {RARITY_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRarity(selectedRarity === r ? null : r)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedRarity === r
                    ? `${RARITY_COLORS[r]} bg-current/10`
                    : 'border-border text-text-light hover:border-primary/40'
                }`}
              >
                {RARITY_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {cardsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-text-light">Chargement…</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {cards.map((card) => {
              const qty = owned.get(card.id) ?? 0
              const isOwned = qty > 0
              return (
                <CardItem
                  key={card.id}
                  card={card}
                  quantity={qty}
                  isOwned={isOwned}
                  onRecycle={() => recycle(card.id)}
                  recycling={recycling}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CardItem({
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
            ? RARITY_COLORS[card.rarity]?.split(' ')[0] ?? 'border-border'
            : 'border-border'
        }`}
      >
        {/* Image ou silhouette */}
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

        {/* Badge quantité */}
        {quantity > 1 && (
          <div className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            ×{quantity}
          </div>
        )}

        {/* Badge variant */}
        {card.variant && isOwned && (
          <div className="absolute top-1 left-1 text-xs">
            {card.variant === 'BRILLIANT' ? '✨' : '🌈'}
          </div>
        )}
      </div>

      {/* Nom (visible au survol) */}
      <div className="mt-1 px-0.5">
        <p className="truncate text-[10px] font-semibold text-text-light">
          {isOwned ? card.name : '???'}
        </p>
      </div>

      {/* Bouton recycler (apparaît au survol si doublon) */}
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

- [ ] **Step 2: Créer la route dans le router tree**

Comme TanStack Router utilise le file-based routing, le fichier `collection.tsx` dans `_authenticated/` sera automatiquement détecté. Lancer le CLI pour mettre à jour le routeTree :

```bash
cd front && npm run build 2>&1 | head -20
# Ou : npx @tanstack/router-cli generate
```

- [ ] **Step 3: Activer le lien dans la Navbar**

Dans `front/src/components/layout/Navbar.tsx`, le lien `/collection` est déjà dans `navItems`. Vérifier que la route existe et fonctionne.

- [ ] **Step 4: Tester manuellement**

```bash
cd front && npm run dev
```

Naviguer vers `http://localhost:5173/collection`. Vérifier :
- Toutes les cartes s'affichent (silhouette pour non possédées)
- Filtres par rareté fonctionnent
- Après un tirage (`/play`), la collection se met à jour
- Bouton recycler visible au survol des doublons

- [ ] **Step 5: Commit**

```bash
git add front/src/routes/_authenticated/collection.tsx
git commit -m "feat: collection page — card grid with silhouettes, filters, recycle"
```

---

## Revue finale

Après les 12 tasks, lancer tous les tests backend :

```bash
cd back && npx jest --no-coverage 2>&1 | tail -30
```

Et une revue visuelle du frontend :
- `/play` : machine 3D, pull, card reveal
- `/collection` : grille cartes, silhouettes, filtres

Puis utiliser `superpowers:finishing-a-development-branch` pour merger.
