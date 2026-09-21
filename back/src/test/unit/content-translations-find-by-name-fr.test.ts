import { describe, expect, it, jest } from '@jest/globals'

import { findByNameFr } from '../../main/domain/i18n/content-translations.bootstrap'

/**
 * `findByNameFr` est le seul mécanisme de rapprochement pour les quatre
 * entités sans clé stable en base (`CardSet`, `ShopItem`, `SkillBranch`,
 * `SkillNode` — voir `content-translations.bootstrap.ts`). Fonction pure,
 * testée ici sans base de données ; le cas dangereux est l'ambiguïté :
 * `nameFr` n'est contraint `@unique` par aucun de ces quatre modèles, donc
 * rien n'empêche deux lignes de le partager.
 */
describe('content-translations bootstrap — findByNameFr', () => {
  it('rend la ligne quand une seule correspond', () => {
    const rows = [
      { id: '1', nameFr: 'Flux' },
      { id: '2', nameFr: 'Fortune' },
    ]
    const onAmbiguous = jest.fn()

    const row = findByNameFr(rows, 'Fortune', 'skillBranch', onAmbiguous)

    expect(row).toEqual({ id: '2', nameFr: 'Fortune' })
    expect(onAmbiguous).not.toHaveBeenCalled()
  })

  it("rend undefined sans signaler d'ambiguïté quand rien ne correspond", () => {
    const rows = [{ id: '1', nameFr: 'Flux' }]
    const onAmbiguous = jest.fn()

    const row = findByNameFr(rows, 'Inexistant', 'skillBranch', onAmbiguous)

    expect(row).toBeUndefined()
    expect(onAmbiguous).not.toHaveBeenCalled()
  })

  it('ignore et signale quand plusieurs lignes partagent le même nameFr', () => {
    const rows = [
      { id: '1', nameFr: 'Boost Rare+' },
      { id: '2', nameFr: 'Boost Rare+' },
    ]
    const onAmbiguous = jest.fn()

    const row = findByNameFr(rows, 'Boost Rare+', 'shopItem', onAmbiguous)

    expect(row).toBeUndefined()
    expect(onAmbiguous).toHaveBeenCalledTimes(1)
    const [message] = onAmbiguous.mock.calls[0] as [string]
    expect(message).toContain('shopItem')
    expect(message).toContain('Boost Rare+')
  })

  it('ne mélange jamais deux entités : le nom passé en paramètre se retrouve dans le message', () => {
    const rows = [
      { id: '1', nameFr: 'Régénération' },
      { id: '2', nameFr: 'Régénération' },
    ]
    const onAmbiguous = jest.fn()

    findByNameFr(rows, 'Régénération', 'skillNode', onAmbiguous)

    const [message] = onAmbiguous.mock.calls[0] as [string]
    expect(message).toContain('skillNode')
  })
})
