# Streak & Rewards System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily login streaks with claimable progressive rewards (tokens/dust/xp), backed by a generic `Reward` table reused by achievements and quests.

**Architecture:** A `StreakDomain` holds `updateStreak(userId, tx)` called from all three auth entry points (login, verifyEmail, OAuth). A `RewardsDomain` handles the claim API. Repositories for `Reward`, `StreakMilestone`, and `UserReward` follow the existing interface + Prisma implementation pattern. Frontend adds a navbar badge and popup driven by `pendingRewardsCount` from claim/login responses.

**Tech Stack:** Prisma 7, Fastify 5 + Zod 4, React 19 + React Query 5, TypeScript 5, Jest 30, Dayjs 1.

**Spec:** `docs/superpowers/specs/2026-03-26-streak-rewards-design.md`

---

## File Map

**Create (backend):**
- `back/src/main/domain/streak/streak.domain.ts` — `updateStreak()` + `calculateStreakUpdate()` pure function
- `back/src/main/domain/rewards/rewards.domain.ts` — pending, claimOne, claimAll, history
- `back/src/main/types/infra/orm/repositories/reward.repository.interface.ts`
- `back/src/main/types/infra/orm/repositories/streak-milestone.repository.interface.ts`
- `back/src/main/types/infra/orm/repositories/user-reward.repository.interface.ts`
- `back/src/main/infra/orm/repositories/reward.repository.ts`
- `back/src/main/infra/orm/repositories/streak-milestone.repository.ts`
- `back/src/main/infra/orm/repositories/user-reward.repository.ts`
- `back/src/main/interfaces/http/fastify/routes/rewards/index.ts`
- `back/src/test/unit/streak.domain.test.ts`
- `back/prisma/seed-milestones.ts` (one-off seed script)

**Modify (backend):**
- `back/prisma/schema.prisma` — add Reward/StreakMilestone/UserReward/RewardSource, add User.bestStreak, change Achievement/Quest rewardId
- `back/src/main/types/application/ioc.ts` — add new repos and domains
- `back/src/main/application/ioc.container.ts` — instantiate them
- `back/src/main/domain/auth/auth.domain.ts` — call `streakDomain.updateStreak()` in login + verifyEmail
- `back/src/main/domain/auth/oauth.domain.ts` — call in handleCallback
- `back/src/main/interfaces/http/fastify/routes/auth/schemas.ts` — add pendingRewardsCount
- `back/src/main/interfaces/http/fastify/routes/auth/login.router.ts` — include pendingRewardsCount
- `back/src/main/interfaces/http/fastify/routes/auth/me.router.ts` — include pendingRewardsCount
- `back/src/main/interfaces/http/fastify/routes/index.ts` — register rewardsRouter

**Create (frontend):**
- `front/src/api/rewards.ts` — API functions + React Query hooks
- `front/src/components/rewards/RewardCard.tsx`
- `front/src/components/rewards/RewardsPopup.tsx`
- `front/src/components/rewards/RewardsBadge.tsx`

**Modify (frontend):**
- `front/src/components/layout/Navbar.tsx` (or wherever the navbar lives) — add RewardsBadge
- Profile page component — add streakDays + bestStreak display

---

## Task 1: Prisma schema — new models + User.bestStreak

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Add RewardSource enum and Reward model**

Open `back/prisma/schema.prisma` and add after the last existing enum:

```prisma
enum RewardSource {
  STREAK
  ACHIEVEMENT
  QUEST
}

model Reward {
  id        String   @id @default(uuid())
  tokens    Int      @default(0)
  dust      Int      @default(0)
  xp        Int      @default(0)
  createdAt DateTime @default(now())

  streakMilestones StreakMilestone[]
  achievements     Achievement[]
  quests           Quest[]
  userRewards      UserReward[]

  @@map("rewards")
}

model StreakMilestone {
  id          String  @id @default(uuid())
  day         Int     @unique
  isMilestone Boolean @default(false)
  isActive    Boolean @default(true)
  rewardId    String
  reward      Reward  @relation(fields: [rewardId], references: [id])

  @@map("streak_milestones")
}

model UserReward {
  id        String       @id @default(uuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  rewardId  String
  reward    Reward       @relation(fields: [rewardId], references: [id])
  source    RewardSource
  sourceId  String?
  claimedAt DateTime?
  createdAt DateTime     @default(now())

  @@index([userId, claimedAt])
  @@index([sourceId])
  @@unique([userId, source, sourceId])
  @@map("user_rewards")
}
```

- [ ] **Step 2: Add bestStreak to User and userRewards relation**

In the User model block, add:

```prisma
bestStreak   Int       @default(0)
userRewards  UserReward[]
```

- [ ] **Step 3: Modify Achievement to use rewardId (nullable first)**

Replace the `rewardTokens` and `rewardDust` fields in Achievement with:

```prisma
rewardId  String?
reward    Reward? @relation(fields: [rewardId], references: [id])
```

And remove `rewardTokens Int @default(0)` and `rewardDust Int @default(0)`.

- [ ] **Step 4: Modify Quest to use rewardId (nullable first)**

