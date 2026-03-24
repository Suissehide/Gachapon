# Scoring System & Team Ranking — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a configurable point system to rank team members on the team page and update the global team leaderboard to use scores instead of collection percentages.

**Architecture:** On-the-fly score calculation at request time (no materialized scores). Config stored as a singleton DB row, editable from the admin panel. Pagination via `page`/`limit` query params on the team ranking endpoint; frontend uses infinite scroll with `useInfiniteQuery`.

**Tech Stack:** Prisma, Fastify, React Query, TanStack Router, TailwindCSS

---

## Data Model

### New Prisma model: `ScoringConfig`

Singleton table (always exactly one row, upserted on first access).

```prisma
model ScoringConfig {
  id                    String @id @default("singleton")
  commonPoints          Int    @default(1)
  uncommonPoints        Int    @default(3)
  rarePoints            Int    @default(8)
  epicPoints            Int    @default(20)
  legendaryPoints       Int    @default(50)
  brilliantMultiplier   Float  @default(1.5)
  holographicMultiplier Float  @default(2.0)
  updatedAt             DateTime @updatedAt
}
```

NORMAL variant uses an implicit multiplier of 1.0 (not stored).

### Scoring formula

For each unique `[cardId, variant]` pair in a user's collection where `quantity >= 1`:

```
score += rarity_points[card.rarity] * variant_multiplier[variant]
```

Duplicates (quantity > 1 of the same `[cardId, variant]`) are ignored — only counted once.

A user owning the same card in NORMAL and HOLOGRAPHIC earns points for both entries separately.

---

## Backend

### New files

**`back/src/main/types/infra/orm/repositories/scoring-config.repository.interface.ts`**
```typescript
export interface IScoringConfigRepository {
  get(): Promise<ScoringConfig>
  upsert(data: Partial<ScoringConfig>): Promise<ScoringConfig>
}
```

**`back/src/main/infra/orm/repositories/scoring-config.repository.ts`**
- `get()`: findUnique by `id = "singleton"`, upsert with defaults if not found
- `upsert(data)`: update the singleton row

**`back/src/main/domain/scoring/scoring.domain.ts`**
Pure function, no I/O:
```typescript
export function calculateUserScore(
  userCards: Array<{ card: { rarity: Rarity }; variant: CardVariant; quantity: number }>,
  config: ScoringConfig
): number
```

Iterates unique `[cardId, variant]` entries (quantity >= 1), applies formula.

### New routes

**`back/src/main/interfaces/http/fastify/routes/admin/scoring-config/index.ts`**

- `GET /admin/scoring-config` — returns current config (admin only)
- `PUT /admin/scoring-config` — updates config values (admin only), validates all Int >= 0, all Float >= 1.0

**`back/src/main/interfaces/http/fastify/routes/teams/ranking/index.ts`**

- `GET /teams/:id/ranking?page=1&limit=20`
  - Authenticated, team member only
  - Fetches all team members, their user cards, computes score for each
  - Sorts descending by score, paginates
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

- `TeamEntry` gains `avgScore: number`, loses `avgPercentage`
- Calculation: for each team, compute each member's score, average them, sort descending

---

## Frontend

### New files

**`front/src/api/scoring.api.ts`**
```typescript
export type ScoringConfig = {
  commonPoints: number
  uncommonPoints: number
  rarePoints: number
  epicPoints: number
  legendaryPoints: number
  brilliantMultiplier: number
  holographicMultiplier: number
}

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

export const getScoringConfig = (): Promise<ScoringConfig>
export const updateScoringConfig = (data: ScoringConfig): Promise<ScoringConfig>
export const getTeamRanking = (teamId: string, page: number, limit?: number): Promise<TeamRankingPage>
```

**`front/src/queries/useScoring.ts`**
- `useScoringConfig()` — standard query
- `useUpdateScoringConfig()` — mutation with cache invalidation
- `useTeamRanking(teamId)` — `useInfiniteQuery`, `getNextPageParam` returns next page if `page < totalPages`

**`front/src/routes/_authenticated/admin/scoring.tsx`**
- Form with 7 fields: 5 integer inputs (rarity points) + 2 float inputs (multipliers)
- Follows the same pattern as `/admin/upgrades`
- Shows current values, save button, success/error toast

### Modified files

**`front/src/routes/_authenticated/teams/$id.tsx`**
- Add "Classement" section below the existing members list
- Uses `useTeamRanking(teamId)` with infinite scroll
  - 20 members per page
  - `IntersectionObserver` on a sentinel div triggers `fetchNextPage`
- Each row: rank number, avatar, username, role badge, score

**`front/src/api/leaderboard.api.ts`**
- `TeamEntry.avgPercentage` → `TeamEntry.avgScore: number`

**`front/src/routes/_authenticated/leaderboard.tsx`**
- Teams tab: display `avgScore` formatted as integer with thousand separator

**`front/src/components/custom/Navbar.tsx`** (or admin nav)
- Add link to `/admin/scoring` in the admin navigation

---

## Error handling

- `PUT /admin/scoring-config`: validate Int >= 0, Float >= 1.0 — return 400 with field errors
- `GET /teams/:id/ranking`: return 403 if requester is not a team member
- If `ScoringConfig` row does not exist, `get()` upserts with defaults transparently

---

## Testing

- Unit test `calculateUserScore()`: zero cards, single card each variant, duplicate quantities ignored, mixed rarities
- Integration test `GET /teams/:id/ranking`: correct ordering, correct pagination metadata, 403 for non-members
- Integration test `PUT /admin/scoring-config`: validates negative values rejected, float < 1.0 rejected
