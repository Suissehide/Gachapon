#!/usr/bin/env node
// Auto-test des garde-fous i18n — lot 2, tâche 12.
//
// POURQUOI CE QUATRIÈME SCRIPT. Les trois autres garde-fous regardent le
// dépôt ; celui-ci regarde LES GARDE-FOUS. La tâche 12 a dû assouplir
// `check-i18n-hardcoded.mjs` pour faire taire 52 faux positifs (masques
// structurels : arguments de `t()`, `i18nKey`, `id`/`htmlFor` ; exceptions
// scopées : `SECTION_IDS` du guide, blocs `code` de discord.tsx). Il fige
// aussi, symétriquement, ce qui a été REFUSÉ comme assouplissement —
// `className` et `data-*`, voir `unmasked-attributes.tsx` — et le VOCABULAIRE
// du détecteur lui-même, voir `detector-vocabulary.tsx`.
//
// Un assouplissement non gardé dérive : le chantier a déjà vu quatre fois un
// filet perdre sa morsure sans que rien ne crie. Ce script fige, par
// exécution, ce que le garde-fou DOIT continuer à voir et ce qu'il DOIT
// taire.
//
// Les fixtures vivent dans `scripts/i18n-fixtures/`, délibérément HORS de
// `src/` : `tsconfig.app.json` n'inclut que `src`, `biome.json` n'inclut que
// `src/**`, et rien ne les importe — elles ne sont donc ni compilées, ni
// lintées, ni embarquées dans le bundle. Elles ne sont pas non plus vues par
// un `check:i18n` ordinaire, qui ne balaie que `src/`.
//
// Usage :
//   node scripts/check-i18n-guard-selftest.mjs
//
// ---------------------------------------------------------------------------
// CE QUE CE SCRIPT COMPTE — et pourquoi ce n'est plus des lignes.
//
// La première version comparait des ENSEMBLES DE LIGNES signalées. La revue
// du round 2 a montré que ce grain laissait passer l'affaiblissement le plus
// probable de tous : **retirer un mot de `FRENCH_WORDS`**, le geste exact que
// fera le prochain qui rencontre un faux positif. Chaque ligne des fixtures
// portant plusieurs mots français, en retirer un ne faisait pas changer la
// ligne de camp — l'auto-test restait vert, et le scan du dépôt aussi.
//
// Deux corrections, complémentaires :
//   1. les attentes sont désormais en **nombre d'occurrences PAR LIGNE**
//      (`{ 15: 4, 16: 1, … }`), pas en présence/absence ;
//   2. `detector-vocabulary.tsx` donne à CHAQUE entrée des deux détecteurs sa
//      propre ligne, qui ne porte rien d'autre — une ligne, une occurrence.
//      Ce fichier est comparé INVENTAIRE CONTRE INVENTAIRE avec le script :
//      un mot retiré, un mot ajouté sans sa ligne, un caractère accentué
//      supprimé de la classe, tout écart est signalé.
//
// CE QUE CE SCRIPT NE PROUVE TOUJOURS PAS. Il ne couvre que les cas que la
// tâche 12 a rencontrés — une fixture est une capture, pas une spécification.
// Et il ne dit rien du rappel du détecteur sur du français inconnu : cette
// limite-là est mesurée et documentée dans `check-i18n-hardcoded.mjs`, elle
// n'est pas testable ici. Enfin, il suppose qu'on ne modifie pas une fixture
// pour faire taire un écart : c'est une règle de conduite, pas une garantie
// mécanique — elle est écrite en tête de chaque fixture.

import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, 'i18n-fixtures')
const HARDCODED = 'check-i18n-hardcoded.mjs'
const KEYS = 'check-i18n-keys.mjs'

/**
 * Attentes, fixture par fixture.
 *
 * `hardcoded` : pour chaque ligne signalée par `check-i18n-hardcoded.mjs`, le
 * nombre EXACT d'occurrences attendues. Un objet vide signifie « ce fichier
 * doit sortir vert ». Les fixtures portent un « NE PAS REFORMATER » en
 * en-tête : ces numéros et ces comptes sont leur contrat.
 *
 * `keys` : idem pour `check-i18n-keys.mjs`, quand la fixture sert à montrer
 * le partage des rôles entre les deux scripts (`french-as-key.tsx`) ou à
 * figer un contrôle qui n'appartient qu'à lui (`interpolation-options.tsx`).
 * `null` = non vérifié.
 */
