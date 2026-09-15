import {
  BASE_WISHLIST_SLOTS,
  wishlistSlots,
} from '../../main/domain/wishlist/wishlist.domain'

describe('wishlistSlots', () => {
  it('part de 2 emplacements sans aucun point d’arbre', () => {
    expect(BASE_WISHLIST_SLOTS).toBe(2)
    expect(wishlistSlots(0)).toBe(2)
  })

  it('monte à 5 avec « Collectionneur » maxé', () => {
    expect(wishlistSlots(1)).toBe(3)
    expect(wishlistSlots(2)).toBe(4)
    expect(wishlistSlots(3)).toBe(5)
  })

  // Le plafond ne doit jamais descendre sous la base : un effet négatif
  // (config aberrante, rang retire) ne doit pas verrouiller la wishlist.
  it('ignore un bonus négatif', () => {
    expect(wishlistSlots(-5)).toBe(2)
  })
})
