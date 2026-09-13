import type { BackgroundTasksInterface } from '../types/application/background-tasks.interface'

/** Au-delà, on abandonne : une fermeture qui aboutit vaut mieux qu'une qui pend. */
const DEFAULT_DRAIN_MS = 5_000

/**
 * Les écritures que trois routes lancent SANS attendre pour répondre au
 * joueur — le crédit de points d'équipe après une attaque de raid, un duel
 * réglé, un pari gagné (`void teamProgressionDomain.award(...)`).
 *
 * Ce `void` est délibéré : un règlement de points en échec ne doit pas
 * transformer une action réussie en erreur. Mais rien n'attendait ces
 * promesses à l'arrêt, et `award` ouvre une transaction Serializable. Deux
 * conséquences, l'une visible et l'autre pas :
 *
 * - un `SIGTERM` en pleine attaque PERDAIT les points, sans trace ;
 * - `$disconnect` cessait d'acheminer les requêtes, la transaction détachée
 *   restait suspendue à mi-parcours, et rien ne la libérait avant son délai
 *   de 5 s. La fermeture prenait donc 5 s, mesurées à la milliseconde près.
 *
 * Le registre ne change rien au chemin nominal : il retient les promesses
 * pour pouvoir les attendre AVANT de fermer les connexions.
 */
export class BackgroundTasks implements BackgroundTasksInterface {
  readonly #inFlight = new Set<Promise<unknown>>()

  /**
   * Le rejet est avalé ici. Les appelants ont déjà leur `.catch()` qui
   * journalise ; le drain ne doit pas faire échouer une fermeture parce
   * qu'une tâche de fond a raté.
   */
  track(task: Promise<unknown>): void {
    const tracked = task
      .catch(() => undefined)
      .finally(() => {
        this.#inFlight.delete(tracked)
      })
    this.#inFlight.add(tracked)
  }

  pending(): number {
    return this.#inFlight.size
  }

  /**
   * Attend ce qui est en vol, y compris ce qui naît PENDANT l'attente — un
   * `award` crédite plusieurs équipes et enchaîne. D'où la boucle plutôt
   * qu'un seul `Promise.all`.
   */
  async drain(timeoutMs: number = DEFAULT_DRAIN_MS): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (this.#inFlight.size > 0 && Date.now() < deadline) {
      const remaining = deadline - Date.now()
      await Promise.race([
        Promise.all([...this.#inFlight]),
        new Promise((resolve) => setTimeout(resolve, remaining)),
      ])
    }
  }
}
