# Gachapon — Plan 1: Foundation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le projet Gachapon propre sur la base MediSync — nettoyage, schéma Prisma complet, infrastructure Redis/MinIO, et système d'authentification complet (email/password + OAuth Google/Discord + JWT + API Keys).

**Architecture:** Backend Fastify avec architecture DDD existante (domain → infra → interfaces). Config via `loadConfig()` avec camelCase keys. IoC via `diContainer.register(key, resolver)`. Refresh tokens en Redis. API Keys en DB. Frontend React avec TanStack Router, Zustand.

**Tech Stack:** Fastify 5, Prisma 7, PostgreSQL, Redis (ioredis v5+ avec types intégrés), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, jsonwebtoken, bcrypt, Zod, React 19, TanStack Router, Zustand, TailwindCSS v4.

**Convention config existante:** Les env vars `SCREAMING_SNAKE_CASE` sont lues via `pickFromDict` + `toCamelCase` → keys camelCase dans le schéma Zod. Ex : `DATABASE_URL` → `databaseUrl`. Toute nouvelle config suit ce pattern.

---

## Chunk 1: Nettoyage projet & Schéma Prisma

### Task 1: Nettoyage MediSync → Gachapon

**Files:**
- Modify: `README.md`
- Modify: `back/package.json`
- Modify: `front/package.json`
- Create: `.gitignore` (racine)

- [ ] **Step 1: Mettre à jour les noms de package**

Dans `back/package.json`, changer `"name": "app-backend"` → `"name": "gachapon-backend"`.
Dans `front/package.json`, changer `"name": "app-frontend"` → `"name": "gachapon-frontend"`.

- [ ] **Step 2: Créer .gitignore à la racine**

```
node_modules/
.env
.env.local
.superpowers/
dist/
lib/
```

- [ ] **Step 3: Mettre à jour le README**

Remplacer `README.md` :

```markdown
# Gachapon

Application web de Gachapon multijoueur. Joue à la machine à pince 3D et construis ta collection.

## Stack

- **Frontend** : React 19, Vite, TailwindCSS v4, TanStack Router/Query, React Three Fiber
- **Backend** : Fastify 5, Prisma 7, PostgreSQL, Redis, TypeScript
- **Déploiement** : Docker Compose + Dokploy

## Démarrage rapide

```shell
cd deploy && docker compose --profile db up -d
cd back && npm run dev
cd front && npm run dev
```
```

- [ ] **Step 4: Commit**

```bash
git add README.md back/package.json front/package.json .gitignore
git commit -m "chore: rename project MediSync → Gachapon"
```

---

### Task 2: Réécriture du schéma Prisma

**Files:**
- Modify: `back/prisma/schema.prisma`

- [ ] **Step 1: Réécrire schema.prisma**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated"
}

enum GlobalRole {
  USER
  SUPER_ADMIN
}

enum OAuthProvider {
  GOOGLE
  DISCORD
}

enum TeamMemberRole {
  MEMBER
  ADMIN
  OWNER
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
}

enum CardRarity {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}

enum CardVariant {
  BRILLIANT
  HOLOGRAPHIC
}

enum ShopItemType {
  TOKEN_PACK
  BOOST
  COSMETIC
}

model User {
  id            String     @id @default(uuid())
  username      String     @unique
  email         String     @unique
  passwordHash  String?
  avatar        String?
  banner        String?
  role          GlobalRole @default(USER)
  tokens        Int        @default(0)
  dust          Int        @default(0)
  lastTokenAt   DateTime?
  xp            Int        @default(0)
  level         Int        @default(1)
  pityCurrent   Int        @default(0)
  streakDays    Int        @default(0)
  lastLoginAt   DateTime?
  createdAt     DateTime   @default(now())

  oauthAccounts       OAuthAccount[]
  apiKeys             ApiKey[]
  ownedTeams          Team[]            @relation("TeamOwner")
  teamMemberships     TeamMember[]
  sentInvitations     Invitation[]      @relation("InvitedByUser")
  receivedInvitations Invitation[]      @relation("InvitedUser")
  userCards           UserCard[]
  gachaPulls          GachaPull[]
  purchases           Purchase[]
  achievements        UserAchievement[]
  userQuests          UserQuest[]
}

model OAuthAccount {
  id                String        @id @default(uuid())
  provider          OAuthProvider
  providerAccountId String
  userId            String
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model ApiKey {
  id         String    @id @default(uuid())
  key        String    @unique
  name       String
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
}

model Team {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  description String?
  avatar      String?
  ownerId     String
  owner       User       @relation("TeamOwner", fields: [ownerId], references: [id])
  createdAt   DateTime   @default(now())

  members     TeamMember[]
  invitations Invitation[]
}

model TeamMember {
  id       String         @id @default(uuid())
  teamId   String
  team     Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId   String
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  role     TeamMemberRole @default(MEMBER)
  joinedAt DateTime       @default(now())

  @@unique([teamId, userId])
}

model Invitation {
  id            String           @id @default(uuid())
  teamId        String
  team          Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  invitedEmail  String?
  invitedUserId String?
  invitedUser   User?            @relation("InvitedUser", fields: [invitedUserId], references: [id])
  invitedById   String?
  invitedBy     User?            @relation("InvitedByUser", fields: [invitedById], references: [id])
  token         String           @unique @default(uuid())
  status        InvitationStatus @default(PENDING)
  expiresAt     DateTime
  createdAt     DateTime         @default(now())
}

model CardSet {
  id          String   @id @default(uuid())
  name        String
  description String?
  coverImage  String?
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())

  cards Card[]
}

model Card {
  id         String      @id @default(uuid())
  setId      String
  set        CardSet     @relation(fields: [setId], references: [id], onDelete: Cascade)
  name       String
  imageUrl   String
  rarity     CardRarity
  variant    CardVariant?
  dropWeight Float       @default(1.0)
  createdAt  DateTime    @default(now())

  userCards  UserCard[]
  gachaPulls GachaPull[]
}

model UserCard {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId     String
  card       Card     @relation(fields: [cardId], references: [id])
  quantity   Int      @default(1)
  obtainedAt DateTime @default(now())

  @@unique([userId, cardId])
}

model GachaPull {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId       String
  card         Card     @relation(fields: [cardId], references: [id])
  wasDuplicate Boolean  @default(false)
  dustEarned   Int      @default(0)
  pulledAt     DateTime @default(now())

  @@index([userId])
  @@index([pulledAt])
}

model ShopItem {
  id          String       @id @default(uuid())
  name        String
  description String
  type        ShopItemType
  dustCost    Int
  value       Json
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())

  purchases Purchase[]
}

model Purchase {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  shopItemId  String
  shopItem    ShopItem @relation(fields: [shopItemId], references: [id])
  dustSpent   Int
  purchasedAt DateTime @default(now())

  @@index([purchasedAt])
}

model Achievement {
  id           String @id @default(uuid())
  key          String @unique
  name         String
  description  String
  rewardTokens Int    @default(0)
  rewardDust   Int    @default(0)

  userAchievements UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  unlockedAt    DateTime    @default(now())

  @@unique([userId, achievementId])
}

model Quest {
  id           String  @id @default(uuid())
  key          String  @unique
  name         String
  description  String
  criterion    Json
  rewardTokens Int     @default(0)
  rewardDust   Int     @default(0)
  isActive     Boolean @default(true)

  userQuests UserQuest[]
}

model UserQuest {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  questId     String
  quest       Quest     @relation(fields: [questId], references: [id])
  date        DateTime  @db.Date
  progress    Int       @default(0)
  completed   Boolean   @default(false)
  completedAt DateTime?

  @@unique([userId, questId, date])
}
```

- [ ] **Step 2: Générer le client Prisma**

```bash
cd back && npm run prisma:generate
```
Expected : `✔ Generated Prisma Client` sans erreur.

- [ ] **Step 3: Créer la migration initiale**

```bash
cd back && npm run prisma:migrate:create -- --name init_gachapon_schema
```

- [ ] **Step 4: Commit**

```bash
git add back/prisma/
git commit -m "feat(db): complete Gachapon Prisma schema"
```

---

### Task 3: Nettoyer le code MediSync et reconstruire l'IoC de base

**Files:**
- Delete: `back/src/main/domain/auth.domain.ts`
- Delete: `back/src/main/domain/user.domain.ts`
- Delete: `back/src/main/infra/orm/repositories/user.repository.ts`
- Delete: `back/src/main/types/domain/auth.domain.interface.ts`
- Delete: `back/src/main/types/domain/user.domain.interface.ts`
- Delete: `back/src/main/types/infra/orm/repositories/user.repository.interface.ts`
- Delete: `back/src/main/interfaces/http/fastify/routes/user.ts`
- Delete: `back/src/main/interfaces/http/fastify/routes/auth/` (dossier entier)
- Delete: `back/src/main/interfaces/http/fastify/schemas/auth.schema.ts`
- Delete: `back/src/main/interfaces/http/fastify/schemas/user.schema.ts`
- Modify: `back/src/main/application/config.ts`
- Modify: `back/src/main/types/application/config.ts` (si existe)
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/plugins/index.ts`

