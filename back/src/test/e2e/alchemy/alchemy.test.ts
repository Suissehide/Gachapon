import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { mondayOfUtcWeek } from '../../../main/domain/quests/quest-matching'
import { buildTestApp } from '../../helpers/build-test-app'
import { createGuest, randomTestIpv6 } from '../../helpers/guest'

const periodKey = mondayOfUtcWeek(new Date())

describe('Alchemy routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  // biome-ignore lint/suspicious/noExplicitAny: accès au cradle IoC comme les autres e2e
  let prisma: any
  const suffix = Date.now()

  // Même rengaine que orders.test.ts : une IP distincte par appel évite de
  // se faire bloquer par son propre test sur les quotas register/login.
  async function registerUser(name: string) {
    const email = `${name}${suffix}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { 'x-forwarded-for': randomTestIpv6() },
      payload: {
        username: `${name}${suffix}`,
        email,
        password: 'Password123!',
      },
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
    return { id: user.id as string, cookie: login.headers['set-cookie'] as string }
  }

  const getBoard = (cookie: string) =>
    app.inject({ method: 'GET', url: '/alchemy', headers: { cookie } })

  const transmute = (cookie: string, payload: unknown) =>
    app.inject({
      method: 'POST',
      url: '/alchemy/transmute',
      headers: { cookie },
      payload,
    })

  /** Donne à `userId` une pile NORMAL de `cardId` avec la quantité fournie. */
  const giveStack = (userId: string, cardId: string, quantity: number) =>
    prisma.userCard.create({ data: { userId, cardId, quantity } })

  let commonA: { id: string }
  let commonB: { id: string }
  let uncommonA: { id: string }
  let uncommonB: { id: string }
  let rareA: { id: string }
  let questId: string
  const questKey = `test_alchemy_recycle_${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma

    // QuestsDomain cache le pool de quêtes actives par periodKey (TTL 60 s),
    // vide au boot de l'app. La quête de test doit exister en base AVANT le
    // premier trackInTx (déclenché par la première transmutation), sans quoi
    // le pool mis en cache ne la verra jamais pendant toute la durée du run.
    const quest = await prisma.quest.create({
      data: {
        key: questKey,
        nameFr: 'Test Alchimiste',
        nameEn: 'Test Alchemist',
        descriptionFr: 'Test',
        descriptionEn: 'Test',
        period: 'WEEKLY',
        criterion: { event: 'CARD_RECYCLED', target: 20 },
        isActive: true,
      },
    })
    questId = quest.id

    const set = await prisma.cardSet.create({
      data: { nameFr: `AlchemySet${suffix}`, nameEn: `AlchemySet${suffix}`, isActive: true },
    })
    commonA = await prisma.card.create({
      data: { setId: set.id, nameFr: `AC1${suffix}`, nameEn: `AC1${suffix}`, rarity: 'COMMON', element: 'EARTH' },
    })
    commonB = await prisma.card.create({
      data: { setId: set.id, nameFr: `AC2${suffix}`, nameEn: `AC2${suffix}`, rarity: 'COMMON', element: 'WATER' },
    })
    // dropWeight écrasant : les tirages de cible UNCOMMON de ce test doivent
    // (quasi) toujours tomber sur ces deux cartes, dont la possession est
    // contrôlée par le test (Review Focus 3).
    uncommonA = await prisma.card.create({
      data: {
        setId: set.id, nameFr: `AU1${suffix}`, nameEn: `AU1${suffix}`, rarity: 'UNCOMMON', element: 'FIRE',
        dropWeight: 1_000_000,
      },
    })
    uncommonB = await prisma.card.create({
      data: {
        setId: set.id, nameFr: `AU2${suffix}`, nameEn: `AU2${suffix}`, rarity: 'UNCOMMON', element: 'LIGHT',
        dropWeight: 1_000_000,
      },
    })
    rareA = await prisma.card.create({
      data: { setId: set.id, nameFr: `AR1${suffix}`, nameEn: `AR1${suffix}`, rarity: 'RARE', element: 'EARTH' },
    })
  })

  afterAll(async () => {
    await prisma.userQuest.deleteMany({ where: { questId } })
    await prisma.quest.deleteMany({ where: { id: questId } })
    await app.close()
  })

  it('GET /alchemy — 4 crans C/U/R/E avec les coûts 5/6/8/6 ; cran C plein avec 7 doublons', async () => {
    const { id, cookie } = await registerUser('alcboard')
    await giveStack(id, commonA.id, 8) // available = 7

    const res = await getBoard(cookie)
    expect(res.statusCode).toBe(200)
    const tiers = res.json().tiers
    expect(tiers.map((t: any) => t.fromRarity)).toEqual(['COMMON', 'UNCOMMON', 'RARE', 'EPIC'])
    expect(tiers.map((t: any) => t.cost)).toEqual([5, 6, 8, 6])

    const common = tiers.find((t: any) => t.fromRarity === 'COMMON')
    expect(common.maxTransmutations).toBe(1)
    expect(common.suggestedPicks).not.toBeNull()
    const total = common.suggestedPicks.reduce((s: number, p: any) => s + p.amount, 0)
    expect(total).toBe(5)
  })

  it('POST /alchemy/transmute — COMMON avec les suggestedPicks consomme les doublons et rend une UNCOMMON', async () => {
    const { id, cookie } = await registerUser('alctrans')
    const stack = await giveStack(id, commonA.id, 6) // available = 5 = cost

    const board = (await getBoard(cookie)).json()
    const picks = board.tiers.find((t: any) => t.fromRarity === 'COMMON').suggestedPicks
    expect(picks).toEqual([{ userCardId: stack.id, amount: 5 }])

    const res = await transmute(cookie, { fromRarity: 'COMMON', picks })
    expect(res.statusCode).toBe(200)
    expect(res.json().card.rarity).toBe('UNCOMMON')

    expect((await prisma.userCard.findUnique({ where: { id: stack.id } })).quantity).toBe(1)
  })

  // Review Focus 3 : le joueur possède déjà toutes les UNCOMMON du set de
  // test en NORMAL — aucune erreur d'unicité, isNew cohérent (false).
  it('POST /alchemy/transmute — pas d’erreur d’unicité quand la cible cran est déjà possédée', async () => {
    const { id, cookie } = await registerUser('alcowned')
    await giveStack(id, commonB.id, 6) // available = 5 = cost
    await giveStack(id, uncommonA.id, 1)
    await giveStack(id, uncommonB.id, 1)

    const before = await prisma.userCard.findMany({
      where: { userId: id, card: { rarity: 'UNCOMMON' } },
    })
    const beforeTotal = before.reduce((s: number, u: any) => s + u.quantity, 0)

    const board = (await getBoard(cookie)).json()
    const picks = board.tiers.find((t: any) => t.fromRarity === 'COMMON').suggestedPicks

    const res = await transmute(cookie, { fromRarity: 'COMMON', picks })
    expect(res.statusCode).toBe(200)
    expect(res.json().card.rarity).toBe('UNCOMMON')
    expect(res.json().isNew).toBe(false)

    const after = await prisma.userCard.findMany({
      where: { userId: id, card: { rarity: 'UNCOMMON' } },
    })
    const afterTotal = after.reduce((s: number, u: any) => s + u.quantity, 0)
    expect(afterTotal - beforeTotal).toBe(1)
  })

  it('POST /alchemy/transmute — refuse de vider le dernier exemplaire, rien n’est consommé', async () => {
    const { id, cookie } = await registerUser('alclast')
    const stack = await giveStack(id, commonA.id, 5) // available = 4

    const res = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: stack.id, amount: 5 }],
    })
    expect(res.statusCode).toBe(400)
    expect((await prisma.userCard.findUnique({ where: { id: stack.id } })).quantity).toBe(5)
  })

  it('POST /alchemy/transmute — mauvaise rareté et mauvais total sont rejetés', async () => {
    const { id, cookie } = await registerUser('alcwrong')
    const common = await giveStack(id, commonA.id, 6) // available = 5
    const uncommon = await giveStack(id, uncommonA.id, 2) // available = 1

    const wrongRarity = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: uncommon.id, amount: 5 }],
    })
    expect(wrongRarity.statusCode).toBe(400)

    const wrongTotal = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: common.id, amount: 4 }],
    })
    expect(wrongTotal.statusCode).toBe(400)
  })

  // Review Focus 4 : rareté hors énum, carte d'un autre joueur, montant 0.
  it('POST /alchemy/transmute — LEGENDARY, carte d’un autre joueur et montant 0 sont rejetés', async () => {
    const { cookie } = await registerUser('alcbad4')
    const other = await registerUser('alcother4')
    const otherStack = await giveStack(other.id, commonA.id, 6)

    const legendary = await transmute(cookie, {
      fromRarity: 'LEGENDARY',
      picks: [{ userCardId: otherStack.id, amount: 5 }],
    })
    expect(legendary.statusCode).toBe(400)

    const foreignCard = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: otherStack.id, amount: 5 }],
    })
    expect(foreignCard.statusCode).toBe(400)

    const zeroAmount = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: otherStack.id, amount: 0 }],
    })
    expect(zeroAmount.statusCode).toBe(400)
  })

  it('POST /alchemy/transmute — carte engagée dans un duel actif : 409, absente des candidats', async () => {
    const { id, cookie } = await registerUser('alcduel')
    const rival = await registerUser('alcrival')
    const stack = await giveStack(id, commonA.id, 6) // available = 5
    const team = await prisma.team.create({
      data: { name: `AlcDuel${suffix}`, slug: `alc-duel-${suffix}`, ownerId: id },
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
    await prisma.gachaPull.create({ data: { userId: id, cardId: commonA.id } })

    const board = (await getBoard(cookie)).json()
    const common = board.tiers.find((t: any) => t.fromRarity === 'COMMON')
    expect(common.candidates.find((c: any) => c.userCardId === stack.id)).toBeUndefined()

    const res = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: stack.id, amount: 5 }],
    })
    expect(res.statusCode).toBe(409)
    expect((await prisma.userCard.findUnique({ where: { id: stack.id } })).quantity).toBe(6)
  })

  it('POST /alchemy/transmute — avance la quête hebdo « Alchimiste » (CARD_RECYCLED) de 5', async () => {
    const { id, cookie } = await registerUser('alcquest')
    const stack = await giveStack(id, commonA.id, 6) // available = 5

    const res = await transmute(cookie, {
      fromRarity: 'COMMON',
      picks: [{ userCardId: stack.id, amount: 5 }],
    })
    expect(res.statusCode).toBe(200)

    const uq = await prisma.userQuest.findFirst({
      where: { userId: id, questId, periodKey },
    })
    expect(uq).not.toBeNull()
    expect(uq.progress).toBe(5)
  })

  // Review Focus 2 : deux transmutations concurrentes sur une pile de 6
  // doublons (5 disponibles), 5 picks chacune — une seule réussit.
  it('POST /alchemy/transmute — une seule des deux transmutations concurrentes réussit', async () => {
    const { id, cookie } = await registerUser('alcrace')
    const stack = await giveStack(id, commonA.id, 6) // available = 5

    const payload = { fromRarity: 'COMMON', picks: [{ userCardId: stack.id, amount: 5 }] }
    const [r1, r2] = await Promise.all([transmute(cookie, payload), transmute(cookie, payload)])
    const statuses = [r1.statusCode, r2.statusCode].sort()
    expect(statuses).toEqual([200, 400])

    expect((await prisma.userCard.findUnique({ where: { id: stack.id } })).quantity).toBe(1)
  })

  // Review Focus 5 : aucune carte active à la rareté cible (EPIC) → 409,
  // ingrédients intacts. dropWeight EPIC restauré dans un finally.
  it('POST /alchemy/transmute — RARE refusé si aucune carte EPIC active n’est tirable', async () => {
    const { id, cookie } = await registerUser('alcnopool')
    const stack = await giveStack(id, rareA.id, 9) // available = 8 = cost RARE

    const epicCards = await prisma.card.findMany({
      where: { rarity: 'EPIC', set: { isActive: true } },
      select: { id: true, dropWeight: true },
    })
    await prisma.card.updateMany({
      where: { id: { in: epicCards.map((c: any) => c.id) } },
      data: { dropWeight: 0 },
    })

    try {
      const res = await transmute(cookie, {
        fromRarity: 'RARE',
        picks: [{ userCardId: stack.id, amount: 8 }],
      })
      expect(res.statusCode).toBe(409)
      expect((await prisma.userCard.findUnique({ where: { id: stack.id } })).quantity).toBe(9)
    } finally {
      for (const c of epicCards) {
        await prisma.card.update({ where: { id: c.id }, data: { dropWeight: c.dropWeight } })
      }
    }
  })

  it('GET /alchemy — accessible à un invité', async () => {
    const { res } = await createGuest(app)
    const cookie = res.headers['set-cookie'] as string
    const board = await getBoard(cookie)
    expect(board.statusCode).toBe(200)
  })

  it('GET /economy/config — expose le bloc alchemy', async () => {
    const res = await app.inject({ method: 'GET', url: '/economy/config' })
    expect(res.json().alchemy).toEqual({
      costCommon: 5,
      costUncommon: 6,
      costRare: 8,
      costEpic: 6,
    })
  })
})
