# Design System Uniformization — Arcade Clair → Global — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promouvoir les tokens "arcade clair" au niveau global, refondre les primitives `Card`/`Button`, refactorer le profil pour consommer les primitives + `CardDisplay`, et supprimer le dark mode mort.

**Architecture:** Modification chirurgicale de `_colors.css` (valeurs remplacées, noms conservés), refonte de `card.tsx`/`button.tsx` avec extension des variants existants, refactor in-place des composants `profile/arcade/*` pour wrapper les primitives au lieu de `<div>` raw, extraction d'`ArcadeBackground` en composant shared. Aucune modification backend.

**Tech Stack:** React 19, TanStack Router/Query, Tailwind v4 (`@theme` block), Radix Dialog (via `Popup`), class-variance-authority, Lucide React, Bricolage Grotesque + DM Sans + JetBrains Mono.

**Spec source:** `docs/superpowers/specs/2026-06-12-design-system-uniformization-design.md`

---

## File Structure

### Modified
- `front/src/styles/_colors.css` — valeurs remplacées par la palette arcade, bloc `.dark` supprimé
- `front/src/styles/_globals.css` — import `_arcade.css` retiré ; `--font-display`/`--font-body`/`--font-mono` mis à jour ; `body` et `h1..h6` réécrits ; `foilSpin` ajouté ; `prefers-reduced-motion` généralisé
- `front/tailwind.config.js` — `darkMode: ['class']` retiré
- `front/src/components/ui/card.tsx` — rounded-2xl + shadow + font-display sur CardTitle
- `front/src/components/ui/button.tsx` — variants `gradient` et `pill` + size `pill`
- `front/src/components/streak/StreakSummaryModal.tsx` — `dark:text-amber-400` retiré
- `front/src/components/table/virtualizedBodyTable.tsx` — `dark:hover:bg-primary/6` retiré
- `front/src/routes/guide.tsx` — `dark:text-amber-400` retiré
- `front/src/routes/discord.tsx` — `dark:text-amber-400` retiré
- `front/src/components/profile/arcade/ArcadeProfile.tsx` — drop `arcade-theme`, swap ArcadeBackground → AuroraGrid
- `front/src/components/profile/arcade/ArcadeTopbar.tsx` — `<Button asChild variant="pill" size="pill">`
- `front/src/components/profile/arcade/ArcadeHero.tsx` — `<Card>` + `<CardTitle>` + `<Button variant="pill">`
- `front/src/components/profile/arcade/FeaturedCardsFan.tsx` — `<CardDisplay>` au lieu de `<CardArt>`
- `front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx` — `<Popup>` Radix + `<Button>` + `<CardDisplay>`
- `front/src/components/profile/arcade/StatCard.tsx` — wrap `<Card>`
- `front/src/components/profile/arcade/XPCard.tsx` — wrap `<Card>` + `<CardTitle>`
- `front/src/components/profile/arcade/StreakCard.tsx` — `<Card asChild><button>` quand isOwnProfile
- `front/src/components/profile/arcade/SetsProgressionCard.tsx` — wrap `<Card>` + `<CardTitle>`
- `front/src/components/profile/arcade/CollectionCTA.tsx` — `<Button asChild variant="gradient" size="lg">`
- `front/src/components/profile/arcade/utils.ts` — supprime `hashHue` et `deriveShort`

### Created
- `front/src/components/shared/decorations/AuroraGrid.tsx` — extraction de ArcadeBackground

### Deleted
- `front/src/styles/_arcade.css`
- `front/src/components/ui/themeToggle.tsx`
- `front/src/components/profile/arcade/ArcadeBackground.tsx`
- `front/src/components/profile/arcade/cardArt.tsx`

---

## Task 1: Replace `_colors.css` values + remove `.dark` block

**Files:**
- Modify: `front/src/styles/_colors.css` (full rewrite)

- [ ] **Step 1: Replace the entire file with the new content**

```css
:root {
  --primary: #f59e0b;
  --primary-light: #fbbf24;
  --primary-dark: #d97706;
  --primary-foreground: #ffffff;

  --fc-event-bg-color: #f59e0b;
  --fc-event-border-color: #f59e0b;

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
}
```

Important : tout le bloc `@layer base { .dark { ... } }` est supprimé.

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/styles/_colors.css 2>&1 | tail -5
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/styles/_colors.css
git commit -m "feat(theme): swap to arcade clair palette + drop .dark block"
```

---

## Task 2: Update `_globals.css`

**Files:**
- Modify: `front/src/styles/_globals.css`

- [ ] **Step 1: Remove the `_arcade.css` import**

Trouver la ligne `@import "./_arcade.css";` (autour de la ligne 16) et la supprimer.

- [ ] **Step 2: Update fonts in the `@theme` block**

Dans le bloc `@theme { … }`, remplacer :

```css
  --font-display: "Nunito", system-ui, sans-serif;
  --font-body: "Figtree", system-ui, sans-serif;
```

par :

```css
  --font-display: "Bricolage Grotesque", "Nunito", system-ui, sans-serif;
  --font-body: "DM Sans", "Figtree", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
