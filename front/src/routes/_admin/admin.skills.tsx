import { createFileRoute } from '@tanstack/react-router'
import { HelpCircle, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import type { SkillNode } from '../../api/skills.api.ts'
import { AdminSkillTreeCanvas } from '../../components/skill-tree/AdminSkillTreeCanvas.tsx'
import { Button } from '../../components/ui/button.tsx'
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

type SheetMode = 'edit' | 'create' | 'config' | 'help' | null

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
      { ...newNode, posX: 0, posY: 0, levels } as Omit<SkillNode, 'id' | 'edgesFrom' | 'edgesTo'>,
      { onSuccess: () => { setSheetMode(null) } },
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
        <span className="text-sm font-semibold text-text">Arbre de compétences</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSheetMode('help')}>
            <HelpCircle size={13} />
            Aide
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSheetMode('config')}>
            <Settings size={13} />
            Config
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewNode({ name: '', description: '', branchId: branches[0]?.id ?? '', icon: 'Star', effectType: 'LUCK', maxLevel: 3 })
              setSheetMode('create')
            }}
          >
            <Plus size={13} />
            Créer un nœud
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <AdminSkillTreeCanvas branches={branches} onNodeSelect={handleNodeSelect} />
      </div>

      {/* Sheet */}
      <Sheet open={sheetMode !== null} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-80 overflow-y-auto p-0">

          {/* AIDE */}
          {sheetMode === 'help' && (
            <>
              <SheetHeader>
                <SheetTitle>Utilisation du graphe</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 p-4 text-sm text-text-light">
                <HelpItem icon="🖱️" title="Naviguer">
                  Scroll pour zoomer. Cliquer-glisser sur le fond pour déplacer la vue.
                </HelpItem>
                <HelpItem icon="✋" title="Déplacer un nœud">
                  Glisser un nœud sur le canvas pour le repositionner. La position est sauvegardée automatiquement.
                </HelpItem>
                <HelpItem icon="🔗" title="Créer une connexion">
                  Survoler un nœud pour faire apparaître ses ports (ronds sur les côtés). Glisser depuis le port droit <strong className="text-text">source</strong> vers le port gauche <strong className="text-text">cible</strong> d'un autre nœud. Pas de limite de connexions par nœud.
                </HelpItem>
                <HelpItem icon="✂️" title="Supprimer une connexion">
                  Double-cliquer sur une connexion pour la supprimer (confirmation requise).
                </HelpItem>
                <HelpItem icon="✏️" title="Éditer un nœud">
                  Cliquer sur un nœud pour ouvrir ce panneau et modifier ses valeurs par niveau.
                </HelpItem>
                <HelpItem icon="➕" title="Créer un nœud">
                  Utiliser le bouton <strong className="text-text">Créer un nœud</strong> dans la toolbar. Le nœud apparaît en (0, 0) — glisse-le pour le positionner.
                </HelpItem>
              </div>
            </>
          )}

          {/* CONFIG */}
          {sheetMode === 'config' && (
            <>
              <SheetHeader>
                <SheetTitle>Configuration globale</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-text-light">Coût reset (dust / point)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    defaultValue={config?.resetCostPerPoint}
                    onChange={(e) => setResetCost(Number(e.target.value))}
                  />
                  <Button
                    size="sm"
                    onClick={() => { if (resetCost !== null) { updateConfig.mutate({ resetCostPerPoint: resetCost }) } }}
                  >
                    OK
                  </Button>
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
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={newNode.branchId}
                    onChange={(e) => setNewNode((n) => ({ ...n, branchId: e.target.value }))}
                  >
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
                <Field label="Nom">
                  <input
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={newNode.name}
                    onChange={(e) => setNewNode((n) => ({ ...n, name: e.target.value }))}
                  />
                </Field>
                <Field label="Description">
                  <input
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={newNode.description}
                    onChange={(e) => setNewNode((n) => ({ ...n, description: e.target.value }))}
                  />
                </Field>
                <Field label="Icône Lucide">
                  <input
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={newNode.icon}
                    onChange={(e) => setNewNode((n) => ({ ...n, icon: e.target.value }))}
                    placeholder="ex : Star, Flame, Trophy…"
                  />
                </Field>
                <Field label="Effet">
                  <select
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={newNode.effectType}
                    onChange={(e) => setNewNode((n) => ({ ...n, effectType: e.target.value }))}
                  >
                    {EFFECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Niveaux max (1–5)">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={newNode.maxLevel}
                    onChange={(e) => setNewNode((n) => ({ ...n, maxLevel: Math.min(5, Math.max(1, Number(e.target.value))) }))}
                  />
                </Field>
                <p className="text-xs text-text-light">Le nœud sera créé en (0, 0). Glisse-le ensuite sur le canvas pour le positionner.</p>
                <Button
                  className="w-full"
                  disabled={!newNode.name || !newNode.branchId || createNode.isPending}
                  onClick={handleCreateSubmit}
                >
                  {createNode.isPending ? 'Création…' : 'Créer'}
                </Button>
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
                <p className="text-xs text-text-light">Branche : <span className="text-text">{selectedBranch.name}</span></p>
                <p className="text-xs text-text-light">Effet : <span className="text-text">{selectedNode.effectType}</span></p>
                <p className="text-xs text-text-light">Max niveau : <span className="text-text">{selectedNode.maxLevel}</span></p>
                <p className="mt-4 text-xs font-semibold uppercase text-text-light">Valeurs par niveau</p>
                {selectedNode.levels.map((l) => (
                  <div key={l.level} className="flex items-center gap-2">
                    <span className="w-10 text-xs text-text-light">Niv.{l.level}</span>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={l.effect}
                      className="w-full rounded border border-border bg-surface px-2 py-0.5 text-xs text-text"
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
                <Button
                  variant="destructive"
                  className="mt-4 w-full"
                  onClick={() => {
                    if (!window.confirm(`Supprimer le nœud "${selectedNode.name}" ?`)) return
                    deleteNode.mutate(selectedNode.id)
                    setSheetMode(null)
                    setSelectedNodeId(null)
                  }}
                >
                  Supprimer ce nœud
                </Button>
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
      <p className="mb-1 text-xs text-text-light">{label}</p>
      {children}
    </div>
  )
}

function HelpItem({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-base leading-none">{icon}</span>
      <div>
        <p className="mb-0.5 font-semibold text-text">{title}</p>
        <p className="leading-relaxed">{children}</p>
      </div>
    </div>
  )
}
