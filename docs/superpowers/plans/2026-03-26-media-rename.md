# Media Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to rename media files from the MediaDetailPanel sidepanel, with automatic card `imageUrl` update and 409 conflict protection.

**Architecture:** Backend adds `exists()` and `copy()` to the storage interface, then a new `PATCH /admin/media/rename` route copies the S3 object under the new key, deletes the old one, and updates any linked card. Frontend adds an inline pencil-icon edit inside the Metadata card of MediaDetailPanel, wired through `onRename: (from, newName) => Promise<void>` props from the page.

**Tech Stack:** Fastify + Prisma + Zod (backend), AWS SDK v3 `CopyObjectCommand`/`HeadObjectCommand`, React + TanStack Query + lucide-react (frontend)

---

### Task 1: Storage layer — export `sanitizeName`, add `exists` + `copy`

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/card-image.helpers.ts`
- Modify: `back/src/main/types/infra/storage/storage-client.ts`
- Modify: `back/src/main/infra/storage/minio-client.ts`

- [ ] **Step 1: Export `sanitizeName` from helpers**

In `card-image.helpers.ts` line 12, change `function sanitizeName` to `export function sanitizeName`. It is currently private; the rename route needs it.

```ts
// back/src/main/interfaces/http/fastify/routes/admin/card-image.helpers.ts
export function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\-.]/g, '-')
    .toLowerCase()
}
```

- [ ] **Step 2: Add `exists` and `copy` to `StorageClientInterface`**

```ts
// back/src/main/types/infra/storage/storage-client.ts
export interface StorageClientInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
  listObjects(prefix: string): Promise<StorageObject[]>
  exists(key: string): Promise<boolean>
  copy(sourceKey: string, destKey: string): Promise<void>
}
```

- [ ] **Step 3: Implement `exists` and `copy` in `MinioClient`**

Add `CopyObjectCommand` and `HeadObjectCommand` to the existing import from `@aws-sdk/client-s3`. Then add the two methods:

```ts
// back/src/main/infra/storage/minio-client.ts
// Updated import (add CopyObjectCommand, HeadObjectCommand):
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

// Add after the existing delete() method:
async exists(key: string): Promise<boolean> {
  try {
    await this.#s3.send(new HeadObjectCommand({ Bucket: this.#bucket, Key: key }))
    return true
  } catch (err) {
    if (
      err instanceof Error &&
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
    ) {
      return false
    }
    throw err
  }
}

