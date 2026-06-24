import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import { retryOnSerialization } from '../shared/retry-serialization'

export interface EquipmentInstanceView {
  id: string // UserEquipment.id
  equipmentId: string // Equipment.id (catalog)
  name: string
  slot: 'WEAPON' | 'ARMOR' | 'ACCESSORY'
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  imageUrl: string | null
  bonuses: Record<string, number>
  equippedOnId: string | null // UserCard.id when equipped
  equippedOnCardName: string | null
  obtainedAt: string // ISO
}

export class EquipmentDomain {
  readonly #postgresOrm: PostgresOrm

  constructor({ postgresOrm }: Pick<IocContainer, 'postgresOrm'>) {
    this.#postgresOrm = postgresOrm
  }

  /**
   * List all UserEquipment items owned by the user.
   */
  async listUserEquipment(
    userId: string,
  ): Promise<{ items: EquipmentInstanceView[] }> {
    const userEquipment = await this.#postgresOrm.prisma.userEquipment.findMany({
      where: { userId },
      include: {
        equipment: true,
        equippedOn: { include: { card: true } },
      },
      orderBy: { obtainedAt: 'desc' },
    })

    return {
      items: userEquipment.map((ue) => ({
        id: ue.id,
        equipmentId: ue.equipmentId,
        name: ue.equipment.name,
        slot: ue.equipment.slot,
        rarity: ue.equipment.rarity,
        imageUrl: ue.equipment.imageUrl,
        bonuses: ((ue.equipment.bonuses ?? {}) as Record<string, number>),
        equippedOnId: ue.equippedOnId,
        equippedOnCardName: ue.equippedOn?.card?.name ?? null,
        obtainedAt: ue.obtainedAt.toISOString(),
      })),
    }
  }

  /**
   * Equip a UserEquipment on a UserCard. If the target slot is already occupied
   * on that card, the previous equipment is unequipped first.
   */
  async equip(
    userId: string,
    userEquipmentId: string,
    targetUserCardId: string,
  ): Promise<{ equippedOnId: string; previouslyEquippedId: string | null }> {
    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const ue = await tx.userEquipment.findUnique({
            where: { id: userEquipmentId },
            include: { equipment: true },
          })
          if (!ue || ue.userId !== userId) {
            throw Boom.notFound('UserEquipment not found')
          }
          const card = await tx.userCard.findUnique({
            where: { id: targetUserCardId },
          })
          if (!card || card.userId !== userId) {
            throw Boom.notFound('UserCard not found')
          }

          const occupant = await tx.userEquipment.findFirst({
            where: {
              userId,
              equippedOnId: targetUserCardId,
              equipment: { slot: ue.equipment.slot },
              NOT: { id: ue.id },
            },
          })
          if (occupant) {
            await tx.userEquipment.update({
              where: { id: occupant.id },
              data: { equippedOnId: null },
            })
          }

          await tx.userEquipment.update({
            where: { id: ue.id },
            data: { equippedOnId: targetUserCardId },
          })

          return {
            equippedOnId: targetUserCardId,
            previouslyEquippedId: occupant?.id ?? null,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  /**
   * Unequip a UserEquipment.
   */
  async unequip(
    userId: string,
    userEquipmentId: string,
  ): Promise<{ unequipped: boolean }> {
    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const ue = await tx.userEquipment.findUnique({
            where: { id: userEquipmentId },
          })
          if (!ue || ue.userId !== userId) {
            throw Boom.notFound('UserEquipment not found')
          }
          if (ue.equippedOnId === null) {
            return { unequipped: false }
          }
          await tx.userEquipment.update({
            where: { id: ue.id },
            data: { equippedOnId: null },
          })
          return { unequipped: true }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  /**
   * Admin / test helper: grants a UserEquipment to the user from the catalog.
   * If equipmentId is omitted, picks a random catalog entry.
   */
  async grantToUser(
    userId: string,
    equipmentId?: string,
  ): Promise<{ userEquipmentId: string; equipmentName: string }> {
    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      let chosenId = equipmentId
      if (!chosenId) {
        const all = await tx.equipment.findMany({ select: { id: true } })
        if (all.length === 0) {
          throw Boom.notFound('No equipment catalog seeded')
        }
        const picked = all[Math.floor(Math.random() * all.length)]
        if (!picked) {
          throw Boom.notFound('No equipment catalog seeded')
        }
        chosenId = picked.id
      }
      const catalog = await tx.equipment.findUnique({
        where: { id: chosenId },
      })
      if (!catalog) {
        throw Boom.notFound('Equipment not found')
      }
      const ue = await tx.userEquipment.create({
        data: {
          userId,
          equipmentId: catalog.id,
        },
      })
      return { userEquipmentId: ue.id, equipmentName: catalog.name }
    })
  }
}
