#!/usr/bin/env node
// Garde-fou de parité FR/EN — lot 2, tâche 2. Étendu tâche 7b (marqueurs JSX).
//
// Compare, espace de noms par espace de noms, les arbres de clés sous
// `src/i18n/locales/fr/` et `src/i18n/locales/en/`. Échoue si :
//   - une clé existe d'un côté et pas de l'autre (dans les deux sens) ;
//   - une valeur est vide (des deux côtés, vérifiés séparément) ;
//   - les placeholders `{{...}}` d'une clé diffèrent entre les deux langues ;
//   - les marqueurs JSX (`<strong>`, `<freePull>`, `<rareBadge></rareBadge>`…)
//     d'une clé diffèrent entre les deux langues.
//
// Le premier de ces deux derniers points est celui qui compte le plus : une
// traduction qui perd un `{{count}}` produit un message amputé à
// l'exécution, et rien ne le signale autrement.
//
// Le second (marqueurs JSX) a été ajouté à la tâche 7b, qui introduit
// `<Trans>` avec des `components` nommés dans ce dépôt (`guide.tsx`) : une
// clé traduite avec `<Trans i18nKey="…" components={{ strong: <strong /> }}>`
// dont la chaîne EN renomme, retire ou ajoute une balise par rapport au FR
// casse le rendu à l'exécution — une balise sans `components` correspondant
// s'affiche en texte brut échappé (`&lt;em&gt;…&lt;/em&gt;`), silencieusement,
// sans avertissement ni erreur (vérifié en exécutant `<Trans>` hors
// navigateur, react-i18next 17.0.15 de ce dépôt). Comme pour les
// placeholders, seul le JEU de noms de balises est comparé (pas l'ordre —
// c'est justement ce que `<Trans>` autorise à changer entre langues — ni le
// nombre d'occurrences).
//
// Piège à ne pas reproduire (constaté sur l'équivalent back,
// back/src/test/unit/error-messages-parity.test.ts, dans une version
// antérieure) : construire un objet fusionné `{ ...FR, ...EN }` pour itérer
// dessus. Les deux jeux de clés étant censés être identiques, la fusion
// écrase silencieusement le français et ne vérifie plus qu'une moitié des
// données. Ici, les deux arbres sont toujours parcourus séparément.
//
// Usage :
//   node scripts/check-i18n-parity.mjs
//
// Ne prend pas d'argument : la parité se vérifie toujours sur l'ensemble des
// locales, pas sur un périmètre partiel (contrairement à
// check-i18n-hardcoded.mjs, qu'une tâche d'extraction peut restreindre à ses
// fichiers).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_ROOT = path.resolve(__dirname, '../src/i18n/locales')
const LOCALES = ['fr', 'en']

/**
 * Liste récursivement les fichiers `.json` sous `dir`, triés, avec leur
 * chemin relatif à `dir` (le chemin relatif sert d'identifiant d'espace de
 * noms — `common.json` → `common`, `shop/daily.json` → `shop/daily`).
 * Renvoie [] si `dir` n'existe pas encore (ne doit jamais faire échouer le
 * script : une locale sans aucun fichier est un état valide, pas une erreur).
 */
async function listNamespaceFiles(dir) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []
    }
    throw err
  }

  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await listNamespaceFiles(full)
      files.push(...nested.map((f) => path.join(entry.name, f)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(path.relative(dir, full))
    }
  }
  return files.sort()
}

/**
 * Aplatit un objet JSON de traductions en `{ "a.b.c": "valeur" }`.
 * Les fichiers de namespace sont censés ne contenir que des chaînes en
 * feuille ; toute autre valeur (nombre, booléen, tableau) est remontée comme
 * une erreur de forme plutôt que silencieusement ignorée ou plantée.
 */
function flatten(obj, prefix, out, shapeErrors) {
  for (const [key, value] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, keyPath, out, shapeErrors)
      continue
    }
    if (typeof value !== 'string') {
      shapeErrors.push(
        `valeur non textuelle (${Array.isArray(value) ? 'array' : typeof value}) à la clé "${keyPath}"`,
      )
      continue
    }
    out[keyPath] = value
  }
  return out
}

/** Noms de variables `{{nom}}` d'une chaîne, uniques et triés. */
function placeholders(value) {
  return [...new Set([...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))].sort()
}

/**
 * Noms de balises JSX d'une chaîne (`<strong>`, `</strong>`, `<x/>`, `<x />`,
 * `<x></x>`), uniques et triés — ouvrante, fermante et auto-fermante comptent
 * pour le même nom, seule la présence de la balise importe. Comme pour
 * `placeholders()`, ni l'ordre ni le nombre d'occurrences ne sont retenus :
 * `<Trans>` autorise justement une langue à réordonner ses balises par
 * rapport à l'autre, donc les comparer casserait des traductions correctes.
 */
