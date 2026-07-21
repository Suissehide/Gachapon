import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import {
  effectiveEquipmentBonuses,
  type Substat,
} from '../equipment/equipment-progression'
import { retryOnSerialization } from '../shared/retry-serialization'
import { computeFinalStats, type EquipmentBonuses } from './combat-stats.domain'
import { getPassive } from './passives'

const MAX_TEAM_SIZE = 3

export interface TeamUnit {
  userCardId: string
  cardId: string
  cardName: string
  cardImageUrl: string | null
  rarity: string
  variant: string
  level: number
  palier: number
  passiveKey: string | null
  passiveLabel: string | null
  stats: { hp: number; atk: number; def: number; spd: number }
}

export class CombatTeamTx {
  readonly #postgresOrm

  constructor({ postgresOrm }: IocContainer) {
    this.#postgresOrm = postgresOrm
  }

  getTeam(userId: string): Promise<{ team: TeamUnit[] }> {
    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const team = await this.#buildTeamView(tx, userId)
      return { team }
    })
  }

  setTeam(
    userId: string,
    userCardIds: string[],
  ): Promise<{ team: TeamUnit[] }> {
    if (userCardIds.length < 1 || userCardIds.length > MAX_TEAM_SIZE) {
      throw Boom.badRequest(
        `Team must contain 1 to ${MAX_TEAM_SIZE} cards (got ${userCardIds.length})`,
      )
    }
    const unique = new Set(userCardIds)
    if (unique.size !== userCardIds.length) {
      throw Boom.badRequest('Team cards must be distinct')
    }

    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const owned = await tx.userCard.findMany({
            where: { id: { in: userCardIds }, userId },
            select: { id: true },
          })
          if (owned.length !== userCardIds.length) {
            throw Boom.badRequest('One or more cards are not owned by the user')
          }

          await tx.user.update({
            where: { id: userId },
            data: { combatTeam: userCardIds },
          })

          const team = await this.#buildTeamView(tx, userId)
          return { team }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  async #buildTeamView(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<TeamUnit[]> {
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw Boom.notFound('User not found')
    }
    const userCardIds = user.combatTeam
    if (userCardIds.length === 0) {
      return []
    }
    // Include equipped UserEquipment so the preview matches what the campaign
    // simulator actually sees (otherwise the UI underreports gear bonuses).
    const userCards = await tx.userCard.findMany({
      where: { id: { in: userCardIds }, userId },
      include: {
        card: true,
        equipment: { include: { equipment: true } },
      },
    })
    const byId = new Map(userCards.map((uc) => [uc.id, uc]))
    return userCardIds
      .map((id) => byId.get(id))
      .filter((uc): uc is NonNullable<typeof uc> => uc != null)
      .map((uc) => {
        const equipmentBonuses: EquipmentBonuses[] = uc.equipment.map(
          (ue) =>
            effectiveEquipmentBonuses(
              (ue.equipment.bonuses ?? {}) as Record<string, number>,
              ue.level,
              (ue.substats ?? []) as unknown as Substat[],
              ue.baseBoost,
            ) as EquipmentBonuses,
        )
        const stats = computeFinalStats({
          baseHp: uc.card.baseHp,
          baseAtk: uc.card.baseAtk,
          baseDef: uc.card.baseDef,
          baseSpd: uc.card.baseSpd,
          level: uc.level,
          palier: uc.palier,
          variant: uc.variant,
          equipment: equipmentBonuses,
        })
        const passive = getPassive(uc.card.passiveKey)
        return {
          userCardId: uc.id,
          cardId: uc.cardId,
          cardName: uc.card.name,
          cardImageUrl: uc.card.imageUrl,
          rarity: uc.card.rarity,
          variant: uc.variant,
          level: uc.level,
          palier: uc.palier,
          passiveKey: uc.card.passiveKey,
          passiveLabel: passive?.label ?? null,
          stats,
        }
      })
  }
}
