import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const BALL_COLORS = [
  '#e63946', // rouge
  '#1d88c4', // bleu
  '#2a9d8f', // teal
  '#f4a261', // orange
  '#7b2d8b', // violet
  '#74b816', // vert
  '#e91e8c', // rose
  '#00b4d8', // cyan
]

const LID_OPEN_ANGLE = -Math.PI * 0.58

type Props = {
  interactive: boolean
  isOpening: boolean
  onOpen: () => void
}

export function GachaBall({ interactive, isOpening, onOpen }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const lidRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const bottomColor = useMemo(
    () => BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
    [],
  )

  useFrame((_, delta) => {
    if (!groupRef.current || !lidRef.current) {
      return
    }

    // Lid — lerp vers l'angle cible, jamais en arrière une fois ouvert
    const target = isOpening ? LID_OPEN_ANGLE : 0
    const current = lidRef.current.rotation.x
    const next = THREE.MathUtils.lerp(current, target, delta * 4)
    lidRef.current.rotation.x = isOpening ? Math.min(current, next) : next

    if (isOpening) {
      // Recentrage de la boule vers l'origine
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        0,
        0.12,
      )
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        0,
        0.12,
      )
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        0,
        0.12,
      )
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        0,
        0.12,
      )
      return
    }

    time.current += delta
    const t = time.current
    groupRef.current.position.y =
      Math.sin(t * 1.4) * 0.08 + Math.sin(t * 0.7) * 0.03
    groupRef.current.position.x =
      Math.sin(t * 0.9 + 1.2) * 0.05 + Math.sin(t * 1.7 + 0.4) * 0.02
    groupRef.current.position.z =
      Math.sin(t * 1.1 + 2.5) * 0.04 + Math.sin(t * 0.6 + 1.8) * 0.02
    groupRef.current.rotation.y += delta * 0.4
  })

  return (
    <group ref={groupRef}>
      {/* ── LID (top) ── */}
      <group position={[0, 0, -0.85]}>
        <group ref={lidRef}>
          <group position={[0, 0, 0.85]}>
            <mesh renderOrder={1}>
              <sphereGeometry
                args={[0.85, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshPhysicalMaterial
                color="#7ec8e3"
                roughness={0.2}
                metalness={0}
                opacity={0.38}
                clearcoat={0.5}
                clearcoatRoughness={0.25}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── BOTTOM hemisphere ── */}
      <mesh>
        <sphereGeometry
          args={[0.85, 64, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={bottomColor}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Seam ── */}
      <mesh>
        <cylinderGeometry args={[0.862, 0.862, 0.12, 64, 1, true]} />
        <meshStandardMaterial
          color={bottomColor}
          roughness={0.7}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Invisible hit sphere for click */}
      {interactive && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: R3F mesh, not a DOM element */}
          <mesh onClick={onOpen}>
            <sphereGeometry args={[0.9, 16, 16]} />
            <meshStandardMaterial transparent opacity={0} />
          </mesh>
        </>
      )}
    </group>
  )
}