const EXPECTATIONS = [
  {
    file: 'displayed-text.tsx',
    why: "Du texte réellement affiché — attributs lus par l'humain ou le lecteur d'écran (title, placeholder, aria-label, alt, label), texte JSX brut, apostrophe française, et un `//` dans le TEXTE d'un template (qui n'est pas un commentaire).",
    hardcoded: { 15: 4, 16: 1, 17: 3, 18: 3, 19: 2, 21: 2, 22: 1, 23: 4 },
    keys: null,
  },
  {
    file: 'not-displayed.tsx',
    why: "Les quatre positions masquées : `id`, `htmlFor`, l'argument littéral de `t()`, l'attribut `i18nKey`, plus un commentaire à l'intérieur d'une interpolation `${…}`.",
    hardcoded: {},
    keys: null,
  },
  {
    file: 'scoped-exceptions.tsx',
    why: 'Les deux exceptions `files` (SECTION_IDS du guide, prop `code` de discord.tsx) reproduites HORS de leur fichier : elles doivent redevenir des violations, sinon le `files` ne sert à rien.',
    hardcoded: { 11: 2, 17: 6, 18: 4 },
    keys: null,
  },
  {
    file: 'french-as-key.tsx',
    why: "L'angle mort assumé du masque `t('…')` : invisible pour le garde-fou du français, signalé par celui des clés.",
    hardcoded: {},
    keys: { 15: 2 },
  },
  {
    file: 'interpolation-options.tsx',
    why: "Les {{var}} de la valeur traduite contre les clés de l'objet d'options du site d'appel — le trou de la revue finale : quatre nœuds de /skills affichaient « +{{value}} jetons » en clair parce que l'appel passait `{ count }` sans `value`. Les quatre lignes signalées sont les quatre formes du défaut (t, i18n.t, aucune option, <Trans>) ; les lignes muettes tiennent le revers, dont l'option en trop (`leftover`), qui ne DOIT pas sortir.",
    hardcoded: {},
    keys: { 34: 1, 35: 1, 36: 1, 37: 1 },
  },
  {
    file: 'unmasked-attributes.tsx',
    why: "`className` et `data-*` ne sont PAS masqués : la revue les a retirés parce qu'aucun faux positif observé ne les méritait. La ligne `data-id=` tient en plus l'ancrage du masque `id`, qui accrochait après un tiret.",
    hardcoded: { 27: 4, 28: 3, 29: 2, 30: 4 },
    keys: null,
  },
]

/** Lance un garde-fou sur un chemin et rend `Map<ligne, nombre d'occurrences>`. */
async function occurrencesByLine(script, target) {
  const scriptPath = path.join(__dirname, script)
  let stdout = ''
  let stderr = ''
  try {
    const r = await execFileAsync(process.execPath, [scriptPath, target])
    stdout = r.stdout
    stderr = r.stderr
  } catch (err) {
    // Sortie non nulle = violations trouvées : c'est un résultat, pas un
    // échec. Un vrai plantage (stack, code introuvable) se reconnaît à
    // l'absence de la ligne de résumé du garde-fou, vérifiée plus bas.
    stdout = err.stdout ?? ''
    stderr = err.stderr ?? ''
  }
  const output = `${stdout}\n${stderr}`
  if (!output.includes('[check-i18n-')) {
    throw new Error(
      `${script} n'a produit aucun résumé — plantage ?\n${output}`,
    )
  }
  const counts = new Map()
  const re = /(?:^|\s)(?:\S*i18n-fixtures[/\\])?[^\s:]+\.tsx:(\d+):\d+:/gm
  let m = re.exec(output)
  while (m !== null) {
    const line = Number(m[1])
    counts.set(line, (counts.get(line) ?? 0) + 1)
    m = re.exec(output)
  }
  return counts
}

/**
 * Compare une `Map<ligne, compte>` obtenue à l'objet attendu, et rend la
 * liste lisible des écarts (ligne manquante, ligne en trop, compte différent).
 */
function diffCounts(actual, expected) {
  const gaps = []
  const lines = new Set([
    ...actual.keys(),
    ...Object.keys(expected).map(Number),
  ])
  for (const line of [...lines].sort((a, b) => a - b)) {
    const got = actual.get(line) ?? 0
    const want = expected[line] ?? 0
    if (got !== want) {
      gaps.push(`ligne ${line} : attendu ${want} occurrence(s), obtenu ${got}`)
    }
  }
  return gaps
}

/**
 * Inventaire des deux détecteurs, lu dans la SOURCE de
 * `check-i18n-hardcoded.mjs`. Lecture de texte assumée : c'est le seul moyen
 * de comparer inventaire contre inventaire sans dupliquer la liste ici — une
 * copie divergerait au premier ajout, exactement ce que `deliberate-identical`
 * évite côté back.
 */
async function detectorInventory() {
  const source = await fs.readFile(path.join(__dirname, HARDCODED), 'utf8')
  const accentMatch = source.match(/const ACCENT_RE = \/\[([^\]]+)\]\/g/)
  if (accentMatch === null) {
    throw new Error('ACCENT_RE introuvable dans check-i18n-hardcoded.mjs')
  }
  const wordsBlock = source.match(/const FRENCH_WORDS = \[\n([\s\S]*?)\n\]\n/)
  if (wordsBlock === null) {
    throw new Error('FRENCH_WORDS introuvable dans check-i18n-hardcoded.mjs')
  }
  const words = [...wordsBlock[1].matchAll(/^\s*'([^']+)',/gm)].map((m) => m[1])
  return { accents: [...accentMatch[1]], words }
}

