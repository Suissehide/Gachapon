#!/usr/bin/env node
// Garde-fou d'existence des clés de traduction — lot 2, tâche 10b.
//
// Vérifie que chaque appel LITTÉRAL de traduction dans `front/src/` résout
// vers une clé qui existe réellement, dans les deux langues, en chargeant
// les vrais fichiers JSON de `src/i18n/locales/{fr,en}/` dans une instance
// i18next et en interrogeant `i18n.exists()` — jamais une réimplémentation
// maison de la résolution de clé.
//
// Pourquoi un troisième garde-fou : `check-i18n-parity.mjs` compare fr/ et
// en/ ENTRE EUX (deux fichiers peuvent être en parité parfaite sans
// contenir une seule clé que le code appelle) ; `check-i18n-hardcoded.mjs`
// cherche du français resté en dur (une clé inexistante n'en est pas) ; le
// build ne voit rien (`t()` accepte n'importe quelle chaîne). Et la
// configuration du dépôt aggrave le silence : `parseMissingKeyHandler:
// (k) => k` et `fallbackLng: false` (voir plus bas) — une clé manquante ne
// lève rien, ne journalise rien, elle s'affiche brute à l'écran.
//
// Usage :
//   node scripts/check-i18n-keys.mjs                       # tout src/
//   node scripts/check-i18n-keys.mjs src/components/team
//   node scripts/check-i18n-keys.mjs src/routes/guide.tsx src/components/team
//   node scripts/check-i18n-keys.mjs --verbose              # + détail des
//                                                            # appels ignorés
//
// Contrairement à check-i18n-hardcoded.mjs, qui n'accepte qu'UN SEUL chemin
// et ignore silencieusement les arguments suivants (piège constaté sur ce
// chantier, qui a produit de fausses mesures), ce script accepte n'importe
// quel nombre de chemins et balaie l'union dédupliquée. Chaque chemin est
// résolu depuis la racine de `front/` (pas depuis le cwd), comme dans
// check-i18n-hardcoded.mjs. Pas de motif glob ici (pas nécessaire pour
// satisfaire la consigne — plusieurs chemins littéraux suffisent) : seuls
// des fichiers ou répertoires réels sont acceptés.
//
// Au-delà des trois formes citées plus haut (`t(...)`, `i18n.t(...)`,
// `i18nKey="..."`), ce script détecte et RÉSOUT aussi (pas seulement
// signale) l'alias de `useTranslation` — `const { t: tShop } =
// useTranslation('shop')` puis `tShop('cle')` — l'idiome standard de
// react-i18next dès qu'un composant a besoin de deux `t` distincts. Aucun
// cas sur ce dépôt à l'écriture de ce script (249 `const { t }`, 0 alias),
// mais c'est prévu : un appel `tShop(...)` est résolu exactement comme un
// `t(...)` ordinaire, contre le namespace de SON PROPRE `useTranslation`
// (voir `resolveVar`/`bindingsByVar` dans `scanFile`), et compté à part
// (`aliasCallCount`, affiché dans le résumé) pour rester visible même s'il
// devait un jour dominer le parc. Deux tolérances de formatage à faible
// coût, elles aussi couvertes : `i18nKey = "…"` avec des espaces autour du
// `=`, et `t\n('…')` avec un saut de ligne avant la parenthèse — aucun cas
// non plus sur ce dépôt (Biome ne laisserait pas passer un fichier formaté
// avec l'un ou l'autre), traités par précaution plutôt que documentés comme
// angle mort puisque le coût était marginal.
//
// Ce script vérifie aussi, sur les ressources JSON elles-mêmes (indépendamment
// de tout appel dans le code), deux défauts qui produisent le même symptôme
// qu'une clé manquante — une clé brute affichée à l'écran — voir
// `checkResourceDefects` plus bas : une VALEUR VIDE, et un `_one` sans
// `_other` correspondant.
//
// ---------------------------------------------------------------------------
// Ce que ce script NE VOIT PAS (à lire avant de faire confiance à un "vert") :
//
// 1. LES CLÉS CONSTRUITES DYNAMIQUEMENT — `t(\`ns:prefix.${variable}\`)`,
//    `t(someVariable)`, `t(LOOKUP[mode])`, `t(cond ? 'a' : 'b')`,
//    `i18nKey={condition ? 'a' : 'b'}`… Ce script ne résout que les
//    arguments qui sont, syntaxiquement, une chaîne littérale (guillemet
//    simple/double, ou template SANS `${…}`). Tout le reste est compté dans
//    "appel(s) dynamique(s) ignoré(s)" à l'exécution, jamais vérifié.
//    MESURÉ sur ce dépôt à l'écriture de ce script (commit 3d376c97, lot 2
//    tâche 10b) : 24 appels sur l'ensemble de `front/src/`, dont 14 avec un
//    template interpolé (`t(\`ns:x.${y}\`)`, `i18nKey={\`ns:x.${y}\`}`) et
//    10 avec un argument qui n'est PAS du tout un littéral — une variable
//    (`t(key)`), une valeur indexée dans un objet (`t(TAB_TITLE_KEY[mode])`)
//    ou une expression ternaire entre deux clés (`i18n.t(cond ? 'a' : 'b')`).
//    24 appels sur plus de 2000 appels littéraux recensés, soit ~1 % du
//    parc. Le compte affiché à l'exécution est celui du jour : s'il dérive
//    fortement de ce chiffre, c'est un signal à part entière (plus
//    d'extraction dynamique = plus de surface hors du filet).
//
// 2. LES CLÉS PASSÉES EN PROPS OU STOCKÉES EN CONSTANTES ET RÉSOLUES
//    AILLEURS — une chaîne `'ns:clé'` assignée à une constante puis passée
//    en paramètre à une fonction qui appelle `t(constante)` plus loin (ou
//    dans un autre fichier) n'est jamais reliée à son usage réel par ce
//    script, qui ne fait pas d'analyse de flux de données inter-fichiers.
//    Seuls les arguments littéraux directement dans l'appel sont vus.
//
// 3. LES CLÉS QUI EXISTENT MAIS DONT LA VALEUR EST MAUVAISE — une traduction
//    qui existe des deux côtés mais dit une bêtise, ou qui a perdu son sens
//    en cours de relecture, ne déclenche rien ici : `i18n.exists()` vérifie
//    la PRÉSENCE d'une entrée, jamais son contenu. C'est `check-i18n-parity.
//    mjs` qui couvre un sous-ensemble de "mauvaise forme" (placeholders et
//    marqueurs JSX qui divergent entre fr et en) — pas ce script.
//
// 4. LA RÉSOLUTION D'ESPACE DE NOMS IMPLICITE DE `<Trans>` EST UNE
//    HEURISTIQUE DE FENÊTRE DE TEXTE, PAS UN PARSEUR JSX. Quand un
//    `i18nKey="clé"` n'a pas de préfixe `ns:`, react-i18next le résout via
//    la prop `t={t}` (ou `ns="…"`) de la balise `<Trans>` englobante — donc
//    ce script cherche `\bt=\{(\w+)\}` ou `\bns=(["'])…\1` dans le texte
//    entre le `<Trans` le plus proche AVANT et le `i18nKey=` lui-même,
//    plutôt que d'analyser l'arbre JSX. Sur ce dépôt, à l'écriture de ce
//    script : 78 `i18nKey` littéraux (+ 1 dynamique, compté dans l'angle
//    mort n°1), dont 70 sans préfixe `ns:` — résolus via cette heuristique de
//    fenêtre, `t={t}` trouvé dans les 70 cas — et 8 portant déjà un préfixe
//    `ns:` explicite, qui n'ont pas besoin de cette résolution (certains ont
//    quand même un `t={t}` à proximité, sans effet : le préfixe l'emporte
//    toujours). Un futur `<Trans>` qui passerait `t` sous un autre nom, ou
//    dont la prop `t=`/`ns=` serait hors de la fenêtre balayée, échapperait
//    silencieusement à la résolution (bascule alors en dernier recours sur
//    le `t` en portée à la position du `i18nKey`, voir point 5).
//
// 5. L'ATTRIBUTION DE NAMESPACE POUR UNE CLÉ NUE EST UNE DEVINETTE, PAS UNE
//    PREUVE — à traiter comme telle, y compris par le lecteur de ce fichier.
//    Pour un appel `t('cléSansNamespace')`, ce script associe le namespace
//    du `useTranslation(...)` **textuellement le plus proche AVANT** dans le
//    même fichier (`nsInScopeAt`), avec un repli `fileWideFallbackNs` quand
//    aucun ne précède ou que le namespace change en cours de fichier : SI
//    tous les `useTranslation(...)` du fichier s'accordent sur le même
//    namespace, ce namespace est utilisé partout dans le fichier. Aucune de
//    ces deux règles n'est une preuve d'unicité — ni l'une ni l'autre ne sait
//    que `t` peut être reçu en PARAMÈTRE depuis un autre fichier (aucune
//    analyse de flux de données inter-fichiers ici, comme au point 2), et
//    même la portée linéaire, quand le repli fichier-entier est désactivé,
//    continue de DEVINER (le `useTranslation` le plus proche avant, pas
//    forcément le bon) plutôt que de renoncer. Fabriqué et vérifié par la
//    revue : deux composants d'un même fichier sur deux namespaces
//    différents, partageant une fonction utilitaire — le repli fichier-entier
//    se désactive bien (namespaces divergents), mais la portée linéaire
//    attribue quand même la fonction partagée au `useTranslation` textuellement
//    le plus proche, qui n'est pas forcément celui du composant qui l'appelle
//    réellement à l'exécution. Une clé qui n'existe que dans le namespace
//    RÉEL (ex. `gacha`) mais que ce script vérifie contre le namespace
//    DEVINÉ (ex. `common`) sort verte si elle y existe AUSSI, silencieusement
//    fausse si le namespace deviné ne la contient pas non plus — un cas que
//    ce script ne peut pas distinguer d'un vrai succès.
//
//    Cas réel où cette devinette s'applique, sur ce dépôt : une fonction
//    utilitaire déclarée AVANT le composant dans le fichier (donc avant tout
//    `useTranslation()` au sens textuel) mais recevant `t` en PARAMÈTRE
//    depuis ce composant — `medalAriaLabel(t, rank)` avant `MedalRank` dans
//    `components/leaderboard/MedalRank.tsx`, ou les fonctions de libellé de
//    `BetPlacePopup.tsx`, `RaidPanel.tsx`, `SettledHistory.tsx`… (9 fichiers).
//    Dans ces 9 fichiers, `fileWideFallbackNs` s'applique proprement car
//    chacun n'a qu'un seul namespace — l'attribution y est correcte, mais
//    PAR CHANCE structurelle (un seul candidat existe dans le fichier), pas
//    parce que le script a prouvé quoi que ce soit sur la provenance réelle
//    de `t`.
//
//    AMPLEUR MESURÉE sur ce dépôt, à l'écriture de ce script : sur les 2072
//    appels littéraux vérifiés, 862 (41,6 %) portent une clé NUE dont le
//    namespace est deviné plutôt que lu dans le texte de la clé elle-même.
//    Parmi ces 862 : 830 clés n'existent QUE dans un seul namespace parmi
//    les 32 — une mauvaise attribution y échouerait bruyamment (rouge), pas
//    silencieusement, puisque la clé ne se trouverait nulle part sous le
//    mauvais namespace deviné. Les 32 restantes existent dans PLUSIEURS
//    namespaces à la fois — c'est SEULEMENT sur ce sous-ensemble (1,5 % du
//    parc total) qu'une mauvaise attribution pourrait passer inaperçue, et
//    encore faut-il que la devinette se trompe réellement (aucun cas connu
//    et confirmé sur ce dépôt aujourd'hui — le cas ci-dessus est fabriqué
//    pour la démonstration, pas observé dans le code réel). C'est cette
//    double condition — mauvaise attribution ET clé dupliquée entre
//    namespaces — qui rend le risque résiduel supportable sans le rendre
//    nul : ce script ne peut pas le fermer sans une vraie analyse de flux de
//    données inter-fichiers, hors de portée ici (point 2).
//
//    Un appel qui échapperait aux deux règles (portée linéaire ET repli
//    fichier entier — aucun `useTranslation` nulle part avant lui dans un
//    fichier aux namespaces divergents) tombe dans le compteur "non
//    résolu(s) faute de contexte" — ni un succès, ni un échec, juste
//    invisible pour ce garde-fou. Mesuré à 0 sur ce dépôt une fois le repli
//    en place.
//
// 6. Les clés PLURIELLES (`clé_one`/`clé_other`, appelées sous leur nom nu
//    avec `{ count }`) sont un piège de dénombrement connu : une résolution
//    naïve (chercher `clé` telle quelle dans le JSON) les déclare manquantes
//    à tort, puisque seules les formes suffixées existent. Ce script ne
//    réimplémente PAS cette résolution : il appelle `i18n.exists(clé, {
//    ns, lng, count: 1 })` — passer `count: 1` active la même bascule
//    `_one`/`_other` qu'à l'exécution réelle de l'app, pour toute clé
//    (pluralisée ou non ; une clé non pluralisée avec `count` passé résout
//    toujours normalement, vérifié). La vraie valeur de `count` utilisée à
//    l'appel réel n'est pas lue depuis le code (elle est souvent une
//    variable) — sans importance ici, seule l'EXISTENCE de la clé nous
//    intéresse, jamais le choix de forme grammaticale.
//
//    Piège INVERSE, distinct de celui-ci et vérifié séparément (pas par
//    `i18n.exists()`, qui ne peut pas le voir) : un `_one` SANS `_other`
//    correspondant. `exists(clé, { count: 1 })` répond `true` (la forme
//    `_one` existe), mais `count !== 1` cherche `_other`, ne le trouve pas,
//    et affiche la clé brute — un trou que `check-i18n-parity.mjs` ne voit
//    pas non plus (le même trou présent à l'identique en fr et en est en
//    parité parfaite). `checkResourceDefects` (plus bas) le vérifie
//    directement sur les ressources JSON, indépendamment des appels au code
//    — voir ce nom dans le fichier pour le détail.
//
// Seuls `.ts`/`.tsx` sont balayés (comme check-i18n-hardcoded.mjs) —
// `src/i18n/locales/**/*.json` n'est jamais scanné pour des APPELS (il est
// lui-même la SOURCE contre laquelle on résout) et `routeTree.gen.ts`
// (généré) est exclu.
//
// Dernier détail mineur, sans conséquence connue : la recherche de `t(`/
// `i18n.t(`/`i18nKey=` porte sur le texte nettoyé des COMMENTAIRES, mais pas
// des CHAÎNES — leur contenu doit rester lisible pour y trouver du texte
// JSX, des URLs, etc. (même choix que check-i18n-hardcoded.mjs). Un `t(...)`
// cité littéralement à l'intérieur d'une chaîne (de la documentation
// utilisateur qui montre un exemple de code, par ex.) serait donc traité
// comme un vrai appel. Ça échoue dans le bon sens — une fausse alerte, pas
// un vrai défaut passé sous silence — et le dépôt n'en contient aucun cas.
//
// `front/scripts/` est hors du périmètre de Biome (voir biome.json) : style
// tenu à la main, guillemets simples, pas de point-virgule, comme les deux
// scripts voisins.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT_ROOT = path.resolve(__dirname, '..')
const SRC_ROOT = path.join(FRONT_ROOT, 'src')
const LOCALES_ROOT = path.join(SRC_ROOT, 'i18n', 'locales')
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])

