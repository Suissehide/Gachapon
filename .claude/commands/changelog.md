---
description: Met à jour le changelog joueur à partir des commits git depuis la dernière synchro
argument-hint: "[note optionnelle : ex. 'nouvelle version 1.5' ou 'regroupe avec la dernière']"
allowed-tools: Bash(git log:*), Bash(git rev-parse:*), Bash(cd front && npx biome*), Read, Edit
---

Tu mets à jour le changelog joueur de Gachapon : `front/src/routes/changelog.tsx`.

C'est une page **orientée joueur, en français, tutoiement** — surtout PAS une liste de commits bruts. On résume ce qui change du point de vue de l'utilisateur.

## Procédure

1. **Trouver le point de reprise.** Lis les 3 premières lignes de `front/src/routes/changelog.tsx` : la ligne `// last-synced-commit: <sha>` donne le dernier commit déjà intégré.

2. **Lister les nouveautés.** Récupère les commits depuis ce sha :
   `git log <sha>..HEAD --format="%h|%ci|%s"`
   - Ne garde que ce qui a un **impact joueur** : surtout `feat(...)`, et les `fix(...)` visibles par l'utilisateur.
   - **Ignore** le bruit interne : `chore`, `docs`, `test`, `style`, `lint`, `refactor`, `build`, `ci`, merges, et les fix purement techniques (typage, CI, config).
   - Si aucun commit à impact joueur : dis-le et n'écris rien.

3. **Curer et regrouper.** Transforme les commits en 1 à 6 entrées lisibles. Fusionne les commits d'une même fonctionnalité en une seule entrée. Reformule dans le ton du fichier (voir entrées existantes). Choisis le `type` :
   - `new` = nouvelle fonctionnalité
   - `improved` = amélioration d'un truc existant
   - `fixed` = correction visible par le joueur

4. **Placer les entrées.** Par défaut : décide selon l'ampleur.
   - Petites nouveautés / correctifs → **ajoute-les à la release la plus récente** (en haut du tableau `RELEASES`) si elle correspond encore à la période courante.
   - Lot conséquent ou nouvelle période/thème → **crée une nouvelle release en haut** (incrémente la version mineure : 1.4 → 1.5, ou majeure si c'est un gros cap), avec `version`, `title`, `date` (mois FR, ex. « Août 2026 »), `summary` court, `entries`.
   - Si l'utilisateur a passé une note en argument (`$ARGUMENTS`), suis-la (ex. « nouvelle version », « regroupe avec la dernière »).

5. **Avancer le marqueur.** Récupère le sha courant avec `git rev-parse HEAD` et remplace la valeur de `// last-synced-commit:` par ce sha.

6. **Lint.** `cd front && npx biome check --write src/routes/changelog.tsx`.

7. **Résumer** à l'utilisateur : les entrées ajoutées, dans quelle release, et le nouveau sha de synchro. Ne commit pas sauf demande explicite.

## Contraintes

- Respecte les types TS existants (`ChangelogRelease`, `ChangelogEntry`, `ChangeType`) et les tokens de style (`bg-primary/15`, `text-primary`…). N'invente pas de nouveau champ.
- Les versions les plus récentes sont **en haut** du tableau `RELEASES`.
- Reste factuel : pas d'entrée pour une fonctionnalité qui n'apparaît pas dans les commits.
