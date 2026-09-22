import type { LogEntry } from '../combat/battle-simulator.domain'
import { mondayOfUtcWeek } from '../quests/quest-matching'
import type { TowerElement } from '../tower/tower-slots'

/** Ordre de rotation hebdomadaire des boss (§ Boss de la spec). */
export const RAID_ROTATION: readonly TowerElement[] = [
  'FIRE',
  'WATER',
  'NATURE',
  'EARTH',
]

/**
 * Lundi de la semaine qui contient le 1er janvier 2026. La semaine 0 est
 * FIRE, et le compteur ne repart jamais à zéro au changement d'année (pas
 * de numéro de semaine ISO, ambigu à cheval sur deux années).
 */
export const RAID_EPOCH_WEEK_KEY = mondayOfUtcWeek(
  new Date(Date.UTC(2026, 0, 1)),
)

export const RAID_TIER_PCTS = [25, 50, 75, 100] as const

/** PV simulés du boss : jamais atteints en 10 tours, la bataille finit en TIMEOUT ou par la mort des alliés. */
export const RAID_BOSS_SIM_HP = 1_000_000_000

/** Le boss est la seule unité du camp B. */
export const RAID_BOSS_UNIT_ID = 'B0'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

function weekKeyToMs(weekKey: string): number {
  return Date.parse(`${weekKey}T00:00:00.000Z`)
}

export function raidWeekKey(now: Date): string {
  return mondayOfUtcWeek(now)
}

export function raidWeekEndsAt(weekKey: string): Date {
  return new Date(weekKeyToMs(weekKey) + WEEK_MS)
}

export function raidWeekIndex(weekKey: string): number {
  return Math.round(
    (weekKeyToMs(weekKey) - weekKeyToMs(RAID_EPOCH_WEEK_KEY)) / WEEK_MS,
  )
}

export function raidElementForWeek(weekKey: string): TowerElement {
  const n = RAID_ROTATION.length
  const idx = ((raidWeekIndex(weekKey) % n) + n) % n
  return RAID_ROTATION[idx] as TowerElement
}

export type RaidHpParams = {
  /** Effectif MINIMUM facturé, même si l'équipe est plus petite. */
  minMembers: number
  /** Points de pourcentage de PV ajoutés par niveau, composés (10 = 10 %). */
  levelBonusPct: number
  level: number
}

/**
 * PV du boss, figés à la création du raid. Le plancher d'effectif empêche
 * l'équipe montée à un joueur d'affronter un boss à sa taille ; le niveau
 * compose par-dessus, sans plafond (voir `nextRaidLevel`).
 */
export function raidMaxHp(
  baseHpPerMember: number,
  memberCount: number,
  { minMembers, levelBonusPct, level }: RaidHpParams,
): number {
  const members = Math.max(minMembers, memberCount)
  const levelMult = (1 + levelBonusPct / 100) ** Math.max(0, level)
  return Math.max(1, Math.round(baseHpPerMember * members * levelMult))
}

/**
 * Niveau du raid qu'on s'apprête à créer, dérivé du DERNIER raid joué par
 * l'équipe — quelle que soit son ancienneté. Une victoire monte d'un cran,
 * une semaine sans victoire fait redescendre d'un cran.
 *
 * Les semaines entièrement sautées comptent chacune comme un échec. Sans
 * cette clause, il suffirait de ne pas ouvrir la page de raid pour figer son
 * niveau : le raid est créé paresseusement (raid.domain#ensureRaid), donc
 * une équipe qui ne regarde pas n'enregistre aucun échec.
 *
 * Aucun plafond : le niveau ne monte que sur une victoire, il s'arrête donc
 * de lui-même là où l'équipe ne suit plus.
 */
export function nextRaidLevel(
  last: { weekKey: string; level: number; killedAt: Date | null } | null,
  weekKey: string,
): number {
  if (!last) {
    return 0
  }
  const skipped = Math.max(
    0,
    raidWeekIndex(weekKey) - raidWeekIndex(last.weekKey) - 1,
  )
  return Math.max(0, last.level + (last.killedAt ? 1 : -1) - skipped)
}

export type RaidRewardAmounts = {
  tokens: number
  gold: number
  dust: number
}

/**
 * Lot d'un palier à un niveau donné : un pourcentage de la base de CE palier,
 * par niveau. Proportionnel et non additif, c'est ce qui fait tenir
 * l'invariant économique du raid — un montant plat partagé par des paliers
 * aux bases très différentes faisait croître les petits paliers de 40 % par
 * cran, bien au-dessus des 10 % des PV, et rendait la montée en difficulté
 * PLUS rentable par point d'effort au lieu de moins.
 *
 * `bonusPct` doit rester strictement sous `raid.levelHpBonusPct`, sans quoi
 * l'invariant se casse dès le premier cran. Gardé par le test
 * « la récompense par point de dégât décroît » (test/unit/raid/raid-rules.test.ts).
 *
 * `xp` et `cardRarity` ne sont pas touchés : l'XP de raid vaut 0 et la
 * rareté n'a pas d'échelle continue.
 */
export function raidTierRewardAtLevel(
  base: RaidRewardAmounts,
  level: number,
  bonusPct: number,
): RaidRewardAmounts {
  const mult = 1 + (Math.max(0, level) * bonusPct) / 100
  return {
    tokens: Math.round(base.tokens * mult),
    gold: Math.round(base.gold * mult),
    dust: Math.round(base.dust * mult),
  }
}

/**
 * Somme des dégâts finaux infligés par le camp A à l'unité boss. Les
 * esquives ont `final: 0`, les frappes du boss (attackerId 'B…') et les
 * dégâts sur d'autres cibles sont ignorés.
 */
export function damageDealtToBoss(
  log: LogEntry[],
  bossId: string = RAID_BOSS_UNIT_ID,
): number {
  let total = 0
  for (const entry of log) {
    if (entry.type !== 'ATTACK' || !entry.attackerId.startsWith('A')) {
      continue
    }
    for (const d of entry.damages) {
      if (d.id === bossId) {
        total += d.final
      }
    }
  }
  return total
}

/** Paliers atteints pour `damageDone` sur `maxHp` (comparaison entière, sans flottant). */
export function crossedTiers<T extends { pct: number }>(
  damageDone: number,
  maxHp: number,
  tiers: T[],
): T[] {
  return tiers.filter((t) => damageDone * 100 >= t.pct * maxHp)
}

export function utcDayStart(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

export function attacksRemaining(used: number, perDay: number): number {
  return Math.max(0, perDay - used)
}

/**
 * Avancement de la barre en pourcentage entier, pour les vues qui n'affichent
 * qu'un pourcentage (liste des équipes, historique). `floor` et pas `round` :
 * un boss encore debout ne doit jamais s'afficher à 100 %.
 */
export function raidPct(damageDone: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.floor((damageDone * 100) / maxHp)))
}
