# Profile Page Redesign — Direction "Arcade clair" — Design

**Status:** Draft
**Date:** 2026-06-11
**Author:** Léo Couffinhal (via brainstorming with Claude)

## Context

La page profil actuelle (`/profile/$username`) est minimaliste : avatar, niveau/XP, streak, 4 stats, CTA collection. Une référence haute-fidélité a été produite (handoff `design_handoff_profil_arcade`) avec une nouvelle direction visuelle **"arcade clair"** : palette crème `#fbf8f3`, couleurs saturées par rareté, polices Bricolage Grotesque + DM Sans + JetBrains Mono, micro-animations (foilSpin, shimmer, hover lift).

La refonte introduit aussi des concepts produit nouveaux : **cartes vedettes** épinglables par le joueur, **progression par set** avec une couleur dédiée par set. La section achievements de la référence est **retirée** dans ce tour (un système de déblocage est traité dans un projet séparé — voir `2026-06-11-achievements-system-design.md`).

Ce projet introduit également les **tokens "arcade clair" comme thème scopé** (sous une classe `.arcade-theme`), utilisables sans toucher le reste de l'app. Une **migration globale du design system** est explicitement reportée à un projet ultérieur.

## Goals

- Refondre la page profil au pixel près sur la référence fournie (sections : Topbar, Hero, Stats, Progress XP + Streak, Sets, CTA).
- Permettre à un joueur d'**épingler jusqu'à 5 cartes vedettes** ; fallback automatique sur les 5 plus rares possédées si rien n'est épinglé.
- Afficher la **progression par set** (cartes uniques possédées / total) avec une couleur par set.
- Introduire les tokens "arcade clair" comme thème scopé, prêts à être promus en `:root` plus tard.
- Charger les polices de la référence sans casser les pages existantes.

## Non-Goals

- Section **Achievements** (out of scope — couvert par un autre projet, la section est retirée de la page profil pour ce tour).
- **Migration du design system** aux autres pages (play, collection, shop, team, etc.) — projet suivant.
- **Logique de déblocage** automatique d'achievements.
- Affichage des **valeurs ATK/DEF** sur l'art des cartes vedettes (champs absents du modèle `Card`).
- **Drag-to-reorder** dans la modal de sélection des cartes vedettes — ordre = ordre de sélection pour ce tour.
- **Compteur ou indicateur dans la sidebar** vers le profil — la page reste accessible depuis le menu existant.

## Architecture Overview

```
Back                                        Front
────                                        ─────
prisma                                      src/styles/
  schema.prisma                               _arcade.css         (tokens scopés .arcade-theme)
    User.featuredCardIds String[]
    CardSet.hue Int?                        src/components/profile/arcade/
                                              ArcadeProfile.tsx   (orchestre 3 queries)
src/main/domain/profile/                      ArcadeTopbar.tsx
  profile.domain.ts                           ArcadeHero.tsx
    pickTopByRarity()  ← pure                 FoilAvatar.tsx
    resolveFeaturedCards()  ← filtre orphans  FeaturedCardsFan.tsx
    getFeaturedCards()                        FeaturedCardsEditorModal.tsx
    getSetsProgression()                      StatGrid.tsx + StatCard.tsx
    setFeaturedCards()                        XPCard.tsx
                                              StreakCard.tsx
src/main/interfaces/http/fastify/routes/      SetsProgressionCard.tsx
  users/index.ts  ← ajoute 3 endpoints        CollectionCTA.tsx
                                              ArcadeBackground.tsx
src/main/types/application/ioc.ts             cardArt.tsx
  + profileDomain
                                            src/api/profile.api.ts        ← étendu
src/main/application/ioc/awilix/             src/queries/useProfile.ts    ← étendu
  awilix-ioc-container.ts                     src/constants/profile.constant.ts ← étendu
  + ProfileDomain
                                            src/routes/_authenticated/profile/$username.tsx
                                              ← devient un wrapper qui rend <ArcadeProfile/>
```

## Backend

### 1. Schéma Prisma

```prisma
model User {
  // … champs existants
  featuredCardIds String[] @default([])
}

model CardSet {
  // … champs existants
  hue Int?  // 0–360 — fallback hash(name) si null
}
```

**`featuredCardIds`** stocke des **`cardId`** (pas des `userCardId`) — si la carte est recyclée puis re-pull, l'épinglage reste valide.

Migration : `prisma migrate dev --name profile_featured_and_set_hue`. Les deux changements sont ajoutifs et nullables (le `@default([])` couvre la backfill du tableau, `hue` reste null pour les sets existants).

