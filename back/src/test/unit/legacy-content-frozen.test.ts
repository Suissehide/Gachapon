import { describe, expect, it } from '@jest/globals'


import {
  bossEnemyTeam,
  bossLoot,
  lootTableNormal,
  normalEnemyTeam,
  wandererSoloScale,
} from '../../main/domain/content/campaign.definitions'
import { buildTowerFloors } from '../../main/domain/content/tower.definitions'
import legacy from './fixtures/legacy-content.json'

/**
 * Le contenu de fin de jeu s'AJOUTE : les 150 étages de campagne et les
 * étages 1 à 10 des tours, tels que les joueurs les ont déjà franchis, ne
 * doivent pas bouger d'un point. Le fixture est l'état livré avant l'ajout
 * des chapitres 16-20 et des étages 11-15.
 */
describe('contenu existant figé', () => {
  it('les 150 étages de campagne sont identiques', () => {
    for (const [key, expected] of Object.entries(legacy.campaign)) {
      const [c, i] = key.split('-').map(Number) as [number, number]
      const actual =
        i === 10
          ? { enemyTeam: bossEnemyTeam(c, i), lootTable: bossLoot(c) }
          : {
              enemyTeam: normalEnemyTeam(c, i),
              lootTable: lootTableNormal(c, i),
            }
      expect({ key, ...actual }).toEqual({ key, ...expected })
    }
  })

  it('le monstre errant des chapitres 1 à 15 est identique', () => {
    for (const [key, expected] of Object.entries(legacy.wanderer)) {
      const [c, i] = key.split('-').map(Number) as [number, number]
      expect({ key, scale: wandererSoloScale(c, i) }).toEqual({
        key,
        scale: expected,
      })
    }
  })

  it('les étages 1 à 10 des quatre tours sont identiques', () => {
    const floors = buildTowerFloors().filter((f) => f.index <= 10)
    expect(floors).toHaveLength(Object.keys(legacy.tower).length)
    for (const f of floors) {
      const key = `${f.element}-${f.index}`
      expect({
        key,
        enemyTeam: f.enemyTeam,
        lootTable: f.lootTable,
        labelFr: f.labelFr,
        labelEn: f.labelEn,
      }).toEqual({ key, ...legacy.tower[key as keyof typeof legacy.tower] })
    }
  })
})
