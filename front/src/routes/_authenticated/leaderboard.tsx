import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LeaderRow } from '../../components/leaderboard/LeaderRow'
import { ScopeCard } from '../../components/leaderboard/ScopeCard'
import { YouBar } from '../../components/leaderboard/YouBar'
import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  TeamEntry,
} from '../../constants/leaderboard.constant'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import {
  useCollectorsLeaderboard,
  useCombatLeaderboard,
  useTeamsLeaderboard,
} from '../../queries/useLeaderboard'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/leaderboard')({
  component: LeaderboardPage,
})

type Tab = 'collectors' | 'teams' | 'combat'

const HEAD_RIGHT_KEY: Record<Tab, string> = {
  collectors: 'page.headRightCollectors',
  teams: 'page.headRightTeams',
  combat: 'page.headRightCombat',
}

const COUNT_LABEL_KEY: Record<Tab, string> = {
  collectors: 'page.rankedPlayersCount',
  teams: 'page.rankedTeamsCount',
  combat: 'page.rankedCombatantsCount',
}

const TAB_TITLE_KEY: Record<Tab, string> = {
  collectors: 'page.tabTitleCollectors',
  teams: 'page.tabTitleTeams',
  combat: 'page.tabTitleCombat',
}

function totalKnown<E>(data: LeaderboardResponse<E> | undefined): number {
  return data?.totalCount ?? 0
}

