import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest } from '../../helpers/guest'

/**
 * Revue finale : `PATCH /admin/users/:id/role` passait un invité en USER ou
 * SUPER_ADMIN sans email ni mot de passe, contournant la conversion.
 */
describe('PATCH /admin/users/:id/role sur un invité', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookie: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
    const admin = await app.iocContainer.postgresOrm.prisma.user.create({
      data: {
        username: `roleadmin${suffix}`,
        email: `roleadmin${suffix}@test.com`,
        locale: 'EN',
        role: 'SUPER_ADMIN',
        emailVerifiedAt: new Date(),
      },
    })
    const { accessToken } =
      await app.iocContainer.authDomain.generateTokenPair(admin)
    adminCookie = `access_token=${accessToken}`
  })
  afterAll(async () => {
    await app.close()
  })

  it('refuse (409) et laisse l’invité GUEST', async () => {
    const { body } = await createGuest(app)
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${body.id}/role`,
      headers: { cookie: adminCookie },
      payload: { role: 'USER' },
    })
    expect(res.statusCode).toBe(409)
    const guest =
      await app.iocContainer.postgresOrm.prisma.user.findUniqueOrThrow({
        where: { id: body.id },
      })
    expect(guest.role).toBe('GUEST')
  })
})