// ---------------------------------------------------------------------------
// Configuration REPRODUITE depuis `src/i18n/index.ts` — jamais importée : ce
// script tourne sous Node nu, sans Vite ni TypeScript, et ce module a de
// toute façon un effet de bord au chargement (`i18next.init()`, qui pointe
// vers le DOM/window via `window.location.pathname`, absent sous Node). Si
// l'une des valeurs ci-dessous change dans `src/i18n/index.ts` (liste de
// namespaces, `defaultNS`, `fallbackLng`, séparateurs), reporter le
// changement ici à la main — rien ne les garde synchronisés automatiquement.
const LOCALES = ['fr', 'en']
const DEFAULT_NS = 'common' // src/i18n/index.ts: defaultNS: 'common'
const NAMESPACES = [
  // src/i18n/index.ts: champ `ns` de i18next.init(), ordre non significatif
  // ici mais recopié tel quel pour rester visiblement identique.
  'about',
  'discord',
  'common',
  'errors',
  'notifications',
  'layout',
  'passives',
  'achievements',
  'skills',
  'teamPerks',
  'shop',
  'admin',
  'auth',
  'combat',
  'team',
  'wagers',
  'collection',
  'wishlist',
  'profile',
  'rewards',
  'stats',
  'streak',
  'equipment',
  'gacha',
  'quests',
  'leaderboard',
  'home',
  'guide',
  'changelog',
  'level',
  'machine',
  'settings',
]
// keySeparator ('.') et nsSeparator (':') : src/i18n/index.ts ne les
// surcharge pas dans son `interpolation`/`init`, donc ce sont les valeurs
// PAR DÉFAUT d'i18next — celles que l'instance construite plus bas utilise
// aussi, sans avoir besoin de les repasser explicitement.

