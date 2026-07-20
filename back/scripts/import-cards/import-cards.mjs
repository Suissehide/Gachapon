#!/usr/bin/env node
/**
 * Import des cartes Gobelins / Elfes / Orcs / Démons / Anges / Dragons / Nains /
 * Morts-vivants / Puazi via l'API admin.
 *
 * Pré-requis : les images sont déjà présentes dans le stockage aux chemins
 *   - prod : cards/<folder>/<ID>.png
 *   - dev  : staging/cards/<folder>/<ID>.png
 * (folder = goblins | elves | orcs | demons | angels | dragons | dwarfs | undeads | puazis)
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
 * Rate limit : l'API limite les requêtes (par défaut 100 / 60 s). Le script
 * détecte le dépassement, attend la fenêtre (Retry-After ou 60 s) et retente
 * automatiquement — un seul run suffit, pas besoin de relancer à la main.
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

// dropWeight imposé par rareté (spec rééquilibrage 2026-07-20) : le champ
// dropWeight de cards-data.json (généré depuis l'Excel) est volontairement ignoré.
const DROP_WEIGHT_BY_RARITY = { COMMON: 85, UNCOMMON: 38, RARE: 16, EPIC: 8, LEGENDARY: 2 }

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
  angels: { setName: 'Anges', description: 'Le set des Anges du Gachapon.' },
  dragons: { setName: 'Dragons', description: 'Le set des Dragons du Gachapon.' },
  dwarfs: { setName: 'Nains', description: 'Le set des Nains du Gachapon.' },
  undeads: { setName: 'Morts-vivants', description: 'Le set des Morts-vivants du Gachapon.' },
  puazis: { setName: 'Puazi', description: 'Le set des Puazi du Gachapon.' },
}

const imagePrefix = (folder) =>
  ENV === 'prod' ? `cards/${folder}` : `staging/cards/${folder}`

const headers = { 'X-API-Key': API_KEY }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// L'API applique un rate limit (par défaut 100 requêtes / 60 s). Au lieu de faire
// échouer les cartes restantes, on attend la fenêtre et on retente la requête.
const RATE_LIMIT_MAX_RETRIES = 20

function isRateLimited(status, body) {
  const message = typeof body === 'string' ? body : (body?.message ?? '')
  return status === 429 || /rate limit exceeded/i.test(message)
}

// Le body multipart est reconstruit à chaque tentative (une FormData ne peut pas
// être réutilisée pour un second fetch), d'où `formFactory` plutôt qu'une `form`.
async function api(method, path, { json, formFactory } = {}) {
  for (let attempt = 0; ; attempt++) {
    const opts = { method, headers: { ...headers } }
    if (json) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(json)
    }
    if (formFactory) {
      opts.body = formFactory() // FormData fraîche → boundary auto
    }
    const res = await fetch(`${API_URL}${path}`, opts)
    const text = await res.text()
    let body
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    if (res.ok) {
      return body
    }
    if (isRateLimited(res.status, body) && attempt < RATE_LIMIT_MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'))
      const waitS = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60
      process.stdout.write(`\n  ⏳ Rate limit atteint — pause ${waitS}s puis reprise…\n`)
      await sleep((waitS + 1) * 1000)
      continue
    }
    throw new Error(`${method} ${path} → ${res.status} ${res.statusText} : ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  }
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

function dropWeightFor(card) {
  const weight = DROP_WEIGHT_BY_RARITY[card.rarity]
  if (weight == null) throw new Error(`Rareté inconnue pour ${card.id}: ${card.rarity}`)
  return weight
}

async function createCard(setId, card) {
  const key = `${imagePrefix(card.folder)}/${card.id}.png`
  const buildForm = () => {
    const form = new FormData()
    form.append('name', card.name)
    form.append('setId', setId)
    form.append('rarity', card.rarity)
    form.append('dropWeight', String(dropWeightFor(card)))
    form.append('baseHp', String(card.hp))
    form.append('baseAtk', String(card.atk))
    form.append('baseDef', String(card.def))
    form.append('baseSpd', String(card.spd))
    if (card.passiveKey) form.append('passiveKey', card.passiveKey)
    form.append('imageUrl', key)
    return form
  }

  if (DRY_RUN) {
    console.log(`    [dry-run] ${card.id} ${card.name} (${card.rarity}) → ${key}${card.passiveKey ? ` [${card.passiveKey}]` : ''}`)
    return 'created'
  }
  await api('POST', '/admin/cards', { formFactory: buildForm })
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
