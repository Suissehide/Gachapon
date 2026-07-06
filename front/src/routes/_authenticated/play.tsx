import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createFileRoute } from '@tanstack/react-router'
import { Coins } from 'lucide-react'
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'

import { GachaBall } from '../../components/machine/GachaBall'
import type { MachineStageHandle } from '../../components/machine/MachineStage'
import { MachineStage } from '../../components/machine/MachineStage'
import { RevealGrid } from '../../components/machine/reveal/RevealGrid'
import { LiveFeed } from '../../components/play/LiveFeed'
import { PlayHud } from '../../components/play/PlayHud'
import { Button } from '../../components/ui/button.tsx'
import { Switch } from '../../components/ui/switch.tsx'
import { apiUrl as API_URL } from '../../constants/config.constant.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast'
import { wsClient } from '../../lib/ws'
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

const PARTICLES = [
  { id: 'p0', top: '15%', left: '12%', delay: '0s', duration: '3.2s', size: 4 },
  { id: 'p1', top: '25%', left: '82%', delay: '0.6s', duration: '2.8s', size: 3 },
  { id: 'p2', top: '60%', left: '8%', delay: '1.2s', duration: '3.6s', size: 3 },
  { id: 'p3', top: '70%', left: '88%', delay: '0.3s', duration: '2.5s', size: 4 },
  { id: 'p4', top: '40%', left: '4%', delay: '1.8s', duration: '4s', size: 2 },
  { id: 'p5', top: '50%', left: '93%', delay: '0.9s', duration: '3s', size: 2 },
  { id: 'p6', top: '80%', left: '20%', delay: '2.1s', duration: '2.7s', size: 3 },
  { id: 'p7', top: '20%', left: '75%', delay: '1.5s', duration: '3.4s', size: 2 },
]

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
  { id: 'a10', top: '88%', left: '62%', delay: '2.7s', duration: '5.5s', size: 2 },
  { id: 'a11', top: '8%', left: '48%', delay: '1.1s', duration: '7.5s', size: 2 },
]

