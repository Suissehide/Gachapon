import { describe, expect, it } from '@jest/globals'

import { classifyEmailOwner } from '../../main/domain/auth/email-ownership'

describe('classifyEmailOwner', () => {
  it('free quand personne ne possède l’email', () => {
    expect(classifyEmailOwner(null)).toBe('free')
  })

  it('verified quand l’email est confirmé', () => {
    expect(
      classifyEmailOwner({
        emailVerifiedAt: new Date(),
        passwordHash: 'hash',
        emailVerificationTokenExpiresAt: null,
      }),
    ).toBe('verified')
  })

  it('verified pour un compte OAuth-only jamais vérifié (passwordHash null)', () => {
    expect(
      classifyEmailOwner({
        emailVerifiedAt: null,
        passwordHash: null,
        emailVerificationTokenExpiresAt: null,
      }),
    ).toBe('verified')
  })

  it('pending quand le jeton de vérification n’a pas expiré', () => {
    expect(
      classifyEmailOwner({
        emailVerifiedAt: null,
        passwordHash: 'hash',
        emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    ).toBe('pending')
  })

  it('stale quand le jeton a expiré', () => {
    expect(
      classifyEmailOwner({
        emailVerifiedAt: null,
        passwordHash: 'hash',
        emailVerificationTokenExpiresAt: new Date(Date.now() - 60_000),
      }),
    ).toBe('stale')
  })

  it('stale quand il n’y a jamais eu de jeton', () => {
    expect(
      classifyEmailOwner({
        emailVerifiedAt: null,
        passwordHash: 'hash',
        emailVerificationTokenExpiresAt: null,
      }),
    ).toBe('stale')
  })
})
