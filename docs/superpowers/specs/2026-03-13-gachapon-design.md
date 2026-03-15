# Gachapon — Design Document

**Date:** 2026-03-13
**Status:** Approved

---

## 1. Vue d'ensemble

Application web de Gachapon (gacha game) multijoueur. Les joueurs se connectent, rejoignent ou créent des équipes, et utilisent des tokens pour jouer à une machine à pince 3D. Chaque boule contient une récompense (carte illustrée) avec une rareté variable. Les joueurs construisent leur collection, échangent leurs doublons contre de la poussière (dust), et dépensent cette poussière en boutique.

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, Vite, TypeScript, TailwindCSS v4 |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| State global | Zustand |
| 3D | React Three Fiber, @react-three/drei, @react-three/rapier, @react-spring/three, Three.js |
| Backend | Fastify 5, TypeScript, Zod |
| ORM | Prisma 7, PostgreSQL 16 |
| Cache / WS sessions | Redis 7 |
| Stockage images | MinIO externe (S3-compatible) |
| Auth | JWT (access 15min + refresh 7j cookie httpOnly), OAuth Google + Discord |
| API doc | OpenAPI 3.0 auto-générée (Zod schemas), Scalar UI sur `/api/docs` |
| Linting | Biome |
| Tests | Jest (unit + e2e) |
| Déploiement | Docker Compose + Dokploy |

---

## 3. Architecture globale

```
CLIENTS
├── App Web (React + R3F)         → HTTPS / WSS
├── Bot Discord tiers             → API publique (API Key)
└── Back-office (route /admin)   → même app React

BACKEND (Fastify modulaire — un plugin par domaine)
├── Auth            JWT + OAuth Google/Discord
├── Gacha Engine    Tirage serveur-authoritative + WS push résultat
├── Teams           CRUD équipes + invitations
├── Collection      Cards / Sets / Raretés
├── Economy         Tokens + Dust
├── Shop            Boutique configurable
├── Admin           Back-office super-admin
├── Public API      Miroir complet, auth API Key
└── WebSocket       Connexions persistantes (gacha uniquement)

DATA LAYER
├── PostgreSQL      Toutes les données applicatives
├── Redis           Cooldowns tokens, sessions WebSocket
└── MinIO (ext.)    Images des cartes (S3-compatible)

DÉPLOIEMENT
└── Docker Compose + Dokploy
    ├── frontend (Nginx)
    ├── backend (Node.js)
    ├── postgres
    └── redis
    (MinIO : instance externe existante)
```

---

## 4. Modèle de données

### User
```
id              uuid PK
username        string unique
email           string unique
passwordHash    string? (null si OAuth uniquement)
avatar          string?
banner          string?
role            enum USER | SUPER_ADMIN
tokens          int default 0
dust            int default 0
lastTokenAt     datetime?
xp              int default 0
level           int default 1
pityCurrent     int default 0      -- compteur de pitié
streakDays      int default 0
lastLoginAt     datetime?
createdAt       datetime
```

### OAuthAccount
```
id                  uuid PK
provider            enum GOOGLE | DISCORD
providerAccountId   string
userId              FK → User
unique(provider, providerAccountId)
```

### ApiKey
```
id          uuid PK
key         string unique
name        string
userId      FK → User
lastUsedAt  datetime?
createdAt   datetime
```

### Team
```
id          uuid PK
name        string
slug        string unique
description string?
avatar      string?
ownerId     FK → User
createdAt   datetime
```

### TeamMember
```
id        uuid PK
teamId    FK → Team
userId    FK → User
role      enum MEMBER | ADMIN | OWNER
joinedAt  datetime
unique(teamId, userId)
```

### Invitation
```
id              uuid PK
teamId          FK → Team
invitedEmail    string?
invitedUserId   FK → User?
token           string unique
status          enum PENDING | ACCEPTED | DECLINED
expiresAt       datetime
createdAt       datetime
```

### CardSet
```
id          uuid PK
name        string
description string?
coverImage  string?
isActive    bool
createdAt   datetime
```

### Card
```
id          uuid PK
setId       FK → CardSet
name        string
imageUrl    string       -- URL MinIO
rarity      enum COMMON | UNCOMMON | RARE | EPIC | LEGENDARY
variant     enum? BRILLIANT | HOLOGRAPHIC  -- null = carte normale
dropWeight  float        -- poids relatif pour le weighted random
createdAt   datetime
```

### UserCard
```
id          uuid PK
userId      FK → User
cardId      FK → Card
quantity    int default 1
obtainedAt  datetime
unique(userId, cardId)
```

### GachaPull
```
id            uuid PK
userId        FK → User
cardId        FK → Card
wasDuplicate  bool
dustEarned    int
pulledAt      datetime
```