const SKIP_KEY = 'play.skipAnimations'

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page-level orchestrator coordinates multiple state machines and phase branches
function Play() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<PullBatchResult | null>(null)
  const pendingResult = useRef<PullBatchResult | null>(null)
  const [now, setNow] = useState(Date.now())
  const machineRef = useRef<MachineStageHandle>(null)
  const [skipAnimations, setSkipAnimations] = useState<boolean>(() => {
    if (typeof window === 'undefined') { return false }
    return localStorage.getItem(SKIP_KEY) === 'true'
  })

  // Refs that mirror reactive state so async callbacks / timers never see stale closures
  const phaseRef = useRef<Phase>('idle')
  const skipAnimationsRef = useRef(skipAnimations)
  const pullAbortedRef = useRef(false)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { skipAnimationsRef.current = skipAnimations }, [skipAnimations])

  const { data: balance, isLoading: balanceLoading } = useTokenBalance()
  const { mutate: pullBatchMutation, isPending: pullPending } = usePullBatch()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const { toast } = useToast()

  const tokens = balance?.tokens ?? 0
  const maxStock = balance?.maxStock ?? 5

  // Keep tokens in a ref so startPull can guard on it without being recreated on every balance tick
  const tokensRef = useRef(tokens)
  const pullPendingRef = useRef(pullPending)
  useEffect(() => { tokensRef.current = tokens }, [tokens])
  useEffect(() => { pullPendingRef.current = pullPending }, [pullPending])

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
        toast({ title: 'Tirage en cours…', message: 'Le serveur ne répond pas.', severity: TOAST_SEVERITY.ERROR })
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

  useEffect(() => {
    if (
      !balance?.nextTokenAt ||
      (balance.tokens ?? 0) >= (balance.maxStock ?? 5)
    ) {
      return
    }
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [balance?.nextTokenAt, balance?.tokens, balance?.maxStock])

  // startPull reads all guards from refs so it is safe to call via queueMicrotask / setTimeout
  // after a synchronous state update (e.g. setPhase('idle') in handlePullAgain).
  const startPull = useCallback(async (count: 1 | 10) => {
    if (tokensRef.current < count || phaseRef.current !== 'idle' || pullPendingRef.current) { return }
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
    if (pullAbortedRef.current) { return }
    await new Promise((res) => setTimeout(res, 600))
    if (pullAbortedRef.current) { return }
    setPhase('ball-shake')
    phaseRef.current = 'ball-shake'
    await new Promise((res) => setTimeout(res, 800))
    if (pullAbortedRef.current) { return }
    setPhase('ball-split')
    phaseRef.current = 'ball-split'
    // ball-split ends via onSplitDone callback → transition inside handleSplitDone
  }, [pullBatchMutation])

  // From the reveal grid's bottom-bar "Nouveau tirage x1/x10": skip machine anim,
  // keep the black backdrop up, and go straight to the ball animation.
  const handlePullAgain = useCallback(
    async (count: 1 | 10) => {
      if (tokensRef.current < count || pullPendingRef.current) {
        return
      }
      pullAbortedRef.current = false
      pendingResult.current = null

      // Skip mode: no ball, direct to reveal
      if (skipAnimationsRef.current) {
        setResult(null)
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

      // Full anim path — but skip machine-anim (we're already on the black backdrop)
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
  const isIdle = phase === 'idle'
  const showActions = phase === 'idle'
  const canPullX1 = tokens >= 1 && phase === 'idle' && !pullPending
  const canPullX10 = tokens >= 10 && phase === 'idle' && !pullPending

  const timeLeft =
    balance?.nextTokenAt && tokens < maxStock
      ? formatTimeLeft(balance.nextTokenAt, now)
      : null

  return (
    <div className="relative h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute -left-16 -top-16 h-80 w-80 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-8 -right-16 h-70 w-70 rounded-full bg-secondary/4 blur-[90px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle absolute rounded-full bg-primary/30"
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

      {/* Stage — only machine in the sub-window. Ball / flash / reveal live
       *  in a fullscreen overlay below so they cover the topbar too. */}
      <div className="absolute inset-0">
        {showMachine && (
          <div className="absolute inset-0 transition-opacity duration-300">
            <MachineStage ref={machineRef} />
          </div>
        )}
      </div>

      {/* Idle-only token counter — stays inside the /play sub-window */}
      {isIdle && (
        <div className="relative z-10 pt-10 flex flex-col items-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-text-light/40">
            Jetons
          </p>
          <div className="flex items-baseline gap-2">
            <Coins className="mb-1 h-7 w-7 text-primary" />
            <span
              className={`font-display text-8xl font-black leading-none tabular-nums transition-colors duration-300 ${
                tokens > 0 ? 'text-primary' : 'text-text-light/30'
              }`}
            >
              {balanceLoading ? '·' : tokens}
            </span>
            <span className="text-xl font-bold text-text-light/25">
              /{maxStock}
            </span>
          </div>
          <div className="mt-3 h-5">
            {timeLeft ? (
              <p className="text-xs text-text-light/40">
                +1 dans{' '}
                <span className="font-semibold text-text-light/60">
                  {timeLeft}
                </span>
              </p>
            ) : tokens >= maxStock ? (
              <p className="text-xs font-medium text-primary/50">
                Jetons au maximum
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="absolute bottom-24 left-0 right-0 z-10 flex flex-col items-center gap-4">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Switch renders a <button> — label click activates it via DOM proximity */}
          <label className="flex items-center gap-2 text-xs text-text-light/60">
            <Switch
              checked={skipAnimations}
              onCheckedChange={setSkipAnimations}
            />
            Sauter les animations
          </label>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => startPull(1)}
              disabled={!canPullX1}
              className={`relative h-auto rounded-full px-8 py-3.5 text-base font-black tracking-wide transition-all ${
                canPullX1
                  ? 'bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-muted text-text-light'
              }`}
            >
              ✦ Insérer x1 (1 jeton)
            </Button>
            <Button
              onClick={() => startPull(10)}
              disabled={!canPullX10}
              className={`relative h-auto rounded-full px-8 py-3.5 text-base font-black tracking-wide transition-all ${
                canPullX10
                  ? 'bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-muted text-text-light'
              }`}
            >
              ✦ Insérer x10 (10 jetons)
            </Button>
          </div>
        </div>
      )}

      <PlayHud />

      <div className={isIdle ? '' : 'invisible pointer-events-none'}>
        <LiveFeed />
      </div>

      {/* ── Fullscreen pull-cycle overlay ─────────────────────────────────
       *  Covers the entire viewport (including the topbar) so ball → flash
       *  → reveal → replay all happen against continuous black — no HUD
       *  flashes between phases. Mounted from ball-shake onwards, unmounted
       *  when the user closes the reveal or the pull errors back to idle. */}
      {inPullCycleFullscreen && (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black animate-in fade-in-0 duration-500">
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
    </div>
  )
}

function formatTimeLeft(isoDate: string, now = Date.now()): string {
  const diff = new Date(isoDate).getTime() - now
  if (diff <= 0) { return 'bientôt' }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) { return `${h}h${m.toString().padStart(2, '0')}` }
  if (m > 0) { return `${m}min${s.toString().padStart(2, '0')}` }
  return `${s}s`
}
