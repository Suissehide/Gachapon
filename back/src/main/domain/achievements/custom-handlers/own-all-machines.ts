import type { CustomHandler } from './index'

export const ownAllMachinesHandler: CustomHandler = {
  listensTo: ['MACHINE_PURCHASED'],
  async evaluate(tx, userId, _event) {
    const [totalMachines, ownedMachines] = await Promise.all([
      tx.shopItem.count({ where: { type: 'MACHINE' } }),
      tx.purchase.count({
        where: { userId, shopItem: { type: 'MACHINE' } },
      }),
    ])
    return { unlocked: totalMachines > 0 && ownedMachines >= totalMachines }
  },
}
