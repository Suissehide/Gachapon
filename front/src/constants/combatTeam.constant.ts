import i18n from '../i18n/index.ts'

/**
 * Les clés de mémoire d'équipe, en miroir de
 * back/src/main/domain/combat/combat-team-keys.ts. Le back valide la clé
 * reçue : une clé inventée ici donne un 400, elle ne crée rien en base.
 */
export const CAMPAIGN_TEAM_KEY = 'campaign'
export const RAID_TEAM_KEY = 'raid'

export const towerTeamKey = (element: string): string => `tower:${element}`

// Résolus une fois au chargement du module — sûr ici parce que
// `useLocale().switchTo` fait toujours un rechargement dur de la page (voir
// `i18n/useLocale.ts`).
export const CAMPAIGN_TEAM_LABEL = i18n.t('combat:teamLabel.campaign')
export const RAID_TEAM_LABEL = i18n.t('combat:teamLabel.raid')
