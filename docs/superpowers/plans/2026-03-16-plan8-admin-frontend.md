# Gachapon — Plan 8: Admin Frontend

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le back-office frontend admin — layout avec sidebar + guard SUPER_ADMIN, 6 pages (`/admin`, `/admin/users`, `/admin/cards`, `/admin/shop`, `/admin/config`, `/admin/stats`), composants réutilisables et queries TanStack Query.

**Architecture:** Layout TanStack Router `_admin.tsx` avec `beforeLoad` guard. Sidebar fixe commune. Même thème dark gamer (violet/bleu, `bg-background`). Composants partagés dans `components/admin/`. Queries TanStack dans `queries/useAdmin*.ts`. Graphiques via `recharts`.

**Tech Stack:** React 19, TanStack Router, TanStack Query, TailwindCSS v4, shadcn/ui composants existants, `recharts`, lucide-react (déjà installé).

**Prérequis:** Plans 6 et 7 complétés (API admin disponible).

**Conventions :**
- Routes TanStack : `createFileRoute('/_admin/admin.xxx')`
- Queries : même pattern que `useGacha.ts`, `useCollection.ts` (TanStack Query `useQuery` / `useMutation`)
- API calls via `fetch` vers `VITE_API_URL` avec `credentials: 'include'`
- Style : classes Tailwind, pas de CSS modules

---

## Chunk 1: Setup + layout + composants partagés

### Task 1: Installer `recharts`

**Files:**
- Modify: `front/package.json`

- [ ] **Step 1: Installer recharts**

```bash
cd front && npm install recharts
```

- [ ] **Step 2: Vérifier que l'import fonctionne**

```bash
cd front && npm run build 2>&1 | head -20
```

Expected: aucune erreur liée à recharts.

- [ ] **Step 3: Commit**

```bash
cd front && git add package.json package-lock.json
git commit -m "feat(admin): install recharts"
```

---

### Task 2: Queries TanStack — `useAdminUsers`, `useAdminConfig`, `useAdminStats`

**Files:**
- Create: `front/src/queries/useAdminUsers.ts`
- Create: `front/src/queries/useAdminShop.ts`
- Create: `front/src/queries/useAdminCards.ts`
- Create: `front/src/queries/useAdminConfig.ts`
- Create: `front/src/queries/useAdminStats.ts`

Regarder `front/src/queries/useGacha.ts` et `useCollection.ts` pour les patterns existants avant d'écrire ces fichiers.

- [ ] **Step 1: Écrire `useAdminUsers.ts`**

```typescript
// front/src/queries/useAdminUsers.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function useAdminUsers(params: { page?: number; limit?: number; search?: string } = {}) {
  const { page = 1, limit = 20, search } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) })
  return useQuery({
    queryKey: ['admin', 'users', page, limit, search],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/users?${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<{ users: AdminUser[]; total: number; page: number; limit: number }>
    },
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json() as Promise<{ user: AdminUser; stats: UserStats }>
    },
    enabled: !!id,
  })
}

export function useAdminUpdateTokens() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/tokens`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error('Failed to update tokens')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateDust() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/dust`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error('Failed to update dust')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'USER' | 'SUPER_ADMIN' }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/role`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminSuspendUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/suspend`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      })
      if (!res.ok) throw new Error('Failed to update suspend')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export type AdminUser = {
  id: string; username: string; email: string; role: string
  tokens: number; dust: number; suspended: boolean; createdAt: string
}
export type UserStats = { pullsTotal: number; dustGenerated: number; cardsOwned: number }
```

- [ ] **Step 2: Écrire `useAdminConfig.ts`**

```typescript
// front/src/queries/useAdminConfig.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type AdminConfig = {
  tokenRegenIntervalHours: number; tokenMaxStock: number; pityThreshold: number
  dustCommon: number; dustUncommon: number; dustRare: number; dustEpic: number; dustLegendary: number
}

export function useAdminConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/config`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json() as Promise<AdminConfig>
    },
  })
}

