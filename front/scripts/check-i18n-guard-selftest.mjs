#!/usr/bin/env node
// Auto-test des garde-fous i18n — lot 2, tâche 12.
//
// POURQUOI CE QUATRIÈME SCRIPT. Les trois autres garde-fous regardent le
// dépôt ; celui-ci regarde LES GARDE-FOUS. La tâche 12 a dû assouplir
// `check-i18n-hardcoded.mjs` pour faire taire 52 faux positifs (masques
// structurels : arguments de `t()`, `i18nKey`, attributs non affichés ;
// exceptions scopées : `SECTION_IDS` du guide, blocs `code` de discord.tsx).
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
// CE QUE CE SCRIPT NE PROUVE PAS. Il vérifie des LIGNES signalées, pas des
// occurrences : une ligne attendue qui passerait de quatre violations à une
// resterait verte. Il ne couvre que les cas que la tâche 12 a rencontrés —
// une fixture est une capture, pas une spécification. Et il ne dit rien du
// rappel du détecteur sur du français inconnu : cette limite-là est mesurée
// et documentée dans `check-i18n-hardcoded.mjs`, elle n'est pas testable ici.

import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, 'i18n-fixtures')

/**
 * Attentes, fixture par fixture.
 *
 * `hardcodedLines` : l'ensemble EXACT des numéros de ligne que
 * `check-i18n-hardcoded.mjs` doit signaler. Un ensemble vide signifie « ce
 * fichier doit sortir vert ». Les fixtures portent un « NE PAS REFORMATER »
 * en en-tête : ces numéros sont leur contrat.
 *
 * `keysLines` : idem pour `check-i18n-keys.mjs`, quand la fixture sert à
 * montrer le partage des rôles entre les deux scripts. `null` = non vérifié.
 */
const EXPECTATIONS = [
  {
    file: 'displayed-text.tsx',
    why: "Du texte réellement affiché — attributs lus par l'humain ou le lecteur d'écran (title, placeholder, aria-label, alt, label), texte JSX brut, apostrophe française, et un `//` dans le TEXTE d'un template (qui n'est pas un commentaire).",
    hardcodedLines: [15, 16, 17, 18, 19, 21, 22, 23],
    keysLines: null,
  },
  {
    file: 'not-displayed.tsx',
    why: "Les cinq positions masquées par la tâche 12 : `id`, `className`, `data-*`, `htmlFor`, l'argument littéral de `t()`, l'attribut `i18nKey`, et un commentaire à l'intérieur d'une interpolation `${…}`.",
    hardcodedLines: [],
    keysLines: null,
  },
  {
    file: 'scoped-exceptions.tsx',
    why: "Les deux exceptions `files` (SECTION_IDS du guide, prop `code` de discord.tsx) reproduites HORS de leur fichier : elles doivent redevenir des violations, sinon le `files` ne sert à rien.",
    hardcodedLines: [11, 17, 18],
    keysLines: null,
  },
  {
    file: 'french-as-key.tsx',
    why: "L'angle mort assumé du masque `t('…')` : invisible pour le garde-fou du français, signalé par celui des clés.",
    hardcodedLines: [],
    keysLines: [15],
  },
]

/** Lance un garde-fou sur un chemin et rend les numéros de ligne signalés. */
async function flaggedLines(script, target) {
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
    throw new Error(`${script} n'a produit aucun résumé — plantage ?\n${output}`)
  }
  const lines = new Set()
  const re = /(?:^|\s)(?:\S*i18n-fixtures[/\\])?[^\s:]+\.tsx:(\d+):\d+:/gm
  let m = re.exec(output)
  while (m !== null) {
    lines.add(Number(m[1]))
    m = re.exec(output)
  }
  return [...lines].sort((a, b) => a - b)
}

function same(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

async function main() {
  const failures = []

  for (const expectation of EXPECTATIONS) {
    const target = path.join(FIXTURES, expectation.file)

    const hardcoded = await flaggedLines('check-i18n-hardcoded.mjs', target)
    const expectedHardcoded = [...expectation.hardcodedLines].sort((a, b) => a - b)
    if (!same(hardcoded, expectedHardcoded)) {
      failures.push(
        `${expectation.file} — check-i18n-hardcoded : attendu lignes [${expectedHardcoded.join(', ')}], obtenu [${hardcoded.join(', ')}]\n      ${expectation.why}`,
      )
    }

    if (expectation.keysLines !== null) {
      const keys = await flaggedLines('check-i18n-keys.mjs', target)
      const expectedKeys = [...expectation.keysLines].sort((a, b) => a - b)
      if (!same(keys, expectedKeys)) {
        failures.push(
          `${expectation.file} — check-i18n-keys : attendu lignes [${expectedKeys.join(', ')}], obtenu [${keys.join(', ')}]\n      ${expectation.why}`,
        )
      }
    }
  }

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
    `[check-i18n-guard-selftest] OK — ${EXPECTATIONS.length} fixture(s) conformes.`,
  )
}

main().catch((err) => {
  console.error('[check-i18n-guard-selftest] échec inattendu :', err)
  process.exit(1)
})
