# Scoring System & Team Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable point system to rank team members on the team page and update the global team leaderboard to use scores instead of collection percentages.

**Architecture:** On-the-fly score calculation at request time, no materialized scores. A singleton `ScoringConfig` DB row stores rarity point values and variant multipliers, editable from the admin panel. The team ranking endpoint paginates sorted scores; the frontend uses infinite scroll.

**Tech Stack:** Prisma, Fastify, Zod v4, Jest, React, TanStack Query v5, TanStack Router, TailwindCSS

---

## File Structure

**New files:**
- `back/prisma/schema.prisma` — add `ScoringConfig` model (modify existing)
- `back/src/main/types/infra/orm/repositories/scoring-config.repository.interface.ts`
- `back/src/main/infra/orm/repositories/scoring-config.repository.ts`
- `back/src/main/domain/scoring/scoring.domain.ts`
- `back/src/main/interfaces/http/fastify/routes/admin/scoring-config.router.ts`
- `back/src/test/unit/scoring.domain.test.ts`
- `back/src/test/e2e/admin/admin-scoring-config.test.ts`
- `back/src/test/e2e/teams/team-ranking.test.ts`
- `front/src/api/admin-scoring.api.ts`
- `front/src/queries/useScoring.ts`
- `front/src/routes/_admin/admin.scoring.tsx`

**Modified files:**
- `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` — register `ScoringConfigRepository`
- `back/src/main/types/application/ioc.ts` — add `scoringConfigRepository` property
- `back/src/main/interfaces/http/fastify/routes/admin/index.ts` — register scoring-config router
- `back/src/main/interfaces/http/fastify/routes/teams/index.ts` — add ranking route
- `back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts` — replace avgPercentage with avgScore
- `front/src/api/teams.api.ts` — add `RankedMember`, `TeamRankingPage`, `getTeamRanking`
- `front/src/queries/useTeams.ts` — add `useTeamRanking`
- `front/src/routes/_authenticated/teams/$id.tsx` — add Classement section
- `front/src/api/leaderboard.api.ts` — `avgPercentage` → `avgScore`
- `front/src/routes/_authenticated/leaderboard.tsx` — update TeamRow display
- `front/src/routes/_admin.tsx` — add Scoring nav item

---

## Task 1: Add ScoringConfig to Prisma schema and run migration

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Add the model to schema.prisma**

  Open `back/prisma/schema.prisma` and add this model at the end of the file:

  ```prisma
  model ScoringConfig {
    id                    String   @id @default("singleton")
    commonPoints          Int      @default(1)
    uncommonPoints        Int      @default(3)
    rarePoints            Int      @default(8)
    epicPoints            Int      @default(20)
    legendaryPoints       Int      @default(50)
    brilliantMultiplier   Float    @default(1.5)
    holographicMultiplier Float    @default(2.0)
    updatedAt             DateTime @updatedAt
  }
  ```

- [ ] **Step 2: Run the migration**

  ```bash
  cd back && npx prisma migrate dev --name add-scoring-config
  ```

  Expected: `The following migration(s) have been created and applied from new schema changes: migrations/..._add_scoring_config`

- [ ] **Step 3: Regenerate the Prisma client**

  ```bash
  npx prisma generate
  ```

  Expected: `Generated Prisma Client` — the types `ScoringConfig`, `CardRarity`, `CardVariant` are now available from `../../generated/client` (relative to files in `src/main/`).

- [ ] **Step 4: Commit**

  ```bash
  git add back/prisma/schema.prisma back/prisma/migrations/
  git commit -m "feat: add ScoringConfig Prisma model"
  ```

---

## Task 2: calculateUserScore domain function (TDD)

**Files:**
- Create: `back/src/main/domain/scoring/scoring.domain.ts`
- Create: `back/src/test/unit/scoring.domain.test.ts`