export function useAdminSaveConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<AdminConfig>) => {
      const res = await fetch(`${API_URL}/admin/config`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save config')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config'] }),
  })
}
```

- [ ] **Step 3: Écrire `useAdminStats.ts`**

```typescript
// front/src/queries/useAdminStats.ts
import { useQuery } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/dashboard`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      return res.json() as Promise<{
        kpis: { totalUsers: number; pullsToday: number; dustGenerated: number; legendaryCount: number }
        pullsSeries: { day: string; count: number }[]
      }>
    },
    refetchInterval: 60_000, // rafraîchir toutes les 60s
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/stats`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<{
        rarityDistribution: { rarity: string; count: number }[]
        topCards: { cardId: string; name: string; rarity: string; count: number }[]
        topUsers: { userId: string; username: string; count: number }[]
      }>
    },
  })
}
```

- [ ] **Step 4: Écrire `useAdminCards.ts`**

```typescript
// front/src/queries/useAdminCards.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function useAdminSets() {
  return useQuery({
    queryKey: ['admin', 'sets'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/sets`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch sets')
      return res.json() as Promise<{ sets: AdminCardSet[] }>
    },
  })
}

export function useAdminCreateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; isActive: boolean }) => {
      const res = await fetch(`${API_URL}/admin/sets`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create set')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminUpdateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; isActive?: boolean }) => {
      const res = await fetch(`${API_URL}/admin/sets/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update set')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminDeleteSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/sets/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete set')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminCards(params: { setId?: string; rarity?: string } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
  return useQuery({
    queryKey: ['admin', 'cards', params],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/cards?${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch cards')
      return res.json() as Promise<{ cards: AdminCard[] }>
    },
  })
}

export function useAdminCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`${API_URL}/admin/cards`, {
        method: 'POST', credentials: 'include', body: formData,
      })
      if (!res.ok) throw new Error('Failed to create card')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}

export function useAdminDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/cards/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete card')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}

export type AdminCardSet = { id: string; name: string; description?: string; isActive: boolean; createdAt: string; _count: { cards: number } }
export type AdminCard = { id: string; name: string; imageUrl: string; rarity: string; variant?: string; dropWeight: number; set: { id: string; name: string } }
```

- [ ] **Step 5: Écrire `useAdminShop.ts`**

```typescript
// front/src/queries/useAdminShop.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type AdminShopItem = {
  id: string; name: string; description: string; type: string
  dustCost: number; value: unknown; isActive: boolean; createdAt: string
}

