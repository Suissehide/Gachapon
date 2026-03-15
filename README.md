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
