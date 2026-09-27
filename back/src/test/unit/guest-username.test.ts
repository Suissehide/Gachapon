import { describe, expect, it } from '@jest/globals'

import {
  GUEST_ADJECTIVES_EN,
  GUEST_ADJECTIVES_FR,
  GUEST_CREATURES,
  generateGuestUsername,
} from '../../main/domain/auth/guest-username'

// Suite déterministe : chaque appel rend la valeur suivante.
const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length] ?? 0
}

describe('generateGuestUsername', () => {
  it('compose créature + adjectif + 2 chiffres en français', () => {
    const name = generateGuestUsername('FR', 2, seq(0, 0, 0.42))
    expect(name).toBe(`${GUEST_CREATURES[0]}${GUEST_ADJECTIVES_FR[0]}42`)
  })

  it('met l\'adjectif en tête en anglais', () => {
    const name = generateGuestUsername('EN', 2, seq(0, 0, 0.07))
    expect(name).toBe(`${GUEST_ADJECTIVES_EN[0]}${GUEST_CREATURES[0]}07`)
  })

  it('complète à 4 chiffres quand on le demande', () => {
    expect(generateGuestUsername('EN', 4, seq(0, 0, 0.0042))).toMatch(
      /\d{4}$/,
    )
  })

  it('reste en ASCII alphanumérique et sous 30 caractères pour toutes les combinaisons', () => {
    for (const c of GUEST_CREATURES) {
      for (const a of [...GUEST_ADJECTIVES_FR, ...GUEST_ADJECTIVES_EN]) {
        const longest = `${c}${a}9999`
        expect(longest).toMatch(/^[A-Za-z0-9]+$/)
        expect(longest.length).toBeLessThanOrEqual(30)
      }
    }
  })

  it('ne sort jamais d\'index hors liste avec random() proche de 1', () => {
    const name = generateGuestUsername('FR', 2, () => 0.999999)
    expect(name).toMatch(/^[A-Za-z]+\d{2}$/)
  })
})
