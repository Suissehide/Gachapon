import { describe, expect, it } from '@jest/globals'

import { ACHIEVEMENT_DEFINITIONS } from '../../main/domain/content/achievements.definitions'
import {
  CHAPTER_COUNT,
  STAGES_PER_CHAPTER,
  campaignStageLabel,
} from '../../main/domain/content/campaign.definitions'
import { CARDS, HUMAN_CARD_SET } from '../../main/domain/content/cards.definitions'
import { ENEMY_FAMILIES } from '../../main/domain/content/enemies.definitions'
import {
  SET_LABEL_EN,
  SET_LABEL_FR,
  buildEquipmentCatalog,
} from '../../main/domain/content/equipment.definitions'
import { PASSIVE_TEXT } from '../../main/domain/content/passives.definitions'
import {
  RAID_BOSS_NAME,
  RAID_BOSS_NAME_EN,
  RAID_TIERS,
  raidTierLabelEn,
  raidTierLabelFr,
} from '../../main/domain/content/raid.definitions'
import { SHOP_ITEMS } from '../../main/domain/content/shop.definitions'
import { SKILL_BRANCH_TEXT, SKILL_NODE_TEXT } from '../../main/domain/content/skills.definitions'
import { buildTowerFloors } from '../../main/domain/content/tower.definitions'
import { TOWER_ELEMENTS } from '../../main/domain/tower/tower-slots'
import { QUEST_DEFINITIONS } from '../../main/domain/quests/quest-definitions'

/**
 * Garde-fou de traduction — task 8 du lot i18n.
 *
 * Deux fautes possibles pour une entrée bilingue :
 *  - une langue vide (traduction non écrite) ;
 *  - l'anglais qui recopie le français (traduction oubliée, la tâche 5 a
 *    fait un renommage mécanique qui a laissé passer massivement ce cas).
 *
 * Les rares recopies LÉGITIMES (prénom nu, mot cognat identique dans les
 * deux langues) sont nommées explicitement ci-dessous, une à une, avec leur
 * justification — jamais un `.filter` générique qui masquerait une vraie
 * traduction oubliée.
 */

// -----------------------------------------------------------------------
// Cartes — prénoms nus, sans épithète à traduire. Voir la règle du brief :
// « un prénom reste tel quel, son épithète se traduit ».
// -----------------------------------------------------------------------
const CARDS_LEGITIMATE_IDENTICAL = new Set([
  'HUM-007', // Aldric — prénom nu
  'HUM-008', // Aveline — prénom nu
  'HUM-009', // Gauvain — prénom nu
  'HUM-010', // Tristan — prénom nu
  'HUM-011', // Mahaut — prénom nu
  'HUM-012', // Lucien — prénom nu
  'HUM-013', // Alix — prénom nu
  'HUM-014', // Thibault — prénom nu
  'HUM-015', // Enguerrand — prénom nu
  'HUM-016', // Yseult — prénom nu
  'HUM-017', // Constant — prénom nu
  'HUM-018', // Blanche — prénom nu
  'HUM-020', // Baudouin — prénom nu
  'HUM-021', // Aymeric — prénom nu
  'HUM-022', // Eleonore — prénom nu
  'HUM-023', // Foulques — prénom nu
  'HUM-024', // Mélisande — prénom nu
  'HUM-025', // Perceval — prénom nu
  'HUM-032', // Josselin — prénom nu
  'HUM-033', // Oriane — prénom nu
  'HUM-036', // Garnier — prénom nu
])

// -----------------------------------------------------------------------
// Succès — mots cognats dont l'orthographe est strictement identique en
// français et en anglais. Une vraie traduction donnerait le même mot ; le
// laisser recopié n'est donc pas un oubli.
// -----------------------------------------------------------------------
const ACHIEVEMENTS_LEGITIMATE_IDENTICAL = new Set([
  'level_50', // "Expert" — cognat, même orthographe dans les deux langues
  'flawless_clears_100', // "Perfection" — cognat, même orthographe
])

