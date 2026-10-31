import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// LIGHT/DARK sont exclues de toutes les sources de production (tirage,
// boutique du jour, commandes) : voir card-pools.ts (NORMAL_POOL_WHERE).
// Les cartes de combat et l'alchimie passent par la même constante — vérifié
// en revue de code, pas ici (pas de route HTTP qui les expose directement).
describe('Exclusion astrale (LIGHT/DARK) hors production', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let lightCardId: string
  let darkCardId: string
  let postgresOrm: any
  let cardRepository: any

  const suffix = Date.now()
  const email = `astral${suffix}@test.com`
  const password = 'Password123!'
  const username = `astraluser${suffix}`

  let commonPctBeforeAstral: number

  beforeAll(async () => {
    app = await buildTestApp()
    ;({ postgresOrm, cardRepository } = (app as any).iocContainer)

    const set = await postgresOrm.prisma.cardSet.create({
      data: { nameFr: `AstralSet${suffix}`, nameEn: `AstralSet${suffix}`, isActive: true },
    })

    // 4 cartes normales (FIRE) : assez pour satisfaire les 4 emplacements de
    // la boutique du jour sans dépendre de cartes créées par d'autres fichiers.
    for (let i = 0; i < 4; i++) {
      await postgresOrm.prisma.card.create({
        data: {
          nameFr: `AstralFire${suffix}-${i}`,
          nameEn: `AstralFire${suffix}-${i}`,
          rarity: 'COMMON',
          element: 'FIRE',
          dropWeight: 10,
          setId: set.id,
        },
      })
    }

    // Baseline AVANT la création des cartes astrales : si elles fuyaient dans
    // le pool normal, leur poids énorme ferait chuter nettement ce pct.
    const ratesBefore = await app.inject({ method: 'GET', url: '/pulls/rates' })
    commonPctBeforeAstral = ratesBefore
      .json()
      .rates.find((r: { rarity: string }) => r.rarity === 'COMMON').pct

    const light = await postgresOrm.prisma.card.create({
      data: {
        nameFr: `AstralLight${suffix}`,
        nameEn: `AstralLight${suffix}`,
        rarity: 'COMMON',
        element: 'LIGHT',
        dropWeight: 1_000_000,
        setId: set.id,
      },
    })
    lightCardId = light.id
    const dark = await postgresOrm.prisma.card.create({
      data: {
        nameFr: `AstralDark${suffix}`,
        nameEn: `AstralDark${suffix}`,
        rarity: 'COMMON',
        element: 'DARK',
        dropWeight: 1_000_000,
        setId: set.id,
      },
    })
    darkCardId = dark.id

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), tokens: 30, lastTokenAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /pulls/batch (x20) ne rend jamais LIGHT ni DARK malgré un poids énorme', async () => {
    const elements: (string | null)[] = []
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/pulls/batch',
        headers: { cookie: cookies },
        payload: { count: 10 },
      })
      expect(res.statusCode).toBe(201)
      for (const p of res.json().pulls) {
        elements.push(p.card.element)
      }
    }
    expect(elements).toHaveLength(20)
    expect(elements).not.toContain('LIGHT')
    expect(elements).not.toContain('DARK')
  })

  it('GET /pulls/rates — le pct COMMON est inchangé par la création des cartes astrales', async () => {
    const res = await app.inject({ method: 'GET', url: '/pulls/rates' })
    expect(res.statusCode).toBe(200)
    const common = res
      .json()
      .rates.find((r: { rarity: string }) => r.rarity === 'COMMON')
    expect(common.pct).toBe(commonPctBeforeAstral)
  })

  it('GET /daily-shop — jamais un article LIGHT/DARK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/daily-shop',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const ids = res.json().items.map((i: { card: { id: string } }) => i.card.id)
    expect(ids).not.toContain(lightCardId)
    expect(ids).not.toContain(darkCardId)
  })

  it('GET /orders — les commandes générées ne référencent jamais une carte LIGHT/DARK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/orders',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const clientIds = res
      .json()
      .slots.filter((s: { order: unknown }) => s.order)
      .map((s: { order: { client: { id: string } } }) => s.order.client.id)
    expect(clientIds).not.toContain(lightCardId)
    expect(clientIds).not.toContain(darkCardId)
  })

  it('findActiveAstralInTx ne contient que LIGHT/DARK, et contient les deux cartes créées', async () => {
    const astral = await postgresOrm.executeWithTransactionClient((tx: unknown) =>
      cardRepository.findActiveAstralInTx(tx),
    )
    const ids = astral.map((c: { id: string }) => c.id)
    expect(ids).toContain(lightCardId)
    expect(ids).toContain(darkCardId)
    for (const card of astral) {
      expect(['LIGHT', 'DARK']).toContain(card.element)
    }
  })
})
