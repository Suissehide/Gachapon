import { createFileRoute } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'
import { RotateCcw, Sparkles, TriangleAlert, Zap } from 'lucide-react'
import { useState } from 'react'

const iconMap = Icons as unknown as Record<string, LucideIcon>

import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { SkillTreeCanvas } from '../../components/skill-tree/player/SkillTreeCanvas.tsx'
import { ConfirmPopup } from '../../components/team/ConfirmPopup.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  useInvestSkill,
  useResetSkills,
  useSkillTree,
} from '../../queries/useSkills.ts'

export const Route = createFileRoute('/_authenticated/skills')({
  component: SkillsPage,
})

function SkillsPage() {
  const { data: state, isLoading } = useSkillTree()
  const invest = useInvestSkill()
  const reset = useResetSkills()
  const [resetOpen, setResetOpen] = useState(false)

  if (isLoading || !state) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Chargement…
      </div>
    )
  }

  return (
    <div
      className="flex h-[calc(100vh-var(--topbar-h))] flex-col"
      style={{ background: '#fbf8f3', color: '#1b1726' }}
    >
      {/* Header — same container shape as PageShell (max-w-5xl px-4 py-8) */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Gachapon', to: '/play' },
            { label: 'Compétences' },
          ]}
          title="Arbre de compétences"
          right={
            <div className="flex items-center gap-4">
              <span
                className="font-mono text-[12px] uppercase tracking-wider"
                style={{ color: 'rgba(27,23,38,.65)' }}
              >
                <span
                  className="font-display text-[18px] font-extrabold tabular-nums"
                  style={{ color: '#8b5cf6' }}
                >
                  {state.skillPoints}
                </span>{' '}
                points
              </span>
              {state.totalInvested > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setResetOpen(true)}
                  disabled={reset.isPending}
                >
                  Reset · {state.resetCost} dust
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Canvas — full width because the skill tree benefits from the space */}
      <div className="flex-1">
        <SkillTreeCanvas
          state={state}
          onInvest={(nodeId) => invest.mutate(nodeId)}
        />
      </div>

      {/* Légende — same container as the header */}
      <div className="border-t" style={{ borderColor: 'rgba(27,23,38,.08)' }}>
        <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-1 px-4 py-3">
          {state.branches.map((b) => {
            const Icon = iconMap[b.icon] ?? Icons.Zap
            return (
              <div
                key={b.id}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider"
                style={{ color: 'rgba(27,23,38,.6)' }}
              >
                <Icon size={12} />
                <span style={{ color: b.color }}>{b.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmPopup
        open={resetOpen}
        onOpenChange={setResetOpen}
        icon={<RotateCcw className="h-4 w-4" />}
        title="Réinitialiser l'arbre"
        description={
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-light">
                  <Sparkles className="h-3 w-3 text-violet-400" />
                  Coût
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-text">
                    {state.resetCost}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-light">
                    dust
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-light">
                  <Zap className="h-3 w-3 text-amber-400" />
                  Points rendus
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-text">
                    {state.totalInvested}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-light">
                    points
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-text">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="leading-snug">
                Tous tes points investis seront redistribués. Cette action est
                définitive.
              </p>
            </div>
          </div>
        }
        confirmLabel="Réinitialiser"
        onConfirm={() => reset.mutate()}
      />
    </div>
  )
}
