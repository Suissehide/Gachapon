import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import type { PostgresPrismaClient } from '../../../main/infra/orm/postgres-client'
import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /auth/register', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: PostgresPrismaClient
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = app.iocContainer.postgresOrm.prisma
  })
  afterAll(async () => {
    await app.close()
  })

  it('returns 201 with verification email sent message', async () => {
    const email = `test${suffix}@example.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `testuser${suffix}`,
        email,
        password: 'Password123!',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('message', 'VERIFICATION_EMAIL_SENT')
    expect(body).toHaveProperty('email', email)
  })

  it('returns 409 if email already taken', async () => {
    const dupEmail = `dup${suffix}@example.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `other${suffix}`,
        email: dupEmail,
        password: 'Password123!',
      },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `other2${suffix}`,
        email: dupEmail,
        password: 'Password123!',
      },
    })
    expect(res.statusCode).toBe(409)
  })

  /**
   * Régression du round 1 de revue de la tâche 7 : `User.locale` a pour
   * défaut Prisma `EN`, et rien avant cette correction ne l'écrivait à
   * l'inscription — tout compte naissait et restait en anglais, quelle que
   * soit la langue de la page d'inscription, jusqu'à ce que le lot 2
   * (changement de langue depuis le profil) existe. `register()` pose
   * désormais `locale: getCurrentLocale()`, résolue par le hook de tâche 4
   * depuis `Accept-Language`. Ces deux tests vérifient l'écriture réelle en
   * base, pas seulement le code HTTP.
   */
  it('creates the user with locale FR when Accept-Language is fr', async () => {
    const email = `localefr${suffix}@example.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'accept-language': 'fr-FR,fr;q=0.9' },
      payload: {
        username: `localefr${suffix}`,
        email,
        password: 'Password123!',
      },
    })
    expect(res.statusCode).toBe(201)

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user?.locale).toBe('FR')
  })

  it('creates the user with locale EN when no Accept-Language header is sent', async () => {
    const email = `localeen${suffix}@example.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `localeen${suffix}`,
        email,
        password: 'Password123!',
      },
    })
    expect(res.statusCode).toBe(201)

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user?.locale).toBe('EN')
  })
})
