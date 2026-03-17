# Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken Dockerfiles, rewrite the Docker Compose stack with Traefik labels and Redis, create a Dokploy-specific compose file, and complete the `.env.example` so the Gachapon project can be deployed to production via both Traefik/Docker Compose and Dokploy.

**Architecture:** Two compose variants — `deploy/compose.yaml` for production with Traefik reverse-proxy (external `proxy` network, labels, profiles `backend`/`frontend`/`db`) and `deploy/dokploy/docker-compose.dokploy.yml` for Dokploy CI/CD (no Traefik, Dokploy manages networking). Both share the same Dockerfiles in `back/deploy/` and `front/deploy/` which use the monorepo root as build context.

**Tech Stack:** Docker multi-stage builds (Node 20 + nginx:alpine), Docker Compose v2, Traefik v2 (labels), Dokploy, Redis 7 Alpine, PostgreSQL 16 Alpine.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `back/deploy/Dockerfile` | Modify | Fix `../` COPY paths, remove broken seed cp + apidoc steps |
| `front/deploy/Dockerfile` | Modify | Fix `../` COPY paths, add `VITE_API_URL` ARG, fix nginx stage |
| `deploy/.env.example` | Modify | Add all missing env vars |
| `deploy/compose.yaml` | Rewrite | Production compose with Traefik, Redis, proper profiles |
| `deploy/dokploy/docker-compose.dokploy.yml` | Create | Dokploy compose without Traefik |

---

## Chunk 1: Fix Dockerfiles

### Task 1: Fix `back/deploy/Dockerfile`

**Files:**
- Modify: `back/deploy/Dockerfile`

Three bugs to fix:
1. `COPY ../xxx` — Docker COPY paths are relative to build context (`back/`). The `../` prefix is invalid and will fail at build time.
2. `cp prisma/seed.ts src/seed.ts && cp -r prisma/seed src/seed` — only `prisma/seed.ts` exists, there is no `seed/` directory. `cp -r prisma/seed` will error. Seed is not needed at production runtime anyway (`start:migrate:production` only runs `prisma migrate deploy`).
3. `mkdir -p dist/apidoc` + `COPY --from=app-build /usr/src/app/dist/apidoc ./dist/apidoc` — Gachapon does not generate static API docs (Scalar UI is served dynamically by Fastify). Dead code.

The build output goes to `lib/` (confirmed by `start:migrate:production` script: `node lib/main/index.js`).

- [ ] **Step 1: Replace the full contents of `back/deploy/Dockerfile`**

```dockerfile
ARG NODE_VERSION
ARG MIRROR_URL

# Base system image with specific version of node and npm
FROM ${MIRROR_URL}node:${NODE_VERSION} AS node-npm
ARG NPM_VERSION
RUN npm config set audit=false fund=false loglevel=error omit=dev update-notifier=false
RUN npm i -g npm@${NPM_VERSION}

# Built application image
FROM node-npm AS app-build
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /usr/src/app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --prefer-offline --include=dev --ignore-scripts --loglevel verbose

COPY .swcrc tsconfig.json prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

# Application image with dist
FROM ${MIRROR_URL}node:${NODE_VERSION}-slim AS app
RUN apt-get update -qq && apt-get install -y --no-install-recommends libssl-dev dumb-init

WORKDIR /usr/src/app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node --from=app-build /usr/src/app/node_modules/ ./node_modules
COPY --chown=node:node --from=app-build /usr/src/app/lib ./lib
COPY --chown=node:node --from=app-build /usr/src/app/prisma ./prisma
COPY --chown=node:node prisma.config.ts ./

ENV NODE_ENV production
EXPOSE 3000

CMD ["dumb-init", "npm", "run", "start:migrate:production"]
```

- [ ] **Step 2: Verify no `../` paths remain, no `dist/apidoc`, no `seed/` references**

- [ ] **Step 3: Commit**

```bash
git add back/deploy/Dockerfile
git commit -m "fix: back Dockerfile — remove ../ prefixes, broken seed cp, apidoc steps"
```

---

### Task 2: Fix `front/deploy/Dockerfile`

**Files:**
- Modify: `front/deploy/Dockerfile`

Two issues:
1. All `COPY ../xxx` paths are invalid (same reason as back).
2. The nginx stage had a spurious `COPY --chown=node:node ../package.json package-lock.json ./` — nginx doesn't need `package.json`.

Also add `VITE_API_URL` ARG — the frontend uses this in `src/lib/api.ts` and `src/routes/_authenticated/play.tsx` in addition to `VITE_API_BASE_URL`.

