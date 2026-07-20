import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Coins,
  Eye,
  Hourglass,
  RotateCcw,
  Skull,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'

import type { BattleResult } from '../../api/campaign.api.ts'
import { BattleScene } from '../../components/battle/BattleScene.tsx'
import {
  DropCard,
  RESULT_BADGE_LOSS,
  RESULT_BADGE_TIMEOUT,
  RESULT_BADGE_WIN,
  ResultBadge,
  ResultPanel,
  RewardTile,
} from '../../components/battle/resultKit.tsx'
import { ArcadeCard } from '../../components/shared/ArcadeCard.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Popup, PopupContent } from '../../components/ui/popup.tsx'
import { isApiError } from '../../libs/httpErrorHandler.ts'
import { useAttackStage, useCampaign } from '../../queries/useCampaign.ts'
import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { useLevelUpStore } from '../../stores/levelUp.store.ts'
import { computeLevel, xpForLevel } from '../../utils/level.ts'
import { levelUpReward } from '../../utils/levelRewards.ts'

// Chapter titles — kept in sync with campaign.tsx's CHAPTER_META. Extracting
// to a shared module would be nicer but the list is short enough that a
// duplicate is cheaper than the extra indirection.
const CHAPTER_TITLES = [
  'Plaines',
  'Forêt des Murmures',
  'Cendres',
  'Océan',
  'Cristaux',
  'Volcan',
  'Toundra',
]
function chapterTitle(n: number): string {
  return CHAPTER_TITLES[n - 1] ?? `Chapitre ${n}`
}

export const Route = createFileRoute('/_authenticated/battle/$stageId')({
  component: BattlePage,
})

