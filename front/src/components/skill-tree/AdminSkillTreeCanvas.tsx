import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo } from 'react'
import type { SkillBranch } from '../../api/skills.api.ts'
import {
  useAdminCreateEdge,
  useAdminDeleteEdge,
  useAdminUpdateNode,
} from '../../queries/useSkills.ts'
import { SkillNodeComponent } from './SkillNode.tsx'

const nodeTypes = { skillNode: SkillNodeComponent }

type Props = {
  branches: SkillBranch[]
  onNodeSelect: (nodeId: string | null) => void
}

export function AdminSkillTreeCanvas({ branches, onNodeSelect }: Props) {
  const createEdge = useAdminCreateEdge()
  const deleteEdge = useAdminDeleteEdge()
  const updateNode = useAdminUpdateNode()

  const initialNodes: Node[] = useMemo(() => {
    const result: Node[] = [
      {
        id: 'center',
        type: 'default',
        position: { x: 0, y: 0 },
        data: { label: '⬡' },
        style: {
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#6c47ff,#a78bfa)',
          border: 'none',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        draggable: false,
      },
    ]

    for (const branch of branches) {
      for (const node of branch.nodes) {
        result.push({
          id: node.id,
          type: 'skillNode',
          position: { x: node.posX, y: node.posY },
          data: {
            node,
            userLevel: 0,
            branchColor: branch.color,
            canInvest: false,
            isLocked: false,
            missingPrereqs: [],
            isAdmin: true,
          },
          draggable: true,
        })
      }
    }

    return result
  }, [branches])

  const initialEdges: Edge[] = useMemo(() => {
    const result: Edge[] = []
    for (const branch of branches) {
      for (const node of branch.nodes) {
        if (node.edgesTo.length === 0) {
          result.push({
            id: `center-${node.id}`,
            source: 'center',
            target: node.id,
            style: { stroke: branch.color },
          })
        }
        for (const edge of node.edgesFrom) {
          result.push({
            id: `${edge.fromNodeId}-${edge.toNodeId}`,
            source: edge.fromNodeId,
            target: edge.toNodeId,
            style: { stroke: branch.color },
          })
        }
      }
    }
    return result
  }, [branches])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes])
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      createEdge.mutate({
        fromNodeId: connection.source,
        toNodeId: connection.target,
        minLevel: 1,
      })
      setEdges((eds) => addEdge(connection, eds))
    },
    [createEdge, setEdges],
  )

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.id === 'center') return
      updateNode.mutate({
        id: node.id,
        data: { posX: Math.round(node.position.x), posY: Math.round(node.position.y) },
      })
    },
    [updateNode],
  )

  const onEdgeDoubleClick = useCallback(
    (_: any, edge: Edge) => {
      if (!window.confirm('Supprimer cette connexion ?')) return
      deleteEdge.mutate({ fromNodeId: edge.source, toNodeId: edge.target })
      setEdges((eds) => eds.filter((e) => e.id !== edge.id))
    },
    [deleteEdge, setEdges],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onEdgeDoubleClick={onEdgeDoubleClick}
      onNodeClick={(_, node) => onNodeSelect(node.id === 'center' ? null : node.id)}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1f2937" gap={24} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  )
}
