# API Documentation — Design Spec

**Date:** 2026-03-23
**Status:** Approved

## Goal

Expose a public OpenAPI 3.1 documentation for the Gachapon API at `/api-docs`, powered by Scalar UI. All routes except `/admin/*` are documented. Authenticated routes show a cookie-based auth scheme with an Authorize button so users can test directly from the doc. Rate limiting is applied globally to protect the API from spam.

---

## Packages

Three new production dependencies (survive `npm prune --omit=dev`):

| Package | Role |
|---|---|
| `@fastify/swagger` | Generates OpenAPI 3.1 spec from Zod schemas |
| `@scalar/fastify-api-reference` | Serves Scalar UI at `/api-docs` |
| `@fastify/rate-limit` | Global rate limiting |

---

## Architecture

### New plugin files

- `back/src/main/interfaces/http/fastify/plugins/swagger.plugin.ts` — OpenAPI config, security scheme
- `back/src/main/interfaces/http/fastify/plugins/scalar.plugin.ts` — Scalar UI at `/api-docs`
- `back/src/main/interfaces/http/fastify/plugins/rate-limit.plugin.ts` — global rate limit

### Modified files

- `plugins/index.ts` — register the three new plugins (rate-limit before routes, swagger + scalar before routes)
- `routes/admin/index.ts` — add `onRoute` hook to hide all admin routes from the spec
- `routes/index.ts` — add a root-scope `onRoute` hook to annotate protected routes with `security`
- `back/src/main/application/config.ts` — add `RATE_LIMIT_MAX` and `RATE_LIMIT_TIME_WINDOW` to both `configSchema` and `envVarNames`:
  ```ts
  // configSchema:
  rateLimitMax: z.string().default('100').transform((v) => Number.parseInt(v, 10)),
  rateLimitTimeWindow: z.string().default('60000').transform((v) => Number.parseInt(v, 10)),
  // envVarNames:
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_TIME_WINDOW',
  ```
- `deploy/dokploy/docker-compose.dokploy.yml` — add `RATE_LIMIT_MAX` and `RATE_LIMIT_TIME_WINDOW` env vars

---

## Rate Limiting

- Plugin: `@fastify/rate-limit`
- Default: **100 requests / 60 seconds per IP**
- Response on exceed: HTTP `429` with `Retry-After` header
- Exempt routes: `GET /`, `/health`, `/api-docs` — the root route and health route are polled by Dokploy/Traefik infrastructure checks (Docker healthcheck is configured on `/health`); exempting both avoids false 429s from infrastructure. `/openapi.json` is **not** exempt (it is large and pollable; a single Scalar page load fetches it once, which is within budget)
- Both axes configurable via env vars:
  - `RATE_LIMIT_MAX` — max requests (default `100`)
  - `RATE_LIMIT_TIME_WINDOW` — window in milliseconds (default `60000`)

---

## OpenAPI Spec

- Version: OpenAPI 3.1
- Served at: `GET /openapi.json`
- Info: title `Gachapon API`, version from `package.json`
- Security schemes — `verifySessionCookie` accepts both a session cookie and an `X-API-Key` header; both are reflected in the spec:

```yaml
securitySchemes:
  cookieAuth:
    type: apiKey
    in: cookie
    name: access_token
  apiKeyAuth:
    type: apiKey
    in: header
    name: X-API-Key
```

Annotated routes use `security: [{ cookieAuth: [] }, { apiKeyAuth: [] }]` (either scheme is sufficient).

### Admin route exclusion

In `routes/admin/index.ts`, an `onRoute` hook sets `hide` at the **route options** level (not inside `schema`):

```ts
fastify.addHook('onRoute', (route) => {
  route.hide = true
})
```

This runs for every route registered within the admin plugin scope, including all sub-routers.

### Auth annotation

Protected routes are spread across ~10 routers (`gacha`, `collection`, `teams`, `upgrades`, `users`, `shop`, `leaderboard`, `api-keys`, `auth/me`, `auth/logout`). Annotating them per-route would be repetitive and error-prone.

**Strategy:** A single `onRoute` hook registered at the root application scope (in `routes/index.ts`) inspects each route's `onRequest` array. If it contains the `fastify.verifySessionCookie` function reference, it injects `security: [{ cookieAuth: [] }]` into the route schema:

```ts
fastify.addHook('onRoute', (route) => {
  const onRequest = Array.isArray(route.onRequest) ? route.onRequest : route.onRequest ? [route.onRequest] : []
  if (onRequest.includes(fastify.verifySessionCookie)) {
    route.schema = { ...route.schema, security: [{ cookieAuth: [] }, { apiKeyAuth: [] }] }
  }
})
```

This is zero-maintenance: any new protected route automatically gets annotated as long as it uses `verifySessionCookie` in its **route options** `onRequest` array.

> **Constraint:** This identity check only detects `verifySessionCookie` when it is passed directly in route options. Routes that inherit it via `fastify.addHook('onRequest', ...)` at plugin scope (e.g., the admin plugin) are NOT detected — which is acceptable because admin routes are already hidden. Any future plugin that scopes `verifySessionCookie` via `addHook` must annotate routes explicitly or set `route.hide = true`.

---

## Scalar UI

- Route: `GET /api-docs`
- References: `/openapi.json`
- Theme: Scalar default
- Authorize button: pre-configured for `cookieAuth` scheme — allows users to set their `access_token` session cookie and test authenticated endpoints directly from the doc
- No authentication required to access `/api-docs`
- **Intentionally public in all environments** (dev and prod) — the API surface is not sensitive and the doc is a feature for integrators

---

## Deployment

No Dockerfile changes required. The three packages are in `dependencies`, so they are included in the production image after `npm prune --omit=dev`.

Two new env vars added to `docker-compose.dokploy.yml`:
- `RATE_LIMIT_MAX` (default `100`)
- `RATE_LIMIT_TIME_WINDOW` (default `60000`, milliseconds)

---

## Out of Scope

- WebSocket routes (`/ws`) — not representable in OpenAPI, excluded by default
- Per-route rate limit overrides — can be added later if needed
- API versioning — out of scope for this iteration