- [ ] **Step 1: Write the failing unit test**

  Create `back/src/test/unit/scoring.domain.test.ts`:

  ```typescript
  import { describe, expect, it } from '@jest/globals'
  import type { ScoringConfig, CardRarity, CardVariant } from '../../generated/client'
  import { calculateUserScore } from '../../main/domain/scoring/scoring.domain'

  const defaultConfig: ScoringConfig = {
    id: 'singleton',
    commonPoints: 1,
    uncommonPoints: 3,
    rarePoints: 8,
    epicPoints: 20,
    legendaryPoints: 50,
    brilliantMultiplier: 1.5,
    holographicMultiplier: 2.0,
    updatedAt: new Date(),
  }

  const card = (rarity: CardRarity) => ({ rarity })

  describe('calculateUserScore', () => {
    it('returns 0 for empty collection', () => {
      expect(calculateUserScore([], defaultConfig)).toBe(0)
    })

    it('scores a single COMMON NORMAL card', () => {
      const cards = [{ card: card('COMMON'), variant: 'NORMAL' as CardVariant, quantity: 1 }]
      expect(calculateUserScore(cards, defaultConfig)).toBe(1)
    })

    it('scores a LEGENDARY NORMAL card', () => {
      const cards = [{ card: card('LEGENDARY'), variant: 'NORMAL' as CardVariant, quantity: 1 }]
      expect(calculateUserScore(cards, defaultConfig)).toBe(50)
    })

    it('applies BRILLIANT multiplier (1.5×)', () => {
      const cards = [{ card: card('RARE'), variant: 'BRILLIANT' as CardVariant, quantity: 1 }]
      expect(calculateUserScore(cards, defaultConfig)).toBe(12) // 8 * 1.5
    })

    it('applies HOLOGRAPHIC multiplier (2.0×)', () => {
      const cards = [{ card: card('EPIC'), variant: 'HOLOGRAPHIC' as CardVariant, quantity: 1 }]
      expect(calculateUserScore(cards, defaultConfig)).toBe(40) // 20 * 2.0
    })

    it('quantity > 1 is still counted once only', () => {
      const cards = [{ card: card('COMMON'), variant: 'NORMAL' as CardVariant, quantity: 5 }]
      expect(calculateUserScore(cards, defaultConfig)).toBe(1)
    })

    it('quantity = 0 is excluded (defensive guard)', () => {
      const cards = [{ card: card('LEGENDARY'), variant: 'NORMAL' as CardVariant, quantity: 0 }]
      expect(calculateUserScore(cards, defaultConfig)).toBe(0)
    })

    it('sums across multiple cards and variants', () => {
      const cards = [
        { card: card('COMMON'), variant: 'NORMAL' as CardVariant, quantity: 1 },   // 1
        { card: card('RARE'), variant: 'BRILLIANT' as CardVariant, quantity: 1 },   // 12
        { card: card('EPIC'), variant: 'HOLOGRAPHIC' as CardVariant, quantity: 1 }, // 40
      ]
      expect(calculateUserScore(cards, defaultConfig)).toBe(53)
    })
  })
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  cd back && pnpm run test:unit -- --testPathPattern=scoring.domain
  ```

  Expected: FAIL — `Cannot find module '../../main/domain/scoring/scoring.domain'`

- [ ] **Step 3: Implement calculateUserScore**

  Create `back/src/main/domain/scoring/scoring.domain.ts`:

  ```typescript
  import type { CardRarity, CardVariant, ScoringConfig } from '../../../generated/client'

  export function calculateUserScore(
    userCards: Array<{ card: { rarity: CardRarity }; variant: CardVariant; quantity: number }>,
    config: ScoringConfig,
  ): number {
    const rarityPoints: Record<CardRarity, number> = {
      COMMON: config.commonPoints,
      UNCOMMON: config.uncommonPoints,
      RARE: config.rarePoints,
      EPIC: config.epicPoints,
      LEGENDARY: config.legendaryPoints,
    }
    const variantMultiplier: Record<CardVariant, number> = {
      NORMAL: 1.0,
      BRILLIANT: config.brilliantMultiplier,
      HOLOGRAPHIC: config.holographicMultiplier,
    }

    let score = 0
    for (const uc of userCards) {
      if (uc.quantity >= 1) {
        score += rarityPoints[uc.card.rarity] * variantMultiplier[uc.variant]
      }
    }
    return score
  }
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  cd back && pnpm run test:unit -- --testPathPattern=scoring.domain
  ```

  Expected: PASS — 8 tests passing

- [ ] **Step 5: Commit**

  ```bash
  git add back/src/main/domain/scoring/scoring.domain.ts back/src/test/unit/scoring.domain.test.ts
  git commit -m "feat: add calculateUserScore domain function"
  ```

---

## Task 3: ScoringConfigRepository + interface + IoC wiring

**Files:**
- Create: `back/src/main/types/infra/orm/repositories/scoring-config.repository.interface.ts`
- Create: `back/src/main/infra/orm/repositories/scoring-config.repository.ts`
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`

- [ ] **Step 1: Create the repository interface**

  Create `back/src/main/types/infra/orm/repositories/scoring-config.repository.interface.ts`:

  ```typescript
  import type { ScoringConfig } from '../../../../generated/client'

  export interface IScoringConfigRepository {
    get(): Promise<ScoringConfig>
    upsert(data: Partial<Omit<ScoringConfig, 'id' | 'updatedAt'>>): Promise<ScoringConfig>
  }
  ```

- [ ] **Step 2: Create the repository implementation**

  Create `back/src/main/infra/orm/repositories/scoring-config.repository.ts`:

  ```typescript
  import type { ScoringConfig } from '../../../../generated/client'
  import type { IocContainer } from '../../../types/application/ioc'
  import type { IScoringConfigRepository } from '../../../types/infra/orm/repositories/scoring-config.repository.interface'
  import type { PostgresPrismaClient } from '../postgres-client'

  export class ScoringConfigRepository implements IScoringConfigRepository {
    readonly #prisma: PostgresPrismaClient

    constructor({ postgresOrm }: IocContainer) {
      this.#prisma = postgresOrm.prisma
    }

    async get(): Promise<ScoringConfig> {
      const existing = await this.#prisma.scoringConfig.findUnique({
        where: { id: 'singleton' },
      })
      if (existing) return existing
      return this.#prisma.scoringConfig.upsert({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton' },
      })
    }

    async upsert(
      data: Partial<Omit<ScoringConfig, 'id' | 'updatedAt'>>,
    ): Promise<ScoringConfig> {
      // Ensure the singleton row exists before updating
      await this.get()
      return this.#prisma.scoringConfig.update({
        where: { id: 'singleton' },
        data,
      })
    }
  }
  ```

- [ ] **Step 3: Add to IocContainer interface**

  Open `back/src/main/types/application/ioc.ts` and add an import (following the existing pattern — most repositories use their concrete class type here, not their interface):

  ```typescript
  import type { ScoringConfigRepository } from '../../infra/orm/repositories/scoring-config.repository'
  ```

  Then add to the `IocContainer` interface body (after `readonly invitationRepository: InvitationRepository`):

  ```typescript
  readonly scoringConfigRepository: ScoringConfigRepository
  ```

- [ ] **Step 4: Register in the Awilix container**

  Open `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` and add the import:

  ```typescript
  import { ScoringConfigRepository } from '../../../infra/orm/repositories/scoring-config.repository'
  ```

  Then add the registration inside the constructor (after `this.#reg('teamDomain', ...)`):

  ```typescript
  this.#reg('scoringConfigRepository', asClass(ScoringConfigRepository).singleton())
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  cd back && npx tsc --noEmit
  ```

  Expected: no errors

