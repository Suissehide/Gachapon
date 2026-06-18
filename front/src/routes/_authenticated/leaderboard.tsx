import { createFileRoute, Link } from '@tanstack/react-router'
import { Trophy, Users } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '../../components/shared/PageHeader'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import type { CollectorEntry, TeamEntry } from '../../queries/useLeaderboard'
import { useLeaderboard } from '../../queries/useLeaderboard'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/leaderboard')({
  component: LeaderboardPage,
})

type Tab = 'collectors' | 'teams'

const TABS = [
  {
    value: 'collectors' as const,
    label: 'Collectionneurs',
    icon: <Trophy className="h-3.5 w-3.5" />,
  },
  {
    value: 'teams' as const,
    label: 'Équipes',
    icon: <Users className="h-3.5 w-3.5" />,
  },
]

const RANK_STYLES = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('collectors')
  const { data, isLoading } = useLeaderboard()
  const currentUser = useAuthStore((s) => s.user)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <PageHeader tag="Communauté" title="Classement" />

        <SegmentedControl
          options={TABS}
          value={activeTab}
          onChange={setActiveTab}
          stretch
          className="w-full"
        />

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {activeTab === 'collectors' &&
              (data?.collectors.length === 0 ? (
                <EmptyState />
              ) : (
                data?.collectors.map((entry) => (
                  <CollectorRow
                    key={entry.user.id}
                    entry={entry}
                    rankStyle={RANK_STYLES[entry.rank - 1] ?? 'text-text-light'}
                    isMe={currentUser?.id === entry.user.id}
                  />
                ))
              ))}

            {activeTab === 'teams' &&
              (data?.bestTeams.length === 0 ? (
                <EmptyState />
              ) : (
                data?.bestTeams.map((entry) => (
                  <TeamRow
                    key={entry.team.id}
                    entry={entry}
                    rankStyle={RANK_STYLES[entry.rank - 1] ?? 'text-text-light'}
                  />
                ))
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-32 items-center justify-center">
      <p className="text-sm text-text-light">Aucune donnée pour l'instant.</p>
    </div>
  )
}

function CollectorRow({
  entry,
  rankStyle,
  isMe,
}: {
  entry: CollectorEntry
  rankStyle: string
  isMe: boolean
}) {
  return (
    <div
      className={`flex items-center gap-4 border-b border-border px-4 py-3 last:border-0 ${isMe ? 'bg-primary/5' : ''}`}
    >
      <span className={`w-6 text-center text-sm font-black ${rankStyle}`}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
      </span>
      <Link
        to="/profile/$username"
        params={{ username: entry.user.username }}
        className="flex-1 text-sm font-semibold text-text transition-colors hover:text-primary"
      >
        @{entry.user.username}
        {isMe && <span className="ml-1 text-xs text-primary">(moi)</span>}
      </Link>
      <div className="text-right">
        <p className="text-xs text-text-light">
          Cartes : {entry.cardPercentage}% - Variantes :{' '}
          {entry.variantPercentage}%
        </p>
      </div>
    </div>
  )
}

function TeamRow({
  entry,
  rankStyle,
}: {
  entry: TeamEntry
  rankStyle: string
}) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
      <span className={`w-6 text-center text-sm font-black ${rankStyle}`}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
      </span>
      <div className="flex-1 text-sm font-semibold text-text">
        {entry.team.name}
        <span className="ml-1 text-xs font-normal text-text-light">
          {entry.team.memberCount} membres
        </span>
      </div>
      <p className="text-xs text-text-light">
        {entry.avgScore.toLocaleString()} pts
      </p>
    </div>
  )
}
