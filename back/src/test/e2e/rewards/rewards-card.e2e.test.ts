import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E: claiming a reward that carries a `cardRarity` grants a random active
 * card of that rarity (NORMAL variant) and returns it in the claim response
 * so the front can play the reveal. Also checks the pending payload exposes
 * `cardRarity`.
 */
describe('Rewards card grant e2e', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let setId: string
  let cardId: string
  let imageKey: string
  const rewardIds: string[] = []

  const suffix = Date.now()
  const email = `cardreward${suffix}@test.com`
  const password = 'Password123!'
  const username = `cardrewarduser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(regRes.statusCode).toBe(201)

    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string

    // Active set + a single EPIC card so the grant is deterministic.
    // Other e2e files may have left active EPIC cards behind (shared DB,
    // single TRUNCATE per run) — deactivate their sets so the random pick
    // in the card grant can only land on ours.
    await postgresOrm.prisma.cardSet.updateMany({
      data: { isActive: false },
    })
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `Card reward set ${suffix}`, isActive: true },
    })
    setId = set.id
    const card = await postgresOrm.prisma.card.create({
      data: {
        setId: set.id,
        name: `Reward EPIC ${suffix}`,
        rarity: 'EPIC',
        // Cards store a storage key; the route must resolve it to a public URL.
        imageUrl: `cards/epic-${suffix}.png`,
      },
    })
    cardId = card.id
    imageKey = card.imageUrl as string

    // Reward granting an EPIC card, assigned as a pending achievement reward.
    const reward = await postgresOrm.prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0, gold: 0, cardRarity: 'EPIC' },
    })
    rewardIds.push(reward.id)
    await postgresOrm.prisma.userReward.create({
      data: {
        userId,
        rewardId: reward.id,
        source: 'ACHIEVEMENT',
        sourceId: `card-reward-${suffix}`,
      },
    })
  })

  afterAll(async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userReward.deleteMany({ where: { userId } })
    await postgresOrm.prisma.userCard.deleteMany({ where: { userId } })
    if (rewardIds.length > 0) {
      await postgresOrm.prisma.reward.deleteMany({
        where: { id: { in: rewardIds } },
      })
    }
    await postgresOrm.prisma.card.deleteMany({ where: { setId } })
    await postgresOrm.prisma.cardSet.deleteMany({ where: { id: setId } })
    await app.close()
  })

  it('GET /rewards/pending — expose cardRarity du reward', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/rewards/pending',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const cardReward = body.find(
      (r: { reward: { cardRarity?: string | null } }) =>
        r.reward.cardRarity === 'EPIC',
    )
    expect(cardReward).toBeTruthy()
  })

  it('POST /rewards/claim-all — accorde la carte et la retourne', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const res = await app.inject({
      method: 'POST',
      url: '/rewards/claim-all',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()

    // Claim response carries the granted card for the reveal.
    expect(Array.isArray(body.cards)).toBe(true)
    expect(body.cards).toHaveLength(1)
    expect(body.cards[0].card.id).toBe(cardId)
    expect(body.cards[0].card.rarity).toBe('EPIC')
    expect(body.cards[0].card.variant).toBe('NORMAL')

    // imageUrl must be the resolved public URL, not the raw storage key, so
    // the front reveal shows the art instead of the not-found placeholder.
    const { storageClient } = (app as any).iocContainer
    expect(body.cards[0].card.imageUrl).toBe(storageClient.publicUrl(imageKey))
    expect(body.cards[0].card.imageUrl).not.toBe(imageKey)

    // The card is actually in the user's collection now.
    const owned = await postgresOrm.prisma.userCard.findFirst({
      where: { userId, cardId, variant: 'NORMAL' },
    })
    expect(owned).toBeTruthy()
    expect(owned!.quantity).toBe(1)
  })
})
