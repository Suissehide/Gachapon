# Streak & Rewards System — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Add a daily login streak system that rewards users for connecting on consecutive days. Rewards (tokens, dust, xp) are progressive, milestone-based, and must be explicitly claimed by the user. The system introduces a generic `Reward` entity reusable across achievements, quests, and future reward sources.

---

## Goals

- Incentivize daily engagement via streak tracking
- Unify reward delivery across all sources (streaks, achievements, quests) into a single claimable system
- Keep the best streak as a profile record even after a streak breaks

---

## Database Schema

### New tables

#### `Reward`
Generic reward entity referenced by any system that grants rewards.

```prisma
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
}
```

#### `StreakMilestone`
Defines which reward is granted at a given streak day. Each day has at most one milestone. Days marked `isMilestone = true` are special reward thresholds (e.g., day 3, 7, 14, 30).

`StreakMilestone` rows must never be deleted — use `isActive = false` to deactivate. This is because `UserReward.sourceId` references them without a foreign key constraint (polymorphic pattern). The `updateStreak` query filters on `isActive = true`.

```prisma
model StreakMilestone {
  id          String  @id @default(uuid())
  day         Int     @unique
  isMilestone Boolean @default(false)
  isActive    Boolean @default(true)
  rewardId    String
  reward      Reward  @relation(fields: [rewardId], references: [id])
}
```

Canonical seed list:

| Day | Tokens | Dust | XP | isMilestone |
|-----|--------|------|----|-------------|
| 1   | 3      | 5    | 10 | false       |
| 2   | 4      | 6    | 12 | false       |
| 3   | 5      | 8    | 15 | true        |
| 4   | 4      | 6    | 12 | false       |
| 5   | 4      | 6    | 12 | false       |
| 6   | 4      | 6    | 12 | false       |
| 7   | 8      | 15   | 25 | true        |
| 14  | 12     | 30   | 40 | true        |
| 30  | 20     | 60   | 60 | true        |

For days not in the table (8–13, 15–29, >30), `updateStreak` falls back to the largest active milestone day ≤ streakDays. Days 8–13 resolve to day 7; days 15–29 resolve to day 14; days >30 resolve to day 30.

#### `UserReward`
Tracks every reward granted to a user, across all sources. `claimedAt = null` means the reward is pending claim.

The unique constraint on `[userId, source, sourceId]` prevents duplicate rewards for the same source event (e.g., same streak milestone granted twice on retry). The index on `[sourceId]` supports efficient duplicate checks.

```prisma
enum RewardSource {
  STREAK
  ACHIEVEMENT
  QUEST
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
}
```

### Modified tables

#### `User`
- Add `bestStreak Int @default(0)` — persists the user's highest streak ever reached
- `streakDays Int @default(0)` already exists ✓
- `lastLoginAt DateTime?` already exists (currently not updated — will be fixed) ✓
- Extend `userResponseSchema` and `/me` handler to include `pendingRewardsCount: Int`

#### `Achievement`
- Remove `rewardTokens Int` and `rewardDust Int`
- Add `rewardId String` → `Reward`

#### `Quest`
- Remove `rewardTokens Int` and `rewardDust Int`
- Add `rewardId String` → `Reward`

---

## Backend Logic

### Streak update — shared helper

Streak logic lives in a shared `updateStreak(userId, tx)` helper. It is called from **three** places in the existing auth flow:

- `AuthDomain.login()` — after password validation, inside the existing Prisma transaction
- `OAuthDomain.handleCallback()` — after OAuth account resolution, inside its transaction
- `AuthDomain.verifyEmail()` — after token validation; this is the user's effective first login (`lastLoginAt` is null here), so the day-1 streak and reward are created at this point

```
updateStreak(userId, tx):
  1. Load user (lastLoginAt, streakDays, bestStreak)

  2. If lastLoginAt is null (first login ever):
       streakDays = 1
       lastLoginAt = now()
       bestStreak = max(bestStreak, 1)
       → skip to step 5

  3. Compute dayGap = UTC day diff between lastLoginAt and now()
     - dayGap = 0 → already logged in today, return early (no update)
     - dayGap = 1 → streakDays += 1
     - dayGap > 1 → bestStreak = max(bestStreak, streakDays), streakDays = 1

  4. bestStreak = max(bestStreak, streakDays)   ← always update after increment
     lastLoginAt = now()

  5. Look up active StreakMilestone (isActive = true):
     - Exact match: day = streakDays
     - Fallback: largest day ≤ streakDays (covers gaps in the seed table)

  6. If milestone found → upsert UserReward {
       source: STREAK, sourceId: milestone.id, claimedAt: null
     }
     (@@unique([userId, source, sourceId]) prevents duplicates on retry)

  7. Save user + userReward in the provided transaction
```

