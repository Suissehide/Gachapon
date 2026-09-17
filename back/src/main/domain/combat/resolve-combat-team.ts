import { CAMPAIGN_TEAM_KEY, type CombatTeamKey } from './combat-team-keys'

export type CombatTeamRow = { userCardIds: string[] } | null

export type ResolvedTeamIds = {
  userCardIds: string[]
  /** Vrai quand le mode n'a pas d'équipe à lui et joue celle de la campagne. */
  inherited: boolean
}

/**
 * La règle de repli, isolée de toute base de données pour être testable seule.
 *
 * Un mode n'existe qu'à partir du moment où on y a édité une équipe ; tant
 * qu'il n'en a pas, il joue celle de la campagne. La campagne, elle, est la
 * racine : elle n'hérite de personne, et une campagne vide reste vide plutôt
 * que de se déclarer héritée.
 */
export function pickTeam(
  key: CombatTeamKey,
  modeRow: CombatTeamRow,
  campaignRow: CombatTeamRow,
): ResolvedTeamIds {
  if (modeRow && modeRow.userCardIds.length > 0) {
    return { userCardIds: modeRow.userCardIds, inherited: false }
  }
  if (key === CAMPAIGN_TEAM_KEY) {
    return { userCardIds: [], inherited: false }
  }
  return { userCardIds: campaignRow?.userCardIds ?? [], inherited: true }
}
