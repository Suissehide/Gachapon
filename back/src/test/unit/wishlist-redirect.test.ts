import { applyWishlistRedirect } from '../../main/domain/gacha/gacha.domain'

type C = { id: string; rarity: string }
const common1: C = { id: 'c1', rarity: 'COMMON' }
const common2: C = { id: 'c2', rarity: 'COMMON' }
const rare1: C = { id: 'r1', rarity: 'RARE' }
const leg1: C = { id: 'l1', rarity: 'LEGENDARY' }

describe('applyWishlistRedirect', () => {
  it('redirige vers un vœu de MÊME rareté quand le jet passe', () => {
    const out = applyWishlistRedirect(common1, [common2], 40, () => 0.1)
    expect(out).toBe(common2)
  })

  it('ne redirige pas quand le jet échoue', () => {
    const out = applyWishlistRedirect(common1, [common2], 40, () => 0.9)
    expect(out).toBe(common1)
  })

  // L'invariant qui rend l'effet sûr : la rareté tirée ne bouge JAMAIS. Sans
  // lui, souhaiter une légendaire ferait fuiter du légendaire à 40 % le tirage
  // au lieu de 0,2 %.
  it('ne redirige jamais vers une autre rareté', () => {
    for (const roll of [0, 0.01, 0.5, 0.99]) {
      expect(applyWishlistRedirect(common1, [rare1, leg1], 100, () => roll)).toBe(
        common1,
      )
    }
  })

  it('est neutre sans vœu, sans compétence, ou si le vœu est déjà la carte tirée', () => {
    expect(applyWishlistRedirect(common1, [], 100, () => 0)).toBe(common1)
    expect(applyWishlistRedirect(common1, [common2], 0, () => 0)).toBe(common1)
    expect(applyWishlistRedirect(common1, [common1], 100, () => 0)).toBe(common1)
  })

  it('répartit entre plusieurs vœux de la même rareté', () => {
    const wished = [common2, { id: 'c3', rarity: 'COMMON' }]
    const seen = new Set<string>()
    // Le rng sert deux fois : jet de chance, puis choix du vœu. À 100 % le jet
    // passe toujours, et 0.0 / 0.6 tombent sur des index différents.
    for (const roll of [0.0, 0.6]) {
      seen.add(applyWishlistRedirect(common1, wished, 100, () => roll).id)
    }
    expect(seen.size).toBe(2)
  })
})