- [ ] **Step 1: Supprimer les fichiers obsolètes**

```bash
cd back
rm -f src/main/domain/auth.domain.ts
rm -f src/main/domain/user.domain.ts
rm -f src/main/infra/orm/repositories/user.repository.ts
rm -f src/main/types/domain/auth.domain.interface.ts
rm -f src/main/types/domain/user.domain.interface.ts
rm -f src/main/types/infra/orm/repositories/user.repository.interface.ts
rm -f src/main/interfaces/http/fastify/routes/user.ts
rm -rf src/main/interfaces/http/fastify/routes/auth
rm -f src/main/interfaces/http/fastify/schemas/auth.schema.ts
rm -f src/main/interfaces/http/fastify/schemas/user.schema.ts
```

- [ ] **Step 2: Nettoyer config.ts — remplacer par la version Gachapon**

Remplacer intégralement `back/src/main/application/config.ts` :

```typescript
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { config as configDotenv } from 'dotenv'
import { z } from 'zod/v4'

import baseDir from '../base-dir'
import type { ConfigEnvVars } from '../types/application/config'
import { pickFromDict, toCamelCase } from '../utils/helper'

const isDevelopment = process.env.NODE_ENV === 'development'
const isTestRunning = process.env.JEST_RUNNING === 'true'
const envLocalPath = join(baseDir, '.env.local')
const envLocalExists = existsSync(envLocalPath)
if (envLocalExists) {
  configDotenv({ debug: isDevelopment, encoding: 'utf8', path: envLocalPath })
}
configDotenv({ debug: isDevelopment, encoding: 'utf8', path: join(baseDir, '.env') })

const configSchema = z.object({
  baseDir: z.string(),
  isDevelopment: z.boolean(),
  isTestRunning: z.boolean().default(false),

  host: z.string().optional(),
  port: z.string().default('3000').transform((v) => Number.parseInt(v, 10)),
  corsOrigin: z.string().optional(),
  frontUrl: z.string().default('http://localhost:5173'),
  logLevel: z.string().default('info'),

  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379'),

  minioEndpoint: z.string().default('http://localhost:9000'),
  minioAccessKey: z.string().default('minioadmin'),
  minioSecretKey: z.string().default('minioadmin'),
  minioBucket: z.string().default('gachapon'),

  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  jwtRefreshSecret: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),

  googleClientId: z.string().default(''),
  googleClientSecret: z.string().default(''),
  googleRedirectUri: z.string().default('http://localhost:3000/auth/oauth/google/callback'),

  discordClientId: z.string().default(''),
  discordClientSecret: z.string().default(''),
  discordRedirectUri: z.string().default('http://localhost:3000/auth/oauth/discord/callback'),

  tokenRegenIntervalHours: z.string().default('4').transform((v) => Number.parseInt(v, 10)),
})

export type Config = z.infer<typeof configSchema>

const envVarNames = [
  'HOST', 'PORT', 'CORS_ORIGIN', 'FRONT_URL', 'LOG_LEVEL',
  'DATABASE_URL', 'REDIS_URL',
  'MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET',
  'JWT_SECRET', 'JWT_REFRESH_SECRET',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
  'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI',
  'TOKEN_REGEN_INTERVAL_HOURS',
]

const loadConfig = () => {
  const envConfig = pickFromDict<ConfigEnvVars>(process.env, envVarNames, toCamelCase)
  const configData = { ...envConfig, baseDir, isDevelopment, isTestRunning }
  return configSchema.parse(configData)
}

export { loadConfig, configSchema }
```

Si `back/src/main/types/application/config.ts` existe, y supprimer les références aux anciens champs MediSync (`jwtExpiresIn`, `jwtRefreshExpiresIn`, `cookieSecret`, `mockServerPort`) et laisser juste `export type ConfigEnvVars = Record<string, string>`.

- [ ] **Step 3: Réécrire awilix-ioc-container.ts (version de base sans auth)**

Remplacer intégralement :

```typescript
import { type Cradle, diContainer } from '@fastify/awilix'
import { type AwilixContainer, asClass, asValue } from 'awilix'
import type { Resolver } from 'awilix/lib/resolvers'
import { HttpClient } from '../../../infra/http/http-client'
import { PinoLogger } from '../../../infra/logger/pino/pino-logger'
import { PostgresOrm } from '../../../infra/orm/postgres-client'
import { FastifyHttpServer } from '../../../interfaces/http/fastify/fastify-http-server'
import type { Config } from '../../../types/application/config'
import type { IocContainer } from '../../../types/application/ioc'
import { ErrorHandler } from '../../../utils/error-handler'
import { recordToString } from '../../../utils/helper'

declare module '@fastify/awilix' {
  interface Cradle extends IocContainer {}
}

class AwilixIocContainer {
  get instances() {
    return diContainer.cradle
  }

  constructor(config: Config) {
    this.#reg('config', asValue(config))
    const container = this.#reg('logger', asClass(PinoLogger).singleton())
    const logger = container.resolve('logger')
    logger.debug('Initializing IoC container…')
    logger.debug(`Loaded config:\n\t${recordToString(config)}`)
    this.#reg('postgresOrm', asClass(PostgresOrm).singleton())
    this.#reg('httpServer', asClass(FastifyHttpServer).singleton())
    this.#reg('httpClient', asClass(HttpClient).singleton())
    this.#reg('errorHandler', asClass(ErrorHandler).singleton())
    logger.info('IoC container initialized.')
  }

  #reg<T>(key: keyof IocContainer, resolver: Resolver<T>): AwilixContainer<Cradle> {
    return diContainer.register(key as string, resolver)
  }
}

export { AwilixIocContainer }
```

- [ ] **Step 4: Réécrire types/application/ioc.ts (version de base)**

```typescript
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { HttpClientInterface } from '../infra/http/http-client'
import type { HttpServer } from '../interfaces/http/server'
import type { ErrorHandlerInterface } from '../utils/error-handler'
import type { Logger } from '../utils/logger'
import type { Config } from './config'

export interface IocContainer {
  readonly config: Config
  readonly httpServer: HttpServer
  readonly httpClient: HttpClientInterface
  readonly logger: Logger
  readonly errorHandler: ErrorHandlerInterface
  readonly postgresOrm: PostgresOrm
}
```

- [ ] **Step 5: Route placeholder pour compiler**

Remplacer `back/src/main/interfaces/http/fastify/routes/index.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', async () => ({ name: 'Gachapon API', status: 'running', version: '1.0.0' }))
}
```

- [ ] **Step 6: Mettre à jour plugins/index.ts**

La nouvelle config supprime `cookieSecret` (la valeur était optionnelle avant). Supprimer les gardes conditionnels dans `back/src/main/interfaces/http/fastify/plugins/index.ts` pour toujours enregistrer cookie et jwt :

```typescript
import fastifyAccepts from '@fastify/accepts'
import fastifyCors, { type FastifyCorsOptions } from '@fastify/cors'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyGracefulShutdown from 'fastify-graceful-shutdown'
import fastifyPlugin from 'fastify-plugin'

import { registerPlugin } from '../util/fastify-plugin.registerer'
import { awilixPlugin } from './awilix.plugin'
import { cookiePlugin } from './cookie.plugin'
import { jwtPlugin } from './jwt.plugin'
import { ormPlugin } from './orm.plugin'

const plugins: FastifyPluginAsync = fastifyPlugin(
  async (fastify: FastifyInstance) => {
    const { iocContainer, log } = fastify
    const { config } = iocContainer
    log.info('Registering plugins')
    const shutdownOptions = { timeout: 5000 }
    if (process.env.CI) {
      await registerPlugin(fastify, 'gracefulShutdown', fastifyGracefulShutdown, shutdownOptions)
    }
    await registerPlugin(fastify, 'cookie', cookiePlugin)
    await registerPlugin(fastify, 'jwt', jwtPlugin)
    await registerPlugin<FastifyCorsOptions>(fastify, 'cors', fastifyCors, {
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
    await registerPlugin(fastify, 'accepts', fastifyAccepts)
    await registerPlugin(fastify, 'awilix', awilixPlugin)
    await registerPlugin(fastify, 'orm', ormPlugin)

    log.info('All plugins registered')
  },
)

export { plugins }
```

