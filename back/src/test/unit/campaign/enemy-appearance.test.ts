import { resolveEnemyImageUrl } from '../../../main/domain/campaign/enemy-appearance'

const fakePublicUrl = (key: string) => `https://cdn.test/gachapon/${key}`

describe('resolveEnemyImageUrl', () => {
  it('préfixe cards/ et suffixe .png autour de l\'apparence', () => {
    expect(resolveEnemyImageUrl('monsters/slime/SLI-001', fakePublicUrl)).toBe(
      'https://cdn.test/gachapon/cards/monsters/slime/SLI-001.png',
    )
  })

  it('résout aussi une apparence de boss', () => {
    expect(resolveEnemyImageUrl('monsters/boss/BOSS-001', fakePublicUrl)).toBe(
      'https://cdn.test/gachapon/cards/monsters/boss/BOSS-001.png',
    )
  })

  it('retourne null sans apparence', () => {
    expect(resolveEnemyImageUrl(null, fakePublicUrl)).toBeNull()
    expect(resolveEnemyImageUrl(undefined, fakePublicUrl)).toBeNull()
    expect(resolveEnemyImageUrl('', fakePublicUrl)).toBeNull()
  })
})
