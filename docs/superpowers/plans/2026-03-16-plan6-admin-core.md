# Gachapon — Plan 6: Admin Core Backend

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter l'infrastructure admin (middleware `requireRole`, `ConfigService` Redis+DB, migration `GlobalConfig` + `User.suspended`) et les routes backend `/admin/users`, `/admin/config`, `/admin/dashboard`, `/admin/stats`.

**Architecture:** `ConfigService` en couche `infra/` lit depuis Redis (TTL 5 min) → DB → env var. `requireRole(role)` est un Fastify hook générique enregistré comme plugin. `GachaDomain` et `collectionRouter` migrent leur config hardcodée vers `ConfigService`. Les routes admin sont regroupées dans un plugin `adminRouter` préfixé `/admin`.

**Tech Stack:** Fastify 5, Prisma 7 (nouvelles tables `GlobalConfig` + champ `User.suspended`), Redis, `fastify-plugin`, Zod v4, TanStack Query (frontend non concerné ici).

**Conventions :**
- Zod v4 : `import { z } from 'zod/v4'`
- IoC : `this.#reg('key', asClass(Service).singleton())` dans `awilix-ioc-container.ts`
- Repositories/Services : `constructor({ postgresOrm, redisClient, config }: IocContainer)`
- Routes : `FastifyPluginAsyncZod`, auth via `onRequest: [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]`
- Tests e2e : `buildTestApp()` + `app.inject()`, DB postgres docker `medisync-postgres`, `(app as any).iocContainer.postgresOrm.prisma` pour accès DB direct
- Linting : Biome (`npm run lint` dans `back/`)

---

## Chunk 1: Schema + ConfigService + role plugin

### Task 1: Migration Prisma — `GlobalConfig` + `User.suspended`

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Ajouter le modèle `GlobalConfig` et le champ `User.suspended` dans `back/prisma/schema.prisma`**

Ajouter après le modèle `User` (après le champ `createdAt`) :

```prisma
// Dans model User, après createdAt :
suspended     Boolean  @default(false)
```

Ajouter le nouveau modèle à la fin du fichier (après `UserQuest`) :

```prisma
model GlobalConfig {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Générer et appliquer la migration**

```bash
cd back && npx prisma migrate dev --name admin_core
```

Expected: migration créée dans `back/prisma/migrations/`, client Prisma régénéré dans `back/src/generated/`.

- [ ] **Step 3: Vérifier que le build compile**

```bash
cd back && npm run build
```

Expected: aucune erreur TypeScript.

---

### Task 2: Interface `ConfigServiceInterface`

**Files:**
- Create: `back/src/main/types/infra/config/config.service.interface.ts`

- [ ] **Step 1: Écrire l'interface**

```typescript
// back/src/main/types/infra/config/config.service.interface.ts
export interface ConfigServiceInterface {
  get(key: string): Promise<number>
  set(key: string, value: number): Promise<void>
  bootstrap(): Promise<void>
}
```

- [ ] **Step 2: Commit**

```bash
cd back && git add prisma/ src/generated/ src/main/types/infra/config/
git commit -m "feat(admin): prisma migration GlobalConfig + User.suspended + ConfigService interface"
```

---

### Task 3: Implémentation `ConfigService`

**Files:**
- Create: `back/src/main/infra/config/config.service.ts`

Les clés de config avec leurs valeurs par défaut (tirées des env vars) :

| Clé | Env var fallback |
|-----|-----------------|
| `tokenRegenIntervalHours` | `config.tokenRegenIntervalHours` |
| `tokenMaxStock` | `config.tokenMaxStock` |
| `pityThreshold` | `config.pityThreshold` |
| `dustCommon` | `5` |
| `dustUncommon` | `15` |
| `dustRare` | `50` |
| `dustEpic` | `150` |
| `dustLegendary` | `500` |

- [ ] **Step 1: Écrire `config.service.ts`**

```typescript
// back/src/main/infra/config/config.service.ts
import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'
import type { PostgresPrismaClient } from '../orm/postgres-client'

const REDIS_TTL_SECONDS = 300 // 5 minutes