- [ ] **Step 7: Vérifier la compilation**

```bash
cd back && npm run build:check-typedefs
```
Expected : aucune erreur TypeScript.

- [ ] **Step 8: Commit**

```bash
git add back/src/ back/package.json
git commit -m "chore: remove MediSync code, rebuild IoC base, update config"
```

---

### Task 4: Infrastructure Redis et MinIO

**Files:**
- Modify: `back/package.json`
- Create: `back/src/main/infra/redis/redis-client.ts`
- Create: `back/src/main/types/infra/redis/redis-client.ts`
- Create: `back/src/main/infra/storage/minio-client.ts`
- Create: `back/src/main/types/infra/storage/minio-client.ts`
- Create: `back/src/main/interfaces/http/fastify/plugins/redis.plugin.ts`
- Modify: `back/src/main/interfaces/http/fastify/plugins/index.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/types/application/ioc.ts`

- [ ] **Step 1: Installer les dépendances**

```bash
cd back && npm install ioredis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

(ioredis v5+ inclut ses propres types — ne pas installer `@types/ioredis`)

- [ ] **Step 2: Type interface Redis**

`back/src/main/types/infra/redis/redis-client.ts` :

```typescript
import type Redis from 'ioredis'

export interface RedisClientInterface {
  readonly client: Redis
  healthCheck(): Promise<boolean>
}
```

- [ ] **Step 3: Implémenter RedisClient**

`back/src/main/infra/redis/redis-client.ts` :

```typescript
import Redis from 'ioredis'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { RedisClientInterface } from '../../../types/infra/redis/redis-client.js'

export class RedisClient implements RedisClientInterface {
  readonly client: Redis

  constructor({ config }: IocContainer) {
    this.client = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 3 })
  }

  async healthCheck(): Promise<boolean> {
    return (await this.client.ping()) === 'PONG'
  }
}
```

- [ ] **Step 4: Plugin Fastify pour Redis (lifecycle)**

`back/src/main/interfaces/http/fastify/plugins/redis.plugin.ts` :

```typescript
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const { redisClient, logger } = fastify.iocContainer

  fastify.addHook('onReady', async () => {
    await redisClient.client.connect()
    logger.info('Redis connected')
  })

  fastify.addHook('onClose', async () => {
    await redisClient.client.quit()
    logger.info('Redis disconnected')
  })
})
```

- [ ] **Step 5: Enregistrer le plugin Redis**

Dans `back/src/main/interfaces/http/fastify/plugins/index.ts`, ajouter après `ormPlugin` :

```typescript
await registerPlugin(fastify, 'redis', redisPlugin)
```

- [ ] **Step 6: Type interface MinIO**

`back/src/main/types/infra/storage/minio-client.ts` :

```typescript
export interface MinioClientInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
}
```

- [ ] **Step 7: Implémenter MinioClient**

`back/src/main/infra/storage/minio-client.ts` :

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { MinioClientInterface } from '../../../types/infra/storage/minio-client.js'

export class MinioClient implements MinioClientInterface {
  readonly #s3: S3Client
  readonly #bucket: string
  readonly #endpoint: string

  constructor({ config }: IocContainer) {
    this.#bucket = config.minioBucket
    this.#endpoint = config.minioEndpoint
    this.#s3 = new S3Client({
      endpoint: config.minioEndpoint,
      region: 'us-east-1',
      credentials: { accessKeyId: config.minioAccessKey, secretAccessKey: config.minioSecretKey },
      forcePathStyle: true,
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.#s3.send(new PutObjectCommand({ Bucket: this.#bucket, Key: key, Body: body, ContentType: contentType }))
    return key
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.#s3, new GetObjectCommand({ Bucket: this.#bucket, Key: key }), { expiresIn })
  }

  async delete(key: string): Promise<void> {
    await this.#s3.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }))
  }

  publicUrl(key: string): string {
    return `${this.#endpoint}/${this.#bucket}/${key}`
  }
}
```

- [ ] **Step 8: Enregistrer Redis + MinIO dans l'IoC**

Ajouter dans `awilix-ioc-container.ts` (dans le constructeur, après `postgresOrm`) :

```typescript
this.#reg('redisClient', asClass(RedisClient).singleton())
this.#reg('minioClient', asClass(MinioClient).singleton())
```

Ajouter les imports :

```typescript
import { RedisClient } from '../../../infra/redis/redis-client'
import { MinioClient } from '../../../infra/storage/minio-client'
```

Mettre à jour `types/application/ioc.ts` :

```typescript
import type { RedisClientInterface } from '../infra/redis/redis-client'
import type { MinioClientInterface } from '../infra/storage/minio-client'

// Ajouter dans IocContainer :
readonly redisClient: RedisClientInterface
readonly minioClient: MinioClientInterface
```

- [ ] **Step 9: Vérifier la compilation**

```bash
cd back && npm run build:check-typedefs
```
Expected : aucune erreur.

- [ ] **Step 10: Commit**

```bash
git add back/src/ back/package.json back/package-lock.json
git commit -m "feat(infra): add Redis client (plugin lifecycle) and MinIO client"
```

---

## Chunk 2: Auth Backend — JWT Service + User domain + Auth domain

### Task 5: JwtService injectable + User domain

**Files:**
- Create: `back/src/main/types/infra/auth/jwt.service.ts`
- Create: `back/src/main/infra/auth/jwt.service.ts`
- Create: `back/src/main/types/domain/user/user.types.ts`
- Create: `back/src/main/types/infra/orm/repositories/user.repository.interface.ts`
- Create: `back/src/main/infra/orm/repositories/user.repository.ts`
- Create: `back/src/main/types/domain/user/user.domain.interface.ts`
- Create: `back/src/main/domain/user/user.domain.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/types/application/ioc.ts`

- [ ] **Step 1: Type JwtServiceInterface**

`back/src/main/types/infra/auth/jwt.service.ts` :

```typescript
export interface JwtServiceInterface {
  sign(payload: Record<string, unknown>, options: { expiresIn: string }): string
  signRefresh(payload: Record<string, unknown>, options: { expiresIn: string }): string
  verify<T>(token: string): T
  verifyRefresh<T>(token: string): T
}
```

- [ ] **Step 2: Implémenter JwtService**

`back/src/main/infra/auth/jwt.service.ts` :

```typescript
import jwt from 'jsonwebtoken'
import Boom from '@hapi/boom'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { JwtServiceInterface } from '../../../types/infra/auth/jwt.service.js'

export class JwtService implements JwtServiceInterface {
  readonly #secret: string
  readonly #refreshSecret: string

  constructor({ config }: IocContainer) {
    this.#secret = config.jwtSecret
    this.#refreshSecret = config.jwtRefreshSecret
  }