// -----------------------------------------------------------------------
// Compétences — les 4 branches (Flux, Fortune, Collection, Combat) sont des
// noms courts choisis comme identifiants de branche, cognats et
// intentionnellement identiques dans les deux langues (comme les noms de
// set d'équipement FUREUR/AFFUT/... ne se traduisent pas). Les 3 nœuds
// ci-dessous sont des cognats ordinaires (même orthographe FR/EN).
// -----------------------------------------------------------------------
const SKILL_BRANCH_LEGITIMATE_IDENTICAL = new Set([
  'flux', // "Flux" — cognat, nom de branche
  'fortune', // "Fortune" — cognat, nom de branche
  'collection', // "Collection" — cognat, nom de branche
  'combat', // "Combat" — cognat, nom de branche
])
const SKILL_NODE_LEGITIMATE_IDENTICAL = new Set([
  'opulence', // "Opulence" — cognat, même orthographe FR/EN
  'artisan', // "Artisan" — cognat, même orthographe FR/EN
  'endurance', // "Endurance" — cognat, même orthographe FR/EN
])

// -----------------------------------------------------------------------
// Ennemis — familles dont le nom est un emprunt direct, identique dans les
// deux langues (bestiaire fantastique : le mot anglais/générique est aussi
// le mot français d'usage).
// -----------------------------------------------------------------------
const ENEMY_FAMILY_LEGITIMATE_IDENTICAL = new Set([
  'slimes', // "Slime" — emprunt, même mot dans les deux langues
  'kobolds', // "Kobold" — emprunt d20/fantasy, même mot
  'gnolls', // "Gnoll" — emprunt d20/fantasy, même mot
  'mimics', // "Mimic" — emprunt d20/fantasy, même mot
  'krakens', // "Kraken" — nom propre mythologique, même mot
  'bosses', // "Boss" — emprunt courant, même mot
])

// -----------------------------------------------------------------------
// Passifs — libellés courts qui sont des cognats stricts (même orthographe
// FR/EN). Les descriptions, elles, sont toujours des phrases complètes,
// jamais identiques.
// -----------------------------------------------------------------------
const PASSIVE_LABEL_LEGITIMATE_IDENTICAL = new Set([
  'RIPOSTE', // "Riposte" — cognat (terme d'escrime déjà anglais)
  'FORTIFY', // "Fortification" — cognat, même orthographe FR/EN
  'NEMESIS', // "Vengeance" — cognat, même orthographe FR/EN
  'POISON', // "Poison" — cognat, même orthographe FR/EN
])

function expectBothLanguages(
  label: string,
  nameFr: string,
  nameEn: string,
): void {
  if (nameFr.trim().length === 0) {
    throw new Error(`${label} : nameFr vide`)
  }
  if (nameEn.trim().length === 0) {
    throw new Error(`${label} : nameEn vide`)
  }
}

describe('traductions du contenu — cartes', () => {
  it('donne deux langues à chaque carte', () => {
    for (const card of CARDS) {
      expectBothLanguages(card.id, card.nameFr, card.nameEn)
    }
  })

  it('ne laisse pas l’anglais recopier le français, hors prénoms nus', () => {
    const copied = CARDS.filter(
      (c) => c.nameFr === c.nameEn && !CARDS_LEGITIMATE_IDENTICAL.has(c.id),
    )
    expect(copied.map((c) => c.id)).toEqual([])
  })

  it('traduit le set Royaume des Humains', () => {
    expectBothLanguages(
      'HUMAN_CARD_SET.name',
      HUMAN_CARD_SET.nameFr,
      HUMAN_CARD_SET.nameEn,
    )
    expectBothLanguages(
      'HUMAN_CARD_SET.description',
      HUMAN_CARD_SET.descriptionFr,
      HUMAN_CARD_SET.descriptionEn,
    )
    expect(HUMAN_CARD_SET.nameFr).not.toBe(HUMAN_CARD_SET.nameEn)
    expect(HUMAN_CARD_SET.descriptionFr).not.toBe(HUMAN_CARD_SET.descriptionEn)
  })
})

describe('traductions du contenu — succès', () => {
  it('donne deux langues à chaque succès', () => {
    for (const a of ACHIEVEMENT_DEFINITIONS) {
      expectBothLanguages(`${a.key} (name)`, a.nameFr, a.nameEn)
      expectBothLanguages(`${a.key} (description)`, a.descriptionFr, a.descriptionEn)
    }
  })

  it('ne laisse pas l’anglais recopier le français, hors cognats déclarés', () => {
    const copiedNames = ACHIEVEMENT_DEFINITIONS.filter(
      (a) =>
        a.nameFr === a.nameEn && !ACHIEVEMENTS_LEGITIMATE_IDENTICAL.has(a.key),
    )
    expect(copiedNames.map((a) => a.key)).toEqual([])

    const copiedDescriptions = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.descriptionFr === a.descriptionEn,
    )
    expect(copiedDescriptions.map((a) => a.key)).toEqual([])
  })
})