Note: `front/deploy/conf/nginx.conf` is already correct — the Dockerfile references it as `deploy/conf/nginx.conf` relative to the front build context.

- [ ] **Step 1: Replace the full contents of `front/deploy/Dockerfile`**

```dockerfile
ARG NODE_VERSION
ARG MIRROR_URL

# Base system image with specific version of node and npm
FROM ${MIRROR_URL}node:${NODE_VERSION} AS node-npm
ARG NPM_VERSION
RUN npm config set audit=false fund=false loglevel=error omit=dev update-notifier=false
RUN npm i -g npm@${NPM_VERSION}

# Built application image
FROM node-npm AS app-build
WORKDIR /usr/src/app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY deploy/conf/nginx.conf ./
RUN npm ci --prefer-offline --include=dev --ignore-scripts --loglevel verbose
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src
COPY index.html ./
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

# Application image with dist
FROM nginx:alpine AS app

WORKDIR /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=app-build /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=app-build /usr/src/app/dist/ /usr/share/nginx/html/

ENV NODE_ENV production
EXPOSE 80
```

- [ ] **Step 2: Verify no `../` paths remain**

- [ ] **Step 3: Commit**

```bash
git add front/deploy/Dockerfile
git commit -m "fix: front Dockerfile — remove ../ prefixes, add VITE_API_URL arg, fix nginx stage"
```

---

## Chunk 2: Environment Variables

### Task 3: Complete `deploy/.env.example`

**Files:**
- Modify: `deploy/.env.example`

Missing: build-time vars (`NODE_VERSION`, `NPM_VERSION`, `MIRROR_URL`), registry vars, Traefik host vars, `VITE_API_URL`, `VITE_ENVIRONMENT`, backend runtime vars (`HOST`, `PORT`, `LOG_LEVEL`, `NODE_CLUSTER`, `NODE_TLS_REJECT_UNAUTHORIZED`), `POSTGRES_PORT`.

- [ ] **Step 1: Replace `deploy/.env.example` with the complete version**

```dotenv
# ── Build / Registry ──────────────────────────────────────────────────────────
NODE_VERSION=20
NPM_VERSION=10
MIRROR_URL=
APP_IMAGE_NAME=gachapon
CONTAINER_REGISTRY_PREFIX=
VERSION=latest

# ── App URLs ──────────────────────────────────────────────────────────────────
FRONT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Traefik hostnames (production compose only)
TRAEFIK_FRONT_HOST=yourdomain.com
TRAEFIK_BACK_HOST=api.yourdomain.com

# ── Frontend build args ───────────────────────────────────────────────────────
# Both vars are used in the frontend source (VITE_API_BASE_URL in config.constant.ts,
# VITE_API_URL in lib/api.ts and routes)
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production

# ── Backend runtime ───────────────────────────────────────────────────────────
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
NODE_CLUSTER=false
NODE_TLS_REJECT_UNAUTHORIZED=1
NODE_ENV=production

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://gachapon:gachapon@postgres:5432/gachapon
POSTGRES_USER=gachapon
POSTGRES_PASSWORD=gachapon
POSTGRES_DB=gachapon
# External port mapping for postgres (host:container)
POSTGRES_PORT=5432

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── MinIO (external) ──────────────────────────────────────────────────────────
MINIO_ENDPOINT=https://minio.example.com
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=gachapon

# ── JWT (minimum 32 chars) ────────────────────────────────────────────────────
JWT_SECRET=change_me_in_production_at_least_32_chars
JWT_REFRESH_SECRET=change_me_in_production_at_least_32_chars

# ── OAuth ─────────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/oauth/google/callback
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=https://api.yourdomain.com/auth/oauth/discord/callback

# ── Gacha economy ─────────────────────────────────────────────────────────────
TOKEN_REGEN_INTERVAL_HOURS=4
TOKEN_MAX_STOCK=5
PITY_THRESHOLD=100
```

- [ ] **Step 2: Commit**

```bash
git add deploy/.env.example
git commit -m "chore: complete .env.example with all deployment vars"
```

---

## Chunk 3: Production Compose (Traefik)

### Task 4: Rewrite `deploy/compose.yaml`

**Files:**
- Modify: `deploy/compose.yaml`

Full rewrite to match the production Traefik pattern: external `proxy` network, Traefik labels on back/front, `container_name`, image naming with registry prefix, `environment:` keys (not `env_file`), Redis service with healthcheck, proper profiles.

