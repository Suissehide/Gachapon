# Recyclage avec choix de quantité — Design Document

**Date:** 2026-03-23
**Status:** Approved

---

## 1. Vue d'ensemble

Remplacer le recyclage unitaire (1 carte à la fois, sans confirmation) par une modale permettant de choisir combien d'exemplaires recycler. L'utilisateur peut garder des exemplaires pour de futurs échanges.

---

## 2. Backend

### Endpoint modifié — `POST /collection/recycle`

Ajout du champ `quantity` au body Zod :

```typescript
body: z.object({
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
})
```

**Comportement :**

1. Ajouter `upgradeRepository` à la destructuration de `fastify.iocContainer` dans le handler recycle (cohérent avec les autres handlers du même routeur).
2. **Avant la transaction** — lire les données stables (même pattern que `gacha.domain.ts` lignes 240–257) :
   - Valeur de base via `configService.get(dustKey)` (pattern existant).
   - Multiplicateur via `upgradeRepository.getEffectsForUser(userId)` → `dustHarvestMultiplier`.
   - `dustEarned = dustByRarity[card.rarity] * dustHarvestMultiplier * quantity`
3. **Dans la transaction SERIALIZABLE** :
   - Vérifier que l'utilisateur possède la carte et que `userCard.quantity >= quantity`.
   - Mettre à jour `UserCard` :
     - Si `userCard.quantity - quantity <= 0` : supprimer la ligne (remplace la condition `<= 1` existante).
     - Sinon : décrémenter de `quantity`.
   - Incrémenter `User.dust` de `dustEarned`.

**Réponse :** `{ dustEarned: number, newDustTotal: number }` (inchangée).

---

## 3. Frontend

### 3.1 Nouveau composant `RecycleModal`

**Fichier :** `front/src/components/collection/RecycleModal.tsx`

**Props :**
```typescript
interface RecycleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    quantity: number
  }
}
```

**Contenu de la modale :**
- Miniature + nom + rareté de la carte
- Input numérique (type `number`, min 1, max `quantity`) avec label "Quantité à recycler"
- Bouton **"Tout (N)"** qui remplit l'input au max (`quantity`)
- Preview dust **en valeur de base** : `quantité × DUST_BY_RARITY[rarity]` avec mention "(hors bonus)" — la valeur réelle avec multiplicateurs est retournée par le serveur dans `dustEarned`
- Bouton **Annuler** + bouton **Recycler N carte(s)** (disabled si quantité invalide ou mutation en cours)

Composants UI : `Popup`, `PopupContent`, `PopupHeader`, `PopupTitle`, `PopupBody`, `PopupFooter` (pattern existant).

**Comportement post-recyclage :**
- Ferme la modale via `onOpenChange(false)`
- Affiche le dust réellement gagné (depuis `dustEarned` dans la réponse)
- Invalide la query `['collection']` (préfixe large — pattern existant dans `useRecycle`)

**Constante locale :**
```typescript
const DUST_BY_RARITY: Record<string, number> = {
  COMMON: 5,
  UNCOMMON: 15,
  RARE: 50,
  EPIC: 150,
  LEGENDARY: 500,
}
```

### 3.2 Propagation de `onRecycle`

Le type de `onRecycle` change dans toute la chaîne : `(cardId: string) => void` → `(card: CardWithQuantity) => void` (passe l'objet carte complet pour que la modale ait toutes les infos sans refetch).

**`CollectionCard`** : supprimer la prop `recycling: boolean`, le bouton "Recycler" appelle `onRecycle(card)` (objet complet).

**`CollectionGrid`** et **`CollectionSetGroup`** : mettre à jour la prop `onRecycle` vers `(card) => void` et supprimer la prop `recyclingId` et son passage à `CollectionCard`.

### 3.3 État dans `collection.tsx`

Remplacer `recyclingId: string | null` par `recycleTarget: CardWithQuantity | null`. Le `recyclingId` servait à désactiver le bouton pendant la mutation — ce rôle est désormais rempli par le spinner dans la modale.

`RecycleModal` est monté une seule fois au bas de la page avec `open={!!recycleTarget}` et `card={recycleTarget}`.

---

## 4. Fichiers modifiés

| Fichier | Changement |
|---|---|
| `back/src/main/interfaces/http/fastify/routes/collection/index.ts` | Ajouter `quantity` + `upgradeRepository` + multiplicateur dans la transaction + corriger condition de suppression |
| `front/src/api/collection.api.ts` | `recycle(cardId, quantity)` |
| `front/src/queries/useCollection.ts` | `useRecycle` passe `quantity` |
| `front/src/components/collection/RecycleModal.tsx` | Nouveau composant |
| `front/src/components/collection/CollectionCard.tsx` | `onRecycle(card)` ; supprimer prop `recycling: boolean` |
| `front/src/components/collection/CollectionGrid.tsx` | Signature `onRecycle: (card) => void` ; supprimer `recyclingId` et son passage |
| `front/src/components/collection/CollectionSetGroup.tsx` | Signature `onRecycle: (card) => void` ; supprimer `recyclingId` et son passage |
| `front/src/routes/_authenticated/collection.tsx` | Remplacer `recyclingId` par `recycleTarget`, monter `RecycleModal` |

---

## 5. Hors périmètre

- Recyclage en masse multi-cartes (sélection multiple)
- Historique des recyclages
- Modification des valeurs de dust par rareté (déjà configurable via admin)
