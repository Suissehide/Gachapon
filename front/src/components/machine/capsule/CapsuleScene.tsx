import { Sparkles } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { ChargeSparks } from './ChargeSparks'
import { capsuleAudio } from './capsuleAudio'
import {
  type CapsuleAnim,
  type CapsuleTuning,
  type TeaseTier,
  tierConfig,
} from './capsuleConfig'
import auraFrag from './shaders/aura.frag.glsl'
import auraVert from './shaders/aura.vert.glsl'
import groundFrag from './shaders/ground.frag.glsl'

const BALL_SCALE = 1.05

// Profil d'un à-coup de shake : montée sèche vers l'extrême (18 %), puis
// ressort amorti qui déborde de l'autre côté et s'annule pile à p = 1.
function burstProfile(p: number): number {
  const ATTACK = 0.18
  if (p < ATTACK) {
    const a = p / ATTACK
    return 1 - (1 - a) ** 2
  }
  const r = (p - ATTACK) / (1 - ATTACK)
  return Math.cos(r * Math.PI * 2.5) * Math.E ** (-2.2 * r)
}

type BurstTarget = { rx: number; ry: number; rz: number }

function randomBurstTarget(alt: number): BurstTarget {
  const sign = () => (Math.random() < 0.5 ? -1 : 1)
  return {
    rx: (0.4 + Math.random() * 0.4) * sign(),
    ry: (0.5 + Math.random() * 0.5) * sign(),
    rz: (0.4 + Math.random() * 0.4) * (alt % 2 === 0 ? 1 : -1),
  }
}

type Props = {
  anim: CapsuleAnim
  teaseTier: TeaseTier | null
  onBurst: () => void
  reduced: boolean
  tuning: CapsuleTuning
}

