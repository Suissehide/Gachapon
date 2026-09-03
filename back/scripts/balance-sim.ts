import * as fs from 'node:fs'
import * as path from 'node:path'

import {
  bossEnemyTeam,
  normalEnemyTeam,
  RARITY_BASE as SEED_RARITY_BASE,
} from '../prisma/seed/campaign'
import { MAX_PALIER } from '../src/main/domain/card-leveling/card-leveling.domain'
import {
  type AttackPattern,
  type SimulatorUnit,
  simulateBattle,
} from '../src/main/domain/combat/battle-simulator.domain'
import {
  computeFinalStats,
  mitigationRefFor,
} from '../src/main/domain/combat/combat-stats.domain'
import {
  ELEMENTS,
  type Element,
  elementRelation,
} from '../src/main/domain/combat/element'

type BaseBlock = {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
}

// levelMultiplier mirrors combat-stats.domain.ts STAT_GROWTH_PER_LEVEL = 0.06
function levelMultiplier(level: number): number {
  return 1 + 0.06 * (level - 1)
}

// Stats de base par rareté — IMPORTÉES du seed, plus recopiées.
// Cette table était une copie figée aux valeurs d'avant le rééquilibrage
// (atk 10/15/21/35/53, def 5/7/10/16/29) alors que le seed était passé à
// 13/19/26/44/66 et 13/18/25/40/73 : le simulateur mesurait un jeu qui
// n'existait plus. `SEED_RARITY_BASE` nomme les champs hp/atk/def/spd, le
// simulateur les veut préfixés `base`.
const RARITY_BASE: Record<string, BaseBlock> = Object.fromEntries(
  Object.entries(SEED_RARITY_BASE).map(([rarity, b]) => [
    rarity,
    { baseHp: b.hp, baseAtk: b.atk, baseDef: b.def, baseSpd: b.spd },
  ]),
)

// Realistic player progression: which rarity a player fields per chapter.
const RARITY_BY_CHAPTER: Record<number, string> = {
  1: 'COMMON',
  2: 'UNCOMMON',
  3: 'RARE',
  4: 'EPIC',
  5: 'LEGENDARY',
  6: 'LEGENDARY',
  7: 'LEGENDARY',
  8: 'LEGENDARY',
  9: 'LEGENDARY',
}

// Niveau joueur à un étage : suit l'étage global jusqu'au plafond de
// 10 × MAX_PALIER. Au-delà, le joueur ne progresse plus que par l'équipement.
const PLAYER_MAX_LEVEL = 10 * MAX_PALIER
function playerLevelForStage(chapter: number, index: number): number {
  return Math.min(10 * (chapter - 1) + index, PLAYER_MAX_LEVEL)
}

// Éléments joueur balayés de façon déterministe : l'unité i du run k prend
// ELEMENTS[(i + k) % 6]. Sur 200 runs (200 mod 6 = 2), deux rotations sur
// six sont couvertes par 34 runs et les quatre autres par 33 — quasi égal,
// et le rapport reste reproductible.

// Profils d'équipement du joueur, pilotés par SIM_GEAR. Les valeurs
// reproduisent le budget mesuré dans la spec : un set best-in-slot niveau 12
// donne +44 % PV / +48 % ATQ — bonus de base ×2.1 au niveau 12 (soit 25.2 %
// sur la stat principale) plus ~16.5 % de sous-stats par stat. Le profil
// `epic` représente un joueur à mi-parcours du gear chase.
// Les ennemis n'ont JAMAIS d'équipement : le profil ne s'applique qu'à
// playerTeam, pas à enemyUnitsForStage.
// Stats de stuff de base — mêmes valeurs que les défauts GlobalConfig
// (config.service.ts). computeFinalStats les exige depuis le plan de fondation
// combat ; le simulateur ne les passait pas et levait donc une exception dès
// la première unité. Il n'avait plus tourné depuis.
const SIM_BASE_STATS = {
  critRate: 5,
  critDmg: 150,
  armorPen: 0,
  lifesteal: 0,
}

