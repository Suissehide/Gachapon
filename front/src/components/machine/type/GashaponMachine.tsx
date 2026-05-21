import { animated, useSpring } from '@react-spring/three'
import { useFrame } from '@react-three/fiber'
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'

export type GashaponMachineHandle = {
  startAnimation: () => Promise<void>
}

const BALL_COLORS = [
  '#e63946', '#1d88c4', '#2a9d8f', '#f4a261',
  '#7b2d8b', '#74b816', '#e91e8c', '#00b4d8',
]

// Mini gacha capsule — bicolor like the real GachaBall (top transparent, bottom colored)
function MiniCapsule({
  position,
  color,
  meshRef,
}: {
  position: [number, number, number]
  color: string
  meshRef: (el: THREE.Group | null) => void
}) {
  const radius = 0.08
  return (
    <group ref={meshRef} position={position}>
      {/* Top hemisphere — transparent */}
      <mesh>
        <sphereGeometry args={[radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#7ec8e3"
          roughness={0.2}
          opacity={0.4}
          transparent
          clearcoat={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bottom hemisphere — colored */}
      <mesh>
        <sphereGeometry args={[radius, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Seam ring */}
      <mesh>
        <cylinderGeometry args={[radius * 1.02, radius * 1.02, 0.012, 16, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Capsules sitting at the bottom of the globe
function Capsules({ agitate }: { agitate: boolean }) {
  const capsules = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        // Positioned at the bottom of the globe (y around -0.1 to 0.1), within radius
        pos: [
          (Math.random() - 0.5) * 0.5,
          -0.15 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.5,
        ] as [number, number, number],
        color: BALL_COLORS[i % BALL_COLORS.length],
        speed: 0.3 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
      })),
    [],
  )

  const refs = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    for (let i = 0; i < capsules.length; i++) {
      const group = refs.current[i]
      if (!group) continue
      const c = capsules[i]
      const amplitude = agitate ? 0.06 : 0.008
      const speed = agitate ? c.speed * 4 : c.speed
      const t = Date.now() * 0.001
      group.position.x = c.pos[0] + Math.sin(t * speed + c.offset) * amplitude
      group.position.y = c.pos[1] + Math.sin(t * speed * 1.3 + c.offset) * amplitude * 0.5
      group.position.z = c.pos[2] + Math.cos(t * speed * 0.7 + c.offset) * amplitude
    }
  })

  return (
    <group position={[0, 0.45, 0]}>
      {capsules.map((c, i) => (
        <MiniCapsule
          key={i}
          meshRef={(el) => { refs.current[i] = el }}
          position={c.pos}
          color={c.color}
        />
      ))}
    </group>
  )
}

// Crank handle — attached to the body via a visible axle
function Crank({ rotation }: { rotation: ReturnType<typeof useSpring>[0][string] }) {
  return (
    <group position={[0.55, -0.15, 0]}>
      {/* Axle going through the body wall */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Rotating part */}
      <animated.group position={[0.15, 0, 0]} rotation-x={rotation}>
        {/* Arm */}
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.24, 8]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Handle knob */}
        <mesh position={[0, -0.26, 0]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color="#e63946" metalness={0.5} roughness={0.3} />
        </mesh>
      </animated.group>
    </group>
  )
}

// Dispensed capsule that drops and grows
function DispensedCapsule({
  visible,
  yPos,
  scaleVal,
}: {
  visible: boolean
  yPos: ReturnType<typeof useSpring>[0][string]
  scaleVal: ReturnType<typeof useSpring>[0][string]
}) {
  if (!visible) return null
  return (
    <animated.group position-y={yPos} scale={scaleVal}>
      {/* Top hemisphere */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#7ec8e3"
          roughness={0.2}
          opacity={0.4}
          transparent
          clearcoat={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bottom hemisphere */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#f4a261" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </animated.group>
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
      capsuleApi.set({ y: 0.1, scale: 1 })
      await capsuleApi.start({
        y: -0.8,
        config: { duration: 600 },
      })[0]
      setAgitate(false)

      // 4. Capsule exits and grows to center (500ms)
      await capsuleApi.start({
        y: 0,
        scale: 4,
        config: { duration: 500 },
      })[0]

      // Reset
      crankApi.set({ rotation: 0 })
      capsuleApi.set({ y: -0.6, scale: 1 })
      setShowDispensed(false)
    },
  }))

  return (
    <group>
      {/* ── BODY (red cylinder) ── */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.7, 24]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* Body band / label area */}
      <mesh position={[0, -0.2, 0.51]}>
        <boxGeometry args={[0.35, 0.12, 0.02]} />
        <meshStandardMaterial color="#f4a261" roughness={0.5} />
      </mesh>

      {/* ── BASE PLATE ── */}
      <mesh position={[0, -0.74, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.08, 24]} />
        <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
      </mesh>

      {/* ── DISPENSING SLOT ── */}
      <mesh position={[0, -0.58, 0.48]}>
        <boxGeometry args={[0.22, 0.2, 0.12]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* ── NECK (connects body to globe) ── */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 0.12, 24]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* ── GLOBE (transparent sphere) ── */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.18}
          roughness={0}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── GLOBE TOP CAP ── */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 0.1, 24]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>
      {/* Top knob */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* ── CAPSULES INSIDE GLOBE ── */}
      <Capsules agitate={agitate} />

      {/* ── CRANK (attached to body) ── */}
      <Crank rotation={crankSpring.rotation} />

      {/* ── DISPENSED CAPSULE (animated, hidden by default) ── */}
      <DispensedCapsule
        visible={showDispensed}
        yPos={capsuleSpring.y}
        scaleVal={capsuleSpring.scale}
      />

      {/* ── INTERNAL LIGHT ── */}
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
