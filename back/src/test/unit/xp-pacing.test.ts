import { beforeAll, describe, expect, it } from '@jest/globals'

import {
  CHAPTER_COUNT,
  STAGES_PER_CHAPTER,
  bossLoot,
  lootTableNormal,
} from '../../../prisma/seed/campaign'
import { towerFloorLoot } from '../../../prisma/seed/tower'
import { TOWER_ELEMENTS, TOWER_FLOOR_COUNT } from '../../main/domain/tower/tower-slots'
import { calculateLevel, xpForLevel } from '../../main/domain/shared/xp'
import { DEFAULTS } from '../../main/infra/config/config.service'
import { effectAtRank } from '../helpers/skill-tree-seed'

/**
 * Cadence du NIVEAU JOUEUR. Garde-fou du ralentissement du 2026-09-15, où un
 * joueur actif atteignait le niveau 30 en une seule journée.
 *
 * Ce modèle est volontairement la borne HAUTE (« le joueur ne perd jamais ») :
 * le seul verrou d'un étage de campagne dans le code est SÉQUENTIEL
 * (`campaign.domain.ts` — il faut avoir fini le précédent), il n'y a aucune
 * exigence de niveau. La cadence réelle est donc bornée par l'ÉNERGIE seule,
 * pas par la parité de niveau que suppose `economy-progression.test.ts` — qui
 * modélise, lui, la borne BASSE (« le joueur est freiné par la difficulté »).
 * La vérité vit entre les deux ; ce fichier vérifie que même le cas le plus
 * rapide reste acceptable.
 *
 * Les valeurs viennent des VRAIES sources (DEFAULTS, butin du seed) pour que
 * tout rééquilibrage futur de l'XP fasse bouger ce test.
 */

const LAST_STAGE = CHAPTER_COUNT * STAGES_PER_CHAPTER
const TOWER_FLOORS = TOWER_ELEMENTS.length * TOWER_FLOOR_COUNT

const XP_BASE = DEFAULTS['xp.base']
const XP_SLOPE = DEFAULTS['xp.slope']
const XP_CAP = DEFAULTS['xp.levelCap']

// MODEL: rangs de compétences supposés acquis à partir de ce jour (mêmes
// hypothèses que economy-progression.test.ts : Récupération r3, Logistique r1,
// Vétéran r3). L'effet de Vétéran est LU dans le seed, jamais recopié : il y
// était écrit 0.3 en dur et y est resté quand la courbe du nœud est passée à
// 3/7/10/14/17, si bien que le modèle surestimait l'XP de combat.
const SKILL_MATURITY_DAY = 15
const VETERAN_RANK = 3
const PULLS_PER_DAY = 60 // MODEL: régime établi mesuré par economy-progression
const QUEST_XP_PER_DAY = 450 / 7
const STREAK_XP_PER_DAY = 875 / 30

function stageLoot(globalStage: number) {
  const chapter = Math.ceil(globalStage / STAGES_PER_CHAPTER)
  const index = globalStage - (chapter - 1) * STAGES_PER_CHAPTER
  return index === STAGES_PER_CHAPTER
    ? bossLoot(chapter)
    : lootTableNormal(chapter, index)
}

type Jour = { day: number; level: number; battles: number; stage: number }

/**
 * Énergie simulée par ticks de régénération (1 point par `combat.regenSeconds`,
 * plafond `combat.pointsMax`). `levelup.refillEnergy` remet l'énergie AU MAX à
 * chaque montée de niveau (`refillToMaxInTx`) : c'est la boucle
 * XP → niveau → énergie → combats → XP, conservée par choix de design et
 * compensée par la raideur de la courbe.
 */