- [ ] **Step 6: Commit**

  ```bash
  git add back/src/main/types/infra/orm/repositories/scoring-config.repository.interface.ts \
          back/src/main/infra/orm/repositories/scoring-config.repository.ts \
          back/src/main/types/application/ioc.ts \
          back/src/main/application/ioc/awilix/awilix-ioc-container.ts
  git commit -m "feat: add ScoringConfigRepository and IoC wiring"
  ```

---

## Task 4: Admin scoring-config router + integration test (TDD)

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/admin/scoring-config.router.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/index.ts`
- Create: `back/src/test/e2e/admin/admin-scoring-config.test.ts`

- [ ] **Step 1: Write the failing e2e test**

  Create `back/src/test/e2e/admin/admin-scoring-config.test.ts`:

  ```typescript
  import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
  import { buildTestApp } from '../../helpers/build-test-app'

  describe('Admin scoring-config routes', () => {
    let app: Awaited<ReturnType<typeof buildTestApp>>
    let adminCookies: string

    const suffix = Date.now()

    beforeAll(async () => {
      app = await buildTestApp()
      // Register a user
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: `scoring${suffix}`,
          email: `scoring${suffix}@test.com`,
          password: 'Password123!',
        },
      })
      expect(res.statusCode).toBe(201)
      // Elevate to SUPER_ADMIN
      await (app as any).iocContainer.postgresOrm.prisma.user.update({
        where: { email: `scoring${suffix}@test.com` },
        data: { role: 'SUPER_ADMIN' },
      })
      // Re-login to get a JWT with the SUPER_ADMIN role
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: `scoring${suffix}@test.com`, password: 'Password123!' },
      })
      adminCookies = loginRes.headers['set-cookie'] as string
    })

    afterAll(async () => { await app.close() })

    it('GET /admin/scoring-config — returns default config', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/scoring-config',
        headers: { cookie: adminCookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.commonPoints).toBe(1)
      expect(body.uncommonPoints).toBe(3)
      expect(body.rarePoints).toBe(8)
      expect(body.epicPoints).toBe(20)
      expect(body.legendaryPoints).toBe(50)
      expect(body.brilliantMultiplier).toBe(1.5)
      expect(body.holographicMultiplier).toBe(2.0)
    })

    it('PUT /admin/scoring-config — updates values', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/admin/scoring-config',
        headers: { cookie: adminCookies },
        payload: {
          commonPoints: 2,
          uncommonPoints: 5,
          rarePoints: 10,
          epicPoints: 25,
          legendaryPoints: 60,
          brilliantMultiplier: 2.0,
          holographicMultiplier: 3.0,
        },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.commonPoints).toBe(2)
      expect(body.legendaryPoints).toBe(60)
      expect(body.holographicMultiplier).toBe(3.0)
    })

    it('PUT /admin/scoring-config — rejects negative int', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/admin/scoring-config',
        headers: { cookie: adminCookies },
        payload: {
          commonPoints: -1,
          uncommonPoints: 3,
          rarePoints: 8,
          epicPoints: 20,
          legendaryPoints: 50,
          brilliantMultiplier: 1.5,
          holographicMultiplier: 2.0,
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('PUT /admin/scoring-config — rejects multiplier below 1.0', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/admin/scoring-config',
        headers: { cookie: adminCookies },
        payload: {
          commonPoints: 1,
          uncommonPoints: 3,
          rarePoints: 8,
          epicPoints: 20,
          legendaryPoints: 50,
          brilliantMultiplier: 0.5,
          holographicMultiplier: 2.0,
        },
      })
      expect(res.statusCode).toBe(400)
    })

    it('GET /admin/scoring-config — returns 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/admin/scoring-config' })
      expect(res.statusCode).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  cd back && pnpm run test:e2e -- --testPathPattern=admin-scoring-config
  ```

  Expected: FAIL — `expected 200, received 404`

- [ ] **Step 3: Create the admin scoring-config router**

  Create `back/src/main/interfaces/http/fastify/routes/admin/scoring-config.router.ts`:

  ```typescript
  import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
  import { z } from 'zod/v4'

  const scoringConfigBodySchema = z.object({
    commonPoints: z.number().int().min(0),
    uncommonPoints: z.number().int().min(0),
    rarePoints: z.number().int().min(0),
    epicPoints: z.number().int().min(0),
    legendaryPoints: z.number().int().min(0),
    brilliantMultiplier: z.number().min(1.0),
    holographicMultiplier: z.number().min(1.0),
  })

  export const adminScoringConfigRouter: FastifyPluginCallbackZod = (fastify) => {
    const { scoringConfigRepository } = fastify.iocContainer

    // GET /admin/scoring-config
    fastify.get('/', async () => {
      return await scoringConfigRepository.get()
    })

    // PUT /admin/scoring-config — all 7 fields required
    fastify.put(
      '/',
      { schema: { body: scoringConfigBodySchema } },
      async (request) => {
        return await scoringConfigRepository.upsert(request.body)
      },
    )
  }
  ```

- [ ] **Step 4: Register the router in admin/index.ts**

  Open `back/src/main/interfaces/http/fastify/routes/admin/index.ts` and add:

  ```typescript
  import { adminScoringConfigRouter } from './scoring-config.router'
  ```

  Then inside `adminRouter`, after the last `await fastify.register(...)` call, add:

  ```typescript
  await fastify.register(adminScoringConfigRouter, { prefix: '/scoring-config' })
  ```

- [ ] **Step 5: Run the test to confirm it passes**

  ```bash
  cd back && pnpm run test:e2e -- --testPathPattern=admin-scoring-config
  ```

  Expected: PASS — 5 tests passing

- [ ] **Step 6: Commit**

  ```bash
  git add back/src/main/interfaces/http/fastify/routes/admin/scoring-config.router.ts \
          back/src/main/interfaces/http/fastify/routes/admin/index.ts \
          back/src/test/e2e/admin/admin-scoring-config.test.ts
  git commit -m "feat: add admin scoring-config GET/PUT routes"
  ```

---

## Task 5: Team ranking route + integration test (TDD)

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/teams/index.ts`
- Create: `back/src/test/e2e/teams/team-ranking.test.ts`

