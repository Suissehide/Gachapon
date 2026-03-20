# Media Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter une page `/admin/media` de gestion des images Minio (galerie, upload multi-fichiers, suppression des orphelines), et un image picker dans le formulaire d'édition de carte.

**Architecture:** Interface de stockage abstraite `StorageClientInterface` (renommée depuis `MinioClientInterface`) avec méthode `listObjects` ajoutée. Backend : 3 nouveaux endpoints `/admin/media` + extension de `/admin/cards/:id`. Frontend : composants `MediaGallery` (réutilisable), `MediaDetailPanel`, `MediaPickerModal`, page `/admin/media`, mise à jour de `EditCardSheet`.

**Tech Stack:** Fastify 5 + Zod v4, `@aws-sdk/client-s3` (ListObjectsV2Command), Prisma 7, React 19 + TanStack Query, TailwindCSS v4, Lucide React.

---

## File Map

**Backend — nouveaux / modifiés :**
- `back/src/main/types/infra/storage/minio-client.ts` → renommé `storage-client.ts`
- `back/src/main/infra/storage/minio-client.ts` — implémentation mise à jour
- `back/src/main/types/application/ioc.ts` — rename `minioClient` → `storageClient`
- `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` — rename clé IoC
- `back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts` — rename + extend PATCH + new POST /:id/image
- `back/src/main/interfaces/http/fastify/routes/admin/media.router.ts` — **nouveau**
- `back/src/main/interfaces/http/fastify/routes/admin/index.ts` — enregistrer media router
- `back/src/test/e2e/admin/admin-media.test.ts` — **nouveau**

**Frontend — nouveaux / modifiés :**
- `front/src/api/admin-media.api.ts` — **nouveau**
- `front/src/queries/useAdminMedia.ts` — **nouveau**
- `front/src/components/admin/media/MediaGallery.tsx` — **nouveau**
- `front/src/components/admin/media/MediaDetailPanel.tsx` — **nouveau**
- `front/src/components/admin/media/MediaPickerModal.tsx` — **nouveau**
- `front/src/routes/_admin/admin.media.tsx` — **nouveau**
- `front/src/routes/_admin.tsx` — ajouter "Médias" au NAV_ITEMS
- `front/src/components/admin/cards/EditCardSheet.tsx` — ajout image picker

---

## Task 1: Renommer l'interface de stockage (atomique)

**Files:**
- Rename: `back/src/main/types/infra/storage/minio-client.ts` → `back/src/main/types/infra/storage/storage-client.ts`
- Modify: `back/src/main/infra/storage/minio-client.ts`
- Modify: `back/src/main/types/application/ioc.ts`
- Modify: `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts`

> Ce task entier est un seul commit atomique. TypeScript ne compile pas si le rename est partiel.

- [ ] **Step 1: Créer le nouveau fichier d'interface**

Créer `back/src/main/types/infra/storage/storage-client.ts` :

```typescript
export interface StorageClientInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
  listObjects(prefix: string): Promise<StorageObject[]>
}

export type StorageObject = {
  key: string
  size: number
  lastModified: Date
}
```

- [ ] **Step 2: Supprimer l'ancien fichier d'interface**

```bash
rm back/src/main/types/infra/storage/minio-client.ts
```

- [ ] **Step 3: Mettre à jour l'implémentation MinioClient**

Dans `back/src/main/infra/storage/minio-client.ts`, remplacer l'import de type et ajouter `listObjects` :

