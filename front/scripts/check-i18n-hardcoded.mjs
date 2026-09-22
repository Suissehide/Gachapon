#!/usr/bin/env node
// Garde-fou anti-régression du français en dur — lot 2, tâche 2.
//
// Échoue si une chaîne française apparaît dans `front/src/` hors de
// `src/i18n/locales/` (où le français en dur est le contenu attendu).
//
// Deux détecteurs, appliqués ligne par ligne, hors commentaires :
//   1. un caractère accentué français (à, é, ç, œ, …) ;
//   2. un mot français fréquent SANS accent (« vous », « les », « pour »…),
//      recherché comme mot entier (\b...\b), jamais en sous-chaîne — sinon
//      « les » matcherait dans « files » ou "roles".
//
// Ce script échouera massivement tant que l'extraction (tâches suivantes du
// lot) n'a pas eu lieu : c'est attendu, pas un bug de ce script. Il n'est
// PAS branché sur `lint` ni sur le build (décision actée dans
// global-constraints.md / task-2-brief.md) — chaque tâche d'extraction le
// lance à la main sur son périmètre, la tâche 12 le branchera sur la CI une
// fois l'extraction terminée.
//
// Usage :
//   node scripts/check-i18n-hardcoded.mjs                 # tout src/
//   node scripts/check-i18n-hardcoded.mjs src/components/shop
//   node scripts/check-i18n-hardcoded.mjs "src/routes/**"  # motif glob simple
//
// L'argument, s'il est fourni, est résolu depuis la racine de `front/` (pas
// depuis le cwd) : le script peut donc être lancé depuis n'importe où.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT_ROOT = path.resolve(__dirname, '..')
const SRC_ROOT = path.join(FRONT_ROOT, 'src')
const LOCALES_DIR = path.join(SRC_ROOT, 'i18n', 'locales')
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])

// ---------------------------------------------------------------------------
// Détection du français
// ---------------------------------------------------------------------------

const ACCENT_RE = /[àâäéèêëïîôöùûüÿçœæÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇŒÆ]/g

/**
 * Mots français fréquents SANS accent, susceptibles de passer inaperçus
 * autrement (« Connexion », « Boutique », « Retour », « Niveau » n'ont pas
 * besoin d'accent pour être du français). Chaque entrée : un mot réellement
 * fréquent dans de la copie d'interface, pas une particule isolée à fort
 * risque de collision (« un », « on », « ce » sont volontairement exclus :
 * trop courts, trop souvent des morceaux d'identifiants techniques y
 * compris à l'intérieur d'un run \w continu... en pratique \b les protège
 * déjà, mais le bruit qu'ils généreraient ne vaudrait pas le signal).
 * Recherchés comme mots entiers uniquement — voir buildWordRegex.
 */
const FRENCH_WORDS = [
  'vous', // pronom, très fréquent dans la copie UI ("vous avez obtenu…")
  'votre', // idem, déterminant possessif
  'vos',
  'notre',
  'nos',
  'leur',
  'leurs',
  'des', // article contracté, omniprésent
  'les',
  'une',
  'dans',
  'pour',
  'avec',
  'sans', // exception connue : "sans-serif" (CSS) — voir EXCEPTIONS
  'sur',
  'entre',
  'cette',
  'ces',
  'mais',
  'tout',
  'tous',
  'toute',
  'toutes',
  'quand',
  'quoi',
  'chaque',
  'toujours',
  'jamais',
  'plusieurs',
  'aucun',
  'aucune',
  'est', // verbe être, 3e pers. — risque connu : "EST" (fuseau horaire),
  // pas rencontré dans ce dépôt à ce jour ; à surveiller si un jour du
  // code touche des fuseaux horaires US.
]

function buildWordRegex() {
  const alternatives = FRENCH_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`\\b(?:${alternatives.join('|')})\\b`, 'gi')
}

const WORD_RE = buildWordRegex()

/**
 * Exceptions explicites : chaînes connues qui déclencheraient un des
 * détecteurs ci-dessus sans être du français à traduire. Masquées (remplacées
 * par des espaces de même longueur) avant la détection, entrée par entrée —
 * pas un motif générique qui viderait le garde-fou de son sens.
 *
 * Chaque entrée doit être justifiée par un cas réel constaté dans ce dépôt,
 * pas par prudence générique.
 */