async copy(sourceKey: string, destKey: string): Promise<void> {
  await this.#s3.send(
    new CopyObjectCommand({
      Bucket: this.#bucket,
      CopySource: `${this.#bucket}/${sourceKey}`,
      Key: destKey,
    }),
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/admin/card-image.helpers.ts \
        back/src/main/types/infra/storage/storage-client.ts \
        back/src/main/infra/storage/minio-client.ts
git commit -m "feat(storage): add exists() and copy() to storage interface and MinioClient"
```

---

### Task 2: Backend — write failing e2e tests for PATCH /admin/media/rename

**Files:**
- Modify: `back/src/test/e2e/admin/admin-media.test.ts`

The existing test file already has a `describe('Admin media routes')` block with `app`, `adminCookies`, and `suffix` set up in `beforeAll`. Add the following tests at the end of that describe block. These tests do NOT need real MinIO — they test validation logic that runs before any storage call.

- [ ] **Step 1: Add tests**

```ts
// Append inside the existing describe block in admin-media.test.ts

it('PATCH /admin/media/rename — 401 sans cookie', async () => {
  const res = await app.inject({
    method: 'PATCH', url: '/admin/media/rename',
    headers: { 'content-type': 'application/json' },
    payload: { from: 'cards/foo.png', newName: 'bar' },
  })
  expect(res.statusCode).toBe(401)
})

it('PATCH /admin/media/rename — 400 si from a un chemin invalide', async () => {
  const res = await app.inject({
    method: 'PATCH', url: '/admin/media/rename',
    headers: { cookie: adminCookies, 'content-type': 'application/json' },
    payload: { from: '../../etc/passwd', newName: 'bar' },
  })
  expect(res.statusCode).toBe(400)
})

it('PATCH /admin/media/rename — 400 si newName contient un point', async () => {
  const res = await app.inject({
    method: 'PATCH', url: '/admin/media/rename',
    headers: { cookie: adminCookies, 'content-type': 'application/json' },
    payload: { from: 'cards/foo.png', newName: 'my.file' },
  })
  expect(res.statusCode).toBe(400)
})

it('PATCH /admin/media/rename — 400 si newName vide après sanitization', async () => {
  const res = await app.inject({
    method: 'PATCH', url: '/admin/media/rename',
    headers: { cookie: adminCookies, 'content-type': 'application/json' },
    payload: { from: 'cards/foo.png', newName: '---' },
  })
  expect(res.statusCode).toBe(400)
})

it('PATCH /admin/media/rename — 400 si le nom est identique', async () => {
  const res = await app.inject({
    method: 'PATCH', url: '/admin/media/rename',
    headers: { cookie: adminCookies, 'content-type': 'application/json' },
    payload: { from: 'cards/foo.png', newName: 'foo' },
  })
  expect(res.statusCode).toBe(400)
})
```

- [ ] **Step 2: Run tests to confirm they all fail (route doesn't exist yet)**

```bash
cd back
NODE_OPTIONS="--experimental-vm-modules" npx jest --config src/test/jest.config.ts \
  --testPathPatterns="e2e/admin/admin-media" --no-coverage 2>&1 | tail -30
```

Expected: the 5 new tests fail with 404 (route not found), the existing tests still pass.

---

### Task 3: Backend — implement PATCH /admin/media/rename route

**Files:**
- Modify: `back/src/main/interfaces/http/fastify/routes/admin/media.router.ts`

- [ ] **Step 1: Add the `sanitizeName` import to media.router.ts**

The file currently imports from `./card-image.helpers`:
```ts
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_SIZE, uploadCardImage } from './card-image.helpers'
```
Update it to also import `sanitizeName`:
```ts
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_SIZE, sanitizeName, uploadCardImage } from './card-image.helpers'
```

- [ ] **Step 2: Add the rename route inside `adminMediaRouter`**

Add after the DELETE route (before the closing `}`):

```ts
// PATCH /admin/media/rename — renomme un objet storage + met à jour la carte liée
fastify.patch(
  '/rename',
  {
    schema: {
      body: z.object({ from: z.string(), newName: z.string() }),
    },
  },
  async (request) => {
    const { storageClient, postgresOrm } = fastify.iocContainer
    const { from, newName } = request.body

    // 1. Valider format de `from`
    if (!SAFE_KEY_RE.test(from)) {
      throw Boom.badRequest('Clé invalide')
    }

    // 2. Rejeter les points dans newName (évite double extension)
    if (newName.includes('.')) {
      throw Boom.badRequest('Le nom ne peut pas contenir de point')
    }

    // 3. Sanitize
    const sanitized = sanitizeName(newName)
    if (!sanitized || sanitized.replace(/-/g, '').length === 0) {
      throw Boom.badRequest('Nom invalide')
    }

    // 4. Reconstruire la clé destination
    const ext = from.split('.').pop()
    const to = `cards/${sanitized}.${ext}`

    // 5. No-op
    if (to === from) {
      throw Boom.badRequest('Le nom est identique')
    }

    // 6. Vérifier que la source existe
    if (!(await storageClient.exists(from))) {
      throw Boom.notFound('Média introuvable')
    }

    // 7. Vérifier que la destination est libre
    if (await storageClient.exists(to)) {
      throw Boom.conflict('Ce nom est déjà utilisé')
    }

    // 8. Copier
    await storageClient.copy(from, to)

    // 9. Supprimer la source (best-effort — un orphelin est acceptable)
    try {
      await storageClient.delete(from)
    } catch (deleteErr) {
      request.log.warn({ err: deleteErr, key: from }, 'Failed to delete source after copy — key becomes orphaned')
    }

    // 10. Mettre à jour la carte liée si présente
    const oldUrl = storageClient.publicUrl(from)
    const newUrl = storageClient.publicUrl(to)
    await postgresOrm.prisma.card.updateMany({
      where: { imageUrl: oldUrl },
      data: { imageUrl: newUrl },
    })

    return { key: to, url: newUrl }
  },
)
```

- [ ] **Step 3: Run the tests — all should pass now**

```bash
cd back
NODE_OPTIONS="--experimental-vm-modules" npx jest --config src/test/jest.config.ts \
  --testPathPatterns="e2e/admin/admin-media" --no-coverage 2>&1 | tail -20
