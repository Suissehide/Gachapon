import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminSkillTreeCanvas } from '../../components/skill-tree/AdminSkillTreeCanvas.tsx'
import {
  useAdminDeleteNode,
  useAdminSkillConfig,
  useAdminSkillTree,
  useAdminUpdateConfig,
  useAdminUpdateNode,
} from '../../queries/useSkills.ts'

export const Route = createFileRoute('/_admin/admin/skills')({
  component: AdminSkillsPage,
})

function AdminSkillsPage() {
  const { data: branches, isLoading } = useAdminSkillTree()
  const { data: config } = useAdminSkillConfig()
  const updateConfig = useAdminUpdateConfig()
  const updateNode = useAdminUpdateNode()
  const deleteNode = useAdminDeleteNode()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [resetCost, setResetCost] = useState<number | null>(null)

  if (isLoading || !branches) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Chargement…</div>
  }

  const selectedNode = branches.flatMap((b) => b.nodes).find((n) => n.id === selectedNodeId)
  const selectedBranch = selectedNode
    ? branches.find((b) => b.nodes.some((n) => n.id === selectedNodeId))
    : null

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Canvas */}
      <div className="flex-1">
        <AdminSkillTreeCanvas branches={branches} onNodeSelect={setSelectedNodeId} />
      </div>

      {/* Panneau latéral */}
      <aside className="w-72 overflow-y-auto border-l border-gray-800 bg-gray-950 p-4">
        <h2 className="mb-4 font-bold">Configuration</h2>

        {/* Config globale */}
        <div className="mb-6 rounded border border-gray-800 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Coût reset (dust/point)</p>
          <div className="flex gap-2">
            <input
              type="number"
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm"
              defaultValue={config?.resetCostPerPoint}
              onChange={(e) => setResetCost(Number(e.target.value))}
            />
            <button
              onClick={() => resetCost !== null && updateConfig.mutate({ resetCostPerPoint: resetCost })}
              className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700"
            >
              OK
            </button>
          </div>
        </div>

        {/* Nœud sélectionné */}
        {selectedNode && selectedBranch ? (
          <div className="rounded border border-gray-800 p-3">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-400">
              Nœud : {selectedNode.name}
            </p>
            <p className="mb-1 text-xs text-gray-400">Branche : {selectedBranch.name}</p>
            <p className="mb-1 text-xs text-gray-400">Effet : {selectedNode.effectType}</p>
            <p className="mb-3 text-xs text-gray-400">Max niveau : {selectedNode.maxLevel}</p>

            <p className="mb-1 text-xs text-gray-400">Effets par niveau :</p>
            {selectedNode.levels.map((l) => (
              <div key={l.level} className="mb-1 flex items-center gap-2">
                <span className="text-xs text-gray-500">Niv.{l.level}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={l.effect}
                  className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-0.5 text-xs"
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
                setSelectedNodeId(null)
              }}
              className="mt-3 w-full rounded border border-red-700 py-1 text-xs text-red-400 hover:bg-red-900/20"
            >
              Supprimer ce nœud
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Cliquer sur un nœud pour l'éditer.
            <br />
            Glisser pour déplacer.
            <br />
            Double-clic sur une connexion pour la supprimer.
            <br />
            Tirer d'un port à un autre pour connecter.
          </p>
        )}
      </aside>
    </div>
  )
}
