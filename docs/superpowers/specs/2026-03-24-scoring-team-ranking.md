# Scoring System & Team Ranking — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a configurable point system to rank team members on the team page and update the global team leaderboard to use scores instead of collection percentages.

**Architecture:** On-the-fly score calculation at request time (no materialized scores). Config stored as a singleton DB row, editable from the admin panel. Pagination via `page`/`limit` query params on the team ranking endpoint; frontend uses infinite scroll with `useInfiniteQuery`.

**Tech Stack:** Prisma, Fastify, React Query, TanStack Router, TailwindCSS

---

## Data Model

### New Prisma model: `ScoringConfig`

Add to `schema.prisma`, then run `prisma migrate dev` and `prisma generate` before writing any code that imports from the generated client.

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

NORMAL variant uses an implicit multiplier of 1.0 (not stored).

### Scoring formula

The `UserCard` table has a `@@unique([userId, cardId, variant])` constraint, so there is at most one row per `[cardId, variant]` per user. Each row's `quantity` field counts duplicates. The scoring rule: **each `UserCard` row where `quantity >= 1` scores once.**

```
score += rarity_points[card.rarity] * variant_multiplier[variant]
```

- `quantity > 1` does not yield extra points — only counted once per row.
- A user owning the same card in NORMAL and HOLOGRAPHIC earns points for both rows separately.
- The `quantity >= 1` guard is a defensive safety net (rows with `quantity = 0` are an application-level anomaly).

---

## Backend

### Import paths

This project does **not** use `@prisma/client`. Generated types are imported from the local generated client:

```typescript
import type { ScoringConfig, CardRarity, CardVariant } from '../../../../generated/client'
```

Adjust the relative path depth per file location. The correct enum names are `CardRarity` (not `Rarity`) and `CardVariant`.

### New files

**`back/src/main/infra/orm/repositories/scoring-config.repository.ts`**
- `get()`: `findUnique` by `id = "singleton"`, upsert with defaults if not found
- `upsert(data)`: update the singleton row

**`back/src/main/types/infra/orm/repositories/scoring-config.repository.interface.ts`**
```typescript
import type { ScoringConfig } from '../../../../generated/client'

export interface IScoringConfigRepository {
  get(): Promise<ScoringConfig>
  upsert(data: Partial<Omit<ScoringConfig, 'id' | 'updatedAt'>>): Promise<ScoringConfig>
}
```

**`back/src/main/domain/scoring/scoring.domain.ts`**

Pure function, no I/O. Each element in the input array is already a unique `[cardId, variant]` pair (enforced by DB constraint).

```typescript
import type { ScoringConfig, CardRarity, CardVariant } from '../../../../generated/client'

export function calculateUserScore(
  userCards: Array<{ card: { rarity: CardRarity }; variant: CardVariant; quantity: number }>,
  config: ScoringConfig
): number
```

### IoC wiring

**`back/src/main/application/ioc/awilix/awilix-ioc-container.ts`**

```typescript
import { ScoringConfigRepository } from '../../../infra/orm/repositories/scoring-config.repository'
// ...
this.#reg('scoringConfigRepository', asClass(ScoringConfigRepository).singleton())
```

**`back/src/main/types/application/ioc.ts`**

Use the interface type (consistent with `userRepository: UserRepositoryInterface`):

```typescript
import type { IScoringConfigRepository } from '../infra/orm/repositories/scoring-config.repository.interface'
// ...
readonly scoringConfigRepository: IScoringConfigRepository
```

### New routes

**`back/src/main/interfaces/http/fastify/routes/admin/scoring-config.router.ts`**

Use `FastifyPluginCallbackZod` (sync outer function, async route handlers — same pattern as all other admin sub-routers). Routes are at `/` — prefix `/scoring-config` is applied at registration time.

```typescript
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const scoringConfigBodySchema = z.object({
  commonPoints:          z.number().int().min(0),
  uncommonPoints:        z.number().int().min(0),
  rarePoints:            z.number().int().min(0),
  epicPoints:            z.number().int().min(0),
  legendaryPoints:       z.number().int().min(0),
  brilliantMultiplier:   z.number().min(1.0),
  holographicMultiplier: z.number().min(1.0),
})

export const adminScoringConfigRouter: FastifyPluginCallbackZod = (fastify) => {
  const { scoringConfigRepository } = fastify.iocContainer

  // GET /admin/scoring-config
  fastify.get('/', async () => {
    return await scoringConfigRepository.get()
    // Full Prisma ScoringConfig returned, including updatedAt; frontend type ignores updatedAt
  })

  // PUT /admin/scoring-config — all 7 fields required
  fastify.put('/', { schema: { body: scoringConfigBodySchema } }, async (request) => {
    return await scoringConfigRepository.upsert(request.body)
  })
}
```

