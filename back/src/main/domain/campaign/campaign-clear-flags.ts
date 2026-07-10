import type { LogEntry } from '../combat/battle-simulator.domain'

export function deriveClearFlags(
  log: LogEntry[],
  allyUnits: { id: string }[],
  stage: { chapter: number; index: number },
): { flawless: boolean; understaffed: boolean } {
  const allyIds = new Set(allyUnits.map((u) => u.id))
  let deadAllies = 0
  for (const entry of log) {
    if (entry.type === 'DEATH' && allyIds.has(entry.unitId)) {
      deadAllies += 1
    }
  }
  const isTrivialStage = stage.chapter === 1 && stage.index <= 2
  return {
    flawless: deadAllies === 0,
    understaffed: allyUnits.length < 3 && !isTrivialStage,
  }
}