Same as Achievement — replace `rewardTokens`/`rewardDust` with:

```prisma
rewardId  String?
reward    Reward? @relation(fields: [rewardId], references: [id])
```

- [ ] **Step 5: Run migration**

```bash
cd back && npx prisma migrate dev --name streak-rewards-system
```

Expected: migration file created, no errors.

- [ ] **Step 6: Commit**

```bash
git add back/prisma/schema.prisma back/prisma/migrations/
git commit -m "feat(db): add Reward, StreakMilestone, UserReward schema + User.bestStreak"
```

---

## Task 2: Seed StreakMilestone rows

**Files:**
- Create: `back/prisma/seed-milestones.ts`

- [ ] **Step 1: Create seed script**

```typescript
// back/prisma/seed-milestones.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MILESTONES = [
  { day: 1,  tokens: 3,  dust: 5,  xp: 10, isMilestone: false },
  { day: 2,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 3,  tokens: 5,  dust: 8,  xp: 15, isMilestone: true  },
  { day: 4,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 5,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 6,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 7,  tokens: 8,  dust: 15, xp: 25, isMilestone: true  },
  { day: 14, tokens: 12, dust: 30, xp: 40, isMilestone: true  },
  { day: 30, tokens: 20, dust: 60, xp: 60, isMilestone: true  },
]

async function main() {
  for (const m of MILESTONES) {
    const reward = await prisma.reward.create({
      data: { tokens: m.tokens, dust: m.dust, xp: m.xp },
    })
    await prisma.streakMilestone.upsert({
      where: { day: m.day },
      update: { isMilestone: m.isMilestone, rewardId: reward.id, isActive: true },
      create: { day: m.day, isMilestone: m.isMilestone, rewardId: reward.id },
    })
    console.log(`Seeded day ${m.day}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run seed**

```bash
cd back && npx tsx prisma/seed-milestones.ts
```

Expected: "Seeded day 1" ... "Seeded day 30" with no errors.

- [ ] **Step 3: Commit**

```bash
git add back/prisma/seed-milestones.ts
git commit -m "feat(db): seed StreakMilestone rows"
```

---

## Task 3: Repository interfaces

**Files:**
- Create: `back/src/main/types/infra/orm/repositories/reward.repository.interface.ts`
- Create: `back/src/main/types/infra/orm/repositories/streak-milestone.repository.interface.ts`
- Create: `back/src/main/types/infra/orm/repositories/user-reward.repository.interface.ts`

- [ ] **Step 1: Reward repository interface**

```typescript
// back/src/main/types/infra/orm/repositories/reward.repository.interface.ts
import type { Reward } from '@prisma/client'

export interface RewardRepositoryInterface {
  create(data: { tokens: number; dust: number; xp: number }): Promise<Reward>
}
```

- [ ] **Step 2: StreakMilestone repository interface**

```typescript
// back/src/main/types/infra/orm/repositories/streak-milestone.repository.interface.ts
import type { StreakMilestone, Reward } from '@prisma/client'

export type StreakMilestoneWithReward = StreakMilestone & { reward: Reward }

export interface StreakMilestoneRepositoryInterface {
  /** Returns the active milestone with the largest day <= targetDay, or null if none */
  findBestForDay(targetDay: number): Promise<StreakMilestoneWithReward | null>
}
```

- [ ] **Step 3: UserReward repository interface**

```typescript
// back/src/main/types/infra/orm/repositories/user-reward.repository.interface.ts
import type { RewardSource, UserReward, Reward, StreakMilestone } from '@prisma/client'
import type { PrimaTransactionClient } from '../orm.interface'

export type PendingUserReward = UserReward & {
  reward: Reward
  streakMilestone: StreakMilestone | null  // populated when source = STREAK
}

export interface UserRewardRepositoryInterface {
  upsertInTx(
    tx: PrimaTransactionClient,
    data: { userId: string; rewardId: string; source: RewardSource; sourceId: string },
  ): Promise<UserReward>
  findPendingByUser(userId: string): Promise<PendingUserReward[]>
  /** Finds a reward by id + userId with no claimedAt filter — for 404 vs 409 distinction */
  findByIdAndUser(id: string, userId: string): Promise<PendingUserReward | null>
  countPendingByUser(userId: string): Promise<number>
  markClaimedInTx(tx: PrimaTransactionClient, id: string): Promise<void>
  markAllClaimedInTx(tx: PrimaTransactionClient, userId: string): Promise<void>
  findHistoryByUser(userId: string, page: number, limit: number): Promise<{ data: UserReward[]; total: number }>
}
```

- [ ] **Step 4: Commit**

```bash
git add back/src/main/types/infra/orm/repositories/reward.repository.interface.ts \
        back/src/main/types/infra/orm/repositories/streak-milestone.repository.interface.ts \
        back/src/main/types/infra/orm/repositories/user-reward.repository.interface.ts
git commit -m "feat(streak): add repository interfaces for Reward, StreakMilestone, UserReward"
```

---

## Task 4: Repository implementations

**Files:**
- Create: `back/src/main/infra/orm/repositories/reward.repository.ts`
- Create: `back/src/main/infra/orm/repositories/streak-milestone.repository.ts`
- Create: `back/src/main/infra/orm/repositories/user-reward.repository.ts`

