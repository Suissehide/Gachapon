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
//   node scripts/check-i18n-keys.mjs src/components/shop
//   node scripts/check-i18n-keys.mjs src/routes/guide.tsx src/components/team
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
//    script, cette heuristique couvre 77 des 78 `i18nKey` sans encombre
//    (l'identifiant lié est toujours littéralement `t`) ; les 2 restants ont
//    déjà un préfixe `ns:` explicite et n'ont pas besoin de cette
//    résolution. Un futur `<Trans>` qui passerait `t` sous un autre nom, ou
//    dont la prop `t=`/`ns=` serait hors de la fenêtre balayée, échapperait
//    silencieusement à la résolution (bascule alors en dernier recours sur
//    le `t` en portée à la position du `i18nKey`, voir point 5).
//
// 5. LA PORTÉE DE `useTranslation()` EST SUIVIE LINÉAIREMENT, PAS PAR VRAIE
//    ANALYSE DE PORTÉE JS. Pour un appel `t('cléSansNamespace')`, ce script
//    associe le namespace par défaut du `useTranslation(...)` **textuellement
//    le plus proche AVANT** dans le même fichier — pas celui de la fonction
//    qui englobe réellement l'appel. Ça fonctionne correctement tant que les
//    composants d'un même fichier ne s'imbriquent pas et que chacun appelle
//    `useTranslation` avant son propre JSX (le cas de ce dépôt : par ex.
//    `components/battle/resultKit.tsx` définit deux fonctions séquentielles,
//    chacune avec son propre `const { t } = useTranslation(...)` sur un
//    namespace différent — la portée n'y est jamais chevauchante).
//
//    Cas réel et fréquent que la règle "le plus proche AVANT" rate seule :
//    une fonction utilitaire déclarée AVANT le composant dans le fichier
//    (donc avant tout `useTranslation()` au sens textuel) mais qui reçoit
//    `t` en PARAMÈTRE depuis ce composant — `medalAriaLabel(t, rank)` avant
//    `MedalRank` dans `components/leaderboard/MedalRank.tsx`, ou les
//    fonctions de libellé de `BetPlacePopup.tsx`, `RaidPanel.tsx`,
//    `SettledHistory.tsx`… (9 fichiers, 37 appels mesurés à l'écriture de ce
//    script). Ce script ne suit PAS le passage de `t` en paramètre (il
//    faudrait une vraie analyse de flux de données) : à la place, il
//    applique un repli sûr, `fileWideFallbackNs` — SI tous les
//    `useTranslation(...)` d'un fichier s'accordent sur le même namespace,
//    n'importe quel `t(...)` de ce fichier y est forcément lié, où qu'il
//    soit dans le texte. Dès que deux `useTranslation()` d'un même fichier
//    divergent (le cas de `resultKit.tsx` ci-dessus), ce repli est désactivé
//    plutôt que de deviner. Un appel qui échapperait aux deux (portée
//    linéaire ET repli fichier entier) tomberait dans le compteur "non
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
// Seuls `.ts`/`.tsx` sont balayés (comme check-i18n-hardcoded.mjs) —
// `src/i18n/locales/**/*.json` n'est jamais scanné pour des APPELS (il est
// lui-même la SOURCE contre laquelle on résout) et `routeTree.gen.ts`
// (généré) est exclu.
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

