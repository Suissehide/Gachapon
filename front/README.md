# Gachapon — Frontend

App React du Gachapon multijoueur. Voir le [README racine](../README.md) pour le démarrage complet (base de données, backend, variables d'environnement).

## Stack

- React 19 + TypeScript, bundlé par Vite (plugin SWC)
- TanStack Router (routes fichiers, `routeTree.gen.ts` généré — ne pas éditer), Query, Form, Table
- Tailwind CSS v4 (config CSS-first dans `src/styles/_globals.css`) + Radix UI
- Zustand pour l'état client, react-three-fiber pour la 3D
- Biome pour le lint/format (`biome.json`)

## Scripts

| Commande          | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Serveur de dev Vite sur <http://localhost:4269>    |
| `npm run build`   | `tsc -b` + build Vite, puis pré-rendu SEO (`scripts/prerender-seo.mjs`) |
| `npm run lint`    | Lint Biome sur `src`                               |
| `npm run preview` | Prévisualise le build de prod                      |

## Organisation

```
src/
  api/         wrappers fetch par ressource (via fetchWithAuth)
  queries/     hooks React Query construits sur src/api
  stores/      stores Zustand (état client uniquement)
  routes/      routes TanStack Router (générées dans routeTree.gen.ts)
  components/
    ui/        primitives réutilisables (Button, Popup, Sheet, …) — toujours partir d'ici
    machine/   machines 3D (gashapon, claw) + animations de reveal
  styles/      tokens (_colors.css), thème Tailwind (_globals.css)
```

L'URL de l'API vient de `VITE_API_URL` (variable de build, intégrée au bundle).