### ShopItem
```
id          uuid PK
name        string
description string
type        enum TOKEN_PACK | BOOST | COSMETIC
dustCost    int
value       json   -- payload (ex: {tokens: 3} ou {boostType: "cooldown", rank: 2})
isActive    bool
createdAt   datetime
```

### Purchase
```
id          uuid PK
userId      FK → User
shopItemId  FK → ShopItem
dustSpent   int
purchasedAt datetime
```

### Achievement
```
id              uuid PK
key             string unique
name            string
description     string
rewardTokens    int
rewardDust      int
```

### UserAchievement
```
id              uuid PK
userId          FK → User
achievementId   FK → Achievement
unlockedAt      datetime
unique(userId, achievementId)
```

### Quest
```
id              uuid PK
key             string unique
name            string
description     string
criterion       json   -- ex: {type: "pulls", count: 5}
rewardTokens    int
rewardDust      int
isActive        bool
```

### UserQuest
```
id          uuid PK
userId      FK → User
questId     FK → Quest
date        date       -- jour concerné (reset quotidien)
progress    int default 0
completed   bool default false
completedAt datetime?
unique(userId, questId, date)
```

---

## 5. Système de permissions

### Rôles globaux (User.role)
- **USER** — utilisateur standard
- **SUPER_ADMIN** — accès total, gère tout (joueurs, équipes, boutique, config)

### Rôles équipe (TeamMember.role)
- **MEMBER** — peut voir la collection de l'équipe, jouer
- **ADMIN** — peut inviter/exclure des membres, promouvoir des membres en ADMIN
- **OWNER** — ADMIN + peut supprimer l'équipe, transférer la propriété. Attribué automatiquement au créateur.

### Règles
- Un OWNER ne peut pas être rétrogradé sauf transfert de propriété préalable
- Les ADMIN d'équipe ne peuvent promouvoir que jusqu'à ADMIN (pas OWNER)
- Un SUPER_ADMIN peut effectuer toutes les opérations sur toutes les équipes indépendamment de son rôle équipe

---

## 6. Économie

### Tokens
- Servent uniquement à jouer à la machine (1 token = 1 tirage)
- Régénération : 1 token toutes les 4h (configurable en back-office), stock max 5 (configurable)
- Calcul **lazy** : les tokens accumulés sont calculés au moment de la requête depuis `lastTokenAt`, sans cron job
- Les SUPER_ADMIN peuvent attribuer des tokens manuellement à un utilisateur ou à toute une équipe

### Dust (Poussière)
- Monnaie unique de la boutique
- Obtenue par recyclage de doublons (quantité configurable par rareté de carte) et récompenses de quêtes/succès
- Dust par défaut pour doublon :
  - COMMON : 5
  - UNCOMMON : 15
  - RARE : 50
  - EPIC : 150
  - LEGENDARY : 500
- Recyclage manuel depuis la collection (pas automatique)

---

## 7. Gacha Engine

### Flow d'un tirage
1. Client consomme 1 token → `POST /pulls`
2. Serveur vérifie tokens > 0 (atomique via transaction Prisma)
3. Vérification système de pitié (`pityCurrent >= seuil`) → si oui, tirage forcé LEGENDARY
4. Weighted random sur `Card.dropWeight` des cartes du set actif
5. Si rareté >= RARE : second roll pour variante (15% BRILLIANT, 5% HOLOGRAPHIC)
6. `wasDuplicate` si `UserCard` existe déjà → `quantity++` + dust auto-crédité
7. Insert `GachaPull` + upsert `UserCard` + update `User.tokens/dust/pityCurrent`
8. Push WS event `pull:result` → `{card, isDuplicate, dustEarned}`
9. Client déclenche animation 3D selon rareté

### Système de pitié
- `pityCurrent` incrémenté à chaque tirage non-LEGENDARY
- À 100 (configurable) : prochain tirage forcé LEGENDARY, `pityCurrent` remis à 0
- Un tirage LEGENDARY naturel (non forcé) remet également `pityCurrent` à 0

---

## 8. Machine à pince 3D

### Construction (primitives Three.js — pas de modèle GLTF)
- Caisse extérieure : BoxGeometry + MeshStandardMaterial
- Vitres : MeshPhysicalMaterial (transparent, refraction)
- Rails : CylinderGeometry
- Pince : 3 grappins BoxGeometry animés
- Boules : SphereGeometry, **toutes identiques** (blanc translucide), même matériau
- Éclairage : PointLight colorée interne + ambientLight + ombres douces

