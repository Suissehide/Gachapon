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
 * Retire le contenu des commentaires (`//…`, `/* … *\/`, JSDoc inclus) d'une
 * source TS/TSX tout en conservant le nombre de lignes ET le contenu des
 * chaînes/template literals (c'est justement là que vit le texte à détecter).
 *
 * Tokenizer volontairement simple, pas un parseur TS complet : il ne gère pas
 * les expressions `${...}` imbriquées dans un template literal (le contenu
 * entre backticks est traité comme opaque), ni un `//` à l'intérieur d'un
 * littéral regex (`/\/\//`). Ces deux cas sont rares dans ce dépôt et
 * documentés comme limite connue plutôt que silencieusement ignorés — voir
 * le rapport de tâche.
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