```

- [ ] **Step 3: Update `body` and `h1..h6`**

Remplacer le bloc :

```css
body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: "Figtree", system-ui, -apple-system, sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: "Nunito", system-ui, -apple-system, sans-serif;
}
```

par :

```css
body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: "DM Sans", "Figtree", system-ui, -apple-system, sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: "Bricolage Grotesque", "Nunito", system-ui, -apple-system, sans-serif;
  letter-spacing: -0.02em;
}
```

- [ ] **Step 4: Add `foilSpin` keyframe**

Près des autres keyframes (sous le keyframe `shimmer`), ajouter :

```css
@keyframes foilSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 5: Generalize `prefers-reduced-motion`**

À la fin du fichier (avant les blocs FullCalendar / level-up), ajouter :

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Type-check + build**

```bash
cd front && npm run build 2>&1 | tail -10
```

Expected: build success.

- [ ] **Step 7: Commit**

```bash
git add front/src/styles/_globals.css
git commit -m "feat(theme): update globals fonts + drop _arcade import + foilSpin"
```

---

## Task 3: Delete `_arcade.css`

**Files:**
- Delete: `front/src/styles/_arcade.css`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -rn "_arcade" front/src 2>&1
```

Expected: aucun résultat (l'import a été retiré au T2).

- [ ] **Step 2: Delete the file**

```bash
rm front/src/styles/_arcade.css
```

- [ ] **Step 3: Verify build still passes**

```bash
cd front && npm run build 2>&1 | tail -5
```

Expected: build success.

- [ ] **Step 4: Commit**

```bash
git add front/src/styles/_arcade.css
git commit -m "feat(theme): remove _arcade.css (tokens promoted to global)"
```

---

## Task 4: Remove `darkMode` from `tailwind.config.js`

**Files:**
- Modify: `front/tailwind.config.js`

- [ ] **Step 1: Remove the `darkMode` key**

Remplacer le contenu actuel par :

```js
export default {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
  },
}
```

(La ligne `darkMode: ['class'],` est supprimée.)

- [ ] **Step 2: Build**

```bash
cd front && npm run build 2>&1 | tail -5
```

Expected: build success. Les `dark:*` deviennent silencieusement no-op.

- [ ] **Step 3: Commit**

```bash
git add front/tailwind.config.js
git commit -m "feat(theme): drop darkMode config (dead code, no toggle wired)"
```

---

## Task 5: Delete `themeToggle.tsx`

**Files:**
- Delete: `front/src/components/ui/themeToggle.tsx`

- [ ] **Step 1: Confirm no usage**

```bash
grep -rn "themeToggle\|ThemeToggle" front/src 2>&1 | head
```

Expected: aucun résultat hors du fichier lui-même.

- [ ] **Step 2: Delete the file**

```bash
rm front/src/components/ui/themeToggle.tsx
```

- [ ] **Step 3: Verify build**

```bash
cd front && npm run build 2>&1 | tail -5
```

Expected: build success.

- [ ] **Step 4: Commit**

```bash
git add front/src/components/ui/themeToggle.tsx
git commit -m "feat(theme): remove unused ThemeToggle component"
```

---

## Task 6: Clean `dark:*` variants from 4 files

**Files:**
- Modify: `front/src/components/streak/StreakSummaryModal.tsx:316`
- Modify: `front/src/components/table/virtualizedBodyTable.tsx:95`
- Modify: `front/src/routes/guide.tsx:93`
- Modify: `front/src/routes/discord.tsx:184`

- [ ] **Step 1: Clean StreakSummaryModal**

À la ligne 316, remplacer :

```tsx
isMilestone && !isPast ? 'text-amber-600 dark:text-amber-400' : '',
```

par :

```tsx
isMilestone && !isPast ? 'text-amber-600' : '',
```

- [ ] **Step 2: Clean virtualizedBodyTable**

À la ligne 95, remplacer :

```tsx
? 'cursor-pointer hover:bg-amber-50/60 dark:hover:bg-primary/6'
```

par :

```tsx
? 'cursor-pointer hover:bg-amber-50/60'
```

- [ ] **Step 3: Clean guide.tsx**

À la ligne 93, remplacer :

```tsx
<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
```

par :

```tsx
<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 leading-relaxed">
```

- [ ] **Step 4: Clean discord.tsx**

À la ligne 184, remplacer :

```tsx
<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
```

par :

```tsx
<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600">
```

- [ ] **Step 5: Verify no remaining `dark:` references**

```bash
grep -rn "dark:" front/src --include="*.tsx" --include="*.ts" --include="*.css" 2>&1 | grep -v "border-dark\|primary-dark\|amber-deep\|surface-dark\|--card-dark\|--*-dark:" | head -10
```

Expected: aucun résultat (les match `border-dark`, `primary-dark` sont des noms de tokens, pas des variants Tailwind).

- [ ] **Step 6: Build**

```bash
cd front && npm run build 2>&1 | tail -5
```

Expected: build success.

- [ ] **Step 7: Commit**

```bash
git add front/src/components/streak/StreakSummaryModal.tsx front/src/components/table/virtualizedBodyTable.tsx front/src/routes/guide.tsx front/src/routes/discord.tsx
git commit -m "feat(theme): remove dark: variants (dark mode dropped)"
```

---

## Task 7: Update `card.tsx`

**Files:**
- Modify: `front/src/components/ui/card.tsx`

- [ ] **Step 1: Replace `Card` and `CardTitle` definitions**

Remplacer la définition de `Card` (lignes 5-18) par :

```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-border bg-card text-card-foreground p-4 ' +
        'shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)]',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'