const DEFAULTS: Record<string, number> = {
  tokenRegenIntervalHours: 4,
  tokenMaxStock: 5,
  pityThreshold: 100,
  dustCommon: 5,
  dustUncommon: 15,
  dustRare: 50,
  dustEpic: 150,
  dustLegendary: 500,
}

export class ConfigService implements ConfigServiceInterface {
  readonly #prisma: PostgresPrismaClient
  readonly #redis: RedisClientInterface
  readonly #envDefaults: Record<string, number>

  constructor({ postgresOrm, redisClient, config }: IocContainer) {
    this.#prisma = postgresOrm.prisma
    this.#redis = redisClient
    this.#envDefaults = {
      ...DEFAULTS,
      tokenRegenIntervalHours: config.tokenRegenIntervalHours,
      tokenMaxStock: config.tokenMaxStock,
      pityThreshold: config.pityThreshold,
    }
  }

  async get(key: string): Promise<number> {
    const redisKey = `config:${key}`

    // 1. Redis cache
    const cached = await this.#redis.get(redisKey)
    if (cached !== null) return Number(cached)

    // 2. DB
    const row = await this.#prisma.globalConfig.findUnique({ where: { key } })
    if (row !== null) {
      await this.#redis.set(redisKey, row.value, REDIS_TTL_SECONDS)
      return Number(row.value)
    }

    // 3. Env var / hardcoded default
    const fallback = this.#envDefaults[key] ?? 0
    return fallback
  }

  async set(key: string, value: number): Promise<void> {
    await this.#prisma.globalConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
    await this.#redis.del(`config:${key}`)
  }

  async bootstrap(): Promise<void> {
    for (const [key, defaultValue] of Object.entries(this.#envDefaults)) {
      await this.#prisma.globalConfig.upsert({
        where: { key },
        create: { key, value: String(defaultValue) },
        update: {}, // ne pas écraser les valeurs existantes
      })
    }
  }
}
```

- [ ] **Step 2: Ajouter `get`, `set`, `del` à `RedisClientInterface` et `RedisClient`**

**`back/src/main/types/infra/redis/redis-client.ts`** — ajouter les 3 méthodes à l'interface :

```typescript
export interface RedisClientInterface {
  readonly client: Redis
  healthCheck(): Promise<boolean>
  get(key: string): Promise<string | null>
  set(key: string, value: string | number, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}
```

**`back/src/main/infra/redis/redis-client.ts`** — ajouter les 3 implémentations :

```typescript
get(key: string): Promise<string | null> {
  return this.client.get(key)
}

async set(key: string, value: string | number, ttlSeconds: number): Promise<void> {
  await this.client.set(String(key), String(value), 'EX', ttlSeconds)
}

async del(key: string): Promise<void> {
  await this.client.del(key)
}
```

- [ ] **Step 3: Commit**

```bash
cd back && git add src/main/infra/config/ src/main/types/infra/redis/
git commit -m "feat(admin): ConfigService — Redis cache + DB + env var fallback"
```

---

### Task 4: Câblage IoC — `ConfigService`

**Files:**
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/application/starter.ts`

- [ ] **Step 1: Ajouter `configService` dans l'interface `IocContainer`**

Dans `back/src/main/types/application/ioc.ts`, ajouter l'import et la propriété :

```typescript
import type { ConfigServiceInterface } from '../infra/config/config.service.interface'
// Dans l'interface IocContainer :
readonly configService: ConfigServiceInterface
```

- [ ] **Step 2: Enregistrer `ConfigService` dans le container Awilix**

Dans `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` :

Ajouter l'import :
```typescript
import { ConfigService } from '../../../infra/config/config.service'
```

Dans le constructeur, après `this.#reg('redisClient', ...)` :
```typescript
this.#reg('configService', asClass(ConfigService).singleton())
```

- [ ] **Step 3: Appeler `configService.bootstrap()` au démarrage**

Dans `back/src/main/application/starter.ts`, modifier la fonction `startApp` :

```typescript
const startApp = async (): Promise<IocContainer> => {
  const config = loadConfig()
  const iocContainer = startIocContainer(config)
  const { httpServer, configService } = iocContainer.instances

  await httpServer.configure()        // existant — ne pas supprimer
  await configService.bootstrap()     // NOUVEAU
  await httpServer.start()            // existant

  return iocContainer.instances
}
```

- [ ] **Step 4: Build + lint**

```bash
cd back && npm run build && npm run lint
```

Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
cd back && git add src/main/types/application/ioc.ts src/main/application/
git commit -m "feat(admin): wire ConfigService into IoC + bootstrap on startup"
```

---

### Task 5: `role.plugin.ts` — middleware `requireRole`

**Files:**
- Create: `back/src/main/interfaces/http/fastify/plugins/role.plugin.ts`
- Modify: `back/src/main/interfaces/http/fastify/plugins/jwt.plugin.ts`
- Modify: `back/src/main/interfaces/http/fastify/plugins/index.ts`

- [ ] **Step 1: Écrire `role.plugin.ts`**

```typescript
// back/src/main/interfaces/http/fastify/plugins/role.plugin.ts
import Boom from '@hapi/boom'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import type { GlobalRole } from '../../../../generated/client'

declare module 'fastify' {
  interface FastifyInstance {
    requireRole: (role: GlobalRole) => (request: FastifyRequest) => Promise<void>
  }
}

export const rolePlugin = fp((fastify: FastifyInstance) => {
  fastify.decorate(
    'requireRole',
    (role: GlobalRole) =>
      async (request: FastifyRequest): Promise<void> => {
        if (!request.user) {
          throw Boom.unauthorized('Not authenticated')
        }
        if (request.user.role !== role) {
          throw Boom.forbidden('Insufficient permissions')
        }
      },
  )
})
```

- [ ] **Step 2: Modifier la déclaration de type `request.user.role` dans `jwt.plugin.ts`**

Dans `back/src/main/interfaces/http/fastify/plugins/jwt.plugin.ts`, **remplacer** le bloc `declare module 'fastify'` existant (ne pas en ajouter un second) :

```typescript
// AVANT:
declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: string }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest) => Promise<void>
  }
}