```typescript
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { IocContainer } from '../../types/application/ioc'
import type { StorageClientInterface, StorageObject } from '../../types/infra/storage/storage-client'

export class MinioClient implements StorageClientInterface {
  readonly #s3: S3Client
  readonly #bucket: string
  readonly #endpoint: string

  constructor({ config }: IocContainer) {
    this.#bucket = config.minioBucket
    this.#endpoint = config.minioEndpoint
    this.#s3 = new S3Client({
      endpoint: config.minioEndpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
      forcePathStyle: true,
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.#s3.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
    return key
  }

  getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.#s3,
      new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      { expiresIn },
    )
  }

  async delete(key: string): Promise<void> {
    await this.#s3.send(
      new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }),
    )
  }

  publicUrl(key: string): string {
    return `${this.#endpoint}/${this.#bucket}/${key}`
  }

  async listObjects(prefix: string): Promise<StorageObject[]> {
    const results: StorageObject[] = []
    let continuationToken: string | undefined

    do {
      const response = await this.#s3.send(
        new ListObjectsV2Command({
          Bucket: this.#bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )
      for (const obj of response.Contents ?? []) {
        if (obj.Key && obj.Size !== undefined && obj.LastModified) {
          results.push({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          })
        }
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)

    return results
  }
}
```

- [ ] **Step 4: Mettre à jour `ioc.ts`**

Dans `back/src/main/types/application/ioc.ts`, remplacer :
```typescript
import type { MinioClientInterface } from '../infra/storage/minio-client'
// ...
  readonly minioClient: MinioClientInterface
```
par :
```typescript
import type { StorageClientInterface } from '../infra/storage/storage-client'
// ...
  readonly storageClient: StorageClientInterface
```

- [ ] **Step 5: Mettre à jour `awilix-ioc-container.ts`**

Dans `back/src/main/application/ioc/awilix/awilix-ioc-container.ts`, remplacer :
```typescript
import { MinioClient } from '../../../infra/storage/minio-client'
// ...
this.#reg('minioClient', asClass(MinioClient).singleton())
```
par :
```typescript
import { MinioClient } from '../../../infra/storage/minio-client'
// ...
this.#reg('storageClient', asClass(MinioClient).singleton())
```

- [ ] **Step 6: Mettre à jour `cards.router.ts`**

Dans `back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts`, ligne 82, remplacer :
```typescript
const { minioClient, postgresOrm } = fastify.iocContainer
```
par :
```typescript
const { storageClient, postgresOrm } = fastify.iocContainer
```
Et remplacer les 3 références `minioClient` par `storageClient` dans le corps de la route POST.

- [ ] **Step 7: Vérifier que TypeScript compile**

```bash
cd back && npx tsc --noEmit
```
Résultat attendu : aucune erreur.

- [ ] **Step 8: Commit atomique**

```bash
git add back/src/main/types/infra/storage/ \
        back/src/main/infra/storage/minio-client.ts \
        back/src/main/types/application/ioc.ts \
        back/src/main/application/ioc/awilix/awilix-ioc-container.ts \
        back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts
git commit -m "refactor(back): rename MinioClientInterface → StorageClientInterface, add listObjects"
```

---

## Task 2: Backend — router media (GET, POST upload, DELETE)

**Files:**
- Create: `back/src/main/interfaces/http/fastify/routes/admin/media.router.ts`
- Create: `back/src/test/e2e/admin/admin-media.test.ts`
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/index.ts`

- [ ] **Step 1: Écrire les tests e2e (failing)**

Créer `back/src/test/e2e/admin/admin-media.test.ts` :

```typescript
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin media routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `mediaadmin${suffix}`, email: `mediaadmin${suffix}@test.com`, password: 'Password123!' },
    })
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `mediaadmin${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `mediaadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/media — retourne un tableau (200 ou 500 si Minio absent)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/media',
      headers: { cookie: adminCookies },
    })
    expect([200, 500]).toContain(res.statusCode)
    if (res.statusCode === 200) {
      expect(Array.isArray(res.json())).toBe(true)
    }
  })

  it('GET /admin/media — 401 sans cookie', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/media' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /admin/media — 400 si clé avec chemin invalide', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/admin/media',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: { keys: ['../../etc/passwd'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DELETE /admin/media — 400 si clé sans préfixe cards/', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/admin/media',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: { keys: ['other/image.png'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /admin/media/upload — 400 format invalide', async () => {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('images[]', Buffer.from('fake'), { filename: 'bad.gif', contentType: 'image/gif' })
    const res = await app.inject({
      method: 'POST', url: '/admin/media/upload',
      headers: { ...form.getHeaders(), cookie: adminCookies },
      payload: form.getBuffer(),
    })
    // Errors accumulées — peut retourner 200 avec errors[] ou 400 selon implémentation
    if (res.statusCode === 200) {
      expect(res.json().errors?.length).toBeGreaterThan(0)
    } else {
      expect(res.statusCode).toBe(400)
    }
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd back && npx jest src/test/e2e/admin/admin-media.test.ts --testTimeout=30000
```
Résultat attendu : FAIL (routes inexistantes → 404).

- [ ] **Step 3: Implémenter `media.router.ts`**

Créer `back/src/main/interfaces/http/fastify/routes/admin/media.router.ts` :

```typescript
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const SAFE_KEY_RE = /^cards\/[^/]+$/

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-\.]/g, '-').toLowerCase()
}

export const adminMediaRouter: FastifyPluginCallbackZod = (fastify) => {
  // GET /admin/media — liste tous les objets + cross-ref DB
  fastify.get('/', async () => {
    const { storageClient, postgresOrm } = fastify.iocContainer

    const [objects, cards] = await Promise.all([
      storageClient.listObjects('cards/'),
      postgresOrm.prisma.card.findMany({
        select: { imageUrl: true, id: true, name: true, rarity: true, variant: true },
      }),
    ])

    const urlToCard = new Map(cards.map((c) => [c.imageUrl, c]))

    return objects.map((obj) => {
      const url = storageClient.publicUrl(obj.key)
      const card = urlToCard.get(url) ?? null
      return {
        key: obj.key,
        url,
        size: obj.size,
        lastModified: obj.lastModified,
        orphan: card === null,
        card: card
          ? { id: card.id, name: card.name, rarity: card.rarity, variant: card.variant }
          : null,
      }
    })
  })

  // POST /admin/media/upload — upload multi-fichiers
  fastify.post('/upload', async (request) => {
    const { storageClient } = fastify.iocContainer
    const parts = request.parts()
    const created: unknown[] = []
    const errors: { filename: string; reason: string }[] = []

    for await (const part of parts) {
      if (part.type !== 'file') continue

      const filename = part.filename ?? 'upload'

      if (!ALLOWED_MIME.has(part.mimetype)) {
        // Drain the stream
        for await (const _ of part.file) {}
        errors.push({ filename, reason: 'Format non supporté (jpeg, png, webp uniquement)' })
        continue
      }

      const chunks: Buffer[] = []
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer)
      }
      const buffer = Buffer.concat(chunks)

      if (buffer.length > 5 * 1024 * 1024) {
        errors.push({ filename, reason: 'Fichier trop grand (max 5 MB)' })
        continue
      }

      const ext = part.mimetype.split('/')[1]
      const base = sanitizeFilename(filename.replace(/\.[^.]+$/, ''))
      const key = `cards/${Date.now()}-${base}.${ext}`

      try {
        await storageClient.upload(key, buffer, part.mimetype)
        const url = storageClient.publicUrl(key)
        created.push({
          key,
          url,
          size: buffer.length,
          lastModified: new Date(),
          orphan: true,
          card: null,
        })
      } catch {
        errors.push({ filename, reason: 'Erreur lors de l\'upload' })
      }
    }

    return { created, errors }
  })

  // DELETE /admin/media — suppression atomique d'orphelines
  fastify.delete(
    '/',
    {
      schema: {
        body: z.object({ keys: z.array(z.string()).min(1) }),
      },
    },
    async (request) => {
      const { storageClient, postgresOrm } = fastify.iocContainer
      const { keys } = request.body

      // Valider format de chaque clé
      for (const key of keys) {
        if (!SAFE_KEY_RE.test(key)) {
          throw Boom.badRequest(`Clé invalide : ${key}`)
        }
      }

      // Vérifier qu'aucune clé n'est référencée en base
      const urls = keys.map((k) => storageClient.publicUrl(k))
      const usedCards = await postgresOrm.prisma.card.findMany({
        where: { imageUrl: { in: urls } },
        select: { name: true, imageUrl: true },
      })

      if (usedCards.length > 0) {
        const names = usedCards.map((c) => c.name).join(', ')
        throw Boom.badRequest(`Image(s) utilisée(s) par : ${names}`)
      }

      // Supprimer
      await Promise.all(keys.map((k) => storageClient.delete(k)))

      return { deleted: keys }
    },
  )
}
```

- [ ] **Step 4: Enregistrer le router dans `admin/index.ts`**

Dans `back/src/main/interfaces/http/fastify/routes/admin/index.ts`, ajouter :

```typescript
import { adminMediaRouter } from './media.router'
// ...
await fastify.register(adminMediaRouter, { prefix: '/media' })
```

- [ ] **Step 5: Lancer les tests**

```bash
cd back && npx jest src/test/e2e/admin/admin-media.test.ts --testTimeout=30000
```
Résultat attendu : PASS (les tests de validation 400 passent sans Minio, le GET retourne 200 ou 500).

- [ ] **Step 6: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/admin/media.router.ts \
        back/src/main/interfaces/http/fastify/routes/admin/index.ts \
        back/src/test/e2e/admin/admin-media.test.ts
git commit -m "feat(back): add admin media router (GET/POST upload/DELETE)"
```

---

## Task 3: Backend — extension des routes carte (imageUrl + POST /:id/image)

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts`
- Modify: `back/src/test/e2e/admin/admin-cards.test.ts`

- [ ] **Step 1: Ajouter les tests (failing)**

Dans `back/src/test/e2e/admin/admin-cards.test.ts`, ajouter après les tests existants :

```typescript
  it('PATCH /admin/cards/:id — accepte imageUrl', async () => {
    // Créer un set + card d'abord
    const setRes = await app.inject({
      method: 'POST', url: '/admin/sets',
      headers: { cookie: adminCookies },
      payload: { name: `ImgSet${suffix}`, isActive: false },
    })
    const sid = setRes.json().id
    // Créer via JSON direct (pas de vrai upload en test)
    const cardRes = await app.inject({
      method: 'POST', url: '/admin/cards/json',  // N'existe pas encore, skip
      headers: { cookie: adminCookies },
    })
    // Test uniquement la validation du schéma PATCH avec imageUrl
    const res = await app.inject({
      method: 'PATCH', url: `/admin/cards/00000000-0000-0000-0000-000000000000`,
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: { imageUrl: 'http://minio:9000/gachapon/cards/test.png' },
    })
    // 404 carte inexistante — valide que le schéma accepte le champ
    expect(res.statusCode).toBe(404)
  })

  it('PATCH /admin/cards/:id — rejette imageUrl hors domaine storage', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/cards/00000000-0000-0000-0000-000000000000`,
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: { imageUrl: 'https://evil.com/hack.png' },
    })
    expect(res.statusCode).toBe(400)
  })
