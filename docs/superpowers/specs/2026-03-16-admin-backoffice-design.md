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

## 2. Middleware & Auth

### Convention d'architecture (obligatoire)

Toute vérification de role **doit** passer par `requireRole()`, jamais inline avec `if (request.user.role !== ...)`.

### Backend

Nouveau hook Fastify `requireRole(role: GlobalRole): (request: FastifyRequest) => Promise<void>` enregistré via `fastify-plugin` dans un fichier dédié `role.plugin.ts` :

```typescript
// interfaces/http/fastify/plugins/role.plugin.ts
fastify.decorate('requireRole', (role: GlobalRole) => async (request: FastifyRequest) => {
  if (request.user.role !== role) {
    throw Boom.forbidden('Insufficient permissions')
  }
})
```

Déclaration de type dans le module `fastify` :
```typescript
interface FastifyInstance {
  requireRole: (role: GlobalRole) => (request: FastifyRequest) => Promise<void>
}
```

Utilisation dans les routes :
```typescript
onRequest: [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]
```

`requireRole` présuppose que `verifySessionCookie` a déjà été appelé (lit `request.user.role`).

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

## 3. Config globale

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

### ConfigService

Nouveau service `ConfigService` injecté dans l'IoC :
- `get(key: string): Promise<number>` — lit depuis Redis (TTL 5 min), fallback DB, fallback env var
- `set(key: string, value: number): Promise<void>` — écrit en DB + invalide le cache Redis

Utilisé par `GachaDomain`, `EconomyDomain` (remplace les valeurs hardcodées de `DUST_BY_RARITY` et du seuil de pitié issues de la config statique).

### Initialisation

Au démarrage (`starter.ts`), le serveur upsert les clés absentes en DB depuis les env vars (les valeurs existantes en DB ne sont pas écrasées).

---

## 4. Plan 6 — Admin Core (Backend)

### Routes

Toutes préfixées `/admin`, protégées par `[fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]`.

#### Users
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/users` | Liste paginée, filtrable par username/email. Query: `page`, `limit`, `search` |
| GET | `/admin/users/:id` | Détail utilisateur + stats (pulls total, dust généré, cards owned) |
| PATCH | `/admin/users/:id/tokens` | Attribution de tokens (`{ amount: number }`) |
| PATCH | `/admin/users/:id/dust` | Attribution de dust (`{ amount: number }`) |
| PATCH | `/admin/users/:id/role` | Promotion/révocation SUPER_ADMIN (`{ role: 'USER' \| 'SUPER_ADMIN' }`) |

#### Config
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/config` | Retourne toutes les clés de config avec valeurs actuelles |
| PUT | `/admin/config` | Met à jour une ou plusieurs clés (`{ [key]: value }`) |

#### Dashboard & Stats
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/dashboard` | KPIs + séries temporelles (pulls/jour 30 derniers jours) |
| GET | `/admin/stats` | Stats détaillées : top cartes, top users, distribution raretés, historique achats |

### Implémentation stats

Requêtes via Prisma `groupBy` + `count` + `_sum` — pas de table d'agrégation dédiée. Index existants sur `GachaPull.pulledAt` et `Purchase.purchasedAt` suffisent.

Exemple dashboard :
```typescript
// Pulls par jour sur 30 jours
prisma.gachaPull.groupBy({
  by: ['pulledAt'],
  _count: true,
  where: { pulledAt: { gte: thirtyDaysAgo } },
})
```

---

## 5. Plan 7 — Admin Catalog (Backend)

### Sets & Cartes

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/sets` | Tous les sets (actifs + inactifs) |
| POST | `/admin/sets` | Créer un set |
| PATCH | `/admin/sets/:id` | Modifier un set (nom, description, isActive) |
| DELETE | `/admin/sets/:id` | Supprimer un set (cascade cartes) |
| GET | `/admin/cards` | Toutes les cartes (filtrables par setId, rarity) |
| POST | `/admin/cards` | Créer une carte (multipart: champs JSON + fichier image) |
| PATCH | `/admin/cards/:id` | Modifier une carte (champs JSON seulement, ou + nouvelle image) |
| DELETE | `/admin/cards/:id` | Supprimer une carte |

**Upload image (proxy MinIO) :**
Le backend reçoit un `multipart/form-data` via `@fastify/multipart`. Il stream le fichier directement vers MinIO via le `MinioClient` existant. L'URL publique MinIO est stockée dans `Card.imageUrl`. Validation : type MIME (`image/jpeg`, `image/png`, `image/webp`), taille max 5 MB.

### Shop Items

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/shop-items` | Tous les items (actifs + inactifs) |
| POST | `/admin/shop-items` | Créer un item (`name`, `description`, `type`, `dustCost`, `value`, `isActive`) |
| PATCH | `/admin/shop-items/:id` | Modifier un item |
| DELETE | `/admin/shop-items/:id` | Supprimer un item |

### Quests & Achievements

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/quests` | Toutes les quêtes |
| POST | `/admin/quests` | Créer une quête |
| PATCH | `/admin/quests/:id` | Modifier une quête |
| DELETE | `/admin/quests/:id` | Supprimer une quête |
| GET | `/admin/achievements` | Tous les succès |
| POST | `/admin/achievements` | Créer un succès |
| PATCH | `/admin/achievements/:id` | Modifier un succès |
| DELETE | `/admin/achievements/:id` | Supprimer un succès |

---

## 6. Plan 8 — Frontend Admin

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

**Joueurs (`/admin/users`)** : `AdminTable` avec colonnes username, email, role, tokens, dust, pulls total — filtre recherche texte — clic ligne ouvre `AdminDrawer` avec détail + actions (input tokens/dust + bouton attribuer, toggle role).

**Cartes (`/admin/cards`)** : accordion par set (créer set en haut), dans chaque set : grille de cartes avec bouton edit/delete, formulaire création carte avec file input (upload vers `POST /admin/cards`).

**Boutique (`/admin/shop`)** : table items avec toggle `isActive` inline, bouton créer, drawer d'édition.

**Config (`/admin/config`)** : formulaire groupé par domaine (tokens, gacha, dust) avec inputs numériques et bouton "Sauvegarder tout".

**Stats (`/admin/stats`)** : graphiques distribution raretés (pie chart), top 10 cartes tirées, top 10 users par pulls, historique achats.

---

## 7. Ordre d'implémentation

1. **Plan 6** (backend core) : `role.plugin.ts` + `ConfigService` + migration `GlobalConfig` + routes admin users/config/dashboard/stats
2. **Plan 7** (backend catalog) : routes admin sets/cards/shop/quests/achievements + upload MinIO
3. **Plan 8** (frontend) : layout + guard + 6 pages + composants admin + queries TanStack

Chaque plan est indépendant et livrable séparément. Plan 8 dépend de Plans 6 et 7 (API doit exister).
