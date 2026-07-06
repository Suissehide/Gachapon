import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createFileRoute } from '@tanstack/react-router'
import { Gem, SkipForward } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { GachaBall } from '../../components/machine/GachaBall'
import type { MachineStageHandle } from '../../components/machine/MachineStage'
import { MachineStage } from '../../components/machine/MachineStage'
import { RevealGrid } from '../../components/machine/reveal/RevealGrid'
import { SummaryPanel } from '../../components/machine/reveal/SummaryPanel'
import { LevelCard } from '../../components/play/LevelCard.tsx'
import { PityCard } from '../../components/play/PityCard.tsx'
import { RatesModal } from '../../components/play/RatesModal.tsx'
import { RecentsPanel } from '../../components/play/RecentsPanel.tsx'
import { StreakCard } from '../../components/play/StreakCard.tsx'
import { TokenCard } from '../../components/play/TokenCard.tsx'
import { Button } from '../../components/ui/button.tsx'
import { apiUrl as API_URL } from '../../constants/config.constant.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast'
import { wsClient } from '../../lib/ws'
import { cn } from '../../libs/utils.ts'
import type { PullBatchResult } from '../../queries/useGacha'
import { usePullBatch, useTokenBalance } from '../../queries/useGacha'
import { DEFAULT_ECONOMY, useEconomyConfig } from '../../queries/useEconomyConfig.ts'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

type Phase =
  | 'idle'
  | 'machine-anim'
  | 'ball-shake'
  | 'ball-split'
  | 'pulling'
  | 'reveal-grid'
  | 'summary'

