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

const SHAKE_DURATION = 0.8 // seconds
const SPLIT_DURATION = 1.0 // seconds
const BALL_SCALE = 1.05

type ShakeSeed = {
  freq: number
  phaseX: number
  phaseY: number
  phaseZ: number
  dir: number
}

// Organic "shaking a capsule in your hand" motion: several incommensurate
// sine waves per axis sum into a busy, aperiodic rattle across all three
// rotation axes plus a translational jitter — nothing like a clean left/right
// pendulum. A quick attack + late release envelope makes the ball grab, rattle
// hard, then settle just before it splits open.
function runShake(
  t: number,
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial | null,
  amp: number,
  seed: ShakeSeed,
) {
  const progress = Math.min(1, t / SHAKE_DURATION)
  const attack = Math.min(1, progress / 0.12)
  const release = 1 - Math.max(0, (progress - 0.82) / 0.18)
  const env = attack * release

  const { freq: f, phaseX, phaseY, phaseZ, dir } = seed
  // Incommensurate frequency stacks → no visible repeating cycle.
  const wz =
    Math.sin(t * f + phaseZ) * 0.6 +
    Math.sin(t * f * 1.73 + phaseZ * 2) * 0.3 +
    Math.sin(t * f * 2.61 + phaseZ) * 0.1
  const wx =
    Math.sin(t * f * 0.86 + phaseX) * 0.55 +
    Math.sin(t * f * 2.13 + phaseX * 1.4) * 0.3
  const wy =
    Math.sin(t * f * 1.27 + phaseY) * 0.5 +
    Math.sin(t * f * 3.1 + phaseY * 0.7) * 0.22

  group.rotation.z = wz * amp * dir * env
  group.rotation.x = wx * amp * 0.7 * env
  group.rotation.y = wy * amp * 0.55 * env
  // Translational rattle in sync so the whole capsule jitters through space.
  group.position.x = wz * 0.055 * env
  group.position.y = wx * 0.035 * env
  group.scale.setScalar(BALL_SCALE)

  if (mat) {
    mat.emissiveIntensity = progress * 0.6
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
  phase: 'shake' | 'split'
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

  // Per-pull random seed → every shake rattles on a distinct, non-repeating
  // path, with a slightly different peak amplitude and starting direction.
  const amp = useMemo(() => 0.34 + Math.random() * 0.12, [])
  const shakeSeed = useMemo<ShakeSeed>(
    () => ({
      freq: 18 + Math.random() * 6,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      dir: Math.random() < 0.5 ? -1 : 1,
    }),
    [],
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
      runShake(t, groupRef.current, bottomMatRef.current, amp, shakeSeed)
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
