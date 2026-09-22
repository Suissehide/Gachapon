import { describe, expect, it } from '@jest/globals'

import { formatSetTierLabel } from '../../main/domain/equipment/equipment.domain'
import { runWithLocale } from '../../main/infra/i18n/locale-context'

/**
 * Garde-fou de traduction pour `SET_STAT_LABELS_FR`/`SET_STAT_LABELS_EN`
 * (`equipment.domain.ts`) — signalé en revue de la tâche 4 (round 3) comme
 * la seule table de libellés bilingues du lot sans couverture : le seul
 * test qui en approchait (`sets.test.ts`, `toMatch(/^\+\d/)`) passe aussi
 * bien pour `"+10 % ATQ"` que pour une recopie bugguée `"+10% PV"` servie à
 * un anglophone.
 *
 * Teste `formatSetTierLabel()` plutôt que les deux tables directement :
 * c'est elle qui assemble le libellé FINAL, format compris (espace avant le
 * `%` en français, aucun en anglais) — les deux tables ne sont jamais
 * servies telles quelles, seule cette fonction l'est (`bonus.label` de
 * `GET /equipment/sets` et de l'inventaire).
 */
describe('formatSetTierLabel', () => {
  const CASES: Array<{
    key: string
    labelFr: string
    labelEn: string
  }> = [
    { key: 'hpPct', labelFr: 'PV', labelEn: 'HP' },
    { key: 'atkPct', labelFr: 'ATQ', labelEn: 'ATK' },
    { key: 'defPct', labelFr: 'DEF', labelEn: 'DEF' },
    { key: 'spdPct', labelFr: 'VIT', labelEn: 'SPD' },
    { key: 'critRatePct', labelFr: 'taux crit', labelEn: 'crit rate' },
    { key: 'critDmgPct', labelFr: 'dégâts crit', labelEn: 'crit damage' },
    {
      key: 'armorPenPct',
      labelFr: "pénétration d'armure",
      labelEn: 'armor penetration',
    },
    { key: 'lifestealPct', labelFr: 'vol de vie', labelEn: 'lifesteal' },
  ]

  // Seule clé légitimement identique dans les deux langues : « DEF » est
  // l'abréviation reconnue de « défense » aussi bien en français qu'en
  // anglais (comme RAMPART/PASSIVE labels le documentent déjà pour les
  // cognats de passifs) — nommée ici plutôt que masquée par un filtre
  // générique.
  const LEGITIMATE_IDENTICAL = new Set(['defPct'])

  it.each(CASES)(
    'assemble le libellé complet FR pour $key, espace avant le %',
    ({ key, labelFr }) => {
      runWithLocale('FR', () => {
        expect(formatSetTierLabel({ [key]: 10 })).toBe(`+10 % ${labelFr}`)
      })
    },
  )

  it.each(CASES)(
    'assemble le libellé complet EN pour $key, sans espace avant le %',
    ({ key, labelEn }) => {
      runWithLocale('EN', () => {
        expect(formatSetTierLabel({ [key]: 10 })).toBe(`+10% ${labelEn}`)
      })
    },
  )

  it('EN est la locale par défaut hors de tout contexte de requête', () => {
    expect(formatSetTierLabel({ atkPct: 7 })).toBe('+7% ATK')
  })

  it('ne laisse pas l’anglais recopier le français, hors exception nommée', () => {
    const copied = CASES.filter(
      ({ key, labelFr, labelEn }) =>
        labelFr === labelEn && !LEGITIMATE_IDENTICAL.has(key),
    )
    expect(copied.map((c) => c.key)).toEqual([])
  })

  it('couvre les 8 clés de bonus de set, pas un sous-ensemble', () => {
    expect(CASES.map((c) => c.key).sort()).toEqual(
      [
        'armorPenPct',
        'atkPct',
        'critDmgPct',
        'critRatePct',
        'defPct',
        'hpPct',
        'lifestealPct',
        'spdPct',
      ].sort(),
    )
  })

  it('renvoie une chaîne vide sans bonus (défensif, jamais rencontré en pratique)', () => {
    runWithLocale('FR', () => {
      expect(formatSetTierLabel({})).toBe('')
    })
  })
})
