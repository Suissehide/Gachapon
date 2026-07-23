import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Gem,
  HelpCircle,
  SkipForward,
  Ticket,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { CapsuleStage } from '../../components/machine/capsule/CapsuleStage'
import { capsuleAudio } from '../../components/machine/capsule/capsuleAudio'
import {
  computeTeaseTier,
  type TeaseTier,
  tierConfig,
} from '../../components/machine/capsule/capsuleConfig'
import type { MachineStageHandle } from '../../components/machine/MachineStage'
import { MachineStage } from '../../components/machine/MachineStage'
import { RevealGrid } from '../../components/machine/reveal/RevealGrid'
import { AchievementsCard } from '../../components/play/AchievementsCard.tsx'
import { BoostCard } from '../../components/play/BoostCard.tsx'
import { LevelCard } from '../../components/play/LevelCard.tsx'
import { PityCard } from '../../components/play/PityCard.tsx'
import { PlayTutorialPopup } from '../../components/play/PlayTutorialPopup.tsx'
import { QuestsCard } from '../../components/play/QuestsCard.tsx'
import { RatesModal } from '../../components/play/RatesModal.tsx'
import { RecentsPanel } from '../../components/play/RecentsPanel.tsx'
import { StreakCard } from '../../components/play/StreakCard.tsx'
import { TokenCard } from '../../components/play/TokenCard.tsx'
import { AuroraGrid } from '../../components/shared/decorations/AuroraGrid'
import { Button } from '../../components/ui/button.tsx'
import { apiUrl as API_URL } from '../../constants/config.constant.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useStoredState } from '../../hooks/useStoredState.ts'
import { useToast } from '../../hooks/useToast'
import { wsClient } from '../../lib/ws'
import { preloadImages } from '../../libs/preloadImages.ts'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import type { PullBatchResult } from '../../queries/useGacha'
import { usePullBatch, useTokenBalance } from '../../queries/useGacha'
import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store.ts'
import { useAuthStore } from '../../stores/auth.store'
import { useLevelUpStore } from '../../stores/levelUp.store.ts'
import { computeLevel } from '../../utils/level.ts'
import { type LevelUpReward, levelUpReward } from '../../utils/levelRewards.ts'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

type Phase =
  | 'idle'
  | 'machine-anim'
  | 'capsule'
  | 'ball-flash'
  | 'pulling'
  | 'reveal-grid'

// Persistent ambient dust that drifts across the reveal-grid backdrop so it
// doesn't feel static once cards are revealed.
const AMBIENT_PARTICLES = [
  { id: 'a0', top: '12%', left: '8%', delay: '0s', duration: '6s', size: 3 },
  { id: 'a1', top: '22%', left: '78%', delay: '1.2s', duration: '5s', size: 2 },
  { id: 'a2', top: '55%', left: '5%', delay: '0.4s', duration: '7s', size: 3 },
  { id: 'a3', top: '68%', left: '92%', delay: '2s', duration: '5.5s', size: 2 },
  { id: 'a4', top: '35%', left: '3%', delay: '1.5s', duration: '8s', size: 2 },
  { id: 'a5', top: '48%', left: '96%', delay: '0.9s', duration: '6s', size: 3 },
  { id: 'a6', top: '82%', left: '18%', delay: '2.3s', duration: '5s', size: 2 },
  { id: 'a7', top: '18%', left: '68%', delay: '1.8s', duration: '7s', size: 2 },
  { id: 'a8', top: '75%', left: '85%', delay: '3s', duration: '6.5s', size: 3 },
  { id: 'a9', top: '42%', left: '38%', delay: '0.6s', duration: '9s', size: 2 },
  {
    id: 'a10',
    top: '88%',
    left: '62%',
    delay: '2.7s',
    duration: '5.5s',
    size: 2,
  },
  {
    id: 'a11',
    top: '8%',
    left: '48%',
    delay: '1.1s',
    duration: '7.5s',
    size: 2,
  },
]