```

Expected: all tests in `admin-media.test.ts` pass (the new rename tests validate routing + input validation; storage calls are skipped since MinIO isn't running in test env and the validation happens before any storage call).

- [ ] **Step 4: Commit**

```bash
git add back/src/main/interfaces/http/fastify/routes/admin/media.router.ts \
        back/src/test/e2e/admin/admin-media.test.ts
git commit -m "feat(admin/media): add PATCH /admin/media/rename endpoint"
```

---

### Task 4: Frontend API layer + query hook

**Files:**
- Modify: `front/src/api/admin-media.api.ts`
- Modify: `front/src/queries/useAdminMedia.ts`

- [ ] **Step 1: Add `renameMedia` to `AdminMediaApi`**

Add after `deleteMedia` in `admin-media.api.ts`:

```ts
renameMedia: async (from: string, newName: string): Promise<{ key: string; url: string }> => {
  const res = await fetchWithAuth(`${apiUrl}/admin/media/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, newName }),
  })
  if (!res.ok) {
    handleHttpError(res, {}, 'Erreur lors du renommage')
  }
  return res.json()
},
```

- [ ] **Step 2: Add `useRenameMedia` hook to `useAdminMedia.ts`**

Add at the end of the file. On success, invalidate the media query so the gallery refetches fresh data from the server. The `activeItem` panel update is handled separately in the page component (Task 6).

```ts
export function useRenameMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ from, newName }: { from: string; newName: string }) =>
      AdminMediaApi.renameMedia(from, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/api/admin-media.api.ts front/src/queries/useAdminMedia.ts
git commit -m "feat(admin/media): add renameMedia API function and useRenameMedia hook"
```

---

### Task 5: MediaDetailPanel — inline rename UI

**Files:**
- Modify: `front/src/components/admin/media/MediaDetailPanel.tsx`

The panel currently shows the filename at lines 113-118 inside the Metadata `<Card>`. We add:
- `onRename` and `isRenaming` props
- `isEditing`, `renameValue`, `renameError` local state
- Pencil icon next to the filename to enter edit mode
- Input + Save/Cancel controls replacing the filename text when editing

- [ ] **Step 1: Update the props interface and imports**

The current file (`MediaDetailPanel.tsx`) already imports `Check` from lucide-react and `useState` from react — **do not add them again**. Make these targeted changes:

**a) Add `Pencil` and `X` to the existing lucide-react import** (line 1). The result should be:
```tsx
import { Check, Copy, ExternalLink, FileImage, Pencil, Plus, Trash2, X } from 'lucide-react'
```

**b) Add two new import lines after the existing `import { useState } from 'react'`:**
```tsx
import { isApiError } from '../../../libs/httpErrorHandler'
import { useToast } from '../../../hooks/useToast'
```

**c) Add `Input` to the existing ui imports** (after the `Card` import):
```tsx
import { Input } from '../../ui/input'
```

**d) Update the props interface** (replace the existing `MediaDetailPanelProps`):
```tsx
interface MediaDetailPanelProps {
  item: MediaItem
  onDelete: (key: string) => void
  isDeleting?: boolean
  onCreateCard?: () => void
  onRename: (from: string, newName: string) => Promise<void>
  isRenaming?: boolean
}
```

- [ ] **Step 2: Add rename state and handlers inside the component**

After the existing `copied` and `confirmDelete` state declarations, add:

