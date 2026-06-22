import type { CustomHandler } from './index'

export const firstPullEverHandler: CustomHandler = {
  listensTo: ['PULL_COMPLETED'],
  async evaluate(tx, userId, _event) {
    const count = await tx.userCard.count({ where: { userId } })
    return { unlocked: count === 1 }
  },
}