### 2. Nouveau domaine `profile/`

`src/main/domain/profile/profile.domain.ts` — un `ProfileDomain` injecté via Awilix.

**Fonctions pures (exportées pour les tests unit) :**

```ts
// Prend la liste des UserCard possédées, renvoie les 5 plus rares
// (1 LEGENDARY, 1 EPIC, 1 RARE, 1 UNCOMMON, 1 COMMON ; si une rareté
// manque, on remonte vers les raretés présentes pour compléter à 5).
export function pickTopByRarity(ownedCards: UserCardWithCard[]): Card[]
```

**Méthodes de classe :**

```ts
class ProfileDomain {
  // Renvoie les featured cards résolues + filtrées (filtre les ids orphelins)
  async getFeaturedCards(username: string): Promise<FeaturedCard[]>

  // Renvoie tous les sets actifs avec owned/total/percent
  async getSetsProgression(username: string): Promise<SetProgression[]>

  // Met à jour la sélection de l'utilisateur authentifié
  async setFeaturedCards(userId: string, cardIds: string[]): Promise<string[]>
}
```

**Logique `getFeaturedCards`** :
1. Lit `user.featuredCardIds` + `userCardRepository.findByUser(userId)`.
2. Si `featuredCardIds.length > 0` → résout chaque id en croisant avec les cartes possédées (filtre des recyclées orphelines). Conserve l'ordre.
3. Si `featuredCardIds.length === 0` OU si toutes ont été filtrées → fallback `pickTopByRarity(ownedCards)`.

**Logique `setFeaturedCards`** :
- Validation Zod en amont (handler HTTP) : `cardIds: z.array(z.uuid()).max(5)`.
- Dédup silencieux des doublons (`Array.from(new Set(cardIds))`).
- Vérifie que chaque carte est possédée → sinon `Boom.badData('Card not in your collection', { invalidIds })`.
- Persiste via `userRepository.updateFeaturedCardIds(userId, cardIds)`.

**Logique `getSetsProgression`** :
- `cardRepository.findActiveSets()` → tous les sets actifs.
- Pour chaque set : compte le total de cartes actives + le compte des cartes uniques possédées par l'utilisateur. Une seule requête agrégée (`groupBy setId` sur `UserCard`).
- Tri par `percent` décroissant.

### 3. Endpoints

Ajoutés dans `src/main/interfaces/http/fastify/routes/users/index.ts` :

```
GET  /users/:username/profile/featured-cards
     auth: verifySessionCookie
     200: { cards: FeaturedCardDto[] }
     404: user inconnu

GET  /users/:username/profile/sets-progression
     auth: verifySessionCookie
     200: { sets: SetProgressionDto[] }
     404: user inconnu

PUT  /users/me/featured-cards
     auth: verifySessionCookie
     body: { cardIds: string[] }  // max 5, UUIDs distincts
     200: { cardIds: string[] }
     422: Boom.badData('Card not in your collection', { invalidIds })
     422: Boom.badData('Too many featured cards') via Zod
```

**Shapes :**

```ts
type FeaturedCardDto = {
  id: string
  name: string
  imageUrl: string | null  // résolu via storageClient.publicUrl
  rarity: CardRarity
  variant: CardVariant
  setId: string
  setName: string
}

type SetProgressionDto = {
  id: string
  name: string
  short: string   // 3 lettres dérivées du nom (calculées back, pas front)
  hue: number     // valeur DB ou fallback hashHue(name) si null
  owned: number
  total: number
  percent: number  // 0–100, arrondi à 1 décimale
}
```

### 4. IoC

Ajouts dans `src/main/types/application/ioc.ts` et `application/ioc/awilix/awilix-ioc-container.ts` :

```ts
readonly profileDomain: ProfileDomainInterface
```

`profileDomain` reçoit `{ userRepository, userCardRepository, cardRepository }`.

### 5. Cas limite — cartes recyclées

Si l'utilisateur a épinglé une carte puis la recycle, l'ID reste dans `featuredCardIds` en DB mais le résolveur `getFeaturedCards` **filtre à la lecture**. À la prochaine sauvegarde via la modal, l'ID disparaît naturellement. Pas de hook dans `collection.domain.recycleCard`.

## Frontend

### 1. Tokens scopés — `src/styles/_arcade.css`

Nouveau fichier importé depuis `_globals.css` après `_variables.css`. Tous les tokens sous une classe parent `.arcade-theme` pour ne **pas** affecter le reste de l'app.

