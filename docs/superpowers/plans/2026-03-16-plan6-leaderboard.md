# Gachapon — Plan 6 : Leaderboard & Quêtes

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les classements (`GET /leaderboard`, page `/leaderboard`) et la page quêtes (`/quests`) affichant les quêtes quotidiennes actives.

**Architecture:** Le leaderboard est calculé à la volée depuis `UserCard` et `GachaPull` via des requêtes Prisma agrégées (pas de table dédiée). Les quêtes sont lues en lecture seule côté frontend — le tracking de progression est prévu pour un plan ultérieur. Pas de domain layer dédié (données read-only).

**Tech Stack:** Fastify 5 + Prisma 7, React 19 + TanStack Router + TanStack Query, Biome, Jest (e2e).

**Conventions importantes :**
- Zod v4 : `import { z } from 'zod/v4'`
- Routes : `FastifyPluginAsyncZod`, auth via `onRequest: [fastify.verifySessionCookie]`
- Tests e2e : `buildTestApp()` + `app.inject()`, vraie DB postgres docker
- Linting : Biome. `npm run lint` dans `back/`

---

## Chunk 1 : Backend — Leaderboard

### Task 1 : Route leaderboard + tests e2e

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`
- Create: `back/src/test/e2e/leaderboard/leaderboard.test.ts`

**Design (section 13) :**
- `collectors` : % de cartes distinctes possédées / total cartes du set actif, trié desc
- `legendaries` : count de UserCard avec `card.rarity = LEGENDARY`, trié desc
- `bestTeams` : pour chaque équipe, moyenne du % de collection de ses membres, trié desc

- [ ] **Step 1 : Écrire le test e2e (fail first)**

`back/src/test/e2e/leaderboard/leaderboard.test.ts` :

```typescript
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Leaderboard route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `lb${suffix}`,
        email: `lb${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /leaderboard — retourne les 3 classements', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.collectors)).toBe(true)
    expect(Array.isArray(body.legendaries)).toBe(true)
    expect(Array.isArray(body.bestTeams)).toBe(true)
  })

  it('GET /leaderboard — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/leaderboard' })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2 : Lancer le test (doit échouer)**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest src/test/e2e/leaderboard/leaderboard.test.ts --no-coverage 2>&1 | tail -10
```

Expected : FAIL — route not found.

- [ ] **Step 3 : Créer `back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts`**

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

