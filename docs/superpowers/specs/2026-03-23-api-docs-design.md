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
- `routes/admin/index.ts` — add `onRoute` hook to set `hide: true` on all admin routes
- `routes/auth/` — add `onRoute` hook in the auth plugin scope to inject `security: [{ cookieAuth: [] }]` on protected routes
- `back/src/main/application/config.ts` — add `RATE_LIMIT_MAX` env var (default `100`)
- `deploy/dokploy/docker-compose.dokploy.yml` — add `RATE_LIMIT_MAX` env var

---

## Rate Limiting

- Plugin: `@fastify/rate-limit`
- Default: **100 requests / minute per IP**
- Response on exceed: HTTP `429` with `Retry-After` header
- Exempt routes: `/health`, `/api-docs`, `/openapi.json`
- Configurable via `RATE_LIMIT_MAX` env var

---

## OpenAPI Spec

- Version: OpenAPI 3.1
- Served at: `GET /openapi.json`
- Info: title `Gachapon API`, version from `package.json`
- Security scheme:

```yaml
securitySchemes:
  cookieAuth:
    type: apiKey
    in: cookie
    name: token
```

### Admin route exclusion

In `routes/admin/index.ts`, an `onRoute` hook hides all child routes from the spec:

```ts
fastify.addHook('onRoute', (route) => {
  route.schema = { ...route.schema, hide: true }
})
```

This is added alongside the existing `verifySessionCookie` and `requireRole` hooks, so no admin route can accidentally appear in the public spec.

### Auth annotation

Routes requiring authentication are annotated with `security: [{ cookieAuth: [] }]` in their schema. This is applied via an `onRoute` hook in the scoped auth plugin (rather than per-route) to avoid repetition.

---

## Scalar UI

- Route: `GET /api-docs`
- References: `/openapi.json`
- Theme: Scalar default
- Authorize button: pre-configured for `cookieAuth` scheme, allowing users to set their session cookie and test authenticated endpoints directly from the doc
- No authentication required to access `/api-docs`

---

## Deployment

No Dockerfile changes required. The three packages are in `dependencies`, so they are included in the production image after `npm prune --omit=dev`.

`RATE_LIMIT_MAX` is added to `docker-compose.dokploy.yml` with a default of `100`.

---

## Out of Scope

- WebSocket routes (`/ws`) — not representable in OpenAPI, excluded by default
- Per-route rate limit overrides — can be added later if needed
- API versioning — out of scope for this iteration
