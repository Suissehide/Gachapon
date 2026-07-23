import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
} from 'postprocessing'
import { useEffect, useMemo } from 'react'

import { useCanvasContextRecovery } from '../../../hooks/useCanvasContextRecovery.ts'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion.ts'
import { CapsuleScene } from './CapsuleScene'
import {
  type CapsuleAnim,
  type CapsuleTuning,
  createCapsuleAnim,
  type TeaseTier,
  tierConfig,
} from './capsuleConfig'

// Post-processing piloté par l'état d'animation : le bloom monte avec la
// charge (levier visuel n°1), l'aberration chromatique n'apparaît que sur les
// hauts paliers au pic de tension et au burst.
// Les effets sont instanciés à la main et montés via <primitive> : les
// wrappers de @react-three/postprocessing font un JSON.stringify de leurs
// props pour la mémoïsation, et sous React 19 `ref` est une prop normale —
// une ref d'effet (qui contient une scène three circulaire) y ferait planter
// tout re-render.
function PostFX({
  anim,
  teaseTier,
  tuning,
  reduced,
}: {
  anim: CapsuleAnim
  teaseTier: TeaseTier | null
  tuning: CapsuleTuning
  reduced: boolean
}) {
  const bloom = useMemo(
    () =>
      new BloomEffect({
        mipmapBlur: true,
        luminanceThreshold: 0.32,
        luminanceSmoothing: 0.25,
        intensity: 0.35,
      }),
    [],
  )
  const ca = useMemo(() => new ChromaticAberrationEffect(), [])
  const vignette = useMemo(
    () => new VignetteEffect({ eskil: false, offset: 0.25, darkness: 0.78 }),
    [],
  )

  useEffect(
    () => () => {
      bloom.dispose()
      ca.dispose()
      vignette.dispose()
    },
    [bloom, ca, vignette],
  )

  useFrame(() => {
    const cfg = tierConfig(teaseTier)
    bloom.intensity =
      (0.35 + anim.charge * cfg.bloom + anim.sting * 0.9 + anim.split * 2.2) *
      tuning.bloom
    const v = reduced
      ? 0
      : (cfg.rays > 0.5 ? anim.charge ** 2 * 0.0012 : 0) + anim.split * 0.0025
    ca.offset.set(v, v * 0.6)
  })

  return (
    <EffectComposer multisampling={0}>
      <primitive object={bloom} />
      <primitive object={ca} />
      <primitive object={vignette} />
    </EffectComposer>
  )
}

type Props = {
  teaseTier: TeaseTier | null
  onBurst: () => void
}

export function CapsuleStage({ teaseTier, onBurst }: Props) {
  const { canvasKey, canvasRef } = useCanvasContextRecovery()
  const reduced = usePrefersReducedMotion()
  const anim = useMemo(createCapsuleAnim, [])

  // Multiplicateurs de « feel », tunables en dev via le panneau leva
  const tuning = useControls('Capsule FX', {
    bloom: { value: 1, min: 0, max: 3, step: 0.05 },
    chargeSpeed: { value: 1, min: 0.3, max: 3, step: 0.05 },
    auraBoost: { value: 1, min: 0, max: 2.5, step: 0.05 },
    vibrateBoost: { value: 1, min: 0, max: 2.5, step: 0.05 },
    dolly: { value: 1, min: 0, max: 2, step: 0.05 },
  })

  return (
    <>
      <Leva hidden={!import.meta.env.DEV} collapsed />
      <Canvas
        key={canvasKey}
        ref={canvasRef}
        camera={{ position: [0, 0.3, 7], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 8, 5]} intensity={0.65} />
        <pointLight position={[0, 2.5, -3]} intensity={0.5} color="#8ea2ff" />
        <CapsuleScene
          anim={anim}
          teaseTier={teaseTier}
          onBurst={onBurst}
          reduced={reduced}
          tuning={tuning}
        />
        <PostFX
          anim={anim}
          teaseTier={teaseTier}
          tuning={tuning}
          reduced={reduced}
        />
      </Canvas>
    </>
  )
}
