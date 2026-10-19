import type { PrimaTransactionClient } from '../../infra/orm/client'

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
   * Planifie l'apparition du jour (UTC) du joueur, s'il a au moins un étage
   * battu. Idempotent : une seule ligne par (userId, day).
   */
  scheduleInTx(
    tx: PrimaTransactionClient,
    userId: string,
    now: Date,
  ): Promise<void>
  /** Le monstre actif du joueur à `now` (fenêtre ouverte, non vaincu), ou `null`. */
  findActive(userId: string, now: Date): Promise<WandererView | null>
}
