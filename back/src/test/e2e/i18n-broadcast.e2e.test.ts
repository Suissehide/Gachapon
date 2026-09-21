import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import type { WebSocket } from '@fastify/websocket'

import type { PostgresPrismaClient } from '../../main/infra/orm/postgres-client'
import type { WsManager } from '../../main/interfaces/ws/ws-manager'
import { buildTestApp } from '../helpers/build-test-app'

/**
 * Tâche 12 : la diffusion `feed:pull` (`wsManager.broadcast`) part vers
 * TOUTES les connexions ouvertes, quelle que soit la locale de chacune —
 * contrairement à `wsManager.notify`, qui ne parle qu'au tireur. Avant
 * correction, `cardName`/`setName` étaient résolus dans la locale DE LA
 * REQUÊTE DE TIRAGE (celle du tireur) et diffusés tels quels : un tireur
 * francophone imposait des noms français à un spectateur anglophone.
 *
 * Ce test tire sous `Accept-Language: fr` et vérifie que le message diffusé
 * porte malgré tout les deux langues, distinctes. Isolation du pull sur le
 * modèle de `gacha/pull.test.ts` (« un doublon ne crédite plus de poussière
 * auto ») : un seul set actif, une seule carte dedans, pour que le tirage
 * tombe à coup sûr sur la carte de test.
 */
describe('frontière WebSocket bilingue (feed:pull)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: PostgresPrismaClient
  let wsManager: WsManager
  let cookies: string
  let userId: string
  let setId: string
  let otherActiveSetIds: string[]

  const suffix = Date.now()
  const email = `i18nbroadcast${suffix}@test.com`
  const username = `i18nbroadcast${suffix}`
  const password = 'Password123!'
  const bystanderId = `bystander-i18n-broadcast-${suffix}`

  const cardNameFr = `CarteFR${suffix}`
  const cardNameEn = `CardEN${suffix}`
  const setNameFr = `SetFR${suffix}`
  const setNameEn = `SetEN${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = app.iocContainer.postgresOrm.prisma
    wsManager = app.iocContainer.wsManager

    // Isole le tirage : désactive tous les sets actifs existants pour que
    // seul le set de test reste tirable, comme `gacha/pull.test.ts`.
    const otherActive = await prisma.cardSet.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    otherActiveSetIds = otherActive.map((s) => s.id)
    await prisma.cardSet.updateMany({
      where: { id: { in: otherActiveSetIds } },
      data: { isActive: false },
    })

    const set = await prisma.cardSet.create({
      data: { nameFr: setNameFr, nameEn: setNameEn, isActive: true },
    })
    setId = set.id
    await prisma.card.create({
      data: {
        nameFr: cardNameFr,
        nameEn: cardNameEn,
        rarity: 'COMMON',
        dropWeight: 10,
        setId: set.id,
      },
    })

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(regRes.statusCode).toBe(201)

    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), tokens: 3, lastTokenAt: new Date() },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await prisma.cardSet.updateMany({
      where: { id: { in: otherActiveSetIds } },
      data: { isActive: true },
    })
    await prisma.gachaPull.deleteMany({ where: { userId } })
    await prisma.userCard.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { setId } })
    await prisma.cardSet.delete({ where: { id: setId } })
    await prisma.user.delete({ where: { id: userId } })
    await app.close()
  })

  /** Branche un faux socket et renvoie les messages `feed:pull` reçus. */
  function listenForBroadcast() {
    const received: Record<string, unknown>[] = []
    const fakeWs = {
      readyState: 1,
      send: (data: string) => received.push(JSON.parse(data)),
      on: () => {},
      // Mock minimal : seuls `readyState`/`send`/`on` sont lus par
      // `WsManager`. Le caster en `WebSocket` complet serait un mensonge de
      // type ; `unknown` en intermédiaire documente que c'est délibéré.
    } as unknown as WebSocket
    wsManager.register(bystanderId, fakeWs)
    return received
  }

  it('diffuse cardNameFr/cardNameEn et setNameFr/setNameEn distincts, même sous Accept-Language: fr', async () => {
    const received = listenForBroadcast()

    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies, 'accept-language': 'fr-FR,fr;q=0.9' },
    })
    expect(res.statusCode).toBe(201)

    const feedEvents = received.filter((e) => e.type === 'feed:pull')
    expect(feedEvents).toHaveLength(1)
    const event = feedEvents[0]!

    expect(event.cardNameFr).toBe(cardNameFr)
    expect(event.cardNameEn).toBe(cardNameEn)
    expect(event.cardNameFr).not.toBe(event.cardNameEn)

    expect(event.setNameFr).toBe(setNameFr)
    expect(event.setNameEn).toBe(setNameEn)
    expect(event.setNameFr).not.toBe(event.setNameEn)

    // Le front actuel continue de fonctionner : `cardName`/`setName`
    // restent remplis, dans la locale par défaut (EN) — voir
    // `localized-broadcast.ts`.
    expect(event.cardName).toBe(cardNameEn)
    expect(event.setName).toBe(setNameEn)
  })
})