```css
.arcade-theme {
  --arcade-bg: #fbf8f3;
  --arcade-surface: #ffffff;
  --arcade-surface-2: #fafaf7;
  --arcade-surface-3: #f4f0eb;
  --arcade-text: #1b1726;
  --arcade-text-muted: rgba(27, 23, 38, 0.55);
  --arcade-border: rgba(27, 23, 38, 0.08);
  --arcade-amber: #f59e0b;
  --arcade-amber-light: #fbbf24;
  --arcade-amber-deep: #d97706;

  --rarity-common: #22c55e;
  --rarity-uncommon: #3b82f6;
  --rarity-rare: #8b5cf6;
  --rarity-epic: #ec4899;
  --rarity-legendary: #f59e0b;

  --shadow-card:
    0 2px 0 rgba(27, 23, 38, .04),
    0 12px 30px -12px rgba(27, 23, 38, .08);

  background-color: var(--arcade-bg);
  color: var(--arcade-text);
  font-family: "DM Sans", system-ui, sans-serif;
}

.arcade-theme .font-display {
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  letter-spacing: -0.02em;
}

.arcade-theme .font-mono {
  font-family: "JetBrains Mono", ui-monospace, monospace;
}

@keyframes foilSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .arcade-theme *,
  .arcade-theme *::before,
  .arcade-theme *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

### 2. Polices

Ajoutées dans `front/index.html` (Google Fonts, `display=swap`) :

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
```

Aucun impact sur les pages existantes (Figtree/Nunito reste leur stack via `body { font-family: "Figtree", … }` dans `_globals.css`).

### 3. Composants

Tous sous `src/components/profile/arcade/` :