// Référence de mitigation par défaut (GlobalConfig `combat.defMitigationRef`).
// Le simulateur ne la posait sur AUCUNE unité : `mitigationRef` valait donc
// `undefined`, la réduction de dégâts partait en NaN et plus un seul coup ne
// portait — 1837 lignes de journal sans une seule entrée de dégâts, tous les
// combats au plafond d'actions et 0 % de victoire partout. Le champ est
// pourtant obligatoire dans SimulatorUnit ; `scripts/` n'étant pas
// type-vérifié, rien ne l'avait signalé.
const SIM_DEF_MITIGATION_REF = 100

type GearProfile = { hpPct: number; atkPct: number; defPct: number }
const GEAR_PROFILES: Record<string, GearProfile> = {
  none: { hpPct: 0, atkPct: 0, defPct: 0 },
  epic: { hpPct: 22, atkPct: 24, defPct: 18 },
  legendary: { hpPct: 44, atkPct: 48, defPct: 34 },
}
const GEAR: GearProfile =
  GEAR_PROFILES[process.env.SIM_GEAR ?? 'none'] ?? GEAR_PROFILES.none

function playerTeam(opts: {
  level: number
  palier: number
  base: BaseBlock
  passiveKey?: string | null
  size?: number
}): SimulatorUnit[] {
  const size = opts.size ?? 3
  return Array.from({ length: size }, (_, idx) => {
    const stats = computeFinalStats({
      baseHp: opts.base.baseHp,
      baseAtk: opts.base.baseAtk,
      baseDef: opts.base.baseDef,
      baseSpd: opts.base.baseSpd,
      level: opts.level,
      palier: opts.palier,
      variant: 'NORMAL',
      equipment: [
        { hpPct: GEAR.hpPct, atkPct: GEAR.atkPct, defPct: GEAR.defPct },
      ],
      baseStats: SIM_BASE_STATS,
    })
    return {
      id: `A${idx}`,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      armorPen: stats.armorPen,
      lifesteal: stats.lifesteal,
      // Allié : dérivée du niveau/palier/variante, comme campaign.domain.
      mitigationRef: mitigationRefFor({
        level: opts.level,
        palier: opts.palier,
        variant: 'NORMAL',
        defMitigationRef: SIM_DEF_MITIGATION_REF,
      }),
      attackPattern: 'BASIC' as AttackPattern,
      passiveKey: opts.passiveKey ?? null,
      palier: opts.palier,
    }
  })
}

// Realistic 3-card team for the stage's chapter (rarity/level/palier progression).
function realisticPlayerTeam(chapter: number, index: number): SimulatorUnit[] {
  const rarity = RARITY_BY_CHAPTER[chapter]
  const level = playerLevelForStage(chapter, index)
  const palier = Math.min(chapter, MAX_PALIER)
  return playerTeam({ level, palier, base: RARITY_BASE[rarity] })
}

// Équipe joueur sous-montée : même rareté/palier que l'équipe de référence
// (realisticPlayerTeam), mais `levelDeficit` niveaux en dessous — proxy d'un
// joueur qui a dilué son investissement sur plusieurs équipes élémentaires
// plutôt que de tout mettre sur une seule. Le niveau est borné à 1 (un
// niveau nul ou négatif produirait des stats absurdes) ; `floored` indique
// que la borne a joué, signe que la mesure sous-estime l'écart réel demandé
// à cet étage.
function underleveledPlayerTeam(
  chapter: number,
  index: number,
  levelDeficit: number,
): { team: SimulatorUnit[]; level: number; floored: boolean } {
  const rarity = RARITY_BY_CHAPTER[chapter]
  const targetLevel = playerLevelForStage(chapter, index) - levelDeficit
  const level = Math.max(1, targetLevel)
  const palier = Math.min(chapter, MAX_PALIER)
  return {
    team: playerTeam({ level, palier, base: RARITY_BASE[rarity] }),
    level,
    floored: targetLevel < 1,
  }
}

function enemyUnitsForStage(chapter: number, index: number): SimulatorUnit[] {
  const isBoss = index === 10
  const team = isBoss
    ? bossEnemyTeam(chapter, index)
    : normalEnemyTeam(chapter, index)
  return team.map((e, idx) => {
    const stats = computeFinalStats({
      baseHp: e.baseHp,
      baseAtk: e.baseAtk,
      baseDef: e.baseDef,
      baseSpd: e.baseSpd,
      level: e.level,
      palier: e.palier,
      variant: 'NORMAL',
      equipment: [],
      baseStats: SIM_BASE_STATS,
    })
    return {
      id: `B${idx}`,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      armorPen: stats.armorPen,
      lifesteal: stats.lifesteal,
      // Ennemi : puissance pré-cuite dans les stats de base par le seed, donc
      // la référence suit `mitigationScale` et non le niveau.
      mitigationRef:
        SIM_DEF_MITIGATION_REF *
        ((e as { mitigationScale?: number }).mitigationScale ?? 1),
      attackPattern: (e.attackPattern ?? 'BASIC') as AttackPattern,
      passiveKey: (e as { passiveKey?: string | null }).passiveKey ?? null,
      element: e.element,
      palier: e.palier,
    }
  })
}