export const leaderboardRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /leaderboard — 3 classements : collectionneurs, légendaires, meilleures équipes
  fastify.get(
    '/leaderboard',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      // Nombre total de cartes dans les sets actifs
      const totalCards = await prisma.card.count({
        where: { set: { isActive: true } },
      })

      // Classement 1 : % de collection (collectionneurs)
      const collectorRows = await prisma.userCard.groupBy({
        by: ['userId'],
        _count: { cardId: true },
        orderBy: { _count: { cardId: 'desc' } },
        take: 10,
      })

      const collectorIds = collectorRows.map((r) => r.userId)
      const collectorUsers = await prisma.user.findMany({
        where: { id: { in: collectorIds } },
        select: { id: true, username: true, avatar: true },
      })
      const userMap = new Map(collectorUsers.map((u) => [u.id, u]))

      const collectors = collectorRows.map((r, i) => ({
        rank: i + 1,
        user: userMap.get(r.userId) ?? { id: r.userId, username: 'Unknown', avatar: null },
        ownedCards: r._count.cardId,
        percentage: totalCards > 0 ? Math.round((r._count.cardId / totalCards) * 100) : 0,
      }))

      // Classement 2 : légendaires
      // Note: Prisma groupBy ne supporte pas les filtres relationnels — pré-fetch des IDs scalaires requis
      const legendaryCardIds = (
        await prisma.card.findMany({
          where: { rarity: 'LEGENDARY' },
          select: { id: true },
        })
      ).map((c) => c.id)
      const legendaryRows = await prisma.userCard.groupBy({
        by: ['userId'],
        where: { cardId: { in: legendaryCardIds } },
        _count: { cardId: true },
        orderBy: { _count: { cardId: 'desc' } },
        take: 10,
      })

      const legendaryIds = legendaryRows.map((r) => r.userId)
      const legendaryUsers = await prisma.user.findMany({
        where: { id: { in: legendaryIds } },
        select: { id: true, username: true, avatar: true },
      })
      const legendaryUserMap = new Map(legendaryUsers.map((u) => [u.id, u]))

      const legendaries = legendaryRows.map((r, i) => ({
        rank: i + 1,
        user: legendaryUserMap.get(r.userId) ?? { id: r.userId, username: 'Unknown', avatar: null },
        legendaryCount: r._count.cardId,
      }))

      // Classement 3 : meilleures équipes (moyenne du % de collection des membres)
      const teams = await prisma.team.findMany({
        include: {
          members: { select: { userId: true } },
          _count: { select: { members: true } },
        },
        take: 20,
      })

      // Pré-fetch des IDs de cartes actives (groupBy ne supporte pas les filtres relationnels)
      const activeCardIds = (
        await prisma.card.findMany({
          where: { set: { isActive: true } },
          select: { id: true },
        })
      ).map((c) => c.id)

      // Pour chaque équipe, calculer le % moyen de collection de ses membres
      const teamScores = await Promise.all(
        teams.map(async (team) => {
          if (team.members.length === 0) return { team, avgPercentage: 0 }
          const memberIds = team.members.map((m) => m.userId)
          const ownedPerMember = await prisma.userCard.groupBy({
            by: ['userId'],
            where: { userId: { in: memberIds }, cardId: { in: activeCardIds } },
            _count: { cardId: true },
          })
          const ownedMap = new Map(ownedPerMember.map((r) => [r.userId, r._count.cardId]))
          const totalPct = memberIds.reduce((sum, uid) => {
            const owned = ownedMap.get(uid) ?? 0
            return sum + (totalCards > 0 ? owned / totalCards : 0)
          }, 0)
          return { team, avgPercentage: Math.round((totalPct / memberIds.length) * 100) }
        }),
      )

      const bestTeams = teamScores
        .sort((a, b) => b.avgPercentage - a.avgPercentage)
        .slice(0, 10)
        .map((entry, i) => ({
          rank: i + 1,
          team: {
            id: entry.team.id,
            name: entry.team.name,
            slug: entry.team.slug,
            memberCount: entry.team._count.members,
          },
          avgPercentage: entry.avgPercentage,
        }))

      return { collectors, legendaries, bestTeams }
    },
  )
}
```

- [ ] **Step 4 : Enregistrer dans `routes/index.ts`**

```typescript
import { leaderboardRouter } from './leaderboard'

// Dans la fonction routes :
await fastify.register(leaderboardRouter)
```

- [ ] **Step 5 : Vérifier la compilation TypeScript**

```bash
cd back && npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 6 : Lancer les tests e2e**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest src/test/e2e/leaderboard/leaderboard.test.ts --no-coverage 2>&1 | tail -15
```

Expected : PASS (2 tests).

- [ ] **Step 7 : Lancer tous les tests**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage -c src/test/jest.config.ts 2>&1 | tail -10
```

Expected : tous les tests passent.

- [ ] **Step 8 : Biome**

```bash
cd back && npx biome check --write src/main/interfaces/http/fastify/routes/leaderboard/ src/test/e2e/leaderboard/ 2>&1 | tail -5
```

- [ ] **Step 9 : Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts \
        back/src/main/interfaces/http/fastify/routes/index.ts \
        back/src/test/e2e/leaderboard/leaderboard.test.ts
git commit -m "feat: GET /leaderboard — collectionneurs, légendaires, meilleures équipes"
```

---

## Chunk 2 : Frontend — Pages Leaderboard & Quêtes

### Task 2 : TanStack Query hooks — leaderboard & quêtes

**Files:**
- Create: `front/src/queries/useLeaderboard.ts`

- [ ] **Step 1 : Créer `front/src/queries/useLeaderboard.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export type CollectorEntry = {
  rank: number
  user: { id: string; username: string; avatar: string | null }
  ownedCards: number
  percentage: number
}

export type LegendaryEntry = {
  rank: number
  user: { id: string; username: string; avatar: string | null }
  legendaryCount: number
}

export type TeamEntry = {
  rank: number
  team: { id: string; name: string; slug: string; memberCount: number }
  avgPercentage: number
}

export type Leaderboard = {
  collectors: CollectorEntry[]
  legendaries: LegendaryEntry[]
  bestTeams: TeamEntry[]
}

export type Quest = {
  id: string
  key: string
  name: string
  description: string
  rewardTokens: number
  rewardDust: number
}