- [ ] **Step 1: RewardRepository**

```typescript
// back/src/main/infra/orm/repositories/reward.repository.ts
import type { Reward } from '@prisma/client'
import type { PostgresPrismaClient } from '../../../types/infra/orm/orm.interface'
import type { RewardRepositoryInterface } from '../../../types/infra/orm/repositories/reward.repository.interface'

export class RewardRepository implements RewardRepositoryInterface {
  #prisma: PostgresPrismaClient

  constructor(prisma: PostgresPrismaClient) {
    this.#prisma = prisma
  }

  create(data: { tokens: number; dust: number; xp: number }): Promise<Reward> {
    return this.#prisma.reward.create({ data })
  }
}
```

- [ ] **Step 2: StreakMilestoneRepository**

```typescript
// back/src/main/infra/orm/repositories/streak-milestone.repository.ts
import type { PostgresPrismaClient } from '../../../types/infra/orm/orm.interface'
import type {
  StreakMilestoneRepositoryInterface,
  StreakMilestoneWithReward,
} from '../../../types/infra/orm/repositories/streak-milestone.repository.interface'

export class StreakMilestoneRepository implements StreakMilestoneRepositoryInterface {
  #prisma: PostgresPrismaClient

  constructor(prisma: PostgresPrismaClient) {
    this.#prisma = prisma
  }

  async findBestForDay(targetDay: number): Promise<StreakMilestoneWithReward | null> {
    return this.#prisma.streakMilestone.findFirst({
      where: { isActive: true, day: { lte: targetDay } },
      orderBy: { day: 'desc' },
      include: { reward: true },
    })
  }
}
```

- [ ] **Step 3: UserRewardRepository**

```typescript
// back/src/main/infra/orm/repositories/user-reward.repository.ts
import type { RewardSource, UserReward } from '@prisma/client'
import type { PostgresPrismaClient, PrimaTransactionClient } from '../../../types/infra/orm/orm.interface'
import type {
  PendingUserReward,
  UserRewardRepositoryInterface,
} from '../../../types/infra/orm/repositories/user-reward.repository.interface'

export class UserRewardRepository implements UserRewardRepositoryInterface {
  #prisma: PostgresPrismaClient

  constructor(prisma: PostgresPrismaClient) {
    this.#prisma = prisma
  }

  async upsertInTx(
    tx: PrimaTransactionClient,
    data: { userId: string; rewardId: string; source: RewardSource; sourceId: string },
  ): Promise<UserReward> {
    return tx.userReward.upsert({
      where: { userId_source_sourceId: { userId: data.userId, source: data.source, sourceId: data.sourceId } },
      create: data,
      update: {},  // Already exists — no-op (idempotent on retry)
    })
  }

  async findPendingByUser(userId: string): Promise<PendingUserReward[]> {
    const rows = await this.#prisma.userReward.findMany({
      where: { userId, claimedAt: null },
      include: {
        reward: true,
        // Populate streakMilestone via sourceId for STREAK rewards
      },
      orderBy: { createdAt: 'asc' },
    })
    // Attach streakMilestone data for STREAK source rows
    const streakIds = rows
      .filter((r) => r.source === 'STREAK' && r.sourceId)
      .map((r) => r.sourceId!)
    const milestones = streakIds.length
      ? await this.#prisma.streakMilestone.findMany({ where: { id: { in: streakIds } } })
      : []
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]))
    return rows.map((r) => ({
      ...r,
      streakMilestone: r.sourceId ? (milestoneMap.get(r.sourceId) ?? null) : null,
    }))
  }

  async findByIdAndUser(id: string, userId: string): Promise<PendingUserReward | null> {
    // No claimedAt filter — caller checks claimedAt to distinguish 404 vs 409
    const row = await this.#prisma.userReward.findFirst({
      where: { id, userId },
      include: { reward: true },
    })
    if (!row) return null
    const milestone =
      row.source === 'STREAK' && row.sourceId
        ? await this.#prisma.streakMilestone.findUnique({ where: { id: row.sourceId } })
        : null
    return { ...row, streakMilestone: milestone }
  }

  countPendingByUser(userId: string): Promise<number> {
    return this.#prisma.userReward.count({ where: { userId, claimedAt: null } })
  }

  async markClaimedInTx(tx: PrimaTransactionClient, id: string): Promise<void> {
    await tx.userReward.update({ where: { id }, data: { claimedAt: new Date() } })
  }

  async markAllClaimedInTx(tx: PrimaTransactionClient, userId: string): Promise<void> {
    await tx.userReward.updateMany({
      where: { userId, claimedAt: null },
      data: { claimedAt: new Date() },
    })
  }

  async findHistoryByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: UserReward[]; total: number }> {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.#prisma.userReward.findMany({
        where: { userId, claimedAt: { not: null } },
        include: { reward: true },
        orderBy: { claimedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.#prisma.userReward.count({ where: { userId, claimedAt: { not: null } } }),
    ])
    return { data, total }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add back/src/main/infra/orm/repositories/reward.repository.ts \
        back/src/main/infra/orm/repositories/streak-milestone.repository.ts \
        back/src/main/infra/orm/repositories/user-reward.repository.ts
git commit -m "feat(streak): implement Reward, StreakMilestone, UserReward repositories"
```