  sign(payload: Record<string, unknown>, options: { expiresIn: string }): string {
    return jwt.sign(payload, this.#secret, options)
  }

  signRefresh(payload: Record<string, unknown>, options: { expiresIn: string }): string {
    return jwt.sign(payload, this.#refreshSecret, options)
  }

  verify<T>(token: string): T {
    try {
      return jwt.verify(token, this.#secret) as T
    } catch {
      throw Boom.unauthorized('Invalid or expired token')
    }
  }

  verifyRefresh<T>(token: string): T {
    try {
      return jwt.verify(token, this.#refreshSecret) as T
    } catch {
      throw Boom.unauthorized('Invalid or expired refresh token')
    }
  }
}
```

- [ ] **Step 3: Types User**

`back/src/main/types/domain/user/user.types.ts` :

```typescript
import type { User } from '../../../../generated/client'

export type UserEntity = User

export type CreateUserInput = {
  username: string
  email: string
  passwordHash?: string
}

export type UpdateUserInput = Partial<Pick<User,
  'username' | 'avatar' | 'banner' | 'tokens' | 'dust' |
  'lastTokenAt' | 'xp' | 'level' | 'pityCurrent' |
  'streakDays' | 'lastLoginAt' | 'role'
>>
```

- [ ] **Step 4: Interface UserRepository**

`back/src/main/types/infra/orm/repositories/user.repository.interface.ts` :

```typescript
import type { CreateUserInput, UpdateUserInput, UserEntity } from '../../../domain/user/user.types.js'

export interface UserRepositoryInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  create(input: CreateUserInput): Promise<UserEntity>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 5: Implémenter UserRepository**

`back/src/main/infra/orm/repositories/user.repository.ts` :

```typescript
import type { IocContainer } from '../../../types/application/ioc.js'
import type { UserRepositoryInterface } from '../../../types/infra/orm/repositories/user.repository.interface.js'
import type { CreateUserInput, UpdateUserInput, UserEntity } from '../../../types/domain/user/user.types.js'
import type { PostgresPrismaClient } from '../postgres-client.js'

export class UserRepository implements UserRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { username } })
  }

  create(input: CreateUserInput): Promise<UserEntity> {
    return this.#prisma.user.create({
      data: {
        username: input.username,
        email: input.email.toLowerCase().trim(),
        passwordHash: input.passwordHash,
      },
    })
  }

  update(id: string, input: UpdateUserInput): Promise<UserEntity> {
    return this.#prisma.user.update({ where: { id }, data: input })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.user.delete({ where: { id } })
  }
}
```

- [ ] **Step 6: Interface et domaine User**

`back/src/main/types/domain/user/user.domain.interface.ts` :

```typescript
import type { UserEntity, UpdateUserInput } from './user.types.js'

export interface UserDomainInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
}
```

`back/src/main/domain/user/user.domain.ts` :

```typescript
import type { IocContainer } from '../../types/application/ioc.js'
import type { UserDomainInterface } from '../../types/domain/user/user.domain.interface.js'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface.js'
import type { UserEntity, UpdateUserInput } from '../../types/domain/user/user.types.js'

export class UserDomain implements UserDomainInterface {
  readonly #repo: UserRepositoryInterface

  constructor({ userRepository }: IocContainer) {
    this.#repo = userRepository
  }

  findById(id: string): Promise<UserEntity | null> { return this.#repo.findById(id) }
  findByEmail(email: string): Promise<UserEntity | null> { return this.#repo.findByEmail(email) }
  findByUsername(username: string): Promise<UserEntity | null> { return this.#repo.findByUsername(username) }
  update(id: string, input: UpdateUserInput): Promise<UserEntity> { return this.#repo.update(id, input) }
}
```

- [ ] **Step 7: Enregistrer dans l'IoC**

Ajouter dans `awilix-ioc-container.ts` (après `redisClient`) :

```typescript
import { JwtService } from '../../../infra/auth/jwt.service'
import { UserRepository } from '../../../infra/orm/repositories/user.repository'
import { UserDomain } from '../../../domain/user/user.domain'
// ...
this.#reg('jwtService', asClass(JwtService).singleton())
this.#reg('userRepository', asClass(UserRepository).singleton())
this.#reg('userDomain', asClass(UserDomain).singleton())
```

Mettre à jour `types/application/ioc.ts` — ajouter :

```typescript
import type { JwtServiceInterface } from '../infra/auth/jwt.service'
import type { UserRepositoryInterface } from '../infra/orm/repositories/user.repository.interface'
import type { UserDomainInterface } from '../domain/user/user.domain.interface'

// Dans IocContainer :
readonly jwtService: JwtServiceInterface
readonly userRepository: UserRepositoryInterface
readonly userDomain: UserDomainInterface
```

- [ ] **Step 8: Vérifier la compilation**

```bash
cd back && npm run build:check-typedefs
```

- [ ] **Step 9: Commit**

```bash
git add back/src/ back/package.json back/package-lock.json
git commit -m "feat(user): add JwtService, UserRepository, UserDomain"
```

---

### Task 6: Auth domain + RefreshToken + OAuthAccount repositories

**Files:**
- Create: `back/src/main/types/domain/auth/auth.types.ts`
- Create: `back/src/main/types/domain/auth/auth.domain.interface.ts`
- Create: `back/src/main/infra/redis/refresh-token.repository.ts`
- Create: `back/src/main/infra/orm/repositories/oauth-account.repository.ts`
- Create: `back/src/main/domain/auth/auth.domain.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/types/application/ioc.ts`

- [ ] **Step 1: Types auth**

`back/src/main/types/domain/auth/auth.types.ts` :

```typescript
export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export type RegisterInput = {
  username: string
  email: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}

export type JwtPayload = {
  sub: string
  role: string
  iat?: number
  exp?: number
}
```

- [ ] **Step 2: Interface AuthDomain**

`back/src/main/types/domain/auth/auth.domain.interface.ts` :

```typescript
import type { TokenPair, RegisterInput, LoginInput } from './auth.types.js'
import type { UserEntity } from '../user/user.types.js'

export interface AuthDomainInterface {
  register(input: RegisterInput): Promise<{ user: UserEntity; tokens: TokenPair }>
  login(input: LoginInput): Promise<{ user: UserEntity; tokens: TokenPair }>
  refreshTokens(refreshToken: string): Promise<TokenPair>
  logout(userId: string, refreshToken: string): Promise<void>
  hashPassword(password: string): Promise<string>
  verifyPassword(password: string, hash: string): Promise<boolean>
  generateTokenPair(user: UserEntity): Promise<TokenPair>
}
```

- [ ] **Step 3: RefreshTokenRepository (Redis)**

`back/src/main/infra/redis/refresh-token.repository.ts` :

```typescript
import type { IocContainer } from '../../../types/application/ioc.js'
import type { RedisClientInterface } from '../../../types/infra/redis/redis-client.js'

const TTL = 7 * 24 * 60 * 60  // 7 jours en secondes

export class RefreshTokenRepository {
  readonly #redis: RedisClientInterface

  constructor({ redisClient }: IocContainer) {
    this.#redis = redisClient
  }

  #key(userId: string, token: string): string {
    return `refresh:${userId}:${token}`
  }

  async store(userId: string, token: string): Promise<void> {
    await this.#redis.client.set(this.#key(userId, token), '1', 'EX', TTL)
  }

  async exists(userId: string, token: string): Promise<boolean> {
    return (await this.#redis.client.get(this.#key(userId, token))) !== null
  }

  async revoke(userId: string, token: string): Promise<void> {
    await this.#redis.client.del(this.#key(userId, token))
  }

  async revokeAll(userId: string): Promise<void> {
    const keys = await this.#redis.client.keys(`refresh:${userId}:*`)
    if (keys.length > 0) await this.#redis.client.del(...keys)
  }
}
```

- [ ] **Step 4: OAuthAccountRepository**

`back/src/main/infra/orm/repositories/oauth-account.repository.ts` :

```typescript
import type { IocContainer } from '../../../types/application/ioc.js'
import type { PostgresPrismaClient } from '../postgres-client.js'
import type { OAuthProvider, OAuthAccount } from '../../../generated/client'

export class OAuthAccountRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByProvider(provider: OAuthProvider, providerAccountId: string): Promise<OAuthAccount | null> {
    return this.#prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    })
  }

  create(userId: string, provider: OAuthProvider, providerAccountId: string): Promise<OAuthAccount> {
    return this.#prisma.oAuthAccount.create({ data: { userId, provider, providerAccountId } })
  }
}
```

- [ ] **Step 5: Installer bcrypt**

```bash
cd back && npm install bcrypt && npm install --save-dev @types/bcrypt
```

- [ ] **Step 6: Implémenter AuthDomain**

`back/src/main/domain/auth/auth.domain.ts` :

```typescript
import bcrypt from 'bcrypt'
import Boom from '@hapi/boom'
import type { IocContainer } from '../../types/application/ioc.js'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface.js'
import type { RegisterInput, LoginInput, TokenPair, JwtPayload } from '../../types/domain/auth/auth.types.js'
import type { UserEntity } from '../../types/domain/user/user.types.js'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface.js'
import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository.js'
import type { JwtServiceInterface } from '../../types/infra/auth/jwt.service.js'

const SALT_ROUNDS = 12

export class AuthDomain implements AuthDomainInterface {
  readonly #userRepository: UserRepositoryInterface
  readonly #refreshTokenRepository: RefreshTokenRepository
  readonly #jwtService: JwtServiceInterface

  constructor({ userRepository, refreshTokenRepository, jwtService }: IocContainer) {
    this.#userRepository = userRepository
    this.#refreshTokenRepository = refreshTokenRepository
    this.#jwtService = jwtService
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  async register(input: RegisterInput): Promise<{ user: UserEntity; tokens: TokenPair }> {
    const existing = await this.#userRepository.findByEmail(input.email)
    if (existing) throw Boom.conflict('Email already in use')
    const existingUsername = await this.#userRepository.findByUsername(input.username)
    if (existingUsername) throw Boom.conflict('Username already taken')
    const passwordHash = await this.hashPassword(input.password)
    const user = await this.#userRepository.create({ username: input.username, email: input.email, passwordHash })
    const tokens = await this.generateTokenPair(user)
    return { user, tokens }
  }

  async login(input: LoginInput): Promise<{ user: UserEntity; tokens: TokenPair }> {
    const user = await this.#userRepository.findByEmail(input.email)
    if (!user || !user.passwordHash) {
      await bcrypt.compare(input.password, '$2b$12$invalidhashfortimingsafety00000000000')
      throw Boom.unauthorized('Invalid credentials')
    }
    const valid = await this.verifyPassword(input.password, user.passwordHash)
    if (!valid) throw Boom.unauthorized('Invalid credentials')
    const tokens = await this.generateTokenPair(user)
    return { user, tokens }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = this.#jwtService.verifyRefresh<JwtPayload>(refreshToken)
    const valid = await this.#refreshTokenRepository.exists(payload.sub, refreshToken)
    if (!valid) throw Boom.unauthorized('Refresh token revoked')
    const user = await this.#userRepository.findById(payload.sub)
    if (!user) throw Boom.unauthorized('User not found')
    await this.#refreshTokenRepository.revoke(payload.sub, refreshToken)
    return this.generateTokenPair(user)
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.#refreshTokenRepository.revoke(userId, refreshToken)
  }

  async generateTokenPair(user: UserEntity): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, role: user.role }
    const accessToken = this.#jwtService.sign(payload, { expiresIn: '15m' })
    const refreshToken = this.#jwtService.signRefresh(payload, { expiresIn: '7d' })
    await this.#refreshTokenRepository.store(user.id, refreshToken)
    return { accessToken, refreshToken }
  }
}
```

- [ ] **Step 7: Enregistrer dans l'IoC**

Ajouter dans `awilix-ioc-container.ts` :

```typescript
import { RefreshTokenRepository } from '../../../infra/redis/refresh-token.repository'
import { OAuthAccountRepository } from '../../../infra/orm/repositories/oauth-account.repository'
import { AuthDomain } from '../../../domain/auth/auth.domain'
// ...
this.#reg('refreshTokenRepository', asClass(RefreshTokenRepository).singleton())
this.#reg('oauthAccountRepository', asClass(OAuthAccountRepository).singleton())
this.#reg('authDomain', asClass(AuthDomain).singleton())
```

Mettre à jour `types/application/ioc.ts` :

```typescript
import type { AuthDomainInterface } from '../domain/auth/auth.domain.interface'
import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository'
import type { OAuthAccountRepository } from '../../infra/orm/repositories/oauth-account.repository'

// Dans IocContainer :
readonly authDomain: AuthDomainInterface
readonly refreshTokenRepository: RefreshTokenRepository
readonly oauthAccountRepository: OAuthAccountRepository
```

- [ ] **Step 8: Vérifier la compilation**

```bash
cd back && npm run build:check-typedefs
```

- [ ] **Step 9: Commit**

```bash
git add back/src/ back/package.json back/package-lock.json
git commit -m "feat(auth): add AuthDomain, RefreshTokenRepository, OAuthAccountRepository"
```

---

## Chunk 3: Routes HTTP Auth (email/password + OAuth + API Keys)

### Task 7: Plugin auth + verifySessionCookie + routes email/password

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/plugins/jwt.plugin.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/helpers.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/schemas.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/register.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/login.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/logout.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/refresh.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/me.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`

- [ ] **Step 1: Mettre à jour la déclaration de type request.user**

Dans `back/src/main/interfaces/http/fastify/plugins/jwt.plugin.ts` (ou dans un fichier dédié de type augmentation), remplacer la déclaration de `FastifyRequest.user` :

```typescript
declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: string }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
```

Puis redéfinir `verifySessionCookie` pour utiliser `jwtService` au lieu de `fastify.jwt` :

```typescript
import fp from 'fastify-plugin'
import Boom from '@hapi/boom'

export const jwtPlugin = fp(async (fastify) => {
  fastify.decorate('verifySessionCookie', async (request: FastifyRequest) => {
    const { jwtService } = fastify.iocContainer

    // JWT cookie uniquement — le support X-API-Key sera ajouté à la Task 9
    const token = request.cookies.access_token
    if (!token) throw Boom.unauthorized('No access token')
    const payload = jwtService.verify<{ sub: string; role: string }>(token)
    request.user = { userID: payload.sub, role: payload.role }
  })
})
```

- [ ] **Step 2: Écrire le test e2e register (failing)**

Créer `back/src/test/e2e/auth/register.test.ts` :

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app.js'

describe('POST /auth/register', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 201 with user and sets cookies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: 'testuser', email: 'test@example.com', password: 'Password123!' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('username', 'testuser')
    expect(body).not.toHaveProperty('passwordHash')
    expect(res.cookies.find((c: any) => c.name === 'access_token')).toBeDefined()
    expect(res.cookies.find((c: any) => c.name === 'refresh_token')).toBeDefined()
  })

  it('returns 409 if email already taken', async () => {
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: 'other', email: 'dup@example.com', password: 'Password123!' },
    })
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: 'other2', email: 'dup@example.com', password: 'Password123!' },
    })
    expect(res.statusCode).toBe(409)
  })
})
```

- [ ] **Step 3: Créer le helper de test**

`back/src/test/helpers/build-test-app.ts` :

```typescript
import { loadConfig } from '../../main/application/config.js'
import { AwilixIocContainer } from '../../main/application/ioc/awilix/awilix-ioc-container.js'

export async function buildTestApp() {
  const config = loadConfig()
  const ioc = new AwilixIocContainer(config)
  const server = ioc.instances.httpServer as any
  await server.configure()
  return server.fastify
}
```

- [ ] **Step 4: Run test pour vérifier l'échec**

```bash
cd back && npm run test:e2e -- --testPathPattern=auth/register
```
Expected : FAIL (routes non existantes)

- [ ] **Step 5: Helpers communs**

`back/src/main/interfaces/http/fastify/routes/auth/helpers.ts` :

```typescript
import type { FastifyReply } from 'fastify'
import type { TokenPair } from '../../../../../types/domain/auth/auth.types.js'
import type { UserEntity } from '../../../../../types/domain/user/user.types.js'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function setTokenCookies(reply: FastifyReply, { accessToken, refreshToken }: TokenPair): void {
  reply
    .setCookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 })
    .setCookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 })
}

export function sanitizeUser(user: UserEntity): Omit<UserEntity, 'passwordHash'> {
  const { passwordHash: _pw, ...safe } = user
  return safe
}
```

- [ ] **Step 6: Schémas Zod**

`back/src/main/interfaces/http/fastify/routes/auth/schemas.ts` :

```typescript
import { z } from 'zod/v4'

export const registerBodySchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.email(),
  password: z.string().min(8).max(100),
})

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string(),
})

export const userResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  tokens: z.number(),
  dust: z.number(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  createdAt: z.date(),
})
```

- [ ] **Step 7: Route register**

`back/src/main/interfaces/http/fastify/routes/auth/register.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { registerBodySchema, userResponseSchema } from './schemas.js'
import { setTokenCookies, sanitizeUser } from './helpers.js'

export const registerRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {
    schema: { body: registerBodySchema, response: { 201: userResponseSchema } },
  }, async (request, reply) => {
    const { user, tokens } = await authDomain.register(request.body)
    setTokenCookies(reply, tokens)
    return reply.status(201).send(sanitizeUser(user))
  })
}
```

- [ ] **Step 8: Route login**

`back/src/main/interfaces/http/fastify/routes/auth/login.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { loginBodySchema, userResponseSchema } from './schemas.js'
import { setTokenCookies, sanitizeUser } from './helpers.js'

export const loginRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {
    schema: { body: loginBodySchema, response: { 200: userResponseSchema } },
  }, async (request, reply) => {
    const { user, tokens } = await authDomain.login(request.body)
    setTokenCookies(reply, tokens)
    return sanitizeUser(user)
  })
}
```

- [ ] **Step 9: Route logout**

`back/src/main/interfaces/http/fastify/routes/auth/logout.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import Boom from '@hapi/boom'

export const logoutRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {
    onRequest: [fastify.verifySessionCookie],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refresh_token
    if (!refreshToken) throw Boom.badRequest('No refresh token')
    await authDomain.logout(request.user.userID, refreshToken)
    reply
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/' })
    return reply.status(204).send()
  })
}
```

- [ ] **Step 10: Route refresh**

`back/src/main/interfaces/http/fastify/routes/auth/refresh.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import Boom from '@hapi/boom'
import { setTokenCookies } from './helpers.js'

export const refreshRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {}, async (request, reply) => {
    const refreshToken = request.cookies.refresh_token
    if (!refreshToken) throw Boom.unauthorized('No refresh token')
    const tokens = await authDomain.refreshTokens(refreshToken)
    setTokenCookies(reply, tokens)
    return { ok: true }
  })
}
```

- [ ] **Step 11: Route me**

`back/src/main/interfaces/http/fastify/routes/auth/me.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import Boom from '@hapi/boom'
import { userResponseSchema } from './schemas.js'
import { sanitizeUser } from './helpers.js'

export const meRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { userDomain } = fastify.iocContainer

  fastify.get('/', {
    onRequest: [fastify.verifySessionCookie],
    schema: { response: { 200: userResponseSchema } },
  }, async (request) => {
    const user = await userDomain.findById(request.user.userID)
    if (!user) throw Boom.notFound('User not found')
    return sanitizeUser(user)
  })
}
```

- [ ] **Step 12: Barrel auth router**

`back/src/main/interfaces/http/fastify/routes/auth/index.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { registerRouter } from './register.router.js'
import { loginRouter } from './login.router.js'
import { logoutRouter } from './logout.router.js'
import { refreshRouter } from './refresh.router.js'
import { meRouter } from './me.router.js'

export const authRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(registerRouter, { prefix: '/register' })
  await fastify.register(loginRouter, { prefix: '/login' })
  await fastify.register(logoutRouter, { prefix: '/logout' })
  await fastify.register(refreshRouter, { prefix: '/refresh' })
  await fastify.register(meRouter, { prefix: '/me' })
}
```

- [ ] **Step 13: Brancher dans routes/index.ts**

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authRouter } from './auth/index.js'

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', async () => ({ name: 'Gachapon API', status: 'running', version: '1.0.0' }))
  await fastify.register(authRouter, { prefix: '/auth' })
}
```

- [ ] **Step 14: Run les tests**

```bash
cd back && npm run test:e2e -- --testPathPattern=auth
```
Expected : ✅ tests passent.

- [ ] **Step 15: Commit**

```bash
git add back/src/
git commit -m "feat(auth): add email/password auth routes (register, login, logout, refresh, me)"
```

---

### Task 8: OAuth Google + Discord

**Files:**
- Create: `back/src/main/types/domain/auth/oauth.domain.interface.ts`
- Create: `back/src/main/domain/auth/oauth.domain.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/oauth/google.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/oauth/discord.router.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/auth/oauth/index.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/auth/index.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/types/application/ioc.ts`

- [ ] **Step 1: Interface OAuthDomain**

`back/src/main/types/domain/auth/oauth.domain.interface.ts` :

```typescript
import type { UserEntity } from '../user/user.types.js'
import type { TokenPair } from './auth.types.js'

export type OAuthProviderName = 'google' | 'discord'

export interface OAuthDomainInterface {
  getAuthorizationUrl(provider: OAuthProviderName, state: string): string
  handleCallback(provider: OAuthProviderName, code: string): Promise<{ user: UserEntity; tokens: TokenPair; isNew: boolean }>
}
```

- [ ] **Step 2: Implémenter OAuthDomain**

`back/src/main/domain/auth/oauth.domain.ts` :

```typescript
import Boom from '@hapi/boom'
import { OAuthProvider } from '../../../generated/client'
import type { IocContainer } from '../../types/application/ioc.js'
import type { OAuthDomainInterface, OAuthProviderName } from '../../types/domain/auth/oauth.domain.interface.js'
import type { UserEntity } from '../../types/domain/user/user.types.js'
import type { TokenPair } from '../../types/domain/auth/auth.types.js'
import type { Config } from '../../types/application/config.js'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface.js'
import type { OAuthAccountRepository } from '../../infra/orm/repositories/oauth-account.repository.js'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface.js'

type OAuthUserInfo = { id: string; email: string; username: string }

export class OAuthDomain implements OAuthDomainInterface {
  readonly #config: Config
  readonly #userRepository: UserRepositoryInterface
  readonly #oauthAccountRepository: OAuthAccountRepository
  readonly #authDomain: AuthDomainInterface