// ---------------------------------------------------------------------------
// Chargement des ressources et construction de l'instance i18next
// ---------------------------------------------------------------------------

async function loadResources() {
  const resources = {}
  for (const locale of LOCALES) {
    resources[locale] = {}
    for (const ns of NAMESPACES) {
      const file = path.join(LOCALES_ROOT, locale, `${ns}.json`)
      let raw
      try {
        raw = await fs.readFile(file, 'utf8')
      } catch (err) {
        throw new Error(
          `[check-i18n-keys] fichier de namespace introuvable : ${file} — la liste NAMESPACES de ce script a-t-elle divergé de src/i18n/index.ts ? (${err.message})`,
        )
      }
      try {
        resources[locale][ns] = JSON.parse(raw)
      } catch (err) {
        throw new Error(`[check-i18n-keys] ${file}: JSON invalide : ${err.message}`)
      }
    }
  }
  return resources
}

async function buildI18nInstance(resources) {
  const instance = i18next.createInstance()
  await instance.init({
    resources,
    lng: LOCALES[0],
    defaultNS: DEFAULT_NS,
    ns: NAMESPACES,
    // Repris de src/i18n/index.ts : aucun repli silencieux entre langues —
    // une clé manquante en fr ne doit jamais être déclarée "trouvée" parce
    // qu'elle existe en en (ou l'inverse). Chaque langue est vérifiée pour
    // de vrai, indépendamment (voir la boucle `for (const locale of LOCALES)`
    // dans `main`).
    fallbackLng: false,
    parseMissingKeyHandler: (key) => key,
    // `returnEmptyString` (défaut `true` chez i18next, mis à `false` dans
    // src/i18n/index.ts) n'est PAS repris ici, volontairement : cette option
    // gouverne ce que `t()` RENVOIE pour une clé de valeur vide, pas ce que
    // `i18n.exists()` répond — et c'est `exists()`, pas `t()`, que ce script
    // appelle. Vérifié empiriquement avant l'écriture de ce script :
    // `exists()` répond `true` pour une clé de valeur vide quelle que soit
    // la valeur de `returnEmptyString`. La reprendre ne changerait donc rien
    // ici ; c'est pour ça qu'elle est absente de ce bloc, pas par oubli.
    // La valeur vide elle-même reste un vrai défaut : voir
    // `checkResourceDefects` plus bas, qui la traite indépendamment de
    // `exists()`.
  })
  return instance
}

