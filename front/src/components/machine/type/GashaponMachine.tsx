import { useFrame } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
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
  '#e63946',
  '#1d88c4',
  '#2a9d8f',
  '#f4a261',
  '#7b2d8b',
  '#74b816',
  '#e91e8c',
  '#00b4d8',
]

const CAPSULE_RADIUS = 0.11

// Globe center Y in world space
const GLOBE_Y = 0.55

// Mini gacha capsule visual — same structure as GachaBall.tsx
function MiniCapsuleVisual({ color }: { color: string }) {
  const r = CAPSULE_RADIUS
  return (
    <group>
      <mesh renderOrder={1}>
        <sphereGeometry args={[r, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
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
      <mesh>
        <sphereGeometry
          args={[r, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <cylinderGeometry
          args={[r * 1.015, r * 1.015, r * 0.14, 16, 1, true]}
        />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// Physics-driven capsule with ref for jiggle impulses
function PhysicsCapsule({
  color,
  startPos,
  rigidBodyRef,
}: {
  color: string
  startPos: [number, number, number]
  rigidBodyRef: (el: RapierRigidBody | null) => void
}) {
  const rotation: [number, number, number] = useMemo(
    () => [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ],
    [],
  )

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={startPos}
      rotation={rotation}
      colliders={false}
      restitution={0.2}
      friction={0.8}
      linearDamping={2}
      angularDamping={2}
      lockRotations={true}
    >
      <BallCollider args={[CAPSULE_RADIUS]} />
      <MiniCapsuleVisual color={color} />
    </RigidBody>
  )
}

// Floor collider at the bottom of the globe
function GlobeFloorCollider() {
  return (
    <RigidBody type="fixed" position={[0, GLOBE_Y - 0.44, 0]}>
      <CuboidCollider args={[0.5, 0.02, 0.5]} />
    </RigidBody>
  )
}

// Dispensed capsule — a real physics ball that spawns at the hole and rolls out
function DispensedPhysicsCapsule({ visible }: { visible: boolean }) {
  if (!visible) {
    return null
  }

  // Spawn position: at the dispensing hole, on the ramp
  return (
    <RigidBody
      type="dynamic"
      position={[-0.2, -0.45, 0.5]}
      colliders={false}
      restitution={0.3}
      friction={0.5}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <BallCollider args={[CAPSULE_RADIUS]} />
      <MiniCapsuleVisual color="#f4a261" />
    </RigidBody>
  )
}

// Invisible ramp collider at the dispensing hole — tilted so the ball rolls forward and falls
function DispensingRampCollider() {
  return (
    <RigidBody
      type="fixed"
      position={[-0.2, -0.58, 0.6]}
      rotation={[0.35, 0, 0]}
    >
      <CuboidCollider args={[0.1, 0.01, 0.12]} />
    </RigidBody>
  )
}

// Detects camera rotation and jiggles capsules
function CameraJiggle({
  bodies,
}: {
  bodies: React.RefObject<(RapierRigidBody | null)[]>
}) {
  const prevAzimuth = useRef(0)

  useFrame(({ camera }) => {
    const azimuth = Math.atan2(camera.position.x, camera.position.z)
    const delta = azimuth - prevAzimuth.current
    prevAzimuth.current = azimuth

    // Clamp velocities + force balls inside globe
    const maxSpeed = 1.5
    const globeR = 0.42 // max distance from globe center
    for (const body of bodies.current ?? []) {
      if (!body) {
        continue
      }

      // Clamp speed
      const vel = body.linvel()
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
      if (speed > maxSpeed) {
        const s = maxSpeed / speed
        body.setLinvel({ x: vel.x * s, y: vel.y * s, z: vel.z * s }, true)
      }

      // Force back inside globe if escaped
      const pos = body.translation()
      const rx = pos.x
      const ry = pos.y - GLOBE_Y
      const rz = pos.z
      const dist = Math.sqrt(rx * rx + ry * ry + rz * rz)
      if (dist > globeR) {
        const s = globeR / dist
        body.setTranslation({ x: rx * s, y: ry * s + GLOBE_Y, z: rz * s }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    // Apply jiggle
    if (Math.abs(delta) > 0.005) {
      const strength = Math.min(Math.abs(delta) * 0.3, 0.015)
      for (const body of bodies.current ?? []) {
        if (!body) {
          continue
        }
        const vel = body.linvel()
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
        if (speed > 1.0) {
          continue // skip if already moving fast
        }
        body.applyImpulse(
          {
            x: (Math.random() - 0.5) * strength,
            y: 0,
            z: (Math.random() - 0.5) * strength,
          },
          true,
        )
      }
    }
  })

  return null
}

// All physics content in a single Physics context
function PhysicsWorld({
  capsules,
  showDispensed,
}: {
  capsules: { pos: [number, number, number]; color: string }[]
  showDispensed: boolean
}) {
  const bodiesRef = useRef<(RapierRigidBody | null)[]>([])

  return (
    <Physics gravity={[0, -9.81, 0]}>
      <GlobeFloorCollider />
      <DispensingRampCollider />
      {capsules.map((c, i) => (
        <PhysicsCapsule
          key={i}
          color={c.color}
          startPos={c.pos}
          rigidBodyRef={(el) => {
            bodiesRef.current[i] = el
          }}
        />
      ))}
      <DispensedPhysicsCapsule visible={showDispensed} />
      <CameraJiggle bodies={bodiesRef} />
    </Physics>
  )
}

// Oven-knob style dial + coin slot + push button
function Dial({ speed }: { speed: number }) {
  const knobRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!knobRef.current) {
      return
    }
    knobRef.current.rotation.z += speed * delta
  })

  return (
    <group position={[0, -0.25, 0.46]}>
      {/* Dial base plate */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
        <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
      </mesh>

      {/* Rotating knob */}
      <group ref={knobRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.04, 32]} />
          <meshStandardMaterial color="#ddd" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[0.14, 0.035, 0.05]} />
          <meshStandardMaterial color="#aaa" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Coin slot */}
      <group position={[0.22, 0.1, 0.01]}>
        <mesh>
          <torusGeometry args={[0.065, 0.006, 12, 32]} />
          <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.018, 0.085, 0.005]} />
          <meshStandardMaterial color="#0a0a1a" />
        </mesh>
      </group>

      {/* Push button */}
      <group position={[0.18, -0.12, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.03, 16]} />
          <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.016]}>
          <circleGeometry args={[0.02, 16]} />
          <meshStandardMaterial
            color="#e0e0e0"
            metalness={0.5}
            roughness={0.2}
          />
        </mesh>
      </group>
    </group>
  )
}

