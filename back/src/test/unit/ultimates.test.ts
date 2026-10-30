import { describe, expect, it } from '@jest/globals'

import {
  getUltimate,
  ULTIMATE_SHIELD_CAP_PCT,
  ULTIMATES,
} from '../../main/domain/combat/ultimates'
import { runWithLocale } from '../../main/infra/i18n/locale-context'
import {
  CARD_ARCHETYPES,
  type CardArchetype,
} from '../../main/types/domain/combat/archetype.types'

describe('ultimes par archétype', () => {
  it('sept ultimes, un par archétype', () => {
    expect(Object.keys(ULTIMATES).sort()).toEqual([...CARD_ARCHETYPES].sort())
  })

  it('schémas : MAGE AOE_3, RANGER MULTI_2, ASSASSIN MONO_DOUBLE, FIGHTER et BALANCED MONO_AMPLIFIED, TANK et SUPPORT sans schéma', () => {
    expect(ULTIMATES.MAGE.pattern).toBe('AOE_3')
    expect(ULTIMATES.RANGER.pattern).toBe('MULTI_2')
    expect(ULTIMATES.ASSASSIN.pattern).toBe('MONO_DOUBLE')
    expect(ULTIMATES.FIGHTER.pattern).toBe('MONO_AMPLIFIED')
    expect(ULTIMATES.BALANCED.pattern).toBe('MONO_AMPLIFIED')
    expect(ULTIMATES.TANK.pattern).toBeNull()
    expect(ULTIMATES.SUPPORT.pattern).toBeNull()
  })

  it('TANK est SHIELD, SUPPORT est HEAL, les autres ATTACK', () => {
    expect(ULTIMATES.TANK.kind).toBe('SHIELD')
    expect(ULTIMATES.SUPPORT.kind).toBe('HEAL')
    for (const key of ['MAGE', 'RANGER', 'ASSASSIN', 'FIGHTER', 'BALANCED'] as const) {
      expect(ULTIMATES[key].kind).toBe('ATTACK')
    }
  })

  it('la magnitude ne décroît jamais avec le palier et est bornée à 1..6', () => {
    for (const key of CARD_ARCHETYPES) {
      const u = ULTIMATES[key]
      for (let p = 1; p < 6; p++) {
        expect(u.compute(p + 1).valuePct).toBeGreaterThanOrEqual(u.compute(p).valuePct)
      }
      expect(u.compute(7).valuePct).toBe(u.compute(6).valuePct)
      expect(u.compute(0).valuePct).toBe(u.compute(1).valuePct)
    }
  })

  it('BALANCED frappe moins fort que FIGHTER à tout palier', () => {
    for (let p = 1; p <= 6; p++) {
      expect(ULTIMATES.BALANCED.compute(p).valuePct).toBeLessThan(
        ULTIMATES.FIGHTER.compute(p).valuePct,
      )
    }
  })

  it('cadence par archétype : Assassin 2, Tank et Soutien 4, les autres 3 ; plafond de bouclier 50 %', () => {
    expect(ULTIMATES.ASSASSIN.cadence).toBe(2)
    expect(ULTIMATES.TANK.cadence).toBe(4)
    expect(ULTIMATES.SUPPORT.cadence).toBe(4)
    for (const key of ['MAGE', 'RANGER', 'FIGHTER', 'BALANCED'] as const) {
      expect(ULTIMATES[key].cadence).toBe(3)
    }
    expect(ULTIMATE_SHIELD_CAP_PCT).toBe(50)
  })

  it('la description annonce la cadence de l archétype', () => {
    runWithLocale('FR', () => {
      expect(ULTIMATES.ASSASSIN.describe(1)).toContain('Toutes les 2 actions')
      expect(ULTIMATES.TANK.describe(1)).toContain('Toutes les 4 actions')
    })
    runWithLocale('EN', () => {
      expect(ULTIMATES.MAGE.describe(1)).toContain('Every 3 actions')
    })
  })

  it('libellé et description suivent la locale de la requête', () => {
    const fr = runWithLocale('FR', () => ({
      label: ULTIMATES.MAGE.label,
      text: ULTIMATES.MAGE.describe(1),
    }))
    const en = runWithLocale('EN', () => ({
      label: ULTIMATES.MAGE.label,
      text: ULTIMATES.MAGE.describe(1),
    }))
    expect(fr.label).toBe('Déluge')
    expect(en.label).toBe('Deluge')
    expect(fr.text).not.toBe(en.text)
    expect(fr.text).toContain(String(ULTIMATES.MAGE.compute(1).valuePct))
  })

  it('getUltimate : archétype connu ou null', () => {
    expect(getUltimate('TANK')?.archetype).toBe('TANK' satisfies CardArchetype)
    expect(getUltimate('PALADIN')).toBeNull()
    expect(getUltimate(null)).toBeNull()
    expect(getUltimate(undefined)).toBeNull()
  })
})
