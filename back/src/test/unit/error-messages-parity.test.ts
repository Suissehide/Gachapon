import { describe, expect, it } from '@jest/globals'

import {
  errorMessage,
  type ErrorMessageKey,
} from '../../main/infra/i18n/error-messages'
import { EN_MESSAGES } from '../../main/infra/i18n/error-messages/en'
import { FR_MESSAGES } from '../../main/infra/i18n/error-messages/fr'
import { runWithLocale } from '../../main/infra/i18n/locale-context'

/**
 * Liste des noms de variables `{{nom}}` d'un message, sans doublons.
 * Sert à comparer le gabarit d'interpolation entre les deux langues : une
 * traduction qui oublie un `{{max}}` produit un message amputé au rendu,
 * et rien d'autre ne le signale.
 */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{\{(\w+)\}\}/g)]
    .map((m) => m[1] as string)
    .sort()
}

describe('catalogue des messages d’erreur', () => {
  it('porte exactement les mêmes clés dans les deux langues', () => {
    expect(Object.keys(FR_MESSAGES).sort()).toEqual(
      Object.keys(EN_MESSAGES).sort(),
    )
  })

  it('n’a aucun message vide côté français', () => {
    for (const value of Object.values(FR_MESSAGES)) {
      expect(value.trim().length).toBeGreaterThan(0)
    }
  })

  it('n’a aucun message vide côté anglais', () => {
    for (const value of Object.values(EN_MESSAGES)) {
      expect(value.trim().length).toBeGreaterThan(0)
    }
  })

  it('interpole les mêmes variables des deux côtés pour chaque clé', () => {
    for (const key of Object.keys(FR_MESSAGES) as ErrorMessageKey[]) {
      expect(placeholders(EN_MESSAGES[key])).toEqual(
        placeholders(FR_MESSAGES[key]),
      )
    }
  })

  it('rend le message dans la locale courante', () => {
    expect(runWithLocale('FR', () => errorMessage('user.notFound'))).toBe(
      FR_MESSAGES['user.notFound'],
    )
    expect(runWithLocale('EN', () => errorMessage('user.notFound'))).toBe(
      EN_MESSAGES['user.notFound'],
    )
  })

  it('interpole les variables', () => {
    const rendered = runWithLocale('EN', () =>
      errorMessage('team.maxTeamsPerUser', { max: 3 }),
    )
    expect(rendered).toContain('3')
    expect(rendered).not.toContain('{{')
  })

  it('laisse les placeholders visibles si une variable manque', () => {
    const rendered = runWithLocale('EN', () =>
      errorMessage('team.maxTeamsPerUser'),
    )
    expect(rendered).toContain('{{max}}')
  })
})
