import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from '@jest/globals'

import {
  IMPORTED_CARD_NAMES,
  IMPORTED_CARD_SETS,
} from '../../main/domain/content/imported-cards.definitions'

/**
 * Garde-fou des traductions des 17 familles importées par
 * `scripts/import-cards/import-cards.mjs`.
 *
 * Deux fautes visées :
 *  - la dérive : `cards-data.json` ou `families.json` régénérés (depuis le
 *    classeur) sans que les définitions suivent — une carte nouvelle ou
 *    renommée partirait alors en production avec le français recopié ;
 *  - l'épithète oubliée : « un prénom reste tel quel, son épithète se
 *    traduit ». Contrairement aux Humains (liste nommée une à une dans
 *    `content-translations.test.ts`), ~390 prénoms nus rendraient une liste
 *    illisible : la règle est donc structurelle — un nom identique dans les
 *    deux langues doit tenir en un seul mot (pas d'épithète possible), et
 *    l'anglais ne doit porter aucun article français.
 */

// Jest tourne en ESM réel (voir package.json test:unit) : pas de __dirname.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

// cards-data.json est gitignoré (données générées) : absent en CI, la partie
// cartes se saute alors, comme cards-data-consistency.test.ts.
const CARDS_DATA_PATH = join(ROOT, 'scripts/import-cards/cards-data.json')
type CardRow = { id: string; name: string }
const importedCards: CardRow[] | null = existsSync(CARDS_DATA_PATH)
  ? Object.entries(
      JSON.parse(readFileSync(CARDS_DATA_PATH, 'utf8')) as Record<string, CardRow[]>,
    )
      .filter(([sheet]) => sheet !== 'Humains')
      .flatMap(([, cards]) => cards)
  : null

const families = JSON.parse(
  readFileSync(join(ROOT, 'scripts/families.json'), 'utf8'),
) as Record<string, { set?: { name: string; description: string } }>
const importedFamilies = Object.entries(families).filter(
  ([slug, family]) => !slug.startsWith('_') && family.set && slug !== 'humans',
)

// « le Sage » (article suivi d'une espace) comme « l'Archère » (élidé, collé).
const FRENCH_ARTICLE = /(^|[\s,])((le|la|les|des|du|de|aux|au)(\s|$)|[ld]['’])/i

describe('traductions des cartes importées', () => {
  const itWithCardsData = importedCards === null ? it.skip : it
  itWithCardsData('couvre exactement les cartes de cards-data.json, même nom français', () => {
    const expected = Object.fromEntries((importedCards ?? []).map((c) => [c.id, c.name]))
    const actual = Object.fromEntries(
      Object.entries(IMPORTED_CARD_NAMES).map(([id, c]) => [id, c.nameFr]),
    )
    expect(actual).toEqual(expected)
  })

  it('donne un anglais non vide à chaque carte', () => {
    const empty = Object.entries(IMPORTED_CARD_NAMES).filter(
      ([, c]) => c.nameEn.trim() === '',
    )
    expect(empty.map(([id]) => id)).toEqual([])
  })

  it('ne recopie le français que pour un prénom nu', () => {
    const copied = Object.entries(IMPORTED_CARD_NAMES).filter(
      ([, c]) => c.nameFr === c.nameEn && /\s/.test(c.nameFr),
    )
    expect(copied.map(([id]) => id)).toEqual([])
  })

  it('ne laisse aucun article français dans l’anglais', () => {
    const french = Object.entries(IMPORTED_CARD_NAMES).filter(([, c]) =>
      FRENCH_ARTICLE.test(c.nameEn),
    )
    expect(french.map(([id, c]) => `${id} ${c.nameEn}`)).toEqual([])
  })
})

describe('traductions des sets importés', () => {
  it('couvre exactement les familles de families.json, mêmes textes français', () => {
    const expected = importedFamilies.map(([folder, family]) => ({
      folder,
      nameFr: family.set?.name,
      descriptionFr: family.set?.description,
    }))
    const actual = IMPORTED_CARD_SETS.map((s) => ({
      folder: s.folder,
      nameFr: s.nameFr,
      descriptionFr: s.descriptionFr,
    }))
    expect(actual).toEqual(expected)
  })

  it('traduit chaque description (les noms peuvent coïncider : Orcs, Dragons…)', () => {
    const copied = IMPORTED_CARD_SETS.filter(
      (s) => s.descriptionEn.trim() === '' || s.descriptionFr === s.descriptionEn,
    )
    expect(copied.map((s) => s.folder)).toEqual([])
  })
})