// APRÈS:
import type { GlobalRole } from '../../../../generated/client'

declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: GlobalRole }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest) => Promise<void>
  }
}
```

- [ ] **Step 3: Enregistrer `rolePlugin` dans `plugins/index.ts`**

Dans `back/src/main/interfaces/http/fastify/plugins/index.ts`, ajouter l'import et l'enregistrement **après** `jwtPlugin` :

```typescript
import { rolePlugin } from './role.plugin'
// ...
await registerPlugin(fastify, 'jwt', jwtPlugin)
await registerPlugin(fastify, 'role', rolePlugin)  // NOUVEAU
```

- [ ] **Step 4: Ajouter la vérification `suspended` dans `verifySessionCookie`**

Dans `jwt.plugin.ts`, **remplacer** le corps entier de la fonction `verifySessionCookie` par la version complète ci-dessous. La branche JWT doit désormais lire l'utilisateur en DB (pour vérifier `suspended`) — cela ajoute 1 requête DB par requête authentifiée via cookie JWT.

```typescript
fastify.decorate('verifySessionCookie', async (request: FastifyRequest) => {
  const { jwtService, apiKeyRepository, userRepository } = fastify.iocContainer

  // X-API-Key takes priority
  const rawKey = request.headers['x-api-key']
  const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey
  if (apiKey) {
    const keyRecord = await apiKeyRepository.findByKey(apiKey)
    if (!keyRecord) throw Boom.unauthorized('Invalid API key')
    const user = await userRepository.findById(keyRecord.userId)
    if (!user) throw Boom.unauthorized('User not found')
    if (user.suspended) throw Boom.forbidden('Account suspended')
    request.user = { userID: user.id, role: user.role }
    void apiKeyRepository.updateLastUsed(keyRecord.id)
    return
  }

  // JWT cookie fallback
  const token = request.cookies.access_token
  if (!token) throw Boom.unauthorized('No access token')
  const payload = jwtService.verify<{ sub: string; role: GlobalRole }>(token)
  const user = await userRepository.findById(payload.sub)
  if (!user) throw Boom.unauthorized('User not found')
  if (user.suspended) throw Boom.forbidden('Account suspended')
  request.user = { userID: payload.sub, role: payload.role }
})
```

Note: `payload.role` est casté vers `GlobalRole` via le générique `verify<{ sub: string; role: GlobalRole }>`. Le JWT est signé par le backend avec la valeur de l'enum, donc la valeur est garantie valide à l'émission.

- [ ] **Step 5: Build + lint**

```bash
cd back && npm run build && npm run lint
```

Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
cd back && git add src/main/interfaces/http/fastify/plugins/
git commit -m "feat(admin): requireRole plugin + retype request.user.role + suspend check"
```