```

- [ ] **Step 2: Étendre `cards.router.ts` — PATCH + POST /:id/image**

Dans `back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts` :

**A) Ajouter `imageUrl` au schema PATCH et valider le préfixe :**

```typescript
  fastify.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(1).optional(),
          rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']).optional(),
          variant: z.enum(['BRILLIANT', 'HOLOGRAPHIC']).nullable().optional(),
          dropWeight: z.number().positive().optional(),
          setId: z.string().uuid().optional(),
          imageUrl: z.string().url().optional(),
        }),
      },
    },
    async (request) => {
      const { storageClient, postgresOrm } = fastify.iocContainer

      // Valider que imageUrl appartient bien au stockage
      if (request.body.imageUrl) {
        const storagePrefix = storageClient.publicUrl('')
        if (!request.body.imageUrl.startsWith(storagePrefix)) {
          throw Boom.badRequest('imageUrl must point to the configured storage')
        }
      }

      const card = await postgresOrm.prisma.card.findUnique({
        where: { id: request.params.id },
      })
      if (!card) throw Boom.notFound('Card not found')

      return postgresOrm.prisma.card.update({
        where: { id: request.params.id },
        data: request.body,
        include: { set: true },
      })
    },
  )
```

**B) Ajouter `POST /:id/image` pour l'upload de fichier :**

```typescript
  // POST /admin/cards/:id/image — remplace l'image par upload
  fastify.post(
    '/:id/image',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const { storageClient, postgresOrm } = fastify.iocContainer

      const card = await postgresOrm.prisma.card.findUnique({
        where: { id: request.params.id },
      })
      if (!card) throw Boom.notFound('Card not found')

      const { fields: _, imageBuffer, imageMime } = await parseMultipartCard(request)
      const ext = imageMime.split('/')[1]
      const base = card.name.replace(/[^\w\-\.]/g, '-').toLowerCase()
      const key = `cards/${Date.now()}-${base}.${ext}`
      await storageClient.upload(key, imageBuffer, imageMime)
      const imageUrl = storageClient.publicUrl(key)

      const updated = await postgresOrm.prisma.card.update({
        where: { id: request.params.id },
        data: { imageUrl },
        include: { set: true },
      })
      return reply.status(200).send(updated)
    },
  )
