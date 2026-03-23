# Gachapon

Application web de Gachapon multijoueur. Joue à la machine à pince 3D et construis ta collection.

## Stack

- **Frontend** : React 19, Vite, TailwindCSS v4, TanStack Router/Query, React Three Fiber
- **Backend** : Fastify 5, Prisma 7, PostgreSQL, Redis, TypeScript
- **Déploiement** : Docker Compose + Traefik / Dokploy
- **Stockage** : MinIO (compatible S3)
- **Auth** : JWT + OAuth (Google, Discord)

## Prérequis

- Node.js 20+, npm 10+
- Docker + Docker Compose

## Démarrage rapide

```shell
# 1. Copier et configurer les variables d'environnement
cp deploy/.env.example deploy/.env

# 2. Démarrer la base de données et Redis
cd deploy && docker compose --profile db up -d

# 3. Appliquer les migrations et seeder
cd back && npm run prisma:migrate:dev && npm run db:seed

# 4. Lancer les serveurs de développement
cd back && npm run dev   # http://localhost:3000
cd front && npm run dev  # http://localhost:5173
```

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

## Variables d'environnement

Copier `deploy/.env.example` vers `deploy/.env` et remplir :

| Variable                                            | Description                              |
| --------------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL`                                      | URL de connexion PostgreSQL              |
| `REDIS_URL`                                         | URL Redis                                |
| `JWT_SECRET` / `JWT_REFRESH_SECRET`                 | Secrets JWT (min. 32 caractères)         |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Config stockage objet          |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`         | OAuth Google                             |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`       | OAuth Discord                            |
| `VITE_API_URL`                                      | URL de l'API (pour le frontend)          |
| `TOKEN_MAX_STOCK`                                   | Stock max de tokens gacha (défaut : 5)   |
| `PITY_THRESHOLD`                                    | Seuil de pitié (défaut : 100)            |

## Déploiement

### Production avec Traefik

```shell
cd deploy
docker compose --profile db --profile backend --profile frontend up -d
```

### Déploiement Dokploy

Utiliser `deploy/dokploy/docker-compose.dokploy.yml` directement dans Dokploy.