---

## Task 5: StreakDomain — pure function + tests

**Files:**
- Create: `back/src/main/domain/streak/streak.domain.ts`
- Create: `back/src/test/unit/streak.domain.test.ts`

- [ ] **Step 1: Write failing tests first**

```typescript
// back/src/test/unit/streak.domain.test.ts
import { describe, expect, it } from '@jest/globals'
import { calculateStreakUpdate } from '../../main/domain/streak/streak.domain'

const DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setTime(d.getTime() - n * DAY)
  return d
}

describe('calculateStreakUpdate', () => {
  it('first login: streak = 1, bestStreak = 1', () => {
    const result = calculateStreakUpdate({ lastLoginAt: null, streakDays: 0, bestStreak: 0 })
    expect(result.newStreakDays).toBe(1)
    expect(result.newBestStreak).toBe(1)
    expect(result.shouldSkip).toBe(false)
  })

  it('same day login: returns shouldSkip = true', () => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const result = calculateStreakUpdate({ lastLoginAt: today, streakDays: 5, bestStreak: 5 })
    expect(result.shouldSkip).toBe(true)
  })

  it('consecutive day: increments streak', () => {
    const result = calculateStreakUpdate({ lastLoginAt: daysAgo(1), streakDays: 4, bestStreak: 4 })
    expect(result.newStreakDays).toBe(5)
    expect(result.newBestStreak).toBe(5)
    expect(result.shouldSkip).toBe(false)
  })

  it('missed day: resets streak to 1, preserves bestStreak', () => {
    const result = calculateStreakUpdate({ lastLoginAt: daysAgo(2), streakDays: 10, bestStreak: 10 })
    expect(result.newStreakDays).toBe(1)
    expect(result.newBestStreak).toBe(10)
    expect(result.shouldSkip).toBe(false)
  })

  it('new bestStreak captured when streak grows', () => {
    const result = calculateStreakUpdate({ lastLoginAt: daysAgo(1), streakDays: 7, bestStreak: 7 })
    expect(result.newStreakDays).toBe(8)
    expect(result.newBestStreak).toBe(8)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd back && npx jest src/test/unit/streak.domain.test.ts --no-coverage
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement StreakDomain**

```typescript
// back/src/main/domain/streak/streak.domain.ts
import type { PrimaTransactionClient } from '../../types/infra/orm/orm.interface'
import type { StreakMilestoneRepositoryInterface } from '../../types/infra/orm/repositories/streak-milestone.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

type StreakInput = {
  lastLoginAt: Date | null
  streakDays: number
  bestStreak: number
}

type StreakUpdateResult = {
  shouldSkip: boolean
  newStreakDays: number
  newBestStreak: number
}

/** Pure function — no I/O. Computes new streak state given current state and now(). */
export function calculateStreakUpdate(input: StreakInput): StreakUpdateResult {
  const { lastLoginAt, streakDays, bestStreak } = input

  if (lastLoginAt === null) {
    return { shouldSkip: false, newStreakDays: 1, newBestStreak: Math.max(bestStreak, 1) }
  }

  const nowDay = utcDayStart(new Date())
  const lastDay = utcDayStart(lastLoginAt)
  const dayGap = Math.round((nowDay.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000))

  if (dayGap === 0) {
    return { shouldSkip: true, newStreakDays: streakDays, newBestStreak: bestStreak }
  }

  let newStreakDays: number
  let newBestStreak = bestStreak

  if (dayGap === 1) {
    newStreakDays = streakDays + 1
  } else {
    newBestStreak = Math.max(bestStreak, streakDays)
    newStreakDays = 1
  }

  newBestStreak = Math.max(newBestStreak, newStreakDays)
  return { shouldSkip: false, newStreakDays, newBestStreak }
}