function BattlePage() {
  const { stageId } = Route.useParams()
  const team = useCombatTeam()
  const campaign = useCampaign()
  const combatPoints = useCombatPoints()
  const navigate = useNavigate()

  // Gate the replay buttons on the live combat-point balance so the player
  // can't fire a battle they can't pay for. While the balance is still loading
  // we optimistically allow it (the server stays the source of truth and will
  // reject with a 402 shown in the error popup).
  const canReplay = combatPoints.data
    ? combatPoints.data.combatPoints >= combatPoints.data.battleCost
    : true
  const [sceneDone, setSceneDone] = useState(false)
  const [showResult, setShowResult] = useState(false)
  // True once the result popup has opened at least once. Gates the fallback
  // dock so it only appears after a *dismissed* result — never in the 300ms gap
  // between the scene ending and the popup sliding in.
  const [resultSeen, setResultSeen] = useState(false)
  const [round, setRound] = useState({ current: 1, total: 1 })

  const teamReady = !team.isLoading && (team.data?.team.length ?? 0) >= 1

  // useQuery handles StrictMode's mount→unmount→mount dedup for us: both mounts
  // subscribe to the same in-flight request keyed by stageId so the server is
  // hit (and PC billed) exactly once.
  const attack = useAttackStage(stageId, teamReady)
  const result = attack.data ?? null

  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  // Find the stage's label + chapter title from the campaign snapshot so the
  // victory subtitle can read "NIVEAU 2-4 · FORÊT DES MURMURES".
  const stageInfo = (() => {
    for (const ch of campaign.data?.chapters ?? []) {
      const s = ch.stages.find((st) => st.id === stageId)
      if (s) {
        return { label: s.label, chapterTitle: chapterTitle(ch.chapter) }
      }
    }
    return null
  })()

  useEffect(() => {
    if (sceneDone && result) {
      // Defer slightly so the final frame of the scene is visible before the
      // overlay slides in.
      const t = setTimeout(() => setShowResult(true), 300)
      return () => clearTimeout(t)
    }
  }, [sceneDone, result])

  // Refresh the gold/dust balance in the auth store (which the topbar reads
  // from) only once the result popup is revealed. The battle fetch resolves
  // several seconds earlier — while the scene is still animating — so
  // refreshing then would flash the new gold in the topbar before the victory
  // popup appears (useAttackStage deliberately skips this refresh for that
  // reason).
  useEffect(() => {
    if (showResult) {
      setResultSeen(true)
      void useAuthStore.getState().fetchMe()
    }
  }, [showResult])

  // Fire the player level-up celebration once the victory panel is shown. The
  // combat XP can push the player over a level threshold; unlike the gacha
  // flow, nothing else triggers it, so we detect it here from the battle
  // rewards (xpBefore/levelBefore) and let LevelUpOverlay (z-[200]) render on
  // top of the victory popup.
  useEffect(() => {
    if (!showResult) {
      return
    }
    const rewards = result?.rewards
    if (!(result?.won && rewards)) {
      return
    }
    const oldLevel = rewards.levelBefore
    const newLevel = computeLevel(rewards.xpBefore + rewards.xp, economy.xp)
    if (newLevel > oldLevel) {
      triggerLevelUp(newLevel, levelUpReward(oldLevel, newLevel, economy.xp))
    }
  }, [showResult, result, economy, triggerLevelUp])

  const handleReplay = () => {
    setShowResult(false)
    setResultSeen(false)
    setSceneDone(false)
    setRound({ current: 1, total: 1 })
    attack.refetch()
  }

  const handleBackToCampaign = () => {
    navigate({ to: '/campaign' })
  }

  // "Étage suivant" — return to the campaign and auto-open the pre-battle modal
  // for the next playable stage. If none is unlocked, the campaign just opens
  // normally (see the ?prep handling in campaign.tsx).
  const handleNextFloor = () => {
    navigate({ to: '/campaign', search: { prep: true } })
  }

  return (
    <PageShell>
      {/* Topbar — back link on the left, round pill on the right. */}
      <div className="flex items-center justify-between">
        <Link
          to="/campaign"
          className="inline-flex items-center gap-1.5 font-display text-base font-bold text-text-light/60 transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Campagne
        </Link>
        {result && (
          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-amber-700">
            Tour {round.current}
          </div>
        )}
      </div>

      {team.isLoading && (
        <ArcadeCard className="text-center">
          <p className="text-text-light">Chargement…</p>
        </ArcadeCard>
      )}

      {!team.isLoading && !teamReady && <NoTeamNotice />}

      {teamReady && attack.isFetching && !result && (
        <ArcadeCard className="py-12 text-center">
          <p className="font-display text-lg text-text">Combat en cours…</p>
          <p className="mt-1 text-sm text-text-light">
            Les forces s'affrontent.
          </p>
        </ArcadeCard>
      )}

      {/* A failed (re)fetch keeps the previous battle's data around, so gate the
          scene + result overlay on !isError to avoid a stale result lingering
          behind the error popup. */}
      {teamReady && result && !attack.isError && (
        <BattleScene
          teamA={result.teamA}
          teamB={result.teamB}
          log={result.log}
          onComplete={() => setSceneDone(true)}
          onRoundChange={(current, total) => setRound({ current, total })}
        />
      )}

      {/* Battle error overlay — e.g. "Plus assez de points de combat" (402). */}
      <Popup
        open={teamReady && attack.isError}
        onOpenChange={(open) => {
          if (!open) {
            handleBackToCampaign()
          }
        }}
      >
        <PopupContent size="default" className="p-8 text-center">
          <Dialog.Title className="sr-only">Erreur</Dialog.Title>
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <p className="font-display text-lg font-bold text-rose-500">
            {isApiError(attack.error) ? attack.error.title : 'Erreur'}
          </p>
          <p className="mt-1.5 text-sm text-text-light">
            {isApiError(attack.error)
              ? attack.error.message
              : String(attack.error)}
          </p>
          <Button onClick={handleBackToCampaign} className="mt-5">
            Retour à la campagne
          </Button>
        </PopupContent>
      </Popup>

      {/* Victory / Defeat overlay — plus the fallback dock once it's dismissed. */}
      {result && !attack.isError && (
        <BattleResultOverlay
          result={result}
          stageInfo={stageInfo}
          resultSeen={resultSeen}
          showResult={showResult}
          setShowResult={setShowResult}
          canReplay={canReplay}
          battleCost={combatPoints.data?.battleCost}
          onReplay={handleReplay}
          onBack={handleBackToCampaign}
          onNextFloor={handleNextFloor}
        />
      )}
    </PageShell>
  )
}