/** Aplatit un objet JSON de traductions en `{ "a.b.c": "valeur" }` — ne
 * garde que les feuilles chaîne (une valeur non textuelle est un défaut de
 * forme déjà couvert par check-i18n-parity.mjs, pas le sujet ici). */
function flattenStrings(obj, prefix, out) {
  for (const [key, value] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenStrings(value, keyPath, out)
      continue
    }
    if (typeof value === 'string') {
      out[keyPath] = value
    }
  }
  return out
}

/**
 * Vérifie les fichiers de ressources EUX-MÊMES, indépendamment de tout appel
 * dans le code, pour deux défauts qui produisent exactement le symptôme que
 * ce script existe pour empêcher — une clé brute affichée à l'écran — sans
 * qu'aucune clé ne soit pourtant "absente" au sens où `i18n.exists()`
 * l'entend :
 *
 *   - VALEUR VIDE : `i18n.exists()` répond `true` (la clé existe belle et
 *     bien), mais avec `returnEmptyString: false` — le réglage réel de
 *     src/i18n/index.ts, vérifié empiriquement ci-dessus — `t()` rend la clé
 *     BRUTE pour une valeur vide, exactement comme pour une clé manquante.
 *   - `_one` SANS `_other` correspondant : `i18n.exists(clé, { count: 1 })`
 *     répond `true` (voir angle mort n°6), mais dès que `count !== 1`,
 *     i18next cherche `_other`, ne le trouve pas, et affiche la clé brute.
 *     `check-i18n-parity.mjs` ne le voit pas non plus : un `_one` orphelin
 *     PRÉSENT À L'IDENTIQUE dans les deux langues est en parité parfaite —
 *     rien n'y signale un trou pluriel, seulement une différence entre fr et
 *     en.
 *
 * Toujours vérifié sur la TOTALITÉ des ressources, jamais restreint par les
 * arguments de chemin de ce script (qui ne scopent que les fichiers SOURCE
 * balayés pour des appels, pas les ressources elles-mêmes) — même logique
 * que check-i18n-parity.mjs, qui ne prend d'ailleurs aucun argument pour
 * cette raison précise.
 *
 * Aucun cas des deux sur ce dépôt à l'écriture de ce script.
 */
function checkResourceDefects(resources) {
  const problems = []
  for (const locale of LOCALES) {
    for (const ns of NAMESPACES) {
      const flat = flattenStrings(resources[locale][ns], '', {})
      for (const [key, value] of Object.entries(flat)) {
        if (value.trim().length === 0) {
          problems.push(
            `src/i18n/locales/${locale}/${ns}.json: valeur vide pour la clé "${ns}:${key}"`,
          )
        }
        if (key.endsWith('_one')) {
          const otherKey = `${key.slice(0, -'_one'.length)}_other`
          if (!(otherKey in flat)) {
            problems.push(
              `src/i18n/locales/${locale}/${ns}.json: "${ns}:${key}" est plurielle sans "${ns}:${otherKey}" — count !== 1 affichera la clé brute`,
            )
          }
        }
      }
    }
  }
  return problems
}

// ---------------------------------------------------------------------------
// Lecture de littéraux de chaîne JS (guillemets simples/doubles, templates)
// ---------------------------------------------------------------------------

/**
 * Depuis `pos`, qui doit pointer sur un délimiteur de chaîne (`'`, `"` ou
 * `` ` ``), lit un littéral complet. Renvoie `null` si `pos` ne pointe pas
 * sur un délimiteur, ou si aucune fermeture valide n'a été trouvée (chaîne
 * mal formée, ou guillemet simple/double contenant un saut de ligne — ce qui
 * n'est jamais un littéral JS valide).
 *
 * Pour un backtick, la profondeur des interpolations `${…}` est suivie pour
 * ne pas refermer prématurément sur un backtick niché dans une expression —
 * et `dynamic: true` est renvoyé dès qu'une interpolation est rencontrée
 * (peu importe ce qu'elle contient : ce script ne l'évalue jamais).
 */
function readStringLiteral(source, pos) {
  const quote = source[pos]
  if (quote !== "'" && quote !== '"' && quote !== '`') {
    return null
  }

  if (quote !== '`') {
    let i = pos + 1
    let raw = ''
    while (i < source.length) {
      const c = source[i]
      if (c === '\n') {
        return null
      }
      if (c === '\\') {
        raw += c + (source[i + 1] ?? '')
        i += 2
        continue
      }
      if (c === quote) {
        return { end: i + 1, raw, dynamic: false }
      }
      raw += c
      i += 1
    }
    return null
  }

  let i = pos + 1
  let raw = ''
  let depth = 0
  let hasInterpolation = false
  while (i < source.length) {
    const c = source[i]
    if (c === '\\') {
      raw += c + (source[i + 1] ?? '')
      i += 2
      continue
    }
    if (depth === 0 && c === '`') {
      return { end: i + 1, raw, dynamic: hasInterpolation }
    }
    if (c === '$' && source[i + 1] === '{') {
      hasInterpolation = true
      depth += 1
      raw += '${'
      i += 2
      continue
    }
    if (depth > 0 && c === '{') {
      depth += 1
      raw += c
      i += 1
      continue
    }
    if (depth > 0 && c === '}') {
      depth -= 1
      raw += c
      i += 1
      continue
    }
    raw += c
    i += 1
  }
  return null
}