export function useAdminShopItems() {
  return useQuery({
    queryKey: ['admin', 'shop-items'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/shop-items`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch shop items')
      return res.json() as Promise<{ items: AdminShopItem[] }>
    },
  })
}

export function useAdminCreateShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<AdminShopItem, 'id' | 'createdAt'>) => {
      const res = await fetch(`${API_URL}/admin/shop-items`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create shop item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

export function useAdminUpdateShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdminShopItem> & { id: string }) => {
      const res = await fetch(`${API_URL}/admin/shop-items/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update shop item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

export function useAdminDeleteShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/shop-items/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete shop item')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}
```

- [ ] **Step 6: Commit**

```bash
cd front && git add src/queries/useAdmin*.ts
git commit -m "feat(admin): TanStack Query hooks for all admin resources"
```

---

### Task 3: Composants partagés admin

**Files:**
- Create: `front/src/components/admin/StatCard.tsx`
- Create: `front/src/components/admin/AdminTable.tsx`
- Create: `front/src/components/admin/AdminDrawer.tsx`
- Create: `front/src/components/admin/PullsChart.tsx`

- [ ] **Step 1: `StatCard.tsx`**

```typescript
// front/src/components/admin/StatCard.tsx
type StatCardProps = {
  label: string
  value: string | number
  sub?: string
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-light">{label}</p>
      <p className="mt-1 text-3xl font-black text-text">{value}</p>
      {sub && <p className="mt-1 text-xs text-text-light">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: `AdminTable.tsx`**

```typescript
// front/src/components/admin/AdminTable.tsx
import type { ReactNode } from 'react'

type Column<T> = {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
}

type AdminTableProps<T extends { id: string }> = {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  isLoading?: boolean
}

export function AdminTable<T extends { id: string }>({ columns, rows, onRowClick, isLoading }: AdminTableProps<T>) {
  if (isLoading) {
    return <div className="flex h-32 items-center justify-center text-text-light">Chargement…</div>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-light">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface/50' : ''}`}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-text">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-text-light">Aucun résultat</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: `AdminDrawer.tsx`**

```typescript
// front/src/components/admin/AdminDrawer.tsx
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'

type AdminDrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function AdminDrawer({ open, onClose, title, children }: AdminDrawerProps) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: `PullsChart.tsx`**

```typescript
// front/src/components/admin/PullsChart.tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type PullsChartProps = {
  data: { day: string; count: number }[]
}

export function PullsChart({ data }: PullsChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-sm font-semibold text-text-light uppercase tracking-widest">Pulls / jour (30 derniers jours)</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--text-light))' }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-light))' }} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
            labelStyle={{ color: 'hsl(var(--text))' }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd front && git add src/components/admin/
git commit -m "feat(admin): shared admin components — StatCard, AdminTable, AdminDrawer, PullsChart"
```

---

### Task 4: Layout admin + guard

**Files:**
- Create: `front/src/routes/_admin.tsx`

Lire `front/src/routes/_authenticated.tsx` avant pour suivre le même pattern de layout.

- [ ] **Step 1: Écrire `_admin.tsx`**

```typescript
// front/src/routes/_admin.tsx
import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import {
  BarChart2, ChevronRight, LayoutDashboard, Package, Settings, ShoppingBag, Users,
} from 'lucide-react'

import { useAuthStore } from '../stores/auth.store'

export const Route = createFileRoute('/_admin')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (!user || user.role !== 'SUPER_ADMIN') {
      throw redirect({ to: '/' })
    }
  },
  component: AdminLayout,
})

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Joueurs', icon: Users },
  { to: '/admin/cards', label: 'Cartes', icon: Package },
  { to: '/admin/shop', label: 'Boutique', icon: ShoppingBag },
  { to: '/admin/config', label: 'Config', icon: Settings },
  { to: '/admin/stats', label: 'Stats', icon: BarChart2 },
] as const

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <span className="text-xs font-black uppercase tracking-widest text-primary">Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-primary/20 text-primary' : 'text-text-light hover:bg-surface hover:text-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd front && git add src/routes/_admin.tsx
git commit -m "feat(admin): admin layout with sidebar + SUPER_ADMIN guard"
```

---

## Chunk 2: Pages admin

### Task 5: Page Dashboard `/admin`

**Files:**
- Create: `front/src/routes/_admin/admin.tsx`

- [ ] **Step 1: Écrire la page dashboard**

```typescript
// front/src/routes/_admin/admin.tsx
import { createFileRoute } from '@tanstack/react-router'

import { PullsChart } from '../../components/admin/PullsChart'
import { StatCard } from '../../components/admin/StatCard'
import { useAdminDashboard } from '../../queries/useAdminStats'

export const Route = createFileRoute('/_admin/admin')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard()

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-text-light">Chargement…</div>
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={data.kpis.totalUsers.toLocaleString()} />
        <StatCard label="Pulls aujourd'hui" value={data.kpis.pullsToday.toLocaleString()} />
        <StatCard label="Dust généré" value={data.kpis.dustGenerated.toLocaleString()} sub="total cumulé" />
        <StatCard label="Légendaires tirés" value={data.kpis.legendaryCount.toLocaleString()} />
      </div>

      <PullsChart data={data.pullsSeries} />
    </div>
  )
}
```

- [ ] **Step 2: Régénérer le routeTree (TanStack Router)**

```bash
cd front && npm run dev -- --once 2>/dev/null || npx tsr generate
```

Vérifier que `front/src/routeTree.gen.ts` est mis à jour avec le nouveau layout `/_admin` et la route `/_admin/admin`.

- [ ] **Step 3: Commit**

```bash
cd front && git add src/routes/_admin/ src/routeTree.gen.ts
git commit -m "feat(admin): dashboard page — KPIs + pulls chart"
```

---

### Task 6: Page Joueurs `/admin/users`

**Files:**
- Create: `front/src/routes/_admin/admin.users.tsx`

- [ ] **Step 1: Écrire la page joueurs**

```typescript
// front/src/routes/_admin/admin.users.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { AdminDrawer } from '../../components/admin/AdminDrawer'
import { AdminTable } from '../../components/admin/AdminTable'
import { Button } from '../../components/ui/button'
import {
  type AdminUser,
  useAdminSuspendUser,
  useAdminUpdateDust,
  useAdminUpdateRole,
  useAdminUpdateTokens,
  useAdminUser,
  useAdminUsers,
} from '../../queries/useAdminUsers'

