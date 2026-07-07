import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Gift, Star, Target, Trophy } from 'lucide-react'

import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import { Button } from '../../components/ui/button'
import {
  REWARD_TYPE_META,
  REWARD_TYPE_ORDER,
} from '../../constants/rewardTypes'
import type {
  QuestClaim,
  QuestEntry,
  WeeklyBonus,
} from '../../queries/useQuests'
import { useQuests } from '../../queries/useQuests'
import { useClaimReward } from '../../queries/useRewards'
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

  const weeklyDone = data?.weekly.filter((q) => q.completed).length ?? 0
  const oneshotDone = data?.oneshot.filter((q) => q.completed).length ?? 0

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
        <div className="flex flex-col gap-6">
          {/* ── Hebdomadaires ── */}
          <QuestSection
            icon={<Target className="h-4 w-4" />}
            hue={210}
            title="Hebdomadaires"
            count={`${weeklyDone} / ${data.weekly.length}`}
          >
            {data.weekly.length === 0 ? (
              <EmptySlate label="Aucune quête hebdomadaire disponible." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.weekly.map((q) => (
                  <WeeklyQuestCard key={q.key} quest={q} />
                ))}
              </div>
            )}
          </QuestSection>

          {/* ── Bonus semaine parfaite ── */}
          <QuestSection
            icon={<Trophy className="h-4 w-4" />}
            hue={45}
            title="Bonus semaine parfaite"
          >
            <WeeklyBonusCard bonus={data.weeklyBonus} />
          </QuestSection>

          {/* ── One-shot ── */}
          {data.oneshot.length > 0 && (
            <QuestSection
              icon={<Star className="h-4 w-4" />}
              hue={265}
              title="One-shot"
              count={`${oneshotDone} / ${data.oneshot.length}`}
            >
              <div className="flex flex-col gap-2.5">
                {data.oneshot.map((q) => (
                  <OneshotQuestRow key={q.key} quest={q} />
                ))}
              </div>
            </QuestSection>
          )}
        </div>
      ) : null}
    </PageShell>
  )
}

// ─── White card section (encart) ─────────────────────────────────────────────

function QuestSection({
  icon,
  hue,
  title,
  count,
  children,
}: {
  icon: React.ReactNode
  hue: number
  title: string
  count?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-[22px] border p-[22px_22px_24px] sm:p-[26px_28px_28px]"
      style={{
        background: '#fff',
        borderColor: 'rgba(27,23,38,.06)',
        boxShadow:
          '0 2px 0 rgba(27,23,38,.03), 0 16px 36px -20px rgba(27,23,38,.12)',
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border"
            style={{
              background: `hsl(${hue}, 70%, 95%)`,
              borderColor: `hsl(${hue}, 60%, 84%)`,
              color: `hsl(${hue}, 65%, 42%)`,
            }}
          >
            {icon}
          </span>
          <h2
            className="font-display text-[20px] font-extrabold tracking-tight sm:text-[22px]"
            style={{ color: '#1b1726' }}
          >
            {title}
          </h2>
        </div>
        {count && (
          <span
            className="font-mono text-[11px] uppercase tracking-[0.15em]"
            style={{ color: 'rgba(27,23,38,.45)' }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptySlate({ label }: { label: string }) {
  return (
    <div
      className="rounded-[16px] border border-dashed px-6 py-10 text-center"
      style={{ borderColor: 'rgba(27,23,38,.12)', background: '#fafaf7' }}
    >
      <p className="font-body text-sm" style={{ color: 'rgba(27,23,38,.45)' }}>
        {label}
      </p>
    </div>
  )
}

// ─── Progress bar (constant full width) ───────────────────────────────────────

function ProgressBar({
  progress,
  target,
}: {
  progress: number
  target: number
}) {
  const pct =
    target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0
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

// ─── Reward chips (color-coded per type) ──────────────────────────────────────

type RewardLike = {
  tokens?: number
  dust?: number
  xp?: number
  gold?: number
} | null

function RewardChips({ reward }: { reward: RewardLike }) {
  if (!reward) {
    return null
  }
  const chips = REWARD_TYPE_ORDER.flatMap((type) => {
    const value = reward[type] ?? 0
    if (value <= 0) {
      return []
    }
    const meta = REWARD_TYPE_META[type]
    return [{ type, value, meta }]
  })

  if (chips.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ type, value, meta }) => {
        const Icon = meta.icon
        return (
          <span
            key={type}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold"
            style={{
              background: `${meta.color}14`,
              borderColor: `${meta.color}33`,
              color: meta.color,
            }}
          >
            <Icon className="h-3 w-3" />+{value}{' '}
            {value > 1 ? meta.labelPlural : meta.label}
          </span>
        )
      })}
    </div>
  )
}

// ─── Claim action (button / claimed badge) ────────────────────────────────────

function ClaimAction({ claim }: { claim: QuestClaim | null }) {
  const claimReward = useClaimReward()
  if (!claim) {
    return null
  }
  if (claim.claimed) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(34,197,94,.14)', color: '#16a34a' }}
      >
        <CheckCircle2 className="h-3 w-3" />
        Récupéré
      </span>
    )
  }
  return (
    <Button
      size="sm"
      className="shrink-0 gap-1"
      onClick={() => claimReward.mutate(claim.rewardId)}
      disabled={claimReward.isPending}
    >
      {claimReward.isPending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <>
          <Gift className="h-3.5 w-3.5" />
          Réclamer
        </>
      )}
    </Button>
  )
}

// ─── Weekly quest card ────────────────────────────────────────────────────────

function WeeklyQuestCard({ quest }: { quest: QuestEntry }) {
  const { name, description, progress, target, completed, reward, claim } =
    quest
  return (
    <div
      className="flex flex-col gap-3 rounded-[16px] border p-4"
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

      {/* Progress (dedicated full-width row) */}
      <div className="flex flex-col gap-1">
        <ProgressBar progress={progress} target={target} />
        <div
          className="font-mono text-[10px] font-bold tabular-nums"
          style={{ color: 'rgba(27,23,38,.4)' }}
        >
          {progress} / {target}
        </div>
      </div>

      {/* Footer: rewards + action, pinned to the bottom for even card heights */}
      <div className="mt-auto flex items-end justify-between gap-2 pt-1">
        <RewardChips reward={reward} />
        <ClaimAction claim={claim} />
      </div>
    </div>
  )
}

// ─── Weekly bonus card ────────────────────────────────────────────────────────

function WeeklyBonusCard({ bonus }: { bonus: WeeklyBonus }) {
  const { completed, reward, claim } = bonus
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border px-5 py-4"
      style={{
        background: completed ? 'rgba(34,197,94,.05)' : '#fafaf7',
        borderColor: completed ? 'rgba(34,197,94,.3)' : 'rgba(27,23,38,.1)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: completed
              ? 'rgba(34,197,94,.15)'
              : 'rgba(27,23,38,.06)',
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

      <div className="flex items-center gap-3">
        <RewardChips reward={reward} />
        <ClaimAction claim={claim} />
      </div>
    </div>
  )
}

// ─── One-shot quest row ───────────────────────────────────────────────────────

function OneshotQuestRow({ quest }: { quest: QuestEntry }) {
  const { name, description, progress, target, completed, reward, claim } =
    quest
  return (
    <div
      className="flex gap-4 rounded-[14px] border px-4 py-3.5"
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

      {/* Content column — progress bar spans its full width */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
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
          </div>
          <ClaimAction claim={claim} />
        </div>

        <ProgressBar progress={progress} target={target} />

        <RewardChips reward={reward} />
      </div>
    </div>
  )
}