function skipWhitespace(source, pos) {
  let i = pos
  while (i < source.length && /\s/.test(source[i])) {
    i += 1
  }
  return i
}

/**
 * Depuis `pos` juste après un `{` ouvrant (attribut JSX `i18nKey={…}`), lit
 * jusqu'à l'accolade fermante correspondante, en respectant les guillemets/
 * templates rencontrés (leurs propres `{`/`}` internes ne comptent pas dans
 * la profondeur — cf. `${step.id}` dans un template, qui a ses propres
 * accolades à ignorer pour ce comptage). Renvoie `null` si aucune fermeture
 * n'a été trouvée.
 */
function readBracedExpression(source, pos) {
  let depth = 1
  let i = pos
  let text = ''
  while (i < source.length) {
    const c = source[i]
    if (c === "'" || c === '"' || c === '`') {
      const lit = readStringLiteral(source, i)
      if (lit === null) {
        return null
      }
      text += source.slice(i, lit.end)
      i = lit.end
      continue
    }
    if (c === '{') {
      depth += 1
      text += c
      i += 1
      continue
    }
    if (c === '}') {
      depth -= 1
      if (depth === 0) {
        return { text, end: i + 1 }
      }
      text += c
      i += 1
      continue
    }
    text += c
    i += 1
  }
  return null
}

// ---------------------------------------------------------------------------
// Retrait des commentaires — adapté de `stripComments` dans
// check-i18n-hardcoded.mjs (même tokenizer, mêmes protections : URLs
// `xxx://` non prises pour des commentaires, resynchronisation en fin de
// ligne pour ne pas se faire piéger par l'apostrophe du français en JSX,
// littéraux regex non confondus avec une division). Voir ce fichier pour la
// documentation complète des angles morts — non dupliquée ici pour ne pas
// diverger de la version canonique.
// ---------------------------------------------------------------------------

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'case',
  'new',
  'delete',
  'void',
  'throw',
  'yield',
  'await',
  'do',
  'else',
])

function canStartRegex(out) {
  let j = out.length - 1
  while (j >= 0 && /\s/.test(out[j])) {
    j -= 1
  }
  if (j < 0) {
    return true
  }
  const ch = out[j]
  if (ch === ')' || ch === ']') {
    return false
  }
  if (/[A-Za-z0-9_$]/.test(ch)) {
    let k = j
    while (k >= 0 && /[A-Za-z0-9_$]/.test(out[k])) {
      k -= 1
    }
    const word = out.slice(k + 1, j + 1)
    return REGEX_PRECEDING_KEYWORDS.has(word)
  }
  return true
}

function tryConsumeRegex(source, start) {
  let i = start + 1
  let inCharClass = false
  while (i < source.length) {
    const c = source[i]
    if (c === '\n') {
      return null
    }
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '[') {
      inCharClass = true
      i += 1
      continue
    }
    if (c === ']') {
      inCharClass = false
      i += 1
      continue
    }
    if (c === '/' && !inCharClass) {
      i += 1
      while (i < source.length && /[A-Za-z]/.test(source[i])) {
        i += 1
      }
      return i
    }
    i += 1
  }
  return null
}

function stripComments(source) {
  let out = ''
  let state = 'code'
  let i = 0
  const n = source.length

  while (i < n) {
    const c = source[i]
    const c2 = i + 1 < n ? source[i + 1] : ''

    if (state === 'code') {
      if (c === '/' && c2 === '/') {
        if (i > 0 && source[i - 1] === ':') {
          out += c + c2
          i += 2
          continue
        }
        state = 'lineComment'
        out += '  '
        i += 2
        continue
      }
      if (c === '/' && c2 === '*') {
        state = 'blockComment'
        out += '  '
        i += 2
        continue
      }
      if (c === '/' && canStartRegex(out)) {
        const end = tryConsumeRegex(source, i)
        if (end !== null) {
          out += source.slice(i, end)
          i = end
          continue
        }
      }
      if (c === "'") {
        state = 'singleQuote'
        out += c
        i += 1
        continue
      }
      if (c === '"') {
        state = 'doubleQuote'
        out += c
        i += 1
        continue
      }
      if (c === '`') {
        state = 'template'
        out += c
        i += 1
        continue
      }
      out += c
      i += 1
      continue
    }

    if (state === 'lineComment') {
      if (c === '\n') {
        state = 'code'
        out += '\n'
      } else {
        out += ' '
      }
      i += 1
      continue
    }

    if (state === 'blockComment') {
      if (c === '*' && c2 === '/') {
        state = 'code'
        out += '  '
        i += 2
        continue
      }
      out += c === '\n' ? '\n' : ' '
      i += 1
      continue
    }

    const closing = state === 'singleQuote' ? "'" : state === 'doubleQuote' ? '"' : '`'

    if (c === '\n' && state !== 'template') {
      state = 'code'
      out += '\n'
      i += 1
      continue
    }

    if (c === '\\') {
      out += c + c2
      i += 2
      continue
    }
    if (c === closing) {
      state = 'code'
      out += c
      i += 1
      continue
    }
    out += c
    i += 1
  }

  return out
}

// ---------------------------------------------------------------------------
// Suivi de la portée de `useTranslation()` (voir angle mort n°5 en tête de
// fichier) et extraction des appels littéraux
// ---------------------------------------------------------------------------

// Groupe 1 : alias éventuel (`const { t: tShop } = useTranslation(...)`),
// `undefined` si l'identifiant est le `t` par défaut. Groupe 2 : argument
// textuel de `useTranslation(...)`. Aucun cas d'alias sur ce dépôt à
// l'écriture de ce script (249 `const { t }`, 0 alias) — mais c'est
// l'idiome standard de react-i18next dès qu'un composant a besoin de deux
// `t` distincts, donc détecté dès maintenant plutôt qu'après coup.
const USE_TRANSLATION_RE =
  /const\s*\{\s*t(?:\s*:\s*(\w+))?\s*(?:,\s*i18n\s*)?\}\s*=\s*useTranslation\(([^)]*)\)/g