  constructor({ config, userRepository, oauthAccountRepository, authDomain }: IocContainer) {
    this.#config = config
    this.#userRepository = userRepository
    this.#oauthAccountRepository = oauthAccountRepository
    this.#authDomain = authDomain
  }

  getAuthorizationUrl(provider: OAuthProviderName, state: string): string {
    if (provider === 'google') {
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: this.#config.googleClientId,
        redirect_uri: this.#config.googleRedirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      })}`
    }
    if (provider === 'discord') {
      return `https://discord.com/api/oauth2/authorize?${new URLSearchParams({
        client_id: this.#config.discordClientId,
        redirect_uri: this.#config.discordRedirectUri,
        response_type: 'code',
        scope: 'identify email',
        state,
      })}`
    }
    throw Boom.badRequest('Unknown provider')
  }

  async handleCallback(
    provider: OAuthProviderName,
    code: string
  ): Promise<{ user: UserEntity; tokens: TokenPair; isNew: boolean }> {
    const userInfo = provider === 'google'
      ? await this.#fetchGoogleUser(code)
      : await this.#fetchDiscordUser(code)

    const prismaProvider = provider === 'google' ? OAuthProvider.GOOGLE : OAuthProvider.DISCORD
    const existingAccount = await this.#oauthAccountRepository.findByProvider(prismaProvider, userInfo.id)

    if (existingAccount) {
      const user = await this.#userRepository.findById(existingAccount.userId)
      if (!user) throw Boom.notFound('User not found')
      const tokens = await this.#authDomain.generateTokenPair(user)
      return { user, tokens, isNew: false }
    }

    let user = await this.#userRepository.findByEmail(userInfo.email)
    let isNew = false

    if (!user) {
      const username = await this.#availableUsername(userInfo.username)
      user = await this.#userRepository.create({ username, email: userInfo.email })
      isNew = true
    }

    await this.#oauthAccountRepository.create(user.id, prismaProvider, userInfo.id)
    const tokens = await this.#authDomain.generateTokenPair(user)
    return { user, tokens, isNew }
  }

