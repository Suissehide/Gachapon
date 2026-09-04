import { describe, expect, it } from '@jest/globals'

import {
  QUEST_DEFINITIONS,
  type QuestDefinition,
} from '../../main/domain/quests/quest-definitions'

const byKey = (key: string): QuestDefinition => {
  const found = QUEST_DEFINITIONS.find((q) => q.key === key)
  if (!found) {
    throw new Error(`Quête introuvable : ${key}`)
  }
  return found
}

const weekly = () => QUEST_DEFINITIONS.filter((q) => q.period === 'WEEKLY')
const oneshot = () => QUEST_DEFINITIONS.filter((q) => q.period === 'ONESHOT')

describe('définitions de quêtes', () => {
  it('a des clés uniques', () => {
    const keys = QUEST_DEFINITIONS.map((q) => q.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('donne une cible strictement positive à chaque quête', () => {
    for (const q of QUEST_DEFINITIONS) {
      expect(q.criterion.target).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Pool hebdomadaire
// ---------------------------------------------------------------------------
describe('pool hebdomadaire', () => {
  // Le tirage prend 3 quêtes parmi le pool. La taille du pool est ce qui
  // produit la variation semaine à semaine : 11 quêtes = 165 combinaisons
  // possibles contre 35 avec les 7 quêtes d'origine.
  it('compte 11 quêtes', () => {
    expect(weekly()).toHaveLength(11)
  })

  it('contient les 4 quêtes équipement', () => {
    const keys = weekly().map((q) => q.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'weekly_equip_drops_12',
        'weekly_equip_rare_3',
        'weekly_equip_levels_12',
        'weekly_equip_salvage_15',
      ]),
    )
  })

  // Parité stricte avec les 7 hebdos d'origine : une quête équipement ne doit
  // être ni plus ni moins rentable qu'une quête carte, sinon le tirage
  // aléatoire rendrait les semaines inégales.
  it('récompense chaque hebdo à l identique (5 jetons / 80 poussière / 150 XP)', () => {
    for (const q of weekly()) {
      expect({
        key: q.key,
        tokens: q.rewardTokens,
        dust: q.rewardDust,
        xp: q.rewardXp,
      }).toEqual({ key: q.key, tokens: 5, dust: 80, xp: 150 })
    }
  })

  it('calibre « Chasseur de Trésors » sur 12 pièces obtenues', () => {
    expect(byKey('weekly_equip_drops_12').criterion).toEqual({
      event: 'EQUIPMENT_OBTAINED',
      target: 12,
    })
  })

  // RARE et non EPIC : aux étages 1-3 de la tour le poids EPIC est nul, une
  // quête EPIC serait infaisable pour un débutant et lui coûterait le bonus
  // « semaine parfaite ».
  it('filtre « Butin de Qualité » sur RARE, cible 3', () => {
    expect(byKey('weekly_equip_rare_3').criterion).toEqual({
      event: 'EQUIPMENT_OBTAINED',
      target: 3,
      filter: { rarity: 'RARE' },
    })
  })

  it('calibre « Forgeron » sur 12 niveaux gagnés', () => {
    expect(byKey('weekly_equip_levels_12').criterion).toEqual({
      event: 'EQUIPMENT_UPGRADED',
      target: 12,
    })
  })

  it('calibre « Ferrailleur » sur 15 pièces recyclées', () => {
    expect(byKey('weekly_equip_salvage_15').criterion).toEqual({
      event: 'EQUIPMENT_SALVAGED',
      target: 15,
    })
  })
})

// ---------------------------------------------------------------------------
// Chaîne one-shot
// ---------------------------------------------------------------------------
describe('chaîne one-shot', () => {
  it('compte 10 quêtes', () => {
    expect(oneshot()).toHaveLength(10)
  })

  // La chaîne one-shot enseigne une boucle de jeu à la fois : chaque quête
  // équipement doit se déclencher au PREMIER geste, pas à un jalon.
  it('déclenche les 3 quêtes équipement au premier geste', () => {
    for (const key of [
      'first_equipment',
      'first_equip_upgrade',
      'first_equip_salvage',
    ]) {
      const q = byKey(key)
      expect(q.period).toBe('ONESHOT')
      expect(q.criterion.target).toBe(1)
    }
  })

  it('couvre les trois boucles équipement (obtenir, améliorer, recycler)', () => {
    expect([
      byKey('first_equipment').criterion.event,
      byKey('first_equip_upgrade').criterion.event,
      byKey('first_equip_salvage').criterion.event,
    ]).toEqual([
      'EQUIPMENT_OBTAINED',
      'EQUIPMENT_UPGRADED',
      'EQUIPMENT_SALVAGED',
    ])
  })

  // Un one-shot de découverte ne doit pas filtrer : un débutant ne contrôle
  // ni la rareté ni le slot de son premier drop.
  it('ne filtre aucune quête de découverte équipement', () => {
    for (const key of [
      'first_equipment',
      'first_equip_upgrade',
      'first_equip_salvage',
    ]) {
      expect(byKey(key).criterion.filter).toBeUndefined()
    }
  })
})
