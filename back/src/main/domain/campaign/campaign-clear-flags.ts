import type { LogEntry } from '../combat/battle-simulator.domain'

/**
 * Victoire sans perte : aucun allié mort dans le log de combat. Ne dépend
 * que du log + du roster — donc calculable pour n'importe quel combat
 * (campagne ou tour), contrairement à `understaffed` ci-dessous qui a besoin
 * d'un repère de progression propre à la campagne.
 */
export function deriveFlawless(
  log: LogEntry[],
  allyUnits: { id: string }[],
): boolean {
  const allyIds = new Set(allyUnits.map((u) => u.id))
  let deadAllies = 0
  for (const entry of log) {
    if (entry.type === 'DEATH' && allyIds.has(entry.unitId)) {
      deadAllies += 1
    }
  }
  return deadAllies === 0
}

export function deriveClearFlags(
  log: LogEntry[],
  allyUnits: { id: string }[],
  stage: { chapter: number; index: number },
): { flawless: boolean; understaffed: boolean } {
  const isTrivialStage = stage.chapter === 1 && stage.index <= 2
  return {
    flawless: deriveFlawless(log, allyUnits),
    understaffed: allyUnits.length < 3 && !isTrivialStage,
  }
}
