import { createFileRoute, Link } from '@tanstack/react-router'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap = Icons as unknown as Record<string, LucideIcon>
import { SkillTreeCanvas } from '../../components/skill-tree/index.ts'
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
      {/* Header */}
      <div
        className="flex items-end justify-between gap-4 border-b px-6 py-4"
        style={{ borderColor: 'rgba(27,23,38,.08)' }}
      >
        <div className="min-w-0">
          <nav
            aria-label="Fil d'Ariane"
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
          >
            <Link
              to="/play"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors"
              style={{ color: 'rgba(27,23,38,.5)' }}
            >
              GACHAPON
            </Link>
            <span
              className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: 'rgba(27,23,38,.3)' }}
              aria-hidden
            >
              /
            </span>
            <span
              className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: 'rgba(27,23,38,.5)' }}
              aria-current="page"
            >
              COMPÉTENCES
            </span>
          </nav>
          <h1
            className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] sm:text-[36px]"
            style={{ color: '#1b1726' }}
          >
            Arbre de compétences
          </h1>
        </div>
        <div className="flex items-center gap-4 shrink-0">
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
            points disponibles
          </span>
          {state.totalInvested > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={reset.isPending}
              className="rounded border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition disabled:opacity-50"
              style={{
                borderColor: '#ef4444',
                color: '#ef4444',
                background: 'rgba(239,68,68,0.06)',
              }}
            >
              Reset · {state.resetCost} dust
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <SkillTreeCanvas
          state={state}
          onInvest={(nodeId) => invest.mutate(nodeId)}
        />
      </div>

      {/* Légende */}
      <div
        className="flex gap-6 border-t px-6 py-2"
        style={{ borderColor: 'rgba(27,23,38,.08)' }}
      >
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
  )
}
