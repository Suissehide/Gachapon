import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LeaderRow } from '../../components/leaderboard/LeaderRow'
import { ScopeCard } from '../../components/leaderboard/ScopeCard'
import { YouBar } from '../../components/leaderboard/YouBar'
import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import { Button } from '../../components/ui/button.tsx'
import { Pagination } from '../../components/ui/pagination.tsx'
import type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  TeamEntry,
} from '../../constants/leaderboard.constant'
import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
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

/** Où se situe la page affichée dans le classement complet. */
function pageWindow(
  data: LeaderboardResponse<unknown> | undefined,
  page: number,
  myRank: number | null | undefined,
) {
  const totalCount = data?.totalCount ?? 0
  const pageSize = data?.pageSize ?? 1
  const rangeFrom = (page - 1) * pageSize + 1
  const rangeTo = rangeFrom + (data?.entries.length ?? 0) - 1
  return {
    totalCount,
    pageCount: Math.ceil(totalCount / pageSize),
    rangeFrom,
    rangeTo,
    // « 11–20 sur 47 » seulement quand il y a vraiment plusieurs pages ;
    // sinon « 7 collectionneurs » dit déjà tout.
    showRange: totalCount > pageSize && rangeTo >= rangeFrom,
    myPage: myRank ? Math.ceil(myRank / pageSize) : null,
  }
}

function LeaderboardPage() {
  const { t } = useTranslation('leaderboard')
  const locale = currentLocale()
  const [activeTab, setActiveTab] = useState<Tab>('collectors')
  const tabTitle = (mode: Tab) => t(TAB_TITLE_KEY[mode])
  const countLabelFor = (mode: Tab, count: number) =>
    t(COUNT_LABEL_KEY[mode], { count })
  const me = useAuthStore((s) => s.user)
  // Les cartes du haut (leader, ma position) lisent TOUJOURS la page 1 :
  // le leader, c'est la première ligne de la première page, pas de celle
  // qu'on feuillette. La liste, elle, suit la page de son onglet — et
  // partage le cache de la page 1 tant qu'on n'a pas bougé.
  const collectorsQ = useCollectorsLeaderboard()
  const teamsQ = useTeamsLeaderboard()
  const combatQ = useCombatLeaderboard()
  const [pages, setPages] = useState<Record<Tab, number>>({
    collectors: 1,
    teams: 1,
    combat: 1,
  })
  const setPage = (page: number) =>
    setPages((prev) => ({ ...prev, [activeTab]: page }))
  const collectorsPageQ = useCollectorsLeaderboard(pages.collectors)
  const teamsPageQ = useTeamsLeaderboard(pages.teams)
  const combatPageQ = useCombatLeaderboard(pages.combat)

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

  const activePageQ =
    activeTab === 'collectors'
      ? collectorsPageQ
      : activeTab === 'teams'
        ? teamsPageQ
        : combatPageQ
  const activeData = activePageQ.data as
    | LeaderboardResponse<unknown>
    | undefined
  const activeLoading = activePageQ.isLoading

  const page = pages[activeTab]
  // Mon rang vient de la carte « ma position » (page 1), qui le connaît
  // même quand je ne figure pas sur la page affichée.
  const { totalCount, pageCount, rangeFrom, rangeTo, showRange, myPage } =
    pageWindow(activeData, page, scopes[activeTab].mine?.rank)

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
        <span className="uppercase">
          {showRange
            ? t('page.entriesRangeHeader', {
                from: rangeFrom,
                to: rangeTo,
                total: totalCount,
                tabTitle: tabTitle(activeTab),
              })
            : t('page.entriesCountHeader', {
                count: totalCount,
                tabTitle: tabTitle(activeTab),
              })}
        </span>
        <span className="opacity-[0.55]">{t(HEAD_RIGHT_KEY[activeTab])}</span>
      </div>

      <div
        className={cn(
          'flex flex-col gap-[10px] transition-opacity',
          activePageQ.isPlaceholderData && 'opacity-60',
        )}
      >
        {activeLoading && !activeData && (
          <div className="flex h-32 items-center justify-center text-sm text-[rgba(27,23,38,0.5)]">
            {t('page.loading')}
          </div>
        )}
        {activeData?.totalCount === 0 && !activeLoading && (
          <div className="rounded-[16px] border border-[rgba(27,23,38,0.06)] bg-white p-10 text-center text-sm text-[rgba(27,23,38,0.5)]">
            {t('page.emptyState')}
          </div>
        )}

        {/* Split rendering by mode for type-safe LeaderRow (discriminated union) */}
        {activeTab === 'collectors' &&
          collectorsPageQ.data?.entries.map((e) => (
            <LeaderRow
              key={e.user.id}
              mode="collectors"
              entry={e}
              isMe={isMe(e)}
            />
          ))}
        {activeTab === 'teams' &&
          teamsPageQ.data?.entries.map((e) => (
            <LeaderRow key={e.team.id} mode="teams" entry={e} isMe={isMe(e)} />
          ))}
        {activeTab === 'combat' &&
          combatPageQ.data?.entries.map((e) => (
            <LeaderRow key={e.user.id} mode="combat" entry={e} isMe={isMe(e)} />
          ))}
      </div>

      <Pagination
        className="mt-5"
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        extra={
          myPage !== null &&
          myPage !== page && (
            <Button variant="pill" size="pill" onClick={() => setPage(myPage)}>
              {t('page.jumpToMe')}
            </Button>
          )
        }
      />

      {/* Split rendering by mode for type-safe YouBar (discriminated union).
          `currentUserEntry` n'est rempli que si je ne suis PAS sur la page
          affichée : la barre suit donc la page, pas seulement le top. */}
      {activeTab === 'collectors' && collectorsPageQ.data?.currentUserEntry && (
        <YouBar
          mode="collectors"
          entry={collectorsPageQ.data.currentUserEntry}
          entries={collectorsPageQ.data.entries}
          total={totalKnown(collectorsPageQ.data)}
        />
      )}
      {activeTab === 'teams' && teamsPageQ.data?.currentUserEntry && (
        <YouBar
          mode="teams"
          entry={teamsPageQ.data.currentUserEntry}
          entries={teamsPageQ.data.entries}
          total={totalKnown(teamsPageQ.data)}
        />
      )}
      {activeTab === 'combat' && combatPageQ.data?.currentUserEntry && (
        <YouBar
          mode="combat"
          entry={combatPageQ.data.currentUserEntry}
          entries={combatPageQ.data.entries}
          total={totalKnown(combatPageQ.data)}
        />
      )}
    </PageShell>
  )
}
