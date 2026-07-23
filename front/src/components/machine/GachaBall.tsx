import { useFrame } from '@react-three/fiber'
import { type MutableRefObject, useMemo, useRef } from 'react'
import * as THREE from 'three'

const BALL_COLORS = [
  '#e63946',
  '#1d88c4',
  '#2a9d8f',
  '#f4a261',
  '#7b2d8b',
  '#74b816',
  '#e91e8c',
  '#00b4d8',
]

// Shake = 3 à-coups de rotation aléatoires façon Pokéball : montée sèche vers
// l'extrême puis ressort amorti (la boule repasse par le centre, déborde de
// l'autre côté et se pose), mini pause, et on recommence — 3 fois avant la
// vibration. Le timer de phase côté play.tsx (1700 ms) doit couvrir
// SHAKE_DURATION.
const SHAKE_BURSTS = 3
const SHAKE_BURST_ACTIVE = 0.42 // seconds — snap + oscillation amortie
const SHAKE_BURST_PAUSE = 0.14 // seconds — repos complet entre deux à-coups
const SHAKE_DURATION = SHAKE_BURSTS * (SHAKE_BURST_ACTIVE + SHAKE_BURST_PAUSE)
const VIBRATE_DURATION = 0.9 // seconds
// Short violent burst — the white flash fires at the same moment and covers it.
const SPLIT_DURATION = 0.3 // seconds
const WHITE = new THREE.Color('#ffffff')
const BALL_SCALE = 1.05

type ShakeSeed = {
  freq: number
  phaseX: number
  phaseY: number
  phaseZ: number
  dir: number
}

type ShakeBurst = { rx: number; ry: number; rz: number }

// Profil d'un à-coup façon Pokéball, k(p) avec p ∈ [0,1] :
// 18 % de montée sèche vers l'extrême (ease-out), puis ressort amorti — la
// boule repasse par le centre, déborde à ~40 % de l'autre côté, petit rebond,
// et finit posée pile à zéro (cos s'annule à p = 1).
function burstProfile(p: number): number {
  const ATTACK = 0.18
  if (p < ATTACK) {
    const a = p / ATTACK
    return 1 - (1 - a) ** 2
  }
  const r = (p - ATTACK) / (1 - ATTACK)
  return Math.cos(r * Math.PI * 2.5) * Math.E ** (-2.2 * r)
}

// Trois à-coups de rotation : à chaque à-coup la boule claque vers son
// orientation cible puis oscille en ressort amorti jusqu'au repos, marque une
// pause complète, et recommence. Un léger déport latéral couplé au tilt Z
// donne l'impression qu'elle bascule sur son poids. La lueur monte doucement
// sur toute la durée pour préparer la vibration. Après le 3e à-coup la boule
// reste au repos jusqu'au changement de phase.
function runShake(
  t: number,
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial | null,
  bursts: ShakeBurst[],
) {
  const slotLength = SHAKE_BURST_ACTIVE + SHAKE_BURST_PAUSE
  const slot = Math.min(bursts.length - 1, Math.floor(t / slotLength))
  const tin = t - slot * slotLength
  const target = bursts[slot]

  if (tin < SHAKE_BURST_ACTIVE) {
    const k = burstProfile(tin / SHAKE_BURST_ACTIVE)
    group.rotation.x = target.rx * k
    group.rotation.y = target.ry * k
    group.rotation.z = target.rz * k
    group.position.x = target.rz * k * 0.12
    group.position.y = 0
  } else {
    group.rotation.set(0, 0, 0)
    group.position.set(0, 0, 0)
  }
  group.scale.setScalar(BALL_SCALE)

  if (mat) {
    mat.emissiveIntensity = Math.min(1, t / SHAKE_DURATION) * 0.6
  }
}

// High-frequency, low-amplitude tremble ramping up as if the capsule strains
// to contain something powerful: jitter frequency/amplitude grow with
// progress, the shell overheats toward white, and an accelerating pulse makes
// it "breathe" faster and faster until it bursts.
function runVibrate(
  t: number,
  group: THREE.Group,
  bottomMat: THREE.MeshStandardMaterial | null,
  lidMat: THREE.MeshPhysicalMaterial | null,
  baseEmissive: THREE.Color,
  seed: ShakeSeed,
) {
  const progress = Math.min(1, t / VIBRATE_DURATION)
  const ramp = progress ** 2

  const f = seed.freq * (3 + ramp * 3)
  const jx =
    Math.sin(t * f + seed.phaseX) + Math.sin(t * f * 1.31 + seed.phaseY) * 0.5
  const jy =
    Math.sin(t * f * 1.17 + seed.phaseY) +
    Math.sin(t * f * 2.03 + seed.phaseZ) * 0.5
  const jz = Math.sin(t * f * 0.89 + seed.phaseZ)

  const amp = 0.015 + ramp * 0.055
  group.position.x = jx * amp
  group.position.y = jy * amp
  group.rotation.z = jz * (0.02 + ramp * 0.05)
  group.rotation.x = jx * 0.02 * ramp
  group.rotation.y = 0

  // Accelerating heartbeat pulse + slow overall swell
  const pulse = 1 + Math.sin(t * (6 + ramp * 18)) * 0.015 * (1 + ramp)
  group.scale.setScalar(BALL_SCALE * (1 + ramp * 0.06) * pulse)

  if (bottomMat) {
    bottomMat.emissive.copy(baseEmissive).lerp(WHITE, ramp * 0.8)
    bottomMat.emissiveIntensity = 0.6 + ramp * 2.4
  }
  if (lidMat) {
    lidMat.emissive.copy(WHITE)
    lidMat.emissiveIntensity = ramp * 1.6
  }
}

function easeOutCubic(x: number): number {
  const inv = 1 - x
  return 1 - inv ** 3
}

