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

import type {
  SkillBranch,
  SkillConfig,
  SkillNode,
} from '../../api/skills.api.ts'
import { AdminSkillTreeCanvas } from '../../components/skill-tree/AdminSkillTreeCanvas.tsx'
import { EditNodeSheet } from '../../components/skill-tree/EditNodeSheet.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import {
  useAdminCreateNode,
  useAdminSkillConfig,
  useAdminSkillTree,
  useAdminUpdateConfig,
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
            <ConfigSheetContent config={config} />
          )}

          {sheetMode === 'create' && (
            <CreateNodeSheetContent
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
      <div className="space-y-4 p-4 text-sm text-text-light">
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

// ─── Config ────────────────────────────────────────────────────────────────────

function ConfigSheetContent({ config }: { config: SkillConfig }) {
  const updateConfig = useAdminUpdateConfig()

  const form = useAppForm({
    defaultValues: { resetCostPerPoint: config.resetCostPerPoint },
    onSubmit: ({ value }) => {
      updateConfig.mutate({ resetCostPerPoint: value.resetCostPerPoint })
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>Configuration globale</SheetTitle>
      </SheetHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="space-y-4 p-4"
      >
        <form.AppField name="resetCostPerPoint">
          {(f) => <f.Number label="Coût reset (dust / point)" />}
        </form.AppField>
        <Button type="submit" className="w-full">
          Enregistrer
        </Button>
      </form>
    </>
  )
}

// ─── Create node ───────────────────────────────────────────────────────────────

function CreateNodeSheetContent({
  branches,
  onClose,
}: {
  branches: SkillBranch[]
  onClose: () => void
}) {
  const createNode = useAdminCreateNode()

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }))
  const effectOptions = EFFECT_TYPES.map((t) => ({ value: t, label: t }))

  const form = useAppForm({
    defaultValues: {
      branchId: branches[0]?.id ?? '',
      name: '',
      description: '',
      icon: 'Star',
      effectType: 'LUCK' as string,
      maxLevel: 3 as number | undefined,
    },
    onSubmit: ({ value }) => {
      const max = value.maxLevel ?? 3
      const levels = Array.from({ length: max }, (_, i) => ({
        nodeId: '',
        level: i + 1,
        effect: 0,
      }))
      createNode.mutate(
        {
          ...value,
          effectType: value.effectType,
          posX: 0,
          posY: 0,
          levels,
        } as Omit<SkillNode, 'id' | 'edgesFrom' | 'edgesTo'>,
        { onSuccess: onClose },
      )
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>Créer un nœud</SheetTitle>
      </SheetHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="space-y-3 p-4"
      >
        <form.AppField name="branchId">
          {(f) => <f.Select label="Branche" options={branchOptions} />}
        </form.AppField>
        <form.AppField name="name">
          {(f) => <f.Input label="Nom" />}
        </form.AppField>
        <form.AppField name="description">
          {(f) => <f.Input label="Description" />}
        </form.AppField>
        <form.AppField name="icon">
          {(f) => <f.Input label="Icône Lucide" />}
        </form.AppField>
        <form.AppField name="effectType">
          {(f) => <f.Select label="Effet" options={effectOptions} />}
        </form.AppField>
        <form.AppField name="maxLevel">
          {(f) => <f.Number label="Niveaux max (1–5)" />}
        </form.AppField>
        <p className="text-xs text-text-light">
          Le nœud sera créé en (0, 0). Glisse-le ensuite sur le canvas pour le
          positionner.
        </p>
        <form.Subscribe
          selector={(s) =>
            !s.values.name || !s.values.branchId || createNode.isPending
          }
        >
          {(disabled) => (
            <Button type="submit" className="w-full" disabled={disabled}>
              {createNode.isPending ? 'Création…' : 'Créer'}
            </Button>
          )}
        </form.Subscribe>
      </form>
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