export const useLeaderboard = () =>
  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<Leaderboard>('/leaderboard'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3 : Biome**

```bash
cd front && npx biome check --write src/queries/useLeaderboard.ts 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add front/src/queries/useLeaderboard.ts
git commit -m "feat: useLeaderboard query"
```

---

### Task 3 : Page Classement (`/leaderboard`)

**Files:**
- Create: `front/src/routes/_authenticated/leaderboard.tsx`

- [ ] **Step 1 : Créer `front/src/routes/_authenticated/leaderboard.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Trophy, Star, Users } from 'lucide-react'

import { useLeaderboard } from '../../queries/useLeaderboard'
import type { CollectorEntry, LegendaryEntry, TeamEntry } from '../../queries/useLeaderboard'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/leaderboard')({
  component: LeaderboardPage,
})

type Tab = 'collectors' | 'legendaries' | 'teams'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'collectors', label: 'Collectionneurs', icon: <Trophy className="h-4 w-4" /> },
  { id: 'legendaries', label: 'Légendaires', icon: <Star className="h-4 w-4" /> },
  { id: 'teams', label: 'Équipes', icon: <Users className="h-4 w-4" /> },
]

const RANK_STYLES = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('collectors')
  const { data, isLoading } = useLeaderboard()
  const currentUser = useAuthStore((s) => s.user)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-black text-text">Classement</h1>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-card text-text shadow-sm'
                  : 'text-text-light hover:text-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {activeTab === 'collectors' &&
              (data?.collectors.length === 0 ? (
                <EmptyState />
              ) : (
                data?.collectors.map((entry) => (
                  <CollectorRow
                    key={entry.user.id}
                    entry={entry}
                    rankStyle={RANK_STYLES[entry.rank - 1] ?? 'text-text-light'}
                    isMe={currentUser?.id === entry.user.id}
                  />
                ))
              ))}

            {activeTab === 'legendaries' &&
              (data?.legendaries.length === 0 ? (
                <EmptyState />
              ) : (
                data?.legendaries.map((entry) => (
                  <LegendaryRow
                    key={entry.user.id}
                    entry={entry}
                    rankStyle={RANK_STYLES[entry.rank - 1] ?? 'text-text-light'}
                    isMe={currentUser?.id === entry.user.id}
                  />
                ))
              ))}

            {activeTab === 'teams' &&
              (data?.bestTeams.length === 0 ? (
                <EmptyState />
              ) : (
                data?.bestTeams.map((entry) => (
                  <TeamRow
                    key={entry.team.id}
                    entry={entry}
                    rankStyle={RANK_STYLES[entry.rank - 1] ?? 'text-text-light'}
                  />
                ))
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-32 items-center justify-center">
      <p className="text-sm text-text-light">Aucune donnée pour l'instant.</p>
    </div>
  )
}

function CollectorRow({
  entry,
  rankStyle,
  isMe,
}: {
  entry: CollectorEntry
  rankStyle: string
  isMe: boolean
}) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 ${isMe ? 'bg-primary/5' : ''}`}>
      <span className={`w-6 text-center text-sm font-black ${rankStyle}`}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
      </span>
      <Link
        to="/profile/$username"
        params={{ username: entry.user.username }}
        className="flex-1 text-sm font-semibold text-text hover:text-primary transition-colors"
      >
        @{entry.user.username}
        {isMe && <span className="ml-1 text-xs text-primary">(moi)</span>}
      </Link>
      <div className="text-right">
        <p className="text-sm font-bold text-text">{entry.percentage}%</p>
        <p className="text-xs text-text-light">{entry.ownedCards} cartes</p>
      </div>
    </div>
  )
}

