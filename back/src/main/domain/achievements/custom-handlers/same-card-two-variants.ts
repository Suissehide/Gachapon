import type { CustomHandler } from './index'

// Deux vernis sur une même carte : le NORMAL, implicite, plus au moins un autre.
export const sameCardTwoVariantsHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const withFinish = await tx.userCard.findFirst({
      where: { userId, finishes: { isEmpty: false } },
      select: { id: true },
    })
    return { unlocked: withFinish !== null }
  },
}