function jsxTags(value) {
  return [
    ...new Set(
      [...value.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9_]*)\s*\/?>/g)].map((m) => m[1]),
    ),
  ].sort()
}

async function readNamespace(locale, relPath) {
  const file = path.join(LOCALES_ROOT, locale, relPath)
  const raw = await fs.readFile(file, 'utf8')
  let json
  try {
    json = JSON.parse(raw)
  } catch (err) {
    return { file, error: `JSON invalide : ${err.message}` }
  }
  const shapeErrors = []
  const flat = flatten(json, '', {}, shapeErrors)
  return { file, flat, shapeErrors }
}

async function main() {
  const problems = []

  const [frFiles, enFiles] = await Promise.all([
    listNamespaceFiles(path.join(LOCALES_ROOT, 'fr')),
    listNamespaceFiles(path.join(LOCALES_ROOT, 'en')),
  ])

  const frSet = new Set(frFiles)
  const enSet = new Set(enFiles)

  for (const relPath of frFiles) {
    if (!enSet.has(relPath)) {
      problems.push(`espace de noms "${relPath}" présent côté fr/, absent côté en/`)
    }
  }
  for (const relPath of enFiles) {
    if (!frSet.has(relPath)) {
      problems.push(`espace de noms "${relPath}" présent côté en/, absent côté fr/`)
    }
  }

  const commonNamespaces = frFiles.filter((f) => enSet.has(f)).sort()

  let keysCompared = 0

  for (const relPath of commonNamespaces) {
    const [fr, en] = await Promise.all([
      readNamespace('fr', relPath),
      readNamespace('en', relPath),
    ])

    if (fr.error) {
      problems.push(`${fr.file}: ${fr.error}`)
      continue
    }
    if (en.error) {
      problems.push(`${en.file}: ${en.error}`)
      continue
    }
    for (const msg of fr.shapeErrors) {
      problems.push(`${fr.file}: ${msg}`)
    }
    for (const msg of en.shapeErrors) {
      problems.push(`${en.file}: ${msg}`)
    }

    const frKeys = new Set(Object.keys(fr.flat))
    const enKeys = new Set(Object.keys(en.flat))

    // Clés manquantes d'un côté ou de l'autre — les deux sens sont vérifiés
    // explicitement, jamais en itérant sur un objet fusionné.
    for (const key of frKeys) {
      if (!enKeys.has(key)) {
        problems.push(`${relPath}: clé "${key}" présente en fr, absente en en`)
      }
    }
    for (const key of enKeys) {
      if (!frKeys.has(key)) {
        problems.push(`${relPath}: clé "${key}" présente en en, absente en fr`)
      }
    }

    // Valeurs vides — fr et en vérifiés séparément, chacun sur son propre
    // objet, jamais sur une fusion qui masquerait la moitié des données.
    for (const [key, value] of Object.entries(fr.flat)) {
      if (value.trim().length === 0) {
        problems.push(`${relPath}: valeur vide côté fr pour la clé "${key}"`)
      }
    }
    for (const [key, value] of Object.entries(en.flat)) {
      if (value.trim().length === 0) {
        problems.push(`${relPath}: valeur vide côté en pour la clé "${key}"`)
      }
    }

    // Placeholders : comparés uniquement pour les clés présentes des deux
    // côtés (les clés manquantes ont déjà été signalées ci-dessus).
    for (const key of frKeys) {
      if (!enKeys.has(key)) {
        continue
      }
      const frPh = placeholders(fr.flat[key])
      const enPh = placeholders(en.flat[key])
      if (frPh.join(',') !== enPh.join(',')) {
        problems.push(
          `${relPath}: placeholders différents pour la clé "${key}" — fr: [${frPh.join(', ')}] / en: [${enPh.join(', ')}]`,
        )
      }

      const frTags = jsxTags(fr.flat[key])
      const enTags = jsxTags(en.flat[key])
      if (frTags.join(',') !== enTags.join(',')) {
        problems.push(
          `${relPath}: marqueurs JSX différents pour la clé "${key}" — fr: [${frTags.join(', ')}] / en: [${enTags.join(', ')}]`,
        )
      }

      keysCompared++
    }
  }

  if (problems.length > 0) {
    console.error(`[check-i18n-parity] ${problems.length} problème(s) :\n`)
    for (const problem of problems) {
      console.error(`  - ${problem}`)
    }
    process.exitCode = 1
    return
  }

  console.log(
    `[check-i18n-parity] OK — ${commonNamespaces.length} espace(s) de noms, ${keysCompared} clé(s) comparée(s), parité fr/en respectée.`,
  )
}

main().catch((err) => {
  console.error('[check-i18n-parity] échec inattendu :', err)
  process.exit(1)
})