// Enemy units with speed scaled to track the player's level at the stage
// (hp/atk/def unchanged). spd = round(enemyBaseSpd * levelMultiplier(playerLevel)).
function enemyUnitsSpeedScaled(
  chapter: number,
  index: number,
  playerLevel: number,
): SimulatorUnit[] {
  const current = enemyUnitsForStage(chapter, index)
  const isBoss = index === 10
  const baseSpd = isBoss ? 100 : 85
  const scaledSpd = Math.round(baseSpd * levelMultiplier(playerLevel))
  return current.map((u) => ({ ...u, spd: scaledSpd }))
}

// Élément dominant côté ennemi pour l'étage : le plus fréquent parmi les
// unités adverses, en prenant le premier de ELEMENTS en cas d'égalité (ordre
// déterministe). Renvoie null si aucun ennemi n'a d'élément défini.
function dominantEnemyElement(enemies: SimulatorUnit[]): Element | null {
  const counts = new Map<Element, number>()
  for (const enemy of enemies) {
    const el = enemy.element
    if (el && (ELEMENTS as readonly string[]).includes(el)) {
      counts.set(el as Element, (counts.get(el as Element) ?? 0) + 1)
    }
  }
  let best: Element | null = null
  let bestCount = 0
  for (const el of ELEMENTS) {
    const count = counts.get(el) ?? 0
    if (count > bestCount) {
      bestCount = count
      best = el
    }
  }
  return best
}

// Élément qui bat `target`, via la source de vérité elementRelation (pas de
// copie de la roue ici). Toujours défini sur cette roue (cycle de 4 + paire
// mutuelle LIGHT/DARK), le fallback ne devrait donc jamais servir.
function counterElement(target: Element): Element {
  return (
    ELEMENTS.find((el) => elementRelation(el, target) === 'ADVANTAGE') ?? target
  )
}

// Élément à assigner aux 3 unités joueur en régime contre-pick : celui qui
// bat l'élément le plus fréquent chez les ennemis de l'étage. Si aucun
// ennemi n'a d'élément (ne devrait pas arriver), retombe en neutre (null).
function counterPickElement(enemies: SimulatorUnit[]): Element | null {
  const dominant = dominantEnemyElement(enemies)
  return dominant ? counterElement(dominant) : null
}

function runScenario(
  chapter: number,
  index: number,
  playerUnits: SimulatorUnit[],
  enemies: SimulatorUnit[],
  scenario: string,
  runs: number,
  playerElement?: (i: number, k: number) => string | null,
): { winRate: number; avgActions: number } {
  const elementFor =
    playerElement ??
    ((i: number, k: number) => ELEMENTS[(i + k) % ELEMENTS.length])
  let wins = 0
  let totalActions = 0
  for (let k = 0; k < runs; k++) {
    const sim = simulateBattle({
      teamA: playerUnits.map((u, i) => ({
        ...u,
        element: elementFor(i, k),
      })),
      teamB: enemies.map((u) => ({ ...u })),
      seed: `sim-${chapter}-${index}-${scenario}-${k}`,
      elementAdvantageMult: ELEMENT_ADVANTAGE_MULT,
      elementDisadvantageMult: ELEMENT_DISADVANTAGE_MULT,
    })
    if (sim.won === 'A') {
      wins++
    }
    totalActions += sim.turns
  }
  return { winRate: wins / runs, avgActions: totalActions / runs }
}

const RUNS = 200

// Multiplicateurs élémentaires pilotables depuis l'extérieur (balayage de
// mesure), avec les valeurs par défaut de battle-simulator.domain.ts si les
// variables d'env sont absentes — le comportement par défaut du script reste
// donc strictement inchangé.
const ELEMENT_ADVANTAGE_MULT = process.env.ELEMENT_ADVANTAGE_MULT
  ? Number.parseFloat(process.env.ELEMENT_ADVANTAGE_MULT)
  : undefined
