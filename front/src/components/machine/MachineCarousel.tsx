import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

import { Button } from '../ui/button'
import { MACHINE_REGISTRY } from './machineRegistry'
import type { MachineHandle, MachineDefinition } from './machineRegistry'

const SELECTED_MACHINE_KEY = 'gachapon:selectedMachine'

type Props = {
  ownedMachineIds: string[]
  hideNav?: boolean
  onBuyMachine?: (machine: MachineDefinition) => void
  onSelectionChange?: (isOwned: boolean) => void
}

export type CarouselHandle = {
  startAnimation: () => Promise<void>
}

export const MachineCarousel = forwardRef<CarouselHandle, Props>(
  ({ ownedMachineIds, hideNav, onBuyMachine, onSelectionChange }, ref) => {
    const machines = MACHINE_REGISTRY
    const [index, setIndex] = useState(() => {
      const saved = localStorage.getItem(SELECTED_MACHINE_KEY)
      if (saved) {
        const idx = machines.findIndex((m) => m.id === saved)
        if (idx >= 0) return idx
      }
      const firstOwned = machines.findIndex((m) => ownedMachineIds.includes(m.id))
      return firstOwned >= 0 ? firstOwned : 0
    })
    const [fade, setFade] = useState(true)
    const machineRef = useRef<MachineHandle>(null)

    const current = machines[index]
    const isOwned = ownedMachineIds.includes(current.id)

    // Notify parent of selection changes
    useEffect(() => {
      onSelectionChange?.(isOwned)
    }, [isOwned, onSelectionChange])

    // Save selection to localStorage
    useEffect(() => {
      localStorage.setItem(SELECTED_MACHINE_KEY, current.id)
    }, [current.id])

    const navigate = (dir: -1 | 1) => {
      setFade(false)
      setTimeout(() => {
        setIndex((prev) => (prev + dir + machines.length) % machines.length)
        setFade(true)
      }, 150)
    }

    useImperativeHandle(ref, () => ({
      async startAnimation() {
        if (!machineRef.current || !isOwned) return
        await machineRef.current.startAnimation()
      },
    }))

    const MachineComponent = current.component

    return (
      <div className="relative flex h-[320px] w-[320px] items-center justify-center">
        {/* Navigation arrows — above canvas */}
        {!hideNav && machines.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-surface/60 p-1.5 text-text-light/60 backdrop-blur transition hover:bg-surface hover:text-text"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-surface/60 p-1.5 text-text-light/60 backdrop-blur transition hover:bg-surface hover:text-text"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Machine canvas */}
        <div
          className="h-full w-full transition-opacity duration-150"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {isOwned ? (
            <Canvas
              camera={{ position: [0, 0.3, 3.5], fov: 45 }}
              shadows
              gl={{ antialias: true }}
              style={{ pointerEvents: 'none' }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
              <pointLight position={[-3, 3, 3]} intensity={0.6} color="#f59e0b" />
              <MachineComponent ref={machineRef} />
              <Environment preset="city" />
            </Canvas>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl bg-surface/50 backdrop-blur">
                <div className="flex h-32 w-24 items-center justify-center rounded-xl bg-muted/60">
                  <current.icon className="h-12 w-12 text-text-light/20" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-10 w-10 text-text-light/40" />
                </div>
              </div>
              <p className="text-sm font-bold text-text-light/60">{current.name}</p>
              {onBuyMachine && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onBuyMachine(current)}
                  className="text-xs"
                >
                  Acheter — {current.price.toLocaleString('fr-FR')} dust
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination dots */}
        {!hideNav && machines.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {machines.map((m, i) => {
              const owned = ownedMachineIds.includes(m.id)
              const active = i === index
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (i !== index) {
                      setFade(false)
                      setTimeout(() => {
                        setIndex(i)
                        setFade(true)
                      }, 150)
                    }
                  }}
                  className={`flex h-3 w-3 items-center justify-center rounded-full transition ${
                    active
                      ? 'bg-primary'
                      : owned
                        ? 'bg-text-light/30'
                        : 'bg-text-light/10'
                  }`}
                >
                  {!owned && <Lock className="h-1.5 w-1.5 text-text-light/40" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  },
)

MachineCarousel.displayName = 'MachineCarousel'
