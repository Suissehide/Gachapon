import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronsRight, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../components/ui/button.tsx'
import { CardReveal } from '../../components/machine/CardReveal'
import type { ClawMachineHandle } from '../../components/machine/ClawMachine'
import { ClawMachine } from '../../components/machine/ClawMachine'
import { wsClient } from '../../lib/ws'
import type { PullResult } from '../../queries/useGacha'
import { usePull, useTokenBalance } from '../../queries/useGacha'

import { apiUrl as API_URL } from '../../constants/config.constant.ts'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

function Play() {
  const machineRef = useRef<ClawMachineHandle>(null)
  const [pullResult, setPullResult] = useState<PullResult | null>(null)
  const [isPulling, setIsPulling] = useState(false)

  const { data: balance, isLoading: balanceLoading } = useTokenBalance()
  const { mutate: pullMutation, isPending: pullPending } = usePull()

  // Connecter le WebSocket au montage (pour les futurs events temps-réel)
  useEffect(() => {
    wsClient.connect(API_URL)
    return () => wsClient.disconnect()
  }, [])

  const handlePull = () => {
    if (isPulling || pullPending || !balance || balance.tokens < 1) {
      return
    }
    setIsPulling(true)

    // Lancer l'animation ET le pull en parallèle
    const animationPromise =
      machineRef.current?.startAnimation() ?? Promise.resolve()

    pullMutation(undefined, {
      onSuccess: (result) => {
        // Utiliser la réponse HTTP comme source de vérité (plus fiable que le WS)
        setPullResult(result)
      },
      onError: () => {
        // animationPromise.finally handles setIsPulling(false) on error
      },
    })

    // Attendre la fin de l'animation avant d'autoriser un nouveau tirage
    animationPromise.finally(() => setIsPulling(false))
  }

  const tokens = balance?.tokens ?? 0
  const maxStock = balance?.maxStock ?? 5
  const canPull = tokens > 0 && !isPulling && !pullPending

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[110px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[350px] w-[350px] rounded-full bg-secondary/6 blur-[100px]" />
      </div>

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

      {/* Canvas 3D */}
      <div className="relative z-10 h-[420px] w-[320px] rounded-2xl overflow-hidden border border-border shadow-2xl">
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 50 }}
          shadows
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024] as [number, number]}
          />
          <ClawMachine ref={machineRef} />
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* Bouton Jouer */}
      <Button
        onClick={handlePull}
        disabled={!canPull}
        className="relative z-10 mt-6 rounded-full px-10 h-auto py-4 text-lg font-black tracking-wide bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0"
      >
        {isPulling
          ? 'Tirage…'
          : tokens < 1
            ? 'Pas de tokens'
            : 'Jouer (1 token)'}
      </Button>

      {/* Overlay révélation carte */}
      <CardReveal result={pullResult} onClose={() => setPullResult(null)} />
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
