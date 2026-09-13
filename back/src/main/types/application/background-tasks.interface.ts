/**
 * Le registre des écritures lancées sans être attendues par la réponse HTTP.
 * Voir `application/background-tasks.ts` pour le pourquoi.
 */
export interface BackgroundTasksInterface {
  /** Retient une promesse détachée. Son rejet est avalé : l'appelant journalise. */
  track: (task: Promise<unknown>) => void
  /** Nombre de tâches encore en vol. */
  pending: () => number
  /** Attend ce qui est en vol, y compris ce qui naît pendant l'attente. */
  drain: (timeoutMs?: number) => Promise<void>
}
