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
  id     String @id @default(uuid())
  tokens Int    @default(0)
  dust   Int    @default(0)
  xp     Int    @default(0)

  streakMilestones StreakMilestone[]
  achievements     Achievement[]
  quests           Quest[]
  userRewards      UserReward[]
}
```

#### `StreakMilestone`
Defines which reward is granted at a given streak day. Each day has at most one milestone. Days marked `isMilestone = true` are special reward thresholds (e.g., day 3, 7, 14, 30).

```prisma
model StreakMilestone {
  id          String  @id @default(uuid())
  day         Int     @unique
  isMilestone Boolean @default(false)
  rewardId    String
  reward      Reward  @relation(fields: [rewardId], references: [id])
}
```

Example milestones:

| Day | Tokens | Dust | XP | isMilestone |
|-----|--------|------|----|-------------|
| 1   | 3      | 5    | 10 | false       |
| 2   | 4      | 6    | 12 | false       |
| 3   | 5      | 8    | 15 | true        |
| 7   | 8      | 15   | 25 | true        |
| 14  | 12     | 30   | 40 | true        |
| 30  | 20     | 60   | 60 | true        |

#### `UserReward`
Tracks every reward granted to a user, across all sources. `claimedAt = null` means the reward is pending claim.

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
  sourceId  String?      // e.g., streakMilestoneId, achievementId, questId
  claimedAt DateTime?
  createdAt DateTime     @default(now())

  @@index([userId, claimedAt])
}
```

### Modified tables

#### `User`
- Add `bestStreak Int @default(0)` — persists the user's highest streak ever reached
- `streakDays Int @default(0)` already exists ✓
- `lastLoginAt DateTime?` already exists (currently not updated — will be fixed) ✓

#### `Achievement`
- Remove `rewardTokens Int` and `rewardDust Int`
- Add `rewardId String` → `Reward`

#### `Quest`
- Remove `rewardTokens Int` and `rewardDust Int`
- Add `rewardId String` → `Reward`

---

## Backend Logic

### Streak update on login

Executed inside `authDomain.login()` after successful credential verification, within a single transaction alongside the existing auth logic.

```
1. Load user (lastLoginAt, streakDays, bestStreak)
2. Compute dayGap = UTC day diff between lastLoginAt and now()
   - dayGap = 0 → already logged in today, skip streak update
   - dayGap = 1 → streakDays += 1
   - dayGap > 1 → bestStreak = max(bestStreak, streakDays), streakDays = 1
3. Update lastLoginAt = now()
4. Look up StreakMilestone where day = streakDays
5. If milestone found → create UserReward { source: STREAK, sourceId: milestone.id, claimedAt: null }
6. Save user + userReward in transaction
```

All day comparisons are done in UTC to avoid timezone edge cases.

### API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/rewards/pending` | Required | List unclaimed UserRewards for the current user |
| `POST` | `/rewards/:id/claim` | Required | Claim a single pending reward |
| `GET` | `/rewards/history` | Required | List claimed rewards (for profile history) |

### Claim logic (`POST /rewards/:id/claim`)

Atomic transaction:
1. Load `UserReward` — verify it belongs to the current user
2. Verify `claimedAt === null` (idempotency guard)
3. Credit `user.tokens += reward.tokens`, `user.dust += reward.dust`, `user.xp += reward.xp`
4. Handle level-up if XP crosses threshold (reuse existing XP/level logic)
5. Set `userReward.claimedAt = now()`

### Login response

The login response includes `pendingRewardsCount: number` so the frontend can immediately show the badge without an extra request.

---

## Frontend

### Components

#### `RewardsBadge`
- Displayed in the navbar
- Shows a dot or count badge when `pendingRewardsCount > 0`
- Count sourced from `GET /me` on initial load, then from login response

#### `RewardsPopup`
- Opens on badge click
- Lists all pending `UserReward` items via `GET /rewards/pending`
- Each item shows: source label (e.g., "Streak — Jour 7"), tokens/dust/xp amounts
- "Réclamer" button per item + "Tout réclamer" button at the top
- After claim: React Query invalidates `/rewards/pending` and `/me` (to update balances)

#### `RewardCard`
- Individual reward display inside the popup
- Shows source, amounts with icons, and claim button
- Milestone rewards visually distinguished (gold border, special icon)

### Profile page additions

- Current streak: `streakDays` with a flame icon
- Best streak: `bestStreak` displayed as a personal record

### State management

- `GET /rewards/pending` via React Query, invalidated on each claim
- `GET /me` returns `pendingRewardsCount` for badge on app load
- Login response also carries `pendingRewardsCount` to avoid double fetch after login

---

## Migration Strategy

1. Create `Reward`, `StreakMilestone`, `UserReward` tables
2. Migrate existing `Achievement.rewardTokens/rewardDust` → create corresponding `Reward` rows, set `achievement.rewardId`
3. Migrate existing `Quest.rewardTokens/rewardDust` → same pattern
4. Add `User.bestStreak`
5. Seed initial `StreakMilestone` rows (days 1–7, 14, 21, 30)

---

## Out of Scope

- Grace period / streak freeze mechanic
- Rewards in cards or cosmetics (future)
- Push notifications for pending rewards
- Streak leaderboard
