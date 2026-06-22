# Design System Uniformization — Arcade Clair → Global — Design

**Status:** Draft
**Date:** 2026-06-12
**Author:** Léo Couffinhal (via brainstorming with Claude)

## Context

La refonte du profil "arcade clair" (cf. `2026-06-11-profile-arcade-redesign-design.md`) a livré une page autoportante : tokens scopés sous `.arcade-theme`, composants buildés à partir de `<div>` raw qui bypassent les primitives `ui/` du codebase (`Button`, `Card`, `Popup`). Résultat : le profil ressemble à un îlot visuel et duplique des conventions déjà couvertes par les primitives existantes.

Ce projet a deux objectifs liés :

1. **Promouvoir la direction "arcade clair" en thème global du site**, en remplaçant les valeurs des tokens `--primary`, `--card`, `--background`, etc. dans `_colors.css`. Les ~15 pages qui utilisent déjà `<Card>`, `<Button>`, `bg-card`, `text-text` basculent automatiquement.
2. **Refactorer le profil pour utiliser les primitives `ui/`** (`Card`, `Button`, `Popup`) plus le composant TCG existant `CardDisplay` pour les cartes vedettes. Le scope `.arcade-theme` disparaît, `cardArt.tsx` (placeholder qu'on a écrit pour le premier tour) disparaît, `ArcadeBackground` est extrait en composant réutilisable (`AuroraGrid`).

Le dark mode est aujourd'hui du code mort (2 routes seulement utilisent `dark:*`, le `ThemeToggle` ne déclenche rien) : il est retiré pendant ce passage.

## Goals

- Faire en sorte que le reste du site (pages qui utilisent déjà `<Card>`/`<Button>`) hérite automatiquement du look arcade clair après modification des tokens.
- Mettre à jour les primitives `ui/` (`Card`, `Button`) pour porter le langage visuel arcade (radius 24px, shadow douce prononcée, font-display sur les titres, variants `gradient` et `pill`).
- Refactorer le profil pour consommer ces primitives — supprimer `cardArt.tsx`, brancher `CardDisplay` (mode `compact`, `interactive={false}`) pour les cartes vedettes, supprimer le scope `.arcade-theme`.
- Extraire `ArcadeBackground` en `AuroraGrid` réutilisable.
- Supprimer le dark mode mort (block `.dark` dans `_colors.css`, `darkMode` dans `tailwind.config.js`, `ThemeToggle.tsx`, `dark:*` variants).

## Non-Goals

- **Migration page-par-page** des pages qui n'utilisent pas encore les primitives `ui/` (play, collection, shop, leaderboard, team, quests, admin spécifiques) — projet ultérieur. Si une page rend mal après le swap des tokens, on note pour follow-up sans corriger systématiquement.
- **Variante dark de la palette arcade** — pas d'usage produit pour le moment.
- **Nouveau ThemeProvider / système de thèmes commutables** — un seul thème, point.
- **Re-styling de `Popup`** — l'existant (Radix Dialog + glow ambre subtil) marche déjà sur fond crème, on ne touche pas.
- **Migration des composants Radix Themes** (`@radix-ui/themes`) utilisés sur `api-docs.tsx` — leur propre système de tokens, hors scope.

## Architecture Overview

```
front/
├── src/styles/
│   ├── _colors.css            ← valeurs remplacées, bloc .dark supprimé
│   ├── _globals.css           ← imports : _arcade.css retiré ; foilSpin + prefers-reduced-motion ajoutés ici
│   └── _arcade.css            ← SUPPRIMÉ
│
├── src/components/ui/
│   ├── card.tsx               ← rounded-2xl + shadow-card + font-display sur CardTitle
│   ├── button.tsx             ← + variant 'gradient' + variant 'pill' + size 'pill'
│   ├── popup.tsx              ← inchangé
│   └── themeToggle.tsx        ← SUPPRIMÉ
│
├── src/components/shared/decorations/
│   └── AuroraGrid.tsx         ← extraction de ArcadeBackground
│
├── src/components/profile/arcade/
│   ├── ArcadeProfile.tsx      ← retire className="arcade-theme", AuroraGrid à la place d'ArcadeBackground
│   ├── ArcadeHero.tsx         ← <Card> + <Button variant="pill"> + <CardTitle>
│   ├── ArcadeTopbar.tsx       ← <Button asChild variant="pill" size="pill">
│   ├── ArcadeBackground.tsx   ← SUPPRIMÉ
│   ├── FeaturedCardsFan.tsx   ← <CardDisplay compact interactive={false}>
│   ├── FeaturedCardsEditorModal.tsx ← <Popup> Radix + <Button>
│   ├── StatCard.tsx           ← wrap <Card>
│   ├── XPCard.tsx             ← wrap <Card> + <CardTitle>
│   ├── StreakCard.tsx         ← <Card asChild><button>…</button></Card> quand isOwnProfile
│   ├── SetsProgressionCard.tsx← wrap <Card> + <CardTitle>
│   ├── CollectionCTA.tsx      ← <Button asChild variant="gradient" size="lg">
│   ├── cardArt.tsx            ← SUPPRIMÉ
│   ├── FoilAvatar.tsx         ← inchangé
│   └── utils.ts               ← drop hashHue, deriveShort (dead code, backend renvoie ces valeurs)
│
├── tailwind.config.js         ← darkMode: ['class'] retiré
└── routes/
    ├── discord.tsx            ← dark:* variants retirés
    └── guide.tsx              ← dark:* variants retirés
```

## Section 1 — Tokens & polices

### `_colors.css` réécrit

Remplacement chirurgical des valeurs (les noms restent identiques) :

```css
:root {
  --primary: #f59e0b;
  --primary-light: #fbbf24;
  --primary-dark: #d97706;
  --primary-foreground: #ffffff;

  --secondary: #ec4899;
  --secondary-foreground: #ffffff;

  --accent: #8b5cf6;
  --accent-foreground: #ffffff;

  --muted: #fafaf7;
  --muted-foreground: rgba(27, 23, 38, 0.55);

  --border: rgba(27, 23, 38, 0.08);
  --border-dark: rgba(27, 23, 38, 0.12);
  --input: #ffffff;
  --ring: #f59e0b;

  --background: #fbf8f3;
  --foreground: #1b1726;

  --card: #ffffff;
  --card-foreground: #1b1726;

  --popover: #ffffff;
  --popover-foreground: #1b1726;

  --text: #1b1726;
  --text-light: rgba(27, 23, 38, 0.55);

  --destructive: #ef4444;
  --destructive-foreground: #ffffff;

  /* Promus depuis l'ancien scope .arcade-theme */
  --surface-2: #fafaf7;
  --surface-3: #f4f0eb;
  --amber-soft: #fde68a;
  --amber-deep: #d97706;

  --rarity-common: #22c55e;
  --rarity-uncommon: #3b82f6;
  --rarity-rare: #8b5cf6;
  --rarity-epic: #ec4899;
  --rarity-legendary: #f59e0b;

  --shadow-card:
    0 2px 0 rgba(27, 23, 38, 0.04),
    0 12px 30px -12px rgba(27, 23, 38, 0.08);

  --fc-event-bg-color: #f59e0b;
  --fc-event-border-color: #f59e0b;
}
```

Le bloc `@layer base { .dark { … } }` est entièrement supprimé.

### Polices

Dans `_globals.css`, le bloc `@theme` :

```css
--font-display: "Bricolage Grotesque", "Nunito", system-ui, sans-serif;
--font-body: "DM Sans", "Figtree", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

(Les fallbacks Nunito/Figtree restent en deuxième chaîne au cas où Google Fonts ne charge pas.)

Le `body { font-family: ... }` passe de Figtree à DM Sans, et `h1..h6` passent à Bricolage Grotesque avec `letter-spacing: -0.02em`.

### Migration des keyframes / utility classes

- `foilSpin` (actuellement dans `_arcade.css`) déplacé dans `_globals.css` à côté de `shimmer`.
- `prefers-reduced-motion` qui scopait `.arcade-theme` est généralisé à `*, *::before, *::after`.
- `_arcade.css` est **supprimé**.
- L'import `@import "./_arcade.css";` dans `_globals.css` est retiré.

Les classes utilitaires `font-display` et `font-mono` (qui étaient scopées) deviennent générées par Tailwind via les `--font-*` du `@theme` — `text-font-display` n'existe pas, mais `font-display` est exposé par Tailwind v4 dès que `--font-display` est dans le `@theme`. Aucun changement de syntaxe d'usage.

### Dark mode cleanup

1. `tailwind.config.js` : retirer la ligne `darkMode: ['class']`.
2. `_colors.css` : retirer le bloc `@layer base { .dark { … } }` entier.
3. `components/ui/themeToggle.tsx` : fichier supprimé.
4. `routes/discord.tsx`, `routes/guide.tsx` : pour chaque classe de la forme `bg-zinc-50 dark:bg-zinc-900`, garder uniquement la partie de base et supprimer le `dark:*` suffix. Cas-par-cas (les pages restent fonctionnelles, juste sans dark).
5. `components/streak/StreakSummaryModal.tsx` et `components/table/virtualizedBodyTable.tsx` : grep `dark:` et nettoyer si présent (ces fichiers ont fait partie des résultats grep initiaux).

Aucun `useThemeToggle` n'existe — pas d'autre callsite à mettre à jour.

## Section 2 — Refonte des primitives `ui/`

### `card.tsx`

```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground p-4 ' +
          'shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)]',
        className,
      )}
      {...props}
    />
  ),
)

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-display font-extrabold tracking-tight m-0', className)} {...props} />
  ),
)
```

`CardHeader`, `CardDescription`, `CardContent`, `CardFooter` restent strictement identiques.

### `button.tsx`

Le bloc `variants.variant` est étendu avec deux nouvelles entrées, et `variants.size` avec une nouvelle entrée :

```tsx
variants: {
  variant: {
    // ... existing default/destructive/outline/secondary/ghost/link/none/transparent/absolute
    gradient:
      'text-white font-bold shadow-[0_8px_24px_rgba(236,72,153,0.35)] ' +
        'bg-gradient-to-br from-primary to-secondary hover:brightness-105',
    pill:
      'bg-card border border-border font-mono font-semibold ' +
        'shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)] ' +
        'hover:-translate-y-px hover:border-border-dark transition-transform',
  },
  size: {
    // ... existing default/sm/lg/icon/icon-sm
    pill: 'h-8 px-3 rounded-full text-[13px]',
  },
},
```

Les variants existants ne sont pas modifiés (pas de breaking change pour les ~15 pages qui utilisent déjà `<Button>`).

### `popup.tsx` — inchangé

Le styling actuel (Radix Dialog + glow ambre subtil + bg-card) fonctionne déjà sur le nouveau fond crème.

## Section 3 — Refactor du profil arcade

### Fichiers supprimés

- `front/src/components/profile/arcade/cardArt.tsx` — remplacé par `CardDisplay`.
- `front/src/components/profile/arcade/ArcadeBackground.tsx` — extrait dans `components/shared/decorations/AuroraGrid.tsx`.
- `front/src/styles/_arcade.css`.
- `front/src/components/ui/themeToggle.tsx`.

### `components/shared/decorations/AuroraGrid.tsx` — nouveau

Reprend le code de l'ancien `ArcadeBackground` à l'identique. Pas de props pour ce tour (YAGNI ; on ajoutera des props si une autre page en a besoin).

### Refactor par composant

**`ArcadeProfile.tsx`** : retire `className="arcade-theme"` sur le root, remplace `<ArcadeBackground />` par `<AuroraGrid />`. Le reste de la composition est inchangé.

**`ArcadeHero.tsx`** :
- La `<section>` racine devient `<Card className="rounded-3xl p-8 overflow-visible">`.
- Le `<h2>` "Cartes vedettes" devient `<CardTitle className="text-sm uppercase tracking-wider">`.
- Le bouton "Éditer" devient `<Button variant="pill" size="pill" onClick={...}><Pencil size={12} /> Éditer</Button>`.
- Le `<h1>` pseudo reste un `<h1>` (taille 52px custom, on ajoute `className="font-display ..."` directement).
- Reste fonctionnel : modal d'édition, FoilAvatar.

**`ArcadeTopbar.tsx`** : remplace les `<Link className="...pill...">` par `<Button asChild variant="pill" size="pill"><Link to="...">...</Link></Button>`.

**`FeaturedCardsFan.tsx`** :
```tsx
<CardDisplay
  rarity={card.rarity}
  name={card.name}
  setName={card.setName}
  imageUrl={card.imageUrl}
  variant={card.variant}
  interactive={false}
  compact
