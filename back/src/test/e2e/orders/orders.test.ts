import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { randomTestIpv6 } from '../../helpers/guest'

describe('Orders routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  const suffix = Date.now()

  // Le fichier enregistre et connecte plus de comptes que les quotas de
  // /auth/register et /auth/login : une IP distincte par appel évite de se
  // faire bloquer par son propre test.
  async function registerUser(name: string) {
    const email = `${name}${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { username: `${name}${suffix}`, email, password: 'Password123!' },
    })
    const user = await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: { email, password: 'Password123!' },
    })
    return { id: user.id as string, cookie: login.headers['set-cookie'] as string }
  }

  const getBoard = (cookie: string) =>
    app.inject({ method: 'GET', url: '/orders', headers: { cookie } })

  /** Remet le comptoir du joueur à zéro et lui pose une commande connue. */
  async function seedOrder(userId: string, lines: unknown, clientCardId: string, slot = 0) {
    await prisma.customerOrder.deleteMany({ where: { userId } })
    return prisma.customerOrder.create({
      data: { userId, slot, clientCardId, lines, rewardDust: 260, rewardGold: 1280, rewardTokens: 1 },
    })
  }

  let rareWater: { id: string; setId: string }

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma
    const set = await prisma.cardSet.create({
      data: { nameFr: `OrdersSet${suffix}`, nameEn: `OrdersSet${suffix}`, isActive: true },
    })
    rareWater = await prisma.card.create({
      data: { setId: set.id, nameFr: `RW${suffix}`, nameEn: `RW${suffix}`, rarity: 'RARE', element: 'WATER' },
    })
    // Une commande libre est plafonnée à la rareté max possédée (COMMON pour
    // un joueur neuf) : sans carte COMMON dans le catalogue actif, aucune
    // commande libre n'est jamais générable (voir order-generation.ts).
    await prisma.card.create({
      data: { setId: set.id, nameFr: `CC${suffix}`, nameEn: `CC${suffix}`, rarity: 'COMMON', element: 'EARTH' },
    })
  })

  afterAll(() => app.close())

  it('GET /orders — génère 3 emplacements, idempotent', async () => {
    const { cookie } = await registerUser('ordboard')
    const first = await getBoard(cookie)
    expect(first.statusCode).toBe(200)
    const body = first.json()
    expect(body.slots).toHaveLength(3)
    expect(body.deliveriesLeft).toBe(4)
    expect(body.freeDismissAvailable).toBe(true)
    const ids = body.slots.map((s: any) => s.order?.id)
    expect(ids.every(Boolean)).toBe(true)
    expect((await getBoard(cookie)).json().slots.map((s: any) => s.order?.id)).toEqual(ids)
  })

  it('GET /orders — pas de doublon sur un emplacement après des GET concurrents', async () => {
    const { id, cookie } = await registerUser('ordrace')
    await Promise.all(Array.from({ length: 5 }, () => getBoard(cookie)))
    const open = await prisma.customerOrder.groupBy({
      by: ['slot'],
      where: { userId: id, status: 'OPEN' },
      _count: true,
    })
    expect(open).toHaveLength(3)
    expect(open.every((g: any) => g._count === 1)).toBe(true)
  })

  it('POST deliver — crédite les soldes et décrémente les doublons', async () => {
    const { id, cookie } = await registerUser('orddeliver')
    const uc = await prisma.userCard.create({ data: { userId: id, cardId: rareWater.id, quantity: 3 } })
    const order = await seedOrder(id, [{ quantity: 2, rarity: 'RARE', element: 'WATER' }], rareWater.id)
    const before = await prisma.user.findUnique({ where: { id } })

    const board = (await getBoard(cookie)).json()
    const view = board.slots[0].order
    expect(view.deliverable).toBe(true)
    expect(view.lines[0].candidates[0]).toMatchObject({ userCardId: uc.id, available: 2, setName: `OrdersSet${suffix}` })

    const res = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie },
      payload: { picks: view.suggestedPicks },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().reward).toEqual({ dust: 260, gold: 1280, tokens: 1 })

    const after = await prisma.user.findUnique({ where: { id } })
    expect(after.dust - before.dust).toBe(260)
    expect(after.gold - before.gold).toBe(1280)
    expect(after.tokens - before.tokens).toBe(1)
    expect((await prisma.userCard.findUnique({ where: { id: uc.id } })).quantity).toBe(1)

    // Review Focus 4 : seconde livraison de la même commande → 409, rien recrédité.
    const again = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie },
      payload: { picks: view.suggestedPicks },
    })
    expect(again.statusCode).toBe(409)
    expect((await prisma.user.findUnique({ where: { id } })).dust).toBe(after.dust)

    // L'emplacement livré affiche un compte à rebours.
    const slot0 = (await getBoard(cookie)).json().slots[0]
    expect(slot0.order).toBeNull()
    expect(new Date(slot0.nextAt).getTime()).toBeGreaterThan(Date.now())
  })

  // Revue finale #1 : la régénération en attente est matérialisée avant le
  // crédit, sinon le plafond de calculateTokens avale les jetons livrés.
  it('POST deliver — les jetons livrés s’ajoutent à la réserve régénérée', async () => {
    const { id, cookie } = await registerUser('ordregen')
    const uc = await prisma.userCard.create({ data: { userId: id, cardId: rareWater.id, quantity: 2 } })
    const order = await seedOrder(id, [{ quantity: 1, rarity: 'RARE' }], rareWater.id)
    await prisma.user.update({
      where: { id },
      data: { tokens: 1, lastTokenAt: new Date(Date.now() - 2 * 24 * 3600_000) },
    })
    const { tokenMaxStock } = await (app as any).iocContainer.configService.getMany('tokenMaxStock')

    const res = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie },
      payload: { picks: [{ lineIndex: 0, userCardId: uc.id, amount: 1 }] },
    })
    expect(res.statusCode).toBe(200)
    const after = await prisma.user.findUnique({ where: { id } })
    expect(after.tokens).toBe(tokenMaxStock + 1)
    expect(Date.now() - after.lastTokenAt.getTime()).toBeLessThan(60_000)
  })

  // Revue finale #2 : une carte comptée dans un duel actif est verrouillée,
  // comme pour le recyclage et l'ascension.
  it('POST deliver — refuse une carte engagée dans un duel actif, absente des candidats', async () => {
    const { id, cookie } = await registerUser('ordduel')
    const rival = await registerUser('ordrival')
    const uc = await prisma.userCard.create({ data: { userId: id, cardId: rareWater.id, quantity: 3 } })
    const order = await seedOrder(id, [{ quantity: 1, rarity: 'RARE' }], rareWater.id)
    const team = await prisma.team.create({
      data: { name: `OrdDuel${suffix}`, slug: `ord-duel-${suffix}`, ownerId: id },
    })
    await prisma.duel.create({
      data: {
        teamId: team.id,
        challengerId: id,
        opponentId: rival.id,
        status: 'ACTIVE',
        pullCount: 2,
        acceptedAt: new Date(Date.now() - 3600_000),
        deadlineAt: new Date(Date.now() + 3600_000),
      },
    })
    await prisma.gachaPull.create({ data: { userId: id, cardId: rareWater.id } })

    const view = (await getBoard(cookie)).json().slots[0].order
    expect(view.lines[0].candidates).toEqual([])
    expect(view.deliverable).toBe(false)

    const res = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie },
      payload: { picks: [{ lineIndex: 0, userCardId: uc.id, amount: 1 }] },
    })
    expect(res.statusCode).toBe(409)
    expect((await prisma.userCard.findUnique({ where: { id: uc.id } })).quantity).toBe(3)
  })

  it('POST deliver — refuse de consommer le dernier exemplaire', async () => {
    const { id, cookie } = await registerUser('ordlast')
    const uc = await prisma.userCard.create({ data: { userId: id, cardId: rareWater.id, quantity: 2 } })
    const order = await seedOrder(id, [{ quantity: 2, rarity: 'RARE' }], rareWater.id)
    const res = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie },
      payload: { picks: [{ lineIndex: 0, userCardId: uc.id, amount: 2 }] },
    })
    expect(res.statusCode).toBe(400)
    expect((await prisma.userCard.findUnique({ where: { id: uc.id } })).quantity).toBe(2)
  })

  // Review Focus 2 : plafond atteint avec une commande encore ouverte.
  it('POST deliver — refuse au-delà du plafond du jour, sans générer', async () => {
    const { id, cookie } = await registerUser('ordcap')
    const uc = await prisma.userCard.create({ data: { userId: id, cardId: rareWater.id, quantity: 5 } })
    const order = await seedOrder(id, [{ quantity: 1, rarity: 'RARE' }], rareWater.id)
    await prisma.customerOrder.createMany({
      data: Array.from({ length: 4 }, () => ({
        userId: id, slot: 2, clientCardId: rareWater.id, lines: [], rewardDust: 0, rewardGold: 0, rewardTokens: 0,
        status: 'DELIVERED', closedAt: new Date(),
      })),
    })
    const board = (await getBoard(cookie)).json()
    expect(board.deliveriesLeft).toBe(0)
    expect(board.slots[1].order).toBeNull()
    expect(board.slots[1].nextAt).toBeNull()
    expect(board.slots[0].order.id).toBe(order.id)
    const res = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie },
      payload: { picks: [{ lineIndex: 0, userCardId: uc.id, amount: 1 }] },
    })
    expect(res.statusCode).toBe(409)
  })

  it('POST dismiss — gratuit puis payant', async () => {
    const { id, cookie } = await registerUser('orddismiss')
    await getBoard(cookie)
    const first = await prisma.customerOrder.findFirst({ where: { userId: id, slot: 0, status: 'OPEN' } })
    const r1 = await app.inject({ method: 'POST', url: `/orders/${first.id}/dismiss`, headers: { cookie } })
    expect(r1.json()).toEqual({ free: true })
    const afterFree = (await getBoard(cookie)).json()
    expect(afterFree.slots[0].order).not.toBeNull()
    expect(afterFree.freeDismissAvailable).toBe(false)

    const second = afterFree.slots[0].order.id
    const r2 = await app.inject({ method: 'POST', url: `/orders/${second}/dismiss`, headers: { cookie } })
    expect(r2.json()).toEqual({ free: false })
    const afterPaid = (await getBoard(cookie)).json()
    expect(afterPaid.slots[0].order).toBeNull()
    expect(afterPaid.slots[0].nextAt).not.toBeNull()

    // Review Focus 4 : congédier une commande déjà close → 409.
    const r3 = await app.inject({ method: 'POST', url: `/orders/${second}/dismiss`, headers: { cookie } })
    expect(r3.statusCode).toBe(409)
  })

  // Review Focus 5 : la commande d'un autre joueur est introuvable.
  it('POST deliver/dismiss — 404 sur la commande d’un autre joueur', async () => {
    const owner = await registerUser('ordowner')
    const intruder = await registerUser('ordintruder')
    const order = await seedOrder(owner.id, [{ quantity: 1, rarity: 'RARE' }], rareWater.id)
    const d = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/dismiss`,
      headers: { cookie: intruder.cookie },
    })
    expect(d.statusCode).toBe(404)
    const v = await app.inject({
      method: 'POST',
      url: `/orders/${order.id}/deliver`,
      headers: { cookie: intruder.cookie },
      payload: { picks: [] },
    })
    expect(v.statusCode).toBe(404)
  })

  // Review Focus 3 : un invité sans aucune carte a un comptoir.
  it('GET /orders — accessible à un invité sans carte', async () => {
    const guest = await app.inject({ method: 'POST', url: '/auth/guest', payload: {} })
    const cookie = guest.headers['set-cookie'] as string
    const res = await getBoard(cookie)
    expect(res.statusCode).toBe(200)
    for (const s of res.json().slots) {
      for (const l of s.order?.lines ?? []) {
        expect(l.rarity).toBe('COMMON')
      }
    }
  })

  it('GET /economy/config — expose les réglages du comptoir', async () => {
    const res = await app.inject({ method: 'GET', url: '/economy/config' })
    expect(res.json().orders).toEqual({ slots: 3, cooldownMinutes: 240, dailyCap: 4, freeDismissPerDay: 1 })
  })
})