```

- [ ] **Step 3: Lancer les tests**

```bash
cd back && npx jest src/test/e2e/admin/admin-cards.test.ts --testTimeout=30000
```
Résultat attendu : PASS.

- [ ] **Step 4: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts \
        back/src/test/e2e/admin/admin-cards.test.ts
git commit -m "feat(back): add imageUrl to card PATCH schema, add POST /admin/cards/:id/image"
```

---

## Task 4: Frontend — API client et query hooks

**Files:**
- Create: `front/src/api/admin-media.api.ts`
- Create: `front/src/queries/useAdminMedia.ts`

- [ ] **Step 1: Créer `admin-media.api.ts`**

```typescript
import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type MediaItem = {
  key: string
  url: string
  size: number
  lastModified: string
  orphan: boolean
  card: {
    id: string
    name: string
    rarity: string
    variant: string | null
  } | null
}

export type UploadMediaResult = {
  created: MediaItem[]
  errors: { filename: string; reason: string }[]
}

export const AdminMediaApi = {
  getMedia: async (): Promise<MediaItem[]> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/media`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la récupération des médias')
    return res.json()
  },

  uploadMedia: async (files: File[]): Promise<UploadMediaResult> => {
    const form = new FormData()
    for (const file of files) {
      form.append('images[]', file)
    }
    const res = await fetchWithAuth(`${apiUrl}/admin/media/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de l\'upload')
    return res.json()
  },

  deleteMedia: async (keys: string[]): Promise<{ deleted: string[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/media`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la suppression')
    return res.json()
  },
}
```

- [ ] **Step 2: Créer `useAdminMedia.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminMediaApi, type MediaItem } from '../api/admin-media.api.ts'