const SKIP_KEY = 'play.skipAnimations'

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page-level orchestrator coordinates multiple state machines and phase branches
function Play() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<PullBatchResult | null>(null)
  // Palier de rareté teasé par la capsule (meilleure rareté du lot) — null
  // tant que le réseau n'a pas répondu : capsule neutre, qui « bloom » à sa
  // couleur dès que le résultat tombe.
  const [teaseTier, setTeaseTier] = useState<TeaseTier | null>(null)
  const pendingResult = useRef<PullBatchResult | null>(null)
  // Level-up detected at pull time but celebrated only once every card is
  // flipped (see receivePullResult / handleAllRevealed).
  const pendingLevelUp = useRef<{
    level: number
    reward: LevelUpReward
  } | null>(null)
  const machineRef = useRef<MachineStageHandle>(null)
  const [skipAnimations, setSkipAnimations] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return localStorage.getItem(SKIP_KEY) === 'true'
  })

  // Tutoriel de première visite : le flag « vu » vit en localStorage, la
  // popup est ouverte tant qu'il n'est pas posé. Le bouton « ? » rouvre la
  // popup sans toucher au flag.
  const [tutorialSeen, setTutorialSeen] = useStoredState<'false' | 'true'>(
    'play.hasSeenTutorial',
    'false',
    ['false', 'true'],
  )
  const [tutorialOpen, setTutorialOpen] = useState(tutorialSeen === 'false')

  // Son du tirage : off par défaut, persistant. Le moteur audio est un
  // singleton — on synchronise juste son état muet.
  const [soundOn, setSoundOn] = useStoredState<'true' | 'false'>(
    'play.soundOn',
    'false',
    ['true', 'false'],
  )
  useEffect(() => {
    capsuleAudio.setMuted(soundOn !== 'true')
  }, [soundOn])

  // Refs that mirror reactive state so async callbacks / timers never see stale closures
  const phaseRef = useRef<Phase>('idle')
  const skipAnimationsRef = useRef(skipAnimations)
  const pullAbortedRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    skipAnimationsRef.current = skipAnimations
  }, [skipAnimations])

  const { data: balance } = useTokenBalance()
  const { mutate: pullBatchMutation, isPending: pullPending } = usePullBatch()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const username = useAuthStore((s) => s.user?.username ?? '')
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)

  const tokens = balance?.tokens ?? 0

  // Keep tokens in a ref so startPull can guard on it without being recreated on every balance tick
  const tokensRef = useRef(tokens)
  const pullPendingRef = useRef(pullPending)
  useEffect(() => {
    tokensRef.current = tokens
  }, [tokens])
  useEffect(() => {
    pullPendingRef.current = pullPending
  }, [pullPending])

  // Stable handlers — useCallback because they're passed to children with effect deps.
  // La capsule vient d'exploser (burst gsap dans CapsuleScene). Fire the flash
  // while we wait for the network, then swap to the reveal grid mid-flash.
  const handleCapsuleBurst = useCallback(() => {
    setPhase('ball-flash')
    phaseRef.current = 'ball-flash'
    let attempts = 0
    const tryReveal = () => {
      if (pullAbortedRef.current) {
        setPhase('idle')
        phaseRef.current = 'idle'
        return
      }
      if (pendingResult.current) {
        setResult(pendingResult.current)
        // Small delay so the flash peaks before cards land
        setTimeout(() => {
          setPhase('reveal-grid')
          phaseRef.current = 'reveal-grid'
        }, 220)
        return
      }
      attempts++
      if (attempts > 200) {
        toast({
          title: 'Tirage en cours…',
          message: 'Le serveur ne répond pas.',
          severity: TOAST_SEVERITY.ERROR,
        })
        setPhase('idle')
        phaseRef.current = 'idle'
        return
      }
      setTimeout(tryReveal, 50)
    }
    tryReveal()
  }, [toast])

  const handleClose = useCallback(() => {
    setResult(null)
    setTeaseTier(null)
    pendingResult.current = null
    pendingLevelUp.current = null
    setPhase('idle')
    phaseRef.current = 'idle'
  }, [])

  // Called from all pull entry points the moment the network responds. Stashes
  // the result, preloads the card art (so the flip paints instantly), and
  // detects a level-up NOW — before the profile refetch lands — but holds the
  // celebration back until every card is revealed (handleAllRevealed).
  const receivePullResult = useCallback(
    (r: PullBatchResult) => {
      pendingResult.current = r
      // Foreshadowing : la capsule s'illumine à la couleur de la meilleure
      // rareté du lot — jamais la carte précise.
      setTeaseTier(computeTeaseTier(r))
      preloadImages(r.pulls.map((p) => p.card.imageUrl))
      const cached = qc.getQueryData<{ xp?: number }>(['profile', username])
      const oldXp = cached?.xp ?? 0
      const oldLevel = computeLevel(oldXp, economy.xp)
      const newLevel = computeLevel(oldXp + r.xpGained, economy.xp)
      pendingLevelUp.current =
        newLevel > oldLevel
          ? {
              level: newLevel,
              reward: levelUpReward(oldLevel, newLevel, economy.xp),
            }
          : null
    },
    [qc, username, economy],
  )

  // A card was turned over → reveal the achievements THAT card unlocked, so a
  // spoiler-y "Tirer une légendaire" only pops when its card is flipped.
  const handleCardRevealed = useCallback(
    (index: number) => {
      const unlocks = pendingResult.current?.pulls[index]?.unlockedAchievements
      if (unlocks?.length) {
        enqueueAchievementUnlock(unlocks)
      }
    },
    [enqueueAchievementUnlock],
  )

  // Whole reveal done → play the deferred level-up celebration and surface the
  // batch-level achievements (token-spend / level-up milestones) not tied to a
  // specific card.
  const handleAllRevealed = useCallback(() => {
    const lvl = pendingLevelUp.current
    if (lvl) {
      triggerLevelUp(lvl.level, lvl.reward)
      pendingLevelUp.current = null
    }
    const batchUnlocks = pendingResult.current?.unlockedAchievements
    if (batchUnlocks?.length) {
      enqueueAchievementUnlock(batchUnlocks)
    }
  }, [triggerLevelUp, enqueueAchievementUnlock])

  useEffect(() => {
    localStorage.setItem(SKIP_KEY, String(skipAnimations))
  }, [skipAnimations])

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional minimal dep — full deps cause a feedback loop with auth store
  useEffect(() => {
    if (balance && user && user.tokens !== balance.tokens) {
      setUser({ ...user, tokens: balance.tokens })
    }
  }, [balance?.tokens])

  useEffect(() => {
    wsClient.connect(API_URL)
    return () => wsClient.disconnect()
  }, [])

  // Séquence capsule : toute la chorégraphie (pop → shake → charge → inhale
  // → burst) est orchestrée par la timeline gsap de CapsuleScene — plus de
  // chaîne de setTimeout ici. La fin arrive via onBurst → handleCapsuleBurst.
  const runCapsuleSequence = useCallback(() => {
    setPhase('capsule')
    phaseRef.current = 'capsule'
  }, [])

  // startPull reads all guards from refs so it is safe to call via queueMicrotask / setTimeout
  // after a synchronous state update.
  const startPull = useCallback(
    async (count: number) => {
      if (
        tokensRef.current < count ||
        phaseRef.current !== 'idle' ||
        pullPendingRef.current
      ) {
        return
      }
      pullAbortedRef.current = false

      // Geste utilisateur → déverrouille le contexte WebAudio
      capsuleAudio.unlock()

      // Kick off network in parallel with visuals
      pendingResult.current = null
      setTeaseTier(null)

      // "Skip animations" only skips the 3D machine animation — the capsule
      // sequence, flash and card-reveal effects still play. Go straight to
      // the capsule on the black backdrop.
      if (skipAnimationsRef.current) {
        pullBatchMutation(count, {
          onSuccess: receivePullResult,
          onError: () => {
            pullAbortedRef.current = true
            setPhase('idle')
            phaseRef.current = 'idle'
          },
        })
        runCapsuleSequence()
        return
      }

      // Full animation path
      setPhase('machine-anim')
      phaseRef.current = 'machine-anim'
      pullBatchMutation(count, {
        onSuccess: receivePullResult,
        onError: () => {
          pullAbortedRef.current = true
          setPhase('idle')
          phaseRef.current = 'idle'
        },
      })

      await machineRef.current?.startAnimation()
      if (pullAbortedRef.current) {
        return
      }
      await new Promise((res) => setTimeout(res, 600))
      if (pullAbortedRef.current) {
        return
      }
      runCapsuleSequence()
    },
    [pullBatchMutation, receivePullResult, runCapsuleSequence],
  )

  // From the reveal grid's bottom-bar "Nouveau tirage x1/x10": skip machine anim,
  // keep the black backdrop up, and go straight to the ball animation.
  const handlePullAgain = useCallback(
    (count: number) => {
      // Guard: only callable from the reveal-grid phase; phaseRef is set synchronously
      // before any async work so a second click sees a non-reveal-grid phase and exits.
      if (phaseRef.current !== 'reveal-grid' || tokensRef.current < count) {
        return
      }
      // Lock synchronously — second click is now a no-op
      phaseRef.current = 'pulling'
      pullAbortedRef.current = false
      pendingResult.current = null
      capsuleAudio.unlock()
      setTeaseTier(null)

      // This replay is already on the black backdrop, so the machine anim is
      // never involved — the "skip animations" toggle has nothing to skip here.
      // Always play the ball → flash → reveal sequence.
      pullBatchMutation(count, {
        onSuccess: receivePullResult,
        onError: () => {
          pullAbortedRef.current = true
          setPhase('idle')
          phaseRef.current = 'idle'
        },
      })

      setResult(null)
      runCapsuleSequence()
    },
    [pullBatchMutation, receivePullResult, runCapsuleSequence],
  )

  const showCapsule = phase === 'capsule'
  const showMachine = phase === 'idle' || phase === 'machine-anim'
  // Fullscreen overlay stays mounted for the whole pull cycle so the topbar
  // and HUD never flash back in between capsule / flash / reveal / replay.
  const inPullCycleFullscreen =
    showCapsule ||
    phase === 'ball-flash' ||
    phase === 'reveal-grid' ||
    phase === 'pulling'
  // Flash au burst de la capsule — teinté à la couleur du palier teasé.
  // Il reste monté pendant reveal-grid : c'est le MÊME élément DOM, donc
  // l'animation CSS ne redémarre pas et le fondu se termine par-dessus la
  // carte de dos — sans ça le flash est démonté en pleine opacité au
  // changement de phase et la transition se coupe net.
  const showFlash = phase === 'ball-flash' || phase === 'reveal-grid'
  const flashColor = tierConfig(teaseTier).flash
  const showActions = phase === 'idle'
  const canPullX1 = tokens >= 1 && phase === 'idle' && !pullPending
  const canPullX10 = tokens >= 10 && phase === 'idle' && !pullPending

  const [ratesOpen, setRatesOpen] = useState(false)
  const pullCost = economy.gacha.pullTokenCost

  return (
    <div
      className="relative flex min-h-[calc(100vh-var(--topbar-h))] flex-col overflow-x-clip pb-8 pt-8"
      style={{ background: '#fbf8f3', color: '#1b1726' }}
    >
      <AuroraGrid />

      {/* En-tête */}
      <header className="relative z-1 mx-auto flex w-full max-w-5xl items-end justify-between px-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-text-light/60">
            Gachapon / Tirage
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Tirage
          </h1>
        </div>
        <Button
          variant="outline"
          className="rounded-full text-text-light hover:border-amber-soft hover:text-primary-dark"
          onClick={() => setRatesOpen(true)}
        >
          <Gem className="h-3.5 w-3.5 text-secondary" />
          Taux de drop
        </Button>
      </header>

      {/* Scène : stats / machine / récents */}
      <div className="relative z-1 mx-auto mt-6 flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 lg:grid lg:grid-cols-[260px_1fr_260px] lg:gap-6">
        {/* Cartes de stats */}
        <div className="order-2 grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:order-1 lg:flex lg:flex-col lg:gap-3.5">
          <TokenCard />
          <PityCard />
          <StreakCard />
          <LevelCard />
          <QuestsCard />
          <AchievementsCard />
          <BoostCard />
        </div>

        {/* Machine + actions */}
        <div className="order-1 flex flex-col items-center lg:order-2 lg:self-center">
          <div className="relative flex min-h-[280px] w-full flex-col items-center justify-end lg:min-h-[400px]">
            {/* Spot lumineux */}
            <div
              className="pointer-events-none absolute -inset-x-[14%] -inset-y-[6%]"
              style={{
                background:
                  'radial-gradient(48% 44% at 50% 46%, color-mix(in oklab, var(--primary) 20%, transparent), color-mix(in oklab, var(--secondary) 8%, transparent) 55%, transparent 75%)',
              }}
            />
            {/* Emplacement machine 3D — balle / flash / reveal vivent dans l'overlay plein écran */}
            <div className="relative aspect-square w-full max-w-[320px] lg:max-w-[440px]">
              {showMachine && (
                <div className="absolute inset-0 transition-opacity duration-300">
                  <MachineStage ref={machineRef} />
                </div>
              )}
            </div>
            {/* Ombre au sol */}
            <div
              className="-mt-2.5 h-6 w-[70%] max-w-[300px] rounded-[50%]"
              style={{
                background:
                  'radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--text) 18%, transparent), transparent 72%)',
              }}
            />
          </div>

          {/* Actions */}
          <div
            className={cn(
              'mt-4 flex w-full justify-center gap-3.5',
              !showActions && 'invisible pointer-events-none',
            )}
          >
            <Button
              onClick={() => startPull(1)}
              disabled={!canPullX1}
              variant="none"
              className="h-auto flex-1 whitespace-nowrap rounded-2xl border-solid border-[1.5px] border-border-dark bg-card px-7 py-4 text-[17px] font-bold text-text transition-all hover:-translate-y-0.5 hover:border-text-light disabled:opacity-50 sm:flex-none"
            >
              Tirage x1
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-text/6 px-2.5 py-1 font-mono text-xs text-text-light">
                <Ticket className="h-3.5 w-3.5" />
                {pullCost}
              </span>
            </Button>
            <Button
              onClick={() => startPull(10)}
              disabled={!canPullX10}
              variant="none"
              className="h-auto flex-1 whitespace-nowrap rounded-2xl bg-linear-to-br from-primary to-orange-500 px-7 py-4 text-[17px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(245,158,11,0.65)] transition-all hover:-translate-y-0.5 disabled:opacity-50 sm:flex-none"
            >
              Tirage x10
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 font-mono text-xs text-white">
                <Ticket className="h-3.5 w-3.5" />
                {pullCost * 10}
              </span>
            </Button>
          </div>
        </div>

        {/* Tirages récents */}
        <div className="order-3 flex min-h-0 flex-col self-stretch">
          {/* Freeze the feed while a pull is in flight so the just-pulled card
           *  doesn't surface in "récents" before its reveal animation. */}
          <RecentsPanel frozen={phase !== 'idle'} />
        </div>
      </div>

      {/* Boutons flottants : revoir le tutoriel + sauter les animations */}
      <div className="fixed bottom-4 right-4 z-5 flex items-center gap-2 sm:bottom-5 sm:right-5">
        <button
          type="button"
          aria-label={
            soundOn === 'true' ? 'Couper le son' : 'Activer le son du tirage'
          }
          title={
            soundOn === 'true' ? 'Couper le son' : 'Activer le son du tirage'
          }
          className={cn(
            'inline-flex cursor-pointer items-center rounded-full border bg-card p-2.5 shadow-md transition-colors',
            soundOn === 'true'
              ? 'border-amber-soft bg-primary/5 text-primary-dark'
              : 'border-border-dark text-text-light hover:text-text',
          )}
          onClick={() => setSoundOn(soundOn === 'true' ? 'false' : 'true')}
        >
          {soundOn === 'true' ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          aria-label="Revoir le tutoriel"
          title="Revoir le tutoriel"
          className="inline-flex cursor-pointer items-center rounded-full border border-border-dark bg-card p-2.5 text-text-light shadow-md transition-colors hover:text-text"
          onClick={() => setTutorialOpen(true)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Sauter les animations"
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3.5 py-2.5 text-[12.5px] font-semibold shadow-md transition-colors',
            skipAnimations
              ? 'border-amber-soft bg-primary/5 text-primary-dark'
              : 'border-border-dark text-text-light hover:text-text',
          )}
          onClick={() => setSkipAnimations((s) => !s)}
        >
          <SkipForward className="h-3.5 w-3.5" />
          <span className="hidden min-[721px]:inline">
            Sauter les animations
          </span>
        </button>
      </div>

      {/* ── Fullscreen pull-cycle overlay ─────────────────────────────────
       *  Covers the entire viewport (including the topbar) so ball → flash
       *  → reveal → replay all happen against continuous black — no HUD
       *  flashes between phases. Mounted from ball-shake onwards, unmounted
       *  when the user closes the reveal or the pull errors back to idle. */}
      {inPullCycleFullscreen && (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black animate-in fade-in-0 duration-500">
          {/* Permanent soft aurora glow behind the reveal so the backdrop
           *  never reads as flat black once the capsule has opened. */}
          {phase === 'reveal-grid' && (
            <div className="reveal-aurora pointer-events-none absolute inset-0 animate-in fade-in-0 duration-1000" />
          )}
          {/* Persistent ambient particles — subtle drift once the reveal is open */}
          {phase === 'reveal-grid' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {AMBIENT_PARTICLES.map((p) => (
                <div
                  key={p.id}
                  className="particle absolute rounded-full bg-white/25"
                  style={
                    {
                      top: p.top,
                      left: p.left,
                      width: p.size,
                      height: p.size,
                      '--delay': p.delay,
                      '--duration': p.duration,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* Capsule scene — chorégraphie gsap + bloom, rarity-aware */}
          {showCapsule && (
            <div className="absolute inset-0">
              <CapsuleStage
                teaseTier={teaseTier}
                onBurst={handleCapsuleBurst}
              />
            </div>
          )}

          {/* Flash between burst and reveal — teinté rareté, fondu qui se
           *  prolonge par-dessus l'arrivée de la carte */}
          {showFlash && (
            <div
              className="pointer-events-none absolute inset-0 z-40 animate-[ballFlash_900ms_ease-out_forwards]"
              style={{
                mixBlendMode: 'screen',
                background: `radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 28%, ${flashColor} 62%, ${flashColor} 100%)`,
              }}
            />
          )}

          {/* Mute — visible pendant tout le cycle de tirage */}
          <button
            type="button"
            aria-label={soundOn === 'true' ? 'Couper le son' : 'Activer le son'}
            title={soundOn === 'true' ? 'Couper le son' : 'Activer le son'}
            className="absolute bottom-4 left-4 z-50 inline-flex cursor-pointer items-center rounded-full border border-white/20 bg-white/10 p-2.5 text-white/80 backdrop-blur transition-colors hover:text-white"
            onClick={() => setSoundOn(soundOn === 'true' ? 'false' : 'true')}
          >
            {soundOn === 'true' ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          {/* Pulling spinner (skip-anim path) */}
          {phase === 'pulling' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white/70">Tirage en cours…</p>
            </div>
          )}

          {/* Reveal grid */}
          {phase === 'reveal-grid' && result && (
            <RevealGrid
              results={result.pulls}
              tokensRemaining={result.tokensRemaining}
              onClose={handleClose}
              onPullAgain={handlePullAgain}
              onCardRevealed={handleCardRevealed}
              onAllRevealed={handleAllRevealed}
            />
          )}
        </div>
      )}

      <RatesModal open={ratesOpen} onClose={() => setRatesOpen(false)} />
      <PlayTutorialPopup
        open={tutorialOpen}
        onClose={() => {
          setTutorialOpen(false)
          setTutorialSeen('true')
        }}
      />
    </div>
  )
}
