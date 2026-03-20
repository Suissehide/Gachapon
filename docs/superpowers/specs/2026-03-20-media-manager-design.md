# Media Manager — Design Document

**Date:** 2026-03-20
**Status:** Approved

---

## 1. Vue d'ensemble

Deux fonctionnalités liées :

1. **Page `/admin/media`** — galerie de gestion des images stockées sur le service de stockage objet. Upload multi-fichiers, filtres, sélection multiple pour suppression en masse, panneau de détail par image avec association carte–image.
2. **Image picker dans l'édition de carte** — au moment de modifier une carte, pouvoir choisir une image déjà uploadée depuis la bibliothèque, en plus de l'upload direct.

---

## 2. Comportement général

- Les images sont stockées sous la clé `cards/{timestamp}-{nom-sanitisé}.{ext}`.
- La base de données conserve `Card.imageUrl` (URL publique du service de stockage).
- Une image est **orpheline** si aucune `Card.imageUrl` ne lui correspond.
- La suppression d'une image est toujours un acte manuel et explicite. Aucune suppression automatique.

---

## 3. Interface de stockage abstraite

L'interface existante `MinioClientInterface` est renommée **`StorageClientInterface`** pour ne pas coupler le code applicatif à Minio. La classe `MinioClient` continue d'implémenter cette interface. Si le service de stockage change (S3, Cloudflare R2, etc.), seule l'implémentation change.