---

### Task 6: Migration `DUST_BY_RARITY` → `ConfigService`

**Files:**
- Modify: `back/src/main/domain/gacha/gacha.domain.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/collection/index.ts`

- [ ] **Step 1: Modifier `GachaDomain` pour utiliser `ConfigService`**

`GachaDomain` doit désormais injecter `configService`. Les valeurs de config sont lues **avant** d'entrer dans la transaction serializable (jamais d'I/O async à l'intérieur du `tx`).

```typescript
// back/src/main/domain/gacha/gacha.domain.ts
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'

export class GachaDomain implements GachaDomainInterface {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface

  constructor({ postgresOrm, configService }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  async #executePullTx(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: {
      tokenRegenIntervalHours: number
      tokenMaxStock: number
      pityThreshold: number
      dustByRarity: Record<string, number>
    },
  ): Promise<PullResult> {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

    const { tokens, newLastTokenAt } = calculateTokens(
      user.lastTokenAt,
      user.tokens,
      cfg.tokenRegenIntervalHours,
      cfg.tokenMaxStock,
    )

    if (tokens < 1) throw Boom.paymentRequired('Not enough tokens')

    const activeCards = await tx.card.findMany({
      where: {
        set: { isActive: true },
        ...(user.pityCurrent >= cfg.pityThreshold ? { rarity: 'LEGENDARY' } : {}),
      },
      include: { set: true },
    }) as CardWithSet[]

    if (activeCards.length === 0) throw Boom.internal('No active cards in any set')

    const card = pickWeightedRandom(activeCards)

    const existing = await tx.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: card.id } },
    })
    const wasDuplicate = existing !== null
    const dustEarned = wasDuplicate ? (cfg.dustByRarity[card.rarity] ?? 0) : 0

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

    const pull = await tx.gachaPull.create({
      data: { userId, cardId: card.id, wasDuplicate, dustEarned },
    })

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

    return { pull, card, wasDuplicate, dustEarned, tokensRemaining: tokens - 1, pityCurrent: newPityCurrent }
  }

  pull(userId: string): Promise<PullResult> {
    const attempt = async (): Promise<PullResult> => {
      // Lire la config AVANT la transaction (pas d'I/O async dans le tx serializable)
      const [tokenRegenIntervalHours, tokenMaxStock, pityThreshold,
             dustCommon, dustUncommon, dustRare, dustEpic, dustLegendary] = await Promise.all([
        this.#configService.get('tokenRegenIntervalHours'),
        this.#configService.get('tokenMaxStock'),
        this.#configService.get('pityThreshold'),
        this.#configService.get('dustCommon'),
        this.#configService.get('dustUncommon'),
        this.#configService.get('dustRare'),
        this.#configService.get('dustEpic'),
        this.#configService.get('dustLegendary'),
      ])
      const cfg = {
        tokenRegenIntervalHours,
        tokenMaxStock,
        pityThreshold,
        dustByRarity: {
          COMMON: dustCommon,
          UNCOMMON: dustUncommon,
          RARE: dustRare,
          EPIC: dustEpic,
          LEGENDARY: dustLegendary,
        },
      }
      return this.#postgresOrm.executeWithTransactionClient(
        (tx) => this.#executePullTx(tx, userId, cfg),
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )
    }

    const MAX_RETRIES = 3
    const run = async (retriesLeft: number): Promise<PullResult> => {
      try {
        return await attempt()
      } catch (err: unknown) {
        if (retriesLeft > 0 && isPrismaSerializationError(err)) {
          return run(retriesLeft - 1)
        }
        throw err
      }
    }

    return run(MAX_RETRIES)
  }
}
```