  async #fetchGoogleUser(code: string): Promise<OAuthUserInfo> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.#config.googleClientId,
        client_secret: this.#config.googleClientSecret,
        redirect_uri: this.#config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token: string }
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const u = await userRes.json() as { id: string; email: string; name: string }
    return { id: u.id, email: u.email, username: u.name.replace(/\s+/g, '_').toLowerCase() }
  }

  async #fetchDiscordUser(code: string): Promise<OAuthUserInfo> {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.#config.discordClientId,
        client_secret: this.#config.discordClientSecret,
        redirect_uri: this.#config.discordRedirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token: string }
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const u = await userRes.json() as { id: string; email: string; username: string }
    return { id: u.id, email: u.email, username: u.username }
  }

  async #availableUsername(base: string): Promise<string> {
    let username = base.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 28)
    let i = 1
    while (await this.#userRepository.findByUsername(username)) {
      username = `${base.slice(0, 25)}_${i++}`
    }
    return username
  }
}
```

- [ ] **Step 3: Router Google OAuth**

`back/src/main/interfaces/http/fastify/routes/auth/oauth/google.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import { setTokenCookies } from '../helpers.js'

export const googleOAuthRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { oauthDomain, config } = fastify.iocContainer

  fastify.get('/authorize', {}, async (request, reply) => {
    const state = randomBytes(16).toString('hex')
    reply.setCookie('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' })
    return reply.redirect(oauthDomain.getAuthorizationUrl('google', state))
  })

  fastify.get('/callback', {
    schema: { querystring: z.object({ code: z.string(), state: z.string() }) },
  }, async (request, reply) => {
    const { code, state } = request.query
    if (!request.cookies.oauth_state || request.cookies.oauth_state !== state) {
      throw Boom.forbidden('Invalid OAuth state')
    }
    const { tokens } = await oauthDomain.handleCallback('google', code)
    setTokenCookies(reply, tokens)
    reply.clearCookie('oauth_state', { path: '/' })
    return reply.redirect(`${config.frontUrl}/play`)
  })
}
```

- [ ] **Step 4: Router Discord OAuth**

`back/src/main/interfaces/http/fastify/routes/auth/oauth/discord.router.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import { setTokenCookies } from '../helpers.js'

