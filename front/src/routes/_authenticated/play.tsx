import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createFileRoute } from '@tanstack/react-router'
import { Gem, Layers, SkipForward } from 'lucide-react'
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { GachaBall } from '../../components/machine/GachaBall'
import type { MachineStageHandle } from '../../components/machine/MachineStage'
import { MachineStage } from '../../components/machine/MachineStage'
import { RevealGrid } from '../../components/machine/reveal/RevealGrid'
import { BoostCard } from '../../components/play/BoostCard.tsx'
import { LevelCard } from '../../components/play/LevelCard.tsx'
import { PityCard } from '../../components/play/PityCard.tsx'
import { QuestsCard } from '../../components/play/QuestsCard.tsx'
import { RatesModal } from '../../components/play/RatesModal.tsx'
import { RecentsPanel } from '../../components/play/RecentsPanel.tsx'
import { StreakCard } from '../../components/play/StreakCard.tsx'
import { TokenCard } from '../../components/play/TokenCard.tsx'
import { AuroraGrid } from '../../components/shared/decorations/AuroraGrid'
import { Button } from '../../components/ui/button.tsx'
import { apiUrl as API_URL } from '../../constants/config.constant.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast'
import { wsClient } from '../../lib/ws'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import type { PullBatchResult } from '../../queries/useGacha'
import { usePullBatch, useTokenBalance } from '../../queries/useGacha'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