const EXCEPTIONS = [
  {
    pattern: /sans-serif/gi,
    reason:
      'Pile de police CSS générique (RevealGrid.tsx, dev-reveal.tsx, _globals.css) : ' +
      '"sans" y est un token isolé par un tiret, donc \\bsans\\b s\'y déclenche ' +
      "sans qu'il s'agisse de français.",
  },
]

/**
 * Mots-clés après lesquels un `/` commence quasi certainement un littéral
 * regex plutôt qu'une division (`return /foo/`, `case /foo/:`…). Liste non
 * exhaustive — voir `canStartRegex`.
 */
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

/**
 * Heuristique « un `/` peut-il ouvrir un littéral regex ici ? », basée sur le
 * dernier caractère significatif déjà émis dans `out`. Pas un vrai lexer JS
 * (qui suivrait le type du token précédent, pas juste son dernier caractère,
 * et qui saurait qu'un mot-clé après un `.` est un nom de propriété) mais
 * suffisant pour les deux familles de cas qui comptent :
 *   - après un opérateur/une ponctuation ouvrante (`(`, `{`, `,`, `=`, `!`,
 *     `&&`, début de fichier…) → un `/` est presque toujours un regex ;
 *   - après un identifiant, un nombre, `)` ou `]` → c'est presque toujours
 *     une division, SAUF si l'identifiant est un mot-clé de
 *     `REGEX_PRECEDING_KEYWORDS` (`return /foo/`, `case /foo/:`).
 *
 * Deux limites connues, de directions opposées — la seconde a été trouvée en
 * revue (Round 2) et corrige une garantie précédemment fausse dans ce
 * commentaire ; ne pas la réintroduire sans la revérifier comme un test :
 *
 * 1. Faux négatif, sans conséquence connue : `if (x) /foo/.test(y)` (regex
 *    juste après `)`, syntaxiquement valide mais jamais écrit ainsi en
 *    pratique) est traité comme une division. `canStartRegex` renvoie
 *    `false`, `tryConsumeRegex` n'est pas appelé, le `/` est simplement
 *    recopié comme caractère normal — aucun texte n'est perdu ni mal
 *    interprété plus loin sur la ligne.
 *
 * 2. Faux positif, avec conséquence réelle : un mot de
 *    `REGEX_PRECEDING_KEYWORDS` (`in`, `of`…) utilisé comme **nom de
 *    propriété après un point** (`data.in`, `obj.of`) n'est pas distingué du
 *    même mot employé comme opérateur JS — `canStartRegex` ne regarde que le
 *    mot, jamais le caractère avant lui. Si une vraie division suit sur
 *    cette ligne ET qu'un commentaire `//` la suit à son tour, `tryConsumeRegex`
 *    peut refermer le « regex » sur le premier `/` de ce commentaire (il ne
 *    sait pas non plus ce qu'est un commentaire) : l'état retombe en `code`
 *    au lieu de `lineComment` pour le reste de la ligne, qui est alors
 *    scannée comme du texte normal — un vrai commentaire peut se faire
 *    signaler à tort. Fixture qui reproduit, vérifiée :
 *    `const rate = data.in / total // commentaire francais avec votre mot cache`
 *    → `exit=1`, `avec` et `votre` signalés dans le commentaire.
 *    Direction du risque : toujours un faux positif (un vrai commentaire
 *    scanné comme du code), jamais un faux négatif — `tryConsumeRegex` ne
 *    blanchit ni ne supprime jamais de texte, il ne fait que recopier
 *    verbatim ou abandonner (voir sa propre doc) ; ce chemin ne peut donc
 *    pas faire disparaître du français réellement en dur, seulement faire
 *    crier le script sur du texte qui n'en était pas. Garantie qui tient
 *    réellement, à la place de l'ancienne affirmation erronée « jamais de
 *    sur-consommer du code » : `tryConsumeRegex` ne franchit jamais un saut
 *    de ligne (il rend `null` dès qu'il en rencontre un), donc aucune
 *    mauvaise classification ne peut se propager au-delà de la ligne où elle
 *    démarre — mais À L'INTÉRIEUR d'une même ligne, comme ce cas le montre,
 *    elle peut bel et bien désynchroniser la détection de commentaire.
 */
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

