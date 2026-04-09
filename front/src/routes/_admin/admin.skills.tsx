import { createFileRoute } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  GitBranch,
  GripVertical,
  HelpCircle,
  Link2,
  MousePointer2,
  Pencil,
  Plus,
  PlusCircle,
  Scissors,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

import { AdminSkillTreeCanvas } from '../../components/skill-tree/AdminSkillTreeCanvas.tsx'
import { ConfigSheet } from '../../components/skill-tree/ConfigSheet.tsx'
import { CreateNodeSheet } from '../../components/skill-tree/CreateNodeSheet.tsx'
import { EditNodeSheet } from '../../components/skill-tree/EditNodeSheet.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet.tsx'
import {
  useAdminSkillConfig,
  useAdminSkillTree,
} from '../../queries/useSkills.ts'

export const Route = createFileRoute('/_admin/admin/skills')({
  component: AdminSkillsPage,
})

type SheetMode = 'edit' | 'create' | 'config' | 'help' | null

function AdminSkillsPage() {
  const { data: branches, isLoading } = useAdminSkillTree()
  const { data: config } = useAdminSkillConfig()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<SheetMode>(null)

  if (isLoading || !branches) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Chargement…
      </div>
    )
  }

  const selectedNode = branches
    .flatMap((b) => b.nodes)
    .find((n) => n.id === selectedNodeId)
  const selectedBranch = selectedNode
    ? branches.find((b) => b.nodes.some((n) => n.id === selectedNodeId))
    : null

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    setSheetMode(nodeId ? 'edit' : null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
        <span className="text-sm font-semibold text-text">
          Arbre de compétences
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetMode('help')}
          >
            <HelpCircle size={13} />
            Aide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetMode('config')}
          >
            <Settings size={13} />
            Config
          </Button>
          <Button size="sm" onClick={() => setSheetMode('create')}>
            <Plus size={13} />
            Créer un nœud
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <AdminSkillTreeCanvas
          branches={branches}
          onNodeSelect={handleNodeSelect}
        />
      </div>

      {/* Sheet */}
      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => !open && setSheetMode(null)}
      >
        <SheetContent side="right" className="w-80 overflow-y-auto p-0">
          {sheetMode === 'help' && <HelpSheetContent />}

          {sheetMode === 'config' && config && (
            <ConfigSheet config={config} />
          )}

          {sheetMode === 'create' && (
            <CreateNodeSheet
              branches={branches}
              onClose={() => setSheetMode(null)}
            />
          )}

          {sheetMode === 'edit' && selectedNode && selectedBranch && (
            <EditNodeSheet
              key={selectedNode.id}
              node={selectedNode}
              branch={selectedBranch}
              onClose={() => {
                setSheetMode(null)
                setSelectedNodeId(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Help ──────────────────────────────────────────────────────────────────────

function HelpSheetContent() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Utilisation du graphe</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto space-y-4 p-4 text-sm text-text-light">
        <HelpItem icon={MousePointer2} title="Naviguer">
          Scroll pour zoomer. Cliquer-glisser sur le fond pour déplacer la vue.
        </HelpItem>
        <HelpItem icon={GripVertical} title="Déplacer un nœud">
          Glisser un nœud sur le canvas pour le repositionner. La position est
          sauvegardée automatiquement.
        </HelpItem>
        <HelpItem icon={Link2} title="Créer une connexion">
          Survoler un nœud pour faire apparaître ses ports (ronds sur les
          côtés). Glisser depuis le port droit{' '}
          <strong className="text-text">source</strong> vers le port gauche{' '}
          <strong className="text-text">cible</strong> d'un autre nœud. Pas de
          limite de connexions par nœud.
        </HelpItem>
        <HelpItem icon={Scissors} title="Supprimer une connexion">
          Double-cliquer sur une connexion pour la supprimer (confirmation
          requise).
        </HelpItem>
        <HelpItem icon={Pencil} title="Éditer un nœud">
          Cliquer sur un nœud pour ouvrir ce panneau et modifier ses valeurs par
          niveau.
        </HelpItem>
        <HelpItem icon={PlusCircle} title="Créer un nœud">
          Utiliser le bouton{' '}
          <strong className="text-text">Créer un nœud</strong> dans la toolbar.
          Le nœud apparaît en (0, 0) — glisse-le pour le positionner.
        </HelpItem>
        <HelpItem icon={GitBranch} title="Structure">
          Les nœuds sans parent sont connectés automatiquement au nœud central.
          Les connexions entre nœuds définissent les prérequis pour les joueurs.
        </HelpItem>
      </div>
    </>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function HelpItem({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-primary" />
      <div>
        <p className="mb-0.5 font-semibold text-text">{title}</p>
        <p className="leading-relaxed">{children}</p>
      </div>
    </div>
  )
}