type Phase =
  | 'idle'
  | 'machine-anim'
  | 'ball-shake'
  | 'ball-split'
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
  const pendingResult = useRef<PullBatchResult | null>(null)
  const machineRef = useRef<MachineStageHandle>(null)
  const [skipAnimations, setSkipAnimations] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return localStorage.getItem(SKIP_KEY) === 'true'
  })

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
  const { toast } = useToast()

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
  // Ball split ended → pieces are gone from the scene. Fire the white flash while
  // we wait for the network, then swap to the reveal grid mid-flash.
  const handleSplitDone = useCallback(() => {
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
    pendingResult.current = null
    setPhase('idle')
    phaseRef.current = 'idle'
  }, [])

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

  // startPull reads all guards from refs so it is safe to call via queueMicrotask / setTimeout
  // after a synchronous state update.
  const startPull = useCallback(
    async (count: 1 | 10) => {
      if (
        tokensRef.current < count ||
        phaseRef.current !== 'idle' ||
        pullPendingRef.current
      ) {
        return
      }
      pullAbortedRef.current = false

      // Kick off network in parallel with visuals
      pendingResult.current = null

      // "Skip animations" only skips the 3D machine animation — the ball
      // shake/split, flash and card-reveal effects still play. Go straight to
      // the ball on the black backdrop.
      if (skipAnimationsRef.current) {
        pullBatchMutation(count, {
          onSuccess: (r) => {
            pendingResult.current = r
          },
          onError: () => {
            pullAbortedRef.current = true
            setPhase('idle')
            phaseRef.current = 'idle'
          },
        })
        setPhase('ball-shake')
        phaseRef.current = 'ball-shake'
        await new Promise((res) => setTimeout(res, 800))
        if (pullAbortedRef.current) {
          return
        }
        setPhase('ball-split')
        phaseRef.current = 'ball-split'
        // ball-split ends via onSplitDone → handleSplitDone → reveal-grid
        return
      }

      // Full animation path
      setPhase('machine-anim')
      phaseRef.current = 'machine-anim'
      pullBatchMutation(count, {
        onSuccess: (r) => {
          pendingResult.current = r
        },
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
      setPhase('ball-shake')
      phaseRef.current = 'ball-shake'
      await new Promise((res) => setTimeout(res, 800))
      if (pullAbortedRef.current) {
        return
      }
      setPhase('ball-split')
      phaseRef.current = 'ball-split'
      // ball-split ends via onSplitDone callback → transition inside handleSplitDone
    },
    [pullBatchMutation],
  )

  // From the reveal grid's bottom-bar "Nouveau tirage x1/x10": skip machine anim,
  // keep the black backdrop up, and go straight to the ball animation.
  const handlePullAgain = useCallback(
    async (count: 1 | 10) => {
      // Guard: only callable from the reveal-grid phase; phaseRef is set synchronously
      // before any async work so a second click sees a non-reveal-grid phase and exits.
      if (phaseRef.current !== 'reveal-grid' || tokensRef.current < count) {
        return
      }
      // Lock synchronously — second click is now a no-op
      phaseRef.current = 'pulling'
      pullAbortedRef.current = false
      pendingResult.current = null

      // This replay is already on the black backdrop, so the machine anim is
      // never involved — the "skip animations" toggle has nothing to skip here.
      // Always play the ball → flash → reveal sequence.
      pullBatchMutation(count, {
        onSuccess: (r) => {
          pendingResult.current = r
        },
        onError: () => {
          pullAbortedRef.current = true
          setPhase('idle')
          phaseRef.current = 'idle'
        },
      })

      setResult(null)
      setPhase('ball-shake')
      phaseRef.current = 'ball-shake'
      await new Promise((res) => setTimeout(res, 800))
      if (pullAbortedRef.current) {
        return
      }
      setPhase('ball-split')
      phaseRef.current = 'ball-split'
      // Rest handled by onSplitDone → handleSplitDone → reveal-grid
    },
    [pullBatchMutation],
  )

  const showBall = phase === 'ball-shake' || phase === 'ball-split'
  const showMachine = phase === 'idle' || phase === 'machine-anim'
  // Fullscreen overlay stays mounted for the whole pull cycle so the topbar
  // and HUD never flash back in between ball / flash / reveal / replay.
  const inPullCycleFullscreen =
    showBall ||
    phase === 'ball-flash' ||
    phase === 'reveal-grid' ||
    phase === 'pulling'
  // Flash fires only during ball-flash — pieces are gone, cards not yet in
  const showFlash = phase === 'ball-flash'
  const showActions = phase === 'idle'
  const canPullX1 = tokens >= 1 && phase === 'idle' && !pullPending
  const canPullX10 = tokens >= 10 && phase === 'idle' && !pullPending

  const [ratesOpen, setRatesOpen] = useState(false)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const pullCost = economy.gacha.pullTokenCost

  return (
    <div
      className="relative flex min-h-[calc(100vh-var(--topbar-h))] flex-col overflow-x-clip px-4 pb-8 pt-8"
      style={{ background: '#fbf8f3', color: '#1b1726' }}
    >
      <AuroraGrid />

      {/* En-tête */}
      <header className="relative z-1 mx-auto flex w-full max-w-5xl items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-light/70">
            Gachapon / Tirage
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-none tracking-tight lg:text-[44px]">
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
      <div className="relative z-1 mx-auto mt-1 flex w-full max-w-5xl flex-1 flex-col gap-4 lg:grid lg:grid-cols-[260px_1fr_260px] lg:items-center lg:gap-6">
        {/* Cartes de stats */}
        <div className="order-2 grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:order-1 lg:flex lg:flex-col lg:gap-3.5">
          <TokenCard />
          <PityCard />
          <StreakCard />
          <LevelCard />
          <QuestsCard />
          <BoostCard />
        </div>

        {/* Machine + actions */}
        <div className="order-1 flex flex-col items-center lg:order-2">
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
                <Layers className="h-3.5 w-3.5" />
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
                <Layers className="h-3.5 w-3.5" />
                {pullCost * 10}
              </span>
            </Button>
          </div>
        </div>

        {/* Tirages récents */}
        <div className="order-3 flex min-h-0 flex-col self-stretch lg:justify-center">
          {/* Freeze the feed while a pull is in flight so the just-pulled card
           *  doesn't surface in "récents" before its reveal animation. */}
          <RecentsPanel frozen={phase !== 'idle'} />
        </div>
      </div>

      {/* Toggle sauter les animations */}
      <button
        type="button"
        title="Sauter les animations"
        className={cn(
          'fixed bottom-4 right-4 z-5 inline-flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3.5 py-2.5 text-[12.5px] font-semibold shadow-md transition-colors sm:bottom-5 sm:right-5',
          skipAnimations
            ? 'border-amber-soft bg-primary/5 text-primary-dark'
            : 'border-border-dark text-text-light hover:text-text',
        )}
        onClick={() => setSkipAnimations((s) => !s)}
      >
        <SkipForward className="h-3.5 w-3.5" />
        <span className="hidden min-[721px]:inline">Sauter les animations</span>
      </button>

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

          {/* Ball scene */}
          {showBall && (
            <Canvas
              camera={{ position: [0, 0.3, 7], fov: 45 }}
              shadows
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'transparent' }}
            >
              <ambientLight intensity={0.55} />
              <directionalLight
                position={[5, 10, 5]}
                intensity={1.1}
                castShadow
                shadow-mapSize={[1024, 1024] as [number, number]}
              />
              <pointLight
                position={[-3, 3, 3]}
                intensity={0.9}
                color="#f59e0b"
                distance={12}
              />
              <pointLight
                position={[3, 2, -2]}
                intensity={0.6}
                color="#ec4899"
                distance={10}
              />
              <GachaBall
                phase={phase === 'ball-shake' ? 'shake' : 'split'}
                onSplitDone={handleSplitDone}
              />
              <Environment preset="city" />
            </Canvas>
          )}

          {/* Flash between split and reveal */}
          {showFlash && (
            <div
              className="pointer-events-none absolute inset-0 z-40 bg-white animate-[ballFlash_500ms_ease-out_forwards]"
              style={{ mixBlendMode: 'screen' }}
            />
          )}

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
            />
          )}
        </div>
      )}

      <RatesModal open={ratesOpen} onClose={() => setRatesOpen(false)} />
    </div>
  )
}