```tsx
const { toast } = useToast()
const [isEditing, setIsEditing] = useState(false)
const [renameValue, setRenameValue] = useState('')
const [renameError, setRenameError] = useState<string | null>(null)

// filename without extension, used to pre-fill the input
const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

const handleStartEdit = () => {
  setRenameValue(nameWithoutExt)
  setRenameError(null)
  setIsEditing(true)
}

const handleCancelEdit = () => {
  setIsEditing(false)
  setRenameError(null)
}

const handleSubmitRename = async () => {
  const trimmed = renameValue.trim()
  if (!trimmed || trimmed === nameWithoutExt) {
    handleCancelEdit()
    return
  }
  try {
    await onRename(item.key, trimmed)
    setIsEditing(false)
    setRenameError(null)
  } catch (err) {
    if (isApiError(err) && err.status === 409) {
      setRenameError('Ce nom est déjà utilisé')
    } else {
      setIsEditing(false)
      toast({
        title: 'Erreur',
        message: err instanceof Error ? err.message : 'Erreur lors du renommage',
        severity: 'error',
      })
    }
  }
}
```

- [ ] **Step 3: Replace the filename display section with the inline edit UI**

Find the filename block inside the Metadata `<Card>` (currently lines ~113-118):

```tsx
<p
  className="truncate text-sm font-semibold text-text"
  title={filename}
>
  {filename}
</p>
```

Replace with:

```tsx
{isEditing ? (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5">
      <Input
        value={renameValue}
        onChange={(e) => {
          setRenameValue(e.target.value)
          setRenameError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmitRename()
          if (e.key === 'Escape') handleCancelEdit()
        }}
        disabled={isRenaming}
        className="h-7 text-sm"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSubmitRename}
        disabled={isRenaming}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-green-400 hover:bg-green-400/10 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={handleCancelEdit}
        disabled={isRenaming}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-light hover:bg-muted disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
    {renameError && (
      <p className="text-[11px] text-red-400">{renameError}</p>
    )}
  </div>
) : (
  <div className="group flex items-center gap-1.5">
    <p className="truncate text-sm font-semibold text-text" title={filename}>
      {filename}
    </p>
    <button
      type="button"
      onClick={handleStartEdit}
      className="shrink-0 text-text-light opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
      title="Renommer"
    >
      <Pencil className="h-3 w-3" />
    </button>
  </div>
)}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd front
npx tsc --noEmit 2>&1 | grep -i "MediaDetailPanel\|admin-media\|useAdminMedia" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add front/src/components/admin/media/MediaDetailPanel.tsx
git commit -m "feat(admin/media): add inline rename UI to MediaDetailPanel"
```

---

### Task 6: Wire rename in admin.media.tsx

**Files:**
- Modify: `front/src/routes/_admin/admin.media.tsx`

- [ ] **Step 1: Import `useRenameMedia`**

In the existing import from `../../queries/useAdminMedia`, add `useRenameMedia`:

```ts
import {
  type MediaItem,
  useAdminMedia,
  useDeleteMedia,
  useRenameMedia,
  useUploadMedia,
} from '../../queries/useAdminMedia'
```

- [ ] **Step 2: Instantiate the mutation and add `handleRename`**

After `const deleteMutation = useDeleteMedia()`, add:

```ts
const renameMutation = useRenameMedia()

const handleRename = async (from: string, newName: string) => {
  const result = await renameMutation.mutateAsync({ from, newName })
  setActiveItem((prev) => (prev ? { ...prev, key: result.key, url: result.url } : prev))
}
```

- [ ] **Step 3: Pass props to `<MediaDetailPanel>`**

Find the current `<MediaDetailPanel>` usage (around line 280) and add `onRename` and `isRenaming`:

```tsx
<MediaDetailPanel
  key={activeItem.key}
  item={activeItem}
  onDelete={handleSingleDelete}
  isDeleting={deleteMutation.isPending}
  onCreateCard={() => setCreateCardOpen(true)}
  onRename={handleRename}
  isRenaming={renameMutation.isPending}
/>
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd front
npx tsc --noEmit 2>&1 | grep -i "admin.media\|MediaDetailPanel" | head -20
```

Expected: no errors.

- [ ] **Step 5: Run full e2e suite to confirm nothing is broken**

```bash
cd back
NODE_OPTIONS="--experimental-vm-modules" npx jest --config src/test/jest.config.ts \
  --testPathPatterns="e2e" --no-coverage --runInBand 2>&1 | grep -E "^(PASS|FAIL|Tests:|Test Suites:)"
```

Expected: all suites pass.

- [ ] **Step 6: Final commit**

```bash
git add front/src/routes/_admin/admin.media.tsx
git commit -m "feat(admin/media): wire rename mutation in admin media page"
```
