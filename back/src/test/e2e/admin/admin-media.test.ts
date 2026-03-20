import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin media routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `mediaadmin${suffix}`, email: `mediaadmin${suffix}@test.com`, password: 'Password123!' },
    })
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `mediaadmin${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `mediaadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/media — retourne un tableau (200 ou 500 si Minio absent)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/media',
      headers: { cookie: adminCookies },
    })
    expect([200, 500]).toContain(res.statusCode)
    if (res.statusCode === 200) {
      expect(Array.isArray(res.json())).toBe(true)
    }
  })

  it('GET /admin/media — 401 sans cookie', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/media' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /admin/media — 400 si clé avec chemin invalide', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/admin/media',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: { keys: ['../../etc/passwd'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DELETE /admin/media — 400 si clé sans préfixe cards/', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/admin/media',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: { keys: ['other/image.png'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /admin/media/upload — 400 format invalide', async () => {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('images[]', Buffer.from('fake'), { filename: 'bad.gif', contentType: 'image/gif' })
    const res = await app.inject({
      method: 'POST', url: '/admin/media/upload',
      headers: { ...form.getHeaders(), cookie: adminCookies },
      payload: form.getBuffer(),
    })
    // Errors accumulées — peut retourner 200 avec errors[] ou 400 selon implémentation
    if (res.statusCode === 200) {
      expect(res.json().errors?.length).toBeGreaterThan(0)
    } else {
      expect(res.statusCode).toBe(400)
    }
  })
})