### Flow animation d'un tirage
1. Pince descend (lerp Y)
2. Grappins s'ouvrent puis se ferment sur une boule
3. Pince remonte avec la boule
4. Boule tombe dans le tube de sortie
5. Boule roule vers l'avant — **résultat WS reçu ici**
6. Animation d'ouverture selon rareté → reveal carte

### Animations d'ouverture par rareté
| Rareté | Animation | Durée |
|--------|-----------|-------|
| COMMON | Simple ouverture | 0.5s |
| UNCOMMON | Lueur verte, carte glisse | 0.8s |
| RARE | Flash bleu, particules, flip | 1.2s |
| EPIC | Explosion violette, screen shake, zoom | 2s |
| LEGENDARY | Ciel étoilé, slow-mo, fanfare, doré | 3-4s |
| + BRILLIANT | Reflets dorés en plus de l'animation de base | |
| + HOLOGRAPHIC | Arc-en-ciel animé, durée ×1.5 | |

---

## 9. Équipes

- Max **5 équipes** par utilisateur (membre + owner cumulé) — limite fixe, non achetable
- Max **100 membres** par équipe
- Invitation par email ou pseudo — lien token unique expirant en 48h
- Si l'email invité n'a pas de compte : invitation en attente jusqu'à l'inscription
- Un owner doit transférer la propriété avant de quitter l'équipe

---

## 10. Collections

- Toutes les cartes du set actif sont affichées
- Cartes **non possédées** : silhouette noire (forme visible, image masquée via CSS mask)
- Sur le profil d'un autre joueur : silhouette = cartes que **ce joueur** ne possède pas (pas le visiteur)
- Doublons : badge `×N` sur la carte, recyclage manuel via bouton "Recycler"
- Set complété : bannière de célébration + récompense automatique configurable en back-office
- Filtres : par rareté, variante, set, possédé/non-possédé

---

## 11. Boutique

- Monnaie unique : **dust**
- Types d'articles : TOKEN_PACK, BOOST, COSMETIC
- **Boosts à rangs I→IV** achetables séquentiellement. Valeurs ci-dessous = **défauts seed**, modifiables en back-office :
  - Réduction cooldown token : I(–30min) II(–1h) III(–1h30) IV(–2h)
  - Augmentation drop rate Épique+ : I(+2%) II(+5%) III(+10%) IV(+20%)
- La structure des rangs (nombre, type) est définie en code ; les valeurs (coût dust, effet) sont configurables via le champ `value` JSON du `ShopItem`
- Toute la boutique est **entièrement configurable depuis le back-office** (créer/modifier/désactiver articles, configurer rangs, coûts)

---

## 12. Profil joueur

- Avatar, bannière, pseudo, niveau, XP, badges
- Rareté la plus haute obtenue
- Stats : nombre de tirages, sets complétés, légendaires, dust total généré
- Badges : succès débloqués + cosmétiques achetés en boutique
- Collection publique aux utilisateurs connectés

---

## 13. Leaderboards, Quêtes & Streak

### Leaderboards
- Meilleur collectionneur (% de cartes distinctes possédées / total cartes du set actif)
- Plus de légendaires (count de UserCard avec rarity=LEGENDARY)
- Meilleure équipe (somme du % de collection de tous les membres / nombre de membres)

### Quêtes quotidiennes
- Configurables en back-office (critère + récompense tokens/dust)
- Exemples : "ouvrir 5 boules", "recycler 3 doublons"
- Reset à minuit UTC

### Streak quotidien
- Connexion quotidienne récompensée
- Paliers configurables en back-office (ex: j1 → 1 token, j3 → 2 tokens, j7 → 1 token + 100 dust)

---

## 14. API Publique

Auth : header `X-API-Key` (générée depuis les paramètres du compte, plusieurs clés possibles)

| Groupe | Endpoints |
|--------|-----------|
| Auth | GET /me *(API Key)*, POST /auth/login *(public)*, POST /auth/register *(public)*, POST /api-keys *(API Key)*, DELETE /api-keys/:id *(API Key)* |
| Gacha | POST /pulls, GET /pulls/history, GET /tokens/balance, GET /tokens/next-at |
| Collection | GET /users/:id/collection, GET /cards, GET /cards/:id, GET /sets, POST /collection/recycle |
| Teams | GET /teams, POST /teams, GET /teams/:id, POST /teams/:id/invite, GET /invitations/:token, POST /invitations/:token/accept, POST /invitations/:token/decline |
| Shop | GET /shop, POST /shop/:id/buy |
| Social | GET /leaderboard, GET /users/:username/profile |

Documentation interactive Scalar UI sur `/api/docs`.

---

## 15. Back-office super-admin (`/admin`)

