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

  it('409 EMAIL_TAKEN si l’email appartient déjà à un compte', async () => {
    const taken = `taken${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tk${suffix}`, email: taken, password: 'Password123!' },
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

    await prisma().user.create({
      data: { username: `race${suffix}`, email, locale: 'EN' },
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

  it('429 si on renvoie avant 2 minutes', async () => {
    const { cookies } = await createGuest(app)
    expect((await upgrade(cookies, `cd1${suffix}@test.com`)).statusCode).toBe(202)
    expect((await upgrade(cookies, `cd2${suffix}@test.com`)).statusCode).toBe(429)
  })
})