/**
 * Interprète l'argument textuel d'un `useTranslation(...)` en liste de
 * namespaces candidats, ou `null` si l'argument n'est pas entièrement fait
 * de littéraux de chaîne (variable, expression, ns construit dynamiquement —
 * dans ce cas la portée qui en dépend devient elle aussi irrésolue).
 */
function parseNsArg(argText) {
  const trimmed = argText.trim()
  if (trimmed === '') {
    return [DEFAULT_NS]
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)
    const strRe = /'([^']*)'|"([^"]*)"/g
    const items = []
    let m
    while ((m = strRe.exec(inner))) {
      items.push(m[1] ?? m[2])
    }
    const withoutStrings = inner.replace(strRe, '')
    if (/[^\s,]/.test(withoutStrings)) {
      return null
    }
    return items.length > 0 ? items : null
  }
  const single = trimmed.match(/^'([^']*)'$/) ?? trimmed.match(/^"([^"]*)"$/)
  if (single) {
    return [single[1]]
  }
  return null
}

/**
 * `bindings` : liste ordonnée `{ pos, ns }` (déjà filtrée sur UN SEUL
 * identifiant — voir `bindingsByVar` dans `scanFile`), dans l'ordre du
 * texte. Renvoie le namespace en vigueur pour un appel à la position `pos`
 * — celui du dernier `useTranslation` de CET identifiant rencontré AVANT
 * cette position (portée suivie linéairement, voir angle mort n°5), ou
 * `null` si aucun (ou si son argument était lui-même dynamique).
 */
function nsInScopeAt(bindings, pos) {
  let candidate = null
  for (const b of bindings) {
    if (b.pos > pos) {
      break
    }
    candidate = b.ns
  }
  return candidate
}

/**
 * Une entrée par `useTranslation(...)` du fichier, avec l'identifiant réel
 * auquel `t` est lié — `'t'` par défaut, ou l'alias capturé par
 * `USE_TRANSLATION_RE` (`const { t: tShop } = useTranslation('shop')` →
 * `varName: 'tShop'`).
 */
function collectTBindings(source) {
  const bindings = []
  USE_TRANSLATION_RE.lastIndex = 0
  let m
  while ((m = USE_TRANSLATION_RE.exec(source))) {
    bindings.push({ pos: m.index, ns: parseNsArg(m[2]), varName: m[1] ?? 't' })
  }
  return bindings
}

/** Regroupe `bindings` par identifiant (`'t'`, `'tShop'`, …), ordre conservé. */
function groupBindingsByVar(bindings) {
  const byVar = new Map()
  for (const b of bindings) {
    if (!byVar.has(b.varName)) {
      byVar.set(b.varName, [])
    }
    byVar.get(b.varName).push(b)
  }
  return byVar
}

/**
 * Repli pour les fonctions utilitaires déclarées AVANT le composant dans le
 * même fichier (donc avant tout `useTranslation()` au sens purement textuel
 * de `nsInScopeAt`) mais qui reçoivent `t` en PARAMÈTRE depuis ce composant
 * — un cas réel sur ce dépôt (`medalAriaLabel(t, ...)` avant `MedalRank`,
 * dans `components/leaderboard/MedalRank.tsx`, par ex.). Sans pouvoir suivre
 * ce passage de paramètre (il faudrait une vraie analyse de flux de
 * données), ce script se rabat sur une heuristique, PAS une preuve : SI tous
 * les `useTranslation(...)` du fichier s'accordent sur le MÊME namespace (ou
 * le même jeu de namespaces), ce namespace est utilisé pour tout `t(...)` du
 * fichier — ce n'est vrai QUE si aucune fonction de ce fichier ne reçoit par
 * ailleurs un `t` lié à un AUTRE namespace depuis un fichier tiers, ce que ce
 * script ne peut pas savoir. Dès que deux `useTranslation()` du fichier
 * divergent (ex. `components/battle/resultKit.tsx`, où deux fonctions
 * successives lient `t` à 'machine' puis à 'combat'), ce repli renvoie
 * `null` — mais `nsInScopeAt`, appelé avant lui par l'appelant, continue
 * dans ce cas de deviner par portée linéaire (le `useTranslation` textuellement
 * le plus proche avant), pas de renoncer : voir l'angle mort n°5 en tête de
 * fichier pour la mesure du risque résiduel (862 clés nues concernées, dont
 * 32 pourraient masquer une mauvaise attribution).
 */
function fileWideFallbackNs(bindings) {
  if (bindings.length === 0) {
    return null
  }
  const first = bindings[0].ns
  if (first === null) {
    return null
  }
  const firstKey = JSON.stringify(first)
  for (const b of bindings) {
    if (b.ns === null || JSON.stringify(b.ns) !== firstKey) {
      return null
    }
  }
  return first
}

// `i18nKey` : espaces tolérés autour du `=` (JSX l'autorise, même si Biome
// ne le laisse jamais passer un fichier formaté — mieux vaut le couvrir, le
// coût est nul). `t\s*\(`/alias : espace ou saut de ligne tolérés entre
// l'identifiant et la parenthèse ouvrante, pour la même raison (voir aussi
// la construction de CALL_RE plus bas, qui applique la même tolérance aux
// alias détectés).
const I18NKEY_RE = /i18nKey\s*=\s*/g

/**
 * Résout, pour un identifiant `varName` donné (`'t'`, ou un alias comme
 * `'tShop'`), le namespace en vigueur à la position `pos` : portée linéaire
 * d'abord (`nsInScopeAt`, sur les seules liaisons de CET identifiant), puis
 * repli fichier-entier (`fileWideFallbackNs`, sur les mêmes liaisons
 * filtrées). Renvoie `null` si l'identifiant n'a aucune liaison connue dans
 * le fichier, ou si les deux règles échouent.
 */
function resolveVar(bindingsByVar, varName, pos) {
  const list = bindingsByVar.get(varName) ?? []
  return nsInScopeAt(list, pos) ?? fileWideFallbackNs(list)
}

