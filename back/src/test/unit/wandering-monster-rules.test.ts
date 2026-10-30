import { describe, expect, it } from '@jest/globals'
import {
  computeLoot,
  pickLootKind,
  pickMonsterStage,
  pickSpawnDelayMinutes,
  nextWandererAppearsAt,
  soloWandererSpec,
} from '../../main/domain/campaign/wandering-monster-rules'
import { enemyTeamSchema } from '../../main/domain/campaign/campaign.domain'
import { enemySpecSchema } from '../../main/domain/combat/sim-units'

describe('nextWandererAppearsAt', () => {
  const now = new Date('2026-10-30T12:00:00Z')

  it('premier passage : le délai part de maintenant', () => {
    expect(nextWandererAppearsAt(null, now, 60, 180).toISOString()).toBe(
      '2026-10-30T13:00:00.000Z',
    )
  })

  it('le délai part de la fin du passage précédent', () => {
    expect(
      nextWandererAppearsAt(new Date('2026-10-30T11:00:00Z'), now, 120, 180).toISOString(),
    ).toBe('2026-10-30T13:00:00.000Z')
  })

  it('apparaît tout de suite si sa fenêtre est encore ouverte', () => {
    expect(
      nextWandererAppearsAt(new Date('2026-10-30T09:00:00Z'), now, 120, 180).toISOString(),
    ).toBe('2026-10-30T11:00:00.000Z')
  })

  it('fenêtre écoulée en absence : repart de maintenant', () => {
    expect(
      nextWandererAppearsAt(new Date('2026-10-29T09:00:00Z'), now, 120, 180).toISOString(),
    ).toBe('2026-10-30T14:00:00.000Z')
  })
})

describe('pickSpawnDelayMinutes', () => {
  it('délai entre 60 et 360 minutes', () => {
    expect(pickSpawnDelayMinutes(60, 360, () => 0)).toBe(60)
    expect(pickSpawnDelayMinutes(60, 360, () => 0.999999)).toBe(360)
  })
})

describe('pickMonsterStage', () => {
  const progress = { highestChapter: 3, highestIndex: 4 }
  const stages = [1, 2, 3].flatMap((chapter) =>
    [1, 2, 3, 4, 5].map((index) => ({ chapter, index })),
  )

  it('étage battu du chapitre le plus avancé', () => {
    for (const r of [0, 0.3, 0.7, 0.999]) {
      const s = pickMonsterStage(stages, progress, () => r)
      expect(s?.chapter).toBe(3)
      expect(s?.index).toBeLessThanOrEqual(4)
    }
  })

  it('aucun étage battu → null', () => {
    expect(
      pickMonsterStage(stages, { highestChapter: 1, highestIndex: 0 }, () => 0),
    ).toBeNull()
  })
})

describe('pickLootKind', () => {
  it('quatre lots à poids égaux', () => {
    expect([0, 0.25, 0.5, 0.75].map((r) => pickLootKind(() => r))).toEqual([
      'GOLD',
      'DUST',
      'TOKENS',
      'CARD',
    ])
  })
})

describe('computeLoot', () => {
  it('montants du butin', () => {
    const farm = { gold: 91, dust: 24 }
    const cfg = { lootMult: 5, tokens: 5 }
    expect(computeLoot('GOLD', farm, cfg)).toEqual({ kind: 'GOLD', amount: 455 })
    expect(computeLoot('DUST', farm, cfg)).toEqual({ kind: 'DUST', amount: 120 })
    expect(computeLoot('TOKENS', farm, cfg)).toEqual({ kind: 'TOKENS', amount: 5 })
    expect(computeLoot('CARD', farm, cfg)).toEqual({ kind: 'CARD', amount: 1 })
  })
})

describe('soloWandererSpec', () => {
  const enemy = (atk: number, element: string) => ({
    baseHp: 100,
    baseAtk: atk,
    baseDef: 20,
    baseSpd: 90,
    attackPattern: 'BASIC',
    element,
  })

  it('fond l’équipe en un monstre AOE_3 : PV cumulés, attaque moyenne, tête conservée', () => {
    const solo = soloWandererSpec(
      [enemy(10, 'DARK'), enemy(20, 'FIRE'), enemy(30, 'WATER')],
      1.5,
    )
    expect(solo).toEqual({
      baseHp: 450,
      baseAtk: 30,
      baseDef: 20,
      baseSpd: 90,
      attackPattern: 'AOE_3',
      element: 'DARK',
    })
  })

  it('un boss, déjà seul, est rendu tel quel', () => {
    const boss = { ...enemy(50, 'FIRE'), attackPattern: 'AOE_3' }
    expect(soloWandererSpec([boss], 1.5)).toBe(boss)
  })
})

describe('schémas d ennemis stockés en JSON', () => {
  // Les lignes en base peuvent encore porter une clé que le moteur n'utilise
  // plus : elles doivent se lire, pas faire échouer un combat.
  const ennemi = {
    baseHp: 100, baseAtk: 10, baseDef: 10, baseSpd: 100,
    level: 1, palier: 1, mitigationScale: 12,
  }

  it('un enemyTeam qui porte encore mitigationScale se parse', () => {
    expect(() => enemyTeamSchema.parse([ennemi])).not.toThrow()
    expect(() => enemySpecSchema.parse(ennemi)).not.toThrow()
  })
})
