# Gachapon — Plan 3 : Profil joueur & Paramètres

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la page profil public (`/profile/:username`) avec stats agrégées, et la page paramètres (`/settings`) avec gestion des API Keys.

**Architecture:** Un endpoint backend agrège les stats du joueur via Prisma (`GachaPull`, `UserCard`). Le frontend affiche le profil avec TanStack Query. La page settings réutilise les routes API Keys existantes (backend livré en Plan 1 — `POST/GET/DELETE /api-keys`). Aucun domain layer dédié : données read-only, requêtes directes via `postgresOrm.prisma`.

**Tech Stack:** Fastify 5 + Prisma 7, React 19 + TanStack Router + TanStack Query, Biome, Jest (e2e).

**Conventions importantes :**
- Zod v4 : `import { z } from 'zod/v4'`
- Routes : `FastifyPluginAsyncZod`, auth via `onRequest: [fastify.verifySessionCookie]`
- Repos : constructeur `({ postgresOrm }: IocContainer)`
- Tests e2e : `buildTestApp()` + `app.inject()`, vraie DB postgres docker `medisync-postgres`
- Linting : Biome. `npm run lint` dans `back/`
- Frontend queries dans `front/src/queries/`
- Frontend pages dans `front/src/routes/_authenticated/`

---

## Chunk 1 : Backend — GET /users/:username/profile

### Task 1 : Route profil utilisateur

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/users/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`
- Create: `back/src/test/e2e/users/profile.test.ts`

- [ ] **Step 1 : Écrire le test e2e (fail first)**

`back/src/test/e2e/users/profile.test.ts` :

```typescript
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('User profile route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let username: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    username = `prof${suffix}`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username,
        email: `prof${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /users/:username/profile — retourne le profil public', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.username).toBe(username)
    expect(typeof body.level).toBe('number')
    expect(typeof body.stats.totalPulls).toBe('number')
    expect(typeof body.stats.ownedCards).toBe('number')
    expect(typeof body.stats.legendaryCount).toBe('number')
    expect(typeof body.stats.dustGenerated).toBe('number')
  })

  it('GET /users/inexistant/profile — 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/inexistant_user_xyz/profile',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })

  it('GET /users/:username/profile — 401 sans auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile`,
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2 : Lancer le test (doit échouer)**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest src/test/e2e/users/profile.test.ts --no-coverage 2>&1 | tail -10
```

Expected : FAIL — Cannot find module ou 404.

- [ ] **Step 3 : Créer `back/src/main/interfaces/http/fastify/routes/users/index.ts`**

```typescript
import Boom from '@hapi/boom'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const usersRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { userRepository, postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /users/:username/profile — profil public agrégé
  fastify.get(
    '/users/:username/profile',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ username: z.string().min(1).max(30) }),
      },
    },
    async (request) => {
      const { username } = request.params

      const user = await userRepository.findByUsername(username)
      if (!user) throw Boom.notFound('User not found')

      const [totalPulls, ownedCards, legendaryCount, dustAgg] =
        await Promise.all([
          prisma.gachaPull.count({ where: { userId: user.id } }),
          prisma.userCard.count({ where: { userId: user.id } }),
          prisma.userCard.count({
            where: { userId: user.id, card: { rarity: 'LEGENDARY' } },
          }),
          prisma.gachaPull.aggregate({
            where: { userId: user.id },
            _sum: { dustEarned: true },
          }),
        ])

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        banner: user.banner,
        level: user.level,
        xp: user.xp,
        dust: user.dust,
        createdAt: user.createdAt,
        stats: {
          totalPulls,
          ownedCards,
          legendaryCount,
          dustGenerated: dustAgg._sum.dustEarned ?? 0,
        },
      }
    },
  )
}
```

- [ ] **Step 4 : Enregistrer la route dans `back/src/main/interfaces/http/fastify/routes/index.ts`**

Ajouter l'import et l'enregistrement :

```typescript
import { usersRouter } from './users'

// Dans la fonction routes, après collectionRouter :
await fastify.register(usersRouter)
```

- [ ] **Step 5 : Vérifier la compilation TypeScript**

```bash
cd back && npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 6 : Lancer les tests**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest src/test/e2e/users/profile.test.ts --no-coverage 2>&1 | tail -15
```

Expected : PASS (3 tests).

- [ ] **Step 7 : Lancer tous les tests e2e**

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage -c src/test/jest.config.ts 2>&1 | tail -10
```

