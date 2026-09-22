import { describe, expect, it, jest } from '@jest/globals'

import { CARDS, IMAGE_PREFIX } from '../../main/domain/content/cards.definitions'
import {
  findByNameFr,
  imageCodeOf,
  indexByImageCode,
} from '../../main/domain/i18n/content-translations.bootstrap'

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

/**
 * `indexByImageCode` est le rapprochement de `Card`. Il remplace un
 * `where: { id: { in: CARDS.map(c => c.id) } }` qui ne sélectionnait RIEN en
 * base réelle : `Card.id` est un uuid généré, le `id` d'une définition
 * (`HUM-001`) n'est qu'un code d'image. Le seul endroit où ce code atteint
 * la base est `imageUrl`.
 */
describe("content-translations bootstrap — code d'image", () => {
  it('extrait le code quel que soit le préfixe de stockage', () => {
    expect(imageCodeOf('staging/cards/humans/HUM-001.png')).toBe('HUM-001')
    expect(imageCodeOf('cards/humans/HUM-001.png')).toBe('HUM-001')
    expect(imageCodeOf('cards/humans/HUM-001.webp')).toBe('HUM-001')
  })

  it('rend null sur une clé absente ou inexploitable', () => {
    expect(imageCodeOf(null)).toBeNull()
    expect(imageCodeOf('')).toBeNull()
    expect(imageCodeOf('cards/humans/')).toBeNull()
  })

  it('indexe les lignes du seed, dont le id est un uuid sans rapport', () => {
    const rows = [
      { id: 'b8a4…-uuid-1', imageUrl: `${IMAGE_PREFIX}/HUM-001.png` },
      { id: 'b8a4…-uuid-2', imageUrl: `${IMAGE_PREFIX}/HUM-002.png` },
    ]
    const onAmbiguous = jest.fn()

    const byCode = indexByImageCode(rows, onAmbiguous)

    expect(byCode.get('HUM-001')?.id).toBe('b8a4…-uuid-1')
    expect(byCode.get(CARDS[1].id)?.id).toBe('b8a4…-uuid-2')
    expect(onAmbiguous).not.toHaveBeenCalled()
  })

  it("ignore les lignes sans clé d'image (créées sans image)", () => {
    const onAmbiguous = jest.fn()

    const byCode = indexByImageCode([{ id: '1', imageUrl: null }], onAmbiguous)

    expect(byCode.size).toBe(0)
    expect(onAmbiguous).not.toHaveBeenCalled()
  })

  it('ignore et signale quand deux lignes partagent le même code', () => {
    const rows = [
      { id: '1', imageUrl: 'cards/humans/HUM-001.png' },
      { id: '2', imageUrl: 'staging/cards/humans/HUM-001.png' },
      { id: '3', imageUrl: 'cards/humans/HUM-002.png' },
    ]
    const onAmbiguous = jest.fn()

    const byCode = indexByImageCode(rows, onAmbiguous)

    expect(byCode.has('HUM-001')).toBe(false)
    expect(byCode.get('HUM-002')?.id).toBe('3')
    expect(onAmbiguous).toHaveBeenCalledTimes(1)
    const [message] = onAmbiguous.mock.calls[0] as [string]
    expect(message).toContain('HUM-001')
  })
})
