import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import gsap from 'gsap'
import { Leva, useControls } from 'leva'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  ShockWaveEffect,
  VignetteEffect,
} from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { useCanvasContextRecovery } from '../../../hooks/useCanvasContextRecovery.ts'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion.ts'
import { CapsuleScene } from './CapsuleScene'
import {
  type CapsuleAnim,
  type CapsuleKind,
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
  // Onde de choc de l'impact astral : distorsion radiale de l'image entière,
  // déclenchée une fois quand `impact` démarre.
  const camera = useThree((s) => s.camera)
  const shockwave = useMemo(
    () =>
      new ShockWaveEffect(camera, new THREE.Vector3(0, 0, 0.6), {
        speed: 1.4,
        maxRadius: 1.2,
        waveSize: 0.16,
        amplitude: 0.07,
      }),
    [camera],
  )
  const shockFired = useRef(false)

  useEffect(
    () => () => {
      bloom.dispose()
      ca.dispose()
      vignette.dispose()
      shockwave.dispose()
    },
    [bloom, ca, vignette, shockwave],
  )

  useFrame(() => {
    const cfg = tierConfig(teaseTier)
    const meteor = anim.fall > 0 ? (1 - anim.fall) ** 3 : 0
    bloom.intensity =
      (0.35 +
        anim.charge * cfg.bloom +
        anim.sting * 0.9 +
        anim.split * 2.2 +
        meteor * 0.6 +
        anim.hitstop * 1.4) *
      tuning.bloom
    const v = reduced
      ? 0
      : (cfg.rays > 0.5 ? anim.charge ** 2 * 0.0012 : 0) +
        anim.split * 0.0025 +
        meteor * 0.0025 +
        anim.hitstop * 0.006 +
        (anim.impact > 0 ? (1 - anim.impact) ** 2 * 0.005 : 0)
    ca.offset.set(v, v * 0.6)
    if (anim.impact > 0 && !shockFired.current && !reduced) {
      shockFired.current = true
      shockwave.explode()
    }
  })

  return (
    <EffectComposer multisampling={0}>
      <primitive object={bloom} />
      <primitive object={shockwave} />
      <primitive object={ca} />
      <primitive object={vignette} />
    </EffectComposer>
  )
}

type Props = {
  teaseTier: TeaseTier | null
  onBurst: () => void
  capsuleKind?: CapsuleKind
  /** Ralenti de toute la chorégraphie gsap (1 = vitesse normale), pour régler
   *  la séquence à l'œil : labo capsule et sélecteur de dev du tirage. */
  timeScale?: number
}

export function CapsuleStage({
  teaseTier,
  onBurst,
  capsuleKind = 'classic',
  timeScale = 1,
}: Props) {
  const { canvasKey, canvasRef } = useCanvasContextRecovery()
  const reduced = usePrefersReducedMotion()
  const anim = useMemo(createCapsuleAnim, [])

  useEffect(() => {
    gsap.globalTimeline.timeScale(timeScale)
    return () => {
      gsap.globalTimeline.timeScale(1)
    }
  }, [timeScale])

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
          capsuleKind={capsuleKind}
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