- **Cartes** : créer/modifier sets, uploader images vers MinIO, définir rareté + variante + dropWeight, activer/désactiver set
- **Boutique** : créer/modifier/supprimer articles, configurer rangs boosts, coûts dust, activation
- **Joueurs** : recherche, voir stats/collection, attribuer tokens/dust, distribuer à une équipe, promouvoir/révoquer SUPER_ADMIN, suspendre
- **Quêtes & Succès** : créer/modifier/activer, définir critères et récompenses, configurer paliers streak
- **Config globale** : intervalle de régénération tokens, stock max tokens, seuil de pitié, dust par rareté doublon, récompenses sets complétés
- **Statistiques** : dérivées à la volée depuis `GachaPull`, `Purchase`, `User` — pas de table d'agrégation dédiée au départ (requêtes optimisées avec index sur `pulledAt`, `purchasedAt`)

---

## 16. Navigation & Routes

### Routes publiques
- `/` — Page de présentation (landing) : accroche visuelle, concept, aperçu raretés, dernières cartes communauté, CTA connexion/inscription
- `/login` — Connexion
- `/register` — Inscription
- `/auth/callback` — Redirect OAuth

### Routes authentifiées (layout avec navbar)
Navbar fixe : logo, liens, compteur tokens permanent, avatar utilisateur

- `/play` — Machine à pince 3D (canvas R3F + historique session + bouton Jouer)
- `/collection` — Ma collection
- `/collection/:setId` — Filtré par set
- `/shop` — Boutique
- `/teams` — Mes équipes
- `/teams/:id` — Détail équipe
- `/profile/:username` — Profil joueur
- `/leaderboard` — Classements
- `/quests` — Quêtes & succès
- `/settings` — Paramètres compte + gestion API Keys

### Routes super-admin
- `/admin` — Dashboard statistiques
- `/admin/cards` — Gestion sets & cartes
- `/admin/shop` — Gestion boutique
- `/admin/users` — Gestion joueurs
- `/admin/config` — Config globale
- `/admin/stats` — Statistiques détaillées

---

## 17. Déploiement

### Docker Compose (deploy/compose.yaml)
```
services:
  frontend   — Nginx, build Vite statique
  backend    — Node.js Fastify (port 3000 interne)
  postgres   — PostgreSQL 16, volume pg_data
  redis      — Redis 7 Alpine, volume redis_data
```
MinIO : instance externe existante sur le serveur, configurée via variables d'environnement.

### Variables d'environnement
```
DATABASE_URL
REDIS_URL
MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY / MINIO_BUCKET
JWT_SECRET
JWT_REFRESH_SECRET
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET
CORS_ORIGIN
TOKEN_REGEN_INTERVAL_HOURS   (valeur de démarrage uniquement — peut être écrasée par la config back-office stockée en DB)
```

### CI/CD
Push sur `main` → Dokploy rebuild + redeploy automatique.
Migrations Prisma exécutées au démarrage : `prisma migrate deploy`.

---

## 18. Architecture backend

Le backend existant suit une architecture DDD-style (couches `domain/`, `application/`, `infrastructure/`, `interfaces/`). Le projet Gachapon **conserve cette architecture** plutôt qu'une structure plate plugin-centric. Les plugins Fastify décrivent les points d'entrée HTTP/WS, mais la logique métier reste dans `domain/` et `application/`.

```
back/src/main/
├── domain/              Entités, règles métier pures (sans dépendances framework)
├── application/         Use cases, services applicatifs, IoC container (awilix)
├── infrastructure/      Prisma, Redis, MinIO, OAuth adapters
└── interfaces/
    ├── http/            Plugins Fastify par domaine (routes + schémas Zod)
    └── ws/              Plugin WebSocket
```

## 19. Structure du monorepo

```
front/src/
├── routes/              TanStack Router
│   ├── __root.tsx
│   ├── index.tsx        Landing page
│   ├── play.tsx
│   ├── collection.tsx
│   ├── shop.tsx
│   ├── teams.tsx
│   ├── admin/
│   └── ...
├── components/
│   ├── machine/         Composants React Three Fiber
│   ├── collection/
│   └── ui/              Composants réutilisables
├── stores/              Zustand
├── hooks/
└── lib/                 API client, WebSocket client

back/src/main/
├── plugins/
│   ├── auth/
│   ├── gacha/
│   ├── collection/
│   ├── teams/
│   ├── economy/
│   ├── shop/
│   ├── admin/
│   ├── public-api/
│   └── websocket/
├── infrastructure/
│   ├── prisma/
│   ├── redis/
│   └── minio/
└── domain/              Logique métier pure

back/prisma/
├── schema.prisma
├── migrations/
└── seed.ts

deploy/
├── compose.yaml
├── dokploy/
└── .env.example
```