function simuler(days: number, veteranPct: number): Jour[] {
  const out: Jour[] = []
  let xp = 0
  let level = 1
  let stage = 0
  let tower = 0
  let energy = DEFAULTS['combat.pointsMax']

  for (let day = 1; day <= days; day++) {
    const mature = day >= SKILL_MATURITY_DAY
    const regenSeconds = Math.max(
      60,
      DEFAULTS['combat.regenSeconds'] - (mature ? 180 : 0),
    )
    const cost = Math.max(1, DEFAULTS['combat.sweepCost'] - (mature ? 1 : 0))
    const cap = DEFAULTS['combat.pointsMax']
    const xpBonus = mature ? veteranPct / 100 : 0
    const ticks = Math.round(86400 / regenSeconds)

    let battles = 0
    let dayXp = 0
    const gagne = (brut: number) => Math.round(brut * (1 + xpBonus))

    for (let t = 0; t < ticks; t++) {
      energy = Math.min(cap, energy + 1)
      while (energy >= cost) {
        energy -= cost
        battles += 1

        if (stage < LAST_STAGE) {
          stage += 1
          dayXp += gagne(stageLoot(stage).firstClear.xp)
        } else if (tower < TOWER_FLOORS) {
          tower += 1
          const floor = ((tower - 1) % TOWER_FLOOR_COUNT) + 1
          dayXp += gagne(towerFloorLoot(floor).firstClear.xp)
        } else {
          dayXp += gagne(stageLoot(LAST_STAGE).farm.xp)
        }

        const lv = calculateLevel(xp + dayXp, XP_BASE, XP_SLOPE, XP_CAP)
        if (lv > level) {
          energy = Math.max(energy, cap) // levelup.refillEnergy
          level = lv
        }
      }
    }

    xp +=
      dayXp +
      PULLS_PER_DAY * DEFAULTS.xpPerPull +
      QUEST_XP_PER_DAY +
      STREAK_XP_PER_DAY
    level = calculateLevel(xp, XP_BASE, XP_SLOPE, XP_CAP)
    out.push({ day, level, battles, stage })
  }
  return out
}

/** Total d'XP one-shot : premiers passages de la campagne ET des quatre tours. */
function poolPremierPassage(): number {
  let total = 0
  for (let s = 1; s <= LAST_STAGE; s++) {
    total += stageLoot(s).firstClear.xp
  }
  for (let f = 1; f <= TOWER_FLOOR_COUNT; f++) {
    total += towerFloorLoot(f).firstClear.xp * TOWER_ELEMENTS.length
  }
  return total
}

describe('cadence du niveau joueur', () => {
  let traj: Jour[] = []
  beforeAll(async () => {
    traj = simuler(400, await effectAtRank('COMBAT_XP_BONUS', VETERAN_RANK))
  })
  const jourDuNiveau = (n: number) => traj.find((j) => j.level >= n)?.day

  it('loggue la trajectoire pour calibration', () => {
    for (const d of [1, 7, 15, 30, 60, 90, 120, 150, 200]) {
      const j = traj[d - 1]
      if (j) {
        console.info(
          `J${j.day}: niveau ${j.level}, ${j.battles} combats, stage ${j.stage}`,
        )
      }
    }
    expect(traj).toHaveLength(400)
  })

  // Le bug rapporté : « en 1 jour, je suis niveau 30 ». C'est CE test qui doit
  // rougir si un futur réglage rouvre la boucle.
  it('le premier jour ne donne plus le niveau 30', () => {
    expect(traj[0]?.level).toBeLessThan(20)
  })

  it('le niveau 30 demande au moins dix jours', () => {
    expect(jourDuNiveau(30)).toBeGreaterThanOrEqual(10)
  })

  it('le niveau 30 reste atteignable en moins d’un mois', () => {
    expect(jourDuNiveau(30)).toBeLessThanOrEqual(30)
  })

  it('le niveau 100 demande plus de trois mois', () => {
    expect(jourDuNiveau(100)).toBeGreaterThanOrEqual(90)
  })

  it('le niveau 100 reste atteignable', () => {
    expect(jourDuNiveau(100)).toBeDefined()
  })

  /**
   * L'invariant structurel derrière le bug : nettoyer tout le contenu une fois
   * rapportait 72 800 XP quand le niveau 30 en coûtait 20 764, soit 3,5 fois.
   * Le premier passage finançait donc à lui seul la quasi-totalité de la
   * progression, et le farm quotidien ne pesait rien. Tant que le pool reste
   * sous le coût du niveau 30, la progression vient du jeu quotidien.
   */
  it('le pool one-shot ne suffit pas à lui seul à payer le niveau 30', () => {
    expect(poolPremierPassage()).toBeLessThan(xpForLevel(30, XP_BASE, XP_SLOPE))
  })
})
