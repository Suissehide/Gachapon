import { describe, expect, it } from '@jest/globals'

import {
  JOIN_REQUEST_COOLDOWN_MS,
  JOIN_REQUEST_TTL_MS,
  MAX_PENDING_JOIN_REQUESTS,
  countActivePending,
  isJoinRequestExpired,
  reapplyBlockedUntil,
} from '../../main/domain/recruitment/recruitment-rules'

const NOW = new Date('2026-09-11T12:00:00.000Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

describe('recruitment-rules', () => {
  it('fixe le TTL et le cooldown à 7 jours, et le plafond à 5', () => {
    expect(JOIN_REQUEST_TTL_MS).toBe(7 * 86_400_000)
    expect(JOIN_REQUEST_COOLDOWN_MS).toBe(7 * 86_400_000)
    expect(MAX_PENDING_JOIN_REQUESTS).toBe(5)
  })

  it('ne considère expirée qu une demande PENDING dont la date est passée', () => {
    expect(
      isJoinRequestExpired({ status: 'PENDING', expiresAt: daysAgo(1) }, NOW),
    ).toBe(true)
    expect(
      isJoinRequestExpired({ status: 'PENDING', expiresAt: daysAgo(-1) }, NOW),
    ).toBe(false)
    // Une demande déjà tranchée n expire pas : son statut fait foi.
    expect(
      isJoinRequestExpired({ status: 'DECLINED', expiresAt: daysAgo(30) }, NOW),
    ).toBe(false)
  })

  it('arme le cooldown sur un refus, et sur lui seul', () => {
    expect(
      reapplyBlockedUntil({ status: 'DECLINED', decidedAt: daysAgo(6) }),
    ).toEqual(new Date(daysAgo(6).getTime() + JOIN_REQUEST_COOLDOWN_MS))
    // J-8 : le cooldown est écoulé, la fonction renvoie une date passée.
    expect(
      reapplyBlockedUntil({
        status: 'DECLINED',
        decidedAt: daysAgo(8),
      })!.getTime(),
    ).toBeLessThan(NOW.getTime())
    // Un départ volontaire laisse une ligne ACCEPTED : aucun cooldown.
    expect(
      reapplyBlockedUntil({ status: 'ACCEPTED', decidedAt: daysAgo(1) }),
    ).toBeNull()
    expect(
      reapplyBlockedUntil({ status: 'CANCELLED', decidedAt: daysAgo(1) }),
    ).toBeNull()
    expect(reapplyBlockedUntil(null)).toBeNull()
  })

  it('ne compte dans le plafond que les demandes en attente non expirées', () => {
    const reqs = [
      { status: 'PENDING' as const, expiresAt: daysAgo(-3) },
      { status: 'PENDING' as const, expiresAt: daysAgo(-1) },
      { status: 'PENDING' as const, expiresAt: daysAgo(1) }, // expirée
      { status: 'DECLINED' as const, expiresAt: daysAgo(-3) },
    ]
    expect(countActivePending(reqs, NOW)).toBe(2)
  })
})
