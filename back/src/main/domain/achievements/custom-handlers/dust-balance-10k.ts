import type { CustomHandler } from './index'

export const dustBalance10kHandler: CustomHandler = {
  listensTo: ['REWARD_CLAIMED', 'CARD_RECYCLED'],
  async evaluate(tx, userId, _event) {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { dust: true },
    })
    return { unlocked: user.dust >= 10000 }
  },
}
