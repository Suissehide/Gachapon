import { randomInt } from 'node:crypto'

import type { FastifyInstance } from 'fastify'

/**
 * Une IPv6 de documentation (2001:db8::/32) dans un /64 tiré au hasard : les
 * compteurs de rate limit (24 h) survivent d'un run à l'autre dans Redis, une
 * IP fixe ferait échouer le 2e run de la journée.
 */
export function randomTestIpv6(): string {
  const h = () => randomInt(0, 0xffff).toString(16)
  return `2001:db8:${h()}:${h()}::${h()}`
}

export async function createGuest(
  app: FastifyInstance,
  ip: string = randomTestIpv6(),
  headers: Record<string, string> = {},
) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/guest',
    headers: { 'x-forwarded-for': ip, ...headers },
  })
  const setCookie = res.headers['set-cookie']
  const cookies = (Array.isArray(setCookie) ? setCookie : [setCookie ?? ''])
    .map((c) => c.split(';')[0])
    .join('; ')
  return { res, cookies, body: res.json() }
}
