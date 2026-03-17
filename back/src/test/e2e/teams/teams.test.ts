import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Teams routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookiesA: string
  let cookiesB: string
  let teamId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    const resA = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `teamA${suffix}`, email: `teamA${suffix}@test.com`, password: 'Password123!' },
    })
    cookiesA = resA.headers['set-cookie'] as string

    const resB = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `teamB${suffix}`, email: `teamB${suffix}@test.com`, password: 'Password123!' },
    })
    cookiesB = resB.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('POST /teams — crée une équipe', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `Team${suffix}`, description: 'Test team' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe(`Team${suffix}`)
    expect(body.members).toBeDefined()
    teamId = body.id
  })

  it('GET /teams — liste les équipes de l\'utilisateur', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/teams',
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.teams)).toBe(true)
    expect(body.teams.some((t: any) => t.id === teamId)).toBe(true)
  })

  it('GET /teams/:id — détail équipe (membre)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(teamId)
    expect(Array.isArray(body.members)).toBe(true)
  })

  it('GET /teams/:id — 403 si non-membre', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /teams/:id/invite — invite par username', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/invite`,
      headers: { cookie: cookiesA },
      payload: { username: `teamB${suffix}` },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toBeDefined()
  })

  it('GET /invitations/:token — voir une invitation', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const inv = await postgresOrm.prisma.invitation.findFirst({
      where: { teamId, status: 'PENDING' },
    })
    expect(inv).not.toBeNull()

    const res = await app.inject({
      method: 'GET',
      url: `/invitations/${inv!.token}`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().teamId).toBe(teamId)
  })

  it('POST /invitations/:token/decline — décliner une invitation', async () => {
    const resTeam2 = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `Team2${suffix}` },
    })
    const team2Id = resTeam2.json().id

    const resInv = await app.inject({
      method: 'POST',
      url: `/teams/${team2Id}/invite`,
      headers: { cookie: cookiesA },
      payload: { username: `teamB${suffix}` },
    })
    expect(resInv.statusCode).toBe(201)
    const invToken = resInv.json().token

    const res = await app.inject({
      method: 'POST',
      url: `/invitations/${invToken}/decline`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)

    await app.inject({ method: 'DELETE', url: `/teams/${team2Id}`, headers: { cookie: cookiesA } })
  })

  it('POST /invitations/:token/accept — accepter l\'invitation', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const inv = await postgresOrm.prisma.invitation.findFirst({
      where: { teamId, status: 'PENDING' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/invitations/${inv!.token}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)
  })

  it('GET /teams/:id — membre après acceptation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)
  })

  it('POST /teams/:id/leave — quitter une équipe (non-owner)', async () => {
    const resTeam3 = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `Team3${suffix}` },
    })
    const team3Id = resTeam3.json().id

    const resInv = await app.inject({
      method: 'POST',
      url: `/teams/${team3Id}/invite`,
      headers: { cookie: cookiesA },
      payload: { username: `teamB${suffix}` },
    })
    const invToken = resInv.json().token

    await app.inject({
      method: 'POST',
      url: `/invitations/${invToken}/accept`,
      headers: { cookie: cookiesB },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${team3Id}/leave`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(204)

    await app.inject({ method: 'DELETE', url: `/teams/${team3Id}`, headers: { cookie: cookiesA } })
  })

  it('POST /teams/:id/transfer — transférer la propriété', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const memberB = await postgresOrm.prisma.teamMember.findFirst({
      where: { teamId, user: { username: `teamB${suffix}` } },
    })
    expect(memberB).not.toBeNull()

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/transfer`,
      headers: { cookie: cookiesA },
      payload: { newOwnerId: memberB!.userId },
    })
    expect(res.statusCode).toBe(204)

    const team = await postgresOrm.prisma.team.findUnique({ where: { id: teamId } })
    expect(team!.ownerId).toBe(memberB!.userId)
  })

  it('DELETE /teams/:id — supprime l\'équipe (new owner)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(204)
  })
})