Expected : tous les tests passent.

- [ ] **Step 8 : Biome**

```bash
cd back && npx biome check --write src/main/interfaces/http/fastify/routes/users/ src/test/e2e/users/ 2>&1 | tail -5
```

- [ ] **Step 9 : Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/users/index.ts \
        back/src/main/interfaces/http/fastify/routes/index.ts \
        back/src/test/e2e/users/profile.test.ts
git commit -m "feat: GET /users/:username/profile — stats agrégées"
```

---

## Chunk 2 : Frontend — Queries + Pages Profile & Settings

### Task 2 : TanStack Query hooks — profil et API Keys

**Files:**
- Create: `front/src/queries/useProfile.ts`

- [ ] **Step 1 : Créer `front/src/queries/useProfile.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export type UserProfile = {
  id: string
  username: string
  avatar: string | null
  banner: string | null
  level: number
  xp: number
  dust: number
  createdAt: string
  stats: {
    totalPulls: number
    ownedCards: number
    legendaryCount: number
    dustGenerated: number
  }
}

export type ApiKey = {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export type ApiKeyCreated = ApiKey & { key: string }

export const useUserProfile = (username: string) =>
  useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get<UserProfile>(`/users/${username}/profile`),
    enabled: !!username,
  })

export const useApiKeys = () =>
  useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/api-keys'),
  })

export const useCreateApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ApiKeyCreated>('/api-keys', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export const useDeleteApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -10
```

Expected : 0 erreurs.

- [ ] **Step 3 : Biome**

```bash
cd front && npx biome check --write src/queries/useProfile.ts 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add front/src/queries/useProfile.ts
git commit -m "feat: useProfile + useApiKeys queries"
```

---

### Task 3 : Page Profil (`/profile/$username`)

**Files:**
- Create: `front/src/routes/_authenticated/$username.tsx`

TanStack Router utilise le `$` comme préfixe pour les paramètres dynamiques dans les noms de fichier. La route générée sera `/_authenticated/profile/$username`.

- [ ] **Step 1 : Créer `front/src/routes/_authenticated/$username.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, Star, Zap, Layers, Sparkles } from 'lucide-react'

