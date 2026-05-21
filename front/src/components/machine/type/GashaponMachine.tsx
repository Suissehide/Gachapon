import { animated, useSpring } from '@react-spring/three'
import { useFrame } from '@react-three/fiber'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

export type GashaponMachineHandle = {
  startAnimation: () => Promise<void>
}

const CAPSULE_COLORS = [
  '#e63946', '#1d88c4', '#2a9d8f', '#f4a261',
  '#7b2d8b', '#74b816', '#e91e8c', '#00b4d8',
]

// Mini capsules floating inside the globe
function Capsules({ agitate }: { agitate: boolean }) {
  const capsules = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        pos: [
          (Math.random() - 0.5) * 0.7,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.7,
        ] as [number, number, number],
        color: CAPSULE_COLORS[i % CAPSULE_COLORS.length],
        speed: 0.3 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      })),
    [],
  )

  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    for (let i = 0; i < capsules.length; i++) {
      const mesh = refs.current[i]
      if (!mesh) continue
      const c = capsules[i]
      const amplitude = agitate ? 0.08 : 0.015
      const speed = agitate ? c.speed * 4 : c.speed
      const t = Date.now() * 0.001
      mesh.position.x = c.pos[0] + Math.sin(t * speed + c.offset) * amplitude
      mesh.position.y = c.pos[1] + Math.sin(t * speed * 1.3 + c.offset) * amplitude
      mesh.position.z = c.pos[2] + Math.cos(t * speed * 0.7 + c.offset) * amplitude
    }
  })

  return (
    <group position={[0, 0.55, 0]}>
      {capsules.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el }}
          position={c.pos}
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color={c.color} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// Crank handle on the side
function Crank({ rotation }: { rotation: ReturnType<typeof useSpring>[0][string] }) {
  return (
    <animated.group position={[0.65, 0.0, 0]} rotation-z={rotation}>
      {/* Shaft */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Handle knob */}
      <mesh position={[0, -0.18, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#e63946" metalness={0.5} roughness={0.3} />
      </mesh>
    </animated.group>
  )
}

// Dispensing capsule that drops out
function DispensedCapsule({
  visible,
  yPos,
  scale,
}: {
  visible: boolean
  yPos: ReturnType<typeof useSpring>[0][string]
  scale: ReturnType<typeof useSpring>[0][string]
}) {
  if (!visible) return null
  return (
    <animated.mesh position-y={yPos} scale={scale}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="#f4a261" roughness={0.3} />
    </animated.mesh>
  )
}

export const GashaponMachine = forwardRef<GashaponMachineHandle>((_, ref) => {
  const [agitate, setAgitate] = useState(false)
  const [showDispensed, setShowDispensed] = useState(false)

  const [crankSpring, crankApi] = useSpring(() => ({ rotation: 0 }))
  const [capsuleSpring, capsuleApi] = useSpring(() => ({ y: -0.6, scale: 1 }))

  useImperativeHandle(ref, () => ({
    async startAnimation() {
      // 1. Crank rotates (800ms)
      await crankApi.start({
        rotation: Math.PI * 2,
        config: { duration: 800 },
      })[0]

      // 2. Capsules agitate (400ms)
      setAgitate(true)
      await new Promise((r) => setTimeout(r, 400))

      // 3. One capsule descends to slot (600ms)
      setShowDispensed(true)
      capsuleApi.set({ y: 0.2, scale: 1 })
      await capsuleApi.start({
        y: -0.75,
        config: { duration: 600 },
      })[0]
      setAgitate(false)

      // 4. Capsule exits and grows to center (500ms)
      await capsuleApi.start({
        y: 0,
        scale: 3,
        config: { duration: 500 },
      })[0]

      // Reset state
      crankApi.set({ rotation: 0 })
      capsuleApi.set({ y: -0.6, scale: 1 })
      setShowDispensed(false)
    },
  }))

  return (
    <group>
      {/* Base / body */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.8, 24]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* Base bottom plate */}
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.1, 24]} />
        <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
      </mesh>

      {/* Dispensing slot */}
      <mesh position={[0, -0.75, 0.5]}>
        <boxGeometry args={[0.25, 0.18, 0.15]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Globe (transparent sphere) */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          roughness={0}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Globe top cap */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.15, 24]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* Coin slot label */}
      <mesh position={[0, -0.15, 0.56]}>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshStandardMaterial color="#f4a261" />
      </mesh>

      {/* Mini capsules inside globe */}
      <Capsules agitate={agitate} />

      {/* Crank */}
      <Crank rotation={crankSpring.rotation} />

      {/* Dispensed capsule (animated) */}
      <DispensedCapsule
        visible={showDispensed}
        yPos={capsuleSpring.y}
        scale={capsuleSpring.scale}
      />

      {/* Internal warm light */}
      <pointLight
        position={[0, 0.5, 0]}
        color="#f59e0b"
        intensity={0.6}
        distance={2}
      />
    </group>
  )
})

GashaponMachine.displayName = 'GashaponMachine'
