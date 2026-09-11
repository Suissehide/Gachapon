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

  it('POST /teams/:id/join-requests — candidate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ teamId, status: 'PENDING' })
  })

  it('GET /me/join-requests — liste mes candidatures', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me/join-requests',
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().requests).toHaveLength(1)
    expect(res.json().requests[0]).toMatchObject({ teamId, status: 'PENDING' })
  })

  it('refuse une seconde candidature à la même équipe', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(409)
  })

  it('refuse de candidater à une équipe dont je suis membre', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesOwner },
    })
    expect(res.statusCode).toBe(409)
  })

  it('DELETE /teams/:id/join-requests/me — annule', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/teams/${teamId}/join-requests/me`,
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(204)

    const mine = await app.inject({
      method: 'GET',
      url: '/me/join-requests',
      headers: { cookie: cookiesCandidate },
    })
    expect(mine.json().requests).toHaveLength(0)
  })

  it('plafonne à 5 candidatures en attente', async () => {
    // L'owner est plafonné à 3 équipes (MAX_TEAMS_PER_USER) : on crée les
    // cibles directement en base pour ne pas buter dessus.
    const ids: string[] = []
    for (let i = 0; i < 6; i++) {
      const team = await prisma.team.create({
        data: {
          name: `Cible ${i} ${suffix}`,
          slug: `cible-${i}-${suffix}`,
          ownerId: (
            await prisma.user.findFirst({
              where: { email: `recruitOwner${suffix}@test.com` },
            })
          ).id,
        },
      })
      ids.push(team.id)
    }

    const codes: number[] = []
    for (const id of ids) {
      const res = await app.inject({
        method: 'POST',
        url: `/teams/${id}/join-requests`,
        headers: { cookie: cookiesCandidate },
      })
      codes.push(res.statusCode)
    }
    expect(codes.slice(0, 5)).toEqual([201, 201, 201, 201, 201])
    expect(codes[5]).toBe(409)

    await prisma.joinRequest.deleteMany({ where: { userId: candidateId } })
  })
})