Supprimer l'import `DUST_BY_RARITY` et l'import `Config` du fichier (plus nécessaires).

- [ ] **Step 2: Modifier le recycle endpoint dans `collectionRouter`**

Dans `back/src/main/interfaces/http/fastify/routes/collection/index.ts`, remplacer l'import `DUST_BY_RARITY` et son utilisation :

```typescript
// Supprimer : import { DUST_BY_RARITY } from '../../../../../types/domain/gacha/gacha.types'

// Dans le handler POST /collection/recycle, remplacer :
//   const dustEarned = DUST_BY_RARITY[card.rarity]
// Par :
const { configService } = fastify.iocContainer
const dustKey = `dust${card.rarity.charAt(0) + card.rarity.slice(1).toLowerCase()}`
const dustEarned = await configService.get(dustKey)
```

- [ ] **Step 3: Build + lint + tests existants**

```bash
cd back && npm run build && npm run lint && npm test
```

Expected: aucune erreur, tous les tests existants passent.

- [ ] **Step 4: Commit**

```bash
cd back && git add src/main/domain/gacha/ src/main/interfaces/http/fastify/routes/collection/
git commit -m "feat(admin): migrate DUST_BY_RARITY + pity config to ConfigService"
```

---

## Chunk 2: Routes admin — users, config, dashboard, stats

### Task 7: Tests e2e — admin guard

**Files:**
- Create: `back/src/test/e2e/admin/admin-guard.test.ts`

- [ ] **Step 1: Écrire les tests de guard**

```typescript
// back/src/test/e2e/admin/admin-guard.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin guard', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let userCookies: string
  let adminCookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    // Créer un user normal
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `user${suffix}`, email: `user${suffix}@test.com`, password: 'Password123!' },
    })
    userCookies = userRes.headers['set-cookie'] as string

    // Créer un admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `admin${suffix}`, email: `admin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = adminRes.headers['set-cookie'] as string
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email: `admin${suffix}@test.com` },
      data: { role: 'SUPER_ADMIN' },
    })
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/users — 403 pour un USER', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/users', headers: { cookie: userCookies } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /admin/users — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/users' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /admin/users — 200 pour un SUPER_ADMIN', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/users', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Lancer le test — il doit échouer**

```bash
cd back && npm test -- --testPathPattern=admin-guard
```

Expected: FAIL — routes `/admin/users` inexistantes (404).

---

