import { describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /equipment/sets', () => {
  it('renvoie les sets avec leur taille et leur bonus unique', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/equipment/sets' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.sets.length).toBeGreaterThan(0)
    for (const s of body.sets) {
      expect(s).toHaveProperty('key')
      expect(s).toHaveProperty('label')
      // Un seul palier par set depuis la refonte : `pieces` dit à partir de
      // combien de pièces le bonus s'active, et il n'y a rien au-delà.
      expect([2, 3, 4]).toContain(s.pieces)
      expect(Object.keys(s.bonus.bonuses)).toHaveLength(1)
      expect(s.bonus.label).toMatch(/^\+\d/)
    }
    // Les trois tailles sont représentées — c'est ce qui permet de porter
    // deux sets à la fois sur les 7 emplacements d'une carte.
    const tailles = new Set(body.sets.map((s: { pieces: number }) => s.pieces))
    expect([...tailles].sort()).toEqual([2, 3, 4])

    // Vérifié sur FUREUR, sans recopier la valeur sous arbitrage. Depuis la
    // tâche 4 (round 2, lot i18n 2), le libellé de set se traduit comme les
    // noms d'ennemis et de passifs — 'Wrath' est le texte anglais (locale
    // par défaut, aucun accept-language sur cette requête), pas 'Fureur'.
    const fureur = body.sets.find((s: { key: string }) => s.key === 'FUREUR')
    expect(fureur.label).toBe('Wrath')
    expect(fureur.pieces).toBe(4)
    expect(fureur.bonus.bonuses.critDmgPct).toBeGreaterThan(0)
    await app.close()
  })

  it("ne requiert pas de session : c'est de la donnée de référence", async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/equipment/sets' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})
