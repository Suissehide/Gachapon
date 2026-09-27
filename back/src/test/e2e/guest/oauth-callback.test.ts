import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'

import { encodeLinkCookie } from '../../../main/domain/auth/oauth-link-cookie'
import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest } from '../../helpers/guest'

type GoogleProfile = { id: string; email: string; verified_email: boolean }

/**
 * Callbacks OAuth de bout en bout : seul l'aller-retour HTTP vers Google est
 * simulé (`fetch`), tout le reste (cookies signés, `state`, domaine, base)
 * est réel.
 */
describe('callbacks OAuth', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()
  const prisma = () => app.iocContainer.postgresOrm.prisma
  const realFetch = globalThis.fetch

  const mockGoogle = (profile: GoogleProfile) => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url.startsWith('https://oauth2.googleapis.com/token')) {
          return Response.json({ access_token: 'fake-access-token' })
        }
        if (url.startsWith('https://www.googleapis.com/oauth2/v2/userinfo')) {
          return Response.json({ ...profile, name: `Test User ${suffix}` })
        }
        return realFetch(input, init)
      })
  }

  const googleCallback = (state: string, extraCookies: string[] = []) =>
    app.inject({
      method: 'GET',
      url: `/auth/oauth/google/callback?code=fake-code&state=${state}`,
      headers: { cookie: [`oauth_state=${state}`, ...extraCookies].join('; ') },
    })

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })
  afterAll(async () => {
    await app.close()
  })

  describe('connexion normale : email non vérifié chez le fournisseur', () => {
    it('ne crée aucun compte et redirige avec oauth_error=email_unverified', async () => {
      const email = `unverified-new${suffix}@test.com`
      mockGoogle({ id: `unv-new-${suffix}`, email, verified_email: false })
      const res = await googleCallback(`s-unv-new-${suffix}`)
      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toMatch(
        /\/oauth\/success\?oauth_error=email_unverified$/,
      )
      expect(await prisma().user.findUnique({ where: { email } })).toBeNull()
      expect(
        await prisma().oAuthAccount.findFirst({
          where: { providerAccountId: `unv-new-${suffix}` },
        }),
      ).toBeNull()
    })

    it('ne rattache pas un compte existant qui porte cet email', async () => {
      const email = `unverified-owned${suffix}@test.com`
      const owner = await prisma().user.create({
        data: {
          username: `unvowner${suffix}`,
          email,
          locale: 'EN',
          emailVerifiedAt: new Date(),
        },
      })
      mockGoogle({ id: `unv-owned-${suffix}`, email, verified_email: false })
      const res = await googleCallback(`s-unv-owned-${suffix}`)
      expect(res.headers.location).toMatch(/oauth_error=email_unverified$/)
      expect(
        await prisma().oAuthAccount.findFirst({ where: { userId: owner.id } }),
      ).toBeNull()
    })

    it('un compte déjà lié au fournisseur se connecte toujours, sans dépendre de l’email', async () => {
      const user = await prisma().user.create({
        data: {
          username: `alreadylinked${suffix}`,
          email: `alreadylinked${suffix}@test.com`,
          locale: 'EN',
        },
      })
      await prisma().oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: `linked-${suffix}`,
        },
      })
      mockGoogle({
        id: `linked-${suffix}`,
        email: `whatever${suffix}@test.com`,
        verified_email: false,
      })
      const res = await googleCallback(`s-linked-${suffix}`)
      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toMatch(/\/oauth\/success$/)
    })
  })

  it('rattache une inscription par mot de passe non vérifiée : compte vérifié, mot de passe effacé', async () => {
    const email = `pwd-unverified${suffix}@test.com`
    const pending = await prisma().user.create({
      data: {
        username: `pwdunv${suffix}`,
        email,
        locale: 'EN',
        passwordHash: await app.iocContainer.authDomain.hashPassword(
          'Password123!',
        ),
        emailVerificationToken: `tok-${suffix}`,
        emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
      },
    })
    mockGoogle({ id: `pwd-unv-${suffix}`, email, verified_email: true })
    const res = await googleCallback(`s-pwd-unv-${suffix}`)
    expect(res.headers.location).toMatch(/\/oauth\/success$/)
    const after = await prisma().user.findUniqueOrThrow({
      where: { id: pending.id },
    })
    expect(after.emailVerifiedAt).not.toBeNull()
    expect(after.passwordHash).toBeNull()
    expect(after.emailVerificationToken).toBeNull()
    const account = await prisma().oAuthAccount.findFirst({
      where: { providerAccountId: `pwd-unv-${suffix}` },
    })
    expect(account?.userId).toBe(pending.id)
  })

  it('liaison : une erreur autre qu’un conflit redirige vers link_error=failed', async () => {
    const { body } = await createGuest(app)
    // L'invité a été converti entre-temps : `linkGuest` lève `guestOnly`.
    await prisma().user.update({
      where: { id: body.id },
      data: { role: 'USER' },
    })
    const state = `s-failed-${suffix}`
    mockGoogle({
      id: `failed-${suffix}`,
      email: `failed${suffix}@test.com`,
      verified_email: true,
    })
    const res = await googleCallback(state, [
      `oauth_link=${encodeURIComponent(app.signCookie(encodeLinkCookie(body.id, state)))}`,
    ])
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toMatch(
      /\/oauth\/success\?link_error=failed$/,
    )
  })

  describe('cookie oauth_link falsifié', () => {
    it('ignore une valeur non signée : connexion normale, l’invité reste GUEST', async () => {
      const { body } = await createGuest(app)
      const state = `s-unsigned-${suffix}`
      mockGoogle({
        id: `unsigned-${suffix}`,
        email: `unsigned${suffix}@test.com`,
        verified_email: true,
      })
      const res = await googleCallback(state, [
        `oauth_link=${encodeURIComponent(encodeLinkCookie(body.id, state))}`,
      ])
      expect(res.headers.location).toMatch(/\/oauth\/success$/)
      const guest = await prisma().user.findUniqueOrThrow({
        where: { id: body.id },
      })
      expect(guest.role).toBe('GUEST')
      const account = await prisma().oAuthAccount.findFirst({
        where: { providerAccountId: `unsigned-${suffix}` },
      })
      expect(account?.userId).not.toBe(body.id)
    })

    it('ignore une valeur dont la signature ne correspond pas', async () => {
      const victim = await createGuest(app)
      const other = await createGuest(app)
      const state = `s-forged-${suffix}`
      // Signature valide pour `other`, valeur réécrite pour viser `victim`.
      const signed = app.signCookie(encodeLinkCookie(other.body.id, state))
      const forged = signed.replace(other.body.id, victim.body.id)
      mockGoogle({
        id: `forged-${suffix}`,
        email: `forged${suffix}@test.com`,
        verified_email: true,
      })
      const res = await googleCallback(state, [
        `oauth_link=${encodeURIComponent(forged)}`,
      ])
      expect(res.headers.location).toMatch(/\/oauth\/success$/)
      const users = await prisma().user.findMany({
        where: { id: { in: [victim.body.id, other.body.id] } },
      })
      expect(users.every((u) => u.role === 'GUEST')).toBe(true)
    })
  })

  describe('repli access_denied de Discord', () => {
    it('refuse (403) sans state correspondant au cookie oauth_state', async () => {
      const noCookie = await app.inject({
        method: 'GET',
        url: '/auth/oauth/discord/callback?error=access_denied&state=abc',
      })
      expect(noCookie.statusCode).toBe(403)

      const mismatch = await app.inject({
        method: 'GET',
        url: '/auth/oauth/discord/callback?error=access_denied&state=abc',
        headers: { cookie: 'oauth_state=xyz' },
      })
      expect(mismatch.statusCode).toBe(403)

      const noState = await app.inject({
        method: 'GET',
        url: '/auth/oauth/discord/callback?error=access_denied',
        headers: { cookie: 'oauth_state=xyz' },
      })
      expect(noState.statusCode).toBe(403)
    })

    it('reporte la liaison seulement si le cookie oauth_link porte CE state', async () => {
      const { body } = await createGuest(app)
      const state = `s-discord-${suffix}`
      const ok = await app.inject({
        method: 'GET',
        url: `/auth/oauth/discord/callback?error=access_denied&state=${state}`,
        headers: {
          cookie: `oauth_state=${state}; oauth_link=${encodeURIComponent(
            app.signCookie(encodeLinkCookie(body.id, state)),
          )}`,
        },
      })
      expect(ok.statusCode).toBe(302)
      expect(String(ok.headers.location)).toContain('discord.com')
      const okCookies = [ok.headers['set-cookie']].flat().map(String)
      expect(
        okCookies.some((c) => /^oauth_link=[^;]+;/.test(c) && !/^oauth_link=;/.test(c)),
      ).toBe(true)

      const orphan = await app.inject({
        method: 'GET',
        url: `/auth/oauth/discord/callback?error=access_denied&state=${state}`,
        headers: {
          cookie: `oauth_state=${state}; oauth_link=${encodeURIComponent(
            app.signCookie(encodeLinkCookie(body.id, 'another-state')),
          )}`,
        },
      })
      expect(orphan.statusCode).toBe(302)
      const orphanCookies = [orphan.headers['set-cookie']].flat().map(String)
      const link = orphanCookies.find((c) => c.startsWith('oauth_link='))
      expect(link).toMatch(/^oauth_link=;/)
    })
  })
})