### Task 8: `adminRouter` — users

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/admin/users.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/admin/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`

- [ ] **Step 1: Écrire `users.router.ts`**

```typescript
// back/src/main/interfaces/http/fastify/routes/admin/users.router.ts
import Boom from '@hapi/boom'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminUsersRouter: FastifyPluginAsyncZod = async (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')] as const

  // GET /admin/users — liste paginée
  fastify.get(
    '/',
    {
      onRequest: auth,
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const { page, limit, search } = request.query
      const where = search
        ? { OR: [{ username: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
        : {}
      const [users, total] = await Promise.all([
        postgresOrm.prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: { id: true, username: true, email: true, role: true, tokens: true, dust: true, suspended: true, createdAt: true },
        }),
        postgresOrm.prisma.user.count({ where }),
      ])
      return { users, total, page, limit }
    },
  )

  // GET /admin/users/:id — détail + stats
  fastify.get(
    '/:id',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const { id } = request.params
      const user = await postgresOrm.prisma.user.findUnique({ where: { id } })
      if (!user) throw Boom.notFound('User not found')
      const [pullsTotal, dustGenerated, cardsOwned] = await Promise.all([
        postgresOrm.prisma.gachaPull.count({ where: { userId: id } }),
        postgresOrm.prisma.gachaPull.aggregate({ where: { userId: id }, _sum: { dustEarned: true } }),
        postgresOrm.prisma.userCard.count({ where: { userId: id } }),
      ])
      return {
        user: { id: user.id, username: user.username, email: user.email, role: user.role, tokens: user.tokens, dust: user.dust, suspended: user.suspended, createdAt: user.createdAt },
        stats: { pullsTotal, dustGenerated: dustGenerated._sum.dustEarned ?? 0, cardsOwned },
      }
    },
  )

  // GET /admin/users/:id/collection — bypass ownership check
  fastify.get(
    '/:id/collection',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({ where: { id: request.params.id } })
      if (!user) throw Boom.notFound('User not found')
      const userCards = await postgresOrm.prisma.userCard.findMany({
        where: { userId: request.params.id },
        include: { card: { include: { set: true } } },
        orderBy: { obtainedAt: 'desc' },
      })
      return {
        cards: userCards.map((uc) => ({
          card: { id: uc.card.id, name: uc.card.name, imageUrl: uc.card.imageUrl, rarity: uc.card.rarity, variant: uc.card.variant, set: { id: uc.card.set.id, name: uc.card.set.name } },
          quantity: uc.quantity,
          obtainedAt: uc.obtainedAt.toISOString(),
        })),
      }
    },
  )

  // PATCH /admin/users/:id/tokens
  fastify.patch(
    '/:id/tokens',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }), body: z.object({ amount: z.number().int() }) },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({ where: { id: request.params.id } })
      if (!user) throw Boom.notFound('User not found')
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { tokens: { increment: request.body.amount } },
      })
      return { tokens: updated.tokens }
    },
  )

  // PATCH /admin/users/:id/dust
  fastify.patch(
    '/:id/dust',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }), body: z.object({ amount: z.number().int() }) },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({ where: { id: request.params.id } })
      if (!user) throw Boom.notFound('User not found')
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { dust: { increment: request.body.amount } },
      })
      return { dust: updated.dust }
    },
  )

  // PATCH /admin/users/:id/role
  fastify.patch(
    '/:id/role',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }), body: z.object({ role: z.enum(['USER', 'SUPER_ADMIN']) }) },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({ where: { id: request.params.id } })
      if (!user) throw Boom.notFound('User not found')
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { role: request.body.role },
      })
      return { role: updated.role }
    },
  )

  // PATCH /admin/users/:id/suspend
  fastify.patch(
    '/:id/suspend',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }), body: z.object({ suspended: z.boolean() }) },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({ where: { id: request.params.id } })
      if (!user) throw Boom.notFound('User not found')
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { suspended: request.body.suspended },
      })
      return { suspended: updated.suspended }
    },
  )
}
```

- [ ] **Step 2: Créer les stubs `config.router.ts` et `stats.router.ts`**

Ces fichiers doivent exister pour que le barrel compile. Créer des stubs minimaux :

```typescript
// back/src/main/interfaces/http/fastify/routes/admin/config.router.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminConfigRouter: FastifyPluginAsyncZod = async (_fastify) => {
  // implémenté dans Task 9
}
```

```typescript
// back/src/main/interfaces/http/fastify/routes/admin/stats.router.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminStatsRouter: FastifyPluginAsyncZod = async (_fastify) => {
  // implémenté dans Task 10
}
```

- [ ] **Step 3: Créer le barrel `admin/index.ts`**

```typescript
// back/src/main/interfaces/http/fastify/routes/admin/index.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { adminConfigRouter } from './config.router'
import { adminStatsRouter } from './stats.router'
import { adminUsersRouter } from './users.router'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(adminUsersRouter, { prefix: '/users' })
  await fastify.register(adminConfigRouter, { prefix: '/config' })
  await fastify.register(adminStatsRouter)
}
```

- [ ] **Step 4: Enregistrer `adminRouter` dans `routes/index.ts`**

Dans `back/src/main/interfaces/http/fastify/routes/index.ts` :

```typescript
import { adminRouter } from './admin'
// Dans la fonction routes :
await fastify.register(adminRouter, { prefix: '/admin' })
```

- [ ] **Step 5: Lancer les tests**

```bash
cd back && npm test -- --testPathPattern=admin-guard
```

Expected: tous les tests du fichier passent.

- [ ] **Step 6: Commit**

```bash
cd back && git add src/main/interfaces/http/fastify/routes/admin/ src/main/interfaces/http/fastify/routes/index.ts
git commit -m "feat(admin): admin users routes — list, detail, collection, tokens, dust, role, suspend"
```

---

### Task 9: Route `/admin/config`

**Files:**
- Create: `back/src/test/e2e/admin/admin-config.test.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/admin/config.router.ts`

- [ ] **Step 1: Écrire les tests e2e config**

```typescript
// back/src/test/e2e/admin/admin-config.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin config routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `cfg${suffix}`, email: `cfg${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `cfg${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/config — retourne toutes les clés', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/config', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('tokenRegenIntervalHours')
    expect(body).toHaveProperty('pityThreshold')
    expect(body).toHaveProperty('dustCommon')
  })

  it('PUT /admin/config — met à jour les clés spécifiées', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/admin/config',
      headers: { cookie: adminCookies },
      payload: { dustCommon: 10 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.updated).toContain('dustCommon')

    // Vérifier la persistance
    const getRes = await app.inject({ method: 'GET', url: '/admin/config', headers: { cookie: adminCookies } })
    expect(getRes.json().dustCommon).toBe(10)
  })
})
```

- [ ] **Step 2: Lancer les tests — ils doivent échouer (stub vide)**

```bash
cd back && npm test -- --testPathPattern=admin-config
```

Expected: FAIL — les routes config retournent 404 (stub vide).

- [ ] **Step 3: Implémenter `config.router.ts`**

```typescript
// back/src/main/interfaces/http/fastify/routes/admin/config.router.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const CONFIG_KEYS = ['tokenRegenIntervalHours', 'tokenMaxStock', 'pityThreshold', 'dustCommon', 'dustUncommon', 'dustRare', 'dustEpic', 'dustLegendary'] as const

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminConfigRouter: FastifyPluginAsyncZod = async (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')] as const

  // GET /admin/config
  fastify.get(
    '/',
    { onRequest: auth },
    async () => {
      const { configService } = fastify.iocContainer
      const entries = await Promise.all(
        CONFIG_KEYS.map(async (key) => [key, await configService.get(key)] as const),
      )
      return Object.fromEntries(entries)
    },
  )

  // PUT /admin/config
  fastify.put(
    '/',
    {
      onRequest: auth,
      schema: {
        body: z.object({
          tokenRegenIntervalHours: z.number().positive().optional(),
          tokenMaxStock: z.number().int().positive().optional(),
          pityThreshold: z.number().int().min(1).optional(),
          dustCommon: z.number().int().min(0).optional(),
          dustUncommon: z.number().int().min(0).optional(),
          dustRare: z.number().int().min(0).optional(),
          dustEpic: z.number().int().min(0).optional(),
          dustLegendary: z.number().int().min(0).optional(),
        }),
      },
    },
    async (request) => {
      const { configService } = fastify.iocContainer
      const updates = Object.entries(request.body).filter(([, v]) => v !== undefined) as [string, number][]
      await Promise.all(updates.map(([key, value]) => configService.set(key, value)))
      return { updated: updates.map(([key]) => key) }
    },
  )
}
```

- [ ] **Step 4: Lancer les tests**

```bash
cd back && npm test -- --testPathPattern=admin-config
```

Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
cd back && git add src/main/interfaces/http/fastify/routes/admin/config.router.ts src/test/e2e/admin/
git commit -m "feat(admin): admin config routes — GET/PUT + e2e tests"
```