function utcDayStart(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export class StreakDomain {
  #userRepository: UserRepositoryInterface
  #streakMilestoneRepository: StreakMilestoneRepositoryInterface
  #userRewardRepository: UserRewardRepositoryInterface

  constructor({
    userRepository,
    streakMilestoneRepository,
    userRewardRepository,
  }: {
    userRepository: UserRepositoryInterface
    streakMilestoneRepository: StreakMilestoneRepositoryInterface
    userRewardRepository: UserRewardRepositoryInterface
  }) {
    this.#userRepository = userRepository
    this.#streakMilestoneRepository = streakMilestoneRepository
    this.#userRewardRepository = userRewardRepository
  }

  /** Call this inside an existing transaction after successful auth. */
  async updateStreak(userId: string, tx: PrimaTransactionClient): Promise<void> {
    const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
    const { shouldSkip, newStreakDays, newBestStreak } = calculateStreakUpdate({
      lastLoginAt: user.lastLoginAt,
      streakDays: user.streakDays,
      bestStreak: user.bestStreak,
    })

    if (shouldSkip) return

    await tx.user.update({
      where: { id: userId },
      data: { streakDays: newStreakDays, bestStreak: newBestStreak, lastLoginAt: new Date() },
    })

    const milestone = await this.#streakMilestoneRepository.findBestForDay(newStreakDays)
    if (!milestone) return

    await this.#userRewardRepository.upsertInTx(tx, {
      userId,
      rewardId: milestone.rewardId,
      source: 'STREAK',
      sourceId: milestone.id,
    })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd back && npx jest src/test/unit/streak.domain.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add back/src/main/domain/streak/streak.domain.ts \
        back/src/test/unit/streak.domain.test.ts
git commit -m "feat(streak): StreakDomain with calculateStreakUpdate pure function + tests"
```

---

## Task 6: Register repos + domains in IoC

**Files:**
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/application/ioc.container.ts`

- [ ] **Step 1: Add to IoC type**

In `ioc.ts`, add to the `IocContainer` interface:

```typescript
readonly rewardRepository: RewardRepositoryInterface
readonly streakMilestoneRepository: StreakMilestoneRepositoryInterface
readonly userRewardRepository: UserRewardRepositoryInterface
readonly streakDomain: StreakDomain
readonly rewardsDomain: RewardsDomainInterface
```

(Import the new types at the top of the file following the existing import pattern.)

- [ ] **Step 2: Instantiate in container**

In `ioc.container.ts`, instantiate the new repos and domains. Follow the pattern of existing repos (they receive `postgresOrm.client` as the Prisma client):

```typescript
const rewardRepository = new RewardRepository(postgresOrm.client)
const streakMilestoneRepository = new StreakMilestoneRepository(postgresOrm.client)
const userRewardRepository = new UserRewardRepository(postgresOrm.client)

const streakDomain = new StreakDomain({
  userRepository,
  streakMilestoneRepository,
  userRewardRepository,
})

const rewardsDomain = new RewardsDomain({
  userRewardRepository,
  userRepository,
  postgresOrm,
})
```

Add them to the returned container object.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/types/application/ioc.ts \
        back/src/main/application/ioc.container.ts
git commit -m "feat(streak): register streak/reward repos and domains in IoC"
```

---

## Task 7: Hook updateStreak into auth flows

**Files:**
- Modify: `back/src/main/domain/auth/auth.domain.ts`
- Modify: `back/src/main/domain/auth/oauth.domain.ts`

- [ ] **Step 1: Inject streakDomain into AuthDomain**

In `AuthDomain` constructor, add `streakDomain: StreakDomain` to the injected dependencies and store it as a private field.

- [ ] **Step 2: Call updateStreak in login()**

Inside `authDomain.login()`, after credential validation succeeds and inside the transaction (or start one if login doesn't already use one), call:

```typescript
await this.#streakDomain.updateStreak(user.id, tx)
```

If `login()` doesn't currently use a transaction, wrap the streak call in `postgresOrm.executeWithTransactionClient()` and inject `postgresOrm`.

- [ ] **Step 3: Call updateStreak in verifyEmail()**

In `authDomain.verifyEmail()`, after setting `emailVerifiedAt` and before returning, call `updateStreak` the same way.

- [ ] **Step 4: Inject streakDomain into OAuthDomain and call updateStreak**

In `OAuthDomain`, inject `streakDomain` and call `this.#streakDomain.updateStreak(user.id, tx)` inside the OAuth transaction after the user is resolved (created or found).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add back/src/main/domain/auth/auth.domain.ts \
        back/src/main/domain/auth/oauth.domain.ts
git commit -m "feat(streak): call updateStreak on login, verifyEmail, and OAuth callback"
```

---

## Task 8: RewardsDomain

**Files:**
- Create: `back/src/main/domain/rewards/rewards.domain.ts`

- [ ] **Step 1: Implement RewardsDomain**

```typescript
// back/src/main/domain/rewards/rewards.domain.ts
import Boom from '@hapi/boom'
import type { PostgresOrm } from '../../types/infra/orm/orm.interface'
import type { UserRewardRepositoryInterface, PendingUserReward } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
}

export class RewardsDomain {
  #userRewardRepository: UserRewardRepositoryInterface
  #userRepository: UserRepositoryInterface
  #postgresOrm: PostgresOrm

  constructor({
    userRewardRepository,
    userRepository,
    postgresOrm,
  }: {
    userRewardRepository: UserRewardRepositoryInterface
    userRepository: UserRepositoryInterface
    postgresOrm: PostgresOrm
  }) {
    this.#userRewardRepository = userRewardRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
  }

  getPending(userId: string): Promise<PendingUserReward[]> {
    return this.#userRewardRepository.findPendingByUser(userId)
  }

  async getHistory(userId: string, page: number, limit: number) {
    const safeLimit = Math.min(limit, 100)
    return this.#userRewardRepository.findHistoryByUser(userId, page, safeLimit)
  }

