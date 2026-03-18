import { animated, useSpring } from '@react-spring/three'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  interactive: boolean
  isOpening: boolean
  onOpen: () => void
}

export function GachaBall({ interactive, isOpening, onOpen }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  // Entry spring: scale 0 → 1
  const [entrySpring, entryApi] = useSpring(() => ({
    scale: 0,
    config: { tension: 180, friction: 14 },
  }))

  // Lid spring: chest-style — hinge at back, front edge rises toward viewer (~105°)
  const [lidSpring, lidApi] = useSpring(() => ({
    rx: 0,
    config: { tension: 55, friction: 20 }, // heavy, deliberate
  }))

  useEffect(() => {
    entryApi.start({ scale: 1 })
  }, [entryApi])

  useEffect(() => {
    if (isOpening) {
      // ~105° — lid tips toward the viewer and leans slightly back, like an open chest
      lidApi.start({ rx: -Math.PI * 0.58 })
    }
  }, [isOpening, lidApi])

  // Idle float + slow rotation
  useFrame((_, delta) => {
    if (!groupRef.current || isOpening) {
      return
    }
    time.current += delta
    groupRef.current.position.y = Math.sin(time.current * 1.4) * 0.08
    groupRef.current.rotation.y += delta * 0.4
  })

  return (
    // @ts-expect-error animated.group scale
    <animated.group scale={entrySpring.scale}>
      <group ref={groupRef}>
        {/* ── LID (top hemisphere) — pivots like pizza-box lid ── */}
        {/* Hinge anchor at the back of the ball (z = -0.85) */}
        <group position={[0, 0, -0.85]}>
          {/* @ts-expect-error animated.group rotation-x */}
          <animated.group rotation-x={lidSpring.rx}>
            {/* Offset forward so the mesh sits at world origin when rx=0 */}
            <group position={[0, 0, 0.85]}>
              <mesh>
                <sphereGeometry
                  args={[0.85, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshStandardMaterial
                  color="#e63535"
                  roughness={0.18}
                  metalness={0.35}
                  envMapIntensity={1.2}
                />
              </mesh>
              {/* Inner flat cap (visible from below when lid opens) */}
              <mesh rotation-x={Math.PI / 2}>
                <circleGeometry args={[0.849, 48]} />
                <meshStandardMaterial
                  color="#c02020"
                  roughness={0.55}
                  side={THREE.BackSide}
                />
              </mesh>
            </group>
          </animated.group>
        </group>

        {/* ── BOTTOM hemisphere (stays fixed) ── */}
        <group>
          <mesh>
            <sphereGeometry
              args={[0.85, 48, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
            />
            <meshStandardMaterial
              color="#f0f0f0"
              roughness={0.22}
              metalness={0.2}
              envMapIntensity={0.9}
            />
          </mesh>
          {/* Inner cap facing up */}
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.849, 48]} />
            <meshStandardMaterial
              color="#d4d4d4"
              roughness={0.55}
              side={THREE.BackSide}
            />
          </mesh>
        </group>

        {/* ── Seam ring ── */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.86, 0.028, 8, 64]} />
          <meshStandardMaterial
            color="#c48a28"
            roughness={0.3}
            metalness={0.7}
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
    </animated.group>
  )
}
