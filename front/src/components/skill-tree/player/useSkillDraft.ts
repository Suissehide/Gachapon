import { useCallback, useMemo, useState } from 'react'

import type { SkillNode, SkillTreeState } from '../../../api/skills.api.ts'

export type RemoveResult = 'ok' | 'empty' | 'blocked'

/** All parent edges satisfied given a resolver for effective node levels. */
function prereqsMet(
  node: SkillNode,
  levelOf: (nodeId: string) => number,
): boolean {
  return node.edgesTo.every((edge) => levelOf(edge.fromNodeId) >= edge.minLevel)
}

export type SkillDraft = {
  /** Server state overlaid with the local (unsaved) allocations. */
  effectiveState: SkillTreeState | undefined
  pending: Record<string, number>
  pendingCount: number
  isDirty: boolean
  addPoint: (nodeId: string) => void
  removePoint: (nodeId: string) => RemoveResult
  clear: () => void
}

/**
 * Local draft of skill-point allocations. Clicks accumulate here instead of
 * hitting the server; `effectiveState` reflects saved + pending so the tree
 * renders (and gates further clicks) as if the points were already spent.
 */
export function useSkillDraft(state: SkillTreeState | undefined): SkillDraft {
  const [pending, setPending] = useState<Record<string, number>>({})

  const savedLevels = useMemo(() => {
    const m: Record<string, number> = {}
    if (state) {
      for (const s of state.userSkills) {
        m[s.nodeId] = s.level
      }
    }
    return m
  }, [state])

  const nodeById = useMemo(() => {
    const m = new Map<string, SkillNode>()
    if (state) {
      for (const branch of state.branches) {
        for (const node of branch.nodes) {
          m.set(node.id, node)
        }
      }
    }
    return m
  }, [state])

  const pendingCount = useMemo(
    () => Object.values(pending).reduce((a, b) => a + b, 0),
    [pending],
  )

  const effectiveState = useMemo<SkillTreeState | undefined>(() => {
    if (!state) {
      return undefined
    }
    const byId = new Map(state.userSkills.map((s) => [s.nodeId, { ...s }]))
    for (const [nodeId, add] of Object.entries(pending)) {
      if (add <= 0) {
        continue
      }
      const existing = byId.get(nodeId)
      if (existing) {
        existing.level += add
      } else {
        byId.set(nodeId, { userId: '', nodeId, level: add })
      }
    }
    return {
      ...state,
      userSkills: [...byId.values()],
      skillPoints: state.skillPoints - pendingCount,
    }
  }, [state, pending, pendingCount])

  const addPoint = useCallback(
    (nodeId: string) => {
      const node = state && nodeById.get(nodeId)
      if (!state || !node) {
        return
      }
      const levelOf = (id: string) =>
        (savedLevels[id] ?? 0) + (pending[id] ?? 0)
      const hasPoints = state.skillPoints - pendingCount > 0
      const belowMax = levelOf(nodeId) < node.maxLevel
      if (!hasPoints || !belowMax || !prereqsMet(node, levelOf)) {
        return
      }
      setPending((p) => ({ ...p, [nodeId]: (p[nodeId] ?? 0) + 1 }))
    },
    [state, nodeById, pendingCount, savedLevels, pending],
  )

  const removePoint = useCallback(
    (nodeId: string): RemoveResult => {
      const cur = pending[nodeId] ?? 0
      if (cur <= 0) {
        return 'empty'
      }
      const node = nodeById.get(nodeId)
      const newEff = (savedLevels[nodeId] ?? 0) + cur - 1
      // Block if a still-staged child would drop below its prerequisite.
      if (node) {
        for (const edge of node.edgesFrom) {
          if (edge.minLevel > newEff && (pending[edge.toNodeId] ?? 0) > 0) {
            return 'blocked'
          }
        }
      }
      setPending((p) => {
        const next = { ...p }
        const v = (next[nodeId] ?? 0) - 1
        if (v <= 0) {
          delete next[nodeId]
        } else {
          next[nodeId] = v
        }
        return next
      })
      return 'ok'
    },
    [pending, nodeById, savedLevels],
  )

  const clear = useCallback(() => setPending({}), [])

  return {
    effectiveState,
    pending,
    pendingCount,
    isDirty: pendingCount > 0,
    addPoint,
    removePoint,
    clear,
  }
}