  async claimOne(rewardId: string, userId: string): Promise<ClaimResult> {
    // Load without claimedAt filter to distinguish 404 (not yours) from 409 (already claimed)
    const userReward = await this.#userRewardRepository.findByIdAndUser(rewardId, userId)
    if (!userReward) throw Boom.notFound('Reward not found')
    if (userReward.claimedAt !== null) throw Boom.conflict('Reward already claimed')

    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
      const { tokens, dust, xp } = userReward.reward

      const newTokens = user.tokens + tokens
      const newDust = user.dust + dust
      const newXp = user.xp + xp
      const newLevel = calculateLevel(newXp)

      await tx.user.update({
        where: { id: userId },
        data: { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel },
      })
      await this.#userRewardRepository.markClaimedInTx(tx, userReward.id)
      // Count inside tx so it reflects the just-committed mark
      const pendingRewardsCount = await tx.userReward.count({ where: { userId, claimedAt: null } })

      return { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel, pendingRewardsCount }
    })
  }

  async claimAll(userId: string): Promise<ClaimResult | null> {
    const pending = await this.#userRewardRepository.findPendingByUser(userId)
    if (pending.length === 0) return null

    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)

      const totalTokens = pending.reduce((sum, r) => sum + r.reward.tokens, 0)
      const totalDust = pending.reduce((sum, r) => sum + r.reward.dust, 0)
      const totalXp = pending.reduce((sum, r) => sum + r.reward.xp, 0)

      const newTokens = user.tokens + totalTokens
      const newDust = user.dust + totalDust
      const newXp = user.xp + totalXp
      const newLevel = calculateLevel(newXp)

      await tx.user.update({
        where: { id: userId },
        data: { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel },
      })
      await this.#userRewardRepository.markAllClaimedInTx(tx, userId)

      return { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel, pendingRewardsCount: 0 }
    })
  }
}

/** Placeholder: replaces with actual XP curve from EconomyDomain if one exists, else keep this. */
function calculateLevel(xp: number): number {
  // Level = floor(sqrt(xp / 100)) + 1, capped at 100
  return Math.min(Math.floor(Math.sqrt(xp / 100)) + 1, 100)
}
```

> **Note:** Check `EconomyDomain` for an existing level-up function. If one exists, import and use it instead of the placeholder `calculateLevel`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add back/src/main/domain/rewards/rewards.domain.ts
git commit -m "feat(rewards): RewardsDomain with claimOne, claimAll, pending, history"
```

---

## Task 9: Rewards API routes

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/rewards/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`

- [ ] **Step 1: Create rewards router**

```typescript
// back/src/main/interfaces/http/fastify/routes/rewards/index.ts
import { z } from 'zod'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

const claimResultSchema = z.object({
  tokens: z.number(),
  dust: z.number(),
  xp: z.number(),
  level: z.number(),
  pendingRewardsCount: z.number(),
})

const pendingRewardSchema = z.object({
  id: z.string(),
  source: z.enum(['STREAK', 'ACHIEVEMENT', 'QUEST']),
  sourceId: z.string().nullable(),
  claimedAt: z.date().nullable(),
  createdAt: z.date(),
  reward: z.object({ tokens: z.number(), dust: z.number(), xp: z.number() }),
  streakMilestone: z.object({ day: z.number(), isMilestone: z.boolean() }).nullable(),
})

export const rewardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { rewardsDomain } = fastify.iocContainer
  const auth = [fastify.verifySessionCookie]

  fastify.get('/pending', { onRequest: auth, schema: { response: { 200: z.array(pendingRewardSchema) } } }, async (req) => {
    return rewardsDomain.getPending(req.user.userID)
  })

  fastify.post(
    '/:id/claim',
    { onRequest: auth, schema: { params: z.object({ id: z.string() }), response: { 200: claimResultSchema } } },
    async (req) => {
      return rewardsDomain.claimOne(req.params.id, req.user.userID)
    },
  )

  fastify.post('/claim-all', { onRequest: auth }, async (req, reply) => {
    const result = await rewardsDomain.claimAll(req.user.userID)
    if (!result) return reply.status(204).send()
    return result
  })

  fastify.get(
    '/history',
    {
      onRequest: auth,
      schema: {
        querystring: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }),
      },
    },
    async (req) => {
      return rewardsDomain.getHistory(req.user.userID, req.query.page, req.query.limit)
    },
  )
}
```

- [ ] **Step 2: Register in main routes index**

In `back/src/main/interfaces/http/fastify/routes/index.ts`, add:

```typescript
await fastify.register(rewardsRouter, { prefix: '/rewards' })
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/rewards/index.ts \
        back/src/main/interfaces/http/fastify/routes/index.ts
git commit -m "feat(rewards): add /rewards API routes (pending, claim, claim-all, history)"
```

---

## Task 10: Extend auth responses with pendingRewardsCount

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/auth/schemas.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/auth/login.router.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/auth/me.router.ts`
- Modify: OAuth callback route (wherever it sets cookies and returns)

- [ ] **Step 1: Extend userResponseSchema**

In `schemas.ts`, add `pendingRewardsCount: z.number()` to `userResponseSchema`.

- [ ] **Step 2: Update login route to include pendingRewardsCount**

In `login.router.ts`:

```typescript
const { user, tokens } = await authDomain.login(request.body)
setTokenCookies(reply, tokens)
const pendingRewardsCount = await userRewardRepository.countPendingByUser(user.id)
return { ...sanitizeUser(user), pendingRewardsCount }
```

