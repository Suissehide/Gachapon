import { describe, expect, it } from '@jest/globals'

import {
  decodeLinkCookie,
  encodeLinkCookie,
  resolveLinkUserId,
} from '../../main/domain/auth/oauth-link-cookie'

describe('oauth-link-cookie', () => {
  it('encode puis décode le même userId et state', () => {
    const raw = encodeLinkCookie('user-123', 'state-abc')
    expect(decodeLinkCookie({ valid: true, value: raw })).toEqual({
      userId: 'user-123',
      state: 'state-abc',
    })
  })

  it('resolveLinkUserId accepte un state qui correspond', () => {
    const raw = encodeLinkCookie('user-123', 'state-abc')
    expect(resolveLinkUserId({ valid: true, value: raw }, 'state-abc')).toBe(
      'user-123',
    )
  })

  it('resolveLinkUserId ignore un state qui ne correspond pas (flux abandonné puis connexion normale)', () => {
    const raw = encodeLinkCookie('user-123', 'state-old')
    expect(
      resolveLinkUserId({ valid: true, value: raw }, 'state-new'),
    ).toBeUndefined()
  })

  it('resolveLinkUserId ignore une signature invalide', () => {
    expect(
      resolveLinkUserId({ valid: false, value: null }, 'state-abc'),
    ).toBeUndefined()
  })

  it('resolveLinkUserId ignore l’absence de cookie', () => {
    expect(resolveLinkUserId(null, 'state-abc')).toBeUndefined()
  })

  it('decodeLinkCookie ignore une valeur sans séparateur', () => {
    expect(
      decodeLinkCookie({ valid: true, value: 'garbage' }),
    ).toBeUndefined()
  })

  it('decodeLinkCookie ignore une valeur vide ou une signature invalide', () => {
    expect(decodeLinkCookie({ valid: true, value: '' })).toBeUndefined()
    expect(decodeLinkCookie({ valid: false, value: null })).toBeUndefined()
    expect(decodeLinkCookie(null)).toBeUndefined()
  })
})
