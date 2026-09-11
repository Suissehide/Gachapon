import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import {
  JOIN_REQUEST_COOLDOWN_MS,
  JOIN_REQUEST_TTL_MS,
} from '../../../main/domain/recruitment/recruitment-rules'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Recrutement d équipe', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookiesOwner: string
  let cookiesCandidate: string
  let candidateId: string
  let ownerId: string
  let teamId: string

  const suffix = Date.now()
  const HOUR_MS = 60 * 60 * 1000
  // Resserrés autour de la coupure réelle (les constantes de la spec), pas
  // d'une valeur en dur : si la fenêtre change (7 j → 3 j ou 30 j), ces âges
  // suivent et le test continue de basculer au bon endroit.
  const JUST_INSIDE_TTL_MS = JOIN_REQUEST_TTL_MS - HOUR_MS
  const JUST_OUTSIDE_TTL_MS = JOIN_REQUEST_TTL_MS + HOUR_MS
  const JUST_INSIDE_COOLDOWN_MS = JOIN_REQUEST_COOLDOWN_MS - HOUR_MS
  const JUST_OUTSIDE_COOLDOWN_MS = JOIN_REQUEST_COOLDOWN_MS + HOUR_MS

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
    configService = (app as any).iocContainer.configService

    const owner = await signIn('recruitOwner')
    cookiesOwner = owner.cookies
    ownerId = owner.id
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
    // Task 9 : le chef (seul OWNER de cette équipe) apprend la candidature
    // en direct. On branche un faux socket sur son userId, comme
    // `perks.test.ts` le fait pour `team:perk`.
    const wsManager = (app as any).iocContainer.wsManager
    const received: any[] = []
    wsManager.register(ownerId, {
      readyState: 1,
      send: (data: string) => received.push(JSON.parse(data)),
      on: () => {},
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ teamId, status: 'PENDING' })

    expect(received).toContainEqual({
      type: 'team:join-request',
      teamId,
      requestId: res.json().id,
      candidate: { id: candidateId, username: expect.any(String) },
    })
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

  // Sème une candidature déjà décidée (ACCEPTED/DECLINED) sur une équipe
  // dédiée, pour tester les deux fenêtres temporelles de `listMine` sans
  // attendre les tâches 6/7 (acceptation/refus par le chef).
  const seedDecidedRequest = async (
    label: string,
    status: 'ACCEPTED' | 'DECLINED',
    decidedAt: Date,
  ) => {
    const team = await prisma.team.create({
      data: {
        name: `${label} ${suffix}`,
        slug: `${label.toLowerCase().replace(/\s+/g, '-')}-${suffix}`,
        ownerId,
      },
    })
    await prisma.joinRequest.create({
      data: {
        teamId: team.id,
        userId: candidateId,
        status,
        expiresAt: new Date(Date.now() + JOIN_REQUEST_TTL_MS),
        decidedAt,
      },
    })
    return team.id as string
  }

  it('ACCEPTED juste avant la coupure des 7 jours — visible avec le statut ACCEPTED', async () => {
    const targetId = await seedDecidedRequest(
      'Acceptee recente',
      'ACCEPTED',
      new Date(Date.now() - JUST_INSIDE_TTL_MS),
    )

    const res = await app.inject({
      method: 'GET',
      url: '/me/join-requests',
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(200)
    const found = res.json().requests.find((r: any) => r.teamId === targetId)
    expect(found).toMatchObject({ teamId: targetId, status: 'ACCEPTED' })

    await prisma.joinRequest.deleteMany({ where: { teamId: targetId } })
  })

  it('ACCEPTED juste après la coupure des 7 jours — absent', async () => {
    const targetId = await seedDecidedRequest(
      'Acceptee vieille',
      'ACCEPTED',
      new Date(Date.now() - JUST_OUTSIDE_TTL_MS),
    )

    const res = await app.inject({
      method: 'GET',
      url: '/me/join-requests',
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(200)
    expect(
      res.json().requests.find((r: any) => r.teamId === targetId),
    ).toBeUndefined()

    await prisma.joinRequest.deleteMany({ where: { teamId: targetId } })
  })

  it('DECLINED juste avant la fin du cooldown — visible, reapplyAt renseigné', async () => {
    const targetId = await seedDecidedRequest(
      'Refusee recente',
      'DECLINED',
      new Date(Date.now() - JUST_INSIDE_COOLDOWN_MS),
    )

    const res = await app.inject({
      method: 'GET',
      url: '/me/join-requests',
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(200)
    const found = res.json().requests.find((r: any) => r.teamId === targetId)
    expect(found).toMatchObject({ teamId: targetId, status: 'DECLINED' })
    expect(found.reapplyAt).not.toBeNull()

    await prisma.joinRequest.deleteMany({ where: { teamId: targetId } })
  })

  it('DECLINED juste après la fin du cooldown — absent', async () => {
    const targetId = await seedDecidedRequest(
      'Refusee vieille',
      'DECLINED',
      new Date(Date.now() - JUST_OUTSIDE_COOLDOWN_MS),
    )

    const res = await app.inject({
      method: 'GET',
      url: '/me/join-requests',
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(200)
    expect(
      res.json().requests.find((r: any) => r.teamId === targetId),
    ).toBeUndefined()

    await prisma.joinRequest.deleteMany({ where: { teamId: targetId } })
  })

  it('GET /teams/:id/join-requests — le chef voit la file', async () => {
    await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesOwner },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().requests).toHaveLength(1)
    expect(res.json().requests[0].candidate.id).toBe(candidateId)

    await prisma.joinRequest.deleteMany({ where: { teamId } })
  })

  it('un non-membre ne voit pas la file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /join-requests/:id/accept — fait entrer le candidat', async () => {
    // La file a été vidée par le test précédent : on recandidate avant
    // d'accepter.
    await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })

    const queue = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesOwner },
    })
    const requestId = queue.json().requests[0].id

    // Task 9 : le candidat apprend la décision en direct, sans recharger.
    const wsManager = (app as any).iocContainer.wsManager
    const received: any[] = []
    wsManager.register(candidateId, {
      readyState: 1,
      send: (data: string) => received.push(JSON.parse(data)),
      on: () => {},
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: `/join-requests/${requestId}/accept`,
      headers: { cookie: cookiesOwner },
    })
    expect(res.statusCode).toBe(200)

    expect(received).toContainEqual({
      type: 'team:join-decision',
      teamId,
      teamName: expect.any(String),
      status: 'ACCEPTED',
    })

    const members = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/members`,
      headers: { cookie: cookiesOwner },
    })
    expect(
      members.json().members.some((m: any) => m.userId === candidateId),
    ).toBe(true)

    const row = await prisma.joinRequest.findUnique({
      where: { id: requestId },
    })
    expect(row.status).toBe('ACCEPTED')

    // Les assertions ci-dessus portent sur l'état laissé par l'acceptation ;
    // on le nettoie maintenant pour rendre le couple (équipe, candidat) au
    // beforeAll partagé — sinon les tâches 7/8, qui ajoutent leurs tests à
    // ce même fichier et réutilisent `teamId`/`candidateId`, buteraient sur
    // « déjà membre de cette équipe » sans savoir pourquoi.
    await prisma.teamMember.deleteMany({
      where: { teamId, userId: candidateId },
    })
    await prisma.joinRequest.deleteMany({ where: { id: requestId } })
  })

  it('une seconde acceptation ne fait rien et répond 409', async () => {
    // Indépendant du test précédent (qui nettoie derrière lui) : on sème
    // directement en base sa propre demande déjà décidée, sans passer par
    // un nouveau `signIn` (le register e2e est plafonné à 5 par fenêtre —
    // ownerId/candidateId suffisent, `decideIfPending` ne vérifie que le
    // statut de la ligne, jamais une appartenance réelle).
    const seeded = await prisma.joinRequest.create({
      data: {
        teamId,
        userId: candidateId,
        status: 'ACCEPTED',
        decidedById: ownerId,
        decidedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/join-requests/${seeded.id}/accept`,
      headers: { cookie: cookiesOwner },
    })
    expect(res.statusCode).toBe(409)

    await prisma.joinRequest.deleteMany({ where: { id: seeded.id } })
  })

  it('équipe pleine : refuse l acceptation mais laisse la demande PENDING', async () => {
    // Réutilise les fixtures partagées (owner/candidate) plutôt que de
    // `signIn` deux nouveaux comptes : le register e2e est plafonné à 5
    // inscriptions par fenêtre et cette suite y est déjà proche.
    const baseMaxMembers = (await configService.getMany('team.maxMembers'))[
      'team.maxMembers'
    ]

    const created = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesOwner },
      payload: { name: `Complete ${suffix}` },
    })
    const fullTeamId = created.json().id as string

    const applied = await app.inject({
      method: 'POST',
      url: `/teams/${fullTeamId}/join-requests`,
      headers: { cookie: cookiesCandidate },
    })
    const requestId = applied.json().id as string

    try {
      // L'équipe n'a que son chef (l'owner) comme membre : abaisser le
      // plafond à 1 suffit à la rendre "pleine" sans y insérer 34 figurants.
      await configService.set('team.maxMembers', 1)

      const res = await app.inject({
        method: 'POST',
        url: `/join-requests/${requestId}/accept`,
        headers: { cookie: cookiesOwner },
      })
      expect(res.statusCode).toBe(403)

      const after = await prisma.joinRequest.findUnique({
        where: { id: requestId },
      })
      expect(after.status).toBe('PENDING')
    } finally {
      await configService.set('team.maxMembers', baseMaxMembers)
      // Cascade Prisma sur Team -> TeamMember/JoinRequest : un seul delete
      // suffit à tout nettoyer (équipe, appartenance de l'owner, demande).
      await prisma.team.delete({ where: { id: fullTeamId } })
    }
  })

  it('refuse l acceptation si le candidat a atteint ses 3 équipes, et expire la demande', async () => {
    const other = await signIn('recruitFull')
    // Trois équipes pour saturer MAX_TEAMS_PER_USER.
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/teams',
        headers: { cookie: other.cookies },
        payload: { name: `Pleine ${i} ${suffix}` },
      })
    }
    const target = await prisma.team.create({
      data: {
        name: `Quatrieme ${suffix}`,
        slug: `quatrieme-${suffix}`,
        ownerId: candidateId,
        members: { create: { userId: candidateId, role: 'OWNER' } },
      },
    })
    const req = await prisma.joinRequest.create({
      data: {
        teamId: target.id,
        userId: other.id,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/join-requests/${req.id}/accept`,
      headers: { cookie: cookiesCandidate },
    })
    expect(res.statusCode).toBe(403)
    const after = await prisma.joinRequest.findUnique({ where: { id: req.id } })
    expect(after.status).toBe('EXPIRED')

    await prisma.joinRequest.deleteMany({ where: { teamId: target.id } })
    await prisma.teamMember.deleteMany({ where: { teamId: target.id } })
    await prisma.team.delete({ where: { id: target.id } })
  })

  it('POST /join-requests/:id/decline — refuse et arme le cooldown', async () => {
    const other = await signIn('recruitDeclined')
    const req = await prisma.joinRequest.create({
      data: {
        teamId,
        userId: other.id,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    })

    try {
      const res = await app.inject({
        method: 'POST',
        url: `/join-requests/${req.id}/decline`,
        headers: { cookie: cookiesOwner },
      })
      expect(res.statusCode).toBe(200)

      // Recandidature immédiate : bloquée par le cooldown.
      const retry = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/join-requests`,
        headers: { cookie: other.cookies },
      })
      expect(retry.statusCode).toBe(409)

      // Le refus reste visible tant que le cooldown court.
      const mine = await app.inject({
        method: 'GET',
        url: '/me/join-requests',
        headers: { cookie: other.cookies },
      })
      expect(mine.json().requests[0]).toMatchObject({ status: 'DECLINED' })
      expect(mine.json().requests[0].reapplyAt).toBeTruthy()

      // Cooldown écoulé : la recandidature passe, et la ligne disparaît.
      await prisma.joinRequest.update({
        where: { id: req.id },
        data: { decidedAt: new Date(Date.now() - 8 * 86_400_000) },
      })
      const later = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/join-requests`,
        headers: { cookie: other.cookies },
      })
      expect(later.statusCode).toBe(201)
    } finally {
      await prisma.joinRequest.deleteMany({
        where: { teamId, userId: other.id },
      })
    }
  })

  it('accepter une invitation clôture la candidature qui dormait', async () => {
    const other = await signIn('recruitInvited')
    await prisma.joinRequest.create({
      data: {
        teamId,
        userId: other.id,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    })

    try {
      const invite = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/invite`,
        headers: { cookie: cookiesOwner },
        payload: { username: `recruitInvited${suffix}` },
      })
      await app.inject({
        method: 'POST',
        url: `/invitations/${invite.json().token}/accept`,
        headers: { cookie: other.cookies },
      })

      const row = await prisma.joinRequest.findFirst({
        where: { teamId, userId: other.id },
      })
      expect(row.status).toBe('ACCEPTED')

      const queue = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/join-requests`,
        headers: { cookie: cookiesOwner },
      })
      expect(
        queue.json().requests.some((r: any) => r.candidate.id === other.id),
      ).toBe(false)
    } finally {
      await prisma.teamMember.deleteMany({
        where: { teamId, userId: other.id },
      })
      await prisma.joinRequest.deleteMany({
        where: { teamId, userId: other.id },
      })
    }
  })
})