Profile assignments:
- `backend` — back service
- `frontend` — front service
- `db` — postgres + redis

Backend `depends_on` both postgres and redis with `condition: service_healthy`.

- [ ] **Step 1: Rewrite `deploy/compose.yaml`**

```yaml
networks:
  proxy:
    name: proxy
    external: true

services:
  back:
    build:
      context: ../back
      dockerfile: deploy/Dockerfile
      args:
        DATABASE_URL: ${DATABASE_URL}
        NODE_VERSION: ${NODE_VERSION}
        NPM_VERSION: ${NPM_VERSION}
      target: app
    image: "${CONTAINER_REGISTRY_PREFIX}${APP_IMAGE_NAME}-back:${VERSION:-latest}"
    container_name: "${APP_IMAGE_NAME}-back"
    ports:
      - '${PORT}:${PORT}'
    profiles:
      - backend
    healthcheck:
      test: node -e "require('http').get({hostname:'localhost', port:${PORT}, path:'/health', timeout:3000})"
      retries: 3
      timeout: 3s
    environment:
      - CORS_ORIGIN
      - DATABASE_URL
      - DISCORD_CLIENT_ID
      - DISCORD_CLIENT_SECRET
      - DISCORD_REDIRECT_URI
      - FRONT_URL
      - GOOGLE_CLIENT_ID
      - GOOGLE_CLIENT_SECRET
      - GOOGLE_REDIRECT_URI
      - HOST
      - JWT_REFRESH_SECRET
      - JWT_SECRET
      - LOG_LEVEL
      - MINIO_ACCESS_KEY
      - MINIO_BUCKET
      - MINIO_ENDPOINT
      - MINIO_SECRET_KEY
      - NODE_CLUSTER
      - NODE_ENV=production
      - NODE_TLS_REJECT_UNAUTHORIZED
      - PITY_THRESHOLD
      - PORT
      - REDIS_URL
      - TOKEN_MAX_STOCK
      - TOKEN_REGEN_INTERVAL_HOURS
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_IMAGE_NAME}-back.rule=Host(`${TRAEFIK_BACK_HOST}`)"
      - "traefik.http.routers.${APP_IMAGE_NAME}-back.entrypoints=https"
      - "traefik.http.routers.${APP_IMAGE_NAME}-back.tls=true"
      - "traefik.http.routers.${APP_IMAGE_NAME}-back.tls.certresolver=ovh"
      - "traefik.http.services.${APP_IMAGE_NAME}-back.loadbalancer.server.port=${PORT}"
    networks:
      - proxy
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  front:
    build:
      context: ../front
      dockerfile: deploy/Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL}
        VITE_API_URL: ${VITE_API_URL}
        NODE_VERSION: ${NODE_VERSION}
        NPM_VERSION: ${NPM_VERSION}
    image: "${CONTAINER_REGISTRY_PREFIX}${APP_IMAGE_NAME}-front:${VERSION:-latest}"
    container_name: "${APP_IMAGE_NAME}-front"
    profiles:
      - frontend
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=proxy"
      - "traefik.http.routers.${APP_IMAGE_NAME}-front.rule=Host(`${TRAEFIK_FRONT_HOST}`)"
      - "traefik.http.routers.${APP_IMAGE_NAME}-front.entrypoints=https"
      - "traefik.http.routers.${APP_IMAGE_NAME}-front.tls=true"
      - "traefik.http.routers.${APP_IMAGE_NAME}-front.tls.certresolver=ovh"
      - "traefik.http.services.${APP_IMAGE_NAME}-front.loadbalancer.server.port=80"
    networks:
      - proxy
    restart: unless-stopped

  postgres:
    container_name: "${APP_IMAGE_NAME}-postgres"
    image: postgres:16-alpine
    profiles:
      - db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d ${POSTGRES_DB} -U ${POSTGRES_USER}"]
      retries: 3
      timeout: 3s
    networks:
      - proxy
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - postgres:/var/lib/postgresql/data

  redis:
    container_name: "${APP_IMAGE_NAME}-redis"
    image: redis:7-alpine
    profiles:
      - db
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      retries: 3
      timeout: 3s
    networks:
      - proxy
    restart: always
    volumes:
      - redis_data:/data

volumes:
  postgres:
    driver: local
  redis_data:
    driver: local
```

- [ ] **Step 2: Commit**

```bash
git add deploy/compose.yaml
git commit -m "feat: rewrite compose.yaml — Traefik labels, Redis, proper profiles and env vars"
```

