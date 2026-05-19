import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { SkillBranch } from '../../../api/skills.api.ts'
import { BRANCH_PALETTE } from '../../../constants/skills.constant.ts'
import {
  useAdminCreateBranch,
  useAdminCreateEdge,
  useAdminDeleteBranch,
  useAdminDeleteEdge,
  useAdminUpdateBranch,
  useAdminUpdateNode,
} from '../../../queries/useSkills.ts'
import {
  branchOrderForHandleKey,
  CenterNode,
  handleKeyForBranchOrder,
  pickHandles,
} from '../shared/CenterNode.tsx'
import { SkillNodeComponent } from '../shared/SkillNode.tsx'

const nodeTypes = { skillNode: SkillNodeComponent, centerNode: CenterNode }

type Props = {
  branches: SkillBranch[]
  onNodeSelect: (nodeId: string | null) => void
}

export function AdminSkillTreeCanvas({ branches, onNodeSelect }: Props) {
  const createEdge = useAdminCreateEdge()
  const deleteEdge = useAdminDeleteEdge()
  const updateNode = useAdminUpdateNode()
  const createBranch = useAdminCreateBranch()
  const updateBranch = useAdminUpdateBranch()
  const deleteBranch = useAdminDeleteBranch()

  // Map branches to center handles by order (1=top, 2=right, 3=bottom, 4=left)
  const branchByHandle = useMemo(() => {
    const map: Record<string, { id: string; name: string; color: string }> = {}
    for (const b of branches) {
      const key = handleKeyForBranchOrder(b.order)
      if (key) {
        map[key] = { id: b.id, name: b.name, color: b.color }
      }
    }
    return map
  }, [branches])

  const handleUpdateBranch = useCallback(
    (branchId: string, data: { name?: string; color?: string }) => {
      updateBranch.mutate({ id: branchId, data })
    },
    [updateBranch],
  )

  // Keep stable refs so the center node data doesn't trigger re-renders
  const updateBranchRef = useRef(handleUpdateBranch)
  updateBranchRef.current = handleUpdateBranch
  const stableUpdateBranch = useCallback(
    (id: string, data: { name?: string; color?: string }) => updateBranchRef.current(id, data),
    [],
  )

  const handleCreateBranch = useCallback(
    (handleKey: string) => {
      const order = branchOrderForHandleKey(handleKey)
      if (!order) {
        return
      }
      createBranch.mutate({
        name: `Branche ${order}`,
        description: '',
        icon: 'Star',
        color: BRANCH_PALETTE[(order - 1) % BRANCH_PALETTE.length],
        order,
      })
    },
    [createBranch],
  )
  const createBranchRef = useRef(handleCreateBranch)
  createBranchRef.current = handleCreateBranch
  const stableCreateBranch = useCallback(
    (key: string) => createBranchRef.current(key),
    [],
  )

  const handleDeleteBranch = useCallback(
    (branchId: string) => {
      deleteBranch.mutate(branchId)
    },
    [deleteBranch],
  )
  const deleteBranchRef = useRef(handleDeleteBranch)
  deleteBranchRef.current = handleDeleteBranch
  const stableDeleteBranch = useCallback(
    (id: string) => deleteBranchRef.current(id),
    [],
  )

  // Walk parent edges (edgesTo) up to a root and use the root's branch color.
  const colorByNodeId = useMemo(() => {
    const allNodes = branches.flatMap((b) =>
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
  }, [branches])

  const initialNodes: Node[] = useMemo(() => {
    const result: Node[] = [
      {
        id: 'center',
        type: 'centerNode',
        position: { x: 9, y: 9 },
        data: {
          branchByHandle,
          onUpdateBranch: stableUpdateBranch,
          onCreateBranch: stableCreateBranch,
          onDeleteBranch: stableDeleteBranch,
          isAdmin: true,
        },
        draggable: false,
        selectable: false,
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
            branchColor: colorByNodeId.get(node.id) ?? branch.color,
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
  }, [
    branches,
    colorByNodeId,
    branchByHandle,
    stableUpdateBranch,
    stableCreateBranch,
    stableDeleteBranch,
  ])

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    map.set('center', { x: 0, y: 0 })
    for (const branch of branches) {
      for (const node of branch.nodes) {
        map.set(node.id, { x: node.posX, y: node.posY })
      }
    }
    return map
  }, [branches])

  const initialEdges: Edge[] = useMemo(() => {
    const result: Edge[] = []
    for (const branch of branches) {
      const handleKey = handleKeyForBranchOrder(branch.order)
      for (const node of branch.nodes) {
        const color = colorByNodeId.get(node.id) ?? branch.color
        // Root nodes → visual link to center via their branch handle
        if (node.edgesTo.length === 0 && handleKey) {
          result.push({
            id: `center-${node.id}`,
            source: 'center',
            sourceHandle: `s-${handleKey}`,
            target: node.id,
            targetHandle: pickHandles(0, 0, node.posX, node.posY).targetHandle,
            style: { stroke: color },
            reconnectable: false,
          })
        }
        for (const edge of node.edgesFrom) {
          const childColor = colorByNodeId.get(edge.toNodeId) ?? color
          // Use DB-stored handles if available, otherwise compute from position
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
            style: { stroke: childColor },
            reconnectable: 'target' as const,
          })
        }
      }
    }
    return result
  }, [branches, colorByNodeId, nodePositions])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  // Sync edges from backend — block new center edges that weren't already local
  useEffect(() => {
    setEdges((currentEdges) => {
      const currentById = new Map(currentEdges.map((e) => [e.id, e]))
      return initialEdges.filter((edge) => {
        if (edge.id.startsWith('center-')) {
          return currentById.has(edge.id)
        }
        return true
      })
    })
  }, [initialEdges, setEdges])

  // Connect a node to a center handle → assign its branch, detach from parents
  const handleCenterConnection = useCallback(
    async (nodeId: string, handleKey: string) => {
      const order = branchOrderForHandleKey(handleKey)
      if (!order) {
        return
      }

      let branch = branches.find((b) => b.order === order)

      if (!branch) {
        branch = await createBranch.mutateAsync({
          name: `Branche ${order}`,
          description: '',
          icon: 'Star',
          color: BRANCH_PALETTE[(order - 1) % BRANCH_PALETTE.length],
          order,
        })
      }

      // Detach from existing parents
      const node = branches.flatMap((b) => b.nodes).find((n) => n.id === nodeId)
      if (node) {
        for (const edge of node.edgesTo) {
          await deleteEdge.mutateAsync({
            fromNodeId: edge.fromNodeId,
            toNodeId: edge.toNodeId,
          })
        }
      }

      // Assign branch
      await updateNode.mutateAsync({
        id: nodeId,
        data: { branchId: branch.id },
      })
    },
    [branches, createBranch, deleteEdge, updateNode],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target } = connection
      if (!source || !target) {
        return
      }
      if (source === target) {
        return
      }

      // Center connection → assign branch + show edge immediately
      if (source === 'center' || target === 'center') {
        const isCenterSource = source === 'center'
        const nodeId = isCenterSource ? target : source
        const handleId = isCenterSource
          ? connection.sourceHandle
          : connection.targetHandle
        const handleKey = handleId?.replace(/^[st]-/, '')
        if (nodeId !== 'center' && handleKey) {
          const branch = branchByHandle[handleKey]
          setEdges((eds) => {
            const filtered = eds.filter((e) => e.id !== `center-${nodeId}`)
            return [
              ...filtered,
              {
                id: `center-${nodeId}`,
                source: 'center',
                sourceHandle: `s-${handleKey}`,
                target: nodeId,
                targetHandle:
                  connection.targetHandle ??
                  connection.sourceHandle ??
                  undefined,
                style: { stroke: branch?.color ?? '#6c47ff' },
                reconnectable: false,
              },
            ]
          })
          handleCenterConnection(nodeId, handleKey)
        }
        return
      }

      // Node-to-node connection
      createEdge.mutate({
        fromNodeId: source,
        toNodeId: target,
        minLevel: 1,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      })
      setEdges((eds) => [
        ...eds,
        {
          id: `${source}-${target}`,
          source,
          target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          style: { stroke: colorByNodeId.get(target) ?? '#6c47ff' },
          reconnectable: 'target' as const,
        },
      ])
    },
    [
      createEdge,
      setEdges,
      handleCenterConnection,
      colorByNodeId,
      branchByHandle,
    ],
  )

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === 'center') {
        return
      }
      updateNode.mutate({
        id: node.id,
        data: {
          posX: Math.round(node.position.x),
          posY: Math.round(node.position.y),
        },
      })
    },
    [updateNode],
  )

  const reconnectSucceeded = useRef(false)

  const onReconnectStart = useCallback(() => {
    reconnectSucceeded.current = false
  }, [])

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (
        oldEdge.source === 'center' ||
        !newConnection.source ||
        !newConnection.target
      ) {
        return
      }
      if (newConnection.source === newConnection.target) {
        return
      }

      reconnectSucceeded.current = true
      deleteEdge.mutate({
        fromNodeId: oldEdge.source,
        toNodeId: oldEdge.target,
      })
      createEdge.mutate({
        fromNodeId: newConnection.source,
        toNodeId: newConnection.target,
        minLevel: 1,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
      })
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds))
    },
    [deleteEdge, createEdge, setEdges],
  )

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, _edge: Edge) => {
      if (!reconnectSucceeded.current) {
        setEdges(initialEdges)
      }
    },
    [setEdges, initialEdges],
  )

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (edge.source === 'center') {
        return
      }
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
      onReconnectStart={onReconnectStart}
      onReconnect={onReconnect}
      onReconnectEnd={onReconnectEnd}
      onNodeDragStop={onNodeDragStop}
      onEdgeDoubleClick={onEdgeDoubleClick}
      onNodeClick={(_, node) =>
        onNodeSelect(node.id === 'center' ? null : node.id)
      }
      connectionRadius={60}
      snapToGrid
      snapGrid={[24, 24]}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1f2937" gap={24} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  )
}
