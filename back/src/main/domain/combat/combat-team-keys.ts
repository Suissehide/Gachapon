import { TOWER_ELEMENTS, type TowerElement } from '../tower/tower-slots'

/**
 * Les six mémoires d'équipe : la campagne, le raid, et une par tour.
 *
 * SOURCE UNIQUE. Les clés de tour sont DÉRIVÉES de `TOWER_ELEMENTS`, jamais
 * recopiées : une cinquième tour n'exigera ni migration ni retouche ici. La
 * campagne est la racine du repli — un mode sans ligne joue la sienne.
 */
export const CAMPAIGN_TEAM_KEY = 'campaign'
export const RAID_TEAM_KEY = 'raid'

export type TowerTeamKey = `tower:${TowerElement}`

/**
 * Type DÉRIVÉ, jamais énuméré à la main : il suit `TOWER_ELEMENTS`
 * automatiquement, une cinquième tour n'exige aucune retouche ici.
 */
export type CombatTeamKey =
  | typeof CAMPAIGN_TEAM_KEY
  | typeof RAID_TEAM_KEY
  | TowerTeamKey

export const towerTeamKey = (element: TowerElement): TowerTeamKey =>
  `tower:${element}`

/**
 * Même liste, sous la forme de tuple non vide qu'exige `z.enum`. Construite
 * une seule fois — `COMBAT_TEAM_KEYS` la réexpose en tableau en lecture
 * seule — pour qu'il n'y ait qu'un seul cast (obligatoire : TS ne peut pas
 * déduire d'un `map` sur un tableau qu'il est non vide) et qu'aucune des deux
 * formes ne puisse diverger de l'autre.
 */
export const COMBAT_TEAM_KEY_TUPLE = [
  CAMPAIGN_TEAM_KEY,
  RAID_TEAM_KEY,
  ...TOWER_ELEMENTS.map(towerTeamKey),
] as [CombatTeamKey, ...CombatTeamKey[]]

export const COMBAT_TEAM_KEYS: readonly CombatTeamKey[] = COMBAT_TEAM_KEY_TUPLE
