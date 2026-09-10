import Boom from '@hapi/boom'

import type { EquipmentSlot, Prisma } from '../../../generated/client'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type { ITeamProgressionDomain } from '../../types/domain/team-progression/team-progression.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type { EquipmentBonuses } from '../combat/combat-stats.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  discountedUpgradeGoldCost,
  EQUIP_MAX_LEVEL,
  INITIAL_SUBSTATS_BY_RARITY,
  isSubstatMilestone,
  type MilestoneResult,
  rollInitialSubstats,
  rollMilestone,
  SUBSTAT_RANGE_CONFIG_KEYS,
  type Substat,
  type SubstatRanges,
  substatRangesFromConfig,
} from './equipment-progression'
import {
  SET_BONUS_CONFIG_KEYS,
  SET_KEYS,
  type SetKey,
  setBonusesFromConfig,
} from './set-bonuses'

/** Libellés français des 4 sets — seule source, réutilisée par l'inventaire et `listSets`. */
export const SET_LABELS: Record<SetKey, string> = {
  FUREUR: 'Fureur',
  PRECISION: 'Précision',
  PERCEE: 'Percée',
  SANGSUE: 'Sangsue',
  ASSAUT: 'Assaut',
  COLOSSE: 'Colosse',
  CELERITE: 'Célérité',
}

/** Libellés français des stats portées par les bonus de set (clé technique → nom affiché). */
const SET_STAT_LABELS: Record<string, string> = {
  hpPct: 'PV',
  atkPct: 'ATQ',
  defPct: 'DEF',
  spdPct: 'VIT',
  critRatePct: 'taux crit',
  critDmgPct: 'dégâts crit',
  armorPenPct: "pénétration d'armure",
  lifestealPct: 'vol de vie',
}

/** Décrit un palier de set à partir de son unique bonus, ex. `+10 % ATQ`. */
function formatSetTierLabel(bonuses: EquipmentBonuses): string {
  const [key, value] = Object.entries(bonuses)[0] ?? []
  if (key === undefined || value === undefined) {
    return ''
  }
  return `+${value} % ${SET_STAT_LABELS[key] ?? key}`
}

