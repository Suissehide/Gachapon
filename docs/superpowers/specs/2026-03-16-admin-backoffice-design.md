# Gachapon — Admin Back-office Design

**Date:** 2026-03-16
**Status:** Approved

---

## 1. Vue d'ensemble

Back-office super-admin accessible via les routes `/admin/*` du frontend React existant. Réservé aux utilisateurs avec `role === SUPER_ADMIN`. Implémenté en 3 sous-plans indépendants :

- **Plan 6** — Admin Core : middleware role-based, routes users + config + stats/dashboard
- **Plan 7** — Admin Catalog : CRUD sets/cartes (upload MinIO), shop items, quests, achievements
- **Plan 8** — Frontend admin : 6 pages avec layout dédié, même thème dark gamer

---

## 2. Nouvelles dépendances

| Package | Côté | Raison |
|---------|------|--------|
| `@fastify/multipart` | Backend | Upload de fichiers image (proxy MinIO) |
| `recharts` | Frontend | Graphiques dashboard et stats |

Ces deux packages doivent être installés et déclarés dans les `package.json` respectifs lors du Plan 6/7/8.

---

## 3. Middleware & Auth

### Convention d'architecture (obligatoire)

Toute vérification de role **doit** passer par `requireRole()`, jamais inline avec `if (request.user.role !== ...)`.

### Re-typage de `request.user`

Le type actuel dans `jwt.plugin.ts` est `{ userID: string; role: string }`. Pour éviter une divergence de types avec `GlobalRole` (enum Prisma généré), **modifier** (pas ajouter) la déclaration existante dans `jwt.plugin.ts` :

```typescript
// interfaces/http/fastify/plugins/jwt.plugin.ts
// MODIFIER le bloc existant — remplacer role: string par role: GlobalRole
declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: import('../../../../../generated/client').GlobalRole }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest) => Promise<void>
  }
}
```

Ne pas ajouter un second `declare module 'fastify'` — cela provoquerait un conflit de types TypeScript. L'ancien bloc `role: string` doit être retiré.

`GlobalRole` est importé depuis `back/src/generated/client` (output Prisma configuré dans `schema.prisma`).

### `role.plugin.ts`

Nouveau fichier `interfaces/http/fastify/plugins/role.plugin.ts` :