**Registration — modify `back/src/main/interfaces/http/fastify/routes/admin/index.ts`:**

```typescript
import { adminScoringConfigRouter } from './scoring-config.router'
// ...
await fastify.register(adminScoringConfigRouter, { prefix: '/scoring-config' })
```

**New route added to `back/src/main/interfaces/http/fastify/routes/teams/index.ts`**

Add directly inside `teamsRouter`. `scoringConfigRepository` and `prisma` are accessed alongside the existing `teamDomain`:

```typescript
const { teamDomain, scoringConfigRepository } = fastify.iocContainer
const prisma = fastify.iocContainer.postgresOrm.prisma
```

Route: `GET /teams/:id/ranking`

- `onRequest: [fastify.verifySessionCookie]`
- `schema.params: z.object({ id: z.string().uuid() })`
- `schema.querystring: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })`
- Call `const team = await teamDomain.getTeam(request.params.id, request.user.userID)` — this throws `Boom.forbidden` (403) automatically if the requester is not a member, and returns `TeamWithMembers` where each member has `{ userId, role, user: { id, username, avatar } }` already populated (the team repository always includes user data via `include.members.include.user`)
- Fetch scoring config: `const config = await scoringConfigRepository.get()`
- Fetch all team members' user cards in a **single bulk query** (avoids N+1 per member):
  ```typescript
  const memberIds = team.members.map((m) => m.userId)
  const allUserCards = await prisma.userCard.findMany({
    where: { userId: { in: memberIds } },
    select: { userId: true, variant: true, quantity: true, card: { select: { rarity: true } } },
  })
  const cardsByUser = new Map<string, typeof allUserCards>()
  for (const uc of allUserCards) {
    const list = cardsByUser.get(uc.userId) ?? []
    list.push(uc)
    cardsByUser.set(uc.userId, list)
  }
  ```
- Compute score for each member: `calculateUserScore(cardsByUser.get(uid) ?? [], config)`
- Sort descending by score, then ascending by `username` as tiebreaker for stable pagination
- Paginate the sorted list using `page` and `limit`
- Response:
  ```typescript
  {
    members: Array<{
      rank: number
      user: { id: string; username: string; avatar: string | null }
      role: 'OWNER' | 'ADMIN' | 'MEMBER'
      score: number
    }>
    total: number
    page: number
    totalPages: number
  }
  ```

### Modified routes

**`back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts`**

Modify the `fastify.get('/leaderboard', ...)` handler. Replace the `bestTeams` block (`avgPercentage` → `avgScore`).

