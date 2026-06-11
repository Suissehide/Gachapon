import type { CustomHandler } from './index'

export const sameCardTwoVariantsHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const rows = await tx.userCard.findMany({
      where: { userId },
      select: { cardId: true, variant: true },
    })
    const variantsPerCard = new Map<string, Set<string>>()
    for (const r of rows) {
      const set = variantsPerCard.get(r.cardId) ?? new Set<string>()
      set.add(r.variant)
      variantsPerCard.set(r.cardId, set)
    }
    const unlocked = [...variantsPerCard.values()].some((s) => s.size >= 2)
    return { unlocked }
  },
}
