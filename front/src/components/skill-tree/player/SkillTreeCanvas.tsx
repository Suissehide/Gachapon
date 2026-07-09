import {
  Background,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo } from 'react'

import type { SkillTreeState } from '../../../api/skills.api.ts'
import {
  CenterNode,
  handleKeyForBranchOrder,
  pickHandles,
} from '../shared/CenterNode.tsx'
import { SkillNodeComponent, type SkillNodeData } from '../shared/SkillNode.tsx'

const nodeTypes = { skillNode: SkillNodeComponent, centerNode: CenterNode }

type Props = {
  state: SkillTreeState
  onInvest?: (nodeId: string) => void
  onUninvest?: (nodeId: string) => void
}

export function SkillTreeCanvas({ state, onInvest, onUninvest }: Props) {
  const skillMap = useMemo(
    () => Object.fromEntries(state.userSkills.map((s) => [s.nodeId, s.level])),
    [state.userSkills],
  )

  // Build branch-by-handle for the center node labels
  const branchByHandle = useMemo(() => {
    const map: Record<string, { id: string; name: string; color: string }> = {}
    for (const b of state.branches) {
      const key = handleKeyForBranchOrder(b.order)
      if (key) {
        map[key] = { id: b.id, name: b.name, color: b.color }
      }
    }
    return map
  }, [state.branches])

  // Walk parent edges up to root for color propagation
  const colorByNodeId = useMemo(() => {
    const allNodes = state.branches.flatMap((b) =>
      b.nodes.map((n) => ({ node: n, branchColor: b.color })),
    )
    const byId = new Map(allNodes.map((x) => [x.node.id, x]))
    const cache = new Map<string, string>()

    const resolve = (id: string, seen: Set<string>): string => {
      if (cache.has(id)) {
        return cache.get(id) ?? '#6c47ff'
      }
      if (seen.has(id)) {
        return byId.get(id)?.branchColor ?? '#6c47ff'
      }
      seen.add(id)
      const entry = byId.get(id)
      if (!entry) {
        return '#6c47ff'
      }
      if (entry.node.edgesTo.length === 0) {
        cache.set(id, entry.branchColor)
        return entry.branchColor
      }
      const parentId = entry.node.edgesTo[0].fromNodeId
      const color = resolve(parentId, seen)
      cache.set(id, color)
      return color
    }

    const map = new Map<string, string>()
    for (const { node } of allNodes) {
      map.set(node.id, resolve(node.id, new Set()))
    }
    return map
  }, [state.branches])

  // Find parent node name across all branches
  const allNodes = useMemo(
    () => state.branches.flatMap((b) => b.nodes),
    [state.branches],
  )

  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [
      {
        id: 'center',
        type: 'centerNode',
        position: { x: 9, y: 9 },
        data: { branchByHandle },
        draggable: false,
        selectable: false,
      },
    ]

    for (const branch of state.branches) {
      for (const node of branch.nodes) {
        const userLevel = skillMap[node.id] ?? 0
        const missingPrereqs: string[] = []
        let isLocked = false

        for (const edge of node.edgesTo) {
          const parentLevel = skillMap[edge.fromNodeId] ?? 0
          if (parentLevel < edge.minLevel) {
            isLocked = true
            const parentNode = allNodes.find((n) => n.id === edge.fromNodeId)
            if (parentNode) {
              missingPrereqs.push(`${parentNode.name} niv.${edge.minLevel}`)
            }
          }
        }

        result.push({
          id: node.id,
          type: 'skillNode',
          position: { x: node.posX, y: node.posY },
          data: {
            node,
            userLevel,
            branchColor: colorByNodeId.get(node.id) ?? branch.color,
            canInvest: state.skillPoints > 0,
            isLocked,
            missingPrereqs,
          } satisfies SkillNodeData,
          draggable: false,
        })
      }
    }

    return result
  }, [state, skillMap, branchByHandle, colorByNodeId, allNodes])

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    map.set('center', { x: 0, y: 0 })
    for (const branch of state.branches) {
      for (const node of branch.nodes) {
        map.set(node.id, { x: node.posX, y: node.posY })
      }
    }
    return map
  }, [state.branches])

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = []

    for (const branch of state.branches) {
      const handleKey = handleKeyForBranchOrder(branch.order)
      for (const node of branch.nodes) {
        const color = colorByNodeId.get(node.id) ?? branch.color

        // Root nodes → center edge
        if (node.edgesTo.length === 0 && handleKey) {
          result.push({
            id: `center-${node.id}`,
            source: 'center',
            sourceHandle: `s-${handleKey}`,
            target: node.id,
            targetHandle: pickHandles(0, 0, node.posX, node.posY).targetHandle,
            style: { stroke: color, strokeWidth: 2 },
          })
        }

        // Node-to-node edges
        for (const edge of node.edgesFrom) {
          const isUnlocked = (skillMap[edge.fromNodeId] ?? 0) >= edge.minLevel
          const childColor = colorByNodeId.get(edge.toNodeId) ?? color

          let { sourceHandle, targetHandle } = edge
          if (!sourceHandle || !targetHandle) {
            const fromPos = nodePositions.get(edge.fromNodeId) ?? { x: 0, y: 0 }
            const toPos = nodePositions.get(edge.toNodeId) ?? { x: 0, y: 0 }
            const computed = pickHandles(fromPos.x, fromPos.y, toPos.x, toPos.y)
            sourceHandle = sourceHandle ?? computed.sourceHandle
            targetHandle = targetHandle ?? computed.targetHandle
          }

          result.push({
            id: `${edge.fromNodeId}-${edge.toNodeId}`,
            source: edge.fromNodeId,
            target: edge.toNodeId,
            sourceHandle,
            targetHandle,
            style: {
              stroke: isUnlocked ? childColor : '#374151',
              strokeWidth: 1.5,
              strokeDasharray: isUnlocked ? undefined : '4',
            },
          })
        }
      }
    }

    return result
  }, [state.branches, skillMap, colorByNodeId, nodePositions])

  // Invest is driven from here (not the SkillNode button) so a single click
  // fires onInvest exactly once. onNodeClick also keeps the node interactive,
  // which ReactFlow needs for the inner button to receive pointer events.
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === 'center' || !onInvest) {
        return
      }
      const d = node.data as SkillNodeData
      if (!d.isLocked && d.canInvest && d.userLevel < d.node.maxLevel) {
        onInvest(d.node.id)
      }
    },
    [onInvest],
  )

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault()
      if (node.id === 'center' || !onUninvest) {
        return
      }
      onUninvest((node.data as SkillNodeData).node.id)
    },
    [onUninvest],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onNodeContextMenu={handleNodeContextMenu}
      fitView
      minZoom={0.5}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1f2937" gap={24} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
