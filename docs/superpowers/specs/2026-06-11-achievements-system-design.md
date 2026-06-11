# Achievement System — Design

**Status:** Draft
**Date:** 2026-06-11
**Author:** Léo Couffinhal (via brainstorming with Claude)

## Context

Le projet dispose déjà d'une partie de l'infrastructure :

- Modèles Prisma `Achievement`, `UserAchievement`, `Reward`, `UserReward` (avec `source` ∈ {STREAK, ACHIEVEMENT, QUEST})
- Domain `RewardsDomain` avec claim transactionnel (tokens / dust / XP / cardRarity)
- UI `RewardsPopup`, `RewardCard`, `LevelUpOverlay`, store `levelUp.store.ts`
- Routes admin CRUD pour `Achievement`

**Ce qui manque pour avoir un système d'achievement fonctionnel :**

1. Définition de **conditions de déblocage** (criterion) — aucun champ sur `Achievement` aujourd'hui.
2. **Détection d'événements** depuis le gameplay (pull, claim, recycle, achat, etc.).
3. **Routes user** pour lister les achievements (locked/unlocked + progression).
4. **UI dédiée** (page achievements + toast de déblocage).

Le système est conçu en cohérence avec l'architecture existante : couches `domain` / `repository` / `http`, transactions Prisma, hooks Zustand côté front.

## Goals

- Permettre de débloquer des achievements via 3 catégories : **progression cumulative**, **collection**, **événementiels/cachés**.
- Afficher une **barre de progression** au joueur sur tous les achievements visibles.
- Notifier l'unlock via un **toast immédiat** + la récompense arrive dans le `RewardsPopup` existant.
- Permettre l'**administration** des achievements via le backoffice existant (avec criterion typé).
- Garantir l'**intégrité transactionnelle** : un unlock est inséré dans la même transaction que l'event qui le déclenche.

## Non-Goals

