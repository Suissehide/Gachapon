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
  Zap,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { AdminSkillTreeCanvas } from '../../components/skill-tree/admin/AdminSkillTreeCanvas.tsx'
import { ConfigSheet } from '../../components/skill-tree/admin/ConfigSheet.tsx'
import { CreateNodeSheet } from '../../components/skill-tree/admin/CreateNodeSheet.tsx'
import { EditNodeSheet } from '../../components/skill-tree/admin/EditNodeSheet.tsx'
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
  const { t } = useTranslation('admin')
  const { data: branches, isLoading } = useAdminSkillTree()
  const { data: config } = useAdminSkillConfig()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<SheetMode>(null)

  if (isLoading || !branches) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        {t('skills.loading')}
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
      <div className="h-14 flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            {t('skills.toolbar.kicker')}
          </span>
          <span className="text-text-light/40">·</span>
          <span className="text-sm font-semibold text-text">
            {t('skills.toolbar.title')}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetMode('help')}
          >
            <HelpCircle size={13} />
            {t('skills.toolbar.helpButton')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetMode('config')}
          >
            <Settings size={13} />
            {t('skills.toolbar.configButton')}
          </Button>
          <Button size="sm" onClick={() => setSheetMode('create')}>
            <Plus size={13} />
            {t('skills.toolbar.createNodeButton')}
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
        <SheetContent
          side="right"
          className="flex w-[min(480px,100vw)] flex-col overflow-hidden p-0"
        >
          {sheetMode === 'help' && <HelpSheetContent />}

          {sheetMode === 'config' && config && (
            <ConfigSheet config={config} onClose={() => setSheetMode(null)} />
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
  const { t } = useTranslation('admin')
  const strong = <strong className="text-text" />
  return (
    <>
      <SheetHeader>
        <SheetTitle>{t('skills.help.title')}</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto space-y-4 p-4 text-sm text-text-light">
        <HelpItem icon={MousePointer2} title={t('skills.help.navigateTitle')}>
          {t('skills.help.navigateBody')}
        </HelpItem>
        <HelpItem icon={GripVertical} title={t('skills.help.moveNodeTitle')}>
          {t('skills.help.moveNodeBody')}
        </HelpItem>
        <HelpItem icon={Link2} title={t('skills.help.createConnectionTitle')}>
          <Trans
            t={t}
            i18nKey="skills.help.createConnectionBody"
            components={{ strong }}
          />
        </HelpItem>
        <HelpItem
          icon={Scissors}
          title={t('skills.help.deleteConnectionTitle')}
        >
          {t('skills.help.deleteConnectionBody')}
        </HelpItem>
        <HelpItem icon={Pencil} title={t('skills.help.editNodeTitle')}>
          {t('skills.help.editNodeBody')}
        </HelpItem>
        <HelpItem icon={PlusCircle} title={t('skills.help.createNodeTitle')}>
          <Trans
            t={t}
            i18nKey="skills.help.createNodeBody"
            components={{ strong }}
          />
        </HelpItem>
        <HelpItem icon={GitBranch} title={t('skills.help.structureTitle')}>
          {t('skills.help.structureBody')}
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
  children: ReactNode
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
