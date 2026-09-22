import type { PostgresPrismaClient } from '../../../infra/orm/postgres-client'

/**
 * Le type Prisma brut (`import type { Quest } from '../generated/client'`)
 * ignore les champs calculés de l'extension. Ces alias-ci les portent : ce
 * sont eux que les interfaces de repositories doivent utiliser.
 */
export type LocalizedQuest = Awaited<
  ReturnType<PostgresPrismaClient['quest']['findUniqueOrThrow']>
>

export type LocalizedCard = Awaited<
  ReturnType<PostgresPrismaClient['card']['findUniqueOrThrow']>
>

export type LocalizedCardSet = Awaited<
  ReturnType<PostgresPrismaClient['cardSet']['findUniqueOrThrow']>
>

export type LocalizedEquipment = Awaited<
  ReturnType<PostgresPrismaClient['equipment']['findUniqueOrThrow']>
>

export type LocalizedShopItem = Awaited<
  ReturnType<PostgresPrismaClient['shopItem']['findUniqueOrThrow']>
>

export type LocalizedAchievement = Awaited<
  ReturnType<PostgresPrismaClient['achievement']['findUniqueOrThrow']>
>

export type LocalizedReward = Awaited<
  ReturnType<PostgresPrismaClient['reward']['findUniqueOrThrow']>
>

export type LocalizedSkillBranch = Awaited<
  ReturnType<PostgresPrismaClient['skillBranch']['findUniqueOrThrow']>
>

export type LocalizedSkillNode = Awaited<
  ReturnType<PostgresPrismaClient['skillNode']['findUniqueOrThrow']>
>

export type LocalizedCampaignStage = Awaited<
  ReturnType<PostgresPrismaClient['campaignStage']['findUniqueOrThrow']>
>

export type LocalizedTowerFloor = Awaited<
  ReturnType<PostgresPrismaClient['towerFloor']['findUniqueOrThrow']>
>

export type LocalizedRaidBoss = Awaited<
  ReturnType<PostgresPrismaClient['raidBoss']['findUniqueOrThrow']>
>