export const Route = createFileRoute('/_admin/admin/users')({
  component: AdminUsers,
})

function AdminUsers() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [tokenAmount, setTokenAmount] = useState('')
  const [dustAmount, setDustAmount] = useState('')

  const { data, isLoading } = useAdminUsers({ page, limit: 20, search: search || undefined })
  const { data: detail } = useAdminUser(selected?.id ?? '')
  const updateTokens = useAdminUpdateTokens()
  const updateDust = useAdminUpdateDust()
  const updateRole = useAdminUpdateRole()
  const suspend = useAdminSuspendUser()

  const columns = [
    { key: 'username', header: 'Username' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: AdminUser) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.role === 'SUPER_ADMIN' ? 'bg-primary/20 text-primary' : 'bg-border text-text-light'}`}>
        {u.role}
      </span>
    )},
    { key: 'tokens', header: 'Tokens' },
    { key: 'dust', header: 'Dust' },
    { key: 'suspended', header: 'Statut', render: (u: AdminUser) => (
      <span className={`text-xs font-semibold ${u.suspended ? 'text-red-400' : 'text-green-400'}`}>
        {u.suspended ? 'Suspendu' : 'Actif'}
      </span>
    )},
  ]

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Joueurs</h1>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Rechercher par username ou email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <AdminTable columns={columns} rows={data?.users ?? []} onRowClick={setSelected} isLoading={isLoading} />

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-light">
          <span>{data.total} utilisateurs</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
            <Button size="sm" variant="ghost" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Suivant</Button>
          </div>
        </div>
      )}

      <AdminDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.username ?? ''}>
        {selected && detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">{detail.stats.pullsTotal}</p>
                <p className="text-xs text-text-light">Pulls</p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">{detail.stats.cardsOwned}</p>
                <p className="text-xs text-text-light">Cartes</p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">{detail.stats.dustGenerated}</p>
                <p className="text-xs text-text-light">Dust gagné</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-light">Attribuer tokens</p>
              <div className="flex gap-2">
                <input type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Quantité" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                <Button size="sm" onClick={() => { updateTokens.mutate({ id: selected.id, amount: Number(tokenAmount) }); setTokenAmount('') }}>
                  Attribuer
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-light">Attribuer dust</p>
              <div className="flex gap-2">
                <input type="number" value={dustAmount} onChange={(e) => setDustAmount(e.target.value)}
                  placeholder="Quantité" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                <Button size="sm" onClick={() => { updateDust.mutate({ id: selected.id, amount: Number(dustAmount) }); setDustAmount('') }}>
                  Attribuer
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 border border-border"
                onClick={() => updateRole.mutate({ id: selected.id, role: selected.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN' })}>
                {selected.role === 'SUPER_ADMIN' ? 'Révoquer admin' : 'Promouvoir admin'}
              </Button>
              <Button size="sm" variant="ghost"
                className={`flex-1 border ${selected.suspended ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}
                onClick={() => suspend.mutate({ id: selected.id, suspended: !selected.suspended })}>
                {selected.suspended ? 'Réactiver' : 'Suspendre'}
              </Button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd front && git add src/routes/_admin/ src/routeTree.gen.ts
