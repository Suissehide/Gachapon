import type { IocContainer } from '../../../types/application/ioc'
import type {
  IAdminTranslationsRepository,
  MissingTranslationEntry,
} from '../../../types/infra/orm/repositories/admin-translations.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

/**
 * Décide quelle langue manque à partir d'une paire dont on sait déjà
 * (par construction du `where` de l'appelant) qu'exactement une des deux
 * est vide. `null` et `''` comptent tous les deux comme vide, pour couvrir
 * aussi bien les colonnes facultatives (`String?`, peuvent être `null`)
 * que les colonnes obligatoires (`String`, ne peuvent être que `''`).
 */
function pickMissingSide(
  fr: string | null,
  en: string | null,
): { missingLocale: 'FR' | 'EN'; value: string } {
  const frEmpty = fr === null || fr === ''
  return frEmpty
    ? { missingLocale: 'FR', value: en ?? '' }
    : { missingLocale: 'EN', value: fr ?? '' }
}

function collect(
  entries: MissingTranslationEntry[],
  entity: string,
  field: string,
  rows: { id: string; fr: string | null; en: string | null }[],
): void {
  for (const row of rows) {
    entries.push({
      entity,
      id: row.id,
      field,
      ...pickMissingSide(row.fr, row.en),
    })
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

    // Colonnes obligatoires (String, jamais NULL) : seule '' compte comme
    // vide. Une paire déséquilibrée — une langue pleine, l'autre '' — est
    // en soi une anomalie (l'API l'interdit), quel que soit le sens.
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
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.quest.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.cardSet.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.card.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.equipment.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.shopItem.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.shopItem.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.achievement.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.achievement.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.skillBranch.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.skillBranch.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.skillNode.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.skillNode.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.campaignStage.findMany({
        where: {
          OR: [
            { AND: [{ labelFr: { not: '' } }, { labelEn: '' }] },
            { AND: [{ labelEn: { not: '' } }, { labelFr: '' }] },
          ],
        },
        select: { id: true, labelFr: true, labelEn: true },
      }),
      this.#prisma.towerFloor.findMany({
        where: {
          OR: [
            { AND: [{ labelFr: { not: '' } }, { labelEn: '' }] },
            { AND: [{ labelEn: { not: '' } }, { labelFr: '' }] },
          ],
        },
        select: { id: true, labelFr: true, labelEn: true },
      }),
      this.#prisma.raidBoss.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
    ])

    collect(
      entries,
      'quest',
      'name',
      quests.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'quest',
      'description',
      questsDesc.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )
    collect(
      entries,
      'cardSet',
      'name',
      sets.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'card',
      'name',
      cards.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'equipment',
      'name',
      equipments.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'shopItem',
      'name',
      shopItems.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'shopItem',
      'description',
      shopItemsDesc.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )
    collect(
      entries,
      'achievement',
      'name',
      achievements.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'achievement',
      'description',
      achievementsDesc.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )
    collect(
      entries,
      'skillBranch',
      'name',
      skillBranches.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'skillBranch',
      'description',
      skillBranchesDesc.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )
    collect(
      entries,
      'skillNode',
      'name',
      skillNodes.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )
    collect(
      entries,
      'skillNode',
      'description',
      skillNodesDesc.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )
    collect(
      entries,
      'campaignStage',
      'label',
      campaignStages.map((r) => ({ id: r.id, fr: r.labelFr, en: r.labelEn })),
    )
    collect(
      entries,
      'towerFloor',
      'label',
      towerFloors.map((r) => ({ id: r.id, fr: r.labelFr, en: r.labelEn })),
    )
    collect(
      entries,
      'raidBoss',
      'name',
      raidBosses.map((r) => ({ id: r.id, fr: r.nameFr, en: r.nameEn })),
    )

    // Colonnes facultatives (String?) : `null` compte comme vide au même
    // titre que `''`. Une paire dont les DEUX langues sont vides (jamais
    // renseignées) est un état normal — le filtre exige explicitement
    // qu'un côté porte du contenu, dans un sens comme dans l'autre.
    const setsUnbalancedDescription = await this.#prisma.cardSet.findMany({
      where: {
        OR: [
          {
            AND: [
              { descriptionFr: { not: null } },
              { descriptionFr: { not: '' } },
              { OR: [{ descriptionEn: null }, { descriptionEn: '' }] },
            ],
          },
          {
            AND: [
              { descriptionEn: { not: null } },
              { descriptionEn: { not: '' } },
              { OR: [{ descriptionFr: null }, { descriptionFr: '' }] },
            ],
          },
        ],
      },
      select: { id: true, descriptionFr: true, descriptionEn: true },
    })
    collect(
      entries,
      'cardSet',
      'description',
      setsUnbalancedDescription.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )

    const rewardsUnbalancedLabel = await this.#prisma.reward.findMany({
      where: {
        OR: [
          {
            AND: [
              { labelFr: { not: null } },
              { labelFr: { not: '' } },
              { OR: [{ labelEn: null }, { labelEn: '' }] },
            ],
          },
          {
            AND: [
              { labelEn: { not: null } },
              { labelEn: { not: '' } },
              { OR: [{ labelFr: null }, { labelFr: '' }] },
            ],
          },
        ],
      },
      select: { id: true, labelFr: true, labelEn: true },
    })
    collect(
      entries,
      'reward',
      'label',
      rewardsUnbalancedLabel.map((r) => ({
        id: r.id,
        fr: r.labelFr,
        en: r.labelEn,
      })),
    )

    return entries
  }
}