```typescript
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
    (role: GlobalRole) => async (request: FastifyRequest): Promise<void> => {
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

**Enregistrement obligatoire** dans `interfaces/http/fastify/plugins/index.ts` — ajouter `rolePlugin` aux plugins enregistrés (après `jwtPlugin` dont il dépend conceptuellement).

### Utilisation dans les routes

```typescript
onRequest: [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]
```

`requireRole` inclut un guard défensif sur `request.user` (undefined si `verifySessionCookie` n'a pas été appelé).

### Frontend

Layout `_admin.tsx` avec `beforeLoad` dans TanStack Router :

```typescript
beforeLoad: () => {
  const user = useAuthStore.getState().user
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw redirect({ to: '/' })
  }
}
```

Double protection : le backend rejette avec 403 même si le guard frontend est contourné.

---

## 4. Config globale

### Modèle Prisma

```prisma
model GlobalConfig {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

Clés gérées :
- `tokenRegenIntervalHours` (défaut : env `TOKEN_REGEN_INTERVAL_HOURS`)
- `tokenMaxStock`
- `pityThreshold`
- `dustCommon`, `dustUncommon`, `dustRare`, `dustEpic`, `dustLegendary`

### `ConfigService`

Nouveau service `ConfigService` injecté dans l'IoC :

```typescript
class ConfigService {
  constructor({ postgresOrm, redisClient, config }: IocContainer) { ... }
  async get(key: string): Promise<number>  // Redis (TTL 5min) → DB → env var fallback
  async set(key: string, value: number): Promise<void>  // DB + invalide Redis
  async bootstrap(): Promise<void>  // upsert des clés absentes depuis env vars
}
```

**Enregistrement IoC** (dans `awilix-ioc-container.ts`) :
```typescript
this.#reg('configService', asClass(ConfigService).singleton())
```

**Mise à jour de `IocContainer` interface** (`types/application/ioc.ts`) :
```typescript
configService: ConfigService
```

### Initialisation au démarrage

Dans `application/starter.ts`, insérer `configService.bootstrap()` **après** `httpServer.configure()` et **avant** `httpServer.start()`. Le flux actuel doit être préservé :

```typescript
const { httpServer, configService } = iocContainer.instances
await httpServer.configure()        // existant — ne pas supprimer
await configService.bootstrap()     // NOUVEAU
await httpServer.start()            // existant
```

### Migration `DUST_BY_RARITY`

`DUST_BY_RARITY` est actuellement hardcodé en deux endroits :
1. `GachaDomain` — remplacé par `await configService.get('dustCommon')` etc.
2. `collectionRouter` (endpoint `POST /collection/recycle`) — également remplacé pour consommer `ConfigService`

Les deux remplacements sont inclus dans **Plan 6**.

---

## 5. Modèle `User` — champ `suspended`

Le design doc original prévoit une action "suspendre" un utilisateur. Ajout du champ dans le schéma Prisma :

```prisma
model User {
  // ... champs existants ...
  suspended     Boolean  @default(false)
}
```

Nouvelle migration Prisma incluse dans **Plan 6**. La vérification de suspension est ajoutée dans `verifySessionCookie` :

```typescript
if (user.suspended) throw Boom.forbidden('Account suspended')
```

---

## 6. Plan 6 — Admin Core (Backend)

### Routes

Toutes préfixées `/admin`, enregistrées dans un nouveau plugin `adminRouter` (`interfaces/http/fastify/routes/admin/index.ts`), protégées par `[fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]`.

**Enregistrement** dans `interfaces/http/fastify/routes/index.ts` :
```typescript
await fastify.register(adminRouter, { prefix: '/admin' })
```

#### Users
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/users` | Liste paginée. Query: `page`, `limit`, `search` (username ou email) |
| GET | `/admin/users/:id` | Détail + stats (pulls total, dust généré, cards owned) |
| GET | `/admin/users/:id/collection` | Collection complète — pas de vérification d'ownership (admin bypass) |
| PATCH | `/admin/users/:id/tokens` | Attribution de tokens (`{ amount: number }`) |
| PATCH | `/admin/users/:id/dust` | Attribution de dust (`{ amount: number }`) |
| PATCH | `/admin/users/:id/role` | Promotion/révocation SUPER_ADMIN (`{ role: 'USER' \| 'SUPER_ADMIN' }`) |
| PATCH | `/admin/users/:id/suspend` | Suspension/réactivation (`{ suspended: boolean }`) |

#### Config
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/config` | Retourne toutes les clés avec valeurs actuelles |
| PUT | `/admin/config` | Met à jour une ou plusieurs clés (`{ [key]: value }`) |

#### Dashboard & Stats
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/dashboard` | KPIs + séries temporelles pulls/jour (30 derniers jours) |
| GET | `/admin/stats` | Stats détaillées : top cartes, top users, distribution raretés, historique achats |

### Implémentation stats — agrégation quotidienne

Pour les séries temporelles, utiliser `$queryRaw` PostgreSQL (Prisma `groupBy` ne peut pas tronquer à la journée) :

```typescript
const series = await postgresOrm.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
  SELECT DATE_TRUNC('day', "pulledAt") AS day, COUNT(*) AS count
  FROM "GachaPull"
  WHERE "pulledAt" >= ${thirtyDaysAgo}
  GROUP BY DATE_TRUNC('day', "pulledAt")
  ORDER BY day ASC
`
```

Les KPIs simples (total users, pulls today) utilisent `prisma.user.count()` et `prisma.gachaPull.count({ where: { pulledAt: { gte: startOfDay } } })`.

---

## 7. Plan 7 — Admin Catalog (Backend)

### Sets & Cartes

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/sets` | Tous les sets (actifs + inactifs) |
| POST | `/admin/sets` | Créer un set |
| PATCH | `/admin/sets/:id` | Modifier (nom, description, isActive) |
| DELETE | `/admin/sets/:id` | Supprimer (cascade cartes) |
| GET | `/admin/cards` | Toutes les cartes (filtrables par setId, rarity) |
| POST | `/admin/cards` | Créer une carte (`multipart/form-data`) |
| PATCH | `/admin/cards/:id` | Modifier une carte (JSON ou multipart si nouvelle image) |
| DELETE | `/admin/cards/:id` | Supprimer une carte |

**Upload image (proxy MinIO) :**
- Plugin `@fastify/multipart` enregistré dans `interfaces/http/fastify/plugins/index.ts` (aux côtés des autres plugins globaux, avec `{ attachFieldsToBody: false }` pour gérer le streaming manuel vers MinIO)
- Body : champs texte (`name`, `setId`, `rarity`, `variant`, `dropWeight`) + fichier `image`
- Validation : MIME `image/jpeg|png|webp`, taille max 5 MB
- Le backend stream le fichier vers MinIO via `MinioClient` existant, retourne l'URL publique stockée dans `Card.imageUrl`

### Shop Items

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/shop-items` | Tous les items (actifs + inactifs) |
| POST | `/admin/shop-items` | Créer un item |
| PATCH | `/admin/shop-items/:id` | Modifier |
| DELETE | `/admin/shop-items/:id` | Supprimer |

### Quests & Achievements

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/quests` | Toutes les quêtes |
| POST | `/admin/quests` | Créer |
| PATCH | `/admin/quests/:id` | Modifier |
| DELETE | `/admin/quests/:id` | Supprimer |
| GET | `/admin/achievements` | Tous les succès |
| POST | `/admin/achievements` | Créer |
| PATCH | `/admin/achievements/:id` | Modifier |
| DELETE | `/admin/achievements/:id` | Supprimer |

---

## 8. Plan 8 — Frontend Admin

### Structure des fichiers

```
front/src/routes/
├── _admin.tsx                    — Layout + guard SUPER_ADMIN
└── _admin/
    ├── admin.tsx                 — Dashboard (KPIs + graphique)
    ├── admin.users.tsx           — Gestion joueurs
    ├── admin.cards.tsx           — Gestion sets & cartes
    ├── admin.shop.tsx            — Gestion boutique
    ├── admin.config.tsx          — Config globale
    └── admin.stats.tsx           — Statistiques détaillées

front/src/components/admin/
├── AdminTable.tsx                — Table générique avec pagination
├── AdminDrawer.tsx               — Drawer latéral (détail/édition)
├── StatCard.tsx                  — Carte KPI (label + valeur + trend)
└── PullsChart.tsx                — Graphique pulls/jour (recharts)

front/src/queries/
├── useAdminUsers.ts
├── useAdminCards.ts
├── useAdminShop.ts
├── useAdminConfig.ts
└── useAdminStats.ts
```

### Layout admin (`_admin.tsx`)

- Guard `beforeLoad` : redirige vers `/` si `user.role !== 'SUPER_ADMIN'`
- Sidebar fixe à gauche (liens Dashboard, Joueurs, Cartes, Boutique, Config, Stats)
- Même thème dark gamer (couleurs primaires violet/bleu, fond `bg-background`)
- Pas de navbar principale — sidebar remplace la navigation

### Pages

**Dashboard (`/admin`)** : 4 StatCards (users total, pulls today, dust généré total, légendaires tirés) + graphique `PullsChart` (pulls/jour sur 30j via recharts).

**Joueurs (`/admin/users`)** : `AdminTable` avec colonnes username, email, role, tokens, dust, pulls total, suspended — filtre recherche texte — clic ligne ouvre `AdminDrawer` avec détail + actions (attribution tokens/dust, toggle role, toggle suspend, vue collection).

**Cartes (`/admin/cards`)** : accordion par set (créer set en haut), dans chaque set : grille de cartes avec bouton edit/delete, formulaire création carte avec file input (upload `multipart` vers `POST /admin/cards`).

**Boutique (`/admin/shop`)** : table items avec toggle `isActive` inline, bouton créer, drawer d'édition.

**Config (`/admin/config`)** : formulaire groupé par domaine (tokens, gacha, dust) avec inputs numériques et bouton "Sauvegarder tout".

**Stats (`/admin/stats`)** : graphiques distribution raretés (pie chart), top 10 cartes tirées, top 10 users par pulls, historique achats.

---

## 9. Ordre d'implémentation

1. **Plan 6** : migration Prisma (`GlobalConfig` + `User.suspended`) → `role.plugin.ts` → `ConfigService` → bootstrap → routes admin users/config/dashboard/stats → migration `DUST_BY_RARITY` dans `collectionRouter`
2. **Plan 7** : `@fastify/multipart` → routes admin sets/cards/shop/quests/achievements
3. **Plan 8** : install `recharts` → layout `_admin.tsx` + guard → 6 pages → composants admin → queries TanStack

Plans 6 et 7 sont backend-only et peuvent être développés séquentiellement. Plan 8 dépend des deux premiers (API doit exister).
