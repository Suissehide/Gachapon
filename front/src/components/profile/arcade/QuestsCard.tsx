import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  ChevronRight,
  Gift,
  HelpCircle,
  Target,
} from 'lucide-react'

import type { QuestEntry } from '../../../queries/useQuests'
import { useQuests } from '../../../queries/useQuests'
import { Card, CardTitle } from '../../ui/card'

const VISIBLE_COUNT = 4

/**
 * Preview order: quests in progress first (closest to done), then untouched,
 * then already completed — mirrors the achievements highlight logic.
 */
function pickHighlights(quests: QuestEntry[]): QuestEntry[] {
  const inProgress = quests
    .filter((q) => !q.completed && q.progress > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)

  const untouched = quests
    .filter((q) => !q.completed && q.progress === 0)
    .sort((a, b) => a.target - b.target)

  const completed = quests.filter((q) => q.completed)

  return [...inProgress, ...untouched, ...completed].slice(0, VISIBLE_COUNT)
}

function HighlightRow({ quest }: { quest: QuestEntry }) {
  const pct = Math.min(
    100,
    Math.round((quest.progress / Math.max(1, quest.target)) * 100),
  )
  const claimable = quest.claim !== null && !quest.claim.claimed

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{
          background: quest.completed
            ? 'linear-gradient(135deg, #4ade80, #22c55e)'
            : 'var(--muted)',
          boxShadow: quest.completed
            ? '0 0 12px rgba(34, 197, 94, 0.35)'
            : undefined,
        }}
      >
        {quest.completed ? (
          <CheckCircle2 className="h-4 w-4 text-white" />
        ) : (
          <Target className="h-4 w-4 text-text-light/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-display text-sm font-bold text-text">
            {quest.name}
          </span>
          {claimable && <Gift className="h-3.5 w-3.5 shrink-0 text-primary" />}
        </div>
        <div className="line-clamp-2 font-body text-[11px] leading-snug text-text-light">
          {quest.description}
        </div>
        {!quest.completed && (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-text-light">
              {quest.progress} / {quest.target}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyHint() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/30 px-4 py-6">
      <HelpCircle className="h-5 w-5 text-text-light/40" />
      <div>
        <div className="font-display text-sm font-bold text-text-light">
          Aucune quête en cours
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-text-light/60">
          Reviens lundi pour de nouvelles quêtes
        </div>
      </div>
    </div>
  )
}

export function QuestsCard() {
  const { data, isLoading } = useQuests()

  const weekly = data?.weekly ?? []
  const oneshot = data?.oneshot ?? []
  const all = [...weekly, ...oneshot]
  const total = weekly.length
  const done = weekly.filter((q) => q.completed).length
  const highlights = pickHighlights(all)

  return (
    <Card className="p-6">
      <Link
        to="/quests"
        className="group -m-2 mb-3 flex items-baseline justify-between rounded-xl p-2 transition-colors hover:bg-muted/30"
      >
        <CardTitle className="text-sm uppercase tracking-wider">
          Quêtes
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-text-light">
            {done} / {total} <span className="hidden sm:inline">HEBDO</span>
          </span>
          <ChevronRight
            size={16}
            className="text-text-light transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Link>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={i}
              className="h-[58px] animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <EmptyHint />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {highlights.map((q) => (
            <HighlightRow key={q.key} quest={q} />
          ))}
        </div>
      )}
    </Card>
  )
}