- [ ] **Step 1: Write the failing e2e test**

  Create `back/src/test/e2e/teams/team-ranking.test.ts`:

  ```typescript
  import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
  import { buildTestApp } from '../../helpers/build-test-app'

  describe('GET /teams/:id/ranking', () => {
    let app: Awaited<ReturnType<typeof buildTestApp>>
    let ownerCookies: string
    let memberCookies: string
    let outsiderCookies: string
    let teamId: string

    const suffix = Date.now()

    beforeAll(async () => {
      app = await buildTestApp()
      const prisma = (app as any).iocContainer.postgresOrm.prisma

      // Register owner
      const ownerReg = await app.inject({
        method: 'POST', url: '/auth/register',
        payload: { username: `rankowner${suffix}`, email: `rankowner${suffix}@test.com`, password: 'Password123!' },
      })
      expect(ownerReg.statusCode).toBe(201)
      ownerCookies = ownerReg.headers['set-cookie'] as string

      // Register member
      const memberReg = await app.inject({
        method: 'POST', url: '/auth/register',
        payload: { username: `rankmember${suffix}`, email: `rankmember${suffix}@test.com`, password: 'Password123!' },
      })
      expect(memberReg.statusCode).toBe(201)
      memberCookies = memberReg.headers['set-cookie'] as string

      // Register outsider (not in team)
      const outsiderReg = await app.inject({
        method: 'POST', url: '/auth/register',
        payload: { username: `rankout${suffix}`, email: `rankout${suffix}@test.com`, password: 'Password123!' },
      })
      expect(outsiderReg.statusCode).toBe(201)
      outsiderCookies = outsiderReg.headers['set-cookie'] as string

      // Create team as owner
      const teamRes = await app.inject({
        method: 'POST', url: '/teams',
        headers: { cookie: ownerCookies },
        payload: { name: `RankTeam${suffix}` },
      })
      expect(teamRes.statusCode).toBe(201)
      teamId = teamRes.json().id

      // Invite member and accept
      const invRes = await app.inject({
        method: 'POST', url: `/teams/${teamId}/invite`,
        headers: { cookie: ownerCookies },
        payload: { username: `rankmember${suffix}` },
      })
      expect(invRes.statusCode).toBe(201)
      const token = invRes.json().token
      await app.inject({
        method: 'POST', url: `/invitations/${token}/accept`,
        headers: { cookie: memberCookies },
      })

      // Give the owner a LEGENDARY card to ensure they score higher
      const owner = await prisma.user.findUnique({ where: { email: `rankowner${suffix}@test.com` } })
      const set = await prisma.cardSet.create({ data: { name: `RankSet${suffix}`, isActive: true } })
      const card = await prisma.card.create({
        data: { name: `RankCard${suffix}`, rarity: 'LEGENDARY', setId: set.id },
      })
      await prisma.userCard.upsert({
        where: { userId_cardId_variant: { userId: owner.id, cardId: card.id, variant: 'NORMAL' } },
        update: {},
        create: { userId: owner.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
    })

    afterAll(async () => { await app.close() })

    it('returns ranked members with scores', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/ranking`,
        headers: { cookie: ownerCookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty('members')
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('page')
      expect(body).toHaveProperty('totalPages')
      expect(body.members.length).toBeGreaterThan(0)
      const first = body.members[0]
      expect(first).toHaveProperty('rank')
      expect(first).toHaveProperty('score')
      expect(first).toHaveProperty('role')
      expect(first.user).toHaveProperty('username')
    })

    it('owner ranks first (has the LEGENDARY card)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/ranking`,
        headers: { cookie: ownerCookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.members[0].score).toBeGreaterThan(body.members[body.members.length - 1].score)
    })

    it('pagination metadata is correct', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/ranking?page=1&limit=1`,
        headers: { cookie: ownerCookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.members).toHaveLength(1)
      expect(body.total).toBe(2) // owner + member
      expect(body.totalPages).toBe(2)
      expect(body.page).toBe(1)
    })

    it('returns 403 for a non-member', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/ranking`,
        headers: { cookie: outsiderCookies },
      })
      expect(res.statusCode).toBe(403)
    })
  })
  ```

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  cd back && pnpm run test:e2e -- --testPathPattern=team-ranking
  ```

  Expected: FAIL — `expected 200, received 404`