export const GashaponMachine = forwardRef<GashaponMachineHandle>((_, ref) => {
  const [agitate, setAgitate] = useState(false)
  const [showDispensed, setShowDispensed] = useState(false)
  const [dialSpeed, setDialSpeed] = useState(0)

  const capsules = useMemo(() => {
    const items: { pos: [number, number, number]; color: string }[] = []
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * 0.2
      items.push({
        pos: [
          Math.cos(angle) * dist,
          GLOBE_Y + 0.1 + i * 0.06,
          Math.sin(angle) * dist,
        ],
        color: BALL_COLORS[i % BALL_COLORS.length],
      })
    }
    return items
  }, [])

  void agitate

  useImperativeHandle(ref, () => ({
    async startAnimation() {
      // 1. Dial spins fast
      setDialSpeed(12)
      await new Promise((r) => setTimeout(r, 300))

      // 2. Capsules agitate + dial slows down
      setAgitate(true)
      setDialSpeed(0)
      await new Promise((r) => setTimeout(r, 400))

      // 3. Spawn dispensed capsule — it has physics, will roll on ramp and fall
      setShowDispensed(true)
      setAgitate(false)
      setDialSpeed(0)

      // 4. Wait for the ball to roll out and fall
      await new Promise((r) => setTimeout(r, 1000))

      // Reset
      setShowDispensed(false)
    },
  }))

  return (
    <group>
      {/* ── BODY (square) ── */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* ── BASE PLATE (square, slightly larger) ── */}
      <mesh position={[0, -0.74, 0]}>
        <boxGeometry args={[1.0, 0.08, 1.0]} />
        <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
      </mesh>

      {/* ── DISPENSING HOLE (aligned with flat front face) ── */}
      <group position={[-0.2, -0.5, 0.46]}>
        <mesh>
          <planeGeometry args={[0.24, 0.2]} />
          <meshStandardMaterial color="#0a0a1a" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.105, 0.005]}>
          <boxGeometry args={[0.26, 0.015, 0.02]} />
          <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.105, 0.005]}>
          <boxGeometry args={[0.26, 0.015, 0.02]} />
          <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[-0.125, 0, 0.005]}>
          <boxGeometry args={[0.015, 0.22, 0.02]} />
          <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[0.125, 0, 0.005]}>
          <boxGeometry args={[0.015, 0.22, 0.02]} />
          <meshStandardMaterial color="#8b1a1a" roughness={0.5} />
        </mesh>
      </group>

      {/* ── NECK (square transition to globe) ── */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.75, 0.12, 0.75]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* ── GLOBE ── */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.52, 32, 32]} />
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
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#cc2936" roughness={0.4} />
      </mesh>

      {/* ── ALL PHYSICS (globe capsules + dispensed capsule + ramp) ── */}
      <PhysicsWorld capsules={capsules} showDispensed={showDispensed} />

      {/* ── DIAL + COIN SLOT ── */}
      <Dial speed={dialSpeed} />

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
