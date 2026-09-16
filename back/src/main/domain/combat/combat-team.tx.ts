import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { Substat } from '../equipment/equipment-progression'
import {
  SET_BONUS_CONFIG_KEYS,
  setBonusesFromConfig,
} from '../equipment/set-bonuses'
import { retryOnSerialization } from '../shared/retry-serialization'
import { CAMPAIGN_TEAM_KEY, COMBAT_TEAM_KEYS } from './combat-team-keys'
import { computeEquippedCardStats } from './equipped-card-stats'
import { getPassive } from './passives'
import { pickTeam, type ResolvedTeamIds } from './resolve-combat-team'

const MAX_TEAM_SIZE = 3

export interface TeamUnit {
  userCardId: string
  cardId: string
  cardName: string
  cardImageUrl: string | null
  element: string | null
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
  readonly #configService

  constructor({ postgresOrm, configService }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  /**
   * Résout l'équipe d'un mode DANS une transaction en cours — même motif que
   * `combatPointsTx.debitInTx`. Les domaines de combat tournent déjà dans
   * leur propre transaction sérialisable ; en ouvrir une seconde ici casserait
   * leur atomicité.
   */
  async resolveIdsInTx(
    tx: PrimaTransactionClient,
    userId: string,
    key: string,
  ): Promise<ResolvedTeamIds> {
    const rows = await tx.userCombatTeam.findMany({
      where: { userId, key: { in: [key, CAMPAIGN_TEAM_KEY] } },
      select: { key: true, userCardIds: true },
    })
    const modeRow = rows.find((r) => r.key === key) ?? null
    const campaignRow = rows.find((r) => r.key === CAMPAIGN_TEAM_KEY) ?? null
    return pickTeam(key, modeRow, campaignRow)
  }

  getResolved(
    userId: string,
    key: string,
  ): Promise<{ team: TeamUnit[]; inherited: boolean }> {
    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const { userCardIds, inherited } = await this.resolveIdsInTx(
        tx,
        userId,
        key,
      )
      const team = await this.#buildTeamView(tx, userId, userCardIds)
      return { team, inherited }
    })
  }

  /** Les six modes d'un coup — sert la vue d'ensemble du hub des tours. */
  getAllResolved(
    userId: string,
  ): Promise<Record<string, { team: TeamUnit[]; inherited: boolean }>> {
    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const out: Record<string, { team: TeamUnit[]; inherited: boolean }> = {}
      for (const key of COMBAT_TEAM_KEYS) {
        const { userCardIds, inherited } = await this.resolveIdsInTx(
          tx,
          userId,
          key,
        )
        out[key] = {
          team: await this.#buildTeamView(tx, userId, userCardIds),
          inherited,
        }
      }
      return out
    })
  }

  setForKey(
    userId: string,
    key: string,
    userCardIds: string[],
  ): Promise<{ team: TeamUnit[]; inherited: boolean }> {
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

          await tx.userCombatTeam.upsert({
            where: { userId_key: { userId, key } },
            create: { userId, key, userCardIds },
            update: { userCardIds },
          })

          const team = await this.#buildTeamView(tx, userId, userCardIds)
          return { team, inherited: false }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  /**
   * Supprime la ligne d'un mode : il se remet à hériter de la campagne. La
   * campagne elle-même est la racine du repli, elle ne peut hériter de
   * personne — la refuser ici évite un état où plus aucun mode n'a d'équipe.
   */
  async clearForKey(userId: string, key: string): Promise<void> {
    if (key === CAMPAIGN_TEAM_KEY) {
      throw Boom.badRequest(
        "L'équipe de campagne ne peut pas hériter d'un autre mode",
      )
    }
    await this.#postgresOrm.prisma.userCombatTeam.deleteMany({
      where: { userId, key },
    })
  }

  async #buildTeamView(
    tx: PrimaTransactionClient,
    userId: string,
    userCardIds: string[],
  ): Promise<TeamUnit[]> {
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
    const cfg = await this.#configService.getMany(
      'combat.baseCritRate',
      'combat.baseCritDmg',
      'combat.baseArmorPen',
      'combat.baseLifesteal',
      ...SET_BONUS_CONFIG_KEYS,
    )
    const baseStats = {
      critRate: cfg['combat.baseCritRate'],
      critDmg: cfg['combat.baseCritDmg'],
      armorPen: cfg['combat.baseArmorPen'],
      lifesteal: cfg['combat.baseLifesteal'],
    }
    // Bonus de set — une seule reconstruction pour tout l'aperçu d'équipe.
    const setDefs = setBonusesFromConfig(cfg)
    const byId = new Map(userCards.map((uc) => [uc.id, uc]))
    return userCardIds
      .map((id) => byId.get(id))
      .filter((uc): uc is NonNullable<typeof uc> => uc != null)
      .map((uc) => {
        const stats = computeEquippedCardStats({
          baseHp: uc.card.baseHp,
          baseAtk: uc.card.baseAtk,
          baseDef: uc.card.baseDef,
          baseSpd: uc.card.baseSpd,
          level: uc.level,
          palier: uc.palier,
          variant: uc.variant,
          pieces: uc.equipment.map((ue) => ({
            bonuses: (ue.equipment.bonuses ?? {}) as Record<string, number>,
            level: ue.level,
            substats: (ue.substats ?? []) as unknown as Substat[],
            baseBoost: ue.baseBoost,
            setKey: ue.equipment.setKey,
          })),
          setDefs,
          baseStats,
        })
        const passive = getPassive(uc.card.passiveKey)
        return {
          userCardId: uc.id,
          cardId: uc.cardId,
          cardName: uc.card.name,
          cardImageUrl: uc.card.imageUrl,
          element: uc.card.element,
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
