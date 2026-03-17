import { createFileRoute } from '@tanstack/react-router'
import { Sparkles, Target, Zap } from 'lucide-react'

import type { Quest } from '../../queries/useLeaderboard'
import { useQuests } from '../../queries/useLeaderboard'

export const Route = createFileRoute('/_authenticated/quests')({
  component: QuestsPage,
})

function QuestsPage() {
  const { data, isLoading } = useQuests()
  const quests = data?.quests ?? []

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-text">Quêtes</h1>
          <p className="text-sm text-text-light">
            Quêtes quotidiennes — se réinitialisent à minuit UTC
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : quests.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
            <Target className="h-10 w-10 text-text-light" />
            <p className="text-text-light">
              Aucune quête disponible pour l'instant.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-text">{quest.name}</h3>
          <p className="mt-0.5 text-xs text-text-light">{quest.description}</p>
          <div className="mt-2 flex items-center gap-3">
            {quest.rewardTokens > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Zap className="h-3 w-3" />+{quest.rewardTokens} token
                {quest.rewardTokens !== 1 ? 's' : ''}
              </span>
            )}
            {quest.rewardDust > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
                <Sparkles className="h-3 w-3" />+{quest.rewardDust} dust
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