describe('traductions du contenu — compétences', () => {
  it('donne deux langues à chaque branche et chaque nœud', () => {
    for (const [key, branch] of Object.entries(SKILL_BRANCH_TEXT)) {
      expectBothLanguages(`branche ${key}`, branch.nameFr, branch.nameEn)
      expectBothLanguages(
        `branche ${key} (description)`,
        branch.descriptionFr,
        branch.descriptionEn,
      )
    }
    for (const [key, node] of Object.entries(SKILL_NODE_TEXT)) {
      expectBothLanguages(`nœud ${key}`, node.nameFr, node.nameEn)
      expectBothLanguages(
        `nœud ${key} (description)`,
        node.descriptionFr,
        node.descriptionEn,
      )
    }
  })

  it('ne laisse pas l’anglais recopier le français, hors cognats déclarés', () => {
    const copiedBranches = Object.entries(SKILL_BRANCH_TEXT).filter(
      ([key, b]) =>
        b.nameFr === b.nameEn && !SKILL_BRANCH_LEGITIMATE_IDENTICAL.has(key),
    )
    expect(copiedBranches.map(([key]) => key)).toEqual([])

    const copiedBranchDescriptions = Object.entries(SKILL_BRANCH_TEXT).filter(
      ([, b]) => b.descriptionFr === b.descriptionEn,
    )
    expect(copiedBranchDescriptions.map(([key]) => key)).toEqual([])

    const copiedNodes = Object.entries(SKILL_NODE_TEXT).filter(
      ([key, n]) =>
        n.nameFr === n.nameEn && !SKILL_NODE_LEGITIMATE_IDENTICAL.has(key),
    )
    expect(copiedNodes.map(([key]) => key)).toEqual([])

    const copiedNodeDescriptions = Object.entries(SKILL_NODE_TEXT).filter(
      ([, n]) => n.descriptionFr === n.descriptionEn,
    )
    expect(copiedNodeDescriptions.map(([key]) => key)).toEqual([])
  })
})

describe('traductions du contenu — boutique', () => {
  it('donne deux langues à chaque article, sans recopie', () => {
    for (const item of SHOP_ITEMS) {
      expectBothLanguages(item.nameFr, item.nameFr, item.nameEn)
      expectBothLanguages(
        `${item.nameFr} (description)`,
        item.descriptionFr,
        item.descriptionEn,
      )
      expect(item.nameFr).not.toBe(item.nameEn)
      expect(item.descriptionFr).not.toBe(item.descriptionEn)
    }
  })
})

describe('traductions du contenu — équipement', () => {
  it('donne deux langues à chaque pièce du catalogue, sans recopie', () => {
    const rows = buildEquipmentCatalog()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expectBothLanguages(row.nameFr, row.nameFr, row.nameEn)
      expect(row.nameFr).not.toBe(row.nameEn)
    }
  })
})

// Tâche 4 du lot i18n (amendement A4), round 2 — `SET_LABEL_FR`/`SET_LABEL_EN`
// nomment un EFFET (drain, percée, guet), pas une entité : contrairement aux
// branches de compétences (Flux/Fortune/Collection/Combat, cognates
// identiques dans les deux langues), ces libellés se traduisent, sans
// exception connue.
describe('traductions du contenu — sets d’équipement', () => {
  it('donne deux langues à chaque set, sans recopie', () => {
    for (const [key, labelFr] of Object.entries(SET_LABEL_FR)) {
      const labelEn = SET_LABEL_EN[key as keyof typeof SET_LABEL_EN]
      expectBothLanguages(`set ${key}`, labelFr, labelEn)
      expect(labelFr).not.toBe(labelEn)
    }
  })
})

describe('traductions du contenu — quêtes', () => {
  it('donne deux langues à chaque quête', () => {
    for (const quest of QUEST_DEFINITIONS) {
      expectBothLanguages(`${quest.key} (name)`, quest.nameFr, quest.nameEn)
      expectBothLanguages(
        `${quest.key} (description)`,
        quest.descriptionFr,
        quest.descriptionEn,
      )
    }
  })

  it('ne laisse pas l’anglais recopier le français', () => {
    const copiedNames = QUEST_DEFINITIONS.filter((q) => q.nameFr === q.nameEn)
    expect(copiedNames.map((q) => q.key)).toEqual([])

    const copiedDescriptions = QUEST_DEFINITIONS.filter(
      (q) => q.descriptionFr === q.descriptionEn,
    )
    expect(copiedDescriptions.map((q) => q.key)).toEqual([])
  })
})