/**
 * Tente de consommer un littéral regex démarrant en `source[start]` (`/`).
 * Respecte les classes de caractères (`[...]`, où un `/` nu ne ferme pas le
 * littéral) et les échappements (`\/`). Un littéral regex JS ne peut pas
 * contenir de retour à la ligne non échappé : rencontrer `\n` avant la
 * fermeture signifie que ce n'était pas un regex (probablement une division
 * mal classée par `canStartRegex`) → renvoie `null`, et l'appelant retombe
 * sur le traitement caractère par caractère normal.
 *
 * Renvoie l'index (exclusif) juste après les flags (`i`, `g`, `u`…), ou
 * `null` si aucune fermeture valide n'a été trouvée sur la ligne.
 */
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

/**
 * Retire le contenu des commentaires (`//…`, `/* … *\/`, JSDoc inclus) d'une
 * source TS/TSX tout en conservant le nombre de lignes ET le contenu des
 * chaînes/template literals (c'est justement là que vit le texte à détecter).
 *
 * Tokenizer volontairement simple, pas un parseur TS complet. Deux angles
 * morts documentés plutôt que silencieusement ignorés :
 *   - **texte JSX brut hors chaîne** (ex. `<a>https://exemple.fr</a>`) : un
 *     `//` y est en état `code`, pas dans une chaîne — sans précaution il
 *     serait pris pour un début de commentaire et tout le français qui suit
 *     sur la même ligne serait blanchi sans le signaler. Round 1 de revue :
 *     un `//` immédiatement précédé de `:` (`https://`, `http://`, tout
 *     schéma `xxx://`) est désormais traité comme faisant partie d'une URL,
 *     jamais comme un commentaire — c'est le cas dominant, celui qui arrive
 *     réellement dans du texte produit. Angle mort résiduel, accepté : une
 *     URL protocol-relative SANS le `:` (`//cdn.exemple.fr`, rare hors d'une
 *     chaîne) ne serait pas reconnue. Risque inverse accepté aussi : un
 *     `//commentaire` collé sans espace directement après un `:` de code
 *     (`default://commentaire`, un `case` sans espace) serait à tort traité
 *     comme une URL et donc PAS retiré — un faux positif (le commentaire
 *     serait signalé comme français en dur) plutôt qu'un faux négatif ; ce
 *     dépôt est formaté par Biome, qui insère systématiquement un espace
 *     avant `//`, donc ce cas ne devrait pas se produire dans du code réel.
 *   - **template literals** : le contenu entre backticks est traité comme
 *     opaque, donc un commentaire à l'intérieur d'une expression `${...}`
 *     imbriquée n'est pas retiré. Pas de cas trouvé dans ce dépôt à ce jour.
 * Le troisième angle mort initial (`//` à l'intérieur d'un littéral regex,
 * `/^\/\//`) est traité via `canStartRegex`/`tryConsumeRegex` ci-dessus —
 * heuristique basée sur le dernier token, pas un vrai lexer JS, dont les
 * limites sont documentées sur `canStartRegex`.
 */
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
        // `xxx://` — schéma d'URL, jamais un commentaire. Voir la doc de
        // stripComments pour l'angle mort résiduel (protocol-relative sans
        // `:`) et le compromis inverse assumé.
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

    // singleQuote / doubleQuote / template : on recopie tel quel (c'est le
    // texte qu'on veut pouvoir détecter), en sautant correctement les
    // échappements pour ne pas fermer la chaîne trop tôt sur un `\'` etc.
    const closing = state === 'singleQuote' ? "'" : state === 'doubleQuote' ? '"' : '`'
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

function applyExceptions(line) {
  let masked = line
  for (const { pattern } of EXCEPTIONS) {
    // Un `RegExp` global partagé accumule un `lastIndex` — on le régénère à
    // chaque appel pour rester sans état entre les lignes.
    const re = new RegExp(pattern.source, pattern.flags)
    masked = masked.replace(re, (m) => ' '.repeat(m.length))
  }
  return masked
}

/**
 * Contexte lisible autour d'un index de correspondance, tronqué pour rester
 * lisible en sortie de terminal.
 */
function snippet(originalLine, index, matchLength) {
  const start = Math.max(0, index - 20)
  const end = Math.min(originalLine.length, index + matchLength + 20)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < originalLine.length ? '…' : ''
  return `${prefix}${originalLine.slice(start, end).trim()}${suffix}`
}

function scanLine(originalLine, maskedLine) {
  const violations = []

  ACCENT_RE.lastIndex = 0
  let m = ACCENT_RE.exec(maskedLine)
  while (m !== null) {
    violations.push({
      kind: 'accent',
      match: m[0],
      column: m.index + 1,
      context: snippet(originalLine, m.index, m[0].length),
    })
    m = ACCENT_RE.exec(maskedLine)
  }

  WORD_RE.lastIndex = 0
  m = WORD_RE.exec(maskedLine)
  while (m !== null) {
    violations.push({
      kind: 'mot',
      match: m[0],
      column: m.index + 1,
      context: snippet(originalLine, m.index, m[0].length),
    })
    m = WORD_RE.exec(maskedLine)
  }

  return violations
}