import { useUserProfile } from '../../queries/useProfile'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/profile/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  const { data: profile, isLoading, isError } = useUserProfile(username)
  const currentUser = useAuthStore((s) => s.user)

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-black text-text">Joueur introuvable</p>
          <p className="mt-2 text-text-light">@{username} n'existe pas.</p>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.username === username
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Banner */}
      <div className="h-32 w-full bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/10" />

      <div className="mx-auto max-w-3xl px-4 pb-12">
        {/* Avatar + infos principales */}
        <div className="-mt-12 flex items-end gap-4 pb-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-3xl font-black text-white ring-4 ring-background">
            {initials}
          </div>
          <div className="pb-2">
            <h1 className="text-xl font-black text-text">@{profile.username}</h1>
            <div className="flex items-center gap-3 text-xs text-text-light">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Membre depuis {joinedYear}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Niv. {profile.level}
              </span>
            </div>
          </div>
          {isOwnProfile && (
            <Link
              to="/settings"
              className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-light hover:border-primary/40 hover:text-text transition-colors"
            >
              Modifier
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Star className="h-4 w-4 text-yellow-400" />}
            label="Tirages"
            value={profile.stats.totalPulls}
          />
          <StatCard
            icon={<Layers className="h-4 w-4 text-accent" />}
            label="Cartes uniques"
            value={profile.stats.ownedCards}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            label="Légendaires"
            value={profile.stats.legendaryCount}
          />
          <StatCard
            icon={<Zap className="h-4 w-4 text-secondary" />}
            label="Dust généré"
            value={profile.stats.dustGenerated}
          />
        </div>

        {/* Lien collection */}
        {isOwnProfile && (
          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-text">Ma collection</h2>
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              Voir ma collection →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-text-light">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-black text-text">{value.toLocaleString('fr-FR')}</p>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

Corriger toute erreur avant de continuer. Si TanStack Router ne reconnaît pas la route `/_authenticated/profile/$username`, lancer :

```bash
cd front && npm run build 2>&1 | head -20
```

Le build régénère `routeTree.gen.ts`.

- [ ] **Step 3 : Biome**

```bash
cd front && npx biome check --write src/routes/_authenticated/profile.\$username.tsx 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add front/src/routes/_authenticated/profile.\$username.tsx
git commit -m "feat: page profil joueur /profile/:username"
```

---

### Task 4 : Page Paramètres (`/settings`)

**Files:**
- Create: `front/src/routes/_authenticated/settings.tsx`

- [ ] **Step 1 : Créer `front/src/routes/_authenticated/settings.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react'

import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from '../../queries/useProfile'
import type { ApiKeyCreated } from '../../queries/useProfile'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})

function Settings() {
  const user = useAuthStore((s) => s.user)
  const { data: apiKeys, isLoading } = useApiKeys()
  const { mutate: createKey, isPending: creating } = useCreateApiKey()
  const { mutate: deleteKey } = useDeleteApiKey()

  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreate = () => {
    const name = newKeyName.trim()
    if (!name) return
    createKey(name, {
      onSuccess: (key) => {
        setCreatedKey(key)
        setNewKeyName('')
        setVisible(true)
      },
    })
  }

  const handleCopy = () => {
    if (!createdKey) return
    void navigator.clipboard.writeText(createdKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl font-black text-text">Paramètres</h1>

        {/* Infos compte */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-bold text-text-light uppercase tracking-wide">
            Compte
          </h2>
          <div className="space-y-3">
            <InfoRow label="Pseudo" value={`@${user?.username}`} />
            <InfoRow label="Email" value={user?.email ?? '—'} />
            <InfoRow label="Rôle" value={user?.role ?? '—'} />
          </div>
        </section>

        {/* API Keys */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-bold text-text-light uppercase tracking-wide">
            Clés API
          </h2>
          <p className="mb-4 text-xs text-text-light">
            Utilisées pour accéder à l'API publique. La clé n'est affichée qu'une seule fois à la création.
          </p>

          {/* Formulaire création */}
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nom de la clé (ex: bot-discord)"
              maxLength={50}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Créer
            </button>
          </div>

          {/* Nouvelle clé affichée une fois */}
          {createdKey && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="mb-2 text-xs font-semibold text-primary">
                ⚠️ Copiez cette clé maintenant — elle ne sera plus affichée.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded bg-background px-2 py-1.5 font-mono text-xs text-text">
                  {visible ? createdKey.key : '•'.repeat(40)}
                </code>
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="rounded p-1.5 text-text-light hover:text-text transition-colors"
                  title={visible ? 'Masquer' : 'Afficher'}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1.5 text-text-light hover:text-primary transition-colors"
                  title="Copier"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Liste des clés */}
          {isLoading ? (
            <p className="text-xs text-text-light">Chargement…</p>
          ) : apiKeys?.length === 0 ? (
            <p className="text-xs text-text-light">Aucune clé API créée.</p>
          ) : (
            <ul className="space-y-2">
              {apiKeys?.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <Key className="h-4 w-4 shrink-0 text-text-light" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-text">{k.name}</p>
                    <p className="text-xs text-text-light">
                      Créée le {new Date(k.createdAt).toLocaleDateString('fr-FR')}
                      {k.lastUsedAt && ` · Utilisée le ${new Date(k.lastUsedAt).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteKey(k.id)}
                    className="rounded p-1.5 text-text-light hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
      <span className="text-xs text-text-light">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd front && npx tsc --noEmit 2>&1 | head -20
```

Corriger toute erreur avant de continuer.

- [ ] **Step 3 : Biome**

```bash
cd front && npx biome check --write src/routes/_authenticated/settings.tsx 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
git add front/src/routes/_authenticated/settings.tsx \
        front/src/routeTree.gen.ts
git commit -m "feat: page paramètres — infos compte + gestion API Keys"
```

---

## Revue finale

Lancer tous les tests backend :

```bash
cd back && NODE_OPTIONS='--experimental-vm-modules' npx jest --no-coverage -c src/test/jest.config.ts 2>&1 | tail -10
```

Expected : tous les tests passent.

Puis `superpowers:finishing-a-development-branch` pour merger.