All day comparisons are done in UTC to avoid timezone edge cases.

### API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/rewards/pending` | Required | List unclaimed UserRewards for the current user |
| `POST` | `/rewards/:id/claim` | Required | Claim a single pending reward |
| `POST` | `/rewards/claim-all` | Required | Claim all pending rewards atomically |
| `GET` | `/rewards/history` | Required | List claimed rewards (paginated) |

### Claim logic (`POST /rewards/:id/claim`)

Atomic transaction:
1. Load `UserReward` — verify it belongs to the current user
2. Verify `claimedAt === null` — return `409 Conflict` if already claimed
3. Credit `user.tokens += reward.tokens`, `user.dust += reward.dust`, `user.xp += reward.xp`
4. Apply XP level-up: reuse the existing XP/level check in `EconomyDomain` (increments `user.level` if XP crosses current threshold)
5. Set `userReward.claimedAt = now()`

Response `200`:
```json
{
  "tokens": 150,
  "dust": 80,
  "xp": 340,
  "level": 5,
  "pendingRewardsCount": 1
}
```

Returns updated user balances **and** the new pending count so the frontend can keep the badge in sync without refetching `/me`.

### Claim-all logic (`POST /rewards/claim-all`)

1. Load all `UserReward` where `userId = current` and `claimedAt = null`
2. If none found → return `204 No Content`
3. Single atomic transaction: sum totals, credit user, handle level-ups, set `claimedAt = now()` on all rows
4. Response `200`: same shape as single claim (`{ tokens, dust, xp, level, pendingRewardsCount: 0 }`)

### `GET /rewards/history` — pagination

```
GET /rewards/history?page=1&limit=20
```

Response:
```json
{
  "data": [ UserReward[] ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

Default `limit = 20`, max `limit = 100`. Ordered by `claimedAt DESC`.

### Login response extension

Both email/password login and OAuth callback responses include:
```json
{
  "pendingRewardsCount": 2
}
```

### Badge state management

The `pendingRewardsCount` badge is driven exclusively by:
- Login response (on login)
- `GET /me` response (on app load — `/me` includes `pendingRewardsCount`)
- Claim responses (on claim — each response carries updated `pendingRewardsCount`)

`GET /rewards/pending` is used only to render the reward list, not to drive the badge count. This avoids drift between the two sources.

---

## Frontend

### Components

#### `RewardsBadge`
- Displayed in the navbar
- Shows a count badge when `pendingRewardsCount > 0`
- Count updated from login response, `/me` on load, and each claim response

#### `RewardsPopup`
- Opens on badge click
- Lists all pending `UserReward` items via `GET /rewards/pending`
- Each item shows: source label (e.g., "Streak — Jour 7"), tokens/dust/xp amounts, milestone badge if `isMilestone = true`
- "Réclamer" button per item + "Tout réclamer" button (calls `POST /rewards/claim-all`)
- After claim: React Query invalidates `GET /rewards/pending`; badge updated from claim response

#### `RewardCard`
- Individual reward display inside the popup
- Shows source, amounts with icons, and claim button
- Milestone rewards visually distinguished (gold border, special icon)

### Profile page additions

- Current streak: `streakDays` with a flame icon
- Best streak: `bestStreak` displayed as a personal record

---

## Migration Strategy

1. Create `Reward`, `StreakMilestone`, `UserReward` tables and `RewardSource` enum
2. Migrate `Achievement.rewardTokens/rewardDust` → create one `Reward` row per achievement, set `achievement.rewardId`, drop old columns
3. Migrate `Quest.rewardTokens/rewardDust` → same pattern
4. Add `User.bestStreak Int @default(0)`
5. Extend `userResponseSchema` + `/me` handler to include `pendingRewardsCount`
6. Seed canonical `StreakMilestone` rows per the table above

---

## Out of Scope

- Grace period / streak freeze mechanic
- Rewards in cards or cosmetics (future)
- Push notifications for pending rewards
- Streak leaderboard