function LegendaryRow({
  entry,
  rankStyle,
  isMe,
}: {
  entry: LegendaryEntry
  rankStyle: string
  isMe: boolean
}) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 ${isMe ? 'bg-primary/5' : ''}`}>
      <span className={`w-6 text-center text-sm font-black ${rankStyle}`}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
      </span>
      <Link
        to="/profile/$username"
        params={{ username: entry.user.username }}
        className="flex-1 text-sm font-semibold text-text hover:text-primary transition-colors"
      >
        @{entry.user.username}
        {isMe && <span className="ml-1 text-xs text-primary">(moi)</span>}
      </Link>
      <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
        <Star className="h-3.5 w-3.5" />
        {entry.legendaryCount}
      </div>
    </div>
  )
}

function TeamRow({
  entry,
  rankStyle,
}: {
  entry: TeamEntry
  rankStyle: string
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
      <span className={`w-6 text-center text-sm font-black ${rankStyle}`}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
      </span>
      <Link
        to="/teams/$id"
        params={{ id: entry.team.id }}
        className="flex-1 text-sm font-semibold text-text hover:text-primary transition-colors"
      >
        {entry.team.name}
        <span className="ml-1 text-xs font-normal text-text-light">
          {entry.team.memberCount} membres
        </span>
      </Link>
      <p className="text-sm font-bold text-text">{entry.avgPercentage}%</p>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3 : Biome**

```bash
cd front && npx biome check --write src/routes/_authenticated/leaderboard.tsx 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add front/src/routes/_authenticated/leaderboard.tsx
git commit -m "feat: page classement /leaderboard — collectionneurs, légendaires, équipes"
```

---

### Task 4 : Page Quêtes (`/quests`)

**Files:**
- Create: `front/src/routes/_authenticated/quests.tsx`

La page quêtes affiche les quêtes actives. Le tracking de progression (critères JSON, reset quotidien) est prévu pour un plan ultérieur — cette page est en lecture seule.

- [ ] **Step 1 : Ajouter `useQuests` dans `front/src/queries/useLeaderboard.ts`**

Ajouter à la fin du fichier :

```typescript
export const useQuests = () =>
  useQuery({
    queryKey: ['quests'],
    queryFn: () => api.get<{ quests: Quest[] }>('/quests'),
  })
```

- [ ] **Step 2 : Ajouter le test e2e pour `GET /quests`**

Dans `back/src/test/e2e/leaderboard/leaderboard.test.ts`, ajouter ce cas de test dans le `describe` existant :

```typescript
  it('GET /quests — retourne la liste des quêtes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quests',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.quests)).toBe(true)
  })

  it('GET /quests — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/quests' })
    expect(res.statusCode).toBe(401)
  })
```

- [ ] **Step 3 : Créer la route backend `GET /quests` (lecture seule)**

Dans `back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts`, ajouter à la fin de la fonction `leaderboardRouter` :

```typescript
// GET /quests — quêtes actives
fastify.get(
  '/quests',
  { onRequest: [fastify.verifySessionCookie] },
  async () => {
    const quests = await prisma.quest.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return {
      quests: quests.map((q) => ({
        id: q.id,
        key: q.key,
        name: q.name,
        description: q.description,
        rewardTokens: q.rewardTokens,
        rewardDust: q.rewardDust,
      })),
    }
  },
)
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd back && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5 : Créer `front/src/routes/_authenticated/quests.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Target, Zap, Sparkles } from 'lucide-react'

import { useQuests } from '../../queries/useLeaderboard'
import type { Quest } from '../../queries/useLeaderboard'

export const Route = createFileRoute('/_authenticated/quests')({
  component: QuestsPage,
})

function QuestsPage() {
  const { data, isLoading } = useQuests()
  const quests = data?.quests ?? []

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-text">Quêtes</h1>
          <p className="text-sm text-text-light">Quêtes quotidiennes — se réinitialisent à minuit UTC</p>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : quests.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
            <Target className="h-10 w-10 text-text-light" />
            <p className="text-text-light">Aucune quête disponible pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-text">{quest.name}</h3>
          <p className="mt-0.5 text-xs text-text-light">{quest.description}</p>
          <div className="mt-2 flex items-center gap-3">
            {quest.rewardTokens > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Zap className="h-3 w-3" />
                +{quest.rewardTokens} token{quest.rewardTokens !== 1 ? 's' : ''}
              </span>
            )}
            {quest.rewardDust > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
                <Sparkles className="h-3 w-3" />
                +{quest.rewardDust} dust
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6 : Vérifier la compilation TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7 : Biome**

```bash
cd front && npx biome check --write src/routes/_authenticated/quests.tsx src/queries/useLeaderboard.ts 2>&1 | tail -5
```

- [ ] **Step 8 : Lancer tous les tests backend**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage -c src/test/jest.config.ts 2>&1 | tail -10
```

Expected : tous les tests passent.

- [ ] **Step 9 : Commit**

```bash
git add front/src/routes/_authenticated/quests.tsx \
        front/src/queries/useLeaderboard.ts \
        back/src/main/interfaces/http/fastify/routes/leaderboard/index.ts \
        back/src/test/e2e/leaderboard/leaderboard.test.ts
git commit -m "feat: page quêtes /quests + GET /quests (lecture seule)"
```

---

## Revue finale

Lancer tous les tests backend :

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage -c src/test/jest.config.ts 2>&1 | tail -10
```

Expected : tous les tests passent.

Puis `superpowers:finishing-a-development-branch` pour merger.
