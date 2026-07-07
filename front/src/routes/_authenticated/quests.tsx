import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Coins, Sparkles, Star, Target, Trophy, Zap } from 'lucide-react'

import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import type { QuestEntry, WeeklyBonus } from '../../queries/useQuests'
import { useQuests } from '../../queries/useQuests'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/quests')({
  component: QuestsPage,
})

// Compute the date of the next Monday in UTC (e.g. "lundi 13 juillet").
// If today is already Monday, the next reset is one week away.
function getNextMondayUTC(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sunday … 6=Saturday
  const daysUntil = day === 1 ? 7 : (8 - day) % 7
  const next = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntil)
  next.setUTCHours(0, 0, 0, 0)
  return next.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

function QuestsPage() {
  const { data, isLoading } = useQuests()
  const username = useAuthStore((s) => s.user?.username ?? '')
  const nextMonday = getNextMondayUTC()

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Profil', to: '/profile/$username', params: { username } },
          { label: 'Quêtes' },
        ]}
        title="Quêtes"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span>Nouvelles quêtes le</span>
            <span className="font-semibold text-text">{nextMonday}</span>
          </span>
        }
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : data ? (
        <div className="flex flex-col gap-8">
          {/* ── Hebdomadaires ── */}
          <section>
            <SectionLabel icon={<Target className="h-4 w-4" />} label="Hebdomadaires" />
            {data.weekly.length === 0 ? (
              <EmptySlate label="Aucune quête hebdomadaire disponible." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.weekly.map((q) => (
                  <WeeklyQuestCard key={q.key} quest={q} />
                ))}
              </div>
            )}
          </section>

          {/* ── Bonus semaine parfaite ── */}
          <section>
            <SectionLabel icon={<Trophy className="h-4 w-4" />} label="Bonus semaine parfaite" />
            <div className="mt-3">
              <WeeklyBonusCard bonus={data.weeklyBonus} />
            </div>
          </section>

          {/* ── One-shot ── */}
          {data.oneshot.length > 0 && (
            <section>
              <SectionLabel icon={<Star className="h-4 w-4" />} label="One-shot" />
              <div className="mt-3 flex flex-col gap-2">
                {data.oneshot.map((q) => (
                  <OneshotQuestRow key={q.key} quest={q} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </PageShell>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'rgba(27,23,38,.4)' }}>{icon}</span>
      <span
        className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
        style={{ color: 'rgba(27,23,38,.5)' }}
      >
        {label}
      </span>
      <div
        className="h-px flex-1"
        style={{ background: 'rgba(27,23,38,.08)' }}
      />
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptySlate({ label }: { label: string }) {
  return (
    <div
      className="mt-3 rounded-[18px] border border-dashed px-6 py-10 text-center"
      style={{ borderColor: 'rgba(27,23,38,.12)', background: '#fff' }}
    >
      <p
        className="font-body text-sm"
        style={{ color: 'rgba(27,23,38,.45)' }}
      >
        {label}
      </p>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, target }: { progress: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0
  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: 'rgba(27,23,38,.08)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: pct >= 100 ? '#22c55e' : 'var(--color-primary)',
        }}
      />
    </div>
  )
}

// ─── Reward chips ─────────────────────────────────────────────────────────────

type RewardLike = { tokens?: number; dust?: number; xp?: number; gold?: number } | null

function RewardChips({ reward }: { reward: RewardLike }) {
  if (!reward) {
    return null
  }
  const chips: { icon: React.ReactNode; value: number; label: string }[] = []
  if (reward.tokens && reward.tokens > 0) {
    chips.push({ icon: <Zap className="h-3 w-3" />, value: reward.tokens, label: 'jeton' })
  }
  if (reward.dust && reward.dust > 0) {
    chips.push({ icon: <Sparkles className="h-3 w-3" />, value: reward.dust, label: 'poussière' })
  }
  if (reward.xp && reward.xp > 0) {
    chips.push({ icon: <Star className="h-3 w-3" />, value: reward.xp, label: 'XP' })
  }
  if (reward.gold && reward.gold > 0) {
    chips.push({ icon: <Coins className="h-3 w-3" />, value: reward.gold, label: 'or' })
  }

  if (chips.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ icon, value, label }) => (
        <span
          key={label}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
          style={{ background: 'rgba(27,23,38,.06)', color: 'rgba(27,23,38,.65)' }}
        >
          {icon}+{value} {label}{value > 1 && label === 'jeton' ? 's' : ''}
        </span>
      ))}
    </div>
  )
}

