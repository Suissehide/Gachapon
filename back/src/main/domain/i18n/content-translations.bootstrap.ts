import type { IocContainer } from '../../types/application/ioc'
import type { PostgresORMInterface } from '../../types/infra/orm/client'
import type { Logger } from '../../types/utils/logger'
import { ACHIEVEMENT_DEFINITIONS } from '../content/achievements.definitions'
import { campaignStageLabel } from '../content/campaign.definitions'
import { CARDS, HUMAN_CARD_SET } from '../content/cards.definitions'
import { buildEquipmentCatalog } from '../content/equipment.definitions'
import { RAID_BOSS_NAME_EN } from '../content/raid.definitions'
import { SHOP_ITEMS } from '../content/shop.definitions'
import {
  SKILL_BRANCH_TEXT,
  SKILL_NODE_TEXT,
} from '../content/skills.definitions'
import { buildTowerFloors } from '../content/tower.definitions'
import { QUEST_DEFINITIONS } from '../quests/quest-definitions'
import { TOWER_ELEMENTS } from '../tower/tower-slots'

/**
 * Sélectionne l'unique ligne dont `nameFr` correspond, pour les quatre
 * entités sans clé stable en base (`CardSet`, `ShopItem`, `SkillBranch`,
 * `SkillNode`) : la colonne n'est contrainte `@unique` par aucune d'elles,
 * donc plusieurs lignes pourraient en théorie partager le même `nameFr`. Dans
 * ce cas on ignore plutôt que de risquer d'écrire sur la mauvaise ligne.
 *
 * Fonction pure et exportée (plutôt qu'une méthode privée de la classe) pour
 * être testable en unitaire sans base de données — c'est le seul mécanisme
 * de rapprochement pour ces quatre entités, celles où le brief d'origine se
 * trompait le plus sur la clé de ciblage (voir le rapport de la tâche).
 * `onAmbiguous` prend la place du logger : la fonction n'a besoin que de
 * savoir QUOI signaler, pas comment.
 */
export function findByNameFr<T extends { nameFr: string }>(
  rows: T[],
  nameFr: string,
  entity: string,
  onAmbiguous: (message: string) => void,
): T | undefined {
  const matches = rows.filter((row) => row.nameFr === nameFr)
  if (matches.length > 1) {
    onAmbiguous(
      `[i18n bootstrap] ${entity}: plusieurs lignes portent nameFr="${nameFr}", ignoré (clé ambiguë)`,
    )
    return undefined
  }
  return matches[0]
}

/**
 * Extrait le CODE porté par une clé d'image de carte : `HUM-001` pour
 * `staging/cards/humans/HUM-001.png` comme pour `cards/humans/HUM-001.png`.
 *
 * Volontairement indépendante du préfixe : `IMAGE_PREFIX` change avec
 * `NODE_ENV` (`cards/humans` en prod, `staging/cards/humans` ailleurs) et
 * une base peut porter des lignes écrites sous l'autre préfixe. Seule la
 * fin du chemin — `<code>.<ext>` — est stable.
 */
export function imageCodeOf(imageUrl: string | null): string | null {
  if (imageUrl === null || imageUrl === '') {
    return null
  }
  const file = imageUrl.slice(imageUrl.lastIndexOf('/') + 1)
  const dot = file.lastIndexOf('.')
  const code = dot === -1 ? file : file.slice(0, dot)
  return code === '' ? null : code
}

/**
 * Indexe des cartes par le code de leur clé d'image.
 *
 * C'est le rapprochement de `Card`, et il NE PASSE PAS par `id` : le `id`
 * d'une définition (`HUM-001`) est un code d'image, pas une clé primaire.
 * `Card.id` vaut `@default(uuid())` et le seed (`prisma/seed/cards.ts`)
 * comme `POST /admin/cards` laissent Prisma le générer — un `where: { id:
 * { in: CARDS.map(c => c.id) } }` ne sélectionne donc RIEN en base réelle.
 * Le code de la carte n'existe, en base, que dans `imageUrl`, où les deux
 * chemins d'écriture le posent par construction (`<préfixe>/<code>.png`).
 *
 * `nameFr` était l'autre candidat (c'est le rapprochement des quatre
 * entités sans clé). Écarté ici : c'est précisément la colonne que ce
 * backfill traduit, donc la plus susceptible d'être éditée par un
 * administrateur — et une carte renommée en français perdrait sa
 * traduction anglaise. La clé d'image, elle, ne bouge pas avec le texte.
 *
 * Comme `findByNameFr`, on ignore plutôt que de risquer la mauvaise ligne
 * quand deux cartes partagent le même code.
 */
