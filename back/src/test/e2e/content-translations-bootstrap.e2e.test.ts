import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { ACHIEVEMENT_DEFINITIONS } from '../../main/domain/content/achievements.definitions'
import { campaignStageLabel } from '../../main/domain/content/campaign.definitions'
import { CARDS, HUMAN_CARD_SET } from '../../main/domain/content/cards.definitions'
import { RAID_BOSS_NAME, RAID_BOSS_NAME_EN } from '../../main/domain/content/raid.definitions'
import { runWithLocale } from '../../main/infra/i18n/locale-context'
import { buildTestApp } from '../helpers/build-test-app'

/**
 * Tâche 9 — backfill des traductions au démarrage.
 *
 * IMPORTANT : la migration `20260921151247_i18n_content_columns` recopie le
 * FRANÇAIS dans la colonne anglaise (`nameEn = name`), jamais une chaîne
 * vide. L'état « post-migration » qu'on doit simuler ici est donc
 * `nameEn === nameFr`, pas `nameEn === ''` — la colonne vide n'est qu'un cas
 * particulier (une entité créée à la main sans traduction). Chaque bloc
 * ci-dessous construit explicitement les DEUX états.
 *
 * `contentTranslationsBootstrap.bootstrap()` opère sur TOUTE la base — c'est
 * précisément son rôle en production (le déploiement ne rejoue jamais les
 * seeds). Dans cette suite e2e, la base est partagée par tout le run
 * (`globalSetup.ts`, un seul worker), donc l'appeler ici touche aussi les
 * lignes que d'autres fichiers e2e ont pu créer. Vérifié avant d'écrire ce
 * fichier : aucun autre test e2e n'affirme quoi que ce soit sur du texte
 * `label`/`name` de `CampaignStage`/`Achievement` — seules leurs valeurs
 * numériques/gameplay sont contrôlées — donc une réécriture par ce bootstrap
 * ne peut pas faire échouer un autre test. Les clés utilisées ici (ids de
 * carte, `chapter` de campagne) sont par ailleurs choisies pour ne
 * correspondre à aucune fixture existante (voir commentaires).
 */
