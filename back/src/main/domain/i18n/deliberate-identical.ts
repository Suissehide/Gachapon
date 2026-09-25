import { ACHIEVEMENT_DEFINITIONS } from '../content/achievements.definitions'
import {
  CHAPTER_COUNT,
  campaignStageLabel,
  STAGES_PER_CHAPTER,
} from '../content/campaign.definitions'
import { CARDS, HUMAN_CARD_SET } from '../content/cards.definitions'
import { buildEquipmentCatalog } from '../content/equipment.definitions'
import {
  IMPORTED_CARD_NAMES,
  IMPORTED_CARD_SETS,
} from '../content/imported-cards.definitions'
import { RAID_BOSS_NAME, RAID_BOSS_NAME_EN } from '../content/raid.definitions'
import { SHOP_ITEMS } from '../content/shop.definitions'
import {
  SKILL_BRANCH_TEXT,
  SKILL_NODE_TEXT,
} from '../content/skills.definitions'
import { buildTowerFloors } from '../content/tower.definitions'
import { QUEST_DEFINITIONS } from '../quests/quest-definitions'
import { TOWER_ELEMENTS } from '../tower/tower-slots'

/**
 * Les valeurs dont le code livre DÉLIBÉRÉMENT la même chaîne en français et
 * en anglais.
 *
 * Existe pour l'écran des traductions manquantes. Celui-ci doit signaler les
 * paires identiques — c'est la signature de la recopie faite par la
 * migration `20260921151247_i18n_content_columns` (`nameEn = name`) et de
 * tout import qui envoie `nameEn = nameFr`. Mais l'identité n'est pas
 * toujours une faute : un prénom nu (« Aldric »), un cognat (« Expert »,
 * « Flux »), un gabarit volontairement bilingue (`campaignStageLabel`,
 * « 3-10 Boss ») se lisent pareil dans les deux langues. Une liste qui crie
 * au loup sur ces trente entrées-là ne sera pas plus lue qu'une liste vide.
 *
 * POURQUOI dériver des définitions plutôt qu'écrire une liste d'exclusion :
 * `src/test/unit/content-translations.test.ts` recense déjà ces cas à la
 * main, un par un, avec leur justification — et c'est LUI qui garantit
 * qu'aucune vraie traduction oubliée ne s'y cache. Recopier cette liste ici
 * créerait une seconde source qui divergerait au premier ajout de contenu.
 * En la dérivant, toute identité nouvelle est soit refusée par ce test
 * (donc corrigée), soit assumée dans les définitions (donc légitimement
 * absente de l'écran). Aucune liste à maintenir.
 *
 * Portée : un ensemble de VALEURS, pas de couples (entité, id). C'est plus
 * large que nécessaire — une carte importée qui s'appellerait « Aldric »
 * serait exclue elle aussi — mais c'est le bon biais : cette identité-là
 * est légitime pour la même raison, et l'ensemble reste utilisable sur des
 * lignes que le code ne connaît pas (les 17 familles de cartes importées
 * par l'API).
 *
 * Calculé une fois puis mémorisé : `buildEquipmentCatalog()` génère 665
 * lignes et l'écran est consulté par un administrateur, pas par un joueur.
 */
let cached: ReadonlySet<string> | null = null

export function deliberateIdenticalValues(): ReadonlySet<string> {
  if (cached !== null) {
    return cached
  }

  const values = new Set<string>()
  const add = (fr: string | null, en: string | null): void => {
    if (fr !== null && fr !== '' && fr === en) {
      values.add(fr)
    }
  }

  for (const card of CARDS) {
    add(card.nameFr, card.nameEn)
  }
  add(HUMAN_CARD_SET.nameFr, HUMAN_CARD_SET.nameEn)
  add(HUMAN_CARD_SET.descriptionFr, HUMAN_CARD_SET.descriptionEn)
  for (const card of Object.values(IMPORTED_CARD_NAMES)) {
    add(card.nameFr, card.nameEn)
  }
  for (const set of IMPORTED_CARD_SETS) {
    add(set.nameFr, set.nameEn)
    add(set.descriptionFr, set.descriptionEn)
  }

  for (const a of ACHIEVEMENT_DEFINITIONS) {
    add(a.nameFr, a.nameEn)
    add(a.descriptionFr, a.descriptionEn)
  }
  for (const q of QUEST_DEFINITIONS) {
    add(q.nameFr, q.nameEn)
    add(q.descriptionFr, q.descriptionEn)
  }
  for (const item of SHOP_ITEMS) {
    add(item.nameFr, item.nameEn)
    add(item.descriptionFr, item.descriptionEn)
  }
  for (const branch of Object.values(SKILL_BRANCH_TEXT)) {
    add(branch.nameFr, branch.nameEn)
    add(branch.descriptionFr, branch.descriptionEn)
  }
  for (const node of Object.values(SKILL_NODE_TEXT)) {
    add(node.nameFr, node.nameEn)
    add(node.descriptionFr, node.descriptionEn)
  }
  for (const piece of buildEquipmentCatalog()) {
    add(piece.nameFr, piece.nameEn)
  }
  for (const floor of buildTowerFloors()) {
    add(floor.labelFr, floor.labelEn)
  }
  for (const element of TOWER_ELEMENTS) {
    add(RAID_BOSS_NAME[element], RAID_BOSS_NAME_EN[element])
  }

  // CampaignStage n'a pas de table de définitions : `campaignStageLabel` EST
  // la source, et son gabarit (« 3-10 Boss ») est identique dans les deux
  // langues par construction — les 90 étages seraient donc 90 faux positifs.
  // On énumère les coordonnées connues du code plutôt que d'exclure
  // `campaignStage.label` en bloc : si un dixième chapitre arrive,
  // `CHAPTER_COUNT` bouge avec lui.
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
    for (let index = 1; index <= STAGES_PER_CHAPTER; index++) {
      values.add(campaignStageLabel(chapter, index))
    }
  }

  cached = values
  return cached
}