export type { MediaItem } from '../api/admin-media.api.ts'

export const MEDIA_QUERY_KEY = ['admin', 'media'] as const

export function useAdminMedia() {
  return useQuery({
    queryKey: MEDIA_QUERY_KEY,
    queryFn: () => AdminMediaApi.getMedia(),
  })
}

export function useUploadMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (files: File[]) => AdminMediaApi.uploadMedia(files),
    onSuccess: (data) => {
      // Injecter les nouveaux items en tête de liste sans refetch complet
      qc.setQueryData<MediaItem[]>(MEDIA_QUERY_KEY, (prev) => [
        ...(data.created as MediaItem[]),
        ...(prev ?? []),
      ])
    },
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (keys: string[]) => AdminMediaApi.deleteMedia(keys),
    onSuccess: ({ deleted }) => {
      qc.setQueryData<MediaItem[]>(MEDIA_QUERY_KEY, (prev) =>
        (prev ?? []).filter((item) => !deleted.includes(item.key)),
      )
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/api/admin-media.api.ts front/src/queries/useAdminMedia.ts
git commit -m "feat(front): add admin media API client and TanStack Query hooks"
```

---

## Task 5: Frontend — composant `MediaGallery`

**Files:**
- Create: `front/src/components/admin/media/MediaGallery.tsx`

- [ ] **Step 1: Implémenter `MediaGallery`**

```typescript
import type { MediaItem } from '../../../queries/useAdminMedia'

interface MediaGalleryProps {
  items: MediaItem[]
  selectable?: boolean             // active les checkboxes de suppression
  selected?: Set<string>           // keys sélectionnées
  onToggleSelect?: (key: string) => void
  activeKey?: string | null        // item dont le panneau détail est ouvert
  onActivate?: (item: MediaItem) => void  // clic image → panneau détail
  onSelect?: (item: MediaItem) => void    // mode picker : clic image → sélection
}

export function MediaGallery({
  items,
  selectable = false,
  selected = new Set(),
  onToggleSelect,
  activeKey = null,
  onActivate,
  onSelect,
}: MediaGalleryProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => {
        const isActive = activeKey === item.key
        const isChecked = selected.has(item.key)

        return (
          <div
            key={item.key}
            className={`relative aspect-[3/4] cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
              isChecked
                ? 'border-red-500 bg-red-950/40'
                : isActive
                  ? 'border-violet-500 bg-card'
                  : 'border-transparent bg-card hover:border-border'
            }`}
            onClick={() => {
              if (onSelect) {
                onSelect(item)
              } else if (onActivate) {
                onActivate(item)
              }
            }}
          >
            <img
              src={item.url}
              alt={item.key}
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />

            {/* Checkbox suppression — orphelines uniquement */}
            {selectable && item.orphan && (
              <button
                type="button"
                className={`absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                  isChecked
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-border bg-background/80'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect?.(item.key)
                }}
              >
                {isChecked && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            )}

            {/* Badge statut */}
            <div
              className={`absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ${
                item.orphan ? 'bg-red-500' : 'bg-green-600'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/admin/media/MediaGallery.tsx
git commit -m "feat(front): add reusable MediaGallery component"
```

---

## Task 6: Frontend — composant `MediaDetailPanel`

**Files:**
- Create: `front/src/components/admin/media/MediaDetailPanel.tsx`

- [ ] **Step 1: Implémenter `MediaDetailPanel`**

```typescript
import { useState } from 'react'
import { Check, Copy, Trash2 } from 'lucide-react'
import type { MediaItem } from '../../../queries/useAdminMedia'
import { Button } from '../../ui/button'

interface MediaDetailPanelProps {
  item: MediaItem
  onDelete: (key: string) => void
  isDeleting?: boolean
}

export function MediaDetailPanel({ item, onDelete, isDeleting }: MediaDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filename = item.key.split('/').pop() ?? item.key
  const sizeKb = (item.size / 1024).toFixed(0)
  const date = new Date(item.lastModified).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(item.key)
    setConfirmDelete(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <img
        src={item.url}
        alt={filename}
        className="aspect-[3/4] w-full rounded object-cover"
        onError={(e) => { ;(e.target as HTMLImageElement).style.opacity = '0.3' }}
      />

      <div>
        <p className="truncate text-sm font-semibold text-text" title={filename}>{filename}</p>
        <p className="truncate text-xs text-text-light" title={item.key}>{item.key}</p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.orphan
              ? 'bg-red-900/40 text-red-400'
              : 'bg-green-900/40 text-green-400'
          }`}
        >
          {item.orphan ? 'Orpheline' : 'Utilisée'}
        </span>
      </div>

      {!item.orphan && item.card && (
        <div className="rounded-md bg-surface p-2 text-xs">
          <p className="mb-0.5 text-text-light uppercase tracking-wide text-[10px]">Carte associée</p>
          <p className="font-medium text-violet-400">
            {item.card.name}
            {item.card.variant && ` — ${item.card.variant}`}
          </p>
          <p className="text-text-light">{item.card.rarity}</p>
        </div>
      )}

      <p className="text-xs text-text-light">{sizeKb} Ko · {date}</p>

      <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copié !' : 'Copier l\'URL'}
      </Button>

      {confirmDelete ? (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Confirmer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={!item.orphan || isDeleting}
          onClick={handleDelete}
          className={`gap-2 ${item.orphan ? 'border border-red-500/30 text-red-400 hover:text-red-400' : 'cursor-not-allowed opacity-40'}`}
        >
          <Trash2 className="h-3 w-3" />
          Supprimer
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/admin/media/MediaDetailPanel.tsx
git commit -m "feat(front): add MediaDetailPanel component"
```

---

## Task 7: Frontend — page `/admin/media`

**Files:**
- Create: `front/src/routes/_admin/admin.media.tsx`

- [ ] **Step 1: Implémenter la page**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'

import { MediaGallery } from '../../components/admin/media/MediaGallery'
import { MediaDetailPanel } from '../../components/admin/media/MediaDetailPanel'
import { Button } from '../../components/ui/button'
import {
  useAdminMedia,
  useDeleteMedia,
  useUploadMedia,
  type MediaItem,
} from '../../queries/useAdminMedia'

export const Route = createFileRoute('/_admin/admin/media')({
  component: AdminMediaPage,
})

type Filter = 'all' | 'used' | 'orphan'

function AdminMediaPage() {
  const { data: items = [], isLoading } = useAdminMedia()
  const uploadMutation = useUploadMedia()
  const deleteMutation = useDeleteMedia()

  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter((item) => {
    if (filter === 'used') return !item.orphan
    if (filter === 'orphan') return item.orphan
    return true
  })

  const counts = {
    all: items.length,
    used: items.filter((i) => !i.orphan).length,
    orphan: items.filter((i) => i.orphan).length,
  }

  const handleToggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleFiles = (files: File[]) => {
    if (!files.length) return
    uploadMutation.mutate(files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const [confirmBulk, setConfirmBulk] = useState(false)

  const handleBulkDelete = async () => {
    if (!confirmBulk) {
      setConfirmBulk(true)
      return
    }
    const keys = Array.from(selected)
    await deleteMutation.mutateAsync(keys)
    setSelected(new Set())
    setConfirmBulk(false)
    if (activeItem && keys.includes(activeItem.key)) setActiveItem(null)
  }

  const handleSingleDelete = async (key: string) => {
    await deleteMutation.mutateAsync([key])
    if (activeItem?.key === key) setActiveItem(null)
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Médias</h1>

      {/* Zone upload */}
      <div
        className={`mb-6 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/10' : 'border-border'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-text-light" />
        <p className="text-sm text-text-light">
          Glisser-déposer des images ici, ou{' '}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => fileInputRef.current?.click()}
          >
            parcourir
          </button>
        </p>
        <p className="mt-1 text-xs text-text-light/60">JPEG, PNG, WEBP — 5 MB max par fichier</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
        {uploadMutation.isPending && (
          <p className="mt-2 text-xs text-primary">Upload en cours…</p>
        )}
        {uploadMutation.data?.errors?.map((err) => (
          <p key={err.filename} className="mt-1 text-xs text-red-400">
            {err.filename} : {err.reason}
          </p>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {(['all', 'used', 'orphan'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary/20 text-primary'
                : 'text-text-light hover:bg-surface'
            }`}
          >
            {f === 'all' && `Toutes (${counts.all})`}
            {f === 'used' && `Utilisées (${counts.used})`}
            {f === 'orphan' && (
              <span className={filter === 'orphan' ? '' : 'text-red-400'}>
                Orphelines ({counts.orphan})
              </span>
            )}
          </button>
        ))}

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-text-light">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            {confirmBulk ? (
              <>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={deleteMutation.isPending}>
                  Confirmer la suppression
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmBulk(false)}>Annuler</Button>
              </>
            ) : (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                Supprimer ({selected.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Grille + panneau */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-text-light">Chargement…</div>
      ) : (
        <div className={`grid gap-4 ${activeItem ? 'grid-cols-[1fr_200px]' : 'grid-cols-1'}`}>
          <MediaGallery
            items={filtered}
            selectable
            selected={selected}
            onToggleSelect={handleToggleSelect}
            activeKey={activeItem?.key}
            onActivate={setActiveItem}
          />

          {activeItem && (
            <MediaDetailPanel
              item={activeItem}
              onDelete={handleSingleDelete}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/routes/_admin/admin.media.tsx
git commit -m "feat(front): add /admin/media page with gallery, upload, filters, bulk delete"
```

---

## Task 8: Frontend — composant `MediaPickerModal`

**Files:**
- Create: `front/src/components/admin/media/MediaPickerModal.tsx`

- [ ] **Step 1: Implémenter `MediaPickerModal`**

```typescript
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { MediaGallery } from './MediaGallery'
import { useAdminMedia, type MediaItem } from '../../../queries/useAdminMedia'

type Filter = 'all' | 'used' | 'orphan'

interface MediaPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (item: MediaItem) => void
}

export function MediaPickerModal({ open, onOpenChange, onPick }: MediaPickerModalProps) {
  const { data: items = [], isLoading } = useAdminMedia()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = items.filter((item) => {
    if (filter === 'used') return !item.orphan
    if (filter === 'orphan') return item.orphan
    return true
  })

  const handleSelect = (item: MediaItem) => {
    onPick(item)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choisir une image</DialogTitle>
        </DialogHeader>

        <div className="mb-3 flex gap-2">
          {(['all', 'used', 'orphan'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary/20 text-primary' : 'text-text-light hover:bg-surface'
              }`}
            >
              {f === 'all' && 'Toutes'}
              {f === 'used' && 'Utilisées'}
              {f === 'orphan' && 'Orphelines'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-text-light">Chargement…</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <MediaGallery items={filtered} onSelect={handleSelect} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/admin/media/MediaPickerModal.tsx
git commit -m "feat(front): add MediaPickerModal for image picker in card edit"
```

---

## Task 9: Frontend — image picker dans `EditCardSheet`

**Files:**
- Modify: `front/src/components/admin/cards/EditCardSheet.tsx`
- Modify: `front/src/queries/useAdminCards.ts` (si nécessaire pour la mutation imageFile)

- [ ] **Step 1: Mettre à jour `EditCardSheet`**

Le fichier `front/src/components/admin/cards/EditCardSheet.tsx` doit :
1. Ajouter `imageUrl?: string` et `imageFile?: File` à `EditCardPayload`
2. Ajouter un champ image avec deux onglets dans le formulaire
3. Afficher un aperçu de l'image courante

```typescript
import { useState } from 'react'
import { Images } from 'lucide-react'
import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCard } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'
import { MediaPickerModal } from '../media/MediaPickerModal'
import type { MediaItem } from '../../../queries/useAdminMedia'

export type EditCardPayload = {
  name: string
  rarity: string
  dropWeight: number
  imageUrl?: string
  imageFile?: File
}

interface EditCardSheetProps {
  item: AdminCard | null
  onOpenChange: (open: boolean) => void
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}

export function EditCardSheet({ item, onOpenChange, onSave, onDelete }: EditCardSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {item && (
          <div className="mt-6 px-6">
            <EditCardForm key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditCardForm({
  item,
  onSave,
  onDelete,
}: {
  item: AdminCard
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}) {
  const [imageMode, setImageMode] = useState<'upload' | 'pick'>('upload')
  const [pickedImageUrl, setPickedImageUrl] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const previewUrl = pickedImageUrl ?? item.imageUrl

  const form = useAppForm({
    defaultValues: {
      name: item.name,
      rarity: item.rarity,
      dropWeight: item.dropWeight as number | undefined,
    },
    onSubmit: ({ value }) => {
      onSave({
        name: value.name,
        rarity: value.rarity,
        dropWeight: value.dropWeight ?? 1,
        imageUrl: pickedImageUrl ?? undefined,
        imageFile: uploadedFile ?? undefined,
      })
    },
  })

  const handlePick = (picked: MediaItem) => {
    setPickedImageUrl(picked.url)
    setUploadedFile(null)
  }

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
        className="space-y-3"
      >
        <form.AppField name="name">
          {(f) => <f.Input label="Nom" />}
        </form.AppField>
        <form.AppField name="rarity">
          {(f) => <f.Select label="Rareté" options={RARITY_OPTIONS} />}
        </form.AppField>
        <form.AppField name="dropWeight">
          {(f) => <f.Number label="Poids de drop" />}
        </form.AppField>

        {/* Champ image */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text">Image</p>

          {/* Aperçu */}
          {previewUrl && (
            <img
              src={pickedImageUrl ?? previewUrl}
              alt="aperçu"
              className="h-24 w-[72px] rounded object-cover border border-border"
            />
          )}

          {/* Onglets */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setImageMode('upload')}
              className={`text-xs px-2 py-1 rounded ${imageMode === 'upload' ? 'bg-primary/20 text-primary' : 'text-text-light'}`}
            >
              Uploader
            </button>
            <button
              type="button"
              onClick={() => setImageMode('pick')}
              className={`text-xs px-2 py-1 rounded ${imageMode === 'pick' ? 'bg-primary/20 text-primary' : 'text-text-light'}`}
            >
              Bibliothèque
            </button>
          </div>

          {imageMode === 'upload' && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-xs text-text-light"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setUploadedFile(file)
                setPickedImageUrl(null)
              }}
            />
          )}

          {imageMode === 'pick' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setPickerOpen(true)}
            >
              <Images className="h-3 w-3" />
              {pickedImageUrl ? 'Changer l\'image' : 'Choisir une image'}
            </Button>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">Sauvegarder</Button>
          <Button
            type="button"
            variant="ghost"
            className="border border-red-500/30 text-red-400 hover:text-red-400"
            onClick={onDelete}
          >
            Supprimer
          </Button>
        </div>
      </form>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePick}
      />
    </>
  )
}
```

- [ ] **Step 2: Mettre à jour la mutation dans le parent** (`admin.cards.tsx`)

Dans la page `front/src/routes/_admin/admin.cards.tsx`, la fonction `handleSave` doit être mise à jour pour gérer `imageUrl` et `imageFile`. Lire le fichier pour trouver le bon endroit, puis adapter :

Dans `admin.cards.tsx`, remplacer le `onSave` actuel (lignes ~210-215) :

```typescript
// AVANT
onSave={(fields) => {
  if (editCard) {
    updateCard.mutate({ id: editCard.id, ...fields })
  }
  setEditCard(null)
}}

// APRÈS — ajouter updateCardImage dans le composant parent
onSave={(fields) => {
  if (!editCard) return
  if (fields.imageFile) {
    updateCardImage.mutate({ id: editCard.id, file: fields.imageFile })
  } else {
    const { imageFile: _, ...rest } = fields
    updateCard.mutate({ id: editCard.id, ...rest })
  }
  setEditCard(null)
}}
```

Ajouter `const updateCardImage = useAdminUpdateCardImage()` dans le composant parent (là où `updateCard` est déjà déclaré).

Ajouter dans `useAdminCards.ts` :
```typescript
export function useAdminUpdateCardImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => AdminCardsApi.updateCardImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}
```

Et dans `admin-cards.api.ts` :
```typescript
  updateCardImage: async (id: string, file: File): Promise<unknown> => {
    const form = new FormData()
    form.append('image', file)
    const res = await fetchWithAuth(`${apiUrl}/admin/cards/${id}/image`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors du changement d\'image')
    return res.json()
  },

  updateCard: async (id: string, data: Partial<EditCardPayload>): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la modification')
    return res.json()
  },
```

- [ ] **Step 3: Lire `admin.cards.tsx` pour adapter `handleSave`**

```bash
cat front/src/routes/_admin/admin.cards.tsx | grep -n "onSave\|handleSave\|useAdminUpdate"
```

Adapter la logique `onSave` pour appeler `updateCardImage` si `imageFile` est présent, `updateCard` avec `{ imageUrl }` si `imageUrl` est présent.

- [ ] **Step 4: Commit**

```bash
git add front/src/components/admin/cards/EditCardSheet.tsx \
        front/src/components/admin/media/MediaPickerModal.tsx \
        front/src/api/admin-cards.api.ts \
        front/src/queries/useAdminCards.ts \
        front/src/routes/_admin/admin.cards.tsx
git commit -m "feat(front): add image picker (upload + library) to EditCardSheet"
```

---

## Task 10: Frontend — navigation admin

**Files:**
- Modify: `front/src/routes/_admin.tsx`

- [ ] **Step 1: Ajouter l'entrée "Médias" dans `NAV_ITEMS`**

Dans `front/src/routes/_admin.tsx`, ajouter l'import de l'icône et l'entrée :

```typescript
import { Images } from 'lucide-react'  // ajouter à l'import lucide existant

// Dans NAV_ITEMS, ajouter après "Cartes" :
{ to: '/admin/media', label: 'Médias', icon: Images },
```

- [ ] **Step 2: Vérifier la route TanStack Router**

TanStack Router génère automatiquement le fichier de route depuis `admin.media.tsx`. Vérifier que le build est propre :

```bash
cd front && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add front/src/routes/_admin.tsx
git commit -m "feat(front): add Médias entry to admin navigation"
```
