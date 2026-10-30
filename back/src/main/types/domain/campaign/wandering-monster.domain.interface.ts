/** Vue du monstre errant actif, pour `GET /campaign/wanderer` (tâche 3 : `fightWanderer`). */
export type WandererView = {
  stageId: string
  chapter: number
  index: number
  stageLabel: string
  expiresAt: string
  name: string
  imageUrl: string | null
  element: string | null
  recommendedPower: number
}

export interface IWanderingMonsterDomain {
  /**
   * Le monstre actif du joueur à `now` (fenêtre ouverte, non vaincu), ou
   * `null`. Planifie au passage le retour suivant si le dernier est terminé.
   */
  findActive(userId: string, now: Date): Promise<WandererView | null>
}
