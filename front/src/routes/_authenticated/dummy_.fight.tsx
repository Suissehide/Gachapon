import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, RotateCcw, Target } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BattleScene } from '../../components/battle/BattleScene.tsx'
import {
  RESULT_BADGE_WIN,
  ResultBadge,
  ResultPanel,
} from '../../components/battle/resultKit.tsx'
import { ArcadeCard } from '../../components/shared/ArcadeCard.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Popup, PopupContent } from '../../components/ui/popup.tsx'
import { dummySearchSchema } from '../../constants/dummy.constant.ts'
import { currentLocale } from '../../i18n/index.ts'
import { isApiError } from '../../libs/httpErrorHandler.ts'
import { formatNumber } from '../../libs/utils.ts'
import { useTrainingDummy } from '../../queries/useTrainingDummy.ts'

export const Route = createFileRoute('/_authenticated/dummy_/fight')({
  component: DummyFightPage,
  validateSearch: dummySearchSchema,
})

function fmt(n: number): string {
  return formatNumber(n, currentLocale())
}

function DummyFightPage() {
  const { t } = useTranslation(['combat', 'errors'])
  const search = Route.useSearch()
  const [attempt, setAttempt] = useState(0)
  const [sceneDone, setSceneDone] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [round, setRound] = useState(1)
  const fight = useTrainingDummy(search.dummies, attempt)
  const result = fight.data ?? null
  const handleSceneDone = useCallback(() => setSceneDone(true), [])

  // Le serveur ne connaît pas la langue d'affichage : on nomme les mannequins ici.
  const teamB = useMemo(
    () =>
      result?.teamB.map((u, i) => ({
        ...u,
        name: t('combat:dummy.name', { n: i + 1 }),
      })) ?? [],
    [result, t],
  )
  const totalDamage = result?.damageByDummy.reduce((a, b) => a + b, 0) ?? 0

  useEffect(() => {
    if (sceneDone && result) {
      const timer = setTimeout(() => setShowResult(true), 300)
      return () => clearTimeout(timer)
    }
  }, [sceneDone, result])

  const handleRetry = () => {
    setShowResult(false)
    setSceneDone(false)
    setRound(1)
    setAttempt((a) => a + 1)
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <Link
          to="/dummy"
          search={search}
          className="inline-flex items-center gap-1.5 font-display text-base font-bold text-text-light/60 transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('combat:dummy.settings')}
        </Link>
        {result && (
          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-amber-700">
            {t('combat:battle.actionCounter', { count: round })}
          </div>
        )}
      </div>

      {fight.isFetching && !result && (
        <ArcadeCard className="py-12 text-center">
          <p className="font-display text-lg text-text">
            {t('combat:battle.inProgress')}
          </p>
        </ArcadeCard>
      )}

      {result && !fight.isError && (
        <BattleScene
          key={attempt}
          teamA={result.teamA}
          teamB={teamB}
          log={result.log}
          onComplete={handleSceneDone}
          onRoundChange={(current) => setRound(current)}
        />
      )}

      <Popup open={fight.isError}>
        <PopupContent size="default" className="p-8 text-center">
          <Dialog.Title className="sr-only">
            {t('errors:generic.fallbackTitle')}
          </Dialog.Title>
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <p className="font-display text-lg font-bold text-rose-500">
            {isApiError(fight.error)
              ? fight.error.title
              : t('errors:generic.fallbackTitle')}
          </p>
          <p className="mt-1.5 text-sm text-text-light">
            {isApiError(fight.error)
              ? fight.error.message
              : String(fight.error)}
          </p>
          <Button asChild className="mt-5">
            <Link to="/dummy" search={search}>
              {t('combat:dummy.settings')}
            </Link>
          </Button>
        </PopupContent>
      </Popup>

      {result && (
        <Popup open={showResult} onOpenChange={setShowResult}>
          <PopupContent
            size="lg"
            className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
          >
            <ResultPanel halo>
              <ResultBadge
                className={RESULT_BADGE_WIN}
                icon={<Target className="h-8 w-8" />}
              />
              <Dialog.Title className="mt-4 font-display text-3xl font-bold tabular-nums text-text">
                {t('combat:dummy.damage', { value: fmt(totalDamage) })}
              </Dialog.Title>
              <p className="mt-2 text-sm text-text-light">
                {t('combat:dummy.detail', {
                  turns: result.turns,
                  perTurn: fmt(Math.round(totalDamage / result.turns)),
                })}
              </p>
              {teamB.length > 1 && (
                <ul className="mt-3 space-y-0.5 text-sm tabular-nums text-text-light">
                  {teamB.map((u, i) => (
                    <li key={u.id}>
                      {t('combat:dummy.perDummy', {
                        name: u.name,
                        value: fmt(result.damageByDummy[i] ?? 0),
                      })}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                <Button variant="outline" asChild>
                  <Link to="/dummy" search={search}>
                    {t('combat:dummy.settings')}
                  </Link>
                </Button>
                <Button onClick={handleRetry} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('combat:battle.replay')}
                </Button>
              </div>
            </ResultPanel>
          </PopupContent>
        </Popup>
      )}
    </PageShell>
  )
}