Inject `userRewardRepository` from `fastify.iocContainer`.

- [ ] **Step 3: Update verifyEmail route similarly**

Same pattern — add `pendingRewardsCount` after the `updateStreak` call has created the day-1 reward.

- [ ] **Step 4: Update me route**

In `me.router.ts`, after fetching the user:

```typescript
const { userRewardRepository } = fastify.iocContainer
const pendingRewardsCount = await userRewardRepository.countPendingByUser(user.id)
return { ...sanitizeUser(user), pendingRewardsCount }
```

- [ ] **Step 5: Update OAuth callback route**

Same pattern — add `pendingRewardsCount` to the response.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd back && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/auth/
git commit -m "feat(rewards): add pendingRewardsCount to login, me, verifyEmail, OAuth responses"
```

---

## Task 11: Migrate Achievement + Quest to rewardId

This task populates `rewardId` for existing records and makes the column required.

- [ ] **Step 1: Write data migration script**

```typescript
// back/prisma/migrate-achievement-quest-rewards.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const achievements = await prisma.achievement.findMany()
  for (const a of achievements) {
    if (a.rewardId) continue  // Already migrated
    const reward = await prisma.reward.create({
      data: { tokens: (a as any).rewardTokens ?? 0, dust: (a as any).rewardDust ?? 0, xp: 0 },
    })
    await prisma.achievement.update({ where: { id: a.id }, data: { rewardId: reward.id } })
    console.log(`Migrated achievement ${a.key}`)
  }

  const quests = await prisma.quest.findMany()
  for (const q of quests) {
    if (q.rewardId) continue
    const reward = await prisma.reward.create({
      data: { tokens: (q as any).rewardTokens ?? 0, dust: (q as any).rewardDust ?? 0, xp: 0 },
    })
    await prisma.quest.update({ where: { id: q.id }, data: { rewardId: reward.id } })
    console.log(`Migrated quest ${q.key}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run migration script**

```bash
cd back && npx tsx prisma/migrate-achievement-quest-rewards.ts
```

Expected: logs each migrated record, no errors.

- [ ] **Step 3: Make rewardId required in schema**

In `schema.prisma`, change `Achievement.rewardId` and `Quest.rewardId` from `String?` to `String` and the relation from `Reward?` to `Reward`.

- [ ] **Step 4: Run migration to enforce the NOT NULL constraint**

```bash
cd back && npx prisma migrate dev --name make-reward-id-required
```

Expected: migration file created, no errors.

- [ ] **Step 5: Commit**

```bash
git add back/prisma/schema.prisma back/prisma/migrations/ \
        back/prisma/migrate-achievement-quest-rewards.ts
git commit -m "feat(rewards): migrate Achievement + Quest to use rewardId foreign key"
```

---

## Task 12: Frontend — API types + query hooks

**Files:**
- Create: `front/src/api/rewards.ts`

- [ ] **Step 1: Implement API layer**

```typescript
// front/src/api/rewards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type PendingReward = {
  id: string
  source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST'
  sourceId: string | null
  createdAt: string
  reward: { tokens: number; dust: number; xp: number }
  streakMilestone: { day: number; isMilestone: boolean } | null
}

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
}

