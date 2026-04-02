import { createFileRoute } from '@tanstack/react-router'
import { Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import type { SkillNode } from '../../api/skills.api.ts'
import { AdminSkillTreeCanvas } from '../../components/skill-tree/AdminSkillTreeCanvas.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet.tsx'
import {
  useAdminCreateNode,
  useAdminDeleteNode,
  useAdminSkillConfig,
  useAdminSkillTree,
  useAdminUpdateConfig,
  useAdminUpdateNode,
} from '../../queries/useSkills.ts'

export const Route = createFileRoute('/_admin/admin/skills')({
  component: AdminSkillsPage,
})

const EFFECT_TYPES = [
  'REGEN',
  'LUCK',
  'DUST_HARVEST',
  'TOKEN_VAULT',
  'FREE_PULL_CHANCE',
  'MULTI_TOKEN_CHANCE',
  'GOLDEN_BALL_CHANCE',
  'SHOP_DISCOUNT',
] as const

type SheetMode = 'edit' | 'create' | 'config' | null

function AdminSkillsPage() {
  const { data: branches, isLoading } = useAdminSkillTree()
  const { data: config } = useAdminSkillConfig()
  const updateConfig = useAdminUpdateConfig()
  const updateNode = useAdminUpdateNode()
  const deleteNode = useAdminDeleteNode()
  const createNode = useAdminCreateNode()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<SheetMode>(null)
  const [resetCost, setResetCost] = useState<number | null>(null)

  // Create form state
  const [newNode, setNewNode] = useState<{
    name: string
    description: string
    branchId: string
    icon: string
    effectType: string
    maxLevel: number
  }>({ name: '', description: '', branchId: '', icon: 'Star', effectType: 'LUCK', maxLevel: 3 })

  if (isLoading || !branches) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Chargement…</div>
  }

  const selectedNode = branches.flatMap((b) => b.nodes).find((n) => n.id === selectedNodeId)
  const selectedBranch = selectedNode
    ? branches.find((b) => b.nodes.some((n) => n.id === selectedNodeId))
    : null

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    setSheetMode(nodeId ? 'edit' : null)
  }

  const handleCreateSubmit = () => {
    const levels = Array.from({ length: newNode.maxLevel }, (_, i) => ({
      nodeId: '',
      level: i + 1,
      effect: 0,
    }))
    createNode.mutate(
      {
        ...newNode,
        posX: 0,
        posY: 0,
        levels,
      } as Omit<SkillNode, 'id' | 'edgesFrom' | 'edgesTo'>,
      {
        onSuccess: () => setSheetMode(null),
      },
    )
  }

  const sheetOpen = sheetMode !== null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-800 bg-gray-950 px-4 py-2">
        <span className="text-sm font-semibold text-gray-300">Arbre de compétences</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setSheetMode('config')}
            className="flex items-center gap-1.5 rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200"
          >
            <Settings size={13} />
            Config
          </button>
          <button
            onClick={() => {
              setNewNode({ name: '', description: '', branchId: branches[0]?.id ?? '', icon: 'Star', effectType: 'LUCK', maxLevel: 3 })
              setSheetMode('create')
            }}
            className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
          >
            <Plus size={13} />
            Créer un nœud
          </button>
        </div>
      </div>

      {/* Canvas — prend tout l'espace restant */}
      <div className="flex-1 overflow-hidden">
        <AdminSkillTreeCanvas branches={branches} onNodeSelect={handleNodeSelect} />
      </div>

      {/* Sheet latéral */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-80 overflow-y-auto p-0">

          {/* CONFIG */}
          {sheetMode === 'config' && (
            <>
              <SheetHeader>
                <SheetTitle>Configuration globale</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Coût reset (dust/point)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    defaultValue={config?.resetCostPerPoint}
                    onChange={(e) => setResetCost(Number(e.target.value))}
                  />
                  <button
                    onClick={() => {
                      if (resetCost !== null) updateConfig.mutate({ resetCostPerPoint: resetCost })
                    }}
                    className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </>
          )}

          {/* CREATE NODE */}
          {sheetMode === 'create' && (
            <>
              <SheetHeader>
                <SheetTitle>Créer un nœud</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 p-4">
                <Field label="Branche">
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    value={newNode.branchId}
                    onChange={(e) => setNewNode((n) => ({ ...n, branchId: e.target.value }))}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Nom">
                  <input
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    value={newNode.name}
                    onChange={(e) => setNewNode((n) => ({ ...n, name: e.target.value }))}
                  />
                </Field>
                <Field label="Description">
                  <input
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    value={newNode.description}
                    onChange={(e) => setNewNode((n) => ({ ...n, description: e.target.value }))}
                  />
                </Field>
                <Field label="Icône Lucide">
                  <input
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    value={newNode.icon}
                    onChange={(e) => setNewNode((n) => ({ ...n, icon: e.target.value }))}
                    placeholder="ex: Star, Flame, Trophy…"
                  />
                </Field>
                <Field label="Effet">
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    value={newNode.effectType}
                    onChange={(e) => setNewNode((n) => ({ ...n, effectType: e.target.value }))}
                  >
                    {EFFECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Niveaux max (1-5)">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                    value={newNode.maxLevel}
                    onChange={(e) => setNewNode((n) => ({ ...n, maxLevel: Math.min(5, Math.max(1, Number(e.target.value))) }))}
                  />
                </Field>
                <p className="text-xs text-gray-500">Le nœud sera créé en (0, 0). Glisse-le ensuite sur le canvas pour le positionner.</p>
                <button
                  disabled={!newNode.name || !newNode.branchId || createNode.isPending}
                  onClick={handleCreateSubmit}
                  className="mt-2 w-full rounded bg-purple-600 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {createNode.isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </>
          )}

          {/* EDIT NODE */}
          {sheetMode === 'edit' && selectedNode && selectedBranch && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedNode.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 p-4">
                <p className="text-xs text-gray-400">Branche : <span className="text-white">{selectedBranch.name}</span></p>
                <p className="text-xs text-gray-400">Effet : <span className="text-white">{selectedNode.effectType}</span></p>
                <p className="text-xs text-gray-400">Max niveau : <span className="text-white">{selectedNode.maxLevel}</span></p>
                <p className="mt-4 text-xs font-semibold uppercase text-gray-400">Valeurs par niveau</p>
                {selectedNode.levels.map((l) => (
                  <div key={l.level} className="flex items-center gap-2">
                    <span className="w-10 text-xs text-gray-500">Niv.{l.level}</span>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={l.effect}
                      className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-0.5 text-xs text-white"
                      onBlur={(e) => {
                        const newEffect = Number(e.target.value)
                        const newLevels = selectedNode.levels.map((lvl) =>
                          lvl.level === l.level ? { ...lvl, effect: newEffect } : lvl,
                        )
                        updateNode.mutate({ id: selectedNode.id, data: { levels: newLevels } })
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (!window.confirm(`Supprimer le nœud "${selectedNode.name}" ?`)) return
                    deleteNode.mutate(selectedNode.id)
                    setSheetMode(null)
                    setSelectedNodeId(null)
                  }}
                  className="mt-4 w-full rounded border border-red-700 py-1.5 text-xs text-red-400 hover:bg-red-900/20"
                >
                  Supprimer ce nœud
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      {children}
    </div>
  )
}
