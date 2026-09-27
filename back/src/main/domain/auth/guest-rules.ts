import { isIPv4 } from 'node:net'

const DAY_MS = 24 * 60 * 60 * 1000

/** Date avant laquelle un invité sans activité est purgé. */
export function guestPurgeCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS)
}

/**
 * Clé du rate limit de création d'invité. Un FAI attribue couramment un /64
 * entier à un seul foyer : compter par adresse IPv6 laisserait tourner des
 * milliards d'adresses pour contourner la limite. On compte donc par /64.
 */
export function rateLimitKeyForIp(ip: string): string {
  const bare = ip.split('%')[0]?.toLowerCase() ?? ip
  if (isIPv4(bare)) {
    return bare
  }
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(bare)
  if (mapped?.[1]) {
    return mapped[1]
  }
  const [head = '', tail] = bare.split('::')
  const headGroups = head === '' ? [] : head.split(':')
  const tailGroups = tail === undefined || tail === '' ? [] : tail.split(':')
  const fill =
    tail === undefined
      ? []
      : Array(8 - headGroups.length - tailGroups.length).fill('0')
  const groups = [...headGroups, ...fill, ...tailGroups].map((g) =>
    g.replace(/^0+(?=.)/, ''),
  )
  return `${groups.slice(0, 4).join(':')}::/64`
}
