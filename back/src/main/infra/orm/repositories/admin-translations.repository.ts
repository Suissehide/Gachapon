import type { IocContainer } from '../../../types/application/ioc'
import type {
  IAdminTranslationsRepository,
  MissingTranslationEntry,
} from '../../../types/infra/orm/repositories/admin-translations.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

function collect(
  entries: MissingTranslationEntry[],
  entity: string,
  field: string,
  rows: { id: string; valueFr: string }[],
): void {
  for (const row of rows) {
    entries.push({ entity, id: row.id, field, valueFr: row.valueFr })
  }
}

export class AdminTranslationsRepository
  implements IAdminTranslationsRepository
{
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async findMissingTranslations(): Promise<MissingTranslationEntry[]> {
    const entries: MissingTranslationEntry[] = []

    // Colonnes obligatoires (String, jamais NULL) : une colonne anglaise
    // vide est déjà une anomalie, il suffit de la chercher.
    const [
      quests,
      questsDesc,
      sets,
      cards,
      equipments,
      shopItems,
      shopItemsDesc,
      achievements,
      achievementsDesc,
      skillBranches,
      skillBranchesDesc,
      skillNodes,
      skillNodesDesc,
      campaignStages,
      towerFloors,
      raidBosses,
    ] = await Promise.all([
      this.#prisma.quest.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.quest.findMany({
        where: { descriptionEn: '' },
        select: { id: true, descriptionFr: true },
      }),
      this.#prisma.cardSet.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.card.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.equipment.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.shopItem.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.shopItem.findMany({
        where: { descriptionEn: '' },
        select: { id: true, descriptionFr: true },
      }),
      this.#prisma.achievement.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.achievement.findMany({
        where: { descriptionEn: '' },
        select: { id: true, descriptionFr: true },
      }),
      this.#prisma.skillBranch.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.skillBranch.findMany({
        where: { descriptionEn: '' },
        select: { id: true, descriptionFr: true },
      }),
      this.#prisma.skillNode.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
      this.#prisma.skillNode.findMany({
        where: { descriptionEn: '' },
        select: { id: true, descriptionFr: true },
      }),
      this.#prisma.campaignStage.findMany({
        where: { labelEn: '' },
        select: { id: true, labelFr: true },
      }),
      this.#prisma.towerFloor.findMany({
        where: { labelEn: '' },
        select: { id: true, labelFr: true },
      }),
      this.#prisma.raidBoss.findMany({
        where: { nameEn: '' },
        select: { id: true, nameFr: true },
      }),
    ])

    collect(
      entries,
      'quest',
      'nameEn',
      quests.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'quest',
      'descriptionEn',
      questsDesc.map((r) => ({ id: r.id, valueFr: r.descriptionFr })),
    )
    collect(
      entries,
      'cardSet',
      'nameEn',
      sets.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'card',
      'nameEn',
      cards.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'equipment',
      'nameEn',
      equipments.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'shopItem',
      'nameEn',
      shopItems.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'shopItem',
      'descriptionEn',
      shopItemsDesc.map((r) => ({ id: r.id, valueFr: r.descriptionFr })),
    )
    collect(
      entries,
      'achievement',
      'nameEn',
      achievements.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'achievement',
      'descriptionEn',
      achievementsDesc.map((r) => ({ id: r.id, valueFr: r.descriptionFr })),
    )
    collect(
      entries,
      'skillBranch',
      'nameEn',
      skillBranches.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'skillBranch',
      'descriptionEn',
      skillBranchesDesc.map((r) => ({ id: r.id, valueFr: r.descriptionFr })),
    )
    collect(
      entries,
      'skillNode',
      'nameEn',
      skillNodes.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )
    collect(
      entries,
      'skillNode',
      'descriptionEn',
      skillNodesDesc.map((r) => ({ id: r.id, valueFr: r.descriptionFr })),
    )
    collect(
      entries,
      'campaignStage',
      'labelEn',
      campaignStages.map((r) => ({ id: r.id, valueFr: r.labelFr })),
    )
    collect(
      entries,
      'towerFloor',
      'labelEn',
      towerFloors.map((r) => ({ id: r.id, valueFr: r.labelFr })),
    )
    collect(
      entries,
      'raidBoss',
      'nameEn',
      raidBosses.map((r) => ({ id: r.id, valueFr: r.nameFr })),
    )

    // Colonnes facultatives (String?) : une colonne anglaise vide n'est une
    // anomalie QUE si le français porte du contenu — sinon un set sans
    // description (état normal, le champ est optionnel) remonterait ici à
    // chaque appel.
    const setsMissingDescription = await this.#prisma.cardSet.findMany({
      where: {
        AND: [
          { descriptionFr: { not: null } },
          { descriptionFr: { not: '' } },
          { OR: [{ descriptionEn: null }, { descriptionEn: '' }] },
        ],
      },
      select: { id: true, descriptionFr: true },
    })
    collect(
      entries,
      'cardSet',
      'descriptionEn',
      setsMissingDescription.map((r) => ({
        id: r.id,
        valueFr: r.descriptionFr ?? '',
      })),
    )

    const rewardsMissingLabel = await this.#prisma.reward.findMany({
      where: {
        AND: [
          { labelFr: { not: null } },
          { labelFr: { not: '' } },
          { OR: [{ labelEn: null }, { labelEn: '' }] },
        ],
      },
      select: { id: true, labelFr: true },
    })
    collect(
      entries,
      'reward',
      'labelEn',
      rewardsMissingLabel.map((r) => ({ id: r.id, valueFr: r.labelFr ?? '' })),
    )

    return entries
  }
}