// ─── Weekly quest card ────────────────────────────────────────────────────────

function WeeklyQuestCard({ quest }: { quest: QuestEntry }) {
  const { name, description, progress, target, completed, reward } = quest
  return (
    <div
      className="flex flex-col gap-3 rounded-[18px] border p-4 transition-shadow"
      style={{
        background: '#fff',
        borderColor: completed ? 'rgba(34,197,94,.3)' : 'rgba(27,23,38,.1)',
        boxShadow: completed ? '0 0 0 1px rgba(34,197,94,.15)' : undefined,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="font-display text-[15px] font-bold leading-snug"
            style={{ color: '#1b1726' }}
          >
            {name}
          </h3>
          <p
            className="mt-0.5 font-body text-xs leading-snug"
            style={{ color: 'rgba(27,23,38,.5)' }}
          >
            {description}
          </p>
        </div>
        {completed && (
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: '#22c55e' }}
          />
        )}
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1">
        <ProgressBar progress={progress} target={target} />
        <div
          className="font-mono text-[10px] font-bold tabular-nums"
          style={{ color: 'rgba(27,23,38,.4)' }}
        >
          {progress} / {target}
        </div>
      </div>

      {/* Reward */}
      <RewardChips reward={reward} />
    </div>
  )
}

// ─── Weekly bonus card ────────────────────────────────────────────────────────

function WeeklyBonusCard({ bonus }: { bonus: WeeklyBonus }) {
  const { completed, reward } = bonus
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border px-5 py-4"
      style={{
        background: completed ? 'rgba(34,197,94,.05)' : '#fff',
        borderColor: completed ? 'rgba(34,197,94,.3)' : 'rgba(27,23,38,.1)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: completed ? 'rgba(34,197,94,.15)' : 'rgba(27,23,38,.06)',
          }}
        >
          <Trophy
            className="h-5 w-5"
            style={{ color: completed ? '#22c55e' : 'rgba(27,23,38,.4)' }}
          />
        </div>
        <div>
          <p
            className="font-display text-[15px] font-bold"
            style={{ color: '#1b1726' }}
          >
            Semaine parfaite
          </p>
          <p
            className="font-body text-xs"
            style={{ color: 'rgba(27,23,38,.5)' }}
          >
            {completed
              ? 'Toutes les quêtes hebdomadaires complétées !'
              : 'Complète toutes les quêtes hebdomadaires pour débloquer le bonus.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        {completed && (
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(34,197,94,.15)', color: '#16a34a' }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Obtenu
          </span>
        )}
        <RewardChips reward={reward} />
      </div>
    </div>
  )
}

// ─── One-shot quest row ───────────────────────────────────────────────────────

function OneshotQuestRow({ quest }: { quest: QuestEntry }) {
  const { name, description, progress, target, completed, reward } = quest
  return (
    <div
      className="flex items-center gap-4 rounded-[14px] border px-4 py-3"
      style={{
        background: '#fff',
        borderColor: completed ? 'rgba(34,197,94,.25)' : 'rgba(27,23,38,.1)',
      }}
    >
      {/* Icon */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: completed ? 'rgba(34,197,94,.12)' : 'rgba(27,23,38,.06)',
        }}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: '#22c55e' }} />
        ) : (
          <Target className="h-4 w-4" style={{ color: 'rgba(27,23,38,.4)' }} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-[14px] font-bold"
            style={{ color: '#1b1726' }}
          >
            {name}
          </span>
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'rgba(27,23,38,.35)' }}
          >
            {progress}/{target}
          </span>
        </div>
        <p
          className="mt-0.5 truncate font-body text-xs"
          style={{ color: 'rgba(27,23,38,.5)' }}
        >
          {description}
        </p>
        <div className="mt-1.5">
          <ProgressBar progress={progress} target={target} />
        </div>
      </div>

      {/* Reward */}
      <div className="shrink-0">
        <RewardChips reward={reward} />
      </div>
    </div>
  )
}
