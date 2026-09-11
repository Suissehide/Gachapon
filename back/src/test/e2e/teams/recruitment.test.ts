import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Recrutement d équipe', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookiesOwner: string
  let cookiesCandidate: string
  let candidateId: string
  let teamId: string

  const suffix = Date.now()

  const signIn = async (tag: string) => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `${tag}${suffix}`,
        email: `${tag}${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const user = await prisma.user.update({
      where: { email: `${tag}${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `${tag}${suffix}@test.com`, password: 'Password123!' },
    })
    return { cookies: login.headers['set-cookie'] as string, id: user.id }
  }

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma

    const owner = await signIn('recruitOwner')
    cookiesOwner = owner.cookies
    const candidate = await signIn('recruitCandidate')
    cookiesCandidate = candidate.cookies
    candidateId = candidate.id

    const created = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesOwner },
      payload: { name: `Recruteurs ${suffix}` },
    })
    teamId = created.json().id
  })

  afterAll(() => app.close())

  it('le repository est résolu par le conteneur DI', () => {
    expect((app as any).iocContainer.joinRequestRepository).toBeDefined()
  })

  it('upsertPending réécrit la ligne au lieu d en empiler une', async () => {
    const repo = (app as any).iocContainer.joinRequestRepository
    const inSevenDays = new Date(Date.now() + 7 * 86_400_000)

    const first = await repo.upsertPending({
      teamId,
      userId: candidateId,
      expiresAt: inSevenDays,
    })
    await repo.setStatus(first.id, 'DECLINED')
    const second = await repo.upsertPending({
      teamId,
      userId: candidateId,
      expiresAt: inSevenDays,
    })

    expect(second.id).toBe(first.id)
    expect(second.status).toBe('PENDING')
    expect(second.decidedAt).toBeNull()
    expect(await prisma.joinRequest.count({ where: { teamId } })).toBe(1)

    await prisma.joinRequest.deleteMany({ where: { teamId } })
  })
})
