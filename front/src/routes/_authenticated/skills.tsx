import { createFileRoute } from '@tanstack/react-router'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap = Icons as unknown as Record<string, LucideIcon>
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { SkillTreeCanvas } from '../../components/skill-tree/index.ts'
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

  if (isLoading || !state) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Chargement…
      </div>
    )
  }

  const handleReset = () => {
    if (
      !window.confirm(`Réinitialiser l'arbre ? Coût : ${state.resetCost} dust`)
    ) {
      return
    }
    reset.mutate()
  }

  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col"
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
                  onClick={handleReset}
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
      <div
        className="border-t"
        style={{ borderColor: 'rgba(27,23,38,.08)' }}
      >
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
    </div>
  )
}