const SKIP_KEY = 'play.skipAnimations'

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
  const handleSplitDone = useCallback(() => {
    let attempts = 0
    const tryReveal = () => {
      // If onError already fired, bail immediately
      if (pullAbortedRef.current) {
        setPhase('idle')
        phaseRef.current = 'idle'
        return
      }
      if (pendingResult.current) {
        setResult(pendingResult.current)
        setPhase('reveal-grid')
        return
      }
      attempts++
      if (attempts > 200) {
        // Network took too long — bail and surface an error
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

  // RevealGrid's useEffect includes onAllRevealed in its dep array — must be stable
  // or the 700ms summary-transition timer re-fires on every parent re-render.
  const handleAllRevealed = useCallback(() => setPhase('summary'), [])

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
  // after a synchronous state update (e.g. setPhase('idle') in handlePullAgain).
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

      if (skipAnimationsRef.current) {
        setPhase('pulling')
        phaseRef.current = 'pulling'
        pullBatchMutation(count, {
          onSuccess: (r) => {
            setResult(r)
            setPhase('reveal-grid')
            phaseRef.current = 'reveal-grid'
          },
          onError: () => {
            pullAbortedRef.current = true
            setPhase('idle')
            phaseRef.current = 'idle'
          },
        })
        return
      }

      // Full animation path — kick off network in parallel with visuals
      pendingResult.current = null
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
      await new Promise((res) => setTimeout(res, 500))
      if (pullAbortedRef.current) {
        return
      }
      setPhase('ball-split')
      phaseRef.current = 'ball-split'
      // ball-split ends via onSplitDone callback → transition inside handleSplitDone
    },
    [pullBatchMutation],
  )

  // Reset to idle then schedule the next pull. phaseRef is synced synchronously so
  // startPull's guard (phaseRef.current !== 'idle') sees 'idle' when the microtask fires.
  const handlePullAgain = useCallback(
    (count: 1 | 10) => {
      setResult(null)
      pendingResult.current = null
      setPhase('idle')
      phaseRef.current = 'idle'
      queueMicrotask(() => startPull(count))
    },
    [startPull],
  )

  const showBall = phase === 'ball-shake' || phase === 'ball-split'
  const showMachine =
    phase === 'idle' ||
    phase === 'machine-anim' ||
    phase === 'ball-shake' ||
    phase === 'ball-split'
  const showActions = phase === 'idle'
  const canPullX1 = tokens >= 1 && phase === 'idle' && !pullPending
  const canPullX10 = tokens >= 10 && phase === 'idle' && !pullPending

  const [ratesOpen, setRatesOpen] = useState(false)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const pullCost = economy.gacha.pullTokenCost

  return (
    <div className="relative flex min-h-[calc(100vh-var(--topbar-h))] flex-col overflow-x-clip bg-background px-4 pb-6 pt-5 sm:px-8 lg:px-12">
      {/* Halos ambiance arcade clair */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(42% 34% at 16% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%), radial-gradient(42% 34% at 86% 4%, color-mix(in oklab, var(--secondary) 12%, transparent), transparent 70%)',
        }}
      />

      {/* En-tête */}
      <header className="relative z-1 mx-auto flex w-full max-w-[1240px] items-end justify-between">
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
      <div className="relative z-1 mx-auto mt-4 flex w-full max-w-[1240px] flex-1 flex-col gap-4 lg:grid lg:grid-cols-[290px_1fr_290px] lg:items-center lg:gap-8">
        {/* Cartes de stats */}
        <div className="order-2 grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:order-1 lg:flex lg:flex-col lg:gap-3.5">
          <TokenCard />
          <PityCard />
          <StreakCard />
          <LevelCard />
        </div>

        {/* Machine + actions */}
        <div className="order-1 flex flex-col items-center lg:order-2">
          <div className="relative flex min-h-[280px] w-full flex-col items-center justify-end lg:min-h-[440px]">
            {/* Spot lumineux */}
            <div
              className="pointer-events-none absolute -inset-x-[14%] -inset-y-[6%]"
              style={{
                background:
                  'radial-gradient(48% 44% at 50% 46%, color-mix(in oklab, var(--primary) 20%, transparent), color-mix(in oklab, var(--secondary) 8%, transparent) 55%, transparent 75%)',
              }}
            />
            {/* Emplacement machine 3D + balle */}
            <div className="relative aspect-3/4 w-full max-w-[230px] lg:max-w-[340px]">
              {showMachine && (
                <div
                  className={cn(
                    'absolute inset-0 transition-opacity duration-300',
                    showBall && 'pointer-events-none opacity-30',
                  )}
                >
                  <MachineStage ref={machineRef} />
                </div>
              )}
              {showBall && (
                <div className="absolute inset-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                  <Canvas
                    camera={{ position: [0, 0.3, 8], fov: 45 }}
                    shadows
                    gl={{ antialias: true, alpha: true }}
                    style={{ background: 'transparent' }}
                  >
                    <ambientLight intensity={0.5} />
                    <directionalLight
                      position={[5, 10, 5]}
                      intensity={1}
                      castShadow
                      shadow-mapSize={[1024, 1024] as [number, number]}
                    />
                    <pointLight
                      position={[-3, 3, 3]}
                      intensity={0.6}
                      color="#f59e0b"
                    />
                    <GachaBall
                      phase={phase === 'ball-shake' ? 'shake' : 'split'}
                      onSplitDone={handleSplitDone}
                    />
                    <Environment preset="city" />
                  </Canvas>
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
              className="h-auto flex-1 whitespace-nowrap rounded-2xl border-[1.5px] border-border-dark bg-card px-7 py-4 text-[17px] font-bold text-text transition-all hover:-translate-y-0.5 hover:border-text-light disabled:opacity-50 sm:flex-none"
            >
              Tirage x1
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-text/6 px-2.5 py-1 font-mono text-xs text-text-light">
                🪙 {pullCost}
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
                🪙 {pullCost * 10}
              </span>
            </Button>
          </div>
        </div>

        {/* Tirages récents */}
        <div className="order-3 flex min-h-0 flex-col self-stretch lg:justify-center">
          <RecentsPanel />
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
        <span className="hidden sm:inline">Sauter les animations</span>
      </button>

      {phase === 'pulling' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <p className="text-sm text-white/70">Tirage en cours…</p>
        </div>
      )}

      {phase === 'reveal-grid' && result && (
        <RevealGrid results={result.pulls} onAllRevealed={handleAllRevealed} />
      )}

      {phase === 'summary' && result && (
        <SummaryPanel
          results={result.pulls}
          tokensRemaining={result.tokensRemaining}
          xpGained={result.xpGained}
          dustGained={result.pulls.reduce((s, p) => s + p.dustEarned, 0)}
          onClose={handleClose}
          onPullAgain={handlePullAgain}
        />
      )}

      <RatesModal open={ratesOpen} onClose={() => setRatesOpen(false)} />
    </div>
  )
}
