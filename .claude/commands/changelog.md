---
description: Met à jour le changelog joueur à partir des commits git depuis la dernière synchro
argument-hint: "[note optionnelle : ex. 'nouvelle version 1.5' ou 'regroupe avec la dernière']"
allowed-tools: Bash(git log:*), Bash(git rev-parse:*), Bash(cd front && npx biome*), Read, Edit
---

Tu mets à jour le changelog joueur de Gachapon. Il vit maintenant sur **trois
fichiers** qu'il faut éditer ensemble, jamais un seul à la fois :

- `front/src/routes/changelog.tsx` — la structure (version, ordre des
  entrées, type `new`/`improved`/`fixed` de chacune). Aucun texte n'y vit
  plus depuis la tâche 7c.
- `front/src/i18n/locales/fr/changelog.json` — le texte français.
- `front/src/i18n/locales/en/changelog.json` — le texte anglais.

C'est une page **orientée joueur, tutoiement** — surtout PAS une liste de commits bruts. On résume ce qui change du point de vue de l'utilisateur, **en français et en anglais**.

## Pourquoi trois fichiers, et pourquoi jamais un sans les deux autres

`npm run check:i18n:parity` échoue dès qu'une clé existe d'un côté (fr ou
en) et pas de l'autre. Ce garde-fou est voulu et ne doit pas être contourné
— mais il implique une règle stricte pour cette commande : **une entrée de
changelog n'existe qu'à partir du moment où elle a son texte dans les DEUX
fichiers de locale**, dans la même passe. Il ne doit jamais y avoir de
commit (ni même d'état intermédiaire dans cette commande) où `fr/changelog.json`
porte une clé que `en/changelog.json` n'a pas encore : ce n'est pas une
étape « à rattraper plus tard », c'est une étape qui n'a jamais lieu. Toi
(l'agent qui exécutes cette commande) rédiges le français ET traduis en
anglais dans la même réponse — il n'y a pas de raison structurelle d'en
écrire un sans l'autre, contrairement à une traduction humaine différée.

## Procédure

1. **Trouver le point de reprise.** Lis les 3 premières lignes de `front/src/routes/changelog.tsx` : la ligne `// last-synced-commit: <sha>` donne le dernier commit déjà intégré.

2. **Lister les nouveautés.** Récupère les commits depuis ce sha :
   `git log <sha>..HEAD --format="%h|%ci|%s"`
   - Ne garde que ce qui a un **impact joueur** : surtout `feat(...)`, et les `fix(...)` visibles par l'utilisateur.
   - **Ignore** le bruit interne : `chore`, `docs`, `test`, `style`, `lint`, `refactor`, `build`, `ci`, merges, et les fix purement techniques (typage, CI, config).
   - Si aucun commit à impact joueur : dis-le et n'écris rien.

3. **Curer, regrouper et traduire.** Transforme les commits en 1 à 6 entrées lisibles. Fusionne les commits d'une même fonctionnalité en une seule entrée. Reformule dans le ton des entrées françaises existantes (`fr/changelog.json`), puis traduis chaque entrée en anglais dans le ton des entrées anglaises existantes (`en/changelog.json`) — les deux textes se rédigent dans la même passe, jamais l'un après coup. Reprends le **vocabulaire de jeu déjà établi** plutôt que d'improviser une traduction : les 29 namespaces de `front/src/i18n/locales/en/`, `back/src/main/domain/content/*.definitions.ts` (noms de sets, tours, boss, compétences — ex. `EquipmentSet.AFFUT → 'Vigilance'`, `TOWER_NAME_EN_BY_ELEMENT`), et les entrées déjà traduites de `en/changelog.json`. Choisis le `type` :
   - `new` = nouvelle fonctionnalité
   - `improved` = amélioration d'un truc existant
   - `fixed` = correction visible par le joueur

4. **Placer les entrées, dans les trois fichiers.** Par défaut : décide selon l'ampleur.
   - Petites nouveautés / correctifs → **ajoute-les à la release la plus récente** (en haut du tableau `RELEASES` de `changelog.tsx`) si elle correspond encore à la période courante.
   - Lot conséquent ou nouvelle période/thème → **crée une nouvelle release en haut** (incrémente la version mineure : 1.4 → 1.5, ou majeure si c'est un gros cap).
   - Si l'utilisateur a passé une note en argument (`$ARGUMENTS`), suis-la (ex. « nouvelle version », « regroupe avec la dernière »).

   Concrètement, pour une **nouvelle version** `X.Y` :
   - `changelog.tsx` : ajoute `{ version: 'X.Y', entries: [{ type: '...' }, ...] }` en tête de `RELEASES` — un objet par entrée, **rien que son `type`**, dans l'ordre où elles doivent s'afficher.
   - calcule `versionKey` en remplaçant les points par des underscores (`'X.Y'` → `'vX_Y'`) — c'est la même règle que `versionKey()` dans `changelog.tsx`, ne la réinvente pas autrement.
   - `fr/changelog.json` : ajoute sous `releases` un bloc `"vX_Y": { "title": "...", "date": "<mois FR, ex. « Août 2026 »>", "summary": "...", "entries": { "e1": "...", "e2": "...", ... } }` — les clés `entries` sont `e1`, `e2`, … dans le même ordre que le tableau `entries` de `changelog.tsx` (l'entrée `n` du tableau ↔ la clé `e<n>`, jamais désynchronisées).
   - `en/changelog.json` : le même bloc `"vX_Y": { ... }`, texte anglais, mêmes clés `title`/`date`/`summary`/`entries.e1..en`. Le `date` anglais traduit le mois (« Août 2026 » → « August 2026 »).

   Pour **ajouter des entrées à la release la plus récente** existante : ajoute les objets `{ type: '...' }` à la fin (ou à l'endroit voulu) du tableau `entries` de cette release dans `changelog.tsx`, puis ajoute les clés `e<n>` correspondantes (en continuant la numérotation existante) dans les DEUX fichiers de locale, sous le bloc `releases.<versionKey>.entries` déjà existant.

5. **Avancer le marqueur.** Récupère le sha courant avec `git rev-parse HEAD` et remplace la valeur de `// last-synced-commit:` par ce sha, dans `changelog.tsx`.

6. **Lint.** `cd front && npx biome check --write src/routes/changelog.tsx src/i18n/locales/fr/changelog.json src/i18n/locales/en/changelog.json` — les trois fichiers touchés, pas seulement le `.tsx`.

7. **Résumer** à l'utilisateur : les entrées ajoutées (français ET anglais), dans quelle release, et le nouveau sha de synchro. Ne commit pas sauf demande explicite.

## Contraintes

- Respecte les types TS existants (`ChangelogRelease { version, entries }`, `ChangelogEntry { type }`, `ChangeType`) et les tokens de style (`bg-primary/15`, `text-primary`…). Ces types ne portent plus de texte depuis la tâche 7c — n'y réintroduis pas de champ `title`/`text`/`summary` : le texte vit exclusivement dans les fichiers de locale.
- Les versions les plus récentes sont **en haut** du tableau `RELEASES`.
- Reste factuel : pas d'entrée pour une fonctionnalité qui n'apparaît pas dans les commits.
- Le français des entrées déjà publiées ne se retouche jamais à l'occasion d'une synchro (pas de « pendant que j'y suis, je corrige la formulation de 2.1 ») — une synchro n'ajoute que du contenu nouveau.
- N'exécute jamais `npm run check:i18n:parity` toi-même en laissant une des deux locales de côté « pour l'instant » : si tu t'arrêtes avant l'étape 4 complète (les deux fichiers JSON), tu casses ce garde-fou pour quiconque le lance ensuite. Termine toujours les deux langues avant de t'arrêter.
