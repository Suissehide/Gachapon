import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /auth/register', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
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
})
