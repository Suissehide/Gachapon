# Test Database Isolation — Design Document

**Date:** 2026-03-23
**Status:** Approved

---

## 1. Problème

Les tests e2e écrivent dans la base de développement (`gachapon`) et n'effacent jamais leurs données. Chaque run accumule des lignes parasites qui polluent la base de dev.

---

## 2. Solution

Dédier une base PostgreSQL séparée (`gachapon_test`) aux tests, avec une réinitialisation automatique avant chaque run via un `globalSetup` Jest.

---

## 3. Fichiers

### 3.1 `deploy/create-test-db.sh` (nouveau)

Script à exécuter **une seule fois** pour créer la base de test dans le container Docker local :

```bash
#!/bin/bash
set -e
echo "Creating gachapon_test database..."
docker exec gachapon-postgres psql -U postgres -c "CREATE DATABASE gachapon_test;" || echo "Database may already exist, continuing."
echo "Done."
```

Le `|| echo` évite que le script échoue si la base existe déjà.

### 3.2 `back/.env.test` (nouveau, commitable)

Copie de `back/.env` avec uniquement `DATABASE_URL` modifié pour pointer sur `gachapon_test`. Toutes les autres variables restent identiques (même JWT, Redis, Minio, etc.).

```env
# Settings
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gachapon_test
HOST=127.0.0.1
LOG_LEVEL=INFO
PORT=3001

FRONT_URL=http://localhost:4269
CORS_ORIGIN=http://localhost:4269

JWT_SECRET=gachapon-jwt
JWT_REFRESH_SECRET=gachapon-refresh
JWT_EXPIRES_IN=60m
JWT_REFRESH_EXPIRES_IN=180d
COOKIE_SECRET=gachapon-cookie

MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=gachapon

REDIS_URL=redis://localhost:6379
```

### 3.3 `back/src/test/globalSetup.ts` (nouveau)

S'exécute **une seule fois** avant l'ensemble des suites de test :

1. Charge `.env.test` via `dotenv` (`path: resolve(__dirname, '../../../.env.test')`)
2. Lance `prisma migrate deploy` pour s'assurer que le schéma est à jour sur `gachapon_test`
3. Connecte un `PrismaClient` à `gachapon_test` et tronque toutes les tables dans le bon ordre (respecter les contraintes FK via `CASCADE`) :

```sql
TRUNCATE TABLE
  "UserUpgrade", "UserQuest", "UserAchievement", "UserCard", "GachaPull", "Purchase",
  "Invitation", "TeamMember", "Team",
  "OAuthAccount", "ApiKey", "User",
  "Card", "CardSet",
  "ShopItem", "Achievement", "Quest",
  "GlobalConfig", "UpgradeConfig"
RESTART IDENTITY CASCADE;
```

4. Déconnecte le client Prisma.

### 3.4 `back/src/test/jest.config.ts` (modifié)

Ajouter `globalSetup` à la config Jest au niveau racine (hors `projects`) :

```typescript
const config: Config = {
  globalSetup: '<rootDir>/globalSetup.ts',
  projects: [
    // ... inchangé
  ],
}
```

---

## 4. Flux d'utilisation

**Une seule fois (setup initial) :**
```bash
bash deploy/create-test-db.sh
```

**À chaque run de tests :**
```bash
cd back && npm test
# → globalSetup charge .env.test, migre et tronque gachapon_test
# → tous les tests tournent sur gachapon_test
# → la base de dev reste intacte
```

---

## 5. Hors périmètre

- CI/CD (le pipeline dispose déjà de `deploy/.env.test` séparé)
- Seed de données de test partagées (les tests créent leurs propres données via `beforeAll`)
- Tests unitaires (pas d'accès DB, non impactés)
