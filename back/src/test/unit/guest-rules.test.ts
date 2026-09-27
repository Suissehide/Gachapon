import { describe, expect, it } from '@jest/globals'

import { rateLimitKeyForIp } from '../../main/domain/auth/guest-rules'

describe('rateLimitKeyForIp', () => {
  it('garde une IPv4 telle quelle', () => {
    expect(rateLimitKeyForIp('203.0.113.7')).toBe('203.0.113.7')
  })

  it('ramène une IPv4 mappée en IPv6 à l’IPv4', () => {
    expect(rateLimitKeyForIp('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('regroupe une IPv6 par /64', () => {
    expect(rateLimitKeyForIp('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe(
      '2001:db8:1:2::/64',
    )
    expect(rateLimitKeyForIp('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64')
  })

  it('développe la notation compressée avant de couper', () => {
    expect(rateLimitKeyForIp('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(rateLimitKeyForIp('::1')).toBe('0:0:0:0::/64')
  })

  it('normalise la casse et ignore l’identifiant de zone', () => {
    expect(rateLimitKeyForIp('2001:DB8:1:2::1%eth0')).toBe('2001:db8:1:2::/64')
  })
})
