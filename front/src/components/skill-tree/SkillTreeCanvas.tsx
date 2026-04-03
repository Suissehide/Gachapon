import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo } from 'react'
import type { SkillTreeState } from '../../api/skills.api.ts'
import { SkillNodeComponent, type SkillNodeData } from './SkillNode.tsx'

const nodeTypes = { skillNode: SkillNodeComponent }

type Props = {
  state: SkillTreeState
  onInvest?: (nodeId: string) => void
}

export function SkillTreeCanvas({ state, onInvest }: Props) {
  const skillMap = useMemo(
    () => Object.fromEntries(state.userSkills.map((s) => [s.nodeId, s.level])),
    [state.userSkills],
  )

  const nodes: Node[] = useMemo(() => {
    const result: Node[] = []

    // Nœud central
    result.push({
      id: 'center',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { label: '⬡' },
      style: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6c47ff, #a78bfa)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        border: 'none',
        cursor: 'default',
      },
      draggable: false,
    })

    for (const branch of state.branches) {
      for (const node of branch.nodes) {
        const userLevel = skillMap[node.id] ?? 0
        const missingPrereqs: string[] = []
        let isLocked = false

        for (const edge of node.edgesTo) {
          const parentLevel = skillMap[edge.fromNodeId] ?? 0
          if (parentLevel < edge.minLevel) {
            isLocked = true
            const parentNode = branch.nodes.find((n) => n.id === edge.fromNodeId)
            if (parentNode) missingPrereqs.push(`${parentNode.name} niv.${edge.minLevel}`)
          }
        }

        const canInvest = state.skillPoints > 0

        result.push({
          id: node.id,
          type: 'skillNode',
          position: { x: node.posX, y: node.posY },
          data: {
            node,
            userLevel,
            branchColor: branch.color,
            canInvest,
            isLocked,
            missingPrereqs,
            onInvest,
          } satisfies SkillNodeData,
          draggable: false,
        })
      }
    }

    return result
  }, [state, skillMap, onInvest])

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = []

    // Edges depuis le centre vers les nœuds racines de chaque branche
    for (const branch of state.branches) {
      const roots = branch.nodes.filter((n) => n.edgesTo.length === 0)
      for (const root of roots) {
        result.push({
          id: `center-${root.id}`,
          source: 'center',
          target: root.id,
          style: { stroke: branch.color, strokeWidth: 2 },
          animated: false,
        })
      }
    }

    // Edges entre nœuds
    for (const branch of state.branches) {
      for (const node of branch.nodes) {
        for (const edge of node.edgesFrom) {
          const isUnlocked = (skillMap[edge.fromNodeId] ?? 0) >= edge.minLevel
          result.push({
            id: `${edge.fromNodeId}-${edge.toNodeId}`,
            source: edge.fromNodeId,
            target: edge.toNodeId,
            style: {
              stroke: isUnlocked ? branch.color : '#374151',
              strokeWidth: 1.5,
              strokeDasharray: isUnlocked ? undefined : '4',
            },
          })
        }
      }
    }

    return result
  }, [state.branches, skillMap])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.5}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background color="#1f2937" gap={24} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
