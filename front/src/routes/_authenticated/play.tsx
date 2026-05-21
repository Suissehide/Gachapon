import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronsRight, Ticket } from 'lucide-react'
import { type CSSProperties, useEffect, useRef, useState } from 'react'

import { CardReveal } from '../../components/machine/CardReveal'
import { GachaBall } from '../../components/machine/GachaBall'
import { MachineCarousel } from '../../components/machine/MachineCarousel'
import type { CarouselHandle } from '../../components/machine/MachineCarousel'
import { NoMachine } from '../../components/machine/type/NoMachine'
import { LiveFeed } from '../../components/play/LiveFeed'
import { PlayHud } from '../../components/play/PlayHud'
import { Button } from '../../components/ui/button.tsx'
import { apiUrl as API_URL } from '../../constants/config.constant.ts'
import { wsClient } from '../../lib/ws'
import type { PullResult } from '../../queries/useGacha'
import { usePull, useTokenBalance } from '../../queries/useGacha'
import { useOwnedMachines } from '../../queries/useShop'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

type Phase = 'idle' | 'machine-anim' | 'pulling' | 'ball' | 'opening' | 'revealed'

const PARTICLES = [
  { top: '15%', left: '12%', delay: '0s', duration: '3.2s', size: 4 },
  { top: '25%', left: '82%', delay: '0.6s', duration: '2.8s', size: 3 },
  { top: '60%', left: '8%', delay: '1.2s', duration: '3.6s', size: 3 },
  { top: '70%', left: '88%', delay: '0.3s', duration: '2.5s', size: 4 },
  { top: '40%', left: '4%', delay: '1.8s', duration: '4s', size: 2 },
  { top: '50%', left: '93%', delay: '0.9s', duration: '3s', size: 2 },
  { top: '80%', left: '20%', delay: '2.1s', duration: '2.7s', size: 3 },
  { top: '20%', left: '75%', delay: '1.5s', duration: '3.4s', size: 2 },
]

