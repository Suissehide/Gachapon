import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { randomTestIpv6 } from '../../helpers/guest'

const DAY = 24 * 60 * 60 * 1000
const MINUTE = 60 * 1000

describe('GET /campaign/wanderer', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  const suffix = Date.now()
  let seq = 0
  // Chapitre propre au fichier : jamais touché par les étages de production
  // ni par les autres suites e2e de campagne (pas de TRUNCATE global ici).
  const chapter = 900 + (Date.now() % 50)

  async function registerUser() {
    seq++
    const name = `wnd${seq}x${suffix}`
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
    return {
      id: user.id as string,
      cookie: login.headers['set-cookie'] as unknown as string,
    }
  }

  const setLastLoginYesterday = (userId: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(Date.now() - 1 * DAY) },
    })

  const setProgress = (userId: string, highestIndex: number) =>
    prisma.userCampaignProgress.create({
      data: { userId, highestChapter: chapter, highestIndex },
    })

  const me = (cookie: string) =>
    app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })

  const wanderer = (cookie?: string) =>
    app.inject({
      method: 'GET',
      url: '/campaign/wanderer',
      headers: cookie ? { cookie } : {},
    })

  const findRow = (userId: string) =>
    prisma.wanderingMonster.findFirst({ where: { userId } })

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma

    const enemy = (n: number) => ({
      baseHp: 100,
      baseAtk: 10,
      baseDef: 5,
      baseSpd: 50,
      level: 1,
      palier: 1,
      mitigationScale: 1,
      attackPattern: 'BASIC',
      element: 'FIRE',
      appearance: `monsters/slimes/SLIME-${suffix}-${n}`,
    })
    const lootTable = {
      firstClear: { gold: 10, dust: 5, xp: 1 },
      farm: {
        gold: 1,
        dust: 1,
        xp: 1,
        equipmentDropChance: 0,
        equipmentWeights: {},
        cardChance: 0,
      },
    }
    for (let index = 1; index <= 4; index++) {
      await prisma.campaignStage.create({
        data: {
          chapter,
          index,
          labelFr: `${chapter}-${index}`,
          labelEn: `${chapter}-${index}`,
          isBoss: false,
          order: chapter * 100 + index,
          enemyTeam: [enemy(index)],
          lootTable,
        },
      })
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('planifie une apparition du jour quand 3 étages du chapitre sont battus', async () => {
    const u = await registerUser()
    await setLastLoginYesterday(u.id)
    await setProgress(u.id, 3)

    const before = new Date()
    const res = await me(u.cookie)
    expect(res.statusCode).toBe(200)

    const row = await findRow(u.id)
    expect(row).not.toBeNull()
    expect(row.day).toBe(new Date().toISOString().slice(0, 10))

    const stage = await prisma.campaignStage.findUnique({
      where: { id: row.stageId },
    })
    expect(stage.chapter).toBe(chapter)
    expect(stage.index).toBeLessThanOrEqual(3)

    const delayMinutes = Math.round(
      (row.appearsAt.getTime() - before.getTime()) / MINUTE,
    )
    expect(delayMinutes).toBeGreaterThanOrEqual(60)
    expect(delayMinutes).toBeLessThanOrEqual(360)

    const durationMinutes = Math.round(
      (row.expiresAt.getTime() - row.appearsAt.getTime()) / MINUTE,
    )
    expect(durationMinutes).toBe(180)
  })

  it('ne renvoie rien avant appearsAt', async () => {
    const u = await registerUser()
    await setLastLoginYesterday(u.id)
    await setProgress(u.id, 3)
    await me(u.cookie)

    const res = await wanderer(u.cookie)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ wanderer: null })
  })

  it('renvoie la vue une fois appearsAt passé, cohérente avec la ligne', async () => {
    const u = await registerUser()
    await setLastLoginYesterday(u.id)
    await setProgress(u.id, 3)
    await me(u.cookie)
    const row = await findRow(u.id)
    await prisma.wanderingMonster.update({
      where: { id: row.id },
      data: { appearsAt: new Date(Date.now() - 1 * MINUTE) },
    })

    const res = await wanderer(u.cookie)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.wanderer).not.toBeNull()
    expect(body.wanderer.stageId).toBe(row.stageId)
    expect(body.wanderer.expiresAt).toBe(row.expiresAt.toISOString())
  })

  it('ne renvoie rien après expiresAt', async () => {
    const u = await registerUser()
    await setLastLoginYesterday(u.id)
    await setProgress(u.id, 3)
    await me(u.cookie)
    const row = await findRow(u.id)
    await prisma.wanderingMonster.update({
      where: { id: row.id },
      data: {
        appearsAt: new Date(Date.now() - 2 * MINUTE),
        expiresAt: new Date(Date.now() - 1 * MINUTE),
      },
    })

    const res = await wanderer(u.cookie)
    expect(res.json()).toEqual({ wanderer: null })
  })

  it('ne renvoie rien si defeatedAt est renseigné', async () => {
    const u = await registerUser()
    await setLastLoginYesterday(u.id)
    await setProgress(u.id, 3)
    await me(u.cookie)
    const row = await findRow(u.id)
    await prisma.wanderingMonster.update({
      where: { id: row.id },
      data: {
        appearsAt: new Date(Date.now() - 1 * MINUTE),
        defeatedAt: new Date(),
      },
    })

    const res = await wanderer(u.cookie)
    expect(res.json()).toEqual({ wanderer: null })
  })

  it('un deuxième /auth/me le même jour ne crée qu’une seule ligne', async () => {
    const u = await registerUser()
    await setLastLoginYesterday(u.id)
    await setProgress(u.id, 3)
    await me(u.cookie)
    const first = await findRow(u.id)

    await me(u.cookie)
    const rows = await prisma.wanderingMonster.findMany({
      where: { userId: u.id },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(first.id)
  })

  it('un compte neuf sans progression n’a aucune ligne', async () => {
    const u = await registerUser()

    const res = await me(u.cookie)
    expect(res.statusCode).toBe(200)
    const row = await findRow(u.id)
    expect(row).toBeNull()
  })

  it('sans session → 401', async () => {
    const res = await wanderer()
    expect(res.statusCode).toBe(401)
  })
})
