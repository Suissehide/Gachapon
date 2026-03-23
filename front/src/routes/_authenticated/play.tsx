import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronsRight, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { CardReveal } from '../../components/machine/CardReveal'
import { GachaBall } from '../../components/machine/GachaBall'
import { Button } from '../../components/ui/button.tsx'
import { apiUrl as API_URL } from '../../constants/config.constant.ts'
import { wsClient } from '../../lib/ws'
import type { PullResult } from '../../queries/useGacha'
import { usePull, useTokenBalance } from '../../queries/useGacha'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

type Phase = 'idle' | 'pulling' | 'ball' | 'opening' | 'open' | 'revealed'

function Play() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pullResult, setPullResult] = useState<PullResult | null>(null)
  const pendingResult = useRef<PullResult | null>(null)

  const { data: balance, isLoading: balanceLoading } = useTokenBalance()
  const { mutate: pullMutation, isPending: pullPending } = usePull()

  useEffect(() => {
    wsClient.connect(API_URL)
    return () => wsClient.disconnect()
  }, [])

  const tokens = balance?.tokens ?? 0
  const maxStock = balance?.maxStock ?? 5
  const canPull = tokens > 0 && phase === 'idle' && !pullPending

  // Start a pull and show the ball when the result arrives
  const handlePull = () => {
    if (!canPull) {
      return
    }
    setPhase('pulling')
    pullMutation(undefined, {
      onSuccess: (result) => {
        pendingResult.current = result
        setPhase('ball')
      },
      onError: () => {
        setPhase('idle')
      },
    })
  }

  // Skip animation: pull and directly show the card
  const handleSkip = () => {
    if (!canPull) {
      return
    }
    setPhase('pulling')
    pullMutation(undefined, {
      onSuccess: (result) => {
        setPullResult(result)
        setPhase('revealed')
      },
      onError: () => {
        setPhase('idle')
      },
    })
  }

  // User clicks the ball → open it, wait for animation, then show open state
  const handleBallClick = () => {
    if (phase !== 'ball') {
      return
    }
    setPhase('opening')
    setTimeout(() => setPhase('open'), 1600)
  }

  // User clicks "Récupérer" → flash then reveal card
  const handleReveal = () => {
    if (phase !== 'open') {
      return
    }
    setPhase('opening') // reuse flash
    setTimeout(() => {
      setPullResult(pendingResult.current)
      setPhase('revealed')
    }, 650)
  }

  const handleClose = () => {
    setPullResult(null)
    pendingResult.current = null
    setPhase('idle')
  }

  const showCanvas =
    phase === 'ball' ||
    phase === 'opening' ||
    phase === 'open' ||
    phase === 'revealed'
  const showFlash = phase === 'opening'

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[110px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[350px] w-[350px] rounded-full bg-secondary/6 blur-[100px]" />
      </div>

      {/* Ball open flash overlay */}
      {showFlash && (
        <div className="ball-open-flash fixed inset-0 z-30 bg-white/60" />
      )}

      {/* Token counter */}
      <div className="relative z-10 mb-6 flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2">
        <Ticket className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-primary">
          {balanceLoading ? '…' : `${tokens} / ${maxStock}`}
        </span>
        {balance?.nextTokenAt && tokens < maxStock && (
          <span className="text-xs text-text-light">
            · prochain dans {formatTimeLeft(balance.nextTokenAt)}
          </span>
        )}
      </div>

      {/* 3D Canvas — mounted for all ball phases to avoid GachaBall re-mount */}
      {showCanvas ? (
        <div className="relative z-10 h-[320px] w-[320px] animate-in zoom-in-75 duration-300">
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
            <pointLight position={[-3, 3, 3]} intensity={0.6} color="#f59e0b" />
            <GachaBall
              interactive={phase === 'ball'}
              isOpening={phase === 'opening' || phase === 'open'}
              onOpen={handleBallClick}
            />
            <Environment preset="city" />
          </Canvas>

          {/* Hint */}
          {phase === 'ball' && (
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-text-light/60 animate-in fade-in-0 duration-500">
              Clique sur la boule pour l'ouvrir
            </p>
          )}

          {/* Open state — reveal button */}
          {phase === 'open' && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center animate-in fade-in-0 duration-500">
              <Button onClick={handleReveal} className="rounded-full px-6">
                Récupérer la carte ✨
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="h-[320px] w-[320px]" />
      )}

      {/* Idle / pulling state UI */}
      {(phase === 'idle' || phase === 'pulling') && (
        <>
          {/* Play button */}
          <Button
            onClick={handlePull}
            disabled={!canPull}
            className="relative mt-6 rounded-full px-8 h-auto py-2 text-md font-semibold tracking-wide bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0"
          >
            {phase === 'pulling'
              ? 'Tirage…'
              : tokens < 1
                ? 'Pas de tokens'
                : 'Jouer (1 token)'}
          </Button>

          {/* Skip button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={!canPull}
            className="relative z-10 mt-4 text-xs text-text-light/50 hover:text-text-light"
          >
            Passer l'animation
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </>
      )}

      {/* Card reveal overlay */}
      <CardReveal result={pullResult} onClose={handleClose} />
    </div>
  )
}

function formatTimeLeft(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) {
    return 'bientôt'
  }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
}