function Play() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pullResult, setPullResult] = useState<PullResult | null>(null)
  const pendingResult = useRef<PullResult | null>(null)
  const [now, setNow] = useState(Date.now())
  const carouselRef = useRef<CarouselHandle>(null)

  const { data: balance, isLoading: balanceLoading } = useTokenBalance()
  const { mutate: pullMutation, isPending: pullPending } = usePull()
  const { data: machinesData } = useOwnedMachines()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  const ownedMachineIds = machinesData?.machineIds ?? []
  const hasMachines = ownedMachineIds.length > 0

  // Sync auth store (topbar) with token balance query
  useEffect(() => {
    if (balance && user && user.tokens !== balance.tokens) {
      setUser({ ...user, tokens: balance.tokens })
    }
  }, [balance?.tokens])

  useEffect(() => {
    wsClient.connect(API_URL)
    return () => wsClient.disconnect()
  }, [])

  // Live timer tick — only when a token is regenerating
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

  // Quand la boule est ouverte : révélation de la carte après le lerp
  useEffect(() => {
    if (phase !== 'opening') {
      return
    }
    const timer = setTimeout(() => {
      setPullResult(pendingResult.current)
      setPhase('revealed')
    }, 700)
    return () => clearTimeout(timer)
  }, [phase])

  const tokens = balance?.tokens ?? 0
  const maxStock = balance?.maxStock ?? 5
  const carouselOwned = carouselRef.current?.isOwned ?? false
  const canPull = tokens > 0 && phase === 'idle' && !pullPending && hasMachines && carouselOwned

  const handlePull = async () => {
    if (!canPull || !carouselRef.current) return

    setPhase('machine-anim')
    await carouselRef.current.startAnimation()
    setPhase('ball')
  }

  const handleSkip = () => {
    if (!canPull) return
    setPhase('pulling')
    pullMutation(undefined, {
      onSuccess: (result) => {
        setPullResult(result)
        setPhase('revealed')
      },
      onError: () => setPhase('idle'),
    })
  }

  const handleBallClick = () => {
    if (phase !== 'ball' || pullPending) return
    pullMutation(undefined, {
      onSuccess: (result) => {
        pendingResult.current = result
        setPhase('opening')
      },
      onError: () => setPhase('idle'),
    })
  }

  const handleClose = () => {
    setPullResult(null)
    pendingResult.current = null
    setPhase('idle')
  }

  const showCanvas =
    phase === 'ball' ||
    phase === 'opening' ||
    phase === 'revealed'
  const showCarousel = phase === 'idle' || phase === 'machine-anim' || phase === 'pulling'
  const isIdle = phase === 'idle' || phase === 'pulling'

  const timeLeft =
    balance?.nextTokenAt && tokens < maxStock
      ? formatTimeLeft(balance.nextTokenAt, now)
      : null

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background">
      {/* Ambient background — radial spotlight on stage */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Stage spotlight */}
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[120px]" />
        {/* Corner glows */}
        <div className="absolute -left-16 -top-16 h-[320px] w-[320px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-8 -right-16 h-[280px] w-[280px] rounded-full bg-secondary/4 blur-[90px]" />
      </div>

      {/* Floating ambient particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
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

      {/* ── TOKEN COUNTER ── */}
      <div className="relative z-10 mb-2 flex flex-col items-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-text-light/40">
          Tickets
        </p>

        {/* Large number */}
        <div className="flex items-baseline gap-2">
          <Ticket className="mb-1 h-7 w-7 text-primary" />
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

        {/* Timer or full message */}
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
              Tickets au maximum
            </p>
          ) : null}
        </div>
      </div>

      {/* ── CENTER STAGE ── */}
      <div className="relative z-10 my-2">
        {showCanvas ? (
          <div className="relative h-[320px] w-[320px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <Canvas
              camera={{ position: [0, 0.3, 4], fov: 45 }}
              shadows
              gl={{ antialias: true }}
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
                interactive={phase === 'ball'}
                isOpening={
                  phase === 'opening' ||
                  phase === 'revealed'
                }
                onOpen={handleBallClick}
              />
              <Environment preset="city" />
            </Canvas>

            {phase === 'ball' && (
              <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-text-light/50 animate-in fade-in-0 duration-500">
                Clique sur la boule pour l'ouvrir
              </p>
            )}
          </div>
        ) : showCarousel ? (
          hasMachines ? (
            <MachineCarousel
              ref={carouselRef}
              ownedMachineIds={ownedMachineIds}
              hideNav={phase === 'machine-anim'}
            />
          ) : (
            <NoMachine />
          )
        ) : null}
      </div>

      {/* ── ACTIONS (idle / pulling) ── */}
      {isIdle && (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Button
            onClick={handlePull}
            disabled={!canPull}
            className={`relative h-auto rounded-full px-10 py-3.5 text-base font-black tracking-wide transition-all ${
              canPull
                ? 'bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0'
                : 'bg-muted text-text-light'
            }`}
          >
            {phase === 'pulling'
              ? 'Tirage en cours…'
              : tokens < 1
                ? 'Plus de tickets'
                : !hasMachines
                  ? 'Aucune machine'
                  : !carouselOwned
                    ? 'Machine verrouillée'
                    : '✦ Lancer (1 ticket)'}
          </Button>

          {canPull && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={!canPull}
              className="text-xs text-text-light/40 hover:text-text-light"
            >
              Passer l'animation
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Card reveal overlay */}
      <CardReveal
        result={pullResult}
        onClose={handleClose}
        isPulling={pullPending}
        onNewPull={() => {
          pullMutation(undefined, {
            onSuccess: (result) => {
              setPullResult(result)
              setPhase('revealed')
            },
            onError: () => setPhase('revealed'),
          })
        }}
      />

      {/* HUD — streak / level / quests */}
      <PlayHud />

      {/* Live feed sidebar — hidden during pull to avoid spoilers */}
      <div className={isIdle ? '' : 'invisible pointer-events-none'}>
        <LiveFeed />
      </div>
    </div>
  )
}

function formatTimeLeft(isoDate: string, now = Date.now()): string {
  const diff = new Date(isoDate).getTime() - now
  if (diff <= 0) {
    return 'bientôt'
  }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, '0')}`
  }
  if (m > 0) {
    return `${m}min${s.toString().padStart(2, '0')}`
  }
  return `${s}s`
}