/**
 * Balaie un fichier (déjà nettoyé de ses commentaires) et renvoie :
 *   - `literals` : `{ pos, key, ns, kind }[]` — `ns` est `null` si `key`
 *     porte déjà un préfixe `ns:` (auquel cas i18next l'utilisera de toute
 *     façon en priorité, voir plus bas), sinon la liste de namespaces
 *     candidats à passer en option `ns` de `i18n.exists()`. `kind` est soit
 *     `'i18n.t'`, soit `'Trans i18nKey'`, soit l'identifiant réel appelé —
 *     `'t'` la plupart du temps, ou un alias (`'tShop'`) le cas échéant.
 *   - `dynamicCount` : nombre d'appels dont le premier argument n'est pas un
 *     littéral entièrement statique (angle mort n°1).
 *   - `unresolvedCount` : nombre d'appels dont la clé EST littérale mais dont
 *     le namespace par défaut n'a pas pu être déterminé (angles morts n°4/5)
 *     — ni un succès, ni un échec : simplement pas vérifiés.
 *   - `aliasCallCount` : parmi `literals`, combien ont été résolus via un
 *     alias de `useTranslation` (`kind` ni `'t'`, ni `'i18n.t'`, ni
 *     `'Trans i18nKey'`) — juste pour la visibilité en sortie, voir
 *     `--verbose` et le compteur global dans `main`.
 *   - `dynamicEntries`/`unresolvedEntries` : `{ pos, kind }[]` — le détail
 *     positionnel derrière `dynamicCount`/`unresolvedCount`, pour `--verbose`
 *     uniquement (sans lui, `main` ne s'en sert pas, juste les compteurs).
 */
function scanFile(source) {
  const bindings = collectTBindings(source)
  const bindingsByVar = groupBindingsByVar(bindings)
  // 't' est toujours un identifiant candidat, même si aucun useTranslation()
  // ne le lie dans ce fichier précis (t reçu en paramètre — voir angle mort
  // n°5) : sans lui, un simple `t('ns:clé')` déjà préfixé ne serait même
  // plus repéré du tout.
  const varNames = new Set(['t', ...bindingsByVar.keys()])
  const callAlternatives = [...varNames].sort((a, b) => b.length - a.length)
  const callRe = new RegExp(`\\bi18n\\.t\\s*\\(|\\b(?:${callAlternatives.join('|')})\\s*\\(`, 'g')

  const literals = []
  let dynamicCount = 0
  let unresolvedCount = 0
  let aliasCallCount = 0
  const dynamicEntries = []
  const unresolvedEntries = []

  callRe.lastIndex = 0
  let m
  while ((m = callRe.exec(source))) {
    const isI18n = m[0].startsWith('i18n')
    // Identifiant réellement appelé (`t`, `tShop`…) — vide pour i18n.t.
    const calledVar = isI18n ? null : m[0].slice(0, m[0].lastIndexOf('(')).trim()
    const argStart = skipWhitespace(source, callRe.lastIndex)
    const lit = readStringLiteral(source, argStart)
    if (lit === null || lit.dynamic) {
      dynamicCount += 1
      dynamicEntries.push({ pos: m.index, kind: isI18n ? 'i18n.t' : calledVar })
      continue
    }
    const key = lit.raw
    let ns
    if (key.includes(':')) {
      ns = null
    } else if (isI18n) {
      // `i18n.t(...)` est l'instance i18next brute (pas le `t` lié d'un
      // useTranslation local) : sans préfixe, elle résout contre defaultNS.
      ns = [DEFAULT_NS]
    } else {
      const scoped = resolveVar(bindingsByVar, calledVar, m.index)
      if (scoped === null) {
        unresolvedCount += 1
        unresolvedEntries.push({ pos: m.index, kind: calledVar })
        continue
      }
      ns = scoped
    }
    const kind = isI18n ? 'i18n.t' : calledVar
    if (!isI18n && calledVar !== 't') {
      aliasCallCount += 1
    }
    literals.push({ pos: m.index, key, ns, kind })
  }

  I18NKEY_RE.lastIndex = 0
  while ((m = I18NKEY_RE.exec(source))) {
    const afterPos = I18NKEY_RE.lastIndex
    const after = source[afterPos]
    let lit
    if (after === '{') {
      const braced = readBracedExpression(source, afterPos + 1)
      if (braced === null) {
        dynamicCount += 1
        dynamicEntries.push({ pos: m.index, kind: 'Trans i18nKey' })
        continue
      }
      const trimmedInner = braced.text.trim()
      const innerLit = readStringLiteral(trimmedInner, 0)
      if (innerLit === null || innerLit.end !== trimmedInner.length) {
        // Pas un littéral seul (ex. `i18nKey={cond ? 'a' : 'b'}`) — dynamique.
        dynamicCount += 1
        dynamicEntries.push({ pos: m.index, kind: 'Trans i18nKey' })
        continue
      }
      lit = innerLit
    } else {
      lit = readStringLiteral(source, afterPos)
    }
    if (lit === null || lit.dynamic) {
      dynamicCount += 1
      dynamicEntries.push({ pos: m.index, kind: 'Trans i18nKey' })
      continue
    }
    const key = lit.raw
    let ns
    if (key.includes(':')) {
      ns = null
    } else {
      // Résolution du namespace implicite via la balise <Trans> englobante
      // — heuristique de fenêtre de texte, voir angle mort n°4.
      const transStart = source.lastIndexOf('<Trans', m.index)
      let resolved = null
      if (transStart !== -1) {
        const window = source.slice(transStart, m.index)
        const tPropMatch = window.match(/\bt=\{(\w+)\}/)
        if (tPropMatch) {
          resolved = resolveVar(bindingsByVar, tPropMatch[1], transStart)
        } else {
          const nsPropMatch = window.match(/\bns=(["'])([^"']+)\1/)
          if (nsPropMatch) {
            resolved = [nsPropMatch[2]]
          }
        }
      }
      if (resolved === null) {
        // Dernier recours : le `t` par défaut en portée à l'endroit du
        // i18nKey lui-même (portée linéaire + repli fichier entier).
        resolved = resolveVar(bindingsByVar, 't', m.index)
      }
      if (resolved === null) {
        unresolvedCount += 1
        unresolvedEntries.push({ pos: m.index, kind: 'Trans i18nKey' })
        continue
      }
      ns = resolved
    }
    literals.push({ pos: m.index, key, ns, kind: 'Trans i18nKey' })
  }

  literals.sort((a, b) => a.pos - b.pos)
  dynamicEntries.sort((a, b) => a.pos - b.pos)
  unresolvedEntries.sort((a, b) => a.pos - b.pos)
  return { literals, dynamicCount, unresolvedCount, aliasCallCount, dynamicEntries, unresolvedEntries }
}

// ---------------------------------------------------------------------------
// Positions ligne:colonne
// ---------------------------------------------------------------------------

function buildLineOffsets(source) {
  const offsets = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') {
      offsets.push(i + 1)
    }
  }
  return offsets
}

function offsetToLineCol(lineOffsets, offset) {
  let lo = 0
  let hi = lineOffsets.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineOffsets[mid] <= offset) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return { line: lo + 1, column: offset - lineOffsets[lo] + 1 }
}