export const discordOAuthRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { oauthDomain, config } = fastify.iocContainer

  fastify.get('/authorize', {}, async (request, reply) => {
    const state = randomBytes(16).toString('hex')
    reply.setCookie('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' })
    return reply.redirect(oauthDomain.getAuthorizationUrl('discord', state))
  })

  fastify.get('/callback', {
    schema: { querystring: z.object({ code: z.string(), state: z.string() }) },
  }, async (request, reply) => {
    const { code, state } = request.query
    if (!request.cookies.oauth_state || request.cookies.oauth_state !== state) {
      throw Boom.forbidden('Invalid OAuth state')
    }
    const { tokens } = await oauthDomain.handleCallback('discord', code)
    setTokenCookies(reply, tokens)
    reply.clearCookie('oauth_state', { path: '/' })
    return reply.redirect(`${config.frontUrl}/play`)
  })
}
```

- [ ] **Step 5: Barrel OAuth**

`back/src/main/interfaces/http/fastify/routes/auth/oauth/index.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { googleOAuthRouter } from './google.router.js'
import { discordOAuthRouter } from './discord.router.js'

export const oauthRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(googleOAuthRouter, { prefix: '/google' })
  await fastify.register(discordOAuthRouter, { prefix: '/discord' })
}
```

- [ ] **Step 6: Ajouter OAuth dans auth/index.ts**

```typescript
import { oauthRouter } from './oauth/index.js'
// dans la fonction async :
await fastify.register(oauthRouter, { prefix: '/oauth' })
```

- [ ] **Step 7: Enregistrer OAuthDomain dans l'IoC**

```typescript
import { OAuthDomain } from '../../../domain/auth/oauth.domain'
// ...
this.#reg('oauthDomain', asClass(OAuthDomain).singleton())
```

Mettre à jour `types/application/ioc.ts` :

```typescript
import type { OAuthDomainInterface } from '../domain/auth/oauth.domain.interface'
// Dans IocContainer :
readonly oauthDomain: OAuthDomainInterface
```

- [ ] **Step 8: Compiler**

```bash
cd back && npm run build:check-typedefs
```

- [ ] **Step 9: Commit**

```bash
git add back/src/
git commit -m "feat(auth): add Google and Discord OAuth"
```

---

### Task 9: API Keys

**Files:**
- Create: `back/src/main/infra/orm/repositories/api-key.repository.ts`
- Create: `back/src/main/interfaces/http/fastify/routes/api-keys/index.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/index.ts`

- [ ] **Step 1: Écrire le test API Keys (failing)**

`back/src/test/e2e/auth/api-keys.test.ts` :

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app.js'

describe('API Keys', () => {
  let app: any
  let accessCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: 'apikeyuser', email: 'apikey@example.com', password: 'Password123!' },
    })
    accessCookie = res.cookies.find((c: any) => c.name === 'access_token')?.value ?? ''
  })
  afterAll(async () => { await app.close() })

  it('creates an API key with gp_ prefix', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api-keys',
      cookies: { access_token: accessCookie },
      payload: { name: 'My bot' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().key).toMatch(/^gp_/)
  })

  it('authenticates via X-API-Key header', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api-keys',
      cookies: { access_token: accessCookie },
      payload: { name: 'Test key' },
    })
    const { key } = createRes.json()
    const meRes = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { 'x-api-key': key },
    })
    expect(meRes.statusCode).toBe(200)
    expect(meRes.json()).toHaveProperty('username', 'apikeyuser')
  })
})
```

- [ ] **Step 2: Run pour vérifier l'échec**

```bash
cd back && npm run test:e2e -- --testPathPattern=api-keys
```

- [ ] **Step 3: Implémenter ApiKeyRepository**

`back/src/main/infra/orm/repositories/api-key.repository.ts` :

```typescript
import { randomBytes } from 'node:crypto'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { PostgresPrismaClient } from '../postgres-client.js'
import type { ApiKey } from '../../../generated/client'

export class ApiKeyRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  generate(): string {
    return `gp_${randomBytes(32).toString('hex')}`
  }

  create(userId: string, name: string): Promise<ApiKey> {
    return this.#prisma.apiKey.create({ data: { key: this.generate(), name, userId } })
  }

  findByKey(key: string): Promise<ApiKey | null> {
    return this.#prisma.apiKey.findUnique({ where: { key } })
  }

  findByUser(userId: string): Promise<ApiKey[]> {
    return this.#prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.#prisma.apiKey.deleteMany({ where: { id, userId } })
  }

  updateLastUsed(id: string): Promise<ApiKey> {
    return this.#prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } })
  }
}
```

- [ ] **Step 4: Routes API Keys**

`back/src/main/interfaces/http/fastify/routes/api-keys/index.ts` :

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const apiKeysRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { apiKeyRepository } = fastify.iocContainer

  fastify.post('/', {
    onRequest: [fastify.verifySessionCookie],
    schema: { body: z.object({ name: z.string().min(1).max(50) }) },
  }, async (request, reply) => {
    const key = await apiKeyRepository.create(request.user.userID, request.body.name)
    return reply.status(201).send({ id: key.id, name: key.name, key: key.key, createdAt: key.createdAt })
  })

  fastify.get('/', {
    onRequest: [fastify.verifySessionCookie],
  }, async (request) => {
    const keys = await apiKeyRepository.findByUser(request.user.userID)
    return keys.map(k => ({ id: k.id, name: k.name, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt }))
  })

  fastify.delete('/:id', {
    onRequest: [fastify.verifySessionCookie],
    schema: { params: z.object({ id: z.string().uuid() }) },
  }, async (request, reply) => {
    await apiKeyRepository.delete(request.params.id, request.user.userID)
    return reply.status(204).send()
  })
}
```

- [ ] **Step 5: Brancher dans routes/index.ts**

```typescript
import { apiKeysRouter } from './api-keys/index.js'
// ...
await fastify.register(apiKeysRouter, { prefix: '/api-keys' })
```

- [ ] **Step 6: Enregistrer dans l'IoC**

```typescript
import { ApiKeyRepository } from '../../../infra/orm/repositories/api-key.repository'
// ...
this.#reg('apiKeyRepository', asClass(ApiKeyRepository).singleton())
```

Mettre à jour `IocContainer` :

```typescript
import type { ApiKeyRepository } from '../../infra/orm/repositories/api-key.repository'
// Dans IocContainer :
readonly apiKeyRepository: ApiKeyRepository
```

- [ ] **Step 7: Ajouter le support X-API-Key dans verifySessionCookie**

Maintenant que `apiKeyRepository` est dans l'IoC, mettre à jour `back/src/main/interfaces/http/fastify/plugins/jwt.plugin.ts` :

```typescript
import fp from 'fastify-plugin'
import Boom from '@hapi/boom'

export const jwtPlugin = fp(async (fastify) => {
  fastify.decorate('verifySessionCookie', async (request: FastifyRequest) => {
    const { jwtService, apiKeyRepository, userRepository } = fastify.iocContainer

    // X-API-Key en premier
    const apiKey = request.headers['x-api-key'] as string | undefined
    if (apiKey) {
      const keyRecord = await apiKeyRepository.findByKey(apiKey)
      if (!keyRecord) throw Boom.unauthorized('Invalid API key')
      const user = await userRepository.findById(keyRecord.userId)
      if (!user) throw Boom.unauthorized('User not found')
      request.user = { userID: user.id, role: user.role }
      void apiKeyRepository.updateLastUsed(keyRecord.id)
      return
    }

    // JWT cookie
    const token = request.cookies.access_token
    if (!token) throw Boom.unauthorized('No access token')
    const payload = jwtService.verify<{ sub: string; role: string }>(token)
    request.user = { userID: payload.sub, role: payload.role }
  })
})
```

- [ ] **Step 8: Run les tests**

```bash
cd back && npm run test:e2e -- --testPathPattern=api-keys
```
Expected : ✅

- [ ] **Step 9: Commit**

```bash
git add back/src/
git commit -m "feat(auth): add API Keys (create, list, delete, X-API-Key auth)"
```

---

## Chunk 4: Frontend Auth

### Task 10: Setup frontend + client API + store auth

**Files:**
- Create: `front/src/lib/api.ts`
- Create: `front/src/stores/auth.store.ts`
- Modify: `front/src/routes/__root.tsx`

- [ ] **Step 1: Créer le client API centralisé**

`front/src/lib/api.ts` :

```typescript
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

