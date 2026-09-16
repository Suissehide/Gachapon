/**
 * Les clés de mémoire d'équipe, en miroir de
 * back/src/main/domain/combat/combat-team-keys.ts. Le back valide la clé
 * reçue : une clé inventée ici donne un 400, elle ne crée rien en base.
 */
export const CAMPAIGN_TEAM_KEY = 'campaign'
export const RAID_TEAM_KEY = 'raid'

export const towerTeamKey = (element: string): string => `tower:${element}`

export const CAMPAIGN_TEAM_LABEL = 'Campagne'
export const RAID_TEAM_LABEL = "Raid d'équipe"