---

## Chunk 4: Dokploy Compose

### Task 5: Create `deploy/dokploy/docker-compose.dokploy.yml`

**Files:**
- Create: `deploy/dokploy/docker-compose.dokploy.yml`

Dokploy manages the reverse proxy and networking itself. No `networks:` block, no Traefik labels, no `proxy` external network. The `context` paths are `../../back` and `../../front` because this file sits one level deeper than `deploy/`.

- [ ] **Step 1: Create `deploy/dokploy/docker-compose.dokploy.yml`**

```yaml
services:
  back:
    build:
      context: ../../back
      dockerfile: deploy/Dockerfile
      target: app
      args:
        DATABASE_URL: ${DATABASE_URL}
        NODE_VERSION: ${NODE_VERSION}
        NPM_VERSION: ${NPM_VERSION}
    image: ${APP_IMAGE_NAME}-back:${VERSION:-latest}
    environment:
      - CORS_ORIGIN=${CORS_ORIGIN}
      - DATABASE_URL=${DATABASE_URL}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
      - DISCORD_REDIRECT_URI=${DISCORD_REDIRECT_URI}
      - FRONT_URL=${FRONT_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
      - HOST=${HOST}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=${LOG_LEVEL}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_BUCKET=${MINIO_BUCKET}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - NODE_CLUSTER=${NODE_CLUSTER}
      - NODE_ENV=production
      - NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED}
      - PITY_THRESHOLD=${PITY_THRESHOLD}
      - PORT=${PORT}
      - REDIS_URL=${REDIS_URL}
      - TOKEN_MAX_STOCK=${TOKEN_MAX_STOCK}
      - TOKEN_REGEN_INTERVAL_HOURS=${TOKEN_REGEN_INTERVAL_HOURS}
    healthcheck:
      test: node -e "require('http').get({hostname:'localhost', port:${PORT}, path:'/health', timeout:3000})"
      retries: 3
      timeout: 3s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  front:
    build:
      context: ../../front
      dockerfile: deploy/Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL}
        VITE_API_URL: ${VITE_API_URL}
        NODE_VERSION: ${NODE_VERSION}
        NPM_VERSION: ${NPM_VERSION}
    image: ${APP_IMAGE_NAME}-front:${VERSION:-latest}
    environment:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL}
      - VITE_API_URL=${VITE_API_URL}
      - VITE_ENVIRONMENT=${VITE_ENVIRONMENT}
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d ${POSTGRES_DB} -U ${POSTGRES_USER}"]
      retries: 3
      timeout: 3s

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      retries: 3
      timeout: 3s

volumes:
  postgres:
  redis_data:
```

- [ ] **Step 2: Commit**

```bash
git add deploy/dokploy/docker-compose.dokploy.yml
git commit -m "feat: add dokploy compose — Redis, no Traefik labels, context paths from dokploy subdir"
```

---

## Chunk 5: Manual Verification

### Task 6: Validate compose syntax

- [ ] **Step 1: Validate `deploy/compose.yaml` syntax**

From the repo root:

```bash
cd deploy
cp .env.example .env
# Edit .env: set at minimum APP_IMAGE_NAME=gachapon, NODE_VERSION=20, NPM_VERSION=10
docker compose -f compose.yaml --profile backend --profile frontend --profile db config
```

Expected: Full YAML output with interpolated values, no errors.

- [ ] **Step 2: Validate `deploy/dokploy/docker-compose.dokploy.yml` syntax**

```bash
cd deploy/dokploy
cp ../.env.example .env
docker compose -f docker-compose.dokploy.yml config
```

Expected: Full YAML output, no errors.

- [ ] **Step 3: (Optional) Dry-run back Dockerfile build to confirm no path errors**

```bash
docker build \
  --build-arg NODE_VERSION=20 \
  --build-arg NPM_VERSION=10 \
  --build-arg DATABASE_URL=postgresql://gachapon:gachapon@localhost:5432/gachapon \
  --build-arg MIRROR_URL= \
  -f back/deploy/Dockerfile \
  back/
```

Expected: All stages complete successfully.

- [ ] **Step 4: (Optional) Dry-run front Dockerfile build**

```bash
docker build \
  --build-arg NODE_VERSION=20 \
  --build-arg NPM_VERSION=10 \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg MIRROR_URL= \
  -f front/deploy/Dockerfile \
  front/
```

Expected: Build completes, nginx stage contains built SPA.
