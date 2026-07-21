import Boom from '@hapi/boom'

import type { Prisma } from '../../../generated/client'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  EQUIP_MAX_LEVEL,
  isSubstatMilestone,
  MAX_SUBSTATS_BY_RARITY,
  type MilestoneResult,
  rollInitialSubstats,
  rollMilestone,
  SUBSTAT_KEYS,
  SUBSTAT_RANGE_CONFIG_KEYS,
  type Substat,
  type SubstatKey,
  type SubstatRanges,
  substatRangesFromConfig,
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
  baseBoost: number
  equippedOnId: string | null // UserCard.id when equipped
  equippedOnCardName: string | null
  obtainedAt: string // ISO
}

export interface EquipmentUpgradeResult {
  level: number
  substats: Substat[]
  baseBoost: number
  goldSpent: number
  newGold: number
  milestone: MilestoneResult | null
}

export interface EquipmentSalvageResult {
  goldEarned: number
  newGold: number
  destroyedCount: number
}

const SALVAGE_GOLD_KEY = {
  COMMON: 'equip.salvageGoldCommon',
  UNCOMMON: 'equip.salvageGoldUncommon',
  RARE: 'equip.salvageGoldRare',
  EPIC: 'equip.salvageGoldEpic',
  LEGENDARY: 'equip.salvageGoldLegendary',
} as const

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
        baseBoost: ue.baseBoost,
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

  async #getSubstatRanges(): Promise<SubstatRanges> {
    const c = await this.#configService.getMany(...SUBSTAT_RANGE_CONFIG_KEYS)
    return substatRangesFromConfig(c)
  }

  /**
   * Admin / test helper: grants a UserEquipment to the user from the catalog.
   * If equipmentId is omitted, picks a random catalog entry. Les sous-stats
   * initiales sont tirées selon la rareté.
   */
  async grantToUser(
    userId: string,
    equipmentId?: string,
  ): Promise<{ userEquipmentId: string; equipmentName: string }> {
    const ranges = await this.#getSubstatRanges()
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
          substats: rollInitialSubstats(
            MAX_SUBSTATS_BY_RARITY[catalog.rarity],
            ranges,
            Math.random,
          ) as unknown as Prisma.InputJsonValue,
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
    const ranges = substatRangesFromConfig(c)

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
          this.#assertGold(user?.gold, cost)

          const newLevel = ue.level + 1
          const catalogBonuses = (ue.equipment.bonuses ?? {}) as Record<
            string,
            number
          >
          let substats = (ue.substats ?? []) as unknown as Substat[]
          let baseBoost = ue.baseBoost
          let milestone: MilestoneResult | null = null
          if (isSubstatMilestone(newLevel)) {
            const rolled = this.#resolveMilestone(
              substats,
              baseBoost,
              catalogBonuses,
              MAX_SUBSTATS_BY_RARITY[ue.equipment.rarity],
              ranges,
            )
            substats = rolled.substats
            baseBoost = rolled.baseBoost
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
              baseBoost,
            },
          })

          return {
            level: newLevel,
            substats,
            baseBoost,
            goldSpent: cost,
            newGold: updatedUser.gold,
            milestone,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  #assertGold(gold: number | undefined, cost: number): void {
    if (gold === undefined || gold < cost) {
      throw Boom.badRequest("Pas assez d'or")
    }
  }

  #resolveMilestone(
    substats: Substat[],
    baseBoost: number,
    catalogBonuses: Record<string, number>,
    maxSubstats: number,
    ranges: SubstatRanges,
  ): { substats: Substat[]; baseBoost: number; milestone: MilestoneResult } {
    const baseKey = Object.keys(catalogBonuses)[0] as SubstatKey | undefined
    if (baseKey === undefined || !SUBSTAT_KEYS.includes(baseKey)) {
      throw Boom.badImplementation('Équipement sans bonus de base valide')
    }
    return rollMilestone(
      substats,
      maxSubstats,
      baseKey,
      baseBoost,
      ranges,
      Math.random,
    )
  }

  /**
   * Détruit des objets non équipés contre de l'or (selon la rareté).
   * Tout ou rien : la moindre violation annule l'ensemble.
   */
  async salvage(
    userId: string,
    userEquipmentIds: string[],
  ): Promise<EquipmentSalvageResult> {
    const c = await this.#configService.getMany(
      'equip.salvageGoldCommon',
      'equip.salvageGoldUncommon',
      'equip.salvageGoldRare',
      'equip.salvageGoldEpic',
      'equip.salvageGoldLegendary',
    )
    const ids = [...new Set(userEquipmentIds)]

    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const items = await tx.userEquipment.findMany({
            where: { id: { in: ids } },
            include: { equipment: true },
          })
          if (
            items.length !== ids.length ||
            items.some((i) => i.userId !== userId)
          ) {
            throw Boom.notFound('UserEquipment not found')
          }
          if (items.some((i) => i.equippedOnId !== null)) {
            throw Boom.badRequest('Impossible de détruire un objet équipé')
          }
          const goldEarned = items.reduce(
            (sum, i) => sum + c[SALVAGE_GOLD_KEY[i.equipment.rarity]],
            0,
          )
          await tx.userEquipment.deleteMany({ where: { id: { in: ids } } })
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { gold: { increment: goldEarned } },
            select: { gold: true },
          })
          return {
            goldEarned,
            newGold: updatedUser.gold,
            destroyedCount: items.length,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }
}