```

Et remplacer `CardTitle` (lignes 32-38) par :

```tsx
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-display font-extrabold tracking-tight m-0', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'
```

`CardHeader`, `CardDescription`, `CardContent`, `CardFooter` restent strictement identiques.

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/ui/card.tsx 2>&1 | tail -5
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/ui/card.tsx
git commit -m "feat(ui): Card rounded-2xl + shadow-card + font-display on title"
```

---

## Task 8: Update `button.tsx`

**Files:**
- Modify: `front/src/components/ui/button.tsx`

- [ ] **Step 1: Add `gradient` and `pill` variants + `pill` size**

Dans le bloc `variants` de `buttonVariants` (lignes 10-40), étendre `variant` et `size`. Le bloc complet `variants` doit devenir :

```ts
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/85 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/80',
        outline:
          'border border-border bg-transparent hover:bg-muted hover:text-text',
        secondary: 'bg-muted text-text border border-border hover:bg-border',
        ghost: 'bg-transparent hover:bg-muted hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
        none: 'text-primary bg-transparent border-none shadow-none p-0 hover:bg-primary/10',
        transparent:
          'text-primary bg-transparent border-none shadow-none p-0 focus-visible:ring-0',
        absolute:
          'absolute right-2 text-primary bg-transparent border-none shadow-none p-0 hover:bg-primary/10',
        gradient:
          'text-white font-bold shadow-[0_8px_24px_rgba(236,72,153,0.35)] bg-gradient-to-br from-primary to-secondary hover:brightness-105',
        pill:
          'bg-card border border-border font-mono font-semibold shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)] hover:-translate-y-px hover:border-border-dark transition-transform',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-6 w-6 p-1 rounded-lg',
        pill: 'h-8 px-3 rounded-full text-[13px]',
      },
    },
```

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/ui/button.tsx 2>&1 | tail -5
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/ui/button.tsx
git commit -m "feat(ui): Button add gradient + pill variants and pill size"
```

---

## Task 9: Create `AuroraGrid.tsx`

**Files:**
- Create: `front/src/components/shared/decorations/AuroraGrid.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p front/src/components/shared/decorations
```

Fichier `front/src/components/shared/decorations/AuroraGrid.tsx` :

```tsx
// front/src/components/shared/decorations/AuroraGrid.tsx
// Decorative background — three soft radials (aurora) + a faint masked grid.
// Use inside any container as `position: relative`. The component itself is
// absolutely-positioned and pointer-events-none.

