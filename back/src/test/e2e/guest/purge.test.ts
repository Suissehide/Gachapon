import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

describe('purge des invités inactifs', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
  })
  afterAll(async () => {
    await app.close()
  })

  it('supprime un invité à 31 j, garde celui à 29 j et tout USER', async () => {
    const prisma = app.iocContainer.postgresOrm.prisma
    const old = await prisma.user.create({
      data: {
        username: `pold${suffix}`,
        role: 'GUEST',
        locale: 'EN',
        lastLoginAt: daysAgo(31),
      },
    })
    const neverLogged = await prisma.user.create({
      data: {
        username: `pnull${suffix}`,
        role: 'GUEST',
        locale: 'EN',
        createdAt: daysAgo(40),
      },
    })
    const recent = await prisma.user.create({
      data: {
        username: `prec${suffix}`,
        role: 'GUEST',
        locale: 'EN',
        lastLoginAt: daysAgo(29),
      },
    })
    const member = await prisma.user.create({
      data: {
        username: `pusr${suffix}`,
        email: `pusr${suffix}@test.com`,
        locale: 'EN',
        lastLoginAt: daysAgo(400),
      },
    })

    const deleted = await app.iocContainer.guestDomain.purgeInactiveGuests()
    expect(deleted).toBeGreaterThanOrEqual(2)

    const ids = (
      await prisma.user.findMany({
        where: { id: { in: [old.id, neverLogged.id, recent.id, member.id] } },
      })
    ).map((u) => u.id)
    expect(ids).toEqual(expect.arrayContaining([recent.id, member.id]))
    expect(ids).not.toContain(old.id)
    expect(ids).not.toContain(neverLogged.id)
  })

  it('ignore un invité retenu par une relation sans cascade au lieu d’échouer', async () => {
    const prisma = app.iocContainer.postgresOrm.prisma
    // Cas théorique (un invité ne peut plus créer d'équipe) : la purge doit
    // l'écarter plutôt que faire échouer tout le deleteMany sur la FK.
    const stuck = await prisma.user.create({
      data: {
        username: `pstk${suffix}`,
        role: 'GUEST',
        locale: 'EN',
        lastLoginAt: daysAgo(60),
      },
    })
    await prisma.team.create({
      data: {
        name: `Stuck ${suffix}`,
        slug: `stuck-${suffix}`,
        ownerId: stuck.id,
      },
    })
    await expect(
      app.iocContainer.guestDomain.purgeInactiveGuests(),
    ).resolves.toEqual(expect.any(Number))
    expect(
      await prisma.user.findUnique({ where: { id: stuck.id } }),
    ).not.toBeNull()
  })
})