- [ ] **Step 3: Add the ranking route to teamsRouter**

  Open `back/src/main/interfaces/http/fastify/routes/teams/index.ts`.

  At the top of the `teamsRouter` function body, the existing code is:
  ```typescript
  const { teamDomain } = fastify.iocContainer
  ```

  Change it to also destructure `scoringConfigRepository` and add `prisma`:
  ```typescript
  const { teamDomain, scoringConfigRepository } = fastify.iocContainer
  const prisma = fastify.iocContainer.postgresOrm.prisma
  ```

  Add this route anywhere inside the `teamsRouter` body (e.g., after the `DELETE /teams/:id` route):

  ```typescript
  // GET /teams/:id/ranking — classement des membres
  fastify.get(
    '/teams/:id/ranking',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
      },
    },
    async (request) => {
      const { id } = request.params
      const { page, limit } = request.query

      // teamDomain.getTeam throws Boom.forbidden (403) if requester is not a member
      const team = await teamDomain.getTeam(id, request.user.userID)
      const config = await scoringConfigRepository.get()

      const memberIds = team.members.map((m) => m.userId)

      // Single bulk fetch — avoids N+1
      const allUserCards = await prisma.userCard.findMany({
        where: { userId: { in: memberIds } },
        select: {
          userId: true,
          variant: true,
          quantity: true,
          card: { select: { rarity: true } },
        },
      })

      // Partition by userId in memory
      const cardsByUser = new Map<string, typeof allUserCards>()
      for (const uc of allUserCards) {
        const list = cardsByUser.get(uc.userId) ?? []
        list.push(uc)
        cardsByUser.set(uc.userId, list)
      }

      // Score + sort (desc score, then asc username for stable pagination)
      const scored = team.members
        .map((m) => ({
          member: m,
          score: calculateUserScore(cardsByUser.get(m.userId) ?? [], config),
        }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return (a.member.user?.username ?? '').localeCompare(b.member.user?.username ?? '')
        })

      const total = scored.length
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit
      const paginated = scored.slice(offset, offset + limit)

      return {
        members: paginated.map((entry, i) => ({
          rank: offset + i + 1,
          user: entry.member.user
            ? { id: entry.member.user.id, username: entry.member.user.username, avatar: entry.member.user.avatar }
            : { id: entry.member.userId, username: 'Unknown', avatar: null },
          role: entry.member.role,
          score: entry.score,
        })),
        total,
        page,
        totalPages,
      }
    },
  )
  ```

  Also add the import for `calculateUserScore` at the top of the file:

  ```typescript
  import { calculateUserScore } from '../../../../domain/scoring/scoring.domain'
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  cd back && pnpm run test:e2e -- --testPathPattern=team-ranking
  ```

  Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

  ```bash
  git add back/src/main/interfaces/http/fastify/routes/teams/index.ts \
          back/src/test/e2e/teams/team-ranking.test.ts
  git commit -m "feat: add GET /teams/:id/ranking endpoint"
  ```

---

