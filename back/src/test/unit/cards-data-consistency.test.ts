import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from '@jest/globals'

import { CARDS as HUMAN_CARDS } from '../../../prisma/seed/cards'

// `cards-data.json` (généré depuis le classeur tcg_kit par import-cards) et
// `prisma/seed/cards.ts` (suivi par git) décrivent tous les deux les 38
// cartes Humains — c'est ce doublon, jamais comparé automatiquement, qui a
// laissé cards.ts porter des stats d'avant rééquilibrage pendant que
// cards-data.json était déjà à jour (voir task-4-report.md, correction).
//
// cards-data.json est gitignoré (données générées, non versionnées) : il
// n'existe pas forcément en CI. Le test se saute proprement dans ce cas
// plutôt que d'échouer, avec un message explicite.
//
// Jest tourne en ESM réel (NODE_OPTIONS=--experimental-vm-modules, voir
// package.json test:unit) : pas de __dirname, on le dérive de import.meta.url
// comme infra/mail/mail.service.ts.
const _dirname = dirname(fileURLToPath(import.meta.url))
const JSON_PATH = join(_dirname, '../../../scripts/import-cards/cards-data.json')

type JsonCard = { id: string; atk: number; def: number; hp: number; spd: number }

function loadHumansFromJson(): JsonCard[] | null {
  if (!existsSync(JSON_PATH)) return null
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))
  return data.Humains ?? []
}

describe('cohérence cards.ts / cards-data.json (source de vérité dupliquée)', () => {
  const humansFromJson = loadHumansFromJson()

  if (humansFromJson === null) {
    it.skip('cards-data.json absent (gitignoré, non disponible dans cet environnement) — test sauté', () => {})
    return
  }

  it("chaque carte Humains présente dans les deux sources porte les mêmes stats (hp/atk/def/spd)", () => {
    const jsonById = new Map(humansFromJson.map((c) => [c.id, c]))
    const divergences: string[] = []

    for (const card of HUMAN_CARDS) {
      const json = jsonById.get(card.id)
      if (!json) {
        divergences.push(`${card.id} : absent de cards-data.json`)
        continue
      }
      if (
        card.baseHp !== json.hp ||
        card.baseAtk !== json.atk ||
        card.baseDef !== json.def ||
        card.baseSpd !== json.spd
      ) {
        divergences.push(
          `${card.id} : cards.ts {hp:${card.baseHp},atk:${card.baseAtk},def:${card.baseDef},spd:${card.baseSpd}} ` +
            `≠ cards-data.json {hp:${json.hp},atk:${json.atk},def:${json.def},spd:${json.spd}}`,
        )
      }
    }

    expect(divergences).toEqual([])
  })
})