---

### Task 10: Routes `/admin/dashboard` et `/admin/stats`

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/admin/stats.router.ts`

- [ ] **Step 1: Écrire `stats.router.ts`**

```typescript
// back/src/main/interfaces/http/fastify/routes/admin/stats.router.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminStatsRouter: FastifyPluginAsyncZod = async (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')] as const

  // GET /admin/dashboard — KPIs + séries temporelles
  fastify.get('/dashboard', { onRequest: auth }, async () => {
    const { postgresOrm } = fastify.iocContainer
    const prisma = postgresOrm.prisma

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, pullsToday, dustGenerated, legendaryCount] = await Promise.all([
      prisma.user.count(),
      prisma.gachaPull.count({ where: { pulledAt: { gte: startOfToday } } }),
      prisma.gachaPull.aggregate({ _sum: { dustEarned: true } }),
      prisma.gachaPull.count({ where: { card: { rarity: 'LEGENDARY' } } }),
    ])

    // Série temporelle pulls/jour sur 30 jours (PostgreSQL DATE_TRUNC)
    const pullsSeries = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "pulledAt") AS day, COUNT(*) AS count
      FROM "GachaPull"
      WHERE "pulledAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "pulledAt")
      ORDER BY day ASC
    `

    return {
      kpis: {
        totalUsers,
        pullsToday,
        dustGenerated: dustGenerated._sum.dustEarned ?? 0,
        legendaryCount,
      },
      pullsSeries: pullsSeries.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
    }
  })

  // GET /admin/stats — statistiques détaillées
  fastify.get('/stats', { onRequest: auth }, async () => {
    const { postgresOrm } = fastify.iocContainer
    const prisma = postgresOrm.prisma

    const [rarityDistribution, topCards, topUsers] = await Promise.all([
      // Distribution par rareté — raw SQL obligatoire (groupBy Prisma ne joint pas les relations)
      prisma.$queryRaw<{ rarity: string; count: bigint }[]>`
        SELECT c.rarity, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "Card" c ON c.id = gp."cardId"
        GROUP BY c.rarity
        ORDER BY count DESC
      `,

      // Top 10 cartes
      prisma.$queryRaw<{ cardId: string; name: string; rarity: string; count: bigint }[]>`
        SELECT gp."cardId", c.name, c.rarity, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "Card" c ON c.id = gp."cardId"
        GROUP BY gp."cardId", c.name, c.rarity
        ORDER BY count DESC
        LIMIT 10
      `,

      // Top 10 users par nombre de pulls
      prisma.$queryRaw<{ userId: string; username: string; count: bigint }[]>`
        SELECT gp."userId", u.username, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "User" u ON u.id = gp."userId"
        GROUP BY gp."userId", u.username
        ORDER BY count DESC
        LIMIT 10
      `,
    ])

    return {
      rarityDistribution: (rarityDistribution as { rarity: string; count: bigint }[]).map((r) => ({
        rarity: r.rarity,
        count: Number(r.count),
      })),
      topCards: topCards.map((r) => ({ cardId: r.cardId, name: r.name, rarity: r.rarity, count: Number(r.count) })),
      topUsers: topUsers.map((r) => ({ userId: r.userId, username: r.username, count: Number(r.count) })),
    }
  })
}
```

- [ ] **Step 2: Tests e2e dashboard**

```typescript
// back/src/test/e2e/admin/admin-stats.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin stats routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `stats${suffix}`, email: `stats${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `stats${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/dashboard — retourne KPIs + series', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('kpis')
    expect(body.kpis).toHaveProperty('totalUsers')
    expect(body.kpis).toHaveProperty('pullsToday')
    expect(body).toHaveProperty('pullsSeries')
    expect(Array.isArray(body.pullsSeries)).toBe(true)
  })

  it('GET /admin/stats — retourne distribution + top cards + top users', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/stats', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('rarityDistribution')
    expect(body).toHaveProperty('topCards')
    expect(body).toHaveProperty('topUsers')
  })
})
```

- [ ] **Step 3: Lancer tous les tests admin**

```bash
cd back && npm test -- --testPathPattern=admin
```

Expected: tous les tests passent.

- [ ] **Step 4: Lint final**

```bash
cd back && npm run lint
```

Expected: aucune erreur Biome.

- [ ] **Step 5: Commit final Plan 6**

```bash
cd back && git add src/main/interfaces/http/fastify/routes/admin/ src/test/e2e/admin/
git commit -m "feat(admin): dashboard + stats routes with raw SQL aggregation — plan 6 complete"
```