function BattleResultOverlay({
  result,
  stageInfo,
  resultSeen,
  showResult,
  setShowResult,
  canReplay,
  battleCost,
  onReplay,
  onBack,
  onNextFloor,
}: {
  result: BattleResult
  stageInfo: { label: string; chapterTitle: string } | null
  resultSeen: boolean
  showResult: boolean
  setShowResult: (open: boolean) => void
  canReplay: boolean
  battleCost: number | undefined
  onReplay: () => void
  onBack: () => void
  onNextFloor: () => void
}) {
  // The dock is only a fallback for a *dismissed* result: it needs the popup to
  // have opened at least once (resultSeen), so it never flashes during the
  // fight or in the gap before the popup slides in.
  const dockVisible = resultSeen && !showResult
  // A battle that neither side won within the turn limit ends on a TIMEOUT log
  // entry (server-side it counts as a loss: energy spent, no clear). Surface it
  // as its own "Match nul" state so the player knows they nearly made it rather
  // than being wiped out.
  const isTimeout =
    !result.won && result.log.some((entry) => entry.type === 'TIMEOUT')
  return (
    <>
      <Popup open={showResult} onOpenChange={setShowResult}>
        <PopupContent
          size="lg"
          className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
        >
          <Dialog.Title className="sr-only">
            {result.won ? 'Victoire' : isTimeout ? 'Match nul' : 'Défaite'}
          </Dialog.Title>
          {result.won ? (
            <VictoryPanel
              result={result}
              stageInfo={stageInfo}
              canReplay={canReplay}
              onReplay={onReplay}
              onNextFloor={onNextFloor}
            />
          ) : (
            <DefeatPanel
              canReplay={canReplay}
              battleCost={battleCost}
              timeout={isTimeout}
              onReplay={onReplay}
              onBack={onBack}
            />
          )}
        </PopupContent>
      </Popup>

      {/* Once the result popup is dismissed, a floating bar (same pattern as the
          campaign TeamDock) keeps a way back: reopen the result or leave for the
          campaign. The spacer reserves in-flow height so the fixed bar doesn't
          cover the bottom of the scene / its action buttons. */}
      {dockVisible && (
        <>
          <div aria-hidden className="h-28" />
          <ResultDock
            won={result.won}
            timeout={isTimeout}
            onReview={() => setShowResult(true)}
            onBack={onBack}
          />
        </>
      )}
    </>
  )
}

