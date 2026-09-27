import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest } from '../../helpers/guest'

describe('liaison OAuth d’un invité', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('rattache le compte Google à l’invité et le passe en USER', async () => {
    const { body } = await createGuest(app)
    const { oauthDomain, postgresOrm } = app.iocContainer
    const user = await oauthDomain.linkGuest(body.id, 'google', {
      id: `g-${suffix}`,
      email: `link${suffix}@test.com`,
    })
    expect(user.role).toBe('USER')
    expect(user.email).toBe(`link${suffix}@test.com`)
    const account = await postgresOrm.prisma.oAuthAccount.findFirst({
      where: { providerAccountId: `g-${suffix}` },
    })
    expect(account?.userId).toBe(body.id)
  })

  it('refuse si l’email du fournisseur appartient déjà à un compte VÉRIFIÉ', async () => {
    const { oauthDomain, postgresOrm } = app.iocContainer
    await postgresOrm.prisma.user.create({
      data: {
        username: `owner${suffix}`,
        email: `owned${suffix}@test.com`,
        locale: 'EN',
        emailVerifiedAt: new Date(),
      },
    })
    const { body } = await createGuest(app)
    await expect(
      oauthDomain.linkGuest(body.id, 'discord', {
        id: `d-${suffix}`,
        email: `owned${suffix}@test.com`,
      }),
    ).rejects.toMatchObject({ name: 'OAuthLinkConflictError' })
    const guest = await postgresOrm.prisma.user.findUniqueOrThrow({
      where: { id: body.id },
    })
    expect(guest.role).toBe('GUEST')
  })

  it('refuse si le compte OAuth est déjà lié à quelqu’un', async () => {
    const { oauthDomain } = app.iocContainer
    const first = await createGuest(app)
    await oauthDomain.linkGuest(first.body.id, 'discord', {
      id: `dup-${suffix}`,
      email: `dup1${suffix}@test.com`,
    })
    const second = await createGuest(app)
    await expect(
      oauthDomain.linkGuest(second.body.id, 'discord', {
        id: `dup-${suffix}`,
        email: `dup2${suffix}@test.com`,
      }),
    ).rejects.toMatchObject({ name: 'OAuthLinkConflictError' })
  })

  it('rattache l’invité si l’email appartenait à une inscription par mot de passe jamais vérifiée et expirée', async () => {
    const { oauthDomain, postgresOrm, authDomain } = app.iocContainer
    const staleEmail = `stale${suffix}@test.com`
    const stale = await postgresOrm.prisma.user.create({
      data: {
        username: `stale${suffix}`,
        email: staleEmail,
        locale: 'EN',
        passwordHash: await authDomain.hashPassword('password123'),
        emailVerificationToken: 'stale-token',
        emailVerificationTokenExpiresAt: new Date(Date.now() - 1000),
      },
    })
    const { body } = await createGuest(app)
    const user = await oauthDomain.linkGuest(body.id, 'google', {
      id: `stale-oauth-${suffix}`,
      email: staleEmail,
    })
    expect(user.role).toBe('USER')
    expect(user.email).toBe(staleEmail)
    const removed = await postgresOrm.prisma.user.findUnique({
      where: { id: stale.id },
    })
    expect(removed).toBeNull()
  })

  it('GET /auth/oauth/google/authorize?mode=link exige une session invitée', async () => {
    const anon = await app.inject({
      method: 'GET',
      url: '/auth/oauth/google/authorize?mode=link',
    })
    expect(anon.statusCode).toBe(401)

    const { cookies } = await createGuest(app)
    const ok = await app.inject({
      method: 'GET',
      url: '/auth/oauth/google/authorize?mode=link',
      headers: { cookie: cookies },
    })
    expect(ok.statusCode).toBe(302)
    expect(String(ok.headers['set-cookie'])).toContain('oauth_link=')
  })
})