/** Les jetons `<p>x</p>` de la fixture de vocabulaire, avec leur ligne. */
async function vocabularyTokens() {
  const file = path.join(FIXTURES, 'detector-vocabulary.tsx')
  const lines = (await fs.readFile(file, 'utf8')).split('\n')
  const tokens = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*<p>(.+)<\/p>\s*$/)
    if (m !== null) {
      tokens.push({ line: i + 1, token: m[1] })
    }
  }
  return tokens
}

function setDiff(a, b) {
  return [...a].filter((v) => !b.includes(v))
}

/**
 * Le contrôle du vocabulaire : inventaire identique au script, et une
 * occurrence exactement par ligne.
 */
async function checkVocabulary(failures) {
  const { accents, words } = await detectorInventory()
  const tokens = await vocabularyTokens()
  const covered = tokens.map((t) => t.token)
  const expectedTokens = [...words, ...accents]

  const missing = setDiff(expectedTokens, covered)
  const extra = setDiff(covered, expectedTokens)
  if (missing.length > 0) {
    failures.push(
      `detector-vocabulary.tsx — ${missing.length} entrée(s) du détecteur sans ligne de fixture : ${missing.join(', ')}\n      Ajouter une ligne \`<p>…</p>\` par entrée ajoutée au détecteur.`,
    )
  }
  if (extra.length > 0) {
    failures.push(
      `detector-vocabulary.tsx — ${extra.length} ligne(s) de fixture sans entrée dans le détecteur : ${extra.join(', ')}\n      Une entrée a été RETIRÉE de FRENCH_WORDS ou d'ACCENT_RE. C'est l'affaiblissement que cette fixture existe pour attraper : le justifier, ou le défaire.`,
    )
  }

  const counts = await occurrencesByLine(
    HARDCODED,
    path.join(FIXTURES, 'detector-vocabulary.tsx'),
  )
  const expected = {}
  for (const { line } of tokens) {
    expected[line] = 1
  }
  const gaps = diffCounts(counts, expected)
  if (gaps.length > 0) {
    const named = gaps.map((g) => {
      const n = Number(g.match(/ligne (\d+)/)?.[1])
      const t = tokens.find((x) => x.line === n)
      return t === undefined ? g : `${g} — jeton « ${t.token} »`
    })
    failures.push(
      `detector-vocabulary.tsx — ${gaps.length} écart(s) de comptage :\n      ${named.join('\n      ')}\n      Une ligne à 0 signifie que le détecteur ne reconnaît plus ce jeton.`,
    )
  }

  return { words: words.length, accents: accents.length }
}

async function main() {
  const failures = []

  for (const expectation of EXPECTATIONS) {
    const target = path.join(FIXTURES, expectation.file)

    const hardcoded = await occurrencesByLine(HARDCODED, target)
    const hardcodedGaps = diffCounts(hardcoded, expectation.hardcoded)
    if (hardcodedGaps.length > 0) {
      failures.push(
        `${expectation.file} — ${HARDCODED} :\n      ${hardcodedGaps.join('\n      ')}\n      ${expectation.why}`,
      )
    }

    if (expectation.keys !== null) {
      const keys = await occurrencesByLine(KEYS, target)
      const keysGaps = diffCounts(keys, expectation.keys)
      if (keysGaps.length > 0) {
        failures.push(
          `${expectation.file} — ${KEYS} :\n      ${keysGaps.join('\n      ')}\n      ${expectation.why}`,
        )
      }
    }
  }

  const vocabulary = await checkVocabulary(failures)

  if (failures.length > 0) {
    console.error(`[check-i18n-guard-selftest] ${failures.length} écart(s) :\n`)
    for (const f of failures) {
      console.error(`  - ${f}\n`)
    }
    console.error(
      'Un garde-fou qui ne voit plus une fixture de `displayed-text.tsx` a perdu sa morsure.\n' +
        'Un garde-fou qui signale une fixture de `not-displayed.tsx` a repris un faux positif.\n' +
        "Dans les deux cas, corriger le script — pas la fixture — sauf à documenter pourquoi l'attente a changé.",
    )
    process.exitCode = 1
    return
  }

  console.log(
    `[check-i18n-guard-selftest] OK — ${EXPECTATIONS.length + 1} fixture(s) conformes ; ` +
      `vocabulaire du détecteur couvert entrée par entrée (${vocabulary.words} mot(s), ${vocabulary.accents} caractère(s) accentué(s)).`,
  )
}

main().catch((err) => {
  console.error('[check-i18n-guard-selftest] échec inattendu :', err)
  process.exit(1)
})