export function indexByImageCode<T extends { imageUrl: string | null }>(
  rows: T[],
  onAmbiguous: (message: string) => void,
): Map<string, T> {
  const byCode = new Map<string, T>()
  const ambiguous = new Set<string>()
  for (const row of rows) {
    const code = imageCodeOf(row.imageUrl)
    if (code === null) {
      continue
    }
    if (byCode.has(code)) {
      ambiguous.add(code)
      continue
    }
    byCode.set(code, row)
  }
  for (const code of ambiguous) {
    byCode.delete(code)
    onAmbiguous(
      `[i18n bootstrap] card: plusieurs lignes portent le code d'image "${code}", ignoré (clé ambiguë)`,
    )
  }
  return byCode
}

/**
 * Pose les traductions connues sur une base déjà peuplée. Update-only et
 * idempotent : ne réécrit que les colonnes qu'aucun administrateur n'a
 * touchées, jamais celles saisies à la main en production.
 *
 * Existe parce que le déploiement ne rejoue jamais les seeds — c'est le seul
 * chemin par lequel une traduction ajoutée au code atteint la production.
 * Même rôle que `configService.bootstrap()` et `questsDomain.bootstrap()`,
 * appelés juste avant dans `application/starter.ts`.
 *
 * ATTENTION à l'erreur du brief d'origine de cette tâche : la migration
 * `20260921151247_i18n_content_columns` a recopié le FRANÇAIS dans les deux
 * colonnes (`UPDATE "Card" SET "nameFr" = "name", "nameEn" = "name"`), pas
 * une chaîne vide. Un critère `nameEn: ''` ne matcherait donc RIEN en
 * production et ce bootstrap ne ferait rien tout en ayant l'air de
 * fonctionner. Une ligne à backfiller est une ligne dont la colonne anglaise
 * est vide OU identique à la colonne française.
 *
 * Cette égalité n'est cependant pas toujours un artefact de migration : une
 * poignée de traductions sont LÉGITIMEMENT identiques dans les deux langues
 * (un prénom nu comme « Aldric », un cognat comme « Expert », le nom d'une
 * branche de compétence comme « Flux », le gabarit `campaignStageLabel`,
 * volontairement identique FR/EN). Filtrer côté SQL sur « nameEn = nameFr »
 * réécrirait ces lignes à l'identique À CHAQUE démarrage — count > 0 pour
 * toujours, ce qui casse l'idempotence sans jamais rien changer en base.
 *
 * D'où le choix : lire la ligne, comparer en TypeScript à la traduction
 * cible, et n'écrire (et ne compter) que si la cible diffère RÉELLEMENT de
 * la valeur actuelle. Un `where` qui filtrerait sur « nameEn = nameFr »
 * serait pourtant exprimable (Prisma sait référencer un champ du même
 * modèle : `{ nameEn: { equals: prisma.card.fields.nameFr } }`, c'est ce
 * que fait `admin-translations.repository.ts`) — mais il ne dirait rien de
 * la CIBLE, et c'est la comparaison à la cible qui protège l'idempotence.
 * Voir `#applyIfEligible`.
 */
export class ContentTranslationsBootstrap {
  readonly #orm: PostgresORMInterface
  readonly #logger: Logger

  constructor({ postgresOrm, logger }: IocContainer) {
    this.#orm = postgresOrm
    this.#logger = logger
  }