- Achievements liés au streak quotidien (`StreakMilestone` couvre déjà ce besoin).
- Système de quêtes user-facing (le modèle `Quest` existe mais reste hors-scope ici).
- Tier system avec hiérarchie parent/enfant en base — on utilise des achievements indépendants groupés par `family` + `tier`.
- Achievements automatiques basés sur le niveau (`LEVEL_REACHED` reste disponible dans la taxonomie pour usage futur mais n'est pas seedé).
- Compteur d'achievements pending non-vus côté UI.
- Lien depuis la sidebar / le menu principal — la page sera accessible depuis la page profil (en rework, lien ajouté plus tard).

## Architecture

### Flux global

```
Domain method (gacha, rewards, streak, shop, etc.)
  └─► achievementsDomain.track(tx, userId, event)
        ├─► CounterDispatcher    → upsert UserAchievementProgress
        └─► StateDispatcher      → query UserCard / User (calcul à la volée)
              │
              ▼
       Threshold reached?
              │ yes
              ▼
        ┌─────────────────────────────────────┐
        │ INSERT UserAchievement(unlockedAt)  │  ← même transaction que l'event
        │ INSERT UserReward(source=ACHIEVE.)  │
        └────────────────┬────────────────────┘
                         ▼
            Return UnlockedAchievement[]
                         │
                         ▼
   HTTP response: { ..., unlockedAchievements: [...] }
                         │
                         ▼
       Frontend: enqueueAchievementUnlock(...)
                         │
                         ▼
       AchievementUnlockToast (queue, anim 2-3s)
       + invalidate `rewards` query → RewardsPopup
```

### Principes

- **Synchrone, dans la transaction du caller** : `track()` reçoit le `tx` Prisma de l'event source. Si l'event échoue, l'unlock est rollback.
- **Pas d'event bus** : appel direct depuis chaque domain method qui peut déclencher un unlock. Cohérent avec l'archi domain/repo actuelle.
- **Dispatcher binaire** :
  - `CounterDispatcher` pour les criteria cumulatifs → écrit/incrémente `UserAchievementProgress`.
  - `StateDispatcher` pour les criteria stateful → ne stocke rien, recalcule depuis les tables source (`UserCard`, `User`).
- **Custom handlers code-driven** pour les cachés/événementiels : registre TS associant un `handlerKey` à une fonction `evaluate(tx, userId, event)`.

## Data model

### Modifs Prisma

```prisma
// Existant — étendu
model Achievement {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String
  rewardId    String?
  reward      Reward?  @relation(fields: [rewardId], references: [id])

  // NEW
  family      String?
  tier        Int      @default(0)
  hidden      Boolean  @default(false)
  iconKey     String?
  criterion   Json
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)

  userAchievements UserAchievement[]
  progress         UserAchievementProgress[]

  @@index([family, tier])
  @@index([isActive])
}

// Existant — inchangé
model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime    @default(now())
  user          User        @relation(fields: [userId], references: [id])
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  @@unique([userId, achievementId])
}

// NEW
model UserAchievementProgress {
  id            String      @id @default(cuid())
  userId        String
  achievementId String
  progress      Int         @default(0)
  updatedAt     DateTime    @updatedAt
  user          User        @relation(fields: [userId], references: [id])
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  @@unique([userId, achievementId])
  @@index([userId])
}
```

### Reset de l'existant

Les `Achievement` actuellement en base (s'il y en a) sont **purgés** lors de la migration, puis le catalogue de seed (Section *Seed catalogue*) est inséré. Pas de migration de données métier nécessaire.

## Criterion taxonomy

Discriminated union définie dans `back/src/main/domain/achievements/criterion.types.ts`, validée Zod, stockée en JSON dans `Achievement.criterion`.

```ts
type AchievementCriterion =
  // ─── Compteurs (stockés dans UserAchievementProgress) ───
  | { type: 'PULL_COUNT';          threshold: number }
  | { type: 'DUST_SPENT';          threshold: number }
  | { type: 'TOKENS_SPENT';        threshold: number }
  | { type: 'CARDS_RECYCLED';      threshold: number }
  | { type: 'REWARDS_CLAIMED';     threshold: number }

  // ─── État (calcul à la volée) ───
  | { type: 'OWN_RARITY_COUNT';    rarity: Rarity;  variant?: Variant;  threshold: number }
  | { type: 'COLLECTION_COMPLETE'; scope: 'ALL' | { rarity: Rarity } }
  | { type: 'LEVEL_REACHED';       threshold: number }  // dispo, non seedé
  | { type: 'STREAK_REACHED';      threshold: number }
  | { type: 'MACHINES_OWNED';      threshold: number }

  // ─── Custom event (code-driven, registre TS) ───
  | { type: 'CUSTOM_EVENT';        handlerKey: string };
```

### Dispatch table

Le mapping `event.kind` → criterion types matchant est défini en mémoire dans `dispatch.ts` :

| `event.kind` | Criteria intéressés |
|---|---|
| `PULL_COMPLETED` | `PULL_COUNT`, `OWN_RARITY_COUNT`, `COLLECTION_COMPLETE`, + custom handlers `listensTo: ['PULL_COMPLETED']` |
| `TOKENS_SPENT` | `TOKENS_SPENT` |
| `DUST_SPENT` | `DUST_SPENT` |
| `CARD_RECYCLED` | `CARDS_RECYCLED` |
| `REWARD_CLAIMED` | `REWARDS_CLAIMED` |
| `LEVEL_UP` | `LEVEL_REACHED` |
| `STREAK_UPDATED` | `STREAK_REACHED` |
| `MACHINE_PURCHASED` | `MACHINES_OWNED`, + custom handlers `listensTo: ['MACHINE_PURCHASED']` |

### Custom handler registry

```ts
// back/src/main/domain/achievements/custom-handlers/index.ts
export const customHandlers: Record<string, CustomHandler> = {
  first_pull_ever:          firstPullEverHandler,
  four_rarities_one_day:    fourRaritiesOneDayHandler,
  dust_balance_10k:         dustBalance10kHandler,
  own_all_machines:         ownAllMachinesHandler,
  same_card_two_variants:   sameCardTwoVariantsHandler,
};

type CustomHandler = {
  listensTo: AchievementEvent['kind'][];
  evaluate: (tx: Tx, userId: string, event: AchievementEvent)
    => Promise<{ unlocked: boolean; progress?: number }>;
};
```

Les `handlerKey` disponibles sont exposés à l'admin via `GET /admin/achievements/custom-handlers` pour les rendre sélectionnables dans un dropdown au lieu d'un input libre.

## Event integration points

Type des events émis :

```ts
type AchievementEvent =
  | { kind: 'PULL_COMPLETED';    cardId: string; rarity: Rarity; variant: Variant }
  | { kind: 'DUST_SPENT';        amount: number }
  | { kind: 'TOKENS_SPENT';      amount: number }
  | { kind: 'CARD_RECYCLED';     amount: number }
  | { kind: 'REWARD_CLAIMED';    rewardId: string; source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST' }
  | { kind: 'LEVEL_UP';          newLevel: number }
  | { kind: 'STREAK_UPDATED';    days: number }
  | { kind: 'MACHINE_PURCHASED'; machineId: string };
```

### Points d'accroche dans le code existant

| Domain method | Event(s) émis | Fichier source |
|---|---|---|
| `GachaDomain.pull()` | `PULL_COMPLETED` + `TOKENS_SPENT` (+ `LEVEL_UP` si applicable) | `back/src/main/domain/gacha/gacha.domain.ts` |
| `RewardsDomain.claimOne()` / `claimAll()` | `REWARD_CLAIMED` (+ `LEVEL_UP` si applicable) | `back/src/main/domain/rewards/rewards.domain.ts` |
| `StreakDomain.updateStreak()` | `STREAK_UPDATED` | `back/src/main/domain/streak/streak.domain.ts` |
| `CardsDomain.recycle()` | `CARD_RECYCLED` + `DUST_SPENT` / `DUST_GAINED` | `back/src/main/domain/cards/*` (à confirmer à l'implémentation) |
| `ShopDomain.purchase(MACHINE)` | `MACHINE_PURCHASED` (+ `DUST_SPENT` / `TOKENS_SPENT`) | `back/src/main/domain/shop/*` |

### Extension uniforme des HTTP responses

Les endpoints qui peuvent déclencher un unlock retournent un champ optionnel :

```ts
interface WithUnlocks {
  unlockedAchievements?: Array<{
    key: string;
    name: string;
    iconKey: string | null;
    reward: PendingReward | null;
  }>;
}
```

Endpoints concernés :
- `POST /pulls`
- `POST /rewards/:id/claim`
- `POST /rewards/claim-all`
- Login / session refresh response (pour les unlocks déclenchés par le streak au login)
- `POST /shop/:id/purchase` (pour les unlocks `MACHINES_OWNED`)
- Endpoints `cards/recycle` (à confirmer à l'implémentation)

## Backend file structure

### Nouveaux fichiers

```
back/src/main/domain/achievements/
├── achievements.domain.ts           # AchievementsDomain.track() + listForUser()
├── criterion.types.ts               # discriminated union + Zod schemas
├── dispatch.ts                      # event.kind → criterion.type mapping
├── counter-dispatcher.ts            # upsert UserAchievementProgress
├── state-dispatcher.ts              # compute depuis UserCard / User
├── custom-handlers/
│   ├── index.ts                     # registre
│   ├── first-pull-ever.ts
│   ├── four-rarities-one-day.ts
│   ├── dust-balance-10k.ts
│   ├── own-all-machines.ts
│   └── same-card-two-variants.ts
└── achievements.domain.test.ts

back/src/main/infra/orm/repositories/
└── user-achievement-progress.repository.ts   # upsertInTx, incrementInTx, findByUser

back/src/main/infra/http/routes/
└── achievements.routes.ts                    # routes user
```

### Routes user

| Méthode | Path | Domain call | Return |
|---|---|---|---|
| `GET` | `/achievements` | `AchievementsDomain.listForUser(userId)` | `AchievementWithProgress[]` — toutes les entries actives avec `unlockedAt?`, `progress`, `threshold`, `family`, `tier`, `hidden`, `reward`. Si `hidden && !unlocked` → `name`/`description` sont masqués (`"???"`). |
| `GET` | `/achievements/families` | `AchievementsDomain.listFamilies()` | `{ family, total, unlocked }[]` — résumé pour onglets/header |

Pas de `POST /unlock` : l'unlock est toujours déclenché par un event domaine.

### Routes admin (étendre l'existant)

`back/src/main/infra/http/routes/admin/achievements.routes.ts` (CRUD existant) :
- Validation Zod du `criterion` JSON sur create / update.
- Nouveau : `GET /admin/achievements/custom-handlers` → liste les `handlerKey` du registre pour le dropdown admin.

### Tests prioritaires

- `achievements.domain.test.ts` :
  - Un test unlock + un test "pas encore" pour chaque criterion type.
  - Test multi-unlock simultané (un seul pull qui déclenche plusieurs achievements).
  - Test custom handler (mock du registre).
- Test d'intégration : pull #100 déclenche `pulls_100` + cumul `tokens_spent` simultanément.
- Test de rollback : si le domain caller throw après `track()`, la transaction rollback l'unlock.

## Frontend file structure

### Page principale — nouvelle route

```
front/src/routes/_authenticated/achievements.tsx
```

Layout :
- Header avec compteur global ("47 / 120 débloqués").
- Sections groupées par `family` (ordre stable via `sortOrder`).
- Carte locked : nom + description + barre de progression si `progress > 0`.
- Carte hidden non-débloquée : `"???"` + icône générique.
- Carte unlocked : icône en couleur + date de déblocage + reward associée (résumée).

### Composants — nouveaux fichiers

```
front/src/components/achievements/
├── AchievementGrid.tsx              # grille filtrable par family
├── AchievementCard.tsx              # carte individuelle (locked/unlocked, progress bar, reward badge)
├── AchievementFamilyHeader.tsx      # titre + compteur "2/3" du palier en cours
├── AchievementUnlockToast.tsx       # toast/overlay déclenché par le store
└── HiddenAchievementCard.tsx        # variante "???" pour hidden non-débloqués
```

### Unlock toast

- Réutilise les patterns du `LevelUpOverlay` existant mais en **plus petit** (toast positionné, pas plein écran) pour ne pas masquer le gameplay.
- Animation 2-3s, particules, icône + nom du succès.
- Plusieurs unlocks simultanés → queue avec délai entre chaque.

### Store Zustand — nouveau fichier

```
front/src/stores/achievementUnlock.store.ts
```

```ts
interface AchievementUnlockStore {
  queue: UnlockedAchievement[];
  enqueue: (unlocks: UnlockedAchievement[]) => void;
  dismiss: () => void;  // shift le premier de la queue
}
```

Pattern identique à `levelUp.store.ts`.

### Hooks / queries — nouveaux fichiers

```
front/src/queries/useAchievements.ts
├── useAchievements()           # GET /achievements
└── useAchievementFamilies()    # GET /achievements/families
```

### Hooks existants à modifier

| Hook | Modif |
|---|---|
| `useRewards.ts` (`useClaimReward`, `useClaimAllRewards`) | Après success, lire `result.unlockedAchievements` → `enqueue()`. Invalider la query `useAchievements`. |
| Hook de pull (dans `play.tsx`) | Idem — push les unlocks dans la queue. |
| Hook session/login | Idem pour les unlocks de streak. |
| Hook achat machine (shop) | Idem. |

### Navigation

- **Pas d'entrée dans la sidebar.**
- La route `/achievements` est destinée à être linkée depuis la page profil (rework profil en cours — lien ajouté plus tard).
- Le `RewardCard` source=ACHIEVEMENT du `RewardsPopup` linke vers la page Achievements (scroll vers l'entry concernée si possible).

## Seed catalogue

24 achievements actifs au seed (4 cumulatifs `pulls`, 3 `dust`, 5 `collection_rarity`, 3 `collection_variants`, 2 `collection_complete`, 1 `streak`, 3 `machines`, 3 cachés). Les valeurs (thresholds, rewards) sont des points de départ ajustables.

### Famille `pulls` — progression cumulative

| key | name | criterion | reward |
|---|---|---|---|
| `pulls_10` | Premier tirage sérieux | `PULL_COUNT 10` | 5 tokens |
| `pulls_100` | Habitué de la machine | `PULL_COUNT 100` | 20 tokens + 50 dust |
| `pulls_500` | Pull addict | `PULL_COUNT 500` | 50 tokens + 200 dust + 100 XP |
| `pulls_1000` | Légende des machines | `PULL_COUNT 1000` | 100 tokens + 500 dust + carte EPIC |

### Famille `dust` — économie

| key | name | criterion | reward |
|---|---|---|---|
| `dust_spent_500` | Premier investissement | `DUST_SPENT 500` | 10 tokens |
| `dust_spent_5000` | Big spender | `DUST_SPENT 5000` | 30 tokens + 100 dust |
| `cards_recycled_50` | Recycleur | `CARDS_RECYCLED 50` | 200 dust |

### Famille `collection_rarity`

| key | name | criterion | reward |
|---|---|---|---|
| `own_rare_10` | Chasseur de raretés | `OWN_RARITY_COUNT RARE 10` | 20 tokens |
| `own_epic_5` | Collectionneur EPIC | `OWN_RARITY_COUNT EPIC 5` | 50 tokens |
| `own_legendary_1` | Première LEGENDARY | `OWN_RARITY_COUNT LEGENDARY 1` | 100 tokens + 500 dust |
| `own_legendary_5` | Légendaire confirmé | `OWN_RARITY_COUNT LEGENDARY 5` | carte EPIC + 200 dust |
| `own_holographic_1` | Holographie | `OWN_RARITY_COUNT * HOLOGRAPHIC 1` | 50 tokens + 300 dust |

### Famille `collection_variants`

| key | name | criterion | reward |
|---|---|---|---|
| `own_brilliant_1` | Premier éclat | `OWN_RARITY_COUNT * BRILLIANT 1` | 20 tokens |
| `own_brilliant_5` | Brilliance | `OWN_RARITY_COUNT * BRILLIANT 5` | 50 tokens + 100 dust |
| `same_card_two_variants` | Double face | `CUSTOM_EVENT same_card_two_variants` | 30 tokens + 200 dust |

### Famille `collection_complete`

| key | name | criterion | reward |
|---|---|---|---|
| `complete_common` | Collection commune | `COLLECTION_COMPLETE rarity=COMMON` | 100 tokens |
| `complete_all_base` | Maître de la collection | `COLLECTION_COMPLETE ALL` | 500 tokens + carte LEGENDARY |

### Famille `streak`

| key | name | criterion | reward |
|---|---|---|---|
| `streak_30` | Mois entier | `STREAK_REACHED 30` | 200 tokens + 500 dust |

> Pas de doublon avec `StreakMilestone` : ce dernier récompense le jour J ; `streak_30` matérialise le succès permanent dans la collection.

### Famille `machines`

| key | name | criterion | reward |
|---|---|---|---|
| `machines_own_1` | Première machine | `MACHINES_OWNED 1` | 10 tokens |
| `machines_own_2` | Salle d'arcade | `MACHINES_OWNED 2` | 20 tokens |
| `machines_own_all` | Collectionneur de machines | `CUSTOM_EVENT own_all_machines` | 100 tokens + 500 dust |

### Achievements cachés (`hidden: true`)

| key | name | criterion | reward |
|---|---|---|---|
| `first_pull` | Bienvenue | `CUSTOM_EVENT first_pull_ever` | 20 tokens |
| `rainbow_day` | Arc-en-ciel | `CUSTOM_EVENT four_rarities_one_day` | carte EPIC |
| `dust_hoarder` | Pactole | `CUSTOM_EVENT dust_balance_10k` | 50 tokens |

### Custom handlers à coder (5)

1. **`first_pull_ever`** — premier pull du compte (count `UserCard` ou `Pull` = 1).
2. **`four_rarities_one_day`** — au moins une carte de chaque rareté COMMON → EPIC dans une même journée (timezone à confirmer).
3. **`dust_balance_10k`** — `user.dust >= 10000` à un instant donné.
4. **`own_all_machines`** — nombre de machines possédées = nombre de machines existantes dans le shop.
5. **`same_card_two_variants`** — posséder une même `cardId` avec deux `variant` différents (NORMAL + BRILLIANT, ou NORMAL + HOLOGRAPHIC, ou BRILLIANT + HOLOGRAPHIC).

## Error handling & edge cases

- **Double déclenchement** : `UserAchievement` a un `@@unique([userId, achievementId])`. Un second `INSERT` lèvera une erreur — l'engine catche et ignore (idempotent par design).
- **Rollback** : si le domain caller (gacha, shop, etc.) throw après `track()`, la transaction Prisma rollback. Aucun UserAchievement orphelin.
- **Achievement désactivé** (`isActive=false`) : l'engine ne le considère plus ; un user déjà débloqué garde son `UserAchievement` mais ne reçoit plus de nouvelle évaluation.
- **Achievement supprimé en BDD** : la contrainte FK empêche la suppression si des `UserAchievement` existent. Préférer `isActive=false` pour retirer un achievement.
- **Reward null** : un achievement sans `reward` se débloque mais ne crée pas de `UserReward`. Le toast s'affiche quand même.
- **Custom handler manquant** : si `criterion.handlerKey` n'existe pas dans le registre, l'engine log un warning et skip — pas d'erreur visible utilisateur.

## Open questions

- Quel emplacement exact dans la page profil pour le lien vers `/achievements` ? Décidé au moment du rework profil.
- Timezone pour `four_rarities_one_day` : UTC ou timezone serveur (Europe/Paris) ? À aligner avec le système de streak existant qui définit déjà une "journée".
- Icônes : les `iconKey` pointent vers le MediaManager existant ou simples strings de référence ? À trancher à l'implémentation selon ce qui est en place côté admin.

## Implementation plan

À détailler dans un document séparé via la skill `writing-plans`. Découpage prévisible en milestones :

1. **Schéma & seed** — migration Prisma, retrait des `Achievement` existants, seed du catalogue, taxonomie criterion + Zod.
2. **Engine domain** — `AchievementsDomain.track()`, dispatchers counter + state, repo `UserAchievementProgress`.
3. **Custom handlers** — les 5 handlers du registre + tests.
4. **Hooks event** — intégration dans gacha, rewards, streak, shop, recycle ; extension HTTP responses.
5. **Routes user + admin** — `/achievements`, `/achievements/families`, validation Zod admin, endpoint `custom-handlers`.
6. **UI page achievements** — route, grid, cards, family headers.
7. **UI toast unlock** — store Zustand + composant + intégration dans les hooks existants.
