import { createFileRoute } from '@tanstack/react-router'
import { Gem, Sparkles, Zap } from 'lucide-react'
import { SkillTreeCanvas } from '../../components/skill-tree/SkillTreeCanvas.tsx'
import { useInvestSkill, useResetSkills, useSkillTree } from '../../queries/useSkills.ts'

export const Route = createFileRoute('/_authenticated/skills')({
  component: SkillsPage,
})

function SkillsPage() {
  const { data: state, isLoading } = useSkillTree()
  const invest = useInvestSkill()
  const reset = useResetSkills()

  if (isLoading || !state) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Chargement…</div>
  }

  const handleReset = () => {
    if (!window.confirm(`Réinitialiser l'arbre ? Coût : ${state.resetCost} dust`)) return
    reset.mutate()
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <h1 className="text-lg font-bold">Arbre de compétences</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-purple-400">
            <span className="font-bold">{state.skillPoints}</span> points disponibles
          </span>
          {state.totalInvested > 0 && (
            <button
              onClick={handleReset}
              disabled={reset.isPending}
              className="rounded border border-red-500 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
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
      <div className="flex gap-6 border-t border-gray-800 px-6 py-2">
        {state.branches.map((b) => {
          const IconMap: Record<string, React.FC<any>> = { Zap, Sparkles, Gem }
          const Icon = IconMap[b.icon] ?? Zap
          return (
            <div key={b.id} className="flex items-center gap-1.5 text-xs text-gray-400">
              <Icon size={12} style={{ color: b.color }} />
              <span>{b.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