// ---------------------------------------------------------------------------
// Parcours du système de fichiers — accepte 0..N chemins (voir en-tête)
// ---------------------------------------------------------------------------

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, out)
      continue
    }
    if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
}

async function resolveOneTarget(arg) {
  const target = path.isAbsolute(arg) ? arg : path.join(FRONT_ROOT, arg)
  const st = await fs.stat(target).catch(() => null)
  if (!st) {
    console.error(`[check-i18n-keys] chemin introuvable : ${target}`)
    process.exit(1)
  }
  if (st.isFile()) {
    return SCAN_EXTENSIONS.has(path.extname(target)) ? [target] : []
  }
  const all = []
  await walk(target, all)
  return all
}

async function resolveTargets(args) {
  if (args.length === 0) {
    const all = []
    await walk(SRC_ROOT, all)
    return all
  }
  const seen = new Set()
  const merged = []
  for (const arg of args) {
    for (const f of await resolveOneTarget(arg)) {
      if (!seen.has(f)) {
        seen.add(f)
        merged.push(f)
      }
    }
  }
  return merged
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

/**
 * `--verbose` (n'importe où dans les arguments) : liste, en plus des clés
 * introuvables, CHAQUE appel dynamique et CHAQUE appel non résolu avec son
 * `fichier:ligne`. Sans lui, un fichier où RIEN n'a pu être vérifié (tout
 * dynamique, ou tout non résolu) sort quand même `OK` — le compteur global
 * le montre, mais rien ne dit LEQUEL des deux ni OÙ. Retiré des arguments
 * avant de les passer à `resolveTargets` (ce n'est pas un chemin).
 */
function parseArgs(argv) {
  const verbose = argv.includes('--verbose')
  const paths = argv.filter((a) => a !== '--verbose')
  return { verbose, paths }
}

async function main() {
  const { verbose, paths } = parseArgs(process.argv.slice(2))
  const targets = (await resolveTargets(paths)).filter(
    (f) => path.basename(f) !== 'routeTree.gen.ts',
  )

  const resources = await loadResources()
  const resourceProblems = checkResourceDefects(resources)
  const i18n = await buildI18nInstance(resources)

  const problems = [...resourceProblems]
  const dynamicLines = []
  const unresolvedLines = []
  let literalCount = 0
  let dynamicCount = 0
  let unresolvedCount = 0
  let aliasCallCount = 0

  for (const file of targets.sort()) {
    const source = await fs.readFile(file, 'utf8')
    const stripped = stripComments(source)
    const lineOffsets = buildLineOffsets(stripped)
    const rel = path.relative(FRONT_ROOT, file)
    const {
      literals,
      dynamicCount: fileDynamic,
      unresolvedCount: fileUnresolved,
      aliasCallCount: fileAliasCalls,
      dynamicEntries,
      unresolvedEntries,
    } = scanFile(stripped)

    dynamicCount += fileDynamic
    unresolvedCount += fileUnresolved
    aliasCallCount += fileAliasCalls

    if (verbose) {
      for (const entry of dynamicEntries) {
        const { line } = offsetToLineCol(lineOffsets, entry.pos)
        dynamicLines.push(`${rel}:${line}: appel ${entry.kind} — argument non littéral`)
      }
      for (const entry of unresolvedEntries) {
        const { line } = offsetToLineCol(lineOffsets, entry.pos)
        unresolvedLines.push(`${rel}:${line}: appel ${entry.kind} — namespace non résolu`)
      }
    }

    for (const entry of literals) {
      literalCount += 1
      const { line, column } = offsetToLineCol(lineOffsets, entry.pos)
      for (const locale of LOCALES) {
        const exists = i18n.exists(entry.key, {
          lng: locale,
          ns: entry.ns ?? [DEFAULT_NS], // ignoré si `entry.key` a un préfixe ns:
          count: 1, // neutralise le piège des clés plurielles — voir angle mort n°6
        })
        if (!exists) {
          problems.push(
            `${rel}:${line}:${column}: clé "${entry.key}" introuvable (${locale}) — appel ${entry.kind}`,
          )
        }
      }
    }
  }

  const summary = `${literalCount} appel(s) littéral(aux) vérifié(s), dont ${aliasCallCount} via un alias de useTranslation ; ${dynamicCount} appel(s) dynamique(s) ignoré(s) (angle mort n°1) ; ${unresolvedCount} non résolu(s) faute de contexte (angles morts n°4/5) ; sur ${targets.length} fichier(s) scanné(s).`

  if (verbose && (dynamicLines.length > 0 || unresolvedLines.length > 0)) {
    console.error(`[check-i18n-keys] --verbose — appels ignorés en détail :\n`)
    for (const line of dynamicLines) {
      console.error(`  - [dynamique] ${line}`)
    }
    for (const line of unresolvedLines) {
      console.error(`  - [non résolu] ${line}`)
    }
    console.error('')
  }

  if (problems.length > 0) {
    console.error(`[check-i18n-keys] ${problems.length} défaut(s) :\n`)
    for (const problem of problems) {
      console.error(`  - ${problem}`)
    }
    console.error(`\n[check-i18n-keys] ${summary}`)
    process.exitCode = 1
    return
  }

  console.log(`[check-i18n-keys] OK (fr + en) — ${summary}`)
}

main().catch((err) => {
  console.error('[check-i18n-keys] échec inattendu :', err)
  process.exit(1)
})