async function buildI18nInstance() {
  const resources = await loadResources()
  const instance = i18next.createInstance()
  await instance.init({
    resources,
    lng: LOCALES[0],
    defaultNS: DEFAULT_NS,
    ns: NAMESPACES,
    // Repris de src/i18n/index.ts : aucun repli silencieux entre langues —
    // une clé manquante en fr ne doit jamais être déclarée "trouvée" parce
    // qu'elle existe en en (ou l'inverse). Chaque langue est vérifiée pour
    // de vrai, indépendamment (voir checkKey ci-dessous).
    fallbackLng: false,
    parseMissingKeyHandler: (key) => key,
  })
  return instance
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

const USE_TRANSLATION_RE = /const\s*\{\s*t\s*(?:,\s*i18n\s*)?\}\s*=\s*useTranslation\(([^)]*)\)/g

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
 * `bindings` : liste ordonnée `{ pos, ns }` (une entrée par `useTranslation`
 * du fichier, dans l'ordre du texte). Renvoie le namespace en vigueur pour
 * un appel à la position `pos` — celui du dernier `useTranslation` rencontré
 * AVANT cette position (portée suivie linéairement, voir angle mort n°5),
 * ou `null` si aucun (ou si son argument était lui-même dynamique).
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

function collectTBindings(source) {
  const bindings = []
  USE_TRANSLATION_RE.lastIndex = 0
  let m
  while ((m = USE_TRANSLATION_RE.exec(source))) {
    bindings.push({ pos: m.index, ns: parseNsArg(m[1]) })
  }
  return bindings
}

/**
 * Repli pour les fonctions utilitaires déclarées AVANT le composant dans le
 * même fichier (donc avant tout `useTranslation()` au sens purement textuel
 * de `nsInScopeAt`) mais qui reçoivent `t` en PARAMÈTRE depuis ce composant
 * — un cas réel et fréquent sur ce dépôt (`medalAriaLabel(t, ...)` avant
 * `MedalRank`, dans `components/leaderboard/MedalRank.tsx`, par ex.). Sans
 * pouvoir suivre ce passage de paramètre (il faudrait une vraie analyse de
 * flux de données), ce script se rabat sur une règle sûre : SI tous les
 * `useTranslation(...)` du fichier s'accordent sur le MÊME namespace (ou le
 * même jeu de namespaces), alors n'importe quel `t(...)` du fichier, où
 * qu'il soit texuellement, est forcément lié à ce namespace — il n'y a
 * qu'un seul candidat possible. Dès que deux `useTranslation()` du fichier
 * divergent (ex. `components/battle/resultKit.tsx`, où deux fonctions
 * successives lient `t` à 'machine' puis à 'combat'), le repli est désactivé
 * (renvoie `null`) plutôt que de deviner — mieux vaut un appel non vérifié
 * qu'une clé déclarée manquante à tort contre le mauvais namespace.
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

const CALL_RE = /\bi18n\.t\(|\bt\(/g
const I18NKEY_RE = /i18nKey=/g

/**
 * Balaie un fichier (déjà nettoyé de ses commentaires) et renvoie :
 *   - `literals` : `{ pos, key, ns, kind }[]` — `ns` est `null` si `key`
 *     porte déjà un préfixe `ns:` (auquel cas i18next l'utilisera de toute
 *     façon en priorité, voir plus bas), sinon la liste de namespaces
 *     candidats à passer en option `ns` de `i18n.exists()`.
 *   - `dynamicCount` : nombre d'appels dont le premier argument n'est pas un
 *     littéral entièrement statique (angle mort n°1).
 *   - `unresolvedCount` : nombre d'appels dont la clé EST littérale mais dont
 *     le namespace par défaut n'a pas pu être déterminé (angles morts n°4/5)
 *     — ni un succès, ni un échec : simplement pas vérifiés.
 */
function scanFile(source) {
  const bindings = collectTBindings(source)
  const fallbackNs = fileWideFallbackNs(bindings)
  const literals = []
  let dynamicCount = 0
  let unresolvedCount = 0

  CALL_RE.lastIndex = 0
  let m
  while ((m = CALL_RE.exec(source))) {
    const isI18n = m[0].startsWith('i18n')
    const argStart = skipWhitespace(source, CALL_RE.lastIndex)
    const lit = readStringLiteral(source, argStart)
    if (lit === null || lit.dynamic) {
      dynamicCount += 1
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
      const scoped = nsInScopeAt(bindings, m.index) ?? fallbackNs
      if (scoped === null) {
        unresolvedCount += 1
        continue
      }
      ns = scoped
    }
    literals.push({ pos: m.index, key, ns, kind: isI18n ? 'i18n.t' : 't' })
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
        continue
      }
      const trimmedInner = braced.text.trim()
      const innerLit = readStringLiteral(trimmedInner, 0)
      if (innerLit === null || innerLit.end !== trimmedInner.length) {
        // Pas un littéral seul (ex. `i18nKey={cond ? 'a' : 'b'}`) — dynamique.
        dynamicCount += 1
        continue
      }
      lit = innerLit
    } else {
      lit = readStringLiteral(source, afterPos)
    }
    if (lit === null || lit.dynamic) {
      dynamicCount += 1
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
          resolved = nsInScopeAt(bindings, transStart)
        } else {
          const nsPropMatch = window.match(/\bns=(["'])([^"']+)\1/)
          if (nsPropMatch) {
            resolved = [nsPropMatch[2]]
          }
        }
      }
      if (resolved === null) {
        // Dernier recours : le `t` en portée à l'endroit du i18nKey lui-même,
        // puis le repli fichier entier (voir fileWideFallbackNs).
        resolved = nsInScopeAt(bindings, m.index) ?? fallbackNs
      }
      if (resolved === null) {
        unresolvedCount += 1
        continue
      }
      ns = resolved
    }
    literals.push({ pos: m.index, key, ns, kind: 'Trans i18nKey' })
  }

  literals.sort((a, b) => a.pos - b.pos)
  return { literals, dynamicCount, unresolvedCount }
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

async function main() {
  const args = process.argv.slice(2)
  const targets = (await resolveTargets(args)).filter(
    (f) => path.basename(f) !== 'routeTree.gen.ts',
  )

  const i18n = await buildI18nInstance()

  const problems = []
  let literalCount = 0
  let dynamicCount = 0
  let unresolvedCount = 0

  for (const file of targets.sort()) {
    const source = await fs.readFile(file, 'utf8')
    const stripped = stripComments(source)
    const lineOffsets = buildLineOffsets(stripped)
    const { literals, dynamicCount: fileDynamic, unresolvedCount: fileUnresolved } =
      scanFile(stripped)

    dynamicCount += fileDynamic
    unresolvedCount += fileUnresolved

    for (const entry of literals) {
      literalCount += 1
      const { line, column } = offsetToLineCol(lineOffsets, entry.pos)
      const rel = path.relative(FRONT_ROOT, file)
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

  if (problems.length > 0) {
    console.error(`[check-i18n-keys] ${problems.length} clé(s) introuvable(s) :\n`)
    for (const problem of problems) {
      console.error(`  - ${problem}`)
    }
    console.error(
      `\n[check-i18n-keys] ${literalCount} appel(s) littéral(aux) vérifié(s), ${dynamicCount} appel(s) dynamique(s) ignoré(s) (angle mort n°1), ${unresolvedCount} non résolu(s) faute de contexte (angles morts n°4/5), sur ${targets.length} fichier(s) scanné(s).`,
    )
    process.exitCode = 1
    return
  }

  console.log(
    `[check-i18n-keys] OK — ${literalCount} appel(s) littéral(aux) vérifié(s) (fr + en), ${dynamicCount} appel(s) dynamique(s) ignoré(s) (angle mort n°1), ${unresolvedCount} non résolu(s) faute de contexte (angles morts n°4/5), sur ${targets.length} fichier(s) scanné(s).`,
  )
}

main().catch((err) => {
  console.error('[check-i18n-keys] échec inattendu :', err)
  process.exit(1)
})
