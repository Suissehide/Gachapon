import { useFrame } from '@react-three/fiber'
import { type MutableRefObject, useMemo, useRef } from 'react'
import * as THREE from 'three'

const BALL_COLORS = [
  '#e63946', '#1d88c4', '#2a9d8f', '#f4a261',
  '#7b2d8b', '#74b816', '#e91e8c', '#00b4d8',
]

const SHAKE_DURATION = 0.5 // seconds
const SPLIT_DURATION = 0.6 // seconds

type Props = {
  phase: 'shake' | 'split'
  onSplitDone: () => void
}

function runShake(
  t: number,
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial | null,
) {
  const progress = Math.min(1, t / SHAKE_DURATION)
  const amplitude = 0.15 * (1 - progress * 0.5)
  group.rotation.z = Math.sin(t * 22) * amplitude
  group.position.x = Math.sin(t * 22) * 0.03
  if (mat) {
    mat.emissiveIntensity = progress * 0.4
  }
}

function runSplit(
  t: number,
  top: THREE.Group,
  bottom: THREE.Group,
  seam: THREE.Mesh | null,
  lidMat: THREE.MeshPhysicalMaterial | null,
  bottomMat: THREE.MeshStandardMaterial | null,
  notified: MutableRefObject<boolean>,
  onDone: () => void,
) {
  const progress = Math.min(1, t / SPLIT_DURATION)
  top.position.y = THREE.MathUtils.lerp(0, 3, progress)
  top.rotation.z = THREE.MathUtils.lerp(0, 0.6, progress)
  bottom.position.y = THREE.MathUtils.lerp(0, -3, progress)
  const fadeStart = 1 - 0.2 / SPLIT_DURATION
  const fadeAlpha =
    progress < fadeStart ? 1 : 1 - (progress - fadeStart) / (1 - fadeStart)
  if (lidMat) {
    lidMat.opacity = 0.38 * fadeAlpha
  }
  if (bottomMat) {
    bottomMat.opacity = fadeAlpha
    bottomMat.transparent = true
  }
  if (seam) {
    seam.visible = false
  }
  if (progress >= 1 && !notified.current) {
    notified.current = true
    onDone()
  }
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

  useFrame((_, delta) => {
    if (!groupRef.current || !topRef.current || !bottomRef.current) { return }

    // Reset per-phase timer when phase transitions
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase
      timeRef.current = 0
      notifiedRef.current = false
      groupRef.current.rotation.z = 0
      groupRef.current.position.x = 0
    }

    timeRef.current += delta
    const t = timeRef.current

    if (phase === 'shake') {
      runShake(t, groupRef.current, bottomMatRef.current)
    } else {
      runSplit(t, topRef.current, bottomRef.current, seamRef.current, lidMatRef.current, bottomMatRef.current, notifiedRef, onSplitDone)
    }
  })

  return (
    <group ref={groupRef}>
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
              roughness={0.2}
              metalness={0}
              opacity={0.38}
              transparent
              clearcoat={0.5}
              clearcoatRoughness={0.25}
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
            roughness={0.85}
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
