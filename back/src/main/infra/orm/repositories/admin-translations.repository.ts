import { deliberateIdenticalValues } from '../../../domain/i18n/deliberate-identical'
import type { IocContainer } from '../../../types/application/ioc'
import type {
  IAdminTranslationsRepository,
  MissingTranslationEntry,
} from '../../../types/infra/orm/repositories/admin-translations.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

/**
 * Qualifie une paire Fr/En remontée par les `where` ci-dessous, ou la
 * rejette.
 *
 * Deux défauts, pas un :
 *  - `empty` — une langue porte du contenu, l'autre est vide. `null` et `''`
 *    comptent tous les deux comme vide, pour couvrir aussi bien les colonnes
 *    facultatives (`String?`) que les obligatoires (`String`).
 *  - `identical` — les deux langues sont pleines et STRICTEMENT égales.
 *    C'est l'état que la migration `20260921151247_i18n_content_columns`
 *    a produit sur TOUTE la base (elle a recopié le français dans les deux
 *    colonnes, qui passaient `NOT NULL`), et celui que produit tout import
 *    qui envoie `nameEn = nameFr`. Sans cette catégorie, l'écran affichait
 *    « aucune traduction manquante » sur une base où presque rien n'était
 *    traduit.
 *
 * `missingLocale` reste la langue À REMPLIR. Pour `identical`, c'est
 * toujours `EN` : les deux producteurs connus de paires identiques
 * (la migration, et les clients de l'API admin qui recopient le français)
 * copient le FRANÇAIS vers l'anglais.
 */
function classify(
  fr: string | null,
  en: string | null,
): {
  kind: 'empty' | 'identical'
  missingLocale: 'FR' | 'EN'
  value: string
} | null {
  const frEmpty = fr === null || fr === ''
  const enEmpty = en === null || en === ''
  if (frEmpty && enEmpty) {
    return null
  }
  if (frEmpty) {
    return { kind: 'empty', missingLocale: 'FR', value: en ?? '' }
  }
  if (enEmpty) {
    return { kind: 'empty', missingLocale: 'EN', value: fr ?? '' }
  }
  if (fr === en) {
    return { kind: 'identical', missingLocale: 'EN', value: fr ?? '' }
  }
  return null
}

function collect(
  entries: MissingTranslationEntry[],
  entity: string,
  field: string,
  rows: { id: string; fr: string | null; en: string | null }[],
): void {
  // Les identités délibérées (prénoms nus, cognats, gabarits bilingues)
  // sont écartées : voir `deliberate-identical.ts`.
  const deliberate = deliberateIdenticalValues()
  for (const row of rows) {
    const verdict = classify(row.fr, row.en)
    if (verdict === null) {
      continue
    }
    if (verdict.kind === 'identical' && deliberate.has(verdict.value)) {
      continue
    }
    entries.push({ entity, id: row.id, field, ...verdict })
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
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.quest.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.quest.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { descriptionFr: { not: '' } },
                {
                  descriptionEn: {
                    equals: this.#prisma.quest.fields.descriptionFr,
                  },
                },
              ],
            },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.cardSet.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.cardSet.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.card.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.card.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.equipment.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.equipment.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.shopItem.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.shopItem.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.shopItem.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { descriptionFr: { not: '' } },
                {
                  descriptionEn: {
                    equals: this.#prisma.shopItem.fields.descriptionFr,
                  },
                },
              ],
            },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.achievement.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.achievement.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.achievement.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { descriptionFr: { not: '' } },
                {
                  descriptionEn: {
                    equals: this.#prisma.achievement.fields.descriptionFr,
                  },
                },
              ],
            },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.skillBranch.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.skillBranch.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.skillBranch.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { descriptionFr: { not: '' } },
                {
                  descriptionEn: {
                    equals: this.#prisma.skillBranch.fields.descriptionFr,
                  },
                },
              ],
            },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.skillNode.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.skillNode.fields.nameFr } },
              ],
            },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true },
      }),
      this.#prisma.skillNode.findMany({
        where: {
          OR: [
            { AND: [{ descriptionFr: { not: '' } }, { descriptionEn: '' }] },
            { AND: [{ descriptionEn: { not: '' } }, { descriptionFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { descriptionFr: { not: '' } },
                {
                  descriptionEn: {
                    equals: this.#prisma.skillNode.fields.descriptionFr,
                  },
                },
              ],
            },
          ],
        },
        select: { id: true, descriptionFr: true, descriptionEn: true },
      }),
      this.#prisma.campaignStage.findMany({
        where: {
          OR: [
            { AND: [{ labelFr: { not: '' } }, { labelEn: '' }] },
            { AND: [{ labelEn: { not: '' } }, { labelFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { labelFr: { not: '' } },
                {
                  labelEn: {
                    equals: this.#prisma.campaignStage.fields.labelFr,
                  },
                },
              ],
            },
          ],
        },
        select: { id: true, labelFr: true, labelEn: true },
      }),
      this.#prisma.towerFloor.findMany({
        where: {
          OR: [
            { AND: [{ labelFr: { not: '' } }, { labelEn: '' }] },
            { AND: [{ labelEn: { not: '' } }, { labelFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { labelFr: { not: '' } },
                { labelEn: { equals: this.#prisma.towerFloor.fields.labelFr } },
              ],
            },
          ],
        },
        select: { id: true, labelFr: true, labelEn: true },
      }),
      this.#prisma.raidBoss.findMany({
        where: {
          OR: [
            { AND: [{ nameFr: { not: '' } }, { nameEn: '' }] },
            { AND: [{ nameEn: { not: '' } }, { nameFr: '' }] },
            // Post-migration : les deux colonnes portent la MÊME valeur,
            // aucune n'est vide. C'est l'état réel de la production.
            {
              AND: [
                { nameFr: { not: '' } },
                { nameEn: { equals: this.#prisma.raidBoss.fields.nameFr } },
              ],
            },
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
    // qu'un côté porte du contenu, dans un sens comme dans l'autre. La
    // troisième clause couvre, ici aussi, les deux langues pleines et
    // identiques.
    const setsDefectiveDescription = await this.#prisma.cardSet.findMany({
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
          // Post-migration : les deux colonnes portent la MÊME valeur.
          {
            AND: [
              { descriptionFr: { not: null } },
              { descriptionFr: { not: '' } },
              {
                descriptionEn: {
                  equals: this.#prisma.cardSet.fields.descriptionFr,
                },
              },
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
      setsDefectiveDescription.map((r) => ({
        id: r.id,
        fr: r.descriptionFr,
        en: r.descriptionEn,
      })),
    )

    const rewardsDefectiveLabel = await this.#prisma.reward.findMany({
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
          // Post-migration : les deux colonnes portent la MÊME valeur.
          {
            AND: [
              { labelFr: { not: null } },
              { labelFr: { not: '' } },
              { labelEn: { equals: this.#prisma.reward.fields.labelFr } },
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
      rewardsDefectiveLabel.map((r) => ({
        id: r.id,
        fr: r.labelFr,
        en: r.labelEn,
      })),
    )

    return entries
  }
}
