import type { CustomHandler } from './index'

const REQUIRED = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC'] as const

export const fourRaritiesOneDayHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const cardsToday = await tx.userCard.findMany({
      where: {
        userId,
        obtainedAt: { gte: startOfDay },
      },
      select: { card: { select: { rarity: true } } },
    })
    const raritiesToday = new Set(cardsToday.map((c) => c.card.rarity))
    const unlocked = REQUIRED.every((r) => raritiesToday.has(r))
    return { unlocked }
  },
}