| Composant | Rôle |
|---|---|
| `ArcadeProfile` | Wrap `.arcade-theme` + `ArcadeBackground` ; lance les 3 queries en parallèle (`useUserProfile`, `useUserFeaturedCards`, `useUserSetsProgression`) ; pose les sections. |
| `ArcadeTopbar` | Fil d'ariane à gauche, pills `Admin` (admin-only) + `Paramètres` (own-only) à droite. |
| `ArcadeHero` | 2 col grid 360px + 1fr. Avatar + identité à gauche ; éventail à droite + bouton "Éditer" (own-only). |
| `FoilAvatar` | Carré arrondi 112px, anneau conic `foilSpin 6s linear infinite`, badge `MAX` si `level >= 100`. |
| `FeaturedCardsFan` | 5 emplacements rendus, interactions hover (lift/redress/scale + dim voisins). Clic → `CardViewModal` (réutilisé). État vide si 0 cartes possédées. |
| `FeaturedCardsEditorModal` | Liste les `UserCard` triées par rareté ; filtres rareté + set ; sélection ≤5 ; ordre = ordre de clic ; PUT au save. |
| `StatGrid` + `StatCard` | 4 stats : Tirages (LEGENDARY), Cartes uniques (UNCOMMON), Légendaires (EPIC, hint italique si 0), Dust (RARE). |
| `XPCard` | Barre 22px shimmer arc-en-ciel ; `LV. N · MAX` ou `LV. N · {xpInLevel}/{xpNeeded} XP`. |
| `StreakCard` | Streak actuel + record ; rangée L M M J V S D (semaine en cours, jour actif = aujourd'hui si `lastLoginAt` est sur le même jour UTC) ; cliquable → `StreakSummaryModal` (own-only). |
| `SetsProgressionCard` | Tuile par set actif, `hue` lu de l'API (fallback `hashHue(name)` si null). |
| `CollectionCTA` | `{ownedCards} cartes · {N sets explorés}` (N = sets où `owned > 0`). |
| `ArcadeBackground` | Aurora + grille, `absolute inset-0 -z-10 pointer-events-none`, localisé au profil. |
| `cardArt.tsx` | Helper qui rend le placeholder SVG abstrait de la réf (par rareté). À remplacer par les vraies images quand `imageUrl` est non-null. |

La route `routes/_authenticated/profile/$username.tsx` devient :

```tsx
function ProfilePage() {
  const { username } = Route.useParams()
  return <ArcadeProfile username={username} />
}
```

### 4. Data layer

**`src/api/profile.api.ts`** — étendu :

```ts
ProfileApi.getFeaturedCards(username): Promise<{ cards: FeaturedCard[] }>
ProfileApi.getSetsProgression(username): Promise<{ sets: SetProgression[] }>
ProfileApi.setFeaturedCards(cardIds: string[]): Promise<{ cardIds: string[] }>
```

**`src/queries/useProfile.ts`** — étendu :

```ts
useUserFeaturedCards(username)        // queryKey: ['profile', username, 'featured-cards']
useUserSetsProgression(username)      // queryKey: ['profile', username, 'sets-progression']
useSetFeaturedCardsMutation()         // onSuccess → invalidate ['profile', 'me', 'featured-cards']
                                      //          + ['profile', currentUsername, 'featured-cards']
```

**`src/constants/profile.constant.ts`** — étendu :

```ts
export const PROFILE_ROUTES = {
  profile: (u: string) => `/users/${u}/profile`,
  featuredCards: (u: string) => `/users/${u}/profile/featured-cards`,
  setsProgression: (u: string) => `/users/${u}/profile/sets-progression`,
  mySetFeaturedCards: '/users/me/featured-cards',
  // … existant
} as const

export type FeaturedCard = { id, name, imageUrl, rarity, variant, setId, setName }
export type SetProgression = { id, name, short, hue, owned, total, percent }
```

## Error Handling

### Backend
- `404` : user inconnu sur les 2 GET (cohérent avec `/profile` existant).
- `422 Too many featured cards` (Zod) si `cardIds.length > 5`.
- `422 Card not in your collection` avec `{ invalidIds: string[] }` si une carte n'est pas possédée.
- Doublons silencieusement dédupliqués avant validation.
- `getFeaturedCards` renvoie `{ cards: [] }` pour un nouveau joueur (0 cartes possédées).

### Frontend
- **3 queries indépendantes** : skeleton par section ; un échec sur `featured-cards` ne bloque pas `sets-progression`.
- **Erreur de section** : message inline `Impossible de charger cette section` + bouton "Réessayer" (refetch).
- **Mutation `setFeaturedCards`** :
  - Succès : toast `useToast` + invalidation + fermeture de la modal.
  - Erreur : toast + modal reste ouverte avec la sélection.
- **Pas d'optimistic update** sur la modal — le PUT est synchrone.

## Testing

### Backend (Jest)

**Unit** — `src/test/unit/profile.domain.test.ts` :
- `pickTopByRarity` :
  - 5 cartes une de chaque rareté → ordre attendu LEGENDARY→COMMON.
  - 3 raretés possédées → complète avec les raretés présentes pour atteindre 5.
  - 0 cartes → `[]`.
  - 10 cartes → garde 5 max.
- `resolveFeaturedCards` :
  - Featured ids tous valides → retourne dans l'ordre.
  - Featured ids dont 2 ont été recyclées → retourne 3 sur 5 (orphelins filtrés).
  - Featured ids vides → tombe sur le fallback `pickTopByRarity`.

**E2E** — `src/test/e2e/profile/` :
- `featured-cards-fallback.test.ts` — user sans sélection.
- `featured-cards-manual.test.ts` — user avec sélection valide.
- `featured-cards-orphaned.test.ts` — épingle 5 puis recycle 2 → 3 cartes renvoyées.
- `set-featured-cards.test.ts` — 200 OK ; 422 trop nombreuses ; 422 non possédée (vérifie liste `invalidIds`) ; dédup silencieux des doublons.
- `sets-progression.test.ts` — owned/total/percent par set ; tous les sets actifs présents (même ceux à 0).

### Frontend (vérification manuelle)

Checklist consignée dans le suivi du PR :
1. Hero — éventail rendu, hover lift+redress+scale+dim, clic ouvre `CardViewModal`.
2. Modal pick-5 — sélection/déselection, max 5, save, invalidation, fermeture.
3. États : own profile, autre user, admin sur autre user, nouveau joueur (0 cartes), 100% MAX.
4. Responsive — `< 1024px` : hero 1 col, stats 2 cols, sets 2 cols (puis 1 col en très petit).
5. `prefers-reduced-motion: reduce` — animations infinies coupées.
6. `cd front && npm run lint && npm run build` passe.

### Migration DB
- `npm run prisma:migrate:dev` côté dev. `globalSetup` E2E appliquera `prisma migrate deploy` automatiquement.
- Aucun backfill : le `@default([])` couvre les utilisateurs existants ; `CardSet.hue` reste null jusqu'à édition admin.

## Open Questions

Aucune. Les choix de scope ont été figés pendant le brainstorming :
- Cartes vedettes = sélection manuelle avec fallback auto.
- Achievements = section retirée pour ce tour.
- Tokens design = scopés `.arcade-theme`, pas globaux.
- Migration design system des autres pages = projet ultérieur.
