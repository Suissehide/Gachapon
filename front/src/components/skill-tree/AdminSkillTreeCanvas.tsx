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
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SkillBranch } from '../../api/skills.api.ts'
import {
  useAdminCreateBranch,
  useAdminCreateEdge,
  useAdminDeleteEdge,
  useAdminUpdateNode,
} from '../../queries/useSkills.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { CenterNode, pickCenterSourceHandle } from './CenterNode.tsx'
import { SkillNodeComponent } from './SkillNode.tsx'

const nodeTypes = { skillNode: SkillNodeComponent, centerNode: CenterNode }

type Props = {
  branches: SkillBranch[]
  onNodeSelect: (nodeId: string | null) => void
}

const BRANCH_PALETTE = [
  '#6c47ff',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#a855f7',
]

export function AdminSkillTreeCanvas({ branches, onNodeSelect }: Props) {
  const createEdge = useAdminCreateEdge()
  const deleteEdge = useAdminDeleteEdge()
  const updateNode = useAdminUpdateNode()
  const createBranch = useAdminCreateBranch()

  // Walk parent edges (edgesTo) up to a root and use the root's branch color.
  // A "root" is a node with no incoming edges (= virtually connected to the
  // center node). New nodes default to whichever branch but their displayed
  // color follows the parent chain.
  const colorByNodeId = useMemo(() => {
    const allNodes = branches.flatMap((b) =>
      b.nodes.map((n) => ({ node: n, branchColor: b.color })),
    )
    const byId = new Map(allNodes.map((x) => [x.node.id, x]))
    const cache = new Map<string, string>()

    const resolve = (id: string, seen: Set<string>): string => {
      if (cache.has(id)) return cache.get(id)!
      if (seen.has(id)) return byId.get(id)?.branchColor ?? '#6c47ff'
      seen.add(id)
      const entry = byId.get(id)
      if (!entry) return '#6c47ff'
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
    for (const { node } of allNodes) map.set(node.id, resolve(node.id, new Set()))
    return map
  }, [branches])

  const initialNodes: Node[] = useMemo(() => {
    const result: Node[] = [
      {
        id: 'center',
        type: 'centerNode',
        position: { x: -36, y: -36 },
        data: {},
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
  }, [branches, colorByNodeId])

  const initialEdges: Edge[] = useMemo(() => {
    const result: Edge[] = []
    for (const branch of branches) {
      for (const node of branch.nodes) {
        const color = colorByNodeId.get(node.id) ?? branch.color
        if (node.edgesTo.length === 0) {
          result.push({
            id: `center-${node.id}`,
            source: 'center',
            sourceHandle: pickCenterSourceHandle(node.posX, node.posY),
            target: node.id,
            style: { stroke: color },
          })
        }
        for (const edge of node.edgesFrom) {
          const childColor = colorByNodeId.get(edge.toNodeId) ?? color
          result.push({
            id: `${edge.fromNodeId}-${edge.toNodeId}`,
            source: edge.fromNodeId,
            target: edge.toNodeId,
            style: { stroke: childColor },
          })
        }
      }
    }
    return result
  }, [branches, colorByNodeId])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes])
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges])

  const [pendingBranchNodeId, setPendingBranchNodeId] = useState<string | null>(
    null,
  )
  const [branchName, setBranchName] = useState('')

  const detachFromParents = useCallback(
    async (nodeId: string) => {
      const targetNode = branches
        .flatMap((b) => b.nodes)
        .find((n) => n.id === nodeId)
      if (!targetNode) return
      for (const edge of targetNode.edgesTo) {
        await deleteEdge.mutateAsync({
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
        })
      }
    },
    [branches, deleteEdge],
  )

  const handleConnectToCenter = useCallback(
    (nodeId: string) => {
      const targetNode = branches
        .flatMap((b) => b.nodes)
        .find((n) => n.id === nodeId)
      if (!targetNode) return

      const hasAnyConnection =
        targetNode.edgesTo.length > 0 || targetNode.edgesFrom.length > 0

      if (hasAnyConnection) {
        // Already linked somewhere → keep its existing branch, just detach
        // from its parents so it becomes a root.
        detachFromParents(nodeId)
        return
      }

      // Brand new isolated node → ask the user to name a new main branch.
      setBranchName('')
      setPendingBranchNodeId(nodeId)
    },
    [branches, detachFromParents],
  )

  const submitNewBranch = useCallback(async () => {
    const nodeId = pendingBranchNodeId
    const name = branchName.trim()
    if (!nodeId || !name) return

    const branch = await createBranch.mutateAsync({
      name,
      description: '',
      icon: 'Star',
      color: BRANCH_PALETTE[branches.length % BRANCH_PALETTE.length],
      order: branches.length + 1,
    })
    await updateNode.mutateAsync({
      id: nodeId,
      data: { branchId: branch.id },
    })
    setPendingBranchNodeId(null)
    setBranchName('')
  }, [pendingBranchNodeId, branchName, branches.length, createBranch, updateNode])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      if (connection.source === 'center' || connection.target === 'center') {
        const otherId =
          connection.source === 'center' ? connection.target : connection.source
        if (otherId && otherId !== 'center') handleConnectToCenter(otherId)
        return
      }

      createEdge.mutate({
        fromNodeId: connection.source,
        toNodeId: connection.target,
        minLevel: 1,
      })
      setEdges((eds) => addEdge(connection, eds))
    },
    [createEdge, setEdges, handleConnectToCenter],
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
      if (edge.source === 'center') return
      deleteEdge.mutate({ fromNodeId: edge.source, toNodeId: edge.target })
      setEdges((eds) => eds.filter((e) => e.id !== edge.id))
    },
    [deleteEdge, setEdges],
  )

  return (
    <>
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

      <Popup
        open={pendingBranchNodeId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingBranchNodeId(null)
            setBranchName('')
          }
        }}
      >
        <PopupContent>
          <PopupHeader>
            <PopupTitle>Nouvelle branche principale</PopupTitle>
          </PopupHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitNewBranch()
            }}
          >
            <PopupBody className="space-y-3">
              <Label htmlFor="new-branch-name">Nom de la branche</Label>
              <Input
                id="new-branch-name"
                autoFocus
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Ex. Fortune"
              />
            </PopupBody>
            <PopupFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingBranchNodeId(null)
                  setBranchName('')
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!branchName.trim() || createBranch.isPending}
              >
                {createBranch.isPending ? 'Création…' : 'Créer'}
              </Button>
            </PopupFooter>
          </form>
        </PopupContent>
      </Popup>
    </>
  )
}