const ELEMENT_DISADVANTAGE_MULT = process.env.ELEMENT_DISADVANTAGE_MULT
  ? Number.parseFloat(process.env.ELEMENT_DISADVANTAGE_MULT)
  : undefined

type FlooredStage = { deficit: number; stage: string }

type StageRun = {
  row: string
  flooredStages: FlooredStage[]
}

// Calcule toutes les mesures d'un étage (aveugle, speed-scaled, contre-pick
// plein niveau, contre-pick -5 et -10 niveaux) et les assemble en une ligne
// de rapport. Extrait de main() pour rester sous le plafond de complexité
// cognitive de la fonction.
function runStage(chapter: number, index: number): StageRun {
  const isBoss = index === 10
  const level = playerLevelForStage(chapter, index)
  const team = realisticPlayerTeam(chapter, index)
  const enemiesCurrent = enemyUnitsForStage(chapter, index)
  const enemiesScaled = enemyUnitsSpeedScaled(chapter, index, level)

  const cur = runScenario(chapter, index, team, enemiesCurrent, 'current', RUNS)
  const scaled = runScenario(
    chapter,
    index,
    team,
    enemiesScaled,
    'spdscaled',
    RUNS,
  )

  // Contre-pick : les 3 unités joueur prennent l'élément qui bat le plus
  // fréquent chez les ennemis de l'étage (borne haute, joueur optimal).
  // Enemis inchangés (mêmes stats/éléments que le scénario 'current').
  const counterpickElement = counterPickElement(enemiesCurrent)
  const counterpick = runScenario(
    chapter,
    index,
    team,
    enemiesCurrent,
    'counterpick',
    RUNS,
    () => counterpickElement,
  )

  // Contre-pick sous-monté : même élément contre-pické, même palier/rareté,
  // mais niveau réduit de 5 / 10 (borné à 1) — proxy d'un joueur qui dilue
  // son investissement sur plusieurs équipes élémentaires plutôt que de
  // tout mettre sur une seule.
  const under5 = underleveledPlayerTeam(chapter, index, 5)
  const under10 = underleveledPlayerTeam(chapter, index, 10)
  const counterpick5 = runScenario(
    chapter,
    index,
    under5.team,
    enemiesCurrent,
    'counterpick-5',
    RUNS,
    () => counterpickElement,
  )
  const counterpick10 = runScenario(
    chapter,
    index,
    under10.team,
    enemiesCurrent,
    'counterpick-10',
    RUNS,
    () => counterpickElement,
  )

  // Mêmes équipes sous-montées, mais en régime AVEUGLE (rotation d'éléments,
  // sans regarder l'étage). C'est ce qui isole l'effet du niveau de celui du
  // contre-pick : sans ces deux points, un écart mesuré en contre-pick
  // sous-monté mélange les deux causes.
  const blind5 = runScenario(
    chapter,
    index,
    under5.team,
    enemiesCurrent,
    'blind-5',
    RUNS,
  )
  const blind10 = runScenario(
    chapter,
    index,
    under10.team,
    enemiesCurrent,
    'blind-10',
    RUNS,
  )

  const flooredStages: FlooredStage[] = []
  const stageLabel = `${chapter}-${index}`
  if (under5.floored) {
    flooredStages.push({ deficit: 5, stage: stageLabel })
  }
  if (under10.floored) {
    flooredStages.push({ deficit: 10, stage: stageLabel })
  }

  const row = [
    stageLabel,
    isBoss ? 'B' : '',
    RARITY_BY_CHAPTER[chapter],
    level,
    chapter,
    `${Math.round(cur.winRate * 100)}%`,
    `${Math.round(scaled.winRate * 100)}%`,
    Math.round(cur.avgActions),
    `${Math.round(counterpick.winRate * 100)}%`,
    `${Math.round(counterpick5.winRate * 100)}%`,
    `${Math.round(counterpick10.winRate * 100)}%`,
    `${Math.round(blind5.winRate * 100)}%`,
    `${Math.round(blind10.winRate * 100)}%`,
  ].join('\t')

  return { row, flooredStages }
}

