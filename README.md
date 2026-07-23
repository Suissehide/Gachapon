# Gachapon

Application web de Gachapon multijoueur. Joue à la machine à pince 3D et construis ta collection.

## Stack

- **Frontend** : React 19, Vite, TailwindCSS v4, TanStack Router/Query, React Three Fiber
- **Backend** : Fastify 5, Prisma 7, PostgreSQL, Redis, TypeScript
- **Déploiement** : Docker Compose + Traefik / Dokploy
- **Stockage** : MinIO (compatible S3)
- **Auth** : JWT + OAuth (Google, Discord)

## Prérequis

- Node.js 20+, npm 10+ (npm 11+ nécessite l'étape `npm install-scripts approve`, cf. ci-dessous)
- Docker + Docker Compose

## Démarrage rapide

Toutes les commandes ci-dessous se lancent depuis la racine du dépôt.

```shell
# 1. Copier et configurer les variables d'environnement
cp deploy/.env.example deploy/.env
cp back/.env.example back/.env
cp front/.env.example front/.env

# 2. Installer les dépendances, puis autoriser les scripts natifs
#    (npm 11+ les bloque par défaut — sans ça : pas de moteur Prisma, pas de bcrypt)
(cd back  && npm install && npm install-scripts approve @prisma/engines @swc/core bcrypt esbuild prisma unrs-resolver)
(cd front && npm install && npm install-scripts approve esbuild @swc/core)

# 3. Créer le réseau externe attendu par compose (une seule fois)
docker network create proxy

# 4. Démarrer Postgres + Redis (profil db) et Mailpit (profil dev)
(cd deploy && docker compose --profile db --profile dev up -d)

# 5. Appliquer les migrations et seeder
(cd back && npm run prisma:migrate:dev && npm run db:seed)
```

Puis, dans deux terminaux séparés :

```shell
cd back && npm run dev   # http://localhost:3001
```

```shell
cd front && npm run dev  # http://localhost:4269
```

Comptes créés par le seed : `admin@gachapon.dev` (SUPER_ADMIN), `captain`, `alice`, `bob` — tous avec le mot de passe `Password123!`.

Interface Mailpit (emails de vérification / reset) : http://localhost:8026

> **Images de cartes manquantes en local** — le seed pointe sur des clés objet
> (`staging/cards/humans/<id>.png`) servies depuis `MINIO_ENDPOINT`. Aucun service
> MinIO n'est inclus dans `deploy/compose.yaml` et les PNG ne sont pas versionnés :
> les visuels de cartes restent en 404 tant qu'un MinIO n'est pas monté et peuplé
> (cf. `back/scripts/import-cards/import-cards.mjs`, enchaîné par `npm run prisma:seed`).

## Structure du projet

```
Gachapon/
├── back/          # API Fastify (TypeScript)
│   ├── src/
│   ├── prisma/    # Schéma & migrations
│   └── bruno/     # Collection API (tests)
├── front/         # App React (Vite)
│   └── src/
├── deploy/        # Docker Compose & configs
│   ├── compose.yaml                        # Production (Traefik)
│   └── dokploy/docker-compose.dokploy.yml  # Dokploy PaaS
└── docs/          # Plans & specs
```

## Scripts utiles

### Backend (`cd back`)

| Commande                       | Description                          |
| ------------------------------ | ------------------------------------ |
| `npm run dev`                  | Serveur de développement (hot reload)|
| `npm run build`                | Build de production (SWC)            |
| `npm run test`                 | Tous les tests                       |
| `npm run test:unit`            | Tests unitaires uniquement           |
| `npm run lint`                 | Linting Biome                        |
| `npm run validate`             | Lint + build + tests                 |
| `npm run prisma:migrate:dev`   | Créer et appliquer une migration     |
| `npm run prisma:studio`        | Interface visuelle Prisma            |
| `npm run db:seed`              | Peupler la base de données           |

### Frontend (`cd front`)

| Commande            | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Serveur de développement Vite      |
| `npm run build`     | Build de production                |
| `npm run lint`      | Linting Biome                      |
| `npm run preview`   | Prévisualiser le build de prod     |

## Commandes Claude Code (`.claude/commands/`)

Slash commands custom du projet, appelées à la demande dans Claude Code :

| Commande     | Description                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `/changelog` | Met à jour la page changelog joueur (`front/src/routes/changelog.tsx`) à partir des commits git depuis la dernière synchro. Accepte une note optionnelle (ex. `/changelog nouvelle version 1.5`). |

## Variables d'environnement

Trois fichiers distincts, pour trois mondes différents :

| Fichier      | Consommé par                                  |
| ------------ | --------------------------------------------- |
| `back/.env`  | API en dev local (`cd back && npm run dev`)   |
| `front/.env` | build Vite en dev local                       |
| `deploy/.env`| `docker compose` (conteneurs)                 |

Copier le `.env.example` correspondant à côté de chacun, puis remplir :

| Variable                                            | Description                                     |
| --------------------------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`                                      | URL de connexion PostgreSQL                     |
| `REDIS_URL`                                         | URL Redis                                       |
| `PORT`                                              | Port d'écoute de l'API (dev local : `3001`)     |
| `JWT_SECRET` / `JWT_REFRESH_SECRET`                 | Secrets JWT (min. 32 caractères)                |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Config stockage objet                    |
| `SMTP_HOST` / `SMTP_PORT`                           | SMTP sortant (dev : Mailpit, `localhost:1026`)  |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`         | OAuth Google (vide = bouton inactif)            |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`       | OAuth Discord (vide = bouton inactif)           |
| `VITE_API_URL`                                      | URL de l'API vue par le frontend                |

Les réglages d'économie (stock max de tokens, seuil de pitié, taux de poussière,
courbe d'XP, coûts…) **ne sont pas des variables d'environnement** : ils vivent en base
dans la table `GlobalConfig`, avec pour unique source de valeurs par défaut la constante
`DEFAULTS` de `back/src/main/infra/config/config.service.ts` (bootstrap au démarrage).
Le front les lit via `GET /economy/config`.

## Déploiement

### Production avec Traefik

Le compose attend un réseau externe `proxy` (partagé avec Traefik) :

```shell
docker network create proxy   # une seule fois
cd deploy
docker compose --profile db --profile backend --profile frontend up -d
```

### Déploiement Dokploy

Utiliser `deploy/dokploy/docker-compose.dokploy.yml` directement dans Dokploy.
