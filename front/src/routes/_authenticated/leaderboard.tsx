import { createFileRoute, Link } from '@tanstack/react-router'
import { Star, Trophy, Users } from 'lucide-react'
import { useState } from 'react'

import type {
  CollectorEntry,
  LegendaryEntry,
  TeamEntry,
} from '../../queries/useLeaderboard'
import { useLeaderboard } from '../../queries/useLeaderboard'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/leaderboard')({
  component: LeaderboardPage,
})

type Tab = 'collectors' | 'legendaries' | 'teams'

const TABS = [
  { value: 'collectors' as const, label: 'Collectionneurs', icon: <Trophy className="h-3.5 w-3.5" /> },
  { value: 'legendaries' as const, label: 'Légendaires', icon: <Star className="h-3.5 w-3.5" /> },
  { value: 'teams' as const, label: 'Équipes', icon: <Users className="h-3.5 w-3.5" /> },
]

const RANK_STYLES = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('collectors')
  const { data, isLoading } = useLeaderboard()
  const currentUser = useAuthStore((s) => s.user)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-black text-text">Classement</h1>

        <SegmentedControl
          options={TABS}
          value={activeTab}
          onChange={setActiveTab}
          stretch
          className="mb-6 w-full"
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

            {activeTab === 'legendaries' &&
              (data?.legendaries.length === 0 ? (
                <EmptyState />
              ) : (
                data?.legendaries.map((entry) => (
                  <LegendaryRow
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
        <p className="text-sm font-bold text-text">{entry.percentage}%</p>
        <p className="text-xs text-text-light">{entry.ownedCards} cartes</p>
      </div>
    </div>
  )
}

function LegendaryRow({
  entry,
  rankStyle,
  isMe,
}: {
  entry: LegendaryEntry
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
      <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
        <Star className="h-3.5 w-3.5" />
        {entry.legendaryCount}
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
      <p className="text-sm font-bold text-text">{entry.avgPercentage}%</p>
    </div>
  )
}
