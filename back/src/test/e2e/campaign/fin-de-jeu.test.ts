import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { randomTestIpv6 } from '../../helpers/guest'

/**
 * Le contenu de fin de jeu arrive par migration de données : les chapitres
 * 16 à 20 et les étages 11 à 15 des tours sont en base dès le démarrage.
 * Un joueur qui avait tout fini (15-10, étage 10 de chaque tour) doit les
 * voir s'ouvrir sans aucune intervention.
 */
describe('fin de jeu — déblocage après la migration', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookie: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma
    const name = `fdj${suffix}`
    const email = `${name}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { username: name, email, password: 'Password123!' },
    })
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { email, password: 'Password123!' },
    })
    cookie = login.headers['set-cookie'] as unknown as string
    await prisma.userCampaignProgress.create({
      data: { userId: user.id, highestChapter: 15, highestIndex: 10 },
    })
    await prisma.userTowerProgress.create({
      data: { userId: user.id, element: 'FIRE', highestFloor: 10 },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('les 50 étages des chapitres 16 à 20 sont en base', async () => {
    const n = await prisma.campaignStage.count({
      where: { chapter: { gte: 16, lte: 20 } },
    })
    expect(n).toBe(50)
  })

  it('un joueur qui a battu 15-10 voit 16-1 ouvert', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      chapters: {
        chapter: number
        stages: { index: number; status: string; isBoss: boolean }[]
      }[]
    }
    const seize = body.chapters.find((c) => c.chapter === 16)
    expect(seize?.stages.find((s) => s.index === 1)?.status).toBe('current')
    expect(seize?.stages.find((s) => s.index === 2)?.status).toBe('locked')
    const vingt = body.chapters.find((c) => c.chapter === 20)
    expect(vingt?.stages.find((s) => s.index === 10)?.isBoss).toBe(true)
  })

  it('un joueur à l’étage 10 voit le 11 ouvert, et le 10 reste un boss', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tower/FIRE',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      floors: { index: number; status: string; isBoss: boolean }[]
    }
    const etage = (i: number) => body.floors.find((f) => f.index === i)
    expect(etage(11)?.status).toBe('current')
    expect(etage(12)?.status).toBe('locked')
    expect(etage(15)?.isBoss).toBe(true)
    expect(etage(11)?.isBoss).toBe(false)
  })
})
