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

export const towerTeamKey = (element: TowerElement): string =>
  `tower:${element}`

export const COMBAT_TEAM_KEYS: readonly string[] = [
  CAMPAIGN_TEAM_KEY,
  RAID_TEAM_KEY,
  ...TOWER_ELEMENTS.map(towerTeamKey),
]

/**
 * Même liste, sous la forme de tuple non vide qu'exige `z.enum`. Dérivée,
 * pas réécrite : les deux ne peuvent pas diverger.
 */
export const COMBAT_TEAM_KEY_TUPLE = COMBAT_TEAM_KEYS as unknown as [
  string,
  ...string[],
]