export function AuroraGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.18), transparent 55%),
            radial-gradient(circle at 80% 12%, rgba(139, 92, 246, 0.14), transparent 55%),
            radial-gradient(circle at 50% 90%, rgba(236, 72, 153, 0.10), transparent 55%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(27,23,38,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(27,23,38,.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/shared/decorations/AuroraGrid.tsx 2>&1 | tail -5
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/shared/decorations/AuroraGrid.tsx
git commit -m "feat(ui): add AuroraGrid shared decoration (extracted from ArcadeBackground)"
```

---

## Task 10: Refactor `ArcadeProfile.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/ArcadeProfile.tsx`

- [ ] **Step 1: Update imports**

Remplacer :

```tsx
import { ArcadeBackground } from './ArcadeBackground'
```

par :

```tsx
import { AuroraGrid } from '../../shared/decorations/AuroraGrid'
```

- [ ] **Step 2: Remove `arcade-theme` wrapper class**

Trouver les trois occurrences de `className="arcade-theme …"` (les états loading / error / render) et supprimer juste le `arcade-theme` token. Exemples :

- `<div className="arcade-theme min-h-[calc(100vh-4rem)] flex items-center justify-center">` → `<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">`
- `<div className="arcade-theme relative min-h-[calc(100vh-4rem)]">` → `<div className="relative min-h-[calc(100vh-4rem)]">`

- [ ] **Step 3: Swap `<ArcadeBackground />` for `<AuroraGrid />`**

Une seule occurrence dans le rendu final.

- [ ] **Step 4: Replace var-based colors with token classes**

Les attributs `style={{ background: 'var(--arcade-bg)' }}` ou `text-[var(--arcade-text-muted)]` qui restent peuvent maintenant utiliser les tokens globaux directement. Pour ce fichier précisément, les classes restent fonctionnelles (Tailwind v4 résout les `var(--arcade-*)` même sans définition de la var — elles seront simplement vides). Pour propreté, remplacer dans le bloc d'erreur :

- `text-[var(--arcade-text-muted)]` → `text-text-light`
- `border-[var(--arcade-amber)]` → `border-primary`

(Note : les `--arcade-*` n'existent plus globalement depuis T1+T3, donc ces classes rendraient une couleur vide. À nettoyer.)

- [ ] **Step 5: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/ArcadeProfile.tsx 2>&1 | tail -5
```

Expected: pas d'erreur.

- [ ] **Step 6: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeProfile.tsx
git commit -m "refactor(profile): use AuroraGrid + drop .arcade-theme scope"
```

---

## Task 11: Refactor `ArcadeTopbar.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/ArcadeTopbar.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

import { Button } from '../../ui/button'

type Props = {
  isOwnProfile: boolean
  isAdmin: boolean
}

export function ArcadeTopbar({ isOwnProfile, isAdmin }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-mono text-[11px] uppercase tracking-[.15em] opacity-55">
        GACHAPON / PROFIL
      </div>
      {isOwnProfile && (
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="pill" size="pill">
              <Link to="/admin">
                <LayoutDashboard size={14} />
                Admin
              </Link>
            </Button>
          )}
          <Button asChild variant="pill" size="pill">
            <Link to="/settings">
              <Settings size={14} />
              Paramètres
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/ArcadeTopbar.tsx 2>&1 | tail -5
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeTopbar.tsx
git commit -m "refactor(profile): ArcadeTopbar uses Button variant pill"
```

---

## Task 12: Refactor `StatCard.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/StatCard.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import type { LucideIcon } from 'lucide-react'

import { Card } from '../../ui/card'
import type { ArcadeRarity } from './utils'
import { RARITY_COLORS } from './utils'

type Props = {
  icon: LucideIcon
  label: string
  value: number
  rarity: ArcadeRarity
  hint?: string
}

export function StatCard({ icon: Icon, label, value, rarity, hint }: Props) {
  const color = RARITY_COLORS[rarity]
  return (
    <Card className="group relative overflow-hidden p-[22px] pl-[18px] flex items-center gap-4">
      <span className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      <span
        className="absolute -right-12 -top-12 w-44 h-44 rounded-full -z-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-30"
        style={{ background: color, opacity: 0.12 }}
      />
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 18%, white)`,
          color,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-light">
          {label}
        </span>
        <span className="font-display text-[48px] font-extrabold leading-none tabular-nums text-text">
          {value.toLocaleString('fr-FR')}
        </span>
        {hint && (
          <span className="italic text-xs text-text-light mt-1">{hint}</span>
        )}
      </div>
    </Card>
  )
}
```

Changements : `<div>` → `<Card>`, `text-[var(--arcade-text-muted)]` → `text-text-light`, `text-[var(--arcade-text)]` → `text-text`. Le `style={{ boxShadow: 'var(--shadow-card)' }}` disparaît (la `<Card>` apporte sa shadow).

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/StatCard.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/StatCard.tsx
git commit -m "refactor(profile): StatCard wraps Card primitive"
```

---

## Task 13: Refactor `XPCard.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/XPCard.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import type { UserProfile } from '../../../api/profile.api'
import { Card, CardTitle } from '../../ui/card'

type Props = { profile: UserProfile }

export function XPCard({ profile }: Props) {
  const isMax = profile.level >= 100
  const xpForLevel = (n: number) => (n - 1) ** 2 * 100
  const xpInLevel = profile.xp - xpForLevel(profile.level)
  const xpNeeded = xpForLevel(profile.level + 1) - xpForLevel(profile.level)
  const percent = isMax ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <CardTitle className="text-sm uppercase tracking-wider">Expérience</CardTitle>
        <span
          className="font-mono text-[11px] font-bold uppercase"
          style={{
            color: isMax ? 'var(--primary)' : 'var(--text-light)',
          }}
        >
          {isMax ? `LV. ${profile.level} · MAX` : `LV. ${profile.level}`}
        </span>
      </div>
      <div className="relative h-[22px] rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6, #ec4899, #f59e0b)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 4s linear infinite',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
          }}
        />
        {/* biome-ignore lint/suspicious/noArrayIndexKey: static decorative segments, no reorder */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="flex-1 border-r border-white/45 last:border-r-0"
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[11px] mt-3">
        <span className="text-text-light">
          {isMax ? '00 / MAX' : `${xpInLevel.toLocaleString('fr-FR')} / ${xpNeeded.toLocaleString('fr-FR')}`}
        </span>
        <span style={{ color: 'var(--primary)' }}>+ Prestige bientôt</span>
      </div>
    </Card>
  )
}
```

Changements clés : `<div>` racine → `<Card className="p-6">` (note : `<Card>` apporte `p-4` par défaut, on override avec `p-6`). `<h3>` → `<CardTitle>`. `bg-[var(--arcade-surface-2)]` → `bg-muted`. `text-[var(--arcade-text-muted)]` → `text-text-light`. `var(--arcade-amber)` → `var(--primary)`.

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/XPCard.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/XPCard.tsx
git commit -m "refactor(profile): XPCard uses Card + CardTitle"
```

---

## Task 14: Refactor `StreakCard.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/StreakCard.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { ChevronRight, Flame, Trophy } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile } from '../../../api/profile.api'
import { StreakSummaryModal } from '../../streak/StreakSummaryModal'
import { Card, CardTitle } from '../../ui/card'
import { isLoggedInToday, weekDays } from './utils'

type Props = {
  profile: UserProfile
  lastLoginAt?: string | null
  isOwnProfile: boolean
}

export function StreakCard({ profile, lastLoginAt, isOwnProfile }: Props) {
  const [open, setOpen] = useState(false)
  const days = weekDays()
  const todayActive = isLoggedInToday(lastLoginAt ?? null)

  const content = (
    <>
      <div className="flex items-baseline justify-between mb-4">
        <CardTitle className="text-sm uppercase tracking-wider">Streak de connexion</CardTitle>
        {isOwnProfile && <ChevronRight size={16} className="text-text-light" />}
      </div>
      <div className="flex items-end gap-8">
        <div>
          <div className="flex items-center gap-2">
            <Flame size={28} color="#fb923c" style={{ filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.5))' }} />
            <span className="font-display text-[64px] font-extrabold leading-none">{profile.streakDays}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">Jour</div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-primary-light" />
            <span className="font-display text-[36px] font-extrabold leading-none">{profile.bestStreak}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">Record</div>
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        {days.map((d) => {
          const active = d.isToday && todayActive
          return (
            <div key={d.dow} className="flex-1 flex flex-col items-center gap-1">
              <span
                className="h-[6px] w-full rounded-full"
                style={{
                  background: active
                    ? 'linear-gradient(90deg, #fbbf24, #fb923c)'
                    : 'var(--muted)',
                  boxShadow: active ? '0 0 8px rgba(251, 146, 60, 0.5)' : undefined,
                }}
              />
              <span className="font-mono text-[10px] text-text-light">{d.label}</span>
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <>
      {isOwnProfile ? (
        <Card asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-left w-full cursor-pointer hover:border-border-dark transition-colors"
          >
            {content}
          </button>
        </Card>
      ) : (
        <Card>{content}</Card>
      )}
      {isOwnProfile && <StreakSummaryModal open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
```

⚠️ **Important** : `Card` n'utilise PAS `Slot`/`asChild` actuellement dans `card.tsx`. Vérifier en lisant le fichier. Si `Card` ne supporte pas `asChild`, l'alternative est de ne pas utiliser `Card` ici et garder un `<button>` raw avec les classes équivalentes à `Card`. Bascule : remplace le bloc `<Card asChild><button …>` par :

```tsx
<button
  type="button"
  onClick={() => setOpen(true)}
  className="rounded-2xl border border-border bg-card text-card-foreground p-4 shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)] text-left w-full cursor-pointer hover:border-border-dark transition-colors"
>
  {content}
</button>
```

(Cela duplique la classe de `Card` mais c'est la seule façon sans modifier `Card`.)

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/StreakCard.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/StreakCard.tsx
git commit -m "refactor(profile): StreakCard uses Card + CardTitle"
```

---

## Task 15: Refactor `SetsProgressionCard.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/SetsProgressionCard.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import type { SetProgression } from '../../../api/profile.api'
import { Card, CardTitle } from '../../ui/card'

type Props = { sets: SetProgression[] }

export function SetsProgressionCard({ sets }: Props) {
  const totalOwned = sets.reduce((acc, s) => acc + s.owned, 0)
  const totalCards = sets.reduce((acc, s) => acc + s.total, 0)

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-5">
        <CardTitle className="text-sm uppercase tracking-wider">Progression par extension</CardTitle>
        <span className="font-mono text-[11px] text-text-light">
          {sets.length} SETS · {totalOwned} / {totalCards}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sets.map((s) => (
          <div
            key={s.id}
            className="relative overflow-hidden rounded-xl p-4 border"
            style={{
              background: `hsl(${s.hue}, 100%, 96%)`,
              borderColor: `hsl(${s.hue}, 60%, 85%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] shrink-0 text-white font-display font-extrabold"
                style={{ background: `hsl(${s.hue}, 70%, 50%)` }}
              >
                {s.short}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-text truncate">{s.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">
                  {s.owned} / {s.total} CARTES
                </div>
              </div>
              <div
                className="font-display text-[28px] font-extrabold leading-none"
                style={{ color: `hsl(${s.hue}, 60%, 28%)` }}
              >
                {Math.round(s.percent)}%
              </div>
            </div>
            <div className="mt-4 h-[6px] rounded-full overflow-hidden" style={{ background: `hsl(${s.hue}, 50%, 92%)` }}>
              <div
                className="h-full"
                style={{
                  width: `${s.percent}%`,
                  background: `linear-gradient(90deg, hsl(${s.hue}, 70%, 60%), hsl(${s.hue}, 70%, 45%))`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/SetsProgressionCard.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/SetsProgressionCard.tsx
git commit -m "refactor(profile): SetsProgressionCard uses Card + CardTitle"
```

---

## Task 16: Refactor `CollectionCTA.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/CollectionCTA.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { Link } from '@tanstack/react-router'

import type { UserProfile, SetProgression } from '../../../api/profile.api'
import { Button } from '../../ui/button'

type Props = {
  profile: UserProfile
  sets: SetProgression[]
  username: string
  isOwnProfile: boolean
}

export function CollectionCTA({ profile, sets, username, isOwnProfile }: Props) {
  const exploredSets = sets.filter((s) => s.owned > 0).length

  return (
    <div
      className="rounded-2xl p-6 border flex items-center justify-between overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #fff7ed, #fee2e2, #ede9fe)',
        borderColor: '#fed7aa',
      }}
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-text-light">
          {isOwnProfile ? 'Ma collection' : `Collection de ${username}`}
        </div>
        <div className="font-display text-[36px] font-extrabold mt-1 text-text">
          {profile.stats.ownedCards} cartes · {exploredSets} sets
        </div>
      </div>
      <Button asChild variant="gradient" size="lg">
        <Link
          to={isOwnProfile ? '/collection' : '/profile/$username/collection'}
          params={isOwnProfile ? undefined : ({ username } as any)}
        >
          {isOwnProfile ? 'Voir ma collection' : 'Explorer'}
        </Link>
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/CollectionCTA.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/CollectionCTA.tsx
git commit -m "refactor(profile): CollectionCTA uses Button variant gradient"
```

---

## Task 17: Refactor `FeaturedCardsFan.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/FeaturedCardsFan.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState } from 'react'

import type { FeaturedCard } from '../../../api/profile.api'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'

type Props = {
  cards: FeaturedCard[]
}

export function FeaturedCardsFan({ cards }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-border text-text-light font-mono text-sm">
        Aucune carte encore — fais ton premier tirage.
      </div>
    )
  }

  return (
    <div className="relative flex justify-center items-end" style={{ minHeight: 280, paddingLeft: 40 }}>
      {cards.map((card, i) => {
        const rotation = (i - 2) * 5
        const offset = Math.abs(i - 2) * 10
        const isHovered = hovered === i
        const isDimmed = hovered !== null && hovered !== i
        return (
          <div
            key={card.id}
            className="w-[170px] transition-all duration-[350ms]"
            style={{
              transform: isHovered
                ? 'translateY(-26px) rotate(0deg) scale(1.06)'
                : `translateY(${offset}px) rotate(${rotation}deg)`,
              transformOrigin: '50% 100%',
              marginLeft: i === 0 ? 0 : -38,
              filter: isDimmed
                ? 'brightness(.65) saturate(.7)'
                : 'drop-shadow(0 14px 24px rgba(27,23,38,.18))',
              transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
              zIndex: isHovered ? 50 : i,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${card.name} — ${card.rarity}`}
          >
            <CardDisplay
              rarity={card.rarity}
              name={card.name}
              setName={card.setName}
              imageUrl={card.imageUrl}
              variant={card.variant}
              interactive={false}
              compact
            />
          </div>
        )
      })}
    </div>
  )
}
```

Changements clés : import de `CardDisplay`, suppression de l'import de `CardArt` et de `ArcadeRarity`/`as ArcadeRarity` (puisque `CardDisplay` accepte `rarity: string`). Le `text-[var(--arcade-text-muted)]` devient `text-text-light`.

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/FeaturedCardsFan.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/FeaturedCardsFan.tsx
git commit -m "refactor(profile): FeaturedCardsFan uses CardDisplay"
```

---

## Task 18: Refactor `FeaturedCardsEditorModal.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState } from 'react'

import { useSetFeaturedCardsMutation } from '../../../queries/useProfile'
import { useUserCollection } from '../../../queries/useCollection'
import { useAuthStore } from '../../../stores/auth.store'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'
import { Button } from '../../ui/button'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup'

type Props = {
  open: boolean
  initialIds: string[]
  onClose: () => void
  onSaved?: () => void
}

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

type OwnedDisplay = {
  id: string
  name: string
  rarity: string
  setName: string
  imageUrl: string | null
  variant: string
}

export function FeaturedCardsEditorModal({ open, initialIds, onClose, onSaved }: Props) {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: collection } = useUserCollection(userId)
  const mutation = useSetFeaturedCardsMutation()
  const [selected, setSelected] = useState<string[]>(initialIds.slice(0, 5))

  const ownedById = new Map<string, OwnedDisplay>()
  for (const uc of collection?.cards ?? []) {
    if (!ownedById.has(uc.card.id)) {
      ownedById.set(uc.card.id, {
        id: uc.card.id,
        name: uc.card.name,
        rarity: uc.card.rarity,
        setName: uc.card.set.name,
        imageUrl: uc.card.imageUrl,
        variant: uc.variant ?? 'NORMAL',
      })
    }
  }
  const owned = Array.from(ownedById.values()).sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity as (typeof RARITY_ORDER)[number]) -
      RARITY_ORDER.indexOf(b.rarity as (typeof RARITY_ORDER)[number]),
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, id]
    })
  }

  const save = async () => {
    await mutation.mutateAsync(selected)
    onSaved?.()
    onClose()
  }

  return (
    <Popup open={open} onOpenChange={(o) => !o && onClose()}>
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle subtitle={`${selected.length} / 5 sélectionnées · clique pour ajouter / retirer`}>
            Cartes vedettes
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {owned.map((c) => {
              const isSelected = selected.includes(c.id)
              const order = selected.indexOf(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`relative text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ opacity: !isSelected && selected.length >= 5 ? 0.4 : 1 }}
                  disabled={!isSelected && selected.length >= 5}
                >
                  <CardDisplay
                    rarity={c.rarity}
                    name={c.name}
                    setName={c.setName}
                    imageUrl={c.imageUrl}
                    variant={c.variant}
                    compact
                    interactive={false}
                  />
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center font-mono">
                      {order + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="gradient" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
```

Changements : `<div className="fixed inset-0…">` raw → `<Popup>` Radix. Le `<CardArt>` placeholder → `<CardDisplay compact interactive={false}>`. Les `var(--arcade-*)` tokens → tokens globaux (`bg-primary`, `text-text-light`, etc.). Le `X` de fermeture vient gratuit du `PopupContent`.

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/FeaturedCardsEditorModal.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/FeaturedCardsEditorModal.tsx
git commit -m "refactor(profile): FeaturedCardsEditorModal uses Popup Radix + Button + CardDisplay"
```

---

## Task 19: Refactor `ArcadeHero.tsx`

**Files:**
- Modify: `front/src/components/profile/arcade/ArcadeHero.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile, FeaturedCard } from '../../../api/profile.api'
import { Button } from '../../ui/button'
import { Card, CardTitle } from '../../ui/card'
import { FeaturedCardsEditorModal } from './FeaturedCardsEditorModal'
import { FeaturedCardsFan } from './FeaturedCardsFan'
import { FoilAvatar } from './FoilAvatar'

type Props = {
  profile: UserProfile
  featuredCards: FeaturedCard[]
  isOwnProfile: boolean
}

export function ArcadeHero({ profile, featuredCards, isOwnProfile }: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  const isMax = profile.level >= 100
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <Card className="rounded-3xl p-8 overflow-visible">
      <div className="grid gap-8" style={{ gridTemplateColumns: '360px 1fr' }}>
        {/* Identity column */}
        <div className="flex flex-col gap-5">
          <FoilAvatar initials={initials} isMax={isMax} />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[.2em] text-primary-light">
              {isMax ? `NIV. MAX · MEMBRE ${joinedYear}` : `NIV. ${profile.level} · MEMBRE ${joinedYear}`}
            </div>
            <h1 className="font-display text-[52px] font-extrabold leading-none text-text mt-1">
              @{profile.username}
            </h1>
            <div className="flex gap-2 mt-3 flex-wrap">
              {isMax ? (
                <span
                  className="font-mono text-[10px] px-2 py-1 rounded-full font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #fde68a, #fbbf24)',
                    color: '#6b3a00',
                  }}
                >
                  LV. MAX
                </span>
              ) : (
                <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-muted">
                  LV. {profile.level}
                </span>
              )}
              <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-muted">
                {profile.stats.ownedCards} cartes
              </span>
            </div>
          </div>
        </div>

        {/* Featured cards column */}
        <div className="relative">
          <div className="flex items-baseline justify-between mb-4">
            <CardTitle className="text-sm uppercase tracking-wider">Cartes vedettes</CardTitle>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-text-light">
                TOP {featuredCards.length} · PAR RARETÉ
              </span>
              {isOwnProfile && (
                <Button variant="pill" size="pill" onClick={() => setEditorOpen(true)}>
                  <Pencil size={12} />
                  Éditer
                </Button>
              )}
            </div>
          </div>
          <FeaturedCardsFan cards={featuredCards} />
        </div>
      </div>

      {isOwnProfile && (
        <FeaturedCardsEditorModal
          open={editorOpen}
          initialIds={featuredCards.map((c) => c.id)}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </Card>
  )
}
```

Changements : `<section>` raw → `<Card className="rounded-3xl p-8 overflow-visible">`. `<h2>` → `<CardTitle>`. `<button onClick>` raw → `<Button variant="pill" size="pill">`. `text-[var(--arcade-amber-light)]` → `text-primary-light`. `bg-[var(--arcade-surface-2)]` → `bg-muted`. `text-[var(--arcade-text-muted)]` → `text-text-light`. `text-[var(--arcade-text)]` → `text-text`.

- [ ] **Step 2: Type-check + lint**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npx biome lint src/components/profile/arcade/ArcadeHero.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeHero.tsx
git commit -m "refactor(profile): ArcadeHero uses Card + CardTitle + Button"
```

---

## Task 20: Delete `cardArt.tsx`

**Files:**
- Delete: `front/src/components/profile/arcade/cardArt.tsx`

- [ ] **Step 1: Confirm no remaining usage**

```bash
grep -rn "cardArt\|CardArt" front/src 2>&1 | head
```

Expected: aucun résultat (les imports ont été retirés en T17 et T18).

- [ ] **Step 2: Delete the file**

```bash
rm front/src/components/profile/arcade/cardArt.tsx
```

- [ ] **Step 3: Build**

```bash
cd front && npm run build 2>&1 | tail -5
```

Expected: build success.

- [ ] **Step 4: Commit**

```bash
git add front/src/components/profile/arcade/cardArt.tsx
git commit -m "refactor(profile): remove cardArt placeholder (replaced by CardDisplay)"
```

---

## Task 21: Delete `ArcadeBackground.tsx`

**Files:**
- Delete: `front/src/components/profile/arcade/ArcadeBackground.tsx`

- [ ] **Step 1: Confirm no remaining usage**

```bash
grep -rn "ArcadeBackground" front/src 2>&1 | head
```

Expected: aucun résultat (l'import a été remplacé par `AuroraGrid` en T10).

- [ ] **Step 2: Delete the file**

```bash
rm front/src/components/profile/arcade/ArcadeBackground.tsx
```

- [ ] **Step 3: Build**

```bash
cd front && npm run build 2>&1 | tail -5
```

Expected: build success.

- [ ] **Step 4: Commit**

```bash
git add front/src/components/profile/arcade/ArcadeBackground.tsx
git commit -m "refactor(profile): remove ArcadeBackground (extracted to AuroraGrid)"
```

---

## Task 22: Clean `utils.ts`

**Files:**
- Modify: `front/src/components/profile/arcade/utils.ts`

- [ ] **Step 1: Remove `hashHue` and `deriveShort`**

Le fichier actuel exporte : `hashHue`, `deriveShort`, `weekDays`, `isLoggedInToday`, `RARITY_COLORS`, `ArcadeRarity`. Garder seulement les 4 derniers. Le fichier devient :

```ts
// front/src/components/profile/arcade/utils.ts

/** Returns the labels and ISO day-of-week for the current week, Monday-first. */
export function weekDays(today = new Date()): Array<{ label: string; isToday: boolean; dow: number }> {
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayDow = (today.getUTCDay() + 6) % 7 // Monday = 0
  return labels.map((label, i) => ({ label, dow: i, isToday: i === todayDow }))
}

/** True if `lastLoginAt` is the same UTC day as today. */
export function isLoggedInToday(lastLoginAt: string | Date | null): boolean {
  if (!lastLoginAt) {
    return false
  }
  const last = new Date(lastLoginAt)
  const now = new Date()
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  )
}

export const RARITY_COLORS = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  EPIC: 'var(--rarity-epic)',
  LEGENDARY: 'var(--rarity-legendary)',
} as const

export type ArcadeRarity = keyof typeof RARITY_COLORS
```

- [ ] **Step 2: Type-check + lint + build**

```bash
cd front && npx tsc -b 2>&1 | head -5
cd front && npm run build 2>&1 | tail -5
```

Expected: pas d'erreur. Si tsc se plaint d'un import de `hashHue` ou `deriveShort` qui n'a pas été nettoyé ailleurs, fixer cet import.

- [ ] **Step 3: Commit**

```bash
git add front/src/components/profile/arcade/utils.ts
git commit -m "refactor(profile): drop unused hashHue and deriveShort helpers"
```

---

## Task 23: Final verification

- [ ] **Step 1: Full lint + build**

```bash
cd front && npm run lint 2>&1 | tail -10
cd front && npm run build 2>&1 | tail -10
```

Expected: build success. Lint peut signaler des warnings existants — ne pas corriger ceux qui ne sont pas dans les fichiers touchés.

- [ ] **Step 2: Search for residual `arcade-theme` / `_arcade` / `cardArt` / `ArcadeBackground`**

```bash
grep -rn "arcade-theme\|_arcade\|cardArt\|ArcadeBackground" front/src 2>&1 | head
```

Expected: aucun résultat.

- [ ] **Step 3: Search for residual `--arcade-*` variables**

```bash
grep -rn "var(--arcade-" front/src 2>&1 | head
```

Expected: aucun résultat (toutes ces vars ont été remplacées par des tokens globaux).

- [ ] **Step 4: Manual checklist (dev server)**

```bash
cd front && npm run dev
```

Visites obligatoires sur `http://localhost:4269` :
- [ ] `/profile/<moi>` — éventail avec `CardDisplay`, modal Radix focus trap + ESC + click-outside, bouton "Éditer" pill, CTA "Voir ma collection" en gradient.
- [ ] `/play` — pas de crash, look basculé vers crème + ambre.
- [ ] `/collection` — pas de crash.
- [ ] `/shop`, `/leaderboard`, `/quests`, `/skills` — pas de crash.
- [ ] `/admin` (en admin) — Cards avec radius 16, shadow plus douce, titres Bricolage Grotesque.
- [ ] `/settings`, `/login` flow — Cards/Buttons OK.
- [ ] `/discord`, `/guide` — pas de classes dark résiduelles, page lisible.
- [ ] DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" — animations infinies coupées.

- [ ] **Step 5: Final commit (si fixes)**

Si quelque chose doit être patché lors de la vérif manuelle :

```bash
git add -A
git commit -m "fix(theme): polish after manual verification"
```

Sinon, passer.

---

## Self-Review Checklist

- [ ] **Spec coverage**
  - Section 1 (Tokens & polices) : T1 (colors), T2 (globals fonts + keyframe), T3 (delete _arcade), T4 (tailwind config), T5 (themeToggle), T6 (dark: variants) ✅
  - Section 2 (Primitives) : T7 (Card), T8 (Button), Popup intact ✅
  - Section 3 (Profil refactor) : T9 (AuroraGrid extract), T10-19 (refactor chaque composant), T20-22 (suppressions + cleanup utils) ✅
  - Section 4 (Edge cases) : T6 (dark: variants), T10 step 4 (--arcade-* → tokens globaux), T23 step 4 (manual checklist) ✅

- [ ] **Pas de placeholders** — chaque step a son code ou commande exacte. ✅

- [ ] **Type consistency** :
  - `CardDisplay` props (rarity, name, setName, imageUrl, variant, compact, interactive) — utilisés identiquement en T17 et T18 ✅
  - `Card` API (className, asChild) — T7 ne supporte pas asChild ; T14 prévoit le fallback en `<button>` raw ✅
  - `Button` variants (`pill`, `gradient`) — définis en T8, utilisés en T11, T16, T18, T19 ✅
  - Tokens globaux (`text-text-light`, `bg-muted`, `border-primary`, etc.) — disponibles après T1 ✅
