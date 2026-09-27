import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest, randomTestIpv6 } from '../../helpers/guest'

describe('conversion d’un invité par email', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()
  const prisma = () => app.iocContainer.postgresOrm.prisma

  // IP aléatoire par appel : la route est limitée à 5 / 15 min par IP, et ce
  // fichier l'appelle 6 fois.
  const upgrade = (cookies: string, email: string) =>
    app.inject({
      method: 'POST',
      url: '/auth/guest/upgrade',
      headers: { cookie: cookies, 'x-forwarded-for': randomTestIpv6() },
      payload: { email, password: 'Password123!' },
    })

  beforeAll(async () => {
    app = await buildTestApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('garde le compte GUEST jusqu’au clic, puis le convertit en USER avec sa progression', async () => {
    const { cookies, body } = await createGuest(app)
    await prisma().user.update({ where: { id: body.id }, data: { dust: 777 } })

    const email = `upg${suffix}@test.com`
    const res = await upgrade(cookies, email)
    expect(res.statusCode).toBe(202)
    expect(res.json().pendingEmail).toBe(email)

    const pending = await prisma().user.findUniqueOrThrow({
      where: { id: body.id },
    })
    expect(pending.role).toBe('GUEST')
    expect(pending.email).toBeNull()
    expect(pending.pendingEmail).toBe(email)

    // Le login par mot de passe reste impossible avant vérification.
    const early = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    expect(early.statusCode).toBe(401)

    const verify = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token: pending.emailVerificationToken },
    })
    expect(verify.statusCode).toBe(200)

    const done = await prisma().user.findUniqueOrThrow({
      where: { id: body.id },
    })
    expect(done.role).toBe('USER')
    expect(done.email).toBe(email)
    expect(done.pendingEmail).toBeNull()
    expect(done.emailVerifiedAt).not.toBeNull()
    expect(done.dust).toBe(777)

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    expect(login.statusCode).toBe(200)
  })

  it('409 EMAIL_TAKEN si l’email appartient déjà à un compte VÉRIFIÉ', async () => {
    const taken = `taken${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tk${suffix}`, email: taken, password: 'Password123!' },
    })
    // `register` seul laisse le compte non vérifié (jeton valide 24h) : ce
    // cas est couvert par le test « inscription non vérifiée en cours »
    // plus bas, avec un 409 différent (pas EMAIL_TAKEN). Ici on simule un
    // compte déjà VÉRIFIÉ, seul cas qui bloque définitivement.
    await prisma().user.update({
      where: { email: taken },
      data: { emailVerifiedAt: new Date() },
    })
    const { cookies } = await createGuest(app)
    const res = await upgrade(cookies, taken)
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('EMAIL_TAKEN')
  })

  it('409 au clic si l’email a été pris entre-temps, et efface pendingEmail', async () => {
    const { cookies, body } = await createGuest(app)
    const email = `race${suffix}@test.com`
    expect((await upgrade(cookies, email)).statusCode).toBe(202)

    // Compte VÉRIFIÉ : seule une adresse définitivement prise doit bloquer
    // la conversion et effacer pendingEmail (voir les deux tests suivants
    // pour le cas d'une inscription non vérifiée).
    await prisma().user.create({
      data: {
        username: `race${suffix}`,
        email,
        locale: 'EN',
        emailVerifiedAt: new Date(),
      },
    })

    const { emailVerificationToken } = await prisma().user.findUniqueOrThrow({
      where: { id: body.id },
    })
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token: emailVerificationToken },
    })
    expect(verify.statusCode).toBe(409)
    const after = await prisma().user.findUniqueOrThrow({
      where: { id: body.id },
    })
    expect(after.role).toBe('GUEST')
    expect(after.pendingEmail).toBeNull()
  })

  it('403 pour un compte qui n’est pas invité', async () => {
    const email = `notguest${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `ng${suffix}`, email, password: 'Password123!' },
    })
    await prisma().user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    const cookies = (login.headers['set-cookie'] as string[])
      .map((c) => c.split(';')[0])
      .join('; ')
    expect((await upgrade(cookies, `x${suffix}@test.com`)).statusCode).toBe(403)
  })

  it('une inscription non vérifiée et expirée cède la place à la conversion', async () => {
    const staleEmail = `stale${suffix}@test.com`
    const stale = await prisma().user.create({
      data: {
        username: `stale${suffix}`,
        email: staleEmail,
        locale: 'EN',
        // `passwordHash` posé : c'est ce qui distingue une inscription par
        // mot de passe jamais confirmée (éphémère, `classifyEmailOwner` la
        // classe `stale`) d'un compte né par OAuth (`passwordHash === null`,
        // jamais éphémère même sans `emailVerifiedAt` — revue de la tâche
        // 6). Aucun vrai chemin de création n'écrit un jeton de vérification
        // sans poser `passwordHash` en même temps (voir `AuthDomain#register`
        // / `GuestDomain#requestEmailUpgrade`).
        passwordHash: 'irrelevant-never-authenticated-with',
        emailVerificationToken: 'expired-token-stale',
        emailVerificationTokenExpiresAt: new Date(Date.now() - 1000),
      },
    })

    const { cookies, body } = await createGuest(app)
    const res = await upgrade(cookies, staleEmail)
    expect(res.statusCode).toBe(202)

    // La ligne fantôme a été supprimée, pas seulement ignorée.
    const staleAfter = await prisma().user.findUnique({
      where: { id: stale.id },
    })
    expect(staleAfter).toBeNull()

    const pending = await prisma().user.findUniqueOrThrow({
      where: { id: body.id },
    })
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token: pending.emailVerificationToken },
    })
    expect(verify.statusCode).toBe(200)

    const done = await prisma().user.findUniqueOrThrow({
      where: { id: body.id },
    })
    expect(done.role).toBe('USER')
    expect(done.email).toBe(staleEmail)
  })

  it('409 (pas EMAIL_TAKEN) si une inscription non vérifiée est encore en cours pour cet email', async () => {
    const pendingEmail = `pendingsignup${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `ps${suffix}`,
        email: pendingEmail,
        password: 'Password123!',
      },
    })
    const { cookies } = await createGuest(app)
    const res = await upgrade(cookies, pendingEmail)
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBeUndefined()
  })

  it('429 si on renvoie avant 2 minutes', async () => {
    const { cookies } = await createGuest(app)
    expect((await upgrade(cookies, `cd1${suffix}@test.com`)).statusCode).toBe(202)
    expect((await upgrade(cookies, `cd2${suffix}@test.com`)).statusCode).toBe(429)
  })
})