## Task 6: Leaderboard migration (avgPercentage → avgScore)

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts`

> Note: Check if there is an existing leaderboard e2e test at `back/src/test/e2e/` — if one exists, update it to expect `avgScore` instead of `avgPercentage`. If not, no new test is needed here (the leaderboard route has no dedicated e2e test in this codebase).

- [ ] **Step 1: Check for existing leaderboard test**

  ```bash
  ls back/src/test/e2e/ | grep leaderboard
  ```

  If a test file exists, open it and replace all `avgPercentage` references with `avgScore`.

- [ ] **Step 2: Modify the leaderboard route handler**

  Open `back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts`.

  At the top of the file, add the import:
  ```typescript
  import { calculateUserScore } from '../../../../../domain/scoring/scoring.domain'
  ```

  The file has this structure (plugin-scope code, before any route definition):
  ```typescript
  export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
    const { postgresOrm } = fastify.iocContainer
    const prisma = postgresOrm.prisma

    fastify.get('/leaderboard', { ... }, async () => {
      // handler body here
      const totalCards = await prisma.card.count(...)
      ...
    })
  }
  ```

  Change the plugin-scope destructure (the `const { postgresOrm }` line, which is **outside** the handler) to also include `scoringConfigRepository`:
  ```typescript
  const { postgresOrm, scoringConfigRepository } = fastify.iocContainer
  ```

  Then, **inside the async handler body** (as the first line after the opening `async () => {`), add:
  ```typescript
  const config = await scoringConfigRepository.get()
  ```

  This must be inside the async handler — `await` is not valid at plugin scope (the outer function is sync).

  Find the `// Classement 3 : meilleures équipes` section. The current `teams` query is:
  ```typescript
  const teams = await prisma.team.findMany({
    include: {
      members: { select: { userId: true } },
      _count: { select: { members: true } },
    },
    take: 20,
  })
  ```
  Keep this exactly as-is.

  Replace everything from `// Pré-fetch des IDs de cartes actives` down to and including the `bestTeams` definition with:

  ```typescript
  // Bulk fetch all user cards for all team members at once (avoids N+1)
  const allMemberIds = [...new Set(teams.flatMap((t) => t.members.map((m) => m.userId)))]
  const allUserCards = await prisma.userCard.findMany({
    where: { userId: { in: allMemberIds } },
    select: {
      userId: true,
      variant: true,
      quantity: true,
      card: { select: { rarity: true } },
    },
  })
  const cardsByUser = new Map<string, typeof allUserCards>()
  for (const uc of allUserCards) {
    const list = cardsByUser.get(uc.userId) ?? []
    list.push(uc)
    cardsByUser.set(uc.userId, list)
  }

  const teamScores = teams.map((team) => {
    const memberIds = team.members.map((m) => m.userId)
    const avgScore =
      memberIds.length > 0
        ? Math.round(
            memberIds.reduce(
              (sum, uid) => sum + calculateUserScore(cardsByUser.get(uid) ?? [], config),
              0,
            ) / memberIds.length,
          )
        : 0
    return { team, avgScore }
  })

  const bestTeams = teamScores
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)
    .map((entry, i) => ({
      rank: i + 1,
      team: {
        id: entry.team.id,
        name: entry.team.name,
        slug: entry.team.slug,
        memberCount: entry.team._count.members,
      },
      avgScore: entry.avgScore,
    }))
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  cd back && npx tsc --noEmit
  ```

  Expected: no errors

- [ ] **Step 4: Run all backend tests**

  ```bash
  cd back && pnpm run test
  ```

  Expected: all tests pass

- [ ] **Step 5: Commit**

  ```bash
  git add back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts
  git commit -m "feat: replace avgPercentage with avgScore in leaderboard"
  ```

---

## Task 7: Frontend API clients

**Files:**
- Create: `front/src/api/admin-scoring.api.ts`
- Modify: `front/src/api/teams.api.ts`

- [ ] **Step 1: Create admin-scoring.api.ts**

  Create `front/src/api/admin-scoring.api.ts`:

  ```typescript
  import { apiUrl } from '../constants/config.constant.ts'
  import { handleHttpError } from '../libs/httpErrorHandler.ts'
  import { fetchWithAuth } from './fetchWithAuth.ts'

  export type ScoringConfig = {
    commonPoints: number
    uncommonPoints: number
    rarePoints: number
    epicPoints: number
    legendaryPoints: number
    brilliantMultiplier: number
    holographicMultiplier: number
  }

  export const AdminScoringApi = {
    getConfig: async (): Promise<ScoringConfig> => {
      const res = await fetchWithAuth(`${apiUrl}/admin/scoring-config`)
      if (!res.ok) {
        handleHttpError(res, {}, 'Erreur lors de la récupération de la config de scoring')
      }
      return res.json()
    },

    updateConfig: async (data: ScoringConfig): Promise<ScoringConfig> => {
      const res = await fetchWithAuth(`${apiUrl}/admin/scoring-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        handleHttpError(res, {}, 'Erreur lors de la mise à jour de la config de scoring')
      }
      return res.json()
    },
  }
  ```

- [ ] **Step 2: Add ranking types and function to teams.api.ts**

  Open `front/src/api/teams.api.ts`. Add these types after the existing `Invitation` type (around line 32):

  ```typescript
  export type RankedMember = {
    rank: number
    user: { id: string; username: string; avatar: string | null }
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
    score: number
  }

  export type TeamRankingPage = {
    members: RankedMember[]
    total: number
    page: number
    totalPages: number
  }
  ```

  Then add the function to the `TeamsApi` object (after the last existing function):

  ```typescript
  getTeamRanking: async (
    teamId: string,
    page: number,
    limit = 20,
  ): Promise<TeamRankingPage> => {
    const res = await fetchWithAuth(
      `${apiUrl}/teams/${teamId}/ranking?page=${page}&limit=${limit}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du classement')
    }
    return res.json()
  },
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add front/src/api/admin-scoring.api.ts front/src/api/teams.api.ts
  git commit -m "feat: add admin-scoring and team ranking API clients"
  ```

---

## Task 8: Frontend queries

**Files:**
- Create: `front/src/queries/useScoring.ts`
- Modify: `front/src/queries/useTeams.ts`

- [ ] **Step 1: Create useScoring.ts**

  Create `front/src/queries/useScoring.ts`:

  ```typescript
  import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

  import { AdminScoringApi } from '../api/admin-scoring.api.ts'
  import type { ScoringConfig } from '../api/admin-scoring.api.ts'

  export type { ScoringConfig } from '../api/admin-scoring.api.ts'

  export const useScoringConfig = () =>
    useQuery({
      queryKey: ['admin', 'scoringConfig'],
      queryFn: () => AdminScoringApi.getConfig(),
    })

  export const useUpdateScoringConfig = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (data: ScoringConfig) => AdminScoringApi.updateConfig(data),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['admin', 'scoringConfig'] })
        // Scoring config changes affect leaderboard team scores
        qc.invalidateQueries({ queryKey: ['leaderboard'] })
      },
    })
  }
  ```

- [ ] **Step 2: Add useTeamRanking to useTeams.ts**

  Open `front/src/queries/useTeams.ts`. Add the `useInfiniteQuery` import to the existing import line:

  ```typescript
  import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
  ```

  Also add the type imports near the top:
  ```typescript
  import type { TeamRankingPage } from '../api/teams.api.ts'
  ```

  Then add this function at the end of the file:

  ```typescript
  export const useTeamRanking = (teamId: string) =>
    useInfiniteQuery({
      queryKey: ['teamRanking', teamId],
      queryFn: ({ pageParam }) => TeamsApi.getTeamRanking(teamId, pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage: TeamRankingPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      enabled: !!teamId,
    })
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add front/src/queries/useScoring.ts front/src/queries/useTeams.ts
  git commit -m "feat: add useScoringConfig, useUpdateScoringConfig, useTeamRanking queries"
  ```

---

## Task 9: Admin scoring page + nav item

**Files:**
- Create: `front/src/routes/_admin/admin.scoring.tsx`
- Modify: `front/src/routes/_admin.tsx`

- [ ] **Step 1: Create the admin scoring page**

  Create `front/src/routes/_admin/admin.scoring.tsx`:

  ```typescript
  import { createFileRoute } from '@tanstack/react-router'
  import { useEffect, useState } from 'react'

  import { Button } from '../../components/ui/button'
  import { Input } from '../../components/ui/input'
  import { Label } from '../../components/ui/label.tsx'
  import type { ScoringConfig } from '../../queries/useScoring'
  import { useScoringConfig, useUpdateScoringConfig } from '../../queries/useScoring'

  export const Route = createFileRoute('/_admin/admin/scoring')({
    component: AdminScoringPage,
  })

  const RARITY_FIELDS: { key: keyof ScoringConfig; label: string }[] = [
    { key: 'commonPoints', label: '⬜ Commun' },
    { key: 'uncommonPoints', label: '🟩 Peu commun' },
    { key: 'rarePoints', label: '🔷 Rare' },
    { key: 'epicPoints', label: '🟣 Épique' },
    { key: 'legendaryPoints', label: '🌟 Légendaire' },
  ]

  const MULTIPLIER_FIELDS: { key: keyof ScoringConfig; label: string }[] = [
    { key: 'brilliantMultiplier', label: '☀️ Multiplicateur Brillant' },
    { key: 'holographicMultiplier', label: '🌊 Multiplicateur Holographique' },
  ]

  function AdminScoringPage() {
    const { data, isLoading } = useScoringConfig()
    const update = useUpdateScoringConfig()
    const [draft, setDraft] = useState<ScoringConfig | null>(null)

    useEffect(() => {
      if (data && !draft) setDraft(data)
    }, [data, draft])

    if (isLoading || !draft) {
      return (
        <div className="flex h-64 items-center justify-center text-text-light">
          Chargement…
        </div>
      )
    }

    const handleSave = () => {
      update.mutate(draft)
    }

    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-text">Scoring — Configuration</h1>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </div>

        <div className="max-w-md space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
              Points par rareté
            </p>
            <div className="space-y-3">
              {RARITY_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-semibold text-text">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={draft[key] as number}
                    onChange={(e) =>
                      setDraft((d) => d ? { ...d, [key]: Number(e.target.value) } : d)
                    }
                    className="w-24 text-right"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
              Multiplicateurs de variante
            </p>
            <div className="space-y-3">
              {MULTIPLIER_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-semibold text-text">{label}</Label>
                  <Input
                    type="number"
                    min={1.0}
                    step={0.1}
                    value={draft[key] as number}
                    onChange={(e) =>
                      setDraft((d) => d ? { ...d, [key]: Number(e.target.value) } : d)
                    }
                    className="w-24 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Add the nav item to _admin.tsx**

  Open `front/src/routes/_admin.tsx`.

  Add `Trophy` to the existing lucide-react import line (it is already imported in `leaderboard.tsx` — verify the exact icon you want; `Trophy` works well):

  ```typescript
  import {
    ArrowLeft,
    BarChart2,
    ChevronRight,
    Images,
    LayoutDashboard,
    Package,
    Settings,
    ShoppingBag,
    Trophy,
    Users,
    Zap,
  } from 'lucide-react'
  ```

  Add to `NAV_ITEMS` array (after the `Améliorations` entry):

  ```typescript
  { to: '/admin/scoring', label: 'Scoring', icon: Trophy },
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add front/src/routes/_admin/admin.scoring.tsx front/src/routes/_admin.tsx
  git commit -m "feat: add admin scoring config page and nav item"
  ```

---

## Task 10: Team detail page — Classement section

**Files:**
- Modify: `front/src/routes/_authenticated/teams/$id.tsx`

- [ ] **Step 1: Add the Classement section to the team page**

  Open `front/src/routes/_authenticated/teams/$id.tsx`.

  Add the import for `useTeamRanking` to the existing query import:

  ```typescript
  import {
    useDeleteTeam,
    useRemoveMember,
    useTeam,
    useTeamRanking,
  } from '../../../queries/useTeams.ts'
  ```

  Also add React's `useEffect` and `useRef` imports:

  ```typescript
  import { useEffect, useRef } from 'react'
  ```

  Inside `TeamDetailPage`, after the existing hooks, add:

  ```typescript
  const { data: rankingPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useTeamRanking(id)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const rankedMembers = rankingPages?.pages.flatMap((p) => p.members) ?? []
  ```

  Inside the returned JSX, after the closing `</div>` of the `Membres` section (around line 91), add:

  ```tsx
  <div className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-3 text-sm font-bold text-text">Classement</h2>
    {rankedMembers.length === 0 ? (
      <p className="text-sm text-text-light">Aucun score pour l'instant.</p>
    ) : (
      <ul className="space-y-1">
        {rankedMembers.map((entry) => (
          <li
            key={`${entry.rank}-${entry.user.id}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-background"
          >
            <span className="w-6 text-center text-xs font-black text-text-light">
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
            </span>
            <div className="flex-1 text-sm font-semibold text-text">
              {entry.user.username}
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {entry.role}
            </span>
            <span className="text-sm font-bold text-text">
              {entry.score.toLocaleString()} pts
            </span>
          </li>
        ))}
      </ul>
    )}
    <div ref={sentinelRef} className="h-1" />
    {isFetchingNextPage && (
      <div className="flex justify-center py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )}
  </div>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add front/src/routes/_authenticated/teams/'$id.tsx'
  git commit -m "feat: add Classement section with infinite scroll to team page"
  ```

---

## Task 11: Leaderboard frontend update (avgPercentage → avgScore)

**Files:**
- Modify: `front/src/api/leaderboard.api.ts`
- Modify: `front/src/routes/_authenticated/leaderboard.tsx`

- [ ] **Step 1: Update the TeamEntry type in leaderboard.api.ts**

  Open `front/src/api/leaderboard.api.ts`. Find:

  ```typescript
  export type TeamEntry = {
    rank: number
    team: { id: string; name: string; slug: string; memberCount: number }
    avgPercentage: number
  }
  ```

  Replace with:

  ```typescript
  export type TeamEntry = {
    rank: number
    team: { id: string; name: string; slug: string; memberCount: number }
    avgScore: number
  }
  ```

- [ ] **Step 2: Update TeamRow in leaderboard.tsx**

  Open `front/src/routes/_authenticated/leaderboard.tsx`. Find (around line 201):

  ```tsx
  <p className="text-sm font-bold text-text">{entry.avgPercentage}%</p>
  ```

  Replace with:

  ```tsx
  <p className="text-sm font-bold text-text">{entry.avgScore.toLocaleString()} pts</p>
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  cd front && npx tsc --noEmit
  ```

  Expected: no errors

- [ ] **Step 4: Commit**

  ```bash
  git add front/src/api/leaderboard.api.ts front/src/routes/_authenticated/leaderboard.tsx
  git commit -m "feat: replace avgPercentage with avgScore in leaderboard frontend"
  ```

---

## Final verification

- [ ] **Run all backend tests**

  ```bash
  cd back && pnpm run test
  ```

  Expected: all tests pass (unit + e2e)

- [ ] **TypeScript check both packages**

  ```bash
  cd back && npx tsc --noEmit && cd ../front && npx tsc --noEmit
  ```

  Expected: no errors in either package