git commit -m "feat(admin): users page — table + search + drawer with actions"
```

---

### Task 7: Page Cartes `/admin/cards`

**Files:**
- Create: `front/src/routes/_admin/admin.cards.tsx`

- [ ] **Step 1: Écrire la page cartes**

```typescript
// front/src/routes/_admin/admin.cards.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import {
  useAdminCards,
  useAdminCreateCard,
  useAdminCreateSet,
  useAdminDeleteCard,
  useAdminDeleteSet,
  useAdminSets,
  useAdminUpdateSet,
} from '../../queries/useAdminCards'

export const Route = createFileRoute('/_admin/admin/cards')({
  component: AdminCards,
})

function AdminCards() {
  const { data: setsData } = useAdminSets()
  const { data: cardsData } = useAdminCards()
  const createSet = useAdminCreateSet()
  const updateSet = useAdminUpdateSet()
  const deleteSet = useAdminDeleteSet()
  const createCard = useAdminCreateCard()
  const deleteCard = useAdminDeleteCard()

  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [newSetName, setNewSetName] = useState('')
  const [showNewSetForm, setShowNewSetForm] = useState(false)

  const sets = setsData?.sets ?? []
  const cards = cardsData?.cards ?? []

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Cartes & Sets</h1>
        <Button size="sm" onClick={() => setShowNewSetForm(true)}><Plus className="mr-1 h-4 w-4" />Nouveau set</Button>
      </div>

      {showNewSetForm && (
        <div className="mb-4 flex gap-2 rounded-xl border border-border bg-card p-4">
          <input value={newSetName} onChange={(e) => setNewSetName(e.target.value)}
            placeholder="Nom du set…" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          <Button size="sm" onClick={() => {
            createSet.mutate({ name: newSetName, isActive: false })
            setNewSetName('')
            setShowNewSetForm(false)
          }}>Créer</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewSetForm(false)}>Annuler</Button>
        </div>
      )}

      <div className="space-y-2">
        {sets.map((set) => {
          const setCards = cards.filter((c) => c.set.id === set.id)
          const isOpen = expandedSetId === set.id
          return (
            <div key={set.id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedSetId(isOpen ? null : set.id)}>
                {isOpen ? <ChevronDown className="h-4 w-4 text-text-light" /> : <ChevronRight className="h-4 w-4 text-text-light" />}
                <span className="font-semibold text-text">{set.name}</span>
                <span className="ml-1 text-xs text-text-light">{set._count.cards} cartes</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${set.isActive ? 'bg-green-500/20 text-green-400' : 'bg-border text-text-light'}`}>
                  {set.isActive ? 'Actif' : 'Inactif'}
                </span>
                <div className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="text-xs"
                    onClick={() => updateSet.mutate({ id: set.id, isActive: !set.isActive })}>
                    {set.isActive ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400"
                    onClick={() => deleteSet.mutate(set.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-4">
                  <div className="mb-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                    {setCards.map((card) => (
                      <div key={card.id} className="group relative">
                        <img src={card.imageUrl} alt={card.name}
                          className="aspect-[3/4] w-full rounded-lg object-cover" />
                        <div className="absolute inset-0 flex items-end rounded-lg bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="w-full truncate text-center text-xs font-bold text-white">{card.name}</p>
                        </div>
                        <button onClick={() => deleteCard.mutate(card.id)}
                          className="absolute right-1 top-1 hidden rounded bg-red-500 p-0.5 group-hover:block">
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <CardUploadForm setId={set.id} onUpload={(fd) => createCard.mutate(fd)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CardUploadForm({ setId, onUpload }: { setId: string; onUpload: (fd: FormData) => void }) {
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState('COMMON')
  const [dropWeight, setDropWeight] = useState('10')
  const [file, setFile] = useState<File | null>(null)

  const submit = () => {
    if (!name || !file) return
    const fd = new FormData()
    fd.append('name', name)
    fd.append('setId', setId)
    fd.append('rarity', rarity)
    fd.append('dropWeight', dropWeight)
    fd.append('image', file)
    onUpload(fd)
    setName(''); setFile(null)
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la carte"
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text w-36" />
      <select value={rarity} onChange={(e) => setRarity(e.target.value)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text">
        {['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map((r) => <option key={r}>{r}</option>)}
      </select>
      <input type="number" value={dropWeight} onChange={(e) => setDropWeight(e.target.value)}
        placeholder="Poids" className="rounded border border-border bg-surface px-2 py-1 text-xs text-text w-20" />
      <input type="file" accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-xs text-text-light" />
      <Button size="sm" onClick={submit} disabled={!name || !file}>Ajouter</Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd front && git add src/routes/_admin/ src/routeTree.gen.ts
git commit -m "feat(admin): cards page — sets accordion + card grid + upload form"
```

---

### Task 8: Pages Boutique, Config, Stats

**Files:**
- Create: `front/src/routes/_admin/admin.shop.tsx`
- Create: `front/src/routes/_admin/admin.config.tsx`
- Create: `front/src/routes/_admin/admin.stats.tsx`

- [ ] **Step 1: Écrire `admin.shop.tsx`**

```typescript
// front/src/routes/_admin/admin.shop.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { AdminDrawer } from '../../components/admin/AdminDrawer'
import { AdminTable } from '../../components/admin/AdminTable'
import { Button } from '../../components/ui/button'
import {
  type AdminShopItem,
  useAdminCreateShopItem,
  useAdminDeleteShopItem,
  useAdminShopItems,
  useAdminUpdateShopItem,
} from '../../queries/useAdminShop'

export const Route = createFileRoute('/_admin/admin/shop')({
  component: AdminShop,
})

function AdminShop() {
  const { data, isLoading } = useAdminShopItems()
  const updateItem = useAdminUpdateShopItem()
  const deleteItem = useAdminDeleteShopItem()
  const createItem = useAdminCreateShopItem()
  const [editing, setEditing] = useState<AdminShopItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState({ name: '', description: '', type: 'TOKEN_PACK', dustCost: 0, value: '{}', isActive: true })

  const columns = [
    { key: 'name', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'dustCost', header: 'Coût (dust)' },
    { key: 'isActive', header: 'Actif', render: (item: AdminShopItem) => (
      <button onClick={(e) => { e.stopPropagation(); updateItem.mutate({ id: item.id, isActive: !item.isActive }) }}
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.isActive ? 'bg-green-500/20 text-green-400' : 'bg-border text-text-light'}`}>
        {item.isActive ? 'Actif' : 'Inactif'}
      </button>
    )},
    { key: 'actions', header: '', render: (item: AdminShopItem) => (
      <Button size="sm" variant="ghost" className="text-red-400"
        onClick={(e) => { e.stopPropagation(); deleteItem.mutate(item.id) }}>
        Supprimer
      </Button>
    )},
  ]

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Boutique</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" />Nouvel item</Button>
      </div>
      <AdminTable columns={columns} rows={data?.items ?? []} isLoading={isLoading} />

      <AdminDrawer open={showCreate} onClose={() => setShowCreate(false)} title="Créer un item">
        <div className="space-y-3">
          {(['name', 'description'] as const).map((field) => (
            <input key={field} placeholder={field} value={form[field]}
              onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          ))}
          <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
            {['TOKEN_PACK','BOOST','COSMETIC'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="Coût dust" value={form.dustCost}
            onChange={(e) => setForm(f => ({ ...f, dustCost: Number(e.target.value) }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          <textarea placeholder='Value JSON ex: {"tokens":3}' value={form.value}
            onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text font-mono" rows={3} />
          <Button className="w-full" onClick={() => {
            createItem.mutate({ ...form, value: JSON.parse(form.value) })
            setShowCreate(false)
          }}>Créer</Button>
        </div>
      </AdminDrawer>
    </div>
  )
}
```

- [ ] **Step 2: Écrire `admin.config.tsx`**

```typescript
// front/src/routes/_admin/admin.config.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import { type AdminConfig, useAdminConfig, useAdminSaveConfig } from '../../queries/useAdminConfig'

export const Route = createFileRoute('/_admin/admin/config')({
  component: AdminConfig,
})

const CONFIG_GROUPS = [
  {
    title: 'Tokens',
    fields: [
      { key: 'tokenRegenIntervalHours', label: 'Régénération (heures)', min: 0.5, step: 0.5 },
      { key: 'tokenMaxStock', label: 'Stock maximum', min: 1, step: 1 },
    ],
  },
  {
    title: 'Gacha',
    fields: [
      { key: 'pityThreshold', label: 'Seuil de pitié', min: 1, step: 1 },
    ],
  },
  {
    title: 'Dust par doublon',
    fields: [
      { key: 'dustCommon', label: 'COMMON', min: 0, step: 1 },
      { key: 'dustUncommon', label: 'UNCOMMON', min: 0, step: 1 },
      { key: 'dustRare', label: 'RARE', min: 0, step: 1 },
      { key: 'dustEpic', label: 'EPIC', min: 0, step: 1 },
      { key: 'dustLegendary', label: 'LEGENDARY', min: 0, step: 1 },
    ],
  },
] as const

function AdminConfig() {
  const { data, isLoading } = useAdminConfig()
  const save = useAdminSaveConfig()
  const [draft, setDraft] = useState<Partial<AdminConfig>>({})

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-text-light">Chargement…</div>
  }

  const current = { ...data, ...draft }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Configuration</h1>
        <Button onClick={() => { save.mutate(draft); setDraft({}) }} disabled={Object.keys(draft).length === 0}>
          Sauvegarder
        </Button>
      </div>

      <div className="space-y-6 max-w-xl">
        {CONFIG_GROUPS.map((group) => (
          <div key={group.title} className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">{group.title}</p>
            <div className="space-y-3">
              {group.fields.map(({ key, label, min, step }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label className="text-sm text-text">{label}</label>
                  <input
                    type="number"
                    min={min}
                    step={step}
                    value={current[key as keyof AdminConfig] ?? ''}
                    onChange={(e) => setDraft(d => ({ ...d, [key]: Number(e.target.value) }))}
                    className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Écrire `admin.stats.tsx`**

```typescript
// front/src/routes/_admin/admin.stats.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { AdminTable } from '../../components/admin/AdminTable'
import { useAdminStats } from '../../queries/useAdminStats'

export const Route = createFileRoute('/_admin/admin/stats')({
  component: AdminStats,
})

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af', UNCOMMON: '#4ade80', RARE: '#60a5fa', EPIC: '#c084fc', LEGENDARY: '#fbbf24',
}

function AdminStats() {
  const { data, isLoading } = useAdminStats()

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-text-light">Chargement…</div>
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Statistiques</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribution raretés */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">Distribution raretés</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.rarityDistribution} dataKey="count" nameKey="rarity" cx="50%" cy="50%" outerRadius={80}>
                {data.rarityDistribution.map((entry) => (
                  <Cell key={entry.rarity} fill={RARITY_COLORS[entry.rarity] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top cartes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">Top 10 cartes</p>
          <AdminTable
            columns={[
              { key: 'name', header: 'Carte' },
              { key: 'rarity', header: 'Rareté' },
              { key: 'count', header: 'Tirages' },
            ]}
            rows={data.topCards.map((c) => ({ ...c, id: c.cardId }))}
          />
        </div>
      </div>

      {/* Top users */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">Top 10 joueurs</p>
        <AdminTable
          columns={[
            { key: 'username', header: 'Joueur' },
            { key: 'count', header: 'Pulls' },
          ]}
          rows={data.topUsers.map((u) => ({ ...u, id: u.userId }))}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Régénérer routeTree**

```bash
cd front && npx tsr generate
```

- [ ] **Step 5: Build final**

```bash
cd front && npm run build
```

Expected: aucune erreur TypeScript ni de build.

- [ ] **Step 6: Commit final Plan 8**

```bash
cd front && git add src/routes/_admin/ src/routeTree.gen.ts
git commit -m "feat(admin): shop, config, stats pages — plan 8 complete"
```
