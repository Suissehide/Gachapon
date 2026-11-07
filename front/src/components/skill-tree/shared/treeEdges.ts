import type { Edge } from '@xyflow/react'

import type {
  SkillBranch,
  SkillEdge,
  SkillNode,
} from '../../../api/skills.api.ts'
import { handleKeyForBranchOrder, pickHandles } from './CenterNode.tsx'

type Position = { x: number; y: number }

type EdgeDecorators = {
  root: (color: string) => Partial<Edge>
  child: (edge: SkillEdge, childColor: string) => Partial<Edge>
}

const ORIGIN: Position = { x: 0, y: 0 }

// Use DB-stored handles if available, otherwise compute from position
function resolveEdgeHandles(
  edge: SkillEdge,
  nodePositions: Map<string, Position>,
) {
  let { sourceHandle, targetHandle } = edge
  if (!sourceHandle || !targetHandle) {
    const fromPos = nodePositions.get(edge.fromNodeId) ?? ORIGIN
    const toPos = nodePositions.get(edge.toNodeId) ?? ORIGIN
    const computed = pickHandles(fromPos.x, fromPos.y, toPos.x, toPos.y)
    sourceHandle = sourceHandle ?? computed.sourceHandle
    targetHandle = targetHandle ?? computed.targetHandle
  }
  return { sourceHandle, targetHandle }
}

function rootEdge(node: SkillNode, handleKey: string): Edge {
  return {
    id: `center-${node.id}`,
    source: 'center',
    sourceHandle: `s-${handleKey}`,
    target: node.id,
    targetHandle: pickHandles(0, 0, node.posX, node.posY).targetHandle,
  }
}

function childEdge(
  edge: SkillEdge,
  nodePositions: Map<string, Position>,
): Edge {
  return {
    id: `${edge.fromNodeId}-${edge.toNodeId}`,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    ...resolveEdgeHandles(edge, nodePositions),
  }
}

export function buildTreeEdges(
  branches: SkillBranch[],
  colorByNodeId: Map<string, string>,
  nodePositions: Map<string, Position>,
  decorate: EdgeDecorators,
): Edge[] {
  const result: Edge[] = []
  for (const branch of branches) {
    const handleKey = handleKeyForBranchOrder(branch.order)
    for (const node of branch.nodes) {
      const color = colorByNodeId.get(node.id) ?? branch.color
      // Root nodes link to the center via their branch handle
      if (node.edgesTo.length === 0 && handleKey) {
        result.push({ ...rootEdge(node, handleKey), ...decorate.root(color) })
      }
      for (const edge of node.edgesFrom) {
        const childColor = colorByNodeId.get(edge.toNodeId) ?? color
        result.push({
          ...childEdge(edge, nodePositions),
          ...decorate.child(edge, childColor),
        })
      }
    }
  }
  return result
}