// Écrit le rapport Markdown et la ligne de verdict à partir des lignes
// brutes accumulées par main(). Extrait pour la même raison que runStage.
function writeReport(rows: string[]): string {
  const reportDir = path.join(__dirname, '..', '..', '.superpowers', 'sdd')
  fs.mkdirSync(reportDir, { recursive: true })
  // Colonnes toujours ajoutées EN FIN de ligne : les index déjà utilisés par
  // parsePct (5/6/8/9/10) restent inchangés, les nouvelles prennent 11 et 12.
  const mdHeader =
    '| stage | boss | rarity | L | P | win%(current) | win%(spdScaled) | actions(cur) | win%(counterpick) | win%(counterpick-5) | win%(counterpick-10) | win%(blind-5) | win%(blind-10) |'
  const mdSep = '|---|---|---|---|---|---|---|---|---|---|---|---|---|'
  const mdRows = rows.map((r) => `| ${r.split('\t').join(' | ')} |`)
  const parsePct = (row: string, col: number) =>
    Number.parseInt(row.split('\t')[col].replace('%', ''), 10)
  const cur = rows.map((r) => parsePct(r, 5))
  const scaled = rows.map((r) => parsePct(r, 6))
  const counterpick = rows.map((r) => parsePct(r, 8))
  const counterpick5 = rows.map((r) => parsePct(r, 9))
  const counterpick10 = rows.map((r) => parsePct(r, 10))
  const blind5 = rows.map((r) => parsePct(r, 11))
  const blind10 = rows.map((r) => parsePct(r, 12))
  const avg = (a: number[]) =>
    Math.round(a.reduce((x, y) => x + y, 0) / a.length)
  const band = (a: number[]) => a.filter((w) => w >= 45 && w <= 90).length
  const verdict =
    `Realistic teams (rarity by chapter). Current avg win: ${avg(cur)}%, ` +
    `spdScaled avg win: ${avg(scaled)}%. In 45-90% band: current ${band(cur)}/${rows.length}, ` +
    `spdScaled ${band(scaled)}/${rows.length}. Counterpick avg win: ${avg(counterpick)}% ` +
    `(gap vs current: +${avg(counterpick) - avg(cur)}pt). In 45-90% band: ` +
    `counterpick ${band(counterpick)}/${rows.length}. Counterpick-5 avg win: ${avg(counterpick5)}% ` +
    `(gap vs counterpick: ${avg(counterpick5) - avg(counterpick)}pt). ` +
    `Counterpick-10 avg win: ${avg(counterpick10)}% ` +
    `(gap vs counterpick: ${avg(counterpick10) - avg(counterpick)}pt). ` +
    `Blind-5 avg win: ${avg(blind5)}% (gap vs current: ${avg(blind5) - avg(cur)}pt). ` +
    `Blind-10 avg win: ${avg(blind10)}% (gap vs current: ${avg(blind10) - avg(cur)}pt).`
  fs.writeFileSync(
    path.join(reportDir, 'D-sim-realistic-report.md'),
    `# D-sim-realistic-report\n\nRealistic per-rarity player teams vs enemy speed scenarios.\n\n${mdHeader}\n${mdSep}\n${mdRows.join('\n')}\n\n**Verdict:** ${verdict}\n`,
  )
  return verdict
}

function main(): void {
  const header =
    'stage\tboss\trarity\tL\tP\twin%(current)\twin%(spdScaled)\tactions(cur)\twin%(counterpick)\twin%(counterpick-5)\twin%(counterpick-10)'
  // eslint-disable-next-line no-console
  console.log(header)
  const rows: string[] = []
  const flooredStages: FlooredStage[] = []

  for (let chapter = 1; chapter <= 9; chapter++) {
    for (let index = 1; index <= 10; index++) {
      const result = runStage(chapter, index)
      // eslint-disable-next-line no-console
      console.log(result.row)
      rows.push(result.row)
      flooredStages.push(...result.flooredStages)
    }
  }

  const verdict = writeReport(rows)
  // eslint-disable-next-line no-console
  console.log(`\n${verdict}`)
  if (flooredStages.length > 0) {
    const list = flooredStages
      .map((f) => `${f.stage} (-${f.deficit})`)
      .join(', ')
    // eslint-disable-next-line no-console
    console.log(`\nNiveau borné à 1 sur : ${list}`)
  }
}

main()