// ---------------------------------------------------------------------------
// Parcours du système de fichiers
// ---------------------------------------------------------------------------

/** `true` si `filePath` (absolu) est sous `dirPath` (absolu). */
function isUnder(filePath, dirPath) {
  const rel = path.relative(dirPath, filePath)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Convertit un motif glob simple (`*`, `**`, `?`) en RegExp ancrée. */
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  // Un seul passage, `**` avant `*` dans l'alternative pour matcher la plus
  // longue en premier : pas de caractère de remplacement temporaire à poser
  // puis réinjecter ensuite (une première version en utilisait un, qui a
  // fini écrite telle quelle comme octet de contrôle dans ce fichier —
  // remplacée par cette forme sans jeton intermédiaire du tout).
  const pattern = escaped.replace(/\*\*|\*|\?/g, (token) => {
    if (token === '**') {
      return '.*'
    }
    if (token === '*') {
      return '[^/]*'
    }
    return '.'
  })
  return new RegExp(`^${pattern}$`)
}

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

/**
 * Résout l'argument de périmètre (chemin ou motif glob simple) en liste de
 * fichiers `.ts`/`.tsx` à scanner, toujours sous `src/` et toujours hors
 * `src/i18n/locales/` (où le français en dur est le contenu attendu, pas une
 * régression) et hors `routeTree.gen.ts` (généré, jamais touché à la main).
 */
async function resolveTargets(arg) {
  const isGlob = typeof arg === 'string' && /[*?]/.test(arg)

  if (!arg) {
    const all = []
    await walk(SRC_ROOT, all)
    return all
  }

  if (isGlob) {
    const absoluteGlob = path.isAbsolute(arg) ? arg : path.join(FRONT_ROOT, arg)
    const regex = globToRegExp(absoluteGlob)
    const all = []
    await walk(SRC_ROOT, all)
    return all.filter((f) => regex.test(f))
  }

  const target = path.isAbsolute(arg) ? arg : path.join(FRONT_ROOT, arg)
  const st = await fs.stat(target).catch(() => null)
  if (!st) {
    console.error(`[check-i18n-hardcoded] chemin introuvable : ${target}`)
    process.exit(1)
  }
  if (st.isFile()) {
    return SCAN_EXTENSIONS.has(path.extname(target)) ? [target] : []
  }
  const all = []
  await walk(target, all)
  return all
}

async function main() {
  const arg = process.argv[2]
  const targets = (await resolveTargets(arg)).filter(
    (f) => !isUnder(f, LOCALES_DIR) && path.basename(f) !== 'routeTree.gen.ts',
  )

  let violationCount = 0
  let filesWithViolations = 0

  for (const file of targets.sort()) {
    const source = await fs.readFile(file, 'utf8')
    const stripped = stripComments(source)
    const originalLines = source.split('\n')
    const strippedLines = stripped.split('\n')

    let fileHasViolation = false

    for (let i = 0; i < strippedLines.length; i++) {
      const maskedLine = applyExceptions(strippedLines[i])
      const violations = scanLine(originalLines[i] ?? '', maskedLine)
      for (const v of violations) {
        if (!fileHasViolation) {
          fileHasViolation = true
        }
        violationCount++
        const rel = path.relative(FRONT_ROOT, file)
        console.error(
          `${rel}:${i + 1}:${v.column}: ${v.kind === 'accent' ? 'caractère accentué' : `mot français "${v.match}"`} — ${v.context}`,
        )
      }
    }

    if (fileHasViolation) {
      filesWithViolations++
    }
  }

  if (violationCount > 0) {
    console.error(
      `\n[check-i18n-hardcoded] ${violationCount} occurrence(s) de français en dur dans ${filesWithViolations} fichier(s) (périmètre : ${targets.length} fichier(s) scanné(s)).`,
    )
    process.exitCode = 1
    return
  }

  console.log(
    `[check-i18n-hardcoded] OK — aucune chaîne française en dur (${targets.length} fichier(s) scanné(s)).`,
  )
}

main().catch((err) => {
  console.error('[check-i18n-hardcoded] échec inattendu :', err)
  process.exit(1)
})