**Méthodes de l'interface :**

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
  size: number           // octets
  lastModified: Date
}
```

**`listObjects`** gère la pagination S3 interne (`ListObjectsV2Command` + continuation token / `IsTruncated`) et retourne la liste complète. L'appelant ne voit pas la pagination.

### Fichiers à renommer / mettre à jour

Ces cinq fichiers doivent être mis à jour **dans un seul commit atomique** — TypeScript ne compile pas si le rename est partiel.

| Fichier | Changement |
|---|---|
| `back/src/main/types/infra/storage/minio-client.ts` | Renommer en `storage-client.ts`, exporter `StorageClientInterface` + `StorageObject` |
| `back/src/main/infra/storage/minio-client.ts` | Mettre à jour l'import de type (`StorageClientInterface`), ajouter `listObjects` |
| `back/src/main/types/application/ioc.ts` | `minioClient: MinioClientInterface` → `storageClient: StorageClientInterface` |
| `back/src/main/application/ioc/awilix/awilix-ioc-container.ts` | Clé IoC `minioClient` → `storageClient` |
| `back/src/main/interfaces/http/fastify/routes/admin/cards.router.ts` | Destructure `storageClient` au lieu de `minioClient` |

---

## 4. Backend

### 4.1 Endpoint — Liste des médias

```
GET /admin/media
```

**Comportement :**
1. Appel `storageClient.listObjects('cards/')` — retourne tous les objets du prefix.
2. Récupérer tous les `imageUrl` distincts depuis la table `Card` avec leur carte associée (`id`, `name`, `rarity`, `variant`).
3. Pour chaque objet, construire l'URL publique (`storageClient.publicUrl(key)`) et chercher la correspondance dans les imageUrls.
4. Retourner la liste enrichie.

**Réponse :**
```json
[
  {
    "key": "cards/1706-bulbasaur.png",
    "url": "http://minio:9000/gachapon/cards/1706-bulbasaur.png",
    "size": 1843200,
    "lastModified": "2026-01-21T10:00:00Z",
    "orphan": false,
    "card": {
      "id": "uuid",
      "name": "Bulbasaur",
      "rarity": "COMMON",
      "variant": null
    }
  },
  {
    "key": "cards/1706-test.webp",
    "url": "http://minio:9000/gachapon/cards/1706-test.webp",
    "size": 512000,
    "lastModified": "2026-01-22T14:30:00Z",
    "orphan": true,
    "card": null
  }
]
```

### 4.2 Endpoint — Upload

```
POST /admin/media/upload
Content-Type: multipart/form-data
```

- Accepte plusieurs fichiers sous le champ `images[]`.
- Validation par fichier : JPEG / PNG / WEBP, 5 MB max.
- Sanitisation du nom : retirer tout caractère non-alphanumérique sauf tirets et points, passer en minuscule. Clé : `cards/{timestamp}-{nom-sanitisé}.{ext}`.
- Les erreurs sont accumulées par fichier sans interrompre les autres.
- Retourne la liste des objets créés (même format que le GET, `orphan: true` et `card: null` systématiquement) + les erreurs éventuelles.

**Réponse :**
```json
{
  "created": [ /* MediaItem[] */ ],
  "errors": [
    { "filename": "bad.gif", "reason": "Format non supporté" }
  ]
}
```

### 4.3 Endpoint — Suppression

```
DELETE /admin/media
Body: { "keys": ["cards/foo.png", "cards/bar.webp"] }
```

**Comportement :**
- Valider que chaque clé respecte `/^cards\/[^/]+$/` (pas de sous-chemin, pas de `..`).
- Vérifier en base que chaque clé est orpheline.
- Si au moins une clé est utilisée : refuser l'ensemble (400 atomique).
- Supprimer les clés validées du stockage.
- Retourner les clés effectivement supprimées.

### 4.4 Endpoint — Mise à jour image d'une carte

L'image d'une carte est modifiable via deux routes distinctes pour éviter la complexité d'un dual content-type sur une seule route Fastify :

**Cas A — Sélection depuis la bibliothèque (JSON) :**
```
PATCH /admin/cards/:id
Body: { "imageUrl": "http://..." }   // champ ajouté au schéma Zod existant
```
Schéma Zod à mettre à jour : ajouter `imageUrl: z.string().url().optional()` au body schema existant du PATCH.

Validation de l'URL : vérification par regex que l'URL commence par `storageClient.publicUrl('')` (i.e. `{endpoint}/{bucket}/`). Pas de round-trip vers le stockage — le picker ne propose que des images existantes, et la cohérence est suffisante. Mise à jour de `Card.imageUrl`.

**Cas B — Upload d'un nouveau fichier :**
```
POST /admin/cards/:id/image
Content-Type: multipart/form-data
```
Upload le fichier dans le stockage (même logique que `POST /admin/media/upload`, un seul fichier), puis met à jour `Card.imageUrl` avec la nouvelle URL. L'ancienne image n'est pas supprimée — elle devient orpheline.

---

## 5. Frontend

### 5.1 Structure des fichiers

| Fichier | Rôle |
|---|---|
| `front/src/api/admin-media.api.ts` | Client HTTP : `getMedia()`, `uploadMedia(files)`, `deleteMedia(keys)` |
| `front/src/queries/useAdminMedia.ts` | Hooks TanStack Query : `useAdminMedia()` (queryKey `['admin', 'media']`), `useUploadMedia()`, `useDeleteMedia()` |
| `front/src/components/admin/media/MediaGallery.tsx` | Grille réutilisable (utilisée par la page et la modale picker) |
| `front/src/components/admin/media/MediaDetailPanel.tsx` | Panneau détail |
| `front/src/components/admin/media/MediaPickerModal.tsx` | Modale picker pour `EditCardSheet` |
| `front/src/routes/admin/media.tsx` | Page `/admin/media` |

### 5.2 Page `/admin/media`

#### Layout — Grille + panneau détail

```
┌─────────────────────────────────────────────────┐
│  [ Zone de drop / upload ]                       │
├─────────────────────────────────────────────────┤
│  [Toutes (24)] [Utilisées (19)] [Orphelines (5)] │
│                          [2 sélect.] [Suppr. (2)]│
├─────────────────────────────┬───────────────────┤
│  Grille 5 col               │  Panneau détail   │
│  ☐ 🟢  ☐ 🔴  ☐ 🟢          │  [aperçu image]   │
│  ☑ 🔴  ☐ 🟢  ☐ 🟢          │  nom fichier      │
│  ☐ 🟢  ☑ 🔴  ☐ 🟢          │  statut badge     │
│                             │  carte associée   │
│                             │  taille · date    │
│                             │  [Copier URL]     │
│                             │  [Supprimer]      │
└─────────────────────────────┴───────────────────┘
```

#### Grille (`MediaGallery`)

Props : `items: MediaItem[]`, `selectable?: boolean` (active les checkboxes de suppression), `onSelect?: (item) => void` (mode picker).

- Miniatures en ratio 3/4. Fond rouge sombre = orpheline, fond neutre = utilisée.
- **Checkbox** (coin supérieur gauche) : visible uniquement si `selectable=true`, uniquement sur les orphelines. Cocher ajoute à la sélection de suppression en masse.
- **Clic sur l'image** (hors checkbox) : appelle `onSelect` si fourni (mode picker), sinon ouvre le panneau détail. Contour violet sur l'image active.
- Badge coloré coin inférieur droit : vert = utilisée, rouge = orpheline.

#### Filtres

Trois boutons toggle : **Toutes** (défaut) / **Utilisées** / **Orphelines**. Compteurs depuis les données chargées côté client.

#### Sélection multiple et suppression en masse

- Cocher ≥1 orpheline affiche `N sélectionnées` + bouton `Supprimer (N)`.
- Confirmation modale avant suppression.
- Après suppression : items retirés, panneau fermé si l'image active était supprimée, invalidation du queryKey `['admin', 'media']`.

#### Panneau détail (`MediaDetailPanel`)

| Élément | Détail |
|---|---|
| Aperçu | Image en taille réelle (ratio 3/4) |
| Nom fichier | Nom court + clé complète |
| Statut | Badge "Utilisée" (vert) ou "Orpheline" (rouge) |
| Carte associée | Si utilisée : nom + rareté. Si orpheline : absent. |
| Taille · Date | Métadonnées du stockage |
| Copier l'URL | Copie l'URL publique dans le presse-papier |
| Supprimer | Actif si orpheline. Confirmation inline. Désactivé si utilisée. |

#### Zone d'upload

Drag-and-drop en haut de page + `<input type="file" multiple>`. Barre de progression par fichier. Après upload : nouvelles images ajoutées en tête de grille.

### 5.3 Image picker dans l'édition de carte

**`EditCardSheet` / `EditCardPayload` mis à jour :**

```typescript
export type EditCardPayload = {
  name: string
  rarity: string
  dropWeight: number
  imageUrl?: string   // URL existante sélectionnée depuis la bibliothèque
  imageFile?: File    // Nouveau fichier uploadé
  // imageUrl et imageFile sont mutuellement exclusifs
}
```

Le formulaire ajoute un champ "Image" avec deux onglets :
- **Uploader** — `<FileInput>` classique. Si un fichier est choisi, `imageFile` est renseigné.
- **Choisir existant** — bouton ouvrant `MediaPickerModal`. Si une image est sélectionnée, `imageUrl` est renseignée et une miniature est affichée.

`onSave` du parent appelle :
- `POST /admin/cards/:id/image` (multipart) si `imageFile` est présent
- `PATCH /admin/cards/:id` avec `{ imageUrl }` si `imageUrl` est présent
- `PATCH /admin/cards/:id` sans champ image si aucun changement d'image

**`MediaPickerModal` :**
- Utilise `useAdminMedia()` pour charger la liste (queryKey `['admin', 'media']` — partagé avec la page `/admin/media`).
- Affiche `<MediaGallery items={items} onSelect={handleSelect} />` sans les checkboxes de suppression (`selectable=false`).
- Filtres disponibles dans la modale (toutes / utilisées / orphelines).
- Clic sur une image : ferme la modale et retourne l'`url` de l'item.

---

## 6. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Fichier trop grand (> 5 MB) | Toast erreur par fichier, les autres continuent |
| Format invalide | Toast erreur, fichier ignoré |
| Tentative suppression image utilisée | Toast erreur "Image utilisée par la carte X" |
| Clé avec chemin invalide | 400 refusé par le backend |
| Service de stockage inaccessible | Toast erreur générique, page en état d'erreur |

---

## 7. Navigation admin

Ajouter l'entrée **Médias** dans la sidebar admin.

---

## 8. Hors périmètre

- Renommage des fichiers dans le stockage
- Dossiers / sous-dossiers
- Pagination de la galerie (liste chargée entièrement ; à réévaluer si volume > 500 images)
- Image picker dans la création de carte (upload uniquement à la création, picker uniquement à l'édition)
