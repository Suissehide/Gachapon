# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

```
back/   Fastify 5 + Prisma 7 + PostgreSQL + Redis + MinIO (TypeScript)
front/  React 19 + Vite + TanStack Router/Query + Zustand + react-three-fiber
deploy/ Docker Compose (compose.yaml for Traefik, dokploy/ for Dokploy PaaS)
docs/   Plans & specs (gitignored)
```

Backend and frontend are independent npm projects — there is no root `package.json`. Always `cd back` or `cd front` before running scripts.

## Common commands

### Backend (`cd back`)

Scripts go through [Wireit](https://github.com/google/wireit), which caches based on file globs. If a build seems stuck on a "no work to do" cache hit, `npm run clean:wireit`.

| | |
|---|---|
| `npm run dev` | Dev server with hot reload (`node -r @swc-node/register`) on **port 3001**, watches `src/main/**/*.ts` |
| `npm run build` | Type-check then SWC transpile to `lib/` |
| `npm test` | Run all Jest tests (unit + e2e), `--runInBand` |
| `npm run test:unit` | Unit tests only (pure-domain logic in `src/test/unit/`) |
| `npm run test:e2e` | E2E tests (hit a real Postgres — see below) |
| `npm run lint` | Biome lint on `src/main` |
| `npm run validate` | depcheck + ncu + build + lint + cover (CI-equivalent) |
| `npm run prisma:migrate:dev` | Create/apply migrations against dev DB |
| `npm run prisma:migrate:dev:test` | Same against `.env.test` DB |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run prisma:studio` | Visual DB browser |

Run a single Jest test file: `npx jest -c src/test/jest.config.ts path/to/file.test.ts`. Add `-t "name fragment"` to filter by test name.

**E2E tests require a running Postgres** with a `gachapon_test` database reachable via the `DATABASE_URL` in `back/.env.test`. `globalSetup.ts` runs `prisma migrate deploy` and `TRUNCATE` on every run — there's no Docker spin-up inside the test runner. Spin up Postgres beforehand with `cd deploy && docker compose --profile db up -d` (needs `docker network create proxy` once — the compose file declares `proxy` as external), then `deploy/create-test-db.sh` creates the test DB.

### Frontend (`cd front`)

| | |
|---|---|
| `npm run dev` | Vite dev server on **port 4269** (not the 5173 Vite default) |
| `npm run build` | `tsc -b && vite build`, followed by `scripts/prerender-seo.mjs` |
| `npm run lint` | Biome lint on `src` |

Frontend has no test runner configured.

### Pre-commit

A single root hook (`.husky/pre-commit`, activated via `core.hooksPath` by the `prepare` script of either package on `npm install`) runs Biome **on the staged files only** — the codebase has pre-existing lint errors, so a full-package lint would block every commit. `back/` staged additionally runs the unit tests (no e2e, no DB needed). E2E tests run in CI / `npm run validate` only.

## Workflow

- **Before writing any frontend UI**, check `front/src/components/ui/` first (see the UI toolkit section below). Never hand-roll a button, modal, dropdown, toast, or form control.
- **Run `npm run lint` (Biome) in the package you touched** before considering a change done. Biome auto-fixes most style issues: `npx biome check --write src`.
- **After editing `back/prisma/schema.prisma`**: create a migration with `npm run prisma:migrate:dev` (never hand-write SQL files into `prisma/migrations/`), then `npm run prisma:generate` if types look stale.
- **When adding a backend service/domain/repo**, update **both** `types/application/ioc.ts` and `awilix-ioc-container.ts` in the same change.
- **New API surface** = route (`interfaces/http/fastify/routes/`) + Zod schema + domain method + (front) `src/api/*.api.ts` wrapper + `src/queries/use*.ts` hook. Keep all layers consistent rather than shortcutting one.

## Backend architecture

The backend follows a layered DI architecture with **Awilix** wiring everything in one place.

```
src/main/
  application/   loadConfig + Awilix IoC bootstrap + startApp
  domain/        Pure business logic, one folder per bounded context
                 (gacha, economy, scoring, skills, collection, streak,
                  rewards, team, user, auth, shop, daily-shop)
  infra/         Adapters: orm/, auth/, config/, redis/, storage/, mail/, http/, logger/
  interfaces/    Inbound: http/fastify/{routes,plugins,schemas,errors}/ + ws/ws-manager
  types/         Mirrors src/main/ — all interfaces live here, not next to impls
```

**IoC container** — `application/ioc/awilix/awilix-ioc-container.ts` registers every class as a singleton. Domains and repos receive their dependencies by destructuring the typed `IocContainer` cradle in their constructor:

```ts
constructor({ postgresOrm, userRepository, configService }: IocContainer) { … }
```

The container type lives in `types/application/ioc.ts` — **adding a new service means adding it both there and in `awilix-ioc-container.ts`**. Fastify gets the container via `fastify.iocContainer` (set on the instance, see `fastify-http-server.ts`), and route handlers destructure from there.

**Request flow**: `interfaces/http/fastify/routes/<feature>/index.ts` → calls `domain/<feature>/<feature>.domain.ts` → which uses one or more `infra/orm/repositories/*.repository.ts`. Routes use `fastify-type-provider-zod` for I/O validation. Auth is gated by `onRequest: [fastify.verifySessionCookie]` (see `plugins/jwt.plugin.ts`) — that decorator accepts either an `X-API-Key` header **or** the `access_token` cookie.

**Errors**: throw `@hapi/boom` errors from domains/repos. The Fastify error handler in `interfaces/http/fastify/errors/` normalizes Prisma, Fastify, and Boom errors into HTTP responses.

**Transactions**: `postgresOrm.executeWithTransactionClient(fn, { isolationLevel: 'Serializable', … })` for write paths that race (e.g., gacha pulls). Domains retry on Prisma `P2034` serialization errors — `gacha.domain.ts` is the canonical example.

**Prisma client is generated to `src/generated/`** (non-default), referenced as `../../../generated/client`. After editing `prisma/schema.prisma`, run `npm run prisma:generate` (or it runs automatically as a wireit dependency of `build:check-typedefs`). Prisma is wrapped with a `normalizerExtension` that lowercases emails on every query — don't bypass it.

**WebSocket** — `interfaces/ws/ws-manager.ts` is a module-level singleton (`wsManager`), not in the IoC container. Routes call `wsManager.notify(userId, …)` for per-user pushes and `wsManager.broadcast(…)` for the live feed. WS connections are registered via `routes/ws`.

**Config** — `application/config.ts` reads env via Zod. `back/.env` and `back/.env.local` are loaded relative to `src/main/base-dir`. **The deploy/docker world uses `deploy/.env`** (separate file, consumed by `docker compose`). Don't confuse them.

**Dynamic config** — All economy tunables (token regen, pity, dust rates, variant rates, XP curve, card costs, combat costs) live in the `GlobalConfig` DB table and are read via `configService.getMany(...)` rather than env vars. The single source of defaults is `DEFAULTS` in `infra/config/config.service.ts` (create-only bootstrap fills the table at startup — there is no seed file for it). Variant rates are in **percentage points** (3 = 3%). The full set is exposed to the front via public `GET /economy/config`, consumed by `useEconomyConfig()` — never hardcode economy formulas or values in the front.

## Frontend architecture

Routing is **TanStack Router with file-based + autogenerated routes**:

```
src/routes/
  __root.tsx                root layout, loads user from auth store
  _authenticated.tsx        guard that redirects unauth'd users
  _authenticated/*.tsx      member-only pages (play, collection, shop, …)
  _admin.tsx                guard for SUPER_ADMIN
  _admin/admin.*.tsx        admin pages
  index.tsx, about.tsx, …   public pages
```

`routeTree.gen.ts` is generated by `@tanstack/router-plugin/vite` — **don't edit it by hand**.

Data layer:
- `src/api/*.ts` — thin `fetch` wrappers per resource, all going through `src/api/fetchWithAuth.ts` (handles 401 → silent refresh → retry).
- `src/queries/use*.ts` — React Query hooks built on top of the api layer. Components consume these, never `fetch` directly.
- `src/stores/` — Zustand stores for client-only state (`auth.store`, `authDialog.store`, `levelUp.store`).

3D / animation lives in `src/components/machine/`. Machines are registered in `machineRegistry.ts` — each exposes a `MachineHandle` ref with `startAnimation()`. Currently: `none`, `gashapon`, `claw`. The play page picks a machine, plays the animation, then reveals the card via `reveal/RevealCanvases.tsx` (rarity-specific shaders in `rarityConfig.ts` / `renderers.ts`).

SEO postbuild — `scripts/prerender-seo.mjs` rewrites per-route `<title>`/`<meta>` into static `dist/<route>/index.html` files after `vite build`. The React app is **not** rendered headlessly; only metadata is pre-baked. Routes that need SEO must be declared in `seo-routes.mjs`.

## Frontend UI toolkit — reuse `front/src/components/ui/`

**Always build UI from these primitives.** If a primitive is missing a variant or prop, extend the primitive (add a CVA variant) rather than rolling a one-off. If a recurring need has no primitive yet, add one here so the site stays uniform.

| Primitive | Exports & key API |
|---|---|
| `button.tsx` | `Button` — `variant`: default·destructive·outline·secondary·ghost·link·gradient·pill·…, `size`: default·sm·lg·icon·icon-sm·pill, `asChild` (Radix Slot) |
| `input.tsx` | `Input`, `TextArea`, `Select` (Radix, `options[]`/`clearable`), `Checkbox` |
| `card.tsx` | `Card`, `CardHeader/Footer/Title/Description/Content` |
| `popup.tsx` | `Popup` — centered modal (Radix Dialog), `size`: default·lg·xl; `PopupTitle` takes `icon`/`subtitle` |
| `sheet.tsx` | `Sheet` — slide-in panel, `side`: top·bottom·left·right (default right) |
| `popover.tsx` | `PopoverRoot/Trigger/Content/Anchor/Close/Arrow` (Radix) |
| `dropdownMenu.tsx` | Styled Radix DropdownMenu parts (`DropdownMenuCustomContent`, `…Item`, `…CheckboxItem`, …) — compose with raw `DropdownMenu.Root/Trigger` |
| `dropdownFilter.tsx` | `DropdownFilter` (default export) — filter menu: `filters[] {id,label,checked,icon,colorClass}`, `onFilterChange`, `onClear` |
| `segmentedControl.tsx` | `SegmentedControl<T>` — generic tabs: `options[]`, `value`, `onChange`, `stretch` |
| `multiSelect.tsx` | `MultiSelect` — searchable multi-pick: `options[]`, `value[]`, `onChange`, `maxSelected` |
| `switch.tsx` / `label.tsx` | `Switch` (Radix), `Label` |
| `datePicker.tsx` / `timePicker.tsx` | `DatePicker` / `TimePicker` — MUI X wrapped in Tailwind styling (24h clock) |
| `toast.tsx` / `toaster.tsx` | Radix Toast primitives + `Toaster` (mounted once at app root) — don't use directly, go through `useToast()` |
| `fieldInfo.tsx` / `formField.tsx` | `FieldInfo` (TanStack Form errors), `FormField` (layout wrapper) — always via the TanStack Form factory below |

**Forms — TanStack Form via the app factory.** Use `useAppForm` from `src/hooks/formConfig.tsx` (built with `createFormHook`); it pre-registers field components (Input, Password, Select, Number, DatePicker, TimePicker, Checkbox, TextArea, ColorPicker, Toggle, FileInput) and a `SubmitButton`. Field components render `<FieldInfo field={field} />` for errors. Do **not** introduce react-hook-form. Example consumer: `components/admin/cards/CreateCardSheet.tsx`.

**Toasts.** `const { toast } = useToast()` (from `src/hooks/useToast.ts`, Zustand-backed) then `toast({ title, message, severity })` — severities from `constants/ui.constant.ts` `TOAST_SEVERITY`. Typically called in React Query mutation callbacks (see `src/queries/useSkills.ts`).

**Icons**: `lucide-react` everywhere, sized with `className="h-4 w-4"`. **Dates**: `dayjs` (+UTC) with helpers in `src/libs/utils.ts`. **UI copy is in French** — no i18n library; match existing tone/wording.

### Styling

- **Tailwind CSS v4, CSS-first config** — no `tailwind.config.js`. The `@theme` block lives in `src/styles/_globals.css` (single CSS entry, imported in `main.tsx`). No SCSS, no CSS Modules, no BEM.
- **Design tokens** are CSS custom properties in `src/styles/_colors.css` (`--primary` amber, `--background`, `--card`, `--text`, `--border`, rarity colors `--rarity-*`, shadows) mapped to Tailwind utilities in `_globals.css` — so use `bg-card`, `text-primary`, `border-border`, `text-text-light`, etc. **Never hardcode hex values or raw `bg-white`/`gray-*` classes** for themed surfaces; add a token if one is missing.
- **`cn()` from `src/libs/utils.ts`** (twMerge + clsx) for all conditional/merged classNames; **CVA** (`class-variance-authority`) for component variants — follow `button.tsx` as the template.
- Radius scale lives in `src/styles/_variables.css` (`--radius-sm…2xl`).

## Conventions

- **Biome** is the linter/formatter for both packages (single quotes, no semicolons, space indent; config in `back/biome.json` / `front/biome.json`). Backend Biome rules enforce no barrel files, no re-export-all, no unused vars/imports, mandatory `await` on async fns.
- **Filenames**: backend uses `kebab-case.ts`; frontend mixes `PascalCase.tsx` for components and `camelCase.ts` for utilities/api/store files. UI primitives import with explicit extension (`from '../ui/button.tsx'`).
- **Generated code is not linted**: `back/src/generated/**` and `back/src/test/**` are excluded from Biome.
- **Domain logic stays pure**. Side effects (DB, HTTP, time) come from injected dependencies — that's why the unit tests in `src/test/unit/` can run without any infrastructure while e2e tests boot the full app via `helpers/build-test-app.ts`.
- **Server state via React Query, client state via Zustand.** Don't mirror server data into Zustand stores; invalidate/refetch queries instead.

## Things that bite

- The frontend dev port is **4269**, not the Vite default. The backend dev port is **3001**, not the `3000` fallback baked into `config.ts` — `vite.config.ts` proxies `/auth` to `localhost:3001`, so `back/.env` must set `PORT=3001` or OAuth callbacks break.
- Frontend uses `VITE_API_URL` (build-time, baked into the bundle) — changing it requires a rebuild, not just a restart.
- `back/.env*` and `deploy/.env*` are different files for different worlds. Migrating a config var means touching both if it's needed in prod.
- **npm 11+ blocks lifecycle scripts by default.** A bare `npm install` leaves Prisma without its engines and bcrypt/esbuild/swc without native binaries — everything fails at runtime, not at install. Unblock once per package: `npm install-scripts approve @prisma/engines @swc/core bcrypt esbuild prisma unrs-resolver` in `back/`, `npm install-scripts approve esbuild @swc/core` in `front/`.
- `deploy/compose.yaml` declares the `proxy` network as **external** — `docker compose up` fails until `docker network create proxy` has been run once.
- Mailpit sits behind `--profile dev`, not `--profile db`. Bring up both (`--profile db --profile dev`) or every transactional email (verification, password reset) fails against a dead SMTP.
- **No MinIO service in `deploy/compose.yaml`.** Seeded cards carry object keys (`staging/cards/humans/<id>.png`, see `prisma/seed/cards.ts:8`) resolved against `MINIO_ENDPOINT`, so card art 404s locally. `MinioClient` is lazy — nothing fails at boot, images just don't render.
- `prisma migrate status` reports `0 applied, 0 pending` under Prisma 7 + `prisma.config.ts` even when every migration is applied. Check the actual tables rather than trusting it.
- When adding a new domain/repo, you must update **both** `types/application/ioc.ts` and `awilix-ioc-container.ts`, or DI resolution will throw at startup.
- The pre-commit hook lives at the repo root (`.husky/pre-commit`) and only fires for packages with staged files. If it doesn't run at all, `core.hooksPath` isn't set — run `npm install` in `back/` or `front/` (their `prepare` script wires it).
- `docs/` is gitignored (see `.gitignore`); don't expect to commit specs there.