describe('backfill des traductions au démarrage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  // -----------------------------------------------------------------------
  // Card — clé stable : id (HUM-001..038, fixés par le seed). Aucun autre
  // fichier e2e ne crée de Card avec un id 'HUM-0xx' (vérifié par recherche
  // avant d'écrire ce test) : pas de risque d'interférence.
  // -----------------------------------------------------------------------
  describe('Card (clé : id)', () => {
    let cardSetId: string

    beforeAll(async () => {
      const { postgresOrm } = app.iocContainer
      const set = await postgresOrm.prisma.cardSet.create({
        data: { nameFr: 'Set de test — bootstrap i18n', nameEn: 'Test set — i18n bootstrap' },
      })
      cardSetId = set.id
    })

    it("backfille quand l'anglais est la recopie du français faite par la migration", async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const def = CARDS.find((c) => c.id === 'HUM-001')
      if (!def) throw new Error('HUM-001 introuvable dans CARDS')

      // État post-migration réel : nameEn = nameFr (recopie), pas ''.
      await postgresOrm.prisma.card.upsert({
        where: { id: 'HUM-001' },
        create: {
          id: 'HUM-001',
          setId: cardSetId,
          nameFr: def.nameFr,
          nameEn: def.nameFr,
          rarity: def.rarity,
        },
        update: { nameFr: def.nameFr, nameEn: def.nameFr },
      })

      const result = await contentTranslationsBootstrap.bootstrap()
      expect(result.updated).toBeGreaterThan(0)

      const card = await runWithLocale('EN', () =>
        postgresOrm.prisma.card.findUniqueOrThrow({ where: { id: 'HUM-001' } }),
      )
      expect(card.name).toBe(def.nameEn)
      // Preuve que ce n'est pas un hasard de repli : la colonne EN elle-même
      // a bien été écrite, pas seulement le champ calculé au moment de la
      // lecture.
      const raw = await postgresOrm.prisma.card.findUniqueOrThrow({ where: { id: 'HUM-001' } })
      expect(raw.nameEn).toBe(def.nameEn)
    })

    it("backfille aussi quand l'anglais est une chaîne vide", async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const def = CARDS.find((c) => c.id === 'HUM-002')
      if (!def) throw new Error('HUM-002 introuvable dans CARDS')

      await postgresOrm.prisma.card.upsert({
        where: { id: 'HUM-002' },
        create: {
          id: 'HUM-002',
          setId: cardSetId,
          nameFr: def.nameFr,
          nameEn: '',
          rarity: def.rarity,
        },
        update: { nameFr: def.nameFr, nameEn: '' },
      })

      await contentTranslationsBootstrap.bootstrap()

      const card = await runWithLocale('EN', () =>
        postgresOrm.prisma.card.findUniqueOrThrow({ where: { id: 'HUM-002' } }),
      )
      expect(card.name).toBe(def.nameEn)
    })

    it('ne touche jamais une traduction saisie à la main', async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const def = CARDS.find((c) => c.id === 'HUM-003')
      if (!def) throw new Error('HUM-003 introuvable dans CARDS')

      const handWritten = 'Ma traduction perso (test bootstrap)'
      await postgresOrm.prisma.card.upsert({
        where: { id: 'HUM-003' },
        create: {
          id: 'HUM-003',
          setId: cardSetId,
          nameFr: def.nameFr,
          nameEn: handWritten,
          rarity: def.rarity,
        },
        update: { nameFr: def.nameFr, nameEn: handWritten },
      })

      await contentTranslationsBootstrap.bootstrap()

      const card = await runWithLocale('EN', () =>
        postgresOrm.prisma.card.findUniqueOrThrow({ where: { id: 'HUM-003' } }),
      )
      expect(card.name).toBe(handWritten)
    })

    it('est idempotent : un second appel sans mutation ne réécrit rien', async () => {
      const { contentTranslationsBootstrap } = app.iocContainer
      // Les trois cartes ci-dessus sont déjà dans leur état cible (ou
      // protégées) à ce stade de la suite.
      await contentTranslationsBootstrap.bootstrap()
      const second = await contentTranslationsBootstrap.bootstrap()
      expect(second.updated).toBe(0)
    })

    it('ignore une carte absente des définitions (créée en prod) et laisse le repli faire son travail', async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const id = `UNKNOWN-BOOTSTRAP-${Date.now()}`
      await postgresOrm.prisma.card.create({
        data: {
          id,
          setId: cardSetId,
          nameFr: 'Carte créée en production',
          nameEn: '',
          rarity: 'COMMON',
        },
      })

      await expect(contentTranslationsBootstrap.bootstrap()).resolves.toBeDefined()

      // Colonne brute : jamais touchée, cette carte n'est dans aucune
      // définition connue du bootstrap.
      const raw = await postgresOrm.prisma.card.findUniqueOrThrow({ where: { id } })
      expect(raw.nameEn).toBe('')

      // Le champ calculé, lui, reste lisible : localized.extension.ts replie
      // sur le français quand l'anglais est vide.
      const card = await runWithLocale('EN', () =>
        postgresOrm.prisma.card.findUniqueOrThrow({ where: { id } }),
      )
      expect(card.name).toBe('Carte créée en production')

      await postgresOrm.prisma.card.delete({ where: { id } })
    })
  })

  // -----------------------------------------------------------------------
  // CardSet — pas de clé stable en base (id = uuid seedé) : rapprochement par
  // `nameFr` via `findByNameFr` (couverture unitaire dédiée par ailleurs,
  // voir `content-translations-find-by-name-fr.test.ts`, dont le cas
  // d'ambiguïté). Ce test-ci prouve le chemin d'écriture de bout en bout sur
  // le contenu réel : `HUMAN_CARD_SET.nameFr` (« Royaume des Humains ») n'est
  // utilisé par aucun autre fichier e2e (vérifié par recherche), donc pas de
  // risque de collision comme il y en aurait sur ShopItem/SkillBranch (voir
  // le rapport de tâche : `shop.test.ts` crée déjà des ShopItem nommés
  // « Boost Rare+ »/« Boost Épique », les noms réels de production).
  // -----------------------------------------------------------------------
  describe('CardSet (clé : nameFr, via findByNameFr)', () => {
    it("backfille name et description quand l'anglais est la recopie du français", async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer

      // Une seule ligne CardSet porte ce nameFr dans une base réelle : on
      // force son état post-migration (recopie), en la créant si un run
      // antérieur ne l'a pas laissée (CardSet n'a pas de clé unique sur
      // laquelle upserter directement).
      const existing = await postgresOrm.prisma.cardSet.findFirst({
        where: { nameFr: HUMAN_CARD_SET.nameFr },
      })
      const recopy = {
        nameFr: HUMAN_CARD_SET.nameFr,
        nameEn: HUMAN_CARD_SET.nameFr,
        descriptionFr: HUMAN_CARD_SET.descriptionFr,
        descriptionEn: HUMAN_CARD_SET.descriptionFr,
      }
      if (existing) {
        await postgresOrm.prisma.cardSet.update({ where: { id: existing.id }, data: recopy })
      } else {
        await postgresOrm.prisma.cardSet.create({ data: recopy })
      }

      const result = await contentTranslationsBootstrap.bootstrap()
      expect(result.updated).toBeGreaterThan(0)

      const row = await postgresOrm.prisma.cardSet.findFirstOrThrow({
        where: { nameFr: HUMAN_CARD_SET.nameFr },
      })
      expect(row.nameEn).toBe(HUMAN_CARD_SET.nameEn)
      expect(row.descriptionEn).toBe(HUMAN_CARD_SET.descriptionEn)
    })
  })

  // -----------------------------------------------------------------------
  // Achievement — clé stable : key (contrainte @unique du schéma). 'pulls_10'
  // est une clé réelle de ACHIEVEMENT_DEFINITIONS ; aucun autre fichier e2e
  // ne crée d'Achievement avec cette clé (vérifié par recherche).
  // -----------------------------------------------------------------------
  describe('Achievement (clé : key)', () => {
    it("backfille name et description quand l'anglais est la recopie du français", async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.key === 'pulls_10')
      if (!def) throw new Error('pulls_10 introuvable dans ACHIEVEMENT_DEFINITIONS')

      await postgresOrm.prisma.achievement.upsert({
        where: { key: 'pulls_10' },
        create: {
          key: 'pulls_10',
          nameFr: def.nameFr,
          nameEn: def.nameFr,
          descriptionFr: def.descriptionFr,
          descriptionEn: def.descriptionFr,
          criterion: def.criterion,
        },
        update: {
          nameFr: def.nameFr,
          nameEn: def.nameFr,
          descriptionFr: def.descriptionFr,
          descriptionEn: def.descriptionFr,
        },
      })

      const result = await contentTranslationsBootstrap.bootstrap()
      expect(result.updated).toBeGreaterThan(0)

      const row = await postgresOrm.prisma.achievement.findUniqueOrThrow({
        where: { key: 'pulls_10' },
      })
      expect(row.nameEn).toBe(def.nameEn)
      expect(row.descriptionEn).toBe(def.descriptionEn)
    })

    it('ne touche pas une description saisie à la main même si le nom, lui, doit être corrigé', async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.key === 'pulls_10')
      if (!def) throw new Error('pulls_10 introuvable dans ACHIEVEMENT_DEFINITIONS')
      const handWrittenDescription = 'Description saisie à la main (test)'

      await postgresOrm.prisma.achievement.update({
        where: { key: 'pulls_10' },
        data: {
          // On re-désynchronise le nom (comme si la migration venait de
          // passer une seconde fois) mais on laisse une description
          // manuscrite en place.
          nameEn: def.nameFr,
          descriptionEn: handWrittenDescription,
        },
      })

      await contentTranslationsBootstrap.bootstrap()

      const row = await postgresOrm.prisma.achievement.findUniqueOrThrow({
        where: { key: 'pulls_10' },
      })
      expect(row.nameEn).toBe(def.nameEn)
      expect(row.descriptionEn).toBe(handWrittenDescription)
    })
  })

  // -----------------------------------------------------------------------
  // CampaignStage — clé stable : [chapter, index], mais PAS de liste de
  // définitions bilingues séparée : la cible est calculée depuis les
  // coordonnées de la ligne elle-même (`campaignStageLabel`). `chapter: 777`
  // est hors de toute plage réelle (CHAPTER_COUNT = 9) et n'est utilisé par
  // aucun autre fichier e2e (vérifié par recherche) : ce test peut choisir sa
  // cible sans dépendre d'aucune autre fixture.
  //
  // Sert aussi de preuve pour le piège documenté dans le bootstrap : le
  // gabarit `campaignStageLabel` est volontairement identique FR/EN, donc
  // « nameEn = nameFr » n'est PAS toujours le signe d'un artefact de
  // migration ici — écrire dessus sans comparer à la cible calculée
  // réécrirait la ligne à l'identique À CHAQUE appel et casserait
  // l'idempotence.
  // -----------------------------------------------------------------------
  describe('CampaignStage (clé : [chapter, index], cible calculée par ligne)', () => {
    it('calcule la cible à partir de chapter/index quand la colonne anglaise est vide', async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const target = campaignStageLabel(777, 3)

      await postgresOrm.prisma.campaignStage.upsert({
        where: { chapter_index: { chapter: 777, index: 3 } },
        create: {
          chapter: 777,
          index: 3,
          labelFr: target,
          labelEn: '',
          enemyTeam: {},
          lootTable: {},
          order: 0,
        },
        update: { labelFr: target, labelEn: '' },
      })

      await contentTranslationsBootstrap.bootstrap()

      const row = await postgresOrm.prisma.campaignStage.findUniqueOrThrow({
        where: { chapter_index: { chapter: 777, index: 3 } },
      })
      expect(row.labelEn).toBe(target)
    })

    it("une ligne déjà correcte (FR = EN par construction) n'est jamais réécrite, y compris à répétition", async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer
      const target = campaignStageLabel(777, 10) // '777-10 Boss'

      await postgresOrm.prisma.campaignStage.upsert({
        where: { chapter_index: { chapter: 777, index: 10 } },
        create: {
          chapter: 777,
          index: 10,
          labelFr: target,
          labelEn: target,
          enemyTeam: {},
          lootTable: {},
          order: 0,
        },
        update: { labelFr: target, labelEn: target },
      })

      // Deux passages consécutifs : si le critère était « nameEn = nameFr »
      // sans comparaison à la cible, cette ligne (légitimement identique
      // dans les deux langues) serait réécrite à l'identique à chaque appel
      // et le second passage ne rendrait jamais 0.
      await contentTranslationsBootstrap.bootstrap()
      const second = await contentTranslationsBootstrap.bootstrap()
      expect(second.updated).toBe(0)

      const row = await postgresOrm.prisma.campaignStage.findUniqueOrThrow({
        where: { chapter_index: { chapter: 777, index: 10 } },
      })
      expect(row.labelEn).toBe(target)
    })
  })

  // -----------------------------------------------------------------------
  // RaidBoss — clé stable : element (contrainte @unique du schéma, PAS un
  // champ `key` : le brief se trompait). `element` ne prend que 4 valeurs
  // réelles, donc pas d'id « inutilisé ailleurs » possible ici : on force
  // l'état de départ par `upsert` pour rester déterministe quel que soit ce
  // qu'un autre fichier e2e a pu faire de cette ligne.
  //
  // Fait notable découvert en écrivant ce test (voir le rapport de tâche) :
  // la migration de contenu `20260908191242_seed_raid_content` insère ces 4
  // lignes dans TOUTE base fraîchement migrée (dev, e2e, prod), avec l'ancien
  // nom unique recopié par la migration i18n dans nameFr ET nameEn. Le tout
  // premier `bootstrap()` de cette suite (voir le test Card ci-dessus, qui
  // s'exécute avant celui-ci) les corrige donc déjà réellement — ce test
  // force en plus l'état de départ pour ne pas dépendre de cet ordre.
  // -----------------------------------------------------------------------
  describe('RaidBoss (clé : element)', () => {
    it("backfille quand l'anglais est la recopie du français faite par la migration", async () => {
      const { postgresOrm, contentTranslationsBootstrap } = app.iocContainer

      await postgresOrm.prisma.raidBoss.upsert({
        where: { element: 'FIRE' },
        update: { nameFr: RAID_BOSS_NAME.FIRE, nameEn: RAID_BOSS_NAME.FIRE },
        create: {
          element: 'FIRE',
          nameFr: RAID_BOSS_NAME.FIRE,
          nameEn: RAID_BOSS_NAME.FIRE,
          spec: {},
        },
      })

      await contentTranslationsBootstrap.bootstrap()

      const row = await postgresOrm.prisma.raidBoss.findUniqueOrThrow({
        where: { element: 'FIRE' },
      })
      expect(row.nameEn).toBe(RAID_BOSS_NAME_EN.FIRE)
    })
  })
})