describe('traductions du contenu — raid', () => {
  it('donne deux langues à chaque boss, sans recopie', () => {
    for (const element of TOWER_ELEMENTS) {
      expectBothLanguages(
        `boss ${element}`,
        RAID_BOSS_NAME[element],
        RAID_BOSS_NAME_EN[element],
      )
      expect(RAID_BOSS_NAME[element]).not.toBe(RAID_BOSS_NAME_EN[element])
    }
  })

  it('donne deux langues au gabarit de palier, sans recopie', () => {
    for (const tier of RAID_TIERS) {
      const fr = raidTierLabelFr(tier.pct)
      const en = raidTierLabelEn(tier.pct)
      expectBothLanguages(`palier ${tier.pct}%`, fr, en)
      expect(fr).not.toBe(en)
    }
  })
})

describe('traductions du contenu — tours', () => {
  it('donne deux langues à chaque étage de tour, sans recopie', () => {
    const floors = buildTowerFloors()
    expect(floors.length).toBeGreaterThan(0)
    for (const floor of floors) {
      expectBothLanguages(floor.labelFr, floor.labelFr, floor.labelEn)
      expect(floor.labelFr).not.toBe(floor.labelEn)
    }
  })
})

describe('traductions du contenu — campagne', () => {
  // Exception nommée et documentée : `campaignStageLabel` (voir
  // campaign.definitions.ts) est un gabarit VOLONTAIREMENT identique dans
  // les deux langues — « 3-10 Boss » se lit pareil en français et en
  // anglais, « boss » étant le mot anglais emprunté tel quel par le
  // français. Ce n'est pas une recopie oubliée : c'est testé ici pour que
  // ça le reste consciemment, pas par défaut.
  it('donne un libellé non vide à chaque étage, identique FR/EN par construction', () => {
    for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
      for (let index = 1; index <= STAGES_PER_CHAPTER; index++) {
        const label = campaignStageLabel(chapter, index)
        expect(label.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('marque le boss de fin de chapitre', () => {
    expect(campaignStageLabel(3, STAGES_PER_CHAPTER)).toBe('3-10 Boss')
    expect(campaignStageLabel(3, 1)).toBe('3-1')
  })
})

// Tâche 4 du lot i18n (amendement A4) — noms d'ennemis et libellés de
// passifs, jusque-là calculés en code et servis en français quelle que soit
// la locale demandée.
describe('traductions du contenu — ennemis', () => {
  it('donne deux langues à chaque famille du bestiaire', () => {
    for (const [slug, family] of Object.entries(ENEMY_FAMILIES)) {
      expectBothLanguages(`famille ${slug}`, family.nameFr, family.nameEn)
    }
  })

  it('ne laisse pas l’anglais recopier le français, hors emprunts déclarés', () => {
    const copied = Object.entries(ENEMY_FAMILIES).filter(
      ([slug, family]) =>
        family.nameFr === family.nameEn &&
        !ENEMY_FAMILY_LEGITIMATE_IDENTICAL.has(slug),
    )
    expect(copied.map(([slug]) => slug)).toEqual([])
  })
})

describe('traductions du contenu — passifs', () => {
  it('donne deux langues au libellé de chaque passif', () => {
    for (const [key, text] of Object.entries(PASSIVE_TEXT)) {
      expectBothLanguages(`passif ${key} (label)`, text.labelFr, text.labelEn)
    }
  })

  it('ne laisse pas l’anglais recopier le français, hors cognats déclarés', () => {
    const copied = Object.entries(PASSIVE_TEXT).filter(
      ([key, text]) =>
        text.labelFr === text.labelEn &&
        !PASSIVE_LABEL_LEGITIMATE_IDENTICAL.has(key),
    )
    expect(copied.map(([key]) => key)).toEqual([])
  })

  it('donne deux langues et jamais la même phrase à la description de chaque passif, sur toute la plage de paliers', () => {
    for (const [key, text] of Object.entries(PASSIVE_TEXT)) {
      for (let palier = 1; palier <= 6; palier++) {
        const fr = text.describeFr(palier)
        const en = text.describeEn(palier)
        expectBothLanguages(`passif ${key} (describe, palier ${palier})`, fr, en)
        expect(fr).not.toBe(en)
      }
    }
  })
})
