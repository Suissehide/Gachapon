# Media Rename Feature — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Overview

Allow admins to rename media files directly from the MediaDetailPanel sidepanel. Renaming performs a copy+delete in S3-compatible storage and updates any linked card's `imageUrl` automatically.

## Backend

### Storage Interface (`storage-client.ts`)

Add to `StorageClientInterface`:
```ts
copy(sourceKey: string, destKey: string): Promise<void>
```

### Storage Implementation (`minio-client.ts`)

Implement `copy(sourceKey, destKey)` using `CopyObjectCommand`. Source existence is checked separately via `HeadObjectCommand` in the route handler — the `copy` method itself does not need to validate.

### New Route: `PATCH /admin/media/rename`

**Access:** SUPER_ADMIN only (same guard as existing media routes)

**Request body:**
```ts
{ from: string, newName: string }
```
- `from`: full current storage key (e.g. `cards/old-name.png`)
- `newName`: desired new filename without path prefix or extension (e.g. `new-name`)

**Processing:**

1. Validate `from` against existing safe-key regex `/^cards\/[^/]+$/` → `400` if invalid (prevents path traversal)
2. Reject dots in `newName` → `400 "Le nom ne peut pas contenir de point"` (prevents double-extension like `my.file.png`)
3. Sanitize `newName` using existing `sanitizeName` helper (lowercase, diacritics removed, non-alphanumeric → hyphens)
4. Validate `sanitizedName` is not empty after sanitization → `400 "Nom invalide"`
5. Extract extension from `from` key; construct destination: `to = cards/${sanitizedName}.${ext}`
6. If `to === from` → `400` (no-op)
7. Check source exists via `HeadObjectCommand` → `404` if not found
8. Check destination exists via `HeadObjectCommand` → `409` if already taken
9. Execute `copy(from, to)`
10. Execute `delete(from)` — if this fails, log the error and continue (the source becomes an orphan; acceptable trade-off given S3 delete failures are rare and orphan cleanup already exists in the UI)
11. If any card has `imageUrl` containing the `from` key → update `imageUrl` to new public URL
12. Return `{ key: string, url: string }` of the renamed object

**Atomicity note:** If `delete(from)` fails after a successful `copy`, both keys exist temporarily. The DB is updated to point to `to`. The old key becomes orphaned and can be cleaned up via the existing bulk-delete feature. This is explicitly acceptable — no rollback is attempted.

## Frontend

### API Layer (`admin-media.api.ts`)

Add:
```ts
renameMedia(from: string, newName: string): Promise<{ key: string, url: string }>
```
Calls `PATCH /admin/media/rename`. Throws `ApiError` on non-2xx (standard pattern).

### Query Hook (`useAdminMedia.ts`)

Add `useRenameMedia()` mutation hook:
- On success: invalidates `['admin', 'media']` query
- On error (non-409): triggers a toast with a generic error message (same pattern as `useDeleteMedia`)
- Returns the mutation object; the `error` field is inspected by the caller for 409 handling

### `MediaDetailPanel` component

**New props:**
```ts
onRename: (from: string, newName: string) => Promise<void>
isRenaming?: boolean
```

`onRename` returns a `Promise<void>` so the component can `catch` and inspect `ApiError.status` for inline 409 display.

**UI behavior in the Metadata card:**
- `Pencil` icon (lucide-react) displayed to the right of the filename, visible on hover or always
- Clicking the icon sets `isEditing = true`
- In edit mode: filename text is replaced by a controlled `<input>` pre-filled with current name (filename without `cards/` prefix and without extension)
- Inline Save (Check icon) and Cancel (X icon) buttons beside the input
- Pressing Enter submits; pressing Escape cancels
- On submit: calls `await onRename(item.key, inputValue)`
  - On success: close edit mode (no further action needed — query invalidation + `activeItem` update handled by parent)
  - On `ApiError` with `status === 409`: display inline error `"Ce nom est déjà utilisé"` below the input, keep edit mode open
  - On other errors: close edit mode (toast shown by hook)
- While `isRenaming`: input and buttons are disabled

### `admin.media.tsx` (page)

- Instantiate `useRenameMedia()` hook
- Pass to `<MediaDetailPanel>`:
  - `onRename={async (from, newName) => { const result = await renameMutation.mutateAsync({ from, newName }); setActiveItem(prev => prev && { ...prev, key: result.key, url: result.url }) }}`
  - `isRenaming={renameMutation.isPending}`
- On success, `activeItem` is updated directly from the mutation response `{ key, url }` so the panel reflects the new name immediately without waiting for the query refetch

## Error Handling Summary

| Condition | HTTP | UI feedback |
|-----------|------|-------------|
| `from` fails safe-key regex | 400 | Toast (generic) |
| `newName` contains a dot | 400 | Toast (generic) |
| Name empty after sanitization | 400 | Toast (generic) |
| No-op (name unchanged) | 400 | Toast (generic) |
| Source not found | 404 | Toast (generic) |
| Destination already exists | 409 | Inline: "Ce nom est déjà utilisé" |
| Storage failure | 500 | Toast (generic) |

## Out of Scope

- Changing file extension (always preserved from the original key)
- Renaming from the gallery grid (sidepanel only)
- Batch rename
- Automatic rollback if `delete(from)` fails post-copy
