import Boom from '@hapi/boom'

import type { Prisma } from '../../../generated/client'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  EQUIP_MAX_LEVEL,
  isSubstatMilestone,
  type MilestoneResult,
  rollMilestone,
  type Substat,
  type SubstatRanges,
  upgradeGoldCost,
} from './equipment-progression'

const RARITY_MULT_KEY = {
  COMMON: 'card.rarityMultCommon',
  UNCOMMON: 'card.rarityMultUncommon',
  RARE: 'card.rarityMultRare',
  EPIC: 'card.rarityMultEpic',
  LEGENDARY: 'card.rarityMultLegendary',
} as const

export interface EquipmentInstanceView {
  id: string // UserEquipment.id
  equipmentId: string // Equipment.id (catalog)
  name: string
  slot: 'WEAPON' | 'ARMOR' | 'ACCESSORY'
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  imageUrl: string | null
  bonuses: Record<string, number>
  level: number
  substats: Substat[]
  equippedOnId: string | null // UserCard.id when equipped
  equippedOnCardName: string | null
  obtainedAt: string // ISO
}

export interface EquipmentUpgradeResult {
  level: number
  substats: Substat[]
  goldSpent: number
  newGold: number
  milestone: MilestoneResult | null
}

export class EquipmentDomain {
  readonly #postgresOrm: PostgresOrm
  readonly #configService: ConfigServiceInterface

  constructor({
    postgresOrm,
    configService,
  }: Pick<IocContainer, 'postgresOrm' | 'configService'>) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  /**
   * List all UserEquipment items owned by the user.
   */
  async listUserEquipment(
    userId: string,
  ): Promise<{ items: EquipmentInstanceView[] }> {
    const userEquipment = await this.#postgresOrm.prisma.userEquipment.findMany(
      {
        where: { userId },
        include: {
          equipment: true,
          equippedOn: { include: { card: true } },
        },
        orderBy: { obtainedAt: 'desc' },
      },
    )

    return {
      items: userEquipment.map((ue) => ({
        id: ue.id,
        equipmentId: ue.equipmentId,
        name: ue.equipment.name,
        slot: ue.equipment.slot,
        rarity: ue.equipment.rarity,
        imageUrl: ue.equipment.imageUrl,
        bonuses: (ue.equipment.bonuses ?? {}) as Record<string, number>,
        level: ue.level,
        substats: (ue.substats ?? []) as unknown as Substat[],
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
  equip(
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
  unequip(
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
  grantToUser(
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

  /**
   * Monte l'instance d'un niveau (coût en or). Aux paliers de 3, ajoute ou
   * améliore une sous-stat aléatoire (RNG serveur).
   */
  async upgrade(
    userId: string,
    userEquipmentId: string,
  ): Promise<EquipmentUpgradeResult> {
    const c = await this.#configService.getMany(
      'equip.goldCostBase',
      'equip.goldCostExp',
      'card.rarityMultCommon',
      'card.rarityMultUncommon',
      'card.rarityMultRare',
      'card.rarityMultEpic',
      'card.rarityMultLegendary',
      'equip.substatHpFlatMin',
      'equip.substatHpFlatMax',
      'equip.substatAtkFlatMin',
      'equip.substatAtkFlatMax',
      'equip.substatDefFlatMin',
      'equip.substatDefFlatMax',
      'equip.substatSpdFlatMin',
      'equip.substatSpdFlatMax',
      'equip.substatPctMin',
      'equip.substatPctMax',
    )
    const pct = { min: c['equip.substatPctMin'], max: c['equip.substatPctMax'] }
    const ranges: SubstatRanges = {
      hpFlat: {
        min: c['equip.substatHpFlatMin'],
        max: c['equip.substatHpFlatMax'],
      },
      atkFlat: {
        min: c['equip.substatAtkFlatMin'],
        max: c['equip.substatAtkFlatMax'],
      },
      defFlat: {
        min: c['equip.substatDefFlatMin'],
        max: c['equip.substatDefFlatMax'],
      },
      spdFlat: {
        min: c['equip.substatSpdFlatMin'],
        max: c['equip.substatSpdFlatMax'],
      },
      hpPct: pct,
      atkPct: pct,
      defPct: pct,
      spdPct: pct,
    }

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
          if (ue.level >= EQUIP_MAX_LEVEL) {
            throw Boom.badRequest('Équipement déjà au niveau maximum')
          }
          const rarityMult = c[RARITY_MULT_KEY[ue.equipment.rarity]]
          const cost = upgradeGoldCost(
            ue.level,
            c['equip.goldCostBase'],
            c['equip.goldCostExp'],
            rarityMult,
          )
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { gold: true },
          })
          if (!user || user.gold < cost) {
            throw Boom.badRequest("Pas assez d'or")
          }

          const newLevel = ue.level + 1
          let substats = (ue.substats ?? []) as unknown as Substat[]
          let milestone: MilestoneResult | null = null
          if (isSubstatMilestone(newLevel)) {
            const rolled = rollMilestone(substats, ranges, Math.random)
            substats = rolled.substats
            milestone = rolled.milestone
          }

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { gold: { decrement: cost } },
            select: { gold: true },
          })
          await tx.userEquipment.update({
            where: { id: ue.id },
            data: {
              level: newLevel,
              substats: substats as unknown as Prisma.InputJsonValue,
            },
          })

          return {
            level: newLevel,
            substats,
            goldSpent: cost,
            newGold: updatedUser.gold,
            milestone,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }
}