function ResultDock({
  won,
  timeout = false,
  onReview,
  onBack,
}: {
  won: boolean
  timeout?: boolean
  onReview: () => void
  onBack: () => void
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-3"
      style={{
        background: 'linear-gradient(180deg, rgba(251,248,243,0), #fbf8f3 38%)',
      }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-4 rounded-[20px] bg-[#1b1726] px-4 py-3 pl-5 text-white shadow-[0_18px_44px_-16px_rgba(27,23,38,0.5)]">
        <div className="flex items-center gap-3">
          {won ? (
            <Trophy className="h-5 w-5 text-amber-400" />
          ) : timeout ? (
            <Hourglass className="h-5 w-5 text-indigo-300" />
          ) : (
            <Skull className="h-5 w-5 text-rose-400" />
          )}
          <div className="font-display text-base font-extrabold text-white">
            {won ? 'Victoire' : timeout ? 'Match nul' : 'Défaite'}
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            onClick={onReview}
            className="gap-2 border-white/0 bg-white text-[#1b1726] hover:bg-white/90 hover:text-[#1b1726]"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Revoir le résultat</span>
          </Button>
          <Button onClick={onBack} className="gap-2">
            Campagne
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function NoTeamNotice() {
  return (
    <ArcadeCard className="text-center">
      <Swords className="mx-auto mb-2 h-10 w-10 text-text-light/40" />
      <p className="font-display text-lg font-bold text-text">
        Aucune équipe déployée
      </p>
      <p className="mt-2 text-sm text-text-light">
        Avant de combattre, sélectionne jusqu'à 3 cartes dans la page Combat. Si
        tu n'as pas encore de cartes, fais d'abord quelques tirages sur la page
        Jouer.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link to="/campaign" search={{ editor: true }}>
          <Button>
            <Swords className="mr-2 h-4 w-4" />
            Configurer mon équipe
          </Button>
        </Link>
        <Link to="/play">
          <Button variant="outline">Faire un tirage</Button>
        </Link>
        <Link to="/campaign">
          <Button variant="outline">Retour campagne</Button>
        </Link>
      </div>
    </ArcadeCard>
  )
}

function VictoryPanel({
  result,
  stageInfo,
  canReplay,
  onReplay,
  onNextFloor,
}: {
  result: BattleResult
  stageInfo: { label: string; chapterTitle: string } | null
  canReplay: boolean
  onReplay: () => void
  onNextFloor: () => void
}) {
  const rewards = result.rewards
  return (
    <ResultPanel halo>
      <ResultBadge
        className={RESULT_BADGE_WIN}
        icon={<Trophy className="h-8 w-8" />}
      />
      <h2 className="mt-4 font-display text-3xl font-bold text-text">
        Victoire !
      </h2>
      {stageInfo && (
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-text-light/70">
          Niveau {stageInfo.label} · {stageInfo.chapterTitle}
        </p>
      )}
      {rewards?.isFirstClear && (
        <p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-amber-600">
          Premier passage
        </p>
      )}

      {rewards && (
        <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
          <RewardTile
            icon={<Coins className="h-5 w-5" />}
            label="Pièces"
            value={rewards.gold}
            tone="#f59e0b"
          />
          <RewardTile
            icon={<Sparkles className="h-5 w-5" />}
            label="Poussière"
            value={rewards.dust}
            tone="#8b5cf6"
          />
        </div>
      )}

      {rewards?.equipmentDrop && (
        <DropCard
          tone="amber"
          label="Équipement"
          name={rewards.equipmentDrop.name}
          rarity={rewards.equipmentDrop.rarity}
        />
      )}

      {rewards?.cardDrop && (
        <DropCard
          tone="sky"
          label={rewards.cardDrop.wasDuplicate ? 'Carte · doublon' : 'Carte'}
          name={rewards.cardDrop.name}
          rarity={rewards.cardDrop.rarity}
        />
      )}

      {rewards && <XpBar rewards={rewards} />}

      <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="outline"
          onClick={onReplay}
          disabled={!canReplay}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Rejouer
        </Button>
        <Button onClick={onNextFloor} className="gap-2">
          Etage suivant
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {!canReplay && (
        <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-widest text-text-light/70">
          Plus assez de points de combat
        </p>
      )}
    </ResultPanel>
  )
}

function DefeatPanel({
  canReplay,
  battleCost = 1,
  timeout = false,
  onReplay,
  onBack,
}: {
  canReplay: boolean
  battleCost?: number
  timeout?: boolean
  onReplay: () => void
  onBack: () => void
}) {
  return (
    <ResultPanel>
      <ResultBadge
        className={timeout ? RESULT_BADGE_TIMEOUT : RESULT_BADGE_LOSS}
        icon={
          timeout ? (
            <Hourglass className="h-8 w-8" />
          ) : (
            <Skull className="h-8 w-8" />
          )
        }
      />
      <h2 className="mt-4 font-display text-3xl font-bold text-text">
        {timeout ? 'Match nul' : 'Défaite'}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-light">
        {timeout
          ? "Aucune équipe n'a pris l'avantage avant la fin des 60 tours. Renforce ta composition pour l'emporter plus vite — l'énergie a quand même été dépensée."
          : "Ton équipe n'a pas tenu le choc. Améliore ta composition ou monte tes cartes avant de retourner au front."}
      </p>

      <div className="mt-6 flex w-full flex-col gap-2.5">
        <Link to="/campaign" search={{ editor: true }} className="w-full">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 whitespace-normal bg-white px-4 py-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="flex flex-col items-start gap-0.5">
              <span className="font-display text-sm font-bold">
                Revoir mon équipe
              </span>
              <span className="text-xs text-text-light">
                Choisis une meilleure composition
              </span>
            </span>
            <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-text-light/40" />
          </Button>
        </Link>
        <Link to="/collection" className="w-full">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 whitespace-normal bg-white px-4 py-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="flex flex-col items-start gap-0.5">
              <span className="font-display text-sm font-bold">
                Monter tes cartes
              </span>
              <span className="text-xs text-text-light">
                Améliore le niveau de tes cartes
              </span>
            </span>
            <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-text-light/40" />
          </Button>
        </Link>
      </div>

      <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={onReplay} disabled={!canReplay} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Réessayer
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-black/15 px-2 py-0.5 font-mono text-[12px] font-bold tabular-nums">
            <Zap className="h-3 w-3" />
            {battleCost}
          </span>
        </Button>
      </div>
      {!canReplay && (
        <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-widest text-text-light/70">
          Plus assez de points de combat
        </p>
      )}
    </ResultPanel>
  )
}

// XP progression bar — current XP (blue) + gain from this battle (orange).
function XpBar({
  rewards,
}: {
  rewards: {
    xp: number
    xpBefore: number
    levelBefore: number
  }
}) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const xpBefore = rewards.xpBefore
  const xpAfter = xpBefore + rewards.xp
  const level = rewards.levelBefore
  const xpAtLevelStart = xpForLevel(level, economy.xp)
  const xpAtLevelEnd = xpForLevel(level + 1, economy.xp)
  const xpInLevel = xpAtLevelEnd - xpAtLevelStart
  const pctBefore = Math.max(
    0,
    Math.min(100, ((xpBefore - xpAtLevelStart) / xpInLevel) * 100),
  )
  const pctAfter = Math.max(
    pctBefore,
    Math.min(100, ((xpAfter - xpAtLevelStart) / xpInLevel) * 100),
  )

  return (
    <div className="mt-4 w-full rounded-2xl border border-border bg-white p-3">
      <div className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/70">
        <span>Niveau {level}</span>
        <span className="tabular-nums">
          {xpAfter.toLocaleString('fr-FR')} /{' '}
          {xpAtLevelEnd.toLocaleString('fr-FR')} XP
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[rgba(27,23,38,0.08)]">
        {/* Gain from this battle (orange) — rendered FIRST so the blue "current"
            fill can sit on top and hide the ~4% overlap on the left. The overlap
            makes the joint feel like the orange grows from *under* the blue
            instead of butting flush against it. */}
        <div
          className="absolute inset-y-0 rounded-r-full bg-gradient-to-r from-amber-400 to-orange-500 animate-[battleXpGrow_0.6s_ease_forwards]"
          style={{
            left: `${Math.max(0, pctBefore - 4)}%`,
            width: `${pctAfter - Math.max(0, pctBefore - 4)}%`,
            transformOrigin: 'left center',
          }}
        />
        {/* Current XP (blue) — sits on top of the orange overlap. */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
          style={{ width: `${pctBefore}%` }}
        />
      </div>
      <p className="mt-1 text-right font-mono text-[11px] font-bold tabular-nums text-orange-600">
        +{rewards.xp.toLocaleString('fr-FR')} XP
      </p>
    </div>
  )
}