type RequestOptions = RequestInit & { skipRefresh?: boolean }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (res.status === 401 && !options.skipRefresh) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshRes.ok) {
      return request<T>(path, { ...options, skipRefresh: true })
    }
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message: string }
    throw new Error(err.message ?? 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Créer le store auth**

`front/src/stores/auth.store.ts` :

```typescript
import { create } from 'zustand'
import { api } from '../lib/api.js'

export type AuthUser = {
  id: string
  username: string
  email: string
  role: string
  tokens: number
  dust: number
  avatar: string | null
  banner: string | null
}

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const user = await api.get<AuthUser>('/auth/me')
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
}))
```

- [ ] **Step 3: Mettre à jour __root.tsx**

`front/src/routes/__root.tsx` :

```typescript
import { useEffect } from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { fetchMe, isLoading } = useAuthStore()

  useEffect(() => { void fetchMe() }, [fetchMe])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  return <Outlet />
}
```

- [ ] **Step 4: Commit**

```bash
git add front/src/
git commit -m "feat(frontend): add API client and auth store"
```

---

### Task 11: Pages Login, Register, Landing + Navbar + Layout protégé

**Files:**
- Create: `front/src/routes/index.tsx`
- Create: `front/src/routes/login.tsx`
- Create: `front/src/routes/register.tsx`
- Create: `front/src/routes/_authenticated.tsx`
- Create: `front/src/components/layout/navbar.tsx`

- [ ] **Step 1: Landing page**

`front/src/routes/index.tsx` :

```typescript
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-white">
      <h1 className="mb-4 text-6xl font-extrabold text-purple-400">🎰 Gachapon</h1>
      <p className="mb-10 max-w-xl text-center text-xl text-gray-300">
        Joue à la machine à pince 3D, construis ta collection et rivalise avec tes équipes.
      </p>
      <div className="mb-16 flex gap-4">
        <Link to="/register" className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold hover:bg-purple-700">
          Commencer à jouer
        </Link>
        <Link to="/login" className="rounded-xl border border-gray-700 px-8 py-4 text-lg font-semibold hover:bg-gray-800">
          Se connecter
        </Link>
      </div>
      <div className="grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { icon: '🎰', title: 'Machine à pince 3D', desc: 'Attrape des boules mystères avec une vraie machine en 3D.' },
          { icon: '✨', title: 'Raretés & variantes', desc: 'Commun, Rare, Épique, Légendaire… et des cartes Holographiques.' },
          { icon: '👥', title: 'Équipes', desc: 'Rejoins des équipes, partage ta collection, rivalise au classement.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl bg-gray-900 p-6">
            <div className="mb-3 text-4xl">{icon}</div>
            <h3 className="mb-2 font-bold">{title}</h3>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Page Login**

`front/src/routes/login.tsx` :

```typescript
import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAuthStore } from '../stores/auth.store.js'
import type { AuthUser } from '../stores/auth.store.js'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore(s => s.setUser)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await api.post<AuthUser>('/auth/login', { email, password })
      setUser(user)
      void navigate({ to: '/play' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">Gachapon</h1>
        <p className="mb-8 text-center text-gray-400">Connecte-toi pour jouer</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/auth/oauth/google/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-gray-900 hover:bg-gray-100"
          >
            Continuer avec Google
          </a>
          <a
            href="/auth/oauth/discord/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Continuer avec Discord
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-purple-400 hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Page Register**

`front/src/routes/register.tsx` :

```typescript
import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAuthStore } from '../stores/auth.store.js'
import type { AuthUser } from '../stores/auth.store.js'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore(s => s.setUser)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await api.post<AuthUser>('/auth/register', { username, email, password })
      setUser(user)
      void navigate({ to: '/play' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">Gachapon</h1>
        <p className="mb-8 text-center text-gray-400">Crée ton compte</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Pseudo (lettres, chiffres, _)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Mot de passe (8 caractères min)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/auth/oauth/google/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-gray-900 hover:bg-gray-100"
          >
            S'inscrire avec Google
          </a>
          <a
            href="/auth/oauth/discord/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
          >
            S'inscrire avec Discord
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-purple-400 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Navbar**

`front/src/components/layout/navbar.tsx` :

```typescript
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/auth.store.js'

export function Navbar() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-900/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/play" className="text-xl font-bold text-purple-400">🎰 Gachapon</Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/play" className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Jouer</Link>
          <Link to="/collection" className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Collection</Link>
          <Link to="/teams" className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Équipes</Link>
          <Link to="/shop" className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Boutique</Link>
          <Link to="/leaderboard" className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Classement</Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <span className="rounded-full bg-purple-900/50 px-3 py-1 text-sm font-medium text-purple-300">
              🎟️ {user.tokens}
            </span>
          )}
          {user && (
            <Link
              to="/profile/$username"
              params={{ username: user.username }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white"
            >
              {user.username[0]?.toUpperCase()}
            </Link>
          )}
          <button
            onClick={() => void logout()}
            className="text-sm text-gray-400 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 5: Layout protégé**

`front/src/routes/_authenticated.tsx` :

```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth.store.js'
import { Navbar } from '../components/layout/Navbar.js'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Vérifier que le frontend compile**

```bash
cd front && npm run build
```
Expected : build sans erreur TypeScript.

- [ ] **Step 7: Commit**

```bash
git add front/src/
git commit -m "feat(frontend): add landing, login, register pages, navbar, protected layout"
```

---

## Chunk 5: Déploiement

### Task 12: Docker Compose + variables d'environnement

**Files:**
- Modify: `deploy/compose.yaml`
- Create: `deploy/.env.example`

- [ ] **Step 1: Mettre à jour deploy/compose.yaml**

```yaml
services:
  frontend:
    build:
      context: ../front
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    profiles:
      - prod

  backend:
    build:
      context: ../back
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    profiles:
      - prod

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-gachapon}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-gachapon}
      POSTGRES_DB: ${POSTGRES_DB:-gachapon}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-gachapon}"]
      interval: 5s
      timeout: 5s
      retries: 5
    profiles:
      - db
      - prod

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    profiles:
      - db
      - prod

volumes:
  pg_data:
  redis_data:
```

- [ ] **Step 2: Créer deploy/.env.example**

```env
# Database
DATABASE_URL=postgresql://gachapon:gachapon@postgres:5432/gachapon
POSTGRES_USER=gachapon
POSTGRES_PASSWORD=gachapon
POSTGRES_DB=gachapon

# Redis
REDIS_URL=redis://redis:6379

# MinIO (external)
MINIO_ENDPOINT=https://minio.example.com
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=gachapon

# JWT (minimum 32 caractères)
JWT_SECRET=change_me_in_production_at_least_32_chars
JWT_REFRESH_SECRET=change_me_in_production_at_least_32_chars

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/oauth/google/callback
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/oauth/discord/callback

# App
FRONT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
PORT=3000

# Token config
TOKEN_REGEN_INTERVAL_HOURS=4
```

- [ ] **Step 3: Créer back/.env pour le développement local**

Créer `back/.env` (ne pas commiter — déjà dans .gitignore) :

```env
DATABASE_URL=postgresql://gachapon:gachapon@localhost:5432/gachapon
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=gachapon
JWT_SECRET=dev_secret_at_least_32_characters_ok
JWT_REFRESH_SECRET=dev_refresh_at_least_32_characters_ok
GOOGLE_CLIENT_ID=dev
GOOGLE_CLIENT_SECRET=dev
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/oauth/google/callback
DISCORD_CLIENT_ID=dev
DISCORD_CLIENT_SECRET=dev
DISCORD_REDIRECT_URI=http://localhost:3000/auth/oauth/discord/callback
FRONT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
PORT=3000
TOKEN_REGEN_INTERVAL_HOURS=4
```

- [ ] **Step 4: Tester le démarrage local**

```bash
cd deploy && docker compose --profile db up -d
cd back && npm run prisma:migrate:dev
cd back && npm run dev
```
Expected : serveur Fastify démarre sur port 3000 sans erreur de connexion.

- [ ] **Step 5: Commit**

```bash
git add deploy/compose.yaml deploy/.env.example
git commit -m "chore: update Docker Compose for Gachapon, add .env.example"
```