async function fetchPendingRewards(): Promise<PendingReward[]> {
  const res = await fetch('/api/rewards/pending', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch pending rewards')
  return res.json()
}

async function claimReward(id: string): Promise<ClaimResult> {
  const res = await fetch(`/api/rewards/${id}/claim`, { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to claim reward')
  return res.json()
}

async function claimAllRewards(): Promise<ClaimResult | null> {
  const res = await fetch('/api/rewards/claim-all', { method: 'POST', credentials: 'include' })
  if (res.status === 204) return null
  if (!res.ok) throw new Error('Failed to claim all rewards')
  return res.json()
}

export function usePendingRewards() {
  return useQuery({ queryKey: ['rewards', 'pending'], queryFn: fetchPendingRewards })
}

export function useClaimReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: claimReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useClaimAllRewards() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: claimAllRewards,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/api/rewards.ts
git commit -m "feat(rewards): add frontend API layer and React Query hooks"
```

---

## Task 13: Frontend — RewardCard, RewardsPopup, RewardsBadge

**Files:**
- Create: `front/src/components/rewards/RewardCard.tsx`
- Create: `front/src/components/rewards/RewardsPopup.tsx`
- Create: `front/src/components/rewards/RewardsBadge.tsx`

- [ ] **Step 1: RewardCard**

```tsx
// front/src/components/rewards/RewardCard.tsx
import type { PendingReward } from '../../api/rewards'

type Props = {
  reward: PendingReward
  onClaim: (id: string) => void
  isLoading: boolean
}

function sourceLabel(reward: PendingReward): string {
  if (reward.source === 'STREAK' && reward.streakMilestone) {
    return `Streak — Jour ${reward.streakMilestone.day}`
  }
  if (reward.source === 'ACHIEVEMENT') return 'Achievement'
  if (reward.source === 'QUEST') return 'Quête'
  return 'Récompense'
}

export function RewardCard({ reward, onClaim, isLoading }: Props) {
  const isMilestone = reward.streakMilestone?.isMilestone ?? false

  return (
    <div className={`rounded-lg p-3 border ${isMilestone ? 'border-yellow-400 bg-yellow-50' : 'border-border bg-card'}`}>
      <p className="text-sm font-medium text-muted-foreground">{sourceLabel(reward)}</p>
      <div className="flex gap-3 mt-1 text-sm">
        {reward.reward.tokens > 0 && <span>🎫 {reward.reward.tokens}</span>}
        {reward.reward.dust > 0 && <span>✨ {reward.reward.dust}</span>}
        {reward.reward.xp > 0 && <span>⭐ {reward.reward.xp} XP</span>}
      </div>
      <button
        className="mt-2 text-xs px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
        onClick={() => onClaim(reward.id)}
        disabled={isLoading}
      >
        Réclamer
      </button>
    </div>
  )
}
```

- [ ] **Step 2: RewardsPopup**

```tsx
// front/src/components/rewards/RewardsPopup.tsx
import { usePendingRewards, useClaimReward, useClaimAllRewards } from '../../api/rewards'
import { RewardCard } from './RewardCard'

type Props = { onClose: () => void }

export function RewardsPopup({ onClose }: Props) {
  const { data: rewards = [], isLoading } = usePendingRewards()
  const claimOne = useClaimReward()
  const claimAll = useClaimAllRewards()

  return (
    <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-border bg-background shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Récompenses disponibles</h3>
        {rewards.length > 1 && (
          <button
            className="text-xs text-primary underline disabled:opacity-50"
            onClick={() => claimAll.mutate()}
            disabled={claimAll.isPending}
          >
            Tout réclamer
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && rewards.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune récompense en attente.</p>
      )}

      <div className="flex flex-col gap-2">
        {rewards.map((r) => (
          <RewardCard
            key={r.id}
            reward={r}
            onClaim={(id) => claimOne.mutate(id)}
            isLoading={claimOne.isPending}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: RewardsBadge**

```tsx
// front/src/components/rewards/RewardsBadge.tsx
import { useState, useRef, useEffect } from 'react'
import { RewardsPopup } from './RewardsPopup'

type Props = { pendingRewardsCount: number }

export function RewardsBadge({ pendingRewardsCount }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="relative p-2 rounded-full hover:bg-accent"
        onClick={() => setOpen((o) => !o)}
        aria-label="Récompenses"
      >
        🎁
        {pendingRewardsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {pendingRewardsCount > 9 ? '9+' : pendingRewardsCount}
          </span>
        )}
      </button>
      {open && <RewardsPopup onClose={() => setOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add front/src/components/rewards/
git commit -m "feat(rewards): RewardCard, RewardsPopup, RewardsBadge components"
```

---

## Task 14: Add RewardsBadge to navbar + streak to profile

**Files:**
- Modify: navbar component (find with `grep -r "Navbar\|navbar" front/src --include="*.tsx" -l`)
- Modify: profile page component (find with `grep -r "profile\|Profile" front/src --include="*.tsx" -l`)

- [ ] **Step 1: Locate the navbar and profile components**

```bash
grep -r "Navbar\|navbar" front/src --include="*.tsx" -l
grep -r "streakDays\|Profile\|profile" front/src --include="*.tsx" -l
```

- [ ] **Step 2: Add RewardsBadge to navbar**

Import `RewardsBadge` and add it alongside existing navbar icons. `pendingRewardsCount` comes from the `useMe()` hook (or however the current user data is accessed):

```tsx
import { RewardsBadge } from '../rewards/RewardsBadge'
// ...
<RewardsBadge pendingRewardsCount={me?.pendingRewardsCount ?? 0} />
```

- [ ] **Step 3: Add streak display to profile**

In the profile component, after locating where user stats are shown, add:

```tsx
<div className="flex gap-6">
  <div className="text-center">
    <p className="text-2xl font-bold">🔥 {user.streakDays}</p>
    <p className="text-xs text-muted-foreground">Streak actuel</p>
  </div>
  <div className="text-center">
    <p className="text-2xl font-bold">{user.bestStreak}</p>
    <p className="text-xs text-muted-foreground">Meilleur streak</p>
  </div>
</div>
```

- [ ] **Step 4: Verify the frontend builds**

```bash
cd front && npm run build
```

Expected: no TypeScript errors, successful build.

- [ ] **Step 5: Final commit**

```bash
git add front/src/
git commit -m "feat(rewards): integrate RewardsBadge in navbar, streak display in profile"
```

---

## Manual smoke test

After all tasks complete:

1. Start the app: `docker compose up` (or your local dev command)
2. Register a new user and complete email verification → should get a pending streak reward for day 1
3. Open the rewards badge → popup shows 1 pending reward
4. Click "Réclamer" → tokens/dust/xp credited, badge disappears
5. Log out and log in the next day (or manually set `lastLoginAt` to yesterday in the DB) → day 2 reward appears
6. Log in a third day → day 3 milestone reward appears (gold border in popup)
7. Skip a day → streak resets to 1, `bestStreak` preserves the previous record
