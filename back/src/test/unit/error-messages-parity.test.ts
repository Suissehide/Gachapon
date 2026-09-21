import { describe, expect, it } from '@jest/globals'

import { runWithLocale } from '../../main/infra/i18n/locale-context'
import { errorMessage } from '../../main/interfaces/http/fastify/errors/messages'
import { EN_MESSAGES } from '../../main/interfaces/http/fastify/errors/messages/en'
import { FR_MESSAGES } from '../../main/interfaces/http/fastify/errors/messages/fr'

describe('catalogue des messages d’erreur', () => {
  it('porte exactement les mêmes clés dans les deux langues', () => {
    expect(Object.keys(FR_MESSAGES).sort()).toEqual(
      Object.keys(EN_MESSAGES).sort(),
    )
  })

  it('n’a aucun message vide', () => {
    for (const [key, value] of Object.entries({
      ...FR_MESSAGES,
      ...EN_MESSAGES,
    })) {
      expect(value.trim().length).toBeGreaterThan(0)
      expect(key.length).toBeGreaterThan(0)
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