export interface SetDefinitionView {
  key: SetKey
  label: string
  /** Nombre de pièces requis sur une même carte pour activer le bonus. */
  pieces: number
  bonus: { label: string; bonuses: Record<string, number> }
}

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
  slot: EquipmentSlot
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  setKey: SetKey
  setLabel: string
  imageUrl: string | null
  /** Clé de la stat principale — l'unique clé de `bonuses`, en colonne. */
  mainStat: string
  bonuses: Record<string, number>
  level: number
  substats: Substat[]
  baseBoost: number
  equippedOnId: string | null // UserCard.id when equipped
  equippedOnCardName: string | null
  obtainedAt: string // ISO
  /**
   * Le coût EXACT que `POST /equipment/:id/upgrade` facturera, remise du
   * bonus d'équipe `forge` déjà appliquée — jamais recalculé côté front
   * depuis la config publique, qui ne porte aucune donnée de bonus
   * d'équipe. `null` au niveau maximum, où il n'y a plus d'amélioration à
   * acheter.
   */
  nextUpgradeCost: number | null
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
  readonly #achievementsDomain: AchievementsDomainInterface
  readonly #teamProgressionDomain: ITeamProgressionDomain

  constructor({
    postgresOrm,
    configService,
    achievementsDomain,
    teamProgressionDomain,
  }: Pick<
    IocContainer,
    | 'postgresOrm'
    | 'configService'
    | 'achievementsDomain'
    | 'teamProgressionDomain'
  >) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#achievementsDomain = achievementsDomain
    this.#teamProgressionDomain = teamProgressionDomain
  }

  /**
   * List all UserEquipment items owned by the user.
   */
  async listUserEquipment(
    userId: string,
  ): Promise<{ items: EquipmentInstanceView[] }> {
    // Résolus UNE fois pour toute la requête — jamais dans le `.map()`
    // ci-dessous, qui tournerait sinon une requête Postgres par pièce sur
    // une route qui rend l'inventaire entier.
    const [userEquipment, c, teamEffects] = await Promise.all([
      this.#postgresOrm.prisma.userEquipment.findMany({
        where: { userId },
        include: {
          equipment: true,
          equippedOn: { include: { card: true } },
        },
        orderBy: { obtainedAt: 'desc' },
      }),
      this.#configService.getMany(
        'equip.goldCostBase',
        'equip.goldCostExp',
        'card.rarityMultCommon',
        'card.rarityMultUncommon',
        'card.rarityMultRare',
        'card.rarityMultEpic',
        'card.rarityMultLegendary',
      ),
      this.#teamProgressionDomain.effectsForUser(userId),
    ])

    return {
      items: userEquipment.map((ue) => ({
        id: ue.id,
        equipmentId: ue.equipmentId,
        name: ue.equipment.name,
        slot: ue.equipment.slot,
        rarity: ue.equipment.rarity,
        setKey: ue.equipment.setKey,
        setLabel: SET_LABELS[ue.equipment.setKey],
        imageUrl: ue.equipment.imageUrl,
        mainStat: ue.equipment.mainStat,
        bonuses: (ue.equipment.bonuses ?? {}) as Record<string, number>,
        level: ue.level,
        substats: (ue.substats ?? []) as unknown as Substat[],
        baseBoost: ue.baseBoost,
        equippedOnId: ue.equippedOnId,
        equippedOnCardName: ue.equippedOn?.card?.name ?? null,
        obtainedAt: ue.obtainedAt.toISOString(),
        nextUpgradeCost:
          ue.level >= EQUIP_MAX_LEVEL
            ? null
            : discountedUpgradeGoldCost(
                ue.level,
                c['equip.goldCostBase'],
                c['equip.goldCostExp'],
                c[RARITY_MULT_KEY[ue.equipment.rarity]],
                teamEffects.forge,
              ),
      })),
    }
  }

  /**
   * Donnée de référence publique : les sets d'équipement, chacun avec le
   * nombre de pièces qu'il exige et le bonus qu'il accorde. Consommée par l'écran d'équipement pour afficher
   * ce qu'un set apporte, sans jamais recopier les valeurs côté front.
   */
  async listSets(): Promise<{ sets: SetDefinitionView[] }> {
    const c = await this.#configService.getMany(...SET_BONUS_CONFIG_KEYS)
    const defs = setBonusesFromConfig(c)
    return {
      sets: SET_KEYS.map((key) => ({
        key,
        label: SET_LABELS[key],
        pieces: defs[key].pieces,
        bonus: {
          label: formatSetTierLabel(defs[key].bonuses),
          bonuses: defs[key].bonuses as Record<string, number>,
        },
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
            INITIAL_SUBSTATS_BY_RARITY[catalog.rarity],
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
    const [c, teamEffects] = await Promise.all([
      this.#configService.getMany(
        'equip.goldCostBase',
        'equip.goldCostExp',
        'card.rarityMultCommon',
        'card.rarityMultUncommon',
        'card.rarityMultRare',
        'card.rarityMultEpic',
        'card.rarityMultLegendary',
        ...SUBSTAT_RANGE_CONFIG_KEYS,
      ),
      this.#teamProgressionDomain.effectsForUser(userId),
    ])
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
          const cost = discountedUpgradeGoldCost(
            ue.level,
            c['equip.goldCostBase'],
            c['equip.goldCostExp'],
            rarityMult,
            teamEffects.forge,
          )
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { gold: true },
          })
          this.#assertGold(user?.gold, cost)

          const newLevel = ue.level + 1
          let substats = (ue.substats ?? []) as unknown as Substat[]
          const baseBoost = ue.baseBoost
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
              baseBoost,
            },
          })

          // GOLD_SPENT autant que EQUIPMENT_UPGRADED : l'amélioration
          // d'équipement est le principal puits d'or du jeu, l'omettre faisait
          // ignorer ces dépenses à la quête « Dépensier ».
          await Promise.all([
            this.#achievementsDomain.track(tx, userId, {
              kind: 'EQUIPMENT_UPGRADED',
              amount: 1,
            }),
            cost > 0
              ? this.#achievementsDomain.track(tx, userId, {
                  kind: 'GOLD_SPENT',
                  amount: cost,
                })
              : Promise.resolve([]),
          ])

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

          await this.#achievementsDomain.track(tx, userId, {
            kind: 'EQUIPMENT_SALVAGED',
            amount: items.length,
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
