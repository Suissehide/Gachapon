import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'
import { mondayOfUtcWeek } from '../../../main/domain/quests/quest-matching'

describe('Teams routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookiesA: string
  let cookiesB: string
  let teamId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    const { postgresOrm } = (app as any).iocContainer

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `teamA${suffix}`, email: `teamA${suffix}@test.com`, password: 'Password123!' },
    })
    await postgresOrm.prisma.user.update({
      where: { email: `teamA${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    const loginA = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `teamA${suffix}@test.com`, password: 'Password123!' },
    })
    cookiesA = loginA.headers['set-cookie'] as string

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `teamB${suffix}`, email: `teamB${suffix}@test.com`, password: 'Password123!' },
    })
    await postgresOrm.prisma.user.update({
      where: { email: `teamB${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    const loginB = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `teamB${suffix}@test.com`, password: 'Password123!' },
    })
    cookiesB = loginB.headers['set-cookie'] as string
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

  it('POST /teams/:id/members/:userId/remove — exclure un membre', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Créer une équipe temporaire pour ce test
    const resTeam4 = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `Team4${suffix}` },
    })
    const team4Id = resTeam4.json().id

    // Inviter B
    const resInv = await app.inject({
      method: 'POST',
      url: `/teams/${team4Id}/invite`,
      headers: { cookie: cookiesA },
      payload: { username: `teamB${suffix}` },
    })
    const invToken = resInv.json().token

    // B accepte
    await app.inject({
      method: 'POST',
      url: `/invitations/${invToken}/accept`,
      headers: { cookie: cookiesB },
    })

    // Récupérer l'ID de B
    const memberB = await postgresOrm.prisma.teamMember.findFirst({
      where: { teamId: team4Id, user: { username: `teamB${suffix}` } },
    })
    expect(memberB).not.toBeNull()

    // A exclut B
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${team4Id}/members/${memberB!.userId}/remove`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(204)

    // Vérifier que B n'est plus membre
    const teamDetail = await app.inject({
      method: 'GET',
      url: `/teams/${team4Id}`,
      headers: { cookie: cookiesA },
    })
    const members = teamDetail.json().members as { userId: string }[]
    expect(members.some((m) => m.userId === memberB!.userId)).toBe(false)

    // Nettoyer
    await app.inject({ method: 'DELETE', url: `/teams/${team4Id}`, headers: { cookie: cookiesA } })
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

describe('Quest join_team — createTeam émet TEAM_JOINED', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let questId: string
  let rewardId: string

  const suffix = Date.now() + 1 // distinct from outer suite suffix
  const periodKey = mondayOfUtcWeek(new Date())

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Seed a ONESHOT join_team quest (test-scoped; DB is TRUNCATED before each run)
    const reward = await postgresOrm.prisma.reward.create({
      data: { tokens: 10, dust: 50, xp: 0 },
    })
    rewardId = reward.id

    const quest = await postgresOrm.prisma.quest.create({
      data: {
        key: `join_team_${suffix}`,
        name: 'Force du Groupe (test)',
        description: 'Rejoins ou crée une équipe.',
        period: 'ONESHOT',
        criterion: { event: 'TEAM_JOINED', target: 1 },
        isActive: true,
        rewardId: reward.id,
      },
    })
    questId = quest.id

    // Register + verify + login a fresh user
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `jt_user_${suffix}`,
        email: `jtuser${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const user = await postgresOrm.prisma.user.update({
      where: { email: `jtuser${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `jtuser${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userReward.deleteMany({
      where: { source: 'QUEST', sourceId: { startsWith: `join_team_${suffix}:` } },
    })
    await postgresOrm.prisma.userQuest.deleteMany({ where: { questId } })
    await postgresOrm.prisma.quest.deleteMany({ where: { id: questId } })
    await postgresOrm.prisma.reward.deleteMany({ where: { id: rewardId } })
    await app.close()
  })

  it('créer une équipe progresse la quête join_team (ONESHOT, progress=1, completed=true)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookies },
      payload: { name: `JTTeam${suffix}` },
    })
    expect(res.statusCode).toBe(201)

    const { postgresOrm } = (app as any).iocContainer
    const uq = await postgresOrm.prisma.userQuest.findFirst({
      where: { userId, questId, periodKey: 'oneshot' },
    })
    expect(uq).not.toBeNull()
    expect(uq!.progress).toBe(1)
    expect(uq!.completed).toBe(true)

    // A pending UserReward must also exist
    const sourceId = `join_team_${suffix}:oneshot`
    const ur = await postgresOrm.prisma.userReward.findUnique({
      where: { userId_source_sourceId: { userId, source: 'QUEST', sourceId } },
    })
    expect(ur).not.toBeNull()
    expect(ur!.rewardId).toBe(rewardId)
  })
})