The current `prisma.userCard.groupBy` approach only returns counts. Switch to a **single bulk `findMany`** for all member IDs across all teams (replaces the per-team groupBy calls; the `take: 20` team pre-fetch limit is kept as-is, so at most 20 teams' worth of user cards are loaded):

```typescript
// At top of the /leaderboard handler:
const { scoringConfigRepository } = fastify.iocContainer
const config = await scoringConfigRepository.get()

// After teams are fetched, collect all unique member IDs
const allMemberIds = [...new Set(teams.flatMap((t) => t.members.map((m) => m.userId)))]

// Single bulk fetch — select only needed fields to minimize data transfer
const allUserCards = await prisma.userCard.findMany({
  where: { userId: { in: allMemberIds } },
  select: { userId: true, variant: true, quantity: true, card: { select: { rarity: true } } },
})
const cardsByUser = new Map<string, typeof allUserCards>()
for (const uc of allUserCards) {
  const list = cardsByUser.get(uc.userId) ?? []
  list.push(uc)
  cardsByUser.set(uc.userId, list)
}

// Replace the teamScores Promise.all block with synchronous mapping:
const teamScores = teams.map((team) => {
  const memberIds = team.members.map((m) => m.userId)
  const avgScore = memberIds.length > 0
    ? Math.round(
        memberIds.reduce((sum, uid) => sum + calculateUserScore(cardsByUser.get(uid) ?? [], config), 0)
        / memberIds.length
      )
    : 0
  return { team, avgScore }
})

const bestTeams = teamScores
  .sort((a, b) => b.avgScore - a.avgScore)
  .slice(0, 10)
  .map((entry, i) => ({
    rank: i + 1,
    team: { id: entry.team.id, name: entry.team.name, slug: entry.team.slug, memberCount: entry.team._count.members },
    avgScore: entry.avgScore,
  }))
```

Also remove the existing `activeCardIds` and `userCard.groupBy` per-team blocks — they are fully replaced.

Note: the existing `prisma.team.findMany` call already includes `members: { select: { userId: true } }` — no change needed to that part of the query.

This is a **breaking change** (`avgPercentage` → `avgScore`). Backend and frontend must deploy together.

---

## Frontend

The project separates admin API clients (`admin-*.api.ts`) from user-facing ones. Follow this convention:

### New files

**`front/src/api/admin-scoring.api.ts`** — admin-only

```typescript
export type ScoringConfig = {
  commonPoints: number
  uncommonPoints: number
  rarePoints: number
  epicPoints: number
  legendaryPoints: number
  brilliantMultiplier: number
  holographicMultiplier: number
  // updatedAt is present in the backend response but ignored in this type
}

export const getScoringConfig = (): Promise<ScoringConfig>
export const updateScoringConfig = (data: ScoringConfig): Promise<ScoringConfig>
// Sends all 7 fields (all required; backend validates all present)
```

**Add to `front/src/api/teams.api.ts`** — team ranking types and function

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

export const getTeamRanking = (teamId: string, page: number, limit?: number): Promise<TeamRankingPage>
```

**`front/src/queries/useScoring.ts`** — admin scoring config queries only

```typescript
// useScoringConfig — key: ['admin', 'scoringConfig']
// useUpdateScoringConfig — mutation, invalidates ['admin', 'scoringConfig'] AND ['leaderboard']
//   (scoring config changes affect leaderboard team scores)
```

**Add `useTeamRanking` to `front/src/queries/useTeams.ts`** — team queries belong here

```typescript
// useTeamRanking(teamId)
useInfiniteQuery({
  queryKey: ['teamRanking', teamId],
  queryFn: ({ pageParam }) => getTeamRanking(teamId, pageParam),
  initialPageParam: 1,  // required by TanStack Query v5
  getNextPageParam: (lastPage) =>
    lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
})
```

**`front/src/routes/_admin/admin.scoring.tsx`**

File naming follows `_admin/admin.*.tsx` convention (e.g., `admin.upgrades.tsx`).

- Form with 7 fields: 5 integer inputs (rarity points) + 2 float inputs (multipliers)
- Follows the same pattern as `admin.upgrades.tsx`
- Shows current values, save button, success/error toast

### Modified files

**`front/src/routes/_authenticated/teams/$id.tsx`**
- Add "Classement" section below the existing members list
- Uses `useTeamRanking(teamId)` with infinite scroll
  - 20 members per page
  - `IntersectionObserver` on a sentinel div triggers `fetchNextPage`
- Each row: rank number, avatar, username, role badge, score

**`front/src/api/leaderboard.api.ts`**
- `TeamEntry.avgPercentage: number` → `TeamEntry.avgScore: number`

**`front/src/routes/_authenticated/leaderboard.tsx`**
- In the `TeamRow` component (line ~201), replace `{entry.avgPercentage}%` with `{entry.avgScore.toLocaleString()}` (integer with thousand separator, no `%` suffix)

**`front/src/routes/_admin.tsx`** — `NAV_ITEMS` array

Add a new entry using a `LucideIcon` component reference (not a JSX element):
```typescript
import { Trophy } from 'lucide-react'
// ...
{ to: '/admin/scoring', label: 'Scoring', icon: Trophy }
```

---

## Error handling

- `PUT /admin/scoring-config`: all 7 fields required, Int `>= 0`, Float `>= 1.0` — return 400 with field errors
- `GET /teams/:id/ranking`: 403 thrown automatically by `teamDomain.getTeam()` for non-members
- `limit` query param capped at 100 server-side: `z.coerce.number().int().min(1).max(100).default(20)`
- If `ScoringConfig` row does not exist, `get()` upserts with defaults transparently

---

## Testing

- Unit test `calculateUserScore()`: zero cards, single card each variant, `quantity = 0` excluded (defensive guard), `quantity > 1` counted once, mixed rarities
- Integration test `GET /teams/:id/ranking`: correct score ordering, tiebreaker by username for equal scores, correct pagination metadata, 403 for non-members
- Integration test `PUT /admin/scoring-config`: negative int rejected, float `< 1.0` rejected, valid update accepted, missing field rejected
