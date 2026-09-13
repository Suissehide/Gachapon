import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Annuaire des équipes qui recrutent', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookiesOwner: string
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

    const owner = await signIn('recruitDirOwner')
    cookiesOwner = owner.cookies

    const created = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesOwner },
      payload: { name: `Annuaire ${suffix}` },
    })
    teamId = created.json().id
  })

  afterAll(async () => {
    // Cascade Prisma sur Team -> TeamMember/JoinRequest : un seul delete
    // suffit à tout nettoyer.
    await prisma.team.delete({ where: { id: teamId } }).catch(() => {})
    await app.close()
  })

  it('GET /teams/directory — liste les équipes qui recrutent, pas les miennes', async () => {
    const res = await app.inject({
      method: 'GET',
      // Filtré sur le nom unique de CETTE suite : tout le run partage une
      // base, l'annuaire est paginé à 20, et sans ce filtre l'assertion
      // dépendrait du nombre d'équipes créées par les autres suites — une
      // positive échoue dès qu'on passe en page 2, une négative passe à vide.
      url: `/teams/directory?search=${encodeURIComponent(`Annuaire ${suffix}`)}`,
      headers: { cookie: cookiesOwner },
    })
    expect(res.statusCode).toBe(200)
    const ids = res.json().teams.map((t: any) => t.id)
    // L'owner est membre de `teamId` : elle est exclue de SON annuaire.
    expect(ids).not.toContain(teamId)
  })

  it('exclut les équipes qui ne recrutent pas', async () => {
    await prisma.team.update({
      where: { id: teamId },
      data: { recruiting: false },
    })
    const other = await signIn('recruitDirBrowser')
    const res = await app.inject({
      method: 'GET',
      // Filtré sur le nom unique de CETTE suite : tout le run partage une
      // base, l'annuaire est paginé à 20, et sans ce filtre l'assertion
      // dépendrait du nombre d'équipes créées par les autres suites — une
      // positive échoue dès qu'on passe en page 2, une négative passe à vide.
      url: `/teams/directory?search=${encodeURIComponent(`Annuaire ${suffix}`)}`,
      headers: { cookie: other.cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().teams.map((t: any) => t.id)).not.toContain(teamId)

    await prisma.team.update({
      where: { id: teamId },
      data: { recruiting: true },
    })
  })

  it('refuse de candidater à une équipe qui ne recrute pas', async () => {
    // `recruiting` n'est pas qu'un filtre d'annuaire : `apply()` le
    // revérifie côté serveur, sinon un id d'équipe glané ailleurs suffit à
    // candidater (et à faire sonner la cloche des officiers) sur une équipe
    // qui a coupé le robinet.
    await prisma.team.update({
      where: { id: teamId },
      data: { recruiting: false },
    })
    const applicant = await signIn('recruitDirClosed')

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: applicant.cookies },
    })
    expect(res.statusCode).toBe(403)

    await prisma.team.update({
      where: { id: teamId },
      data: { recruiting: true },
    })
  })

  it('marque les équipes où j ai déjà une candidature en attente', async () => {
    const other = await signIn('recruitDirMarker')
    await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: other.cookies },
    })
    const res = await app.inject({
      method: 'GET',
      // Filtré sur le nom unique de CETTE suite : tout le run partage une
      // base, l'annuaire est paginé à 20, et sans ce filtre l'assertion
      // dépendrait du nombre d'équipes créées par les autres suites — une
      // positive échoue dès qu'on passe en page 2, une négative passe à vide.
      url: `/teams/directory?search=${encodeURIComponent(`Annuaire ${suffix}`)}`,
      headers: { cookie: other.cookies },
    })
    expect(res.statusCode).toBe(200)
    const entry = res.json().teams.find((t: any) => t.id === teamId)
    expect(entry).toMatchObject({
      id: teamId,
      name: `Annuaire ${suffix}`,
      memberCount: 1,
      hasPendingRequest: true,
    })
  })

  it('PATCH /teams/:id — le chef coupe le recrutement sans vider la file', async () => {
    const before = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesOwner },
    })
    const countBefore = before.json().requests.length
    expect(countBefore).toBeGreaterThan(0)

    const patched = await app.inject({
      method: 'PATCH',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesOwner },
      payload: { name: `Recruteurs ${suffix}`, recruiting: false },
    })
    expect(patched.statusCode).toBe(200)

    // Vérifie que le flag est bien retombé côté fiche d'équipe (via
    // `teamDetailResponseSchema`, qui expose `recruiting`).
    const detail = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}`,
      headers: { cookie: cookiesOwner },
    })
    expect(detail.json().recruiting).toBe(false)

    const after = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/join-requests`,
      headers: { cookie: cookiesOwner },
    })
    expect(after.json().requests).toHaveLength(countBefore)

    await prisma.team.update({
      where: { id: teamId },
      data: { recruiting: true },
    })
  })
})