function runSplit(
  t: number,
  group: THREE.Group,
  top: THREE.Group,
  bottom: THREE.Group,
  seam: THREE.Mesh | null,
  lidMat: THREE.MeshPhysicalMaterial | null,
  bottomMat: THREE.MeshStandardMaterial | null,
  notified: MutableRefObject<boolean>,
  onDone: () => void,
) {
  const progress = Math.min(1, t / SPLIT_DURATION)

  // Small burst at the split moment
  const burstT = Math.min(1, progress / 0.15)
  const burst = 1 + burstT * 0.14 - Math.max(0, progress - 0.15) * 0.09
  group.scale.setScalar(BALL_SCALE * burst)

  const ease = easeOutCubic(progress)

  // Fixed, deterministic split — top flies straight up with a light spin;
  // bottom falls straight down with the counter-spin. Feels reliable, no
  // randomness so the "opening" is always the same clean gesture.
  top.position.y = THREE.MathUtils.lerp(0, 3, ease)
  top.rotation.z = THREE.MathUtils.lerp(0, 0.7, ease)
  bottom.position.y = THREE.MathUtils.lerp(0, -3, ease)
  bottom.rotation.z = THREE.MathUtils.lerp(0, -0.4, ease)

  // Fade both pieces to fully invisible before the flash takes over
  const fadeStart = 0.55
  const fadeAlpha =
    progress < fadeStart ? 1 : 1 - (progress - fadeStart) / (1 - fadeStart)
  if (lidMat) {
    lidMat.opacity = 0.42 * fadeAlpha
  }
  if (bottomMat) {
    bottomMat.opacity = fadeAlpha
    bottomMat.transparent = true
    bottomMat.emissiveIntensity = 0.85 * fadeAlpha
  }
  if (seam) {
    seam.visible = false
  }
  if (progress >= 1 && !notified.current) {
    notified.current = true
    onDone()
  }
}

type Props = {
  phase: 'shake' | 'vibrate' | 'split'
  onSplitDone: () => void
}

export function GachaBall({ phase, onSplitDone }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const topRef = useRef<THREE.Group>(null)
  const bottomRef = useRef<THREE.Group>(null)
  const seamRef = useRef<THREE.Mesh>(null)
  const bottomMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lidMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const timeRef = useRef(0)
  const notifiedRef = useRef(false)
  const prevPhaseRef = useRef(phase)

  const bottomColor = useMemo(
    () => BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
    [],
  )
  const baseEmissive = useMemo(
    () => new THREE.Color(bottomColor),
    [bottomColor],
  )

  // Per-pull random seed → the vibrate jitter follows a distinct path each
  // pull; `dir` fixe aussi le sens du premier à-coup du shake.
  const shakeSeed = useMemo<ShakeSeed>(
    () => ({
      freq: 10 + Math.random() * 4,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      dir: Math.random() < 0.5 ? -1 : 1,
    }),
    [],
  )

  // 3 orientations cibles aléatoires pour les à-coups, marquées sur LES TROIS
  // axes pour vendre la 3D : X bascule la ligne de jonction vers/loin de la
  // caméra, Z la penche à gauche/droite (signe alterné à partir de `dir`), et
  // Y fait tourner les reflets. Chaque axe tire fort, pas de rotation timide.
  const shakeBursts = useMemo<ShakeBurst[]>(
    () =>
      Array.from({ length: SHAKE_BURSTS }, (_, i) => ({
        rx: (0.4 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
        ry: (0.5 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1),
        rz:
          (0.4 + Math.random() * 0.4) * shakeSeed.dir * (i % 2 === 0 ? 1 : -1),
      })),
    [shakeSeed],
  )

  useFrame((_, delta) => {
    if (!groupRef.current || !topRef.current || !bottomRef.current) {
      return
    }

    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase
      timeRef.current = 0
      notifiedRef.current = false
      groupRef.current.rotation.set(0, 0, 0)
      groupRef.current.position.set(0, 0, 0)
      groupRef.current.scale.setScalar(BALL_SCALE)
    }

    timeRef.current += delta
    const t = timeRef.current

    if (phase === 'shake') {
      runShake(t, groupRef.current, bottomMatRef.current, shakeBursts)
    } else if (phase === 'vibrate') {
      runVibrate(
        t,
        groupRef.current,
        bottomMatRef.current,
        lidMatRef.current,
        baseEmissive,
        shakeSeed,
      )
    } else {
      runSplit(
        t,
        groupRef.current,
        topRef.current,
        bottomRef.current,
        seamRef.current,
        lidMatRef.current,
        bottomMatRef.current,
        notifiedRef,
        onSplitDone,
      )
    }
  })

  return (
    <group ref={groupRef} scale={BALL_SCALE}>
      {/* ── TOP ── */}
      <group ref={topRef} position={[0, 0, -0.85]}>
        <group position={[0, 0, 0.85]}>
          <mesh renderOrder={1}>
            <sphereGeometry
              args={[0.85, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshPhysicalMaterial
              ref={lidMatRef}
              color="#7ec8e3"
              roughness={0.15}
              metalness={0}
              opacity={0.42}
              transparent
              clearcoat={0.7}
              clearcoatRoughness={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>

      {/* ── BOTTOM ── */}
      <group ref={bottomRef}>
        <mesh>
          <sphereGeometry
            args={[0.85, 64, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
          />
          <meshStandardMaterial
            ref={bottomMatRef}
            color={bottomColor}
            roughness={0.8}
            metalness={0}
            emissive={bottomColor}
            emissiveIntensity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={seamRef}>
          <cylinderGeometry args={[0.862, 0.862, 0.12, 64, 1, true]} />
          <meshStandardMaterial
            color={bottomColor}
            roughness={0.7}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  )
}