// Chorégraphie complète de la capsule : pop d'apparition → 3 à-coups de
// shake → charge/vibration (durée & intensité pilotées par le palier de
// rareté teasé) → inhale (aspiration) → burst. Orchestrée par gsap ; le
// jitter procédural par frame vit dans useFrame et lit `anim`.
export function CapsuleScene({
  anim,
  teaseTier,
  onBurst,
  reduced,
  tuning,
}: Props) {
  const camera = useThree((s) => s.camera)

  const groupRef = useRef<THREE.Group>(null)
  const topRef = useRef<THREE.Group>(null)
  const bottomRef = useRef<THREE.Group>(null)
  const seamRef = useRef<THREE.Mesh>(null)
  const bottomMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const seamMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lidMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const curColor = useMemo(() => new THREE.Color(tierConfig(null).color), [])
  const curOuter = useMemo(
    () => new THREE.Color(tierConfig(null).colorOuter),
    [],
  )
  const curShell = useMemo(() => new THREE.Color(tierConfig(null).shell), [])
  const targetColor = useRef(new THREE.Color(tierConfig(null).color))
  const targetOuter = useRef(new THREE.Color(tierConfig(null).colorOuter))
  const targetShell = useRef(new THREE.Color(tierConfig(null).shell))
  const neutralColor = useMemo(
    () => new THREE.Color(tierConfig(null).color),
    [],
  )
  const neutralOuter = useMemo(
    () => new THREE.Color(tierConfig(null).colorOuter),
    [],
  )
  const neutralShell = useMemo(
    () => new THREE.Color(tierConfig(null).shell),
    [],
  )
  const tmpColor = useMemo(() => new THREE.Color(), [])

  const auraUniforms = useMemo(
    () => ({
      uColor: { value: curColor },
      uColorOuter: { value: curOuter },
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uRays: { value: 0 },
      uHueCycle: { value: 0 },
      uContract: { value: 0 },
    }),
    [curColor, curOuter],
  )
  const groundUniforms = useMemo(
    () => ({
      uColor: { value: curColor },
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    }),
    [curColor],
  )

  const tierRef = useRef<TeaseTier | null>(teaseTier)
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced
  const onBurstRef = useRef(onBurst)
  onBurstRef.current = onBurst

  const burstTargetRef = useRef<BurstTarget>({ rx: 0, ry: 0, rz: 0 })
  const burstIdxRef = useRef(0)
  const chargeTweenRef = useRef<gsap.core.Tween | null>(null)
  const notifiedRef = useRef(false)
  const stingFiredRef = useRef(false)

  const getSparkRatio = useMemo(
    () => () => tierConfig(tierRef.current).sparkRatio,
    [],
  )

  useEffect(() => {
    const durScale = () =>
      (reducedRef.current ? 0.6 : 1) / tuningRef.current.chargeSpeed

    const startInhale = () => {
      capsuleAudio.stopCharge()
      capsuleAudio.inhale()
      const cfg = tierConfig(tierRef.current)
      gsap.fromTo(
        anim,
        { inhale: 0 },
        {
          inhale: 1,
          duration: cfg.inhaleDuration,
          ease: 'power3.in',
          onComplete: doBurst,
        },
      )
    }

    const doBurst = () => {
      const tier = tierRef.current ?? 0
      capsuleAudio.burst(tier)
      gsap.fromTo(
        anim,
        { split: 0 },
        { split: 1, duration: 0.34, ease: 'power2.out' },
      )
      if (!reducedRef.current) {
        gsap.fromTo(
          anim,
          { camShake: 1 },
          { camShake: 0, duration: 0.55, ease: 'power2.out' },
        )
        gsap.to(anim, { camZ: '+=0.8', duration: 0.2, ease: 'power2.out' })
      }
      delayedRef = gsap.delayedCall(0.1, () => {
        if (!notifiedRef.current) {
          notifiedRef.current = true
          onBurstRef.current()
        }
      })
    }

    const startCharge = () => {
      const cfg = tierConfig(tierRef.current)
      capsuleAudio.startCharge()
      chargeTweenRef.current = gsap.fromTo(
        anim,
        { charge: 0 },
        {
          charge: 1,
          duration: cfg.chargeDuration * durScale(),
          ease: 'power2.in',
          onComplete: startInhale,
        },
      )
      gsap.to(anim, {
        camZ: 7 - 1.4 * tuningRef.current.dolly,
        duration: cfg.chargeDuration * durScale(),
        ease: 'sine.inOut',
      })
    }

    let delayedRef: gsap.core.Tween | null = null
    const tl = gsap.timeline()
    tl.set(anim, {
      pop: 0,
      burstT: 0,
      charge: 0,
      inhale: 0,
      split: 0,
      sting: 0,
      camZ: 7,
      camShake: 0,
    })
    tl.to(anim, { pop: 1, duration: 0.45, ease: 'elastic.out(1.1, 0.5)' })
    for (let i = 0; i < 3; i++) {
      tl.call(() => {
        burstTargetRef.current = randomBurstTarget(burstIdxRef.current)
        burstIdxRef.current++
        capsuleAudio.clack()
      })
      tl.fromTo(
        anim,
        { burstT: 0 },
        { burstT: 1, duration: 0.42, ease: 'none' },
      )
      tl.to({}, { duration: 0.14 })
    }
    tl.call(startCharge)
    if (reducedRef.current) {
      tl.timeScale(1.4)
    }

    return () => {
      tl.kill()
      delayedRef?.kill()
      gsap.killTweensOf(anim)
      chargeTweenRef.current = null
      capsuleAudio.stopAll()
    }
  }, [anim])

  // La couleur ne se révèle qu'au build-up de charge (voir useFrame), jamais
  // à l'arrivée du réseau. Ici : mémoriser le palier + étirer la charge en vol.
  useEffect(() => {
    tierRef.current = teaseTier
    const cfg = tierConfig(teaseTier)
    targetColor.current.set(cfg.color)
    targetOuter.current.set(cfg.colorOuter)
    targetShell.current.set(cfg.shell)
    if (teaseTier === null) {
      return
    }
    const charge = chargeTweenRef.current
    if (charge?.isActive()) {
      const durScale =
        (reducedRef.current ? 0.6 : 1) / tuningRef.current.chargeSpeed
      const wanted = cfg.chargeDuration * durScale
      if (wanted > charge.duration()) {
        charge.duration(wanted)
      }
    }
  }, [teaseTier])

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: boucle de rendu — chaque bloc lit `anim`, la découper coûterait des allocations par frame
  useFrame((state, delta) => {
    const group = groupRef.current
    const top = topRef.current
    const bottom = bottomRef.current
    if (!group || !top || !bottom) {
      return
    }
    const t = state.clock.elapsedTime
    const cfg = tierConfig(tierRef.current)
    const c = anim.charge
    const reducedAmp = reducedRef.current ? 0.3 : 1

    // Build-up de la révélation : la couleur du palier n'apparaît QUE pendant
    // la charge (30 % → 85 %), même si le résultat réseau est connu depuis le
    // début — l'anticipation monte au lieu d'être spoilée à la 1ère frame.
    const rawReveal =
      tierRef.current === null ? 0 : THREE.MathUtils.smoothstep(c, 0.3, 0.85)
    const k = 1 - Math.exp(-5 * delta)
    tmpColor.copy(neutralColor).lerp(targetColor.current, rawReveal)
    curColor.lerp(tmpColor, k)
    tmpColor.copy(neutralOuter).lerp(targetOuter.current, rawReveal)
    curOuter.lerp(tmpColor, k)
    tmpColor.copy(neutralShell).lerp(targetShell.current, rawReveal)
    curShell.lerp(tmpColor, k)

    if (
      !stingFiredRef.current &&
      tierRef.current !== null &&
      rawReveal > 0.45
    ) {
      stingFiredRef.current = true
      gsap
        .timeline()
        .to(anim, { sting: 1, duration: 0.12, ease: 'power1.out' })
        .to(anim, { sting: 0, duration: 0.7, ease: 'power2.out' })
      if (tierRef.current >= 1) {
        capsuleAudio.sting(tierRef.current)
      }
    }

    group.rotation.set(0, 0, 0)
    group.position.set(0, 0, 0)
    let scale = BALL_SCALE * anim.pop

    if (anim.burstT > 0 && anim.burstT < 1) {
      const kb = burstProfile(anim.burstT)
      const target = burstTargetRef.current
      group.rotation.x = target.rx * kb
      group.rotation.y = target.ry * kb
      group.rotation.z = target.rz * kb
      group.position.x = target.rz * kb * 0.12
    }

    if (c > 0) {
      const amp =
        cfg.vibrateAmp * tuningRef.current.vibrateBoost * c * c * reducedAmp
      const f = 18 + c * 34
      group.position.x += Math.sin(t * f) * amp
      group.position.y += Math.sin(t * f * 1.17 + 1.3) * amp
      group.rotation.z += Math.sin(t * f * 0.89 + 2.1) * amp * 0.9
      const pulse = 1 + Math.sin(t * (6 + c * 22)) * 0.015 * (1 + c * 2)
      scale *= (1 + c * 0.06) * pulse
    }

    scale *= 1 - anim.inhale * 0.14
    group.position.y -= anim.inhale * 0.06
    group.scale.setScalar(Math.max(0.0001, scale))

    const split = anim.split
    top.position.y = split * 3.2
    top.rotation.z = split * 0.8
    bottom.position.y = -split * 3.2
    bottom.rotation.z = -split * 0.5
    const fadeAlpha = split < 0.55 ? 1 : 1 - (split - 0.55) / 0.45
    if (seamRef.current) {
      seamRef.current.visible = split <= 0
    }

    const darken = 1 - anim.inhale * 0.7
    const bottomMat = bottomMatRef.current
    if (bottomMat) {
      bottomMat.color.copy(curShell)
      bottomMat.emissive.copy(curColor)
      bottomMat.emissiveIntensity = (0.12 + c * 1.6 + anim.sting * 1.1) * darken
      bottomMat.transparent = split > 0
      bottomMat.opacity = fadeAlpha
    }
    if (seamMatRef.current) {
      seamMatRef.current.color.copy(curShell)
    }
    const lidMat = lidMatRef.current
    if (lidMat) {
      lidMat.emissive.copy(curColor)
      lidMat.emissiveIntensity = c * 1.4 * darken
      lidMat.opacity = 0.42 * fadeAlpha
    }
    const coreMat = coreMatRef.current
    if (coreMat) {
      coreMat.emissive.copy(curColor)
      coreMat.emissiveIntensity =
        (0.35 + c * 4.2 + anim.sting * 2.5) * darken + split * 7
      coreMat.transparent = split > 0
      coreMat.opacity = fadeAlpha
    }
    const light = lightRef.current
    if (light) {
      light.color.copy(curColor)
      light.intensity = (c * 6 + anim.sting * 3) * darken + split * 18
    }

    auraUniforms.uTime.value = t
    auraUniforms.uIntensity.value =
      (0.25 +
        c * cfg.aura * 1.9 * tuningRef.current.auraBoost +
        anim.sting * 1.2) *
        (1 - anim.inhale * 0.35) +
      split * 2.4
    auraUniforms.uRays.value = cfg.rays * (0.3 + 0.7 * c) * rawReveal
    auraUniforms.uHueCycle.value = cfg.hueCycle && rawReveal > 0.5 ? 1 : 0
    auraUniforms.uContract.value = anim.inhale
    groundUniforms.uTime.value = t
    groundUniforms.uIntensity.value = c * 0.9 + split * 1.4

    // Caméra : dolly gsap + secousse au burst
    const shake = anim.camShake * 0.12 * reducedAmp
    camera.position.z = anim.camZ + Math.sin(t * 61) * shake
    camera.position.x = Math.sin(t * 53) * shake
    camera.position.y = 0.3 + Math.sin(t * 47) * shake
    camera.lookAt(0, 0, 0)

    // Le whir de charge suit la progression réelle
    capsuleAudio.setChargeLevel(c)
  })

  return (
    <>
      {/* Aura-tease plein cadre derrière la capsule */}
      <mesh position={[0, 0, -1.8]}>
        <planeGeometry args={[8.5, 8.5]} />
        <shaderMaterial
          vertexShader={auraVert}
          fragmentShader={auraFrag}
          uniforms={auraUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Pulse au sol */}
      <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <shaderMaterial
          vertexShader={auraVert}
          fragmentShader={groundFrag}
          uniforms={groundUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Poussière ambiante discrète pour la profondeur */}
      <Sparkles
        count={50}
        scale={[7, 5, 4]}
        size={2.2}
        speed={0.25}
        opacity={0.3}
      />

      <ChargeSparks anim={anim} color={curColor} getRatio={getSparkRatio} />

      {/* Lumière interne teintée rareté — éclaire la scène à la charge */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0.4]}
        intensity={0}
        distance={9}
      />

      <group ref={groupRef} scale={0.0001}>
        {/* Cœur lumineux visible à travers le couvercle — cible n°1 du bloom */}
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            ref={coreMatRef}
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.35}
            roughness={0.4}
          />
        </mesh>

        {/* ── Couvercle translucide ── */}
        <group ref={topRef}>
          <mesh renderOrder={1}>
            <sphereGeometry
              args={[0.85, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshPhysicalMaterial
              ref={lidMatRef}
              color="#cfe6f5"
              roughness={0.12}
              metalness={0}
              opacity={0.42}
              transparent
              clearcoat={0.8}
              clearcoatRoughness={0.12}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* ── Coque basse ── */}
        <group ref={bottomRef}>
          <mesh>
            <sphereGeometry
              args={[0.85, 64, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
            />
            <meshStandardMaterial
              ref={bottomMatRef}
              color="#e6e2ee"
              roughness={0.55}
              metalness={0.05}
              emissive="#cdd5e4"
              emissiveIntensity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh ref={seamRef}>
            <cylinderGeometry args={[0.862, 0.862, 0.12, 64, 1, true]} />
            <meshStandardMaterial
              ref={seamMatRef}
              color="#e6e2ee"
              roughness={0.6}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>
    </>
  )
}