/>
```
remplace `<CardArt rarity={...} />`. Le wrapper `<div>` parent garde toute la logique d'animation d'éventail (rotation, offset, hover lift/redress/scale/dim z-index). Le `CardDisplay` est juste l'enfant visuel.

**`FeaturedCardsEditorModal.tsx`** : refactor complet pour passer à `Popup` Radix :

```tsx
<Popup open={open} onOpenChange={(o) => !o && onClose()}>
  <PopupContent size="xl">
    <PopupHeader>
      <PopupTitle subtitle={`${selected.length} / 5 sélectionnées · clique pour ajouter / retirer`}>
        Cartes vedettes
      </PopupTitle>
    </PopupHeader>
    <PopupBody className="max-h-[60vh] overflow-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {owned.map(c => (
        <button key={c.id} type="button" onClick={() => toggle(c.id)} className="relative text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40" disabled={!selected.includes(c.id) && selected.length >= 5}>
          <CardDisplay rarity={c.rarity} name={c.name} setName={c.setName} imageUrl={c.imageUrl} variant={c.variant ?? 'NORMAL'} compact interactive={false} />
          {selected.includes(c.id) && (
            <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center font-mono">
              {selected.indexOf(c.id) + 1}
            </span>
          )}
        </button>
      ))}
    </PopupBody>
    <PopupFooter>
      <Button variant="outline" onClick={onClose}>Annuler</Button>
      <Button variant="gradient" onClick={save} disabled={mutation.isPending}>
        {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </PopupFooter>
  </PopupContent>
</Popup>
```

Le backdrop / X de fermeture / focus trap / ESC / scroll lock viennent gratuits du `PopupContent` Radix. Le DialogRoot prend `onOpenChange` au lieu d'un `onClose` direct — adapter le parent.

**`StatCard.tsx`** : wrap `<Card className="relative overflow-hidden p-[22px] pl-[18px] flex items-center gap-4 group">` ; les `<span>` absolute (barre supérieure et disque décoratif) restent ; rien d'autre ne change.

**`XPCard.tsx`** : wrap `<Card className="p-6">`. Le `<h3>` "Expérience" devient `<CardTitle className="text-sm uppercase tracking-wider">`. La barre shimmer arc-en-ciel garde son `linear-gradient` inline (les hex précis sont volontaires pour la transition arc-en-ciel — on n'a pas de token `--rainbow`).

**`StreakCard.tsx`** : selon `isOwnProfile` :
```tsx
isOwnProfile ? (
  <Card asChild>
    <button type="button" onClick={() => setOpen(true)} className="text-left w-full cursor-pointer hover:border-border-dark transition-colors">
      {streakContent}
    </button>
  </Card>
) : (
  <Card>{streakContent}</Card>
)
```
Plus de `<div onClick>` raw. Le `<h3>` "Streak de connexion" devient `<CardTitle ...>`.

**`SetsProgressionCard.tsx`** : wrap `<Card className="p-6">`. Le `<h3>` "Progression par extension" devient `<CardTitle ...>`.

**`CollectionCTA.tsx`** : le bandeau gradient pastel reste un `<div>` (c'est un bandeau, pas un bouton, et son gradient pastel — orange→pink→purple soft — diffère de la variante `gradient` du Button). Le CTA à droite devient :
```tsx
<Button asChild variant="gradient" size="lg">
  <Link to={...}>{isOwnProfile ? 'Voir ma collection' : 'Explorer'}</Link>
</Button>
```

### `utils.ts` cleanup

`hashHue` et `deriveShort` sont supprimés du fichier (le backend renvoie déjà `hue` et `short` dans le DTO de `/sets-progression`, ces helpers front ne sont jamais appelés). On garde `weekDays`, `isLoggedInToday`, `RARITY_COLORS`, `ArcadeRarity`.

## Section 4 — Edge cases & risques

### Pages utilisant `dark:` variants

Recensement initial : `discord.tsx`, `guide.tsx`, possiblement `streak/StreakSummaryModal.tsx` et `table/virtualizedBodyTable.tsx`. Sans `darkMode` dans Tailwind config, les classes `dark:*` deviennent silencieusement no-op (Tailwind ne génère plus la règle CSS associée) — pas de crash, mais c'est du code mort. À nettoyer dans la PR : pour chaque `bg-foo dark:bg-bar`, ne garder que `bg-foo`.

### Pages avec couleurs hardcodées

Certaines pages peuvent utiliser des classes Tailwind statiques (`bg-slate-900`, `text-zinc-100`) pensées pour le précédent palette / dark mode. Le swap des tokens ne les affecte pas — elles continueront à rendre comme avant. Si une page rend mal après le swap, **on note la page pour follow-up**, on ne fait pas de fix systématique dans cette PR.

### Pages basculant automatiquement

Toute page qui utilise `bg-card`, `text-text`, `border-border`, `<Card>`, `<Button>` (etc.) bascule sur le nouveau look avec le swap des tokens. Liste initiale (15 pages identifiées par `grep -rln "from.*components/ui/(button|card|popup)"`) : `routes/index.tsx`, `routes/forgot-password.tsx`, `routes/reset-password.tsx`, `routes/pending.tsx`, `routes/invitations.$token.tsx`, `routes/_authenticated/settings.tsx`, `routes/_admin/admin.index.tsx`, `routes/_admin/admin.config.tsx`, `routes/_admin/admin.cards.tsx`, `routes/_admin/admin.media.tsx`, `routes/_admin/admin.scoring.tsx`, `routes/_admin/admin.shop.tsx`, `routes/_admin/admin.skills.tsx`, `routes/_admin/admin.stats.tsx`, `routes/_admin/admin.streak.tsx`, `routes/_admin/admin.users.tsx`. Plus `hooks/formConfig.tsx` qui drive les forms admin. Le radius (12→16) et la shadow plus prononcée seront visibles.

### Composants Radix Themes sur `api-docs.tsx`

`@radix-ui/themes` a son propre système de tokens, n'est pas affecté par mes changements. À vérifier que `api-docs.tsx` rend toujours correctement après le swap (probablement OK car les couleurs Radix Themes sont indépendantes).

### `ArcadeBackground` → `AuroraGrid`

L'import change dans `ArcadeProfile.tsx`. Comportement identique.

### `cardArt.tsx` retiré — modal d'édition

La modal d'édition `FeaturedCardsEditorModal` utilisait `<CardArt>` placeholder ; maintenant `<CardDisplay>` mode `compact`. Visuellement plus riche (frame TCG, variant overlay), même surface au clic.

### `FoilAvatar` keyframe `foilSpin`

Migration de la keyframe vers `_globals.css` — le composant continue à fonctionner sans modification.

## Testing & Verification

Frontend n'a pas de test runner configuré (constaté lors du projet précédent). Vérification manuelle obligatoire :

1. `cd front && npm run lint && npm run build` doit passer.
2. Dev server (`npm run dev` sur port 4269) — visites :
   - `/profile/<moi>` : éventail rendu avec `CardDisplay`, modal d'édition Radix s'ouvre/ferme proprement (ESC + click-outside + X), focus trap, sauvegarde fonctionne.
   - `/play`, `/collection`, `/shop`, `/leaderboard` : pas de crash, couleurs basculées sur crème/ambre, pages encore lisibles.
   - `/admin/*` : héritent du nouveau look (Cards radius 16, shadow plus douce, font Bricolage Grotesque sur les titres).
   - `/discord`, `/guide` : pas de classes dark résiduelles, page fonctionnelle.
3. Vérifier `prefers-reduced-motion: reduce` (DevTools → Rendering) : `foilSpin` et `shimmer` coupés.
4. Vérifier qu'aucune référence à `themeToggle`, `_arcade.css`, `arcade-theme`, `ArcadeBackground`, `cardArt` ne subsiste : `grep -r` sur le front.

## Open Questions

Aucune. Les choix sont figés :
- Dark mode supprimé (pas conservé en code mort, pas dérivé en variante).
- Tokens : valeurs remplacées dans `_colors.css`, noms conservés. `_arcade.css` supprimé.
- Primitives modifiées en profondeur : Card (radius + shadow + font-display), Button (+ variants gradient + pill + size pill). Popup intact.
- Profil refactoré pour consommer Card / Button / Popup / CardDisplay.
- `ArcadeBackground` extrait en `AuroraGrid` (composant shared).
- Pages non couvertes par ce projet : pages qui n'utilisent pas encore `<Card>`/`<Button>` resteront comme avant, à migrer dans des projets ultérieurs page-par-page.