  async bootstrap(): Promise<{ updated: number }> {
    let updated = 0

    updated += await this.#backfillCards()
    updated += await this.#backfillCardSet()
    updated += await this.#backfillAchievements()
    updated += await this.#backfillQuests()
    updated += await this.#backfillShopItems()
    updated += await this.#backfillSkillBranches()
    updated += await this.#backfillSkillNodes()
    updated += await this.#backfillEquipment()
    updated += await this.#backfillCampaignStages()
    updated += await this.#backfillTowerFloors()
    updated += await this.#backfillRaidBosses()

    // Reward.label est hors périmètre : les récompenses sont créées à la
    // volée par les domaines qui les émettent (achievements, quêtes, raid,
    // streak, admin) et n'ont pas de clé stable à laquelle rattacher une
    // traduction. `rewards.domain.ts` pose déjà les deux colonnes à
    // l'écriture, et `localized.extension.ts#pick` fait replier une colonne
    // vide sur l'autre à la lecture — les lignes antérieures à cette tâche
    // restent donc lisibles sans backfill.

    this.#logger.info(`Content translations bootstrap: ${updated} rows updated`)
    return { updated }
  }

  /**
   * Décide si `target` doit être écrit à la place de `current`, et
   * l'applique le cas échéant.
   *
   * Deux conditions, toutes les deux nécessaires :
   *  1. `current` est une valeur que ce backfill a le droit de toucher —
   *     vide, ou identique au français (la signature de la recopie faite par
   *     la migration). Toute autre valeur est une traduction saisie à la
   *     main : on ne la touche jamais, quelle que soit la cible.
   *  2. `target` diffère réellement de `current` — sinon écrire ne changerait
   *     rien et ne ferait que gonfler le compteur (le cas des traductions
   *     légitimement identiques FR/EN, voir le commentaire de classe).
   */
  async #applyIfEligible(args: {
    current: string | null
    currentFr: string | null
    target: string
    write: () => Promise<unknown>
  }): Promise<boolean> {
    const current = args.current ?? ''
    const currentFr = args.currentFr ?? ''
    const isMigrationArtifact = current === '' || current === currentFr
    if (!isMigrationArtifact) {
      return false
    }
    if (current === args.target) {
      return false
    }
    await args.write()
    return true
  }

  #findByNameFr<T extends { nameFr: string }>(
    rows: T[],
    nameFr: string,
    entity: string,
  ): T | undefined {
    return findByNameFr(rows, nameFr, entity, (message) =>
      this.#logger.warn(message),
    )
  }

  // ---------------------------------------------------------------------
  // Card — clé stable : le code porté par `imageUrl` (`…/HUM-001.png`).
  // PAS `id` : c'est un uuid généré, voir `indexByImageCode`.
  // ---------------------------------------------------------------------
  async #backfillCards(): Promise<number> {
    const rows = await this.#orm.prisma.card.findMany({
      // `endsWith` et non `in` sur la clé complète : le préfixe de stockage
      // dépend de `NODE_ENV`, le suffixe `/<code>.png` non.
      where: {
        OR: CARDS.map((c) => ({ imageUrl: { endsWith: `/${c.id}.png` } })),
      },
      select: { id: true, imageUrl: true, nameFr: true, nameEn: true },
    })
    const byCode = indexByImageCode(rows, (message) =>
      this.#logger.warn(message),
    )

    let updated = 0
    for (const def of CARDS) {
      const row = byCode.get(def.id)
      if (!row) {
        continue
      }
      const wrote = await this.#applyIfEligible({
        current: row.nameEn,
        currentFr: row.nameFr,
        target: def.nameEn,
        write: () =>
          this.#orm.prisma.card.update({
            where: { id: row.id },
            data: { nameEn: def.nameEn },
          }),
      })
      if (wrote) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // CardSet — pas de clé stable en base (id = uuid seedé) : une seule
  // définition existe (`HUMAN_CARD_SET`), rapprochée par nameFr comme
  // SkillBranch/SkillNode/ShopItem ci-dessous.
  // ---------------------------------------------------------------------
  async #backfillCardSet(): Promise<number> {
    const rows = await this.#orm.prisma.cardSet.findMany({
      where: { nameFr: HUMAN_CARD_SET.nameFr },
      select: {
        id: true,
        nameFr: true,
        nameEn: true,
        descriptionFr: true,
        descriptionEn: true,
      },
    })
    const row = this.#findByNameFr(rows, HUMAN_CARD_SET.nameFr, 'cardSet')
    if (!row) {
      return 0
    }

    let updated = 0
    if (
      await this.#applyIfEligible({
        current: row.nameEn,
        currentFr: row.nameFr,
        target: HUMAN_CARD_SET.nameEn,
        write: () =>
          this.#orm.prisma.cardSet.update({
            where: { id: row.id },
            data: { nameEn: HUMAN_CARD_SET.nameEn },
          }),
      })
    ) {
      updated++
    }
    if (
      await this.#applyIfEligible({
        current: row.descriptionEn,
        currentFr: row.descriptionFr,
        target: HUMAN_CARD_SET.descriptionEn,
        write: () =>
          this.#orm.prisma.cardSet.update({
            where: { id: row.id },
            data: { descriptionEn: HUMAN_CARD_SET.descriptionEn },
          }),
      })
    ) {
      updated++
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // Achievement — clé stable : key.
  // ---------------------------------------------------------------------
  async #backfillAchievements(): Promise<number> {
    const rows = await this.#orm.prisma.achievement.findMany({
      where: { key: { in: ACHIEVEMENT_DEFINITIONS.map((a) => a.key) } },
      select: {
        id: true,
        key: true,
        nameFr: true,
        nameEn: true,
        descriptionFr: true,
        descriptionEn: true,
      },
    })
    const byKey = new Map(rows.map((r) => [r.key, r]))

    let updated = 0
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const row = byKey.get(def.key)
      if (!row) {
        continue
      }
      if (
        await this.#applyIfEligible({
          current: row.nameEn,
          currentFr: row.nameFr,
          target: def.nameEn,
          write: () =>
            this.#orm.prisma.achievement.update({
              where: { id: row.id },
              data: { nameEn: def.nameEn },
            }),
        })
      ) {
        updated++
      }
      if (
        await this.#applyIfEligible({
          current: row.descriptionEn,
          currentFr: row.descriptionFr,
          target: def.descriptionEn,
          write: () =>
            this.#orm.prisma.achievement.update({
              where: { id: row.id },
              data: { descriptionEn: def.descriptionEn },
            }),
        })
      ) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // Quest — clé stable : key.
  // ---------------------------------------------------------------------
  async #backfillQuests(): Promise<number> {
    const rows = await this.#orm.prisma.quest.findMany({
      where: { key: { in: QUEST_DEFINITIONS.map((q) => q.key) } },
      select: {
        id: true,
        key: true,
        nameFr: true,
        nameEn: true,
        descriptionFr: true,
        descriptionEn: true,
      },
    })
    const byKey = new Map(rows.map((r) => [r.key, r]))

    let updated = 0
    for (const def of QUEST_DEFINITIONS) {
      const row = byKey.get(def.key)
      if (!row) {
        continue
      }
      if (
        await this.#applyIfEligible({
          current: row.nameEn,
          currentFr: row.nameFr,
          target: def.nameEn,
          write: () =>
            this.#orm.prisma.quest.update({
              where: { id: row.id },
              data: { nameEn: def.nameEn },
            }),
        })
      ) {
        updated++
      }
      if (
        await this.#applyIfEligible({
          current: row.descriptionEn,
          currentFr: row.descriptionFr,
          target: def.descriptionEn,
          write: () =>
            this.#orm.prisma.quest.update({
              where: { id: row.id },
              data: { descriptionEn: def.descriptionEn },
            }),
        })
      ) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // ShopItem — pas de clé stable en base : rapprochement par nameFr (10
  // articles, noms distincts dans `SHOP_ITEMS`).
  // ---------------------------------------------------------------------
  async #backfillShopItems(): Promise<number> {
    const rows = await this.#orm.prisma.shopItem.findMany({
      where: { nameFr: { in: SHOP_ITEMS.map((i) => i.nameFr) } },
      select: {
        id: true,
        nameFr: true,
        nameEn: true,
        descriptionFr: true,
        descriptionEn: true,
      },
    })

    let updated = 0
    for (const def of SHOP_ITEMS) {
      const row = this.#findByNameFr(rows, def.nameFr, 'shopItem')
      if (!row) {
        continue
      }
      if (
        await this.#applyIfEligible({
          current: row.nameEn,
          currentFr: row.nameFr,
          target: def.nameEn,
          write: () =>
            this.#orm.prisma.shopItem.update({
              where: { id: row.id },
              data: { nameEn: def.nameEn },
            }),
        })
      ) {
        updated++
      }
      if (
        await this.#applyIfEligible({
          current: row.descriptionEn,
          currentFr: row.descriptionFr,
          target: def.descriptionEn,
          write: () =>
            this.#orm.prisma.shopItem.update({
              where: { id: row.id },
              data: { descriptionEn: def.descriptionEn },
            }),
        })
      ) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // SkillBranch — pas de colonne `key` en base (voir skills.definitions.ts) :
  // rapprochement par nameFr, comme le fait le seed lui-même.
  // ---------------------------------------------------------------------
  async #backfillSkillBranches(): Promise<number> {
    const defs = Object.values(SKILL_BRANCH_TEXT)
    const rows = await this.#orm.prisma.skillBranch.findMany({
      where: { nameFr: { in: defs.map((d) => d.nameFr) } },
      select: {
        id: true,
        nameFr: true,
        nameEn: true,
        descriptionFr: true,
        descriptionEn: true,
      },
    })

    let updated = 0
    for (const def of defs) {
      const row = this.#findByNameFr(rows, def.nameFr, 'skillBranch')
      if (!row) {
        continue
      }
      if (
        await this.#applyIfEligible({
          current: row.nameEn,
          currentFr: row.nameFr,
          target: def.nameEn,
          write: () =>
            this.#orm.prisma.skillBranch.update({
              where: { id: row.id },
              data: { nameEn: def.nameEn },
            }),
        })
      ) {
        updated++
      }
      if (
        await this.#applyIfEligible({
          current: row.descriptionEn,
          currentFr: row.descriptionFr,
          target: def.descriptionEn,
          write: () =>
            this.#orm.prisma.skillBranch.update({
              where: { id: row.id },
              data: { descriptionEn: def.descriptionEn },
            }),
        })
      ) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // SkillNode — même absence de `key` que SkillBranch, même rapprochement
  // par nameFr (27 nœuds, noms distincts dans `SKILL_NODE_TEXT`).
  // ---------------------------------------------------------------------
  async #backfillSkillNodes(): Promise<number> {
    const defs = Object.values(SKILL_NODE_TEXT)
    const rows = await this.#orm.prisma.skillNode.findMany({
      where: { nameFr: { in: defs.map((d) => d.nameFr) } },
      select: {
        id: true,
        nameFr: true,
        nameEn: true,
        descriptionFr: true,
        descriptionEn: true,
      },
    })

    let updated = 0
    for (const def of defs) {
      const row = this.#findByNameFr(rows, def.nameFr, 'skillNode')
      if (!row) {
        continue
      }
      if (
        await this.#applyIfEligible({
          current: row.nameEn,
          currentFr: row.nameFr,
          target: def.nameEn,
          write: () =>
            this.#orm.prisma.skillNode.update({
              where: { id: row.id },
              data: { nameEn: def.nameEn },
            }),
        })
      ) {
        updated++
      }
      if (
        await this.#applyIfEligible({
          current: row.descriptionEn,
          currentFr: row.descriptionFr,
          target: def.descriptionEn,
          write: () =>
            this.#orm.prisma.skillNode.update({
              where: { id: row.id },
              data: { descriptionEn: def.descriptionEn },
            }),
        })
      ) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // Equipment — clé stable : [slot, setKey, rarity, mainStat] (contrainte
  // @@unique du schéma). 665 lignes générées par `buildEquipmentCatalog()` :
  // un seul findMany sans filtre plutôt que 665 clauses OR.
  // ---------------------------------------------------------------------
  async #backfillEquipment(): Promise<number> {
    const rows = await this.#orm.prisma.equipment.findMany({
      select: {
        id: true,
        slot: true,
        setKey: true,
        rarity: true,
        mainStat: true,
        nameFr: true,
        nameEn: true,
      },
    })
    const byKey = new Map(
      rows.map((r) => [`${r.slot}|${r.setKey}|${r.rarity}|${r.mainStat}`, r]),
    )

    let updated = 0
    for (const def of buildEquipmentCatalog()) {
      const key = `${def.slot}|${def.setKey}|${def.rarity}|${def.mainStat}`
      const row = byKey.get(key)
      if (!row) {
        continue
      }
      const wrote = await this.#applyIfEligible({
        current: row.nameEn,
        currentFr: row.nameFr,
        target: def.nameEn,
        write: () =>
          this.#orm.prisma.equipment.update({
            where: { id: row.id },
            data: { nameEn: def.nameEn },
          }),
      })
      if (wrote) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // CampaignStage — clé stable : [chapter, index]. Pas de table de
  // définitions bilingues séparée : `campaignStageLabel(chapter, index)`
  // EST la source, volontairement identique FR/EN (« 3-10 Boss » se lit
  // pareil dans les deux langues, voir campaign.definitions.ts). On
  // recalcule donc la cible à partir des coordonnées de chaque ligne
  // existante plutôt que d'itérer une liste séparée.
  // ---------------------------------------------------------------------
  async #backfillCampaignStages(): Promise<number> {
    const rows = await this.#orm.prisma.campaignStage.findMany({
      select: {
        id: true,
        chapter: true,
        index: true,
        labelFr: true,
        labelEn: true,
      },
    })

    let updated = 0
    for (const row of rows) {
      const target = campaignStageLabel(row.chapter, row.index)
      const wrote = await this.#applyIfEligible({
        current: row.labelEn,
        currentFr: row.labelFr,
        target,
        write: () =>
          this.#orm.prisma.campaignStage.update({
            where: { id: row.id },
            data: { labelEn: target },
          }),
      })
      if (wrote) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // TowerFloor — clé stable : [element, index]. `buildTowerFloors()` donne
  // les 40 lignes (4 éléments × 10 étages) avec leur labelEn déjà calculé.
  // ---------------------------------------------------------------------
  async #backfillTowerFloors(): Promise<number> {
    const rows = await this.#orm.prisma.towerFloor.findMany({
      select: {
        id: true,
        element: true,
        index: true,
        labelFr: true,
        labelEn: true,
      },
    })
    const byKey = new Map(rows.map((r) => [`${r.element}|${r.index}`, r]))

    let updated = 0
    for (const def of buildTowerFloors()) {
      const row = byKey.get(`${def.element}|${def.index}`)
      if (!row) {
        continue
      }
      const wrote = await this.#applyIfEligible({
        current: row.labelEn,
        currentFr: row.labelFr,
        target: def.labelEn,
        write: () =>
          this.#orm.prisma.towerFloor.update({
            where: { id: row.id },
            data: { labelEn: def.labelEn },
          }),
      })
      if (wrote) {
        updated++
      }
    }
    return updated
  }

  // ---------------------------------------------------------------------
  // RaidBoss — clé stable : element (contrainte @unique du schéma ; ce
  // n'est PAS un champ `key`, contrairement à ce que suggérait le brief).
  // ---------------------------------------------------------------------
  async #backfillRaidBosses(): Promise<number> {
    const rows = await this.#orm.prisma.raidBoss.findMany({
      where: { element: { in: [...TOWER_ELEMENTS] } },
      select: { id: true, element: true, nameFr: true, nameEn: true },
    })
    const byElement = new Map(rows.map((r) => [r.element, r]))

    let updated = 0
    for (const element of TOWER_ELEMENTS) {
      const row = byElement.get(element)
      if (!row) {
        continue
      }
      const target = RAID_BOSS_NAME_EN[element]
      const wrote = await this.#applyIfEligible({
        current: row.nameEn,
        currentFr: row.nameFr,
        target,
        write: () =>
          this.#orm.prisma.raidBoss.update({
            where: { id: row.id },
            data: { nameEn: target },
          }),
      })
      if (wrote) {
        updated++
      }
    }
    return updated
  }
}