function LeaderboardPage() {
  const { t } = useTranslation('leaderboard')
  const locale = currentLocale()
  const [activeTab, setActiveTab] = useState<Tab>('collectors')
  const tabTitle = (mode: Tab) => t(TAB_TITLE_KEY[mode])
  const countLabelFor = (mode: Tab, count: number) =>
    t(COUNT_LABEL_KEY[mode], { count })
  const me = useAuthStore((s) => s.user)
  const collectorsQ = useCollectorsLeaderboard()
  const teamsQ = useTeamsLeaderboard()
  const combatQ = useCombatLeaderboard()

  const scopes = useMemo(
    () => ({
      collectors: {
        data: collectorsQ.data,
        loading: collectorsQ.isLoading,
        leader: collectorsQ.data?.entries[0]
          ? {
              name: collectorsQ.data.entries[0].user.username,
              metric: t('page.leaderMetricCollection', {
                pct: collectorsQ.data.entries[0].cardPercentage,
              }),
            }
          : null,
        mine: collectorsQ.data
          ? {
              rank:
                collectorsQ.data.currentUserEntry?.rank ??
                collectorsQ.data.entries.find((e) => e.user.id === me?.id)
                  ?.rank ??
                null,
              sub: (() => {
                const e =
                  collectorsQ.data?.currentUserEntry ??
                  collectorsQ.data?.entries.find((x) => x.user.id === me?.id)
                if (!e) {
                  return t('page.noRankYetCollectors')
                }
                return t('page.mineSubCollectors', {
                  total: totalKnown(collectorsQ.data),
                  pct: e.cardPercentage,
                })
              })(),
            }
          : null,
      },
      teams: {
        data: teamsQ.data,
        loading: teamsQ.isLoading,
        leader: teamsQ.data?.entries[0]
          ? {
              name: teamsQ.data.entries[0].team.name,
              metric: t('page.leaderMetricCollection', {
                pct: teamsQ.data.entries[0].cardPercentage,
              }),
            }
          : null,
        mine: teamsQ.data
          ? (() => {
              const myTeamId = teamsQ.data?.currentUserTeamId ?? null
              const inTop = myTeamId
                ? teamsQ.data?.entries.find((e) => e.team.id === myTeamId)
                : undefined
              const mineEntry = inTop ?? teamsQ.data?.currentUserEntry
              return {
                rank: mineEntry?.rank ?? null,
                sub: mineEntry
                  ? t('page.mineSubTeams', {
                      teamName: mineEntry.team.name,
                      count: mineEntry.team.memberCount,
                    })
                  : t('page.noTeamYet'),
              }
            })()
          : null,
      },
      combat: {
        data: combatQ.data,
        loading: combatQ.isLoading,
        leader: combatQ.data?.entries[0]
          ? {
              name: combatQ.data.entries[0].user.username,
              metric: t('page.leaderMetricCombat', {
                palier: combatQ.data.entries[0].palier,
                power: formatNumber(
                  combatQ.data.entries[0].combatPower,
                  locale,
                ),
              }),
            }
          : null,
        mine: combatQ.data
          ? (() => {
              const e =
                combatQ.data?.currentUserEntry ??
                combatQ.data?.entries.find((x) => x.user.id === me?.id)
              return {
                rank: e?.rank ?? null,
                sub: e
                  ? t('page.mineSubCombat', {
                      palier: e.palier,
                      power: formatNumber(e.combatPower, locale),
                    })
                  : t('page.noRankYetCombat'),
              }
            })()
          : null,
      },
    }),
    [
      collectorsQ.data,
      collectorsQ.isLoading,
      teamsQ.data,
      teamsQ.isLoading,
      combatQ.data,
      combatQ.isLoading,
      me?.id,
      locale,
      t,
    ],
  )

  const activeData =
    activeTab === 'collectors'
      ? collectorsQ.data
      : activeTab === 'teams'
        ? teamsQ.data
        : combatQ.data
  const activeLoading =
    activeTab === 'collectors'
      ? collectorsQ.isLoading
      : activeTab === 'teams'
        ? teamsQ.isLoading
        : combatQ.isLoading

  const isMe = (entry: CollectorEntry | TeamEntry | CombatEntry) => {
    if (!me) {
      return false
    }
    if ('team' in entry) {
      return entry.team.id === teamsQ.data?.currentUserTeamId
    }
    return entry.user.id === me.id
  }

  return (
    <PageShell>
      <PageHeader title={t('page.title')} eyebrow={t('page.eyebrow')} />

      <div
        role="tablist"
        aria-label={t('page.tabsAriaLabel')}
        className="grid grid-cols-1 gap-[14px] md:grid-cols-3"
        onKeyDown={(ev) => {
          if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') {
            return
          }
          const order: Tab[] = ['collectors', 'teams', 'combat']
          const i = order.indexOf(activeTab)
          const next =
            ev.key === 'ArrowRight'
              ? order[(i + 1) % order.length]
              : order[(i - 1 + order.length) % order.length]
          setActiveTab(next)
          ev.preventDefault()
          // Move focus to the newly active tab button for screen-reader users.
          const target = (
            ev.currentTarget as HTMLElement
          ).querySelectorAll<HTMLButtonElement>('[role="tab"]')[
            order.indexOf(next)
          ]
          target?.focus()
        }}
      >
        {(['collectors', 'teams', 'combat'] as const).map((mode) => {
          const s = scopes[mode]
          return (
            <ScopeCard
              key={mode}
              mode={mode}
              active={activeTab === mode}
              onSelect={() => setActiveTab(mode)}
              title={tabTitle(mode)}
              count={
                s.data ? totalKnown(s.data as LeaderboardResponse<unknown>) : 0
              }
              countLabel={countLabelFor(
                mode,
                s.data ? totalKnown(s.data as LeaderboardResponse<unknown>) : 0,
              )}
              leaderName={s.leader?.name ?? null}
              leaderMetric={s.leader?.metric ?? null}
              mineRank={s.mine?.rank ?? null}
              mineSub={s.mine?.sub ?? ''}
              mineIsTop={s.mine?.rank === 1}
              isLoading={s.loading || !s.data}
            />
          )
        })}
      </div>

      <div className="mx-1 mt-[26px] mb-3 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-[rgba(27,23,38,0.55)]">
        <span>
          {t('page.entriesCountHeader', {
            count: activeData?.entries.length ?? 0,
            tabTitle: tabTitle(activeTab).toUpperCase(),
          })}
        </span>
        <span className="opacity-[0.55]">{t(HEAD_RIGHT_KEY[activeTab])}</span>
      </div>

      <div className="flex flex-col gap-[10px]">
        {activeLoading && !activeData && (
          <div className="flex h-32 items-center justify-center text-sm text-[rgba(27,23,38,0.5)]">
            {t('page.loading')}
          </div>
        )}
        {activeData?.entries.length === 0 && !activeLoading && (
          <div className="rounded-[16px] border border-[rgba(27,23,38,0.06)] bg-white p-10 text-center text-sm text-[rgba(27,23,38,0.5)]">
            {t('page.emptyState')}
          </div>
        )}

        {/* Split rendering by mode for type-safe LeaderRow (discriminated union) */}
        {activeTab === 'collectors' &&
          collectorsQ.data?.entries.map((e) => (
            <LeaderRow
              key={e.user.id}
              mode="collectors"
              entry={e}
              isMe={isMe(e)}
            />
          ))}
        {activeTab === 'teams' &&
          teamsQ.data?.entries.map((e) => (
            <LeaderRow key={e.team.id} mode="teams" entry={e} isMe={isMe(e)} />
          ))}
        {activeTab === 'combat' &&
          combatQ.data?.entries.map((e) => (
            <LeaderRow key={e.user.id} mode="combat" entry={e} isMe={isMe(e)} />
          ))}
      </div>

      {/* Split rendering by mode for type-safe YouBar (discriminated union) */}
      {activeTab === 'collectors' && collectorsQ.data?.currentUserEntry && (
        <YouBar
          mode="collectors"
          entry={collectorsQ.data.currentUserEntry}
          entries={collectorsQ.data.entries}
          total={totalKnown(collectorsQ.data)}
        />
      )}
      {activeTab === 'teams' && teamsQ.data?.currentUserEntry && (
        <YouBar
          mode="teams"
          entry={teamsQ.data.currentUserEntry}
          entries={teamsQ.data.entries}
          total={totalKnown(teamsQ.data)}
        />
      )}
      {activeTab === 'combat' && combatQ.data?.currentUserEntry && (
        <YouBar
          mode="combat"
          entry={combatQ.data.currentUserEntry}
          entries={combatQ.data.entries}
          total={totalKnown(combatQ.data)}
        />
      )}
    </PageShell>
  )
}
