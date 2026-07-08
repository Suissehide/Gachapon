#!/usr/bin/env node
/**
 * Import des cartes Gobelins / Elfes / Orcs / Démons via l'API admin.
 *
 * Pré-requis : les images sont déjà présentes dans le stockage aux chemins
 *   - prod : cards/<folder>/<ID>.png
 *   - dev  : staging/cards/<folder>/<ID>.png
 * (folder = goblins | elves | orcs | demons)
 *
 * Le script :
 *   1. crée (ou réutilise) un set par famille via POST /admin/sets
 *   2. crée chaque carte via POST /admin/cards (multipart) en passant le champ
 *      `imageUrl` = clé de stockage (l'API le convertit via storageClient.toKey,
 *      donc aucune image n'est ré-uploadée)
 *
 * Idempotent : une carte dont la clé d'image (…/<ID>.png) existe déjà dans le
 * set est ignorée. Relancer le script ne crée pas de doublons.
 *
 * Auth : header X-API-Key d'un compte SUPER_ADMIN.
 *
 * Usage :
 *   API_KEY=xxxxx node scripts/import-cards/import-cards.mjs
 *   API_KEY=xxxxx ENV=dev node scripts/import-cards/import-cards.mjs
 *   API_KEY=xxxxx DRY_RUN=1 node scripts/import-cards/import-cards.mjs
 *
 * Variables d'environnement :
 *   API_KEY   (requis) clé API d'un SUPER_ADMIN
 *   API_URL   (défaut https://api.gachapon.qwetle.fr)
 *   ENV       prod | dev  (défaut prod) → préfixe des chemins d'image
 *   DRY_RUN   1 pour simuler sans écrire
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const API_URL = (process.env.API_URL ?? 'https://api.gachapon.qwetle.fr').replace(/\/$/, '')
const API_KEY = process.env.API_KEY
const ENV = (process.env.ENV ?? 'prod').toLowerCase()
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

if (!API_KEY) {
  console.error('✗ API_KEY manquant. Usage : API_KEY=xxxx node scripts/import-cards/import-cards.mjs')
  process.exit(1)
}
if (ENV !== 'prod' && ENV !== 'dev') {
  console.error(`✗ ENV invalide : "${ENV}" (attendu prod | dev)`)
  process.exit(1)
}

// Métadonnées de set par famille (clé = dossier d'image).
const FAMILIES = {
  goblins: { setName: 'Gobelins', description: 'Le set des Gobelins du Gachapon.' },
  elves: { setName: 'Elfes', description: 'Le set des Elfes du Gachapon.' },
  orcs: { setName: 'Orcs', description: 'Le set des Orcs du Gachapon.' },
  demons: { setName: 'Démons', description: 'Le set des Démons du Gachapon.' },
}

const imagePrefix = (folder) =>
  ENV === 'prod' ? `cards/${folder}` : `staging/cards/${folder}`

const headers = { 'X-API-Key': API_KEY }

async function api(method, path, { json, form } = {}) {
  const opts = { method, headers: { ...headers } }
  if (json) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(json)
  }
  if (form) {
    opts.body = form // FormData → boundary auto
  }
  const res = await fetch(`${API_URL}${path}`, opts)
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${res.statusText} : ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  }
  return body
}

async function ensureSet(folder) {
  const { setName, description } = FAMILIES[folder]
  if (DRY_RUN) {
    console.log(`  [dry-run] set « ${setName} » (créé ou réutilisé au réel)`)
    return `dry-run-${folder}`
  }
  const { sets } = await api('GET', '/admin/sets')
  const existing = (sets ?? []).find((s) => s.name === setName)
  if (existing) {
    console.log(`  set « ${setName} » déjà présent (${existing.id})`)
    return existing.id
  }
  const created = await api('POST', '/admin/sets', {
    json: { name: setName, description, isActive: true },
  })
  console.log(`  set « ${setName} » créé (${created.id})`)
  return created.id
}

async function existingImageKeys(setId) {
  if (DRY_RUN || String(setId).startsWith('dry-run')) {
    return new Set()
  }
  const { cards } = await api('GET', `/admin/cards?setId=${setId}`)
  const keys = new Set()
  for (const c of cards ?? []) {
    if (c.imageUrl) {
      // imageUrl est résolue en URL publique ; on ne garde que le nom de fichier.
      const file = c.imageUrl.split('/').pop()
      if (file) keys.add(file)
    }
  }
  return keys
}

async function createCard(setId, card) {
  const key = `${imagePrefix(card.folder)}/${card.id}.png`
  const form = new FormData()
  form.append('name', card.name)
  form.append('setId', setId)
  form.append('rarity', card.rarity)
  form.append('dropWeight', String(card.dropWeight))
  form.append('baseHp', String(card.hp))
  form.append('baseAtk', String(card.atk))
  form.append('baseDef', String(card.def))
  form.append('baseSpd', String(card.spd))
  if (card.passiveKey) form.append('passiveKey', card.passiveKey)
  form.append('imageUrl', key)

  if (DRY_RUN) {
    console.log(`    [dry-run] ${card.id} ${card.name} (${card.rarity}) → ${key}${card.passiveKey ? ` [${card.passiveKey}]` : ''}`)
    return 'created'
  }
  await api('POST', '/admin/cards', { form })
  return 'created'
}

async function main() {
  const data = JSON.parse(
    await readFile(join(__dirname, 'cards-data.json'), 'utf8'),
  )

  console.log(`Import cartes — API ${API_URL} — ENV ${ENV}${DRY_RUN ? ' — DRY-RUN' : ''}`)

  let created = 0
  let skipped = 0
  let failed = 0

  // data est indexé par nom de famille FR ; on route via le champ folder de chaque carte.
  for (const [family, cards] of Object.entries(data)) {
    const folder = cards[0]?.folder
    if (!folder || !FAMILIES[folder]) {
      console.warn(`! Famille ignorée (dossier inconnu) : ${family}`)
      continue
    }
    console.log(`\n=== ${family} (${cards.length} cartes) ===`)
    const setId = await ensureSet(folder)
    const present = await existingImageKeys(setId)

    for (const card of cards) {
      const file = `${card.id}.png`
      if (present.has(file)) {
        skipped++
        continue
      }
      try {
        await createCard(setId, card)
        created++
        process.stdout.write('.')
      } catch (err) {
        failed++
        console.error(`\n  ✗ ${card.id} ${card.name} : ${err.message}`)
      }
    }
    process.stdout.write('\n')
  }

  console.log(`\nTerminé — ${created} créées, ${skipped} ignorées (déjà présentes), ${failed} échecs.`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
