import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest, randomTestIpv6 } from '../../helpers/guest'

describe('POST /auth/guest', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('crée un invité connecté, sans email, avec un pseudo généré', async () => {
    const { res, cookies } = await createGuest(app, randomTestIpv6(), {
      'accept-language': 'fr-FR',
    })
    expect(res.statusCode).toBe(201)

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookies },
    })
    expect(me.statusCode).toBe(200)
    const body = me.json()
    expect(body.role).toBe('GUEST')
    expect(body.email).toBeNull()
    expect(body.username).toMatch(/^[A-Za-z]+\d{2,4}$/)
    expect(body.tokens).toBeGreaterThan(0)

    const user = await app.iocContainer.postgresOrm.prisma.user.findUnique({
      where: { id: body.id },
    })
    expect(user?.locale).toBe('FR')
  })

  it('refuse une 4e création depuis le même /64 IPv6, pas depuis un autre', async () => {
    const base = randomTestIpv6().replace(/::[0-9a-f]+$/, '')
    for (let i = 1; i <= 3; i++) {
      expect((await createGuest(app, `${base}::${i}`)).res.statusCode).toBe(201)
    }
    // Autre adresse du MÊME /64 : bloquée.
    expect((await createGuest(app, `${base}::99`)).res.statusCode).toBe(429)
    // Autre /64 : libre.
    expect((await createGuest(app)).res.statusCode).toBe(201)
  })

  it('refuse de créer un invité par-dessus une session valide', async () => {
    const { cookies } = await createGuest(app)
    const again = await app.inject({
      method: 'POST',
      url: '/auth/guest',
      headers: { cookie: cookies, 'x-forwarded-for': randomTestIpv6() },
    })
    expect(again.statusCode).toBe(409)
  })

  it('enregistre une activité GUEST_SIGNUP', async () => {
    const { body } = await createGuest(app)
    // record() est en fire-and-forget : on laisse la promesse se résoudre.
    await new Promise((r) => setTimeout(r, 200))
    const event =
      await app.iocContainer.postgresOrm.prisma.activityEvent.findFirst({
        where: { userId: body.id, type: 'GUEST_SIGNUP' },
      })
    expect(event).not.toBeNull()
  })
})
