import { describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /equipment/sets', () => {
  it('renvoie les 4 sets avec leurs deux paliers', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/equipment/sets' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.sets).toHaveLength(4)
    for (const s of body.sets) {
      expect(s).toHaveProperty('key')
      expect(s).toHaveProperty('label')
      expect(s.two.bonuses).toBeDefined()
      expect(s.four.bonuses).toBeDefined()
    }
    // Le 2-pièces donne une stat classique, le 4-pièces une stat de stuff —
    // vérifié sur Fureur, sans recopier les valeurs sous arbitrage.
    const fureur = body.sets.find((s: { key: string }) => s.key === 'FUREUR')
    expect(fureur.label).toBe('Fureur')
    expect(fureur.two.bonuses.atkPct).toBeGreaterThan(0)
    expect(fureur.four.bonuses.critDmgPct).toBeGreaterThan(0)
    await app.close()
  })

  it("ne requiert pas de session : c'est de la donnée de référence", async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/equipment/sets' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})
