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
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'

export type ClawMachineHandle = {
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

// Dimensions de la zone de jeu
const BOX_W = 1.2
const BOX_H = 1.3 // plus haute
const BOX_D = 0.8
const BOX_Y = 0.35

// Movement bounds for the claw (inside the box)
const CLAW_MIN_X = -BOX_W / 2 + 0.15
const CLAW_MAX_X = BOX_W / 2 - 0.15
const CLAW_MIN_Z = -BOX_D / 2 + 0.15
const CLAW_MAX_Z = BOX_D / 2 - 0.15
const CLAW_TOP_Y = BOX_Y + BOX_H / 2 - 0.2
const CLAW_BOTTOM_Y = BOX_Y - BOX_H / 2 + 0.25
const CLAW_SPEED = 0.8

// Mini gacha capsule visual — same as GashaponMachine
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

// Physics capsule
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
      lockRotations
    >
      <BallCollider args={[CAPSULE_RADIUS]} />
      <MiniCapsuleVisual color={color} />
    </RigidBody>
  )
}

function BoxFloorCollider() {
  return (
    <RigidBody type="fixed" position={[0, BOX_Y - BOX_H / 2, 0]}>
      <CuboidCollider args={[BOX_W / 2, 0.02, BOX_D / 2]} />
    </RigidBody>
  )
}

function DispensedPhysicsCapsule({ visible }: { visible: boolean }) {
  if (!visible) {
    return null
  }
  return (
    <RigidBody
      type="dynamic"
      position={[BOX_W / 2 - 0.1, BOX_Y - BOX_H / 2 + 0.15, 0]}
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

function DispensingRampCollider() {
  return (
    <RigidBody
      type="fixed"
      position={[BOX_W / 2 + 0.05, BOX_Y - BOX_H / 2 + 0.05, 0]}
      rotation={[0, 0, -0.4]}
    >
      <CuboidCollider args={[0.15, 0.01, 0.12]} />
    </RigidBody>
  )
}

// Camera jiggle + box containment
function CameraJiggle({
  bodies,
}: {
  bodies: React.RefObject<(RapierRigidBody | null)[]>
}) {
  const prevAzimuth = useRef(0)
  const halfW = BOX_W / 2 - CAPSULE_RADIUS - 0.02
  const halfD = BOX_D / 2 - CAPSULE_RADIUS - 0.02
  const minY = BOX_Y - BOX_H / 2 + CAPSULE_RADIUS
  const maxY = BOX_Y + BOX_H / 2 - CAPSULE_RADIUS

  useFrame(({ camera }) => {
    const azimuth = Math.atan2(camera.position.x, camera.position.z)
    const delta = azimuth - prevAzimuth.current
    prevAzimuth.current = azimuth

    const maxSpeed = 1.5
    for (const body of bodies.current ?? []) {
      if (!body) {
        continue
      }
      const vel = body.linvel()
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
      if (speed > maxSpeed) {
        const s = maxSpeed / speed
        body.setLinvel({ x: vel.x * s, y: vel.y * s, z: vel.z * s }, true)
      }
      const pos = body.translation()
      let clamped = false
      let cx = pos.x,
        cy = pos.y,
        cz = pos.z
      if (cx < -halfW) {
        cx = -halfW
        clamped = true
      }
      if (cx > halfW) {
        cx = halfW
        clamped = true
      }
      if (cy < minY) {
        cy = minY
        clamped = true
      }
      if (cy > maxY) {
        cy = maxY
        clamped = true
      }
      if (cz < -halfD) {
        cz = -halfD
        clamped = true
      }
      if (cz > halfD) {
        cz = halfD
        clamped = true
      }
      if (clamped) {
        body.setTranslation({ x: cx, y: cy, z: cz }, true)
        body.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
      }
    }

    if (Math.abs(delta) > 0.005) {
      const strength = Math.min(Math.abs(delta) * 0.3, 0.015)
      for (const body of bodies.current ?? []) {
        if (!body) {
          continue
        }
        const vel = body.linvel()
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
        if (speed > 1.0) {
          continue
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
      <BoxFloorCollider />
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

// Detailed claw arm — motor housing, 4 articulated prongs
function ClawArm({
  open,
  posX,
  posY,
  posZ,
}: {
  open: boolean
  posX: number
  posY: number
  posZ: number
}) {
  const armAngle = open ? 0.55 : 0.05
  const cableLen = BOX_Y + BOX_H / 2 - posY + 0.05

  return (
    <group position={[posX, posY, posZ]}>
      {/* Cable */}
      <mesh position={[0, cableLen / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, cableLen, 4]} />
        <meshStandardMaterial color="#999" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Motor housing */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.08, 12]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.015, 12]} />
        <meshStandardMaterial color="#e94560" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Center hub */}
      <mesh>
        <cylinderGeometry args={[0.04, 0.035, 0.06, 10]} />
        <meshStandardMaterial color="#ddd" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* 4 prongs */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const dirX = Math.sin(rad)
        const dirZ = Math.cos(rad)
        return (
          <group
            key={deg}
            rotation={[
              armAngle * Math.cos(rad + Math.PI / 2),
              0,
              armAngle * Math.sin(rad + Math.PI / 2),
            ]}
          >
            <mesh position={[dirX * 0.03, -0.06, dirZ * 0.03]}>
              <boxGeometry args={[0.02, 0.1, 0.02]} />
              <meshStandardMaterial
                color="#ccc"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[dirX * 0.04, -0.11, dirZ * 0.04]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshStandardMaterial
                color="#999"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <mesh
              position={[dirX * 0.045, -0.17, dirZ * 0.045]}
              rotation={[
                -armAngle * 0.3 * Math.cos(rad + Math.PI / 2),
                0,
                -armAngle * 0.3 * Math.sin(rad + Math.PI / 2),
              ]}
            >
              <boxGeometry args={[0.018, 0.1, 0.018]} />
              <meshStandardMaterial
                color="#e94560"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
            <mesh
              position={[dirX * 0.05, -0.23, dirZ * 0.05]}
              rotation={[
                0.4 * Math.cos(rad + Math.PI / 2),
                0,
                0.4 * Math.sin(rad + Math.PI / 2),
              ]}
            >
              <boxGeometry args={[0.022, 0.04, 0.022]} />
              <meshStandardMaterial
                color="#c0392b"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// Joystick — tilts based on input direction
function Joystick({ tiltX, tiltZ }: { tiltX: number; tiltZ: number }) {
  return (
    <group position={[-0.1, -0.015, 0.01]}>
      <mesh rotation={[Math.PI / 16, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
      <group rotation={[tiltZ * 0.3, 0, -tiltX * 0.3]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
          <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial
            color="#e94560"
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  )
}

// Big red button — pressed state
function ActionButton({ pressed }: { pressed: boolean }) {
  return (
    <group position={[0.1, -0.015, 0.01]}>
      <mesh rotation={[Math.PI / 16, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, pressed ? -0.005 : 0, 0]}>
        <sphereGeometry args={[0.045, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={pressed ? '#c0392b' : '#e63946'}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

type ClawPhase =
  | 'idle'
  | 'positioning'
  | 'dropping'
  | 'grabbing'
  | 'ascending'
  | 'dispensing'

export const ClawMachine = forwardRef<ClawMachineHandle>((_, ref) => {
  const [showDispensed, setShowDispensed] = useState(false)
  const [clawOpen, setClawOpen] = useState(true)
  const [phase, setPhase] = useState<ClawPhase>('idle')

  // Claw position — starts front-right corner
  const clawPosRef = useRef({
    x: CLAW_MAX_X - 0.05,
    y: CLAW_TOP_Y,
    z: CLAW_MAX_Z - 0.05,
  })
  const [clawPos, setClawPos] = useState(clawPosRef.current)
  const clawTargetYRef = useRef(CLAW_TOP_Y)

  // Input state
  const keysRef = useRef(new Set<string>())
  const resolveRef = useRef<(() => void) | null>(null)
  const triggerDropRef = useRef<(() => void) | null>(null)

  // Drop sequence
  triggerDropRef.current = () => {
    ;(async () => {
      setPhase('dropping')
      clawTargetYRef.current = CLAW_BOTTOM_Y
      await new Promise((r) => setTimeout(r, 1200))

      setPhase('grabbing')
      setClawOpen(false)
      await new Promise((r) => setTimeout(r, 500))

      setPhase('ascending')
      clawTargetYRef.current = CLAW_TOP_Y
      await new Promise((r) => setTimeout(r, 1200))

      setClawOpen(true)
      setPhase('dispensing')
      setShowDispensed(true)
      await new Promise((r) => setTimeout(r, 1500))

      setShowDispensed(false)
      setPhase('idle')
      resolveRef.current?.()
      resolveRef.current = null
    })()
  }

  // Keyboard listeners
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if ((e.key === ' ' || e.key === 'Enter') && phase === 'positioning') {
        e.preventDefault()
        triggerDropRef.current?.()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [phase])

  // Move claw with keyboard + lerp Y
  useFrame((_, delta) => {
    const pos = clawPosRef.current
    if (phase === 'positioning') {
      const keys = keysRef.current
      let dx = 0,
        dz = 0
      if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) {
        dx -= 1
      }
      if (keys.has('arrowright') || keys.has('d')) {
        dx += 1
      }
      if (keys.has('arrowup') || keys.has('w') || keys.has('z')) {
        dz -= 1
      }
      if (keys.has('arrowdown') || keys.has('s')) {
        dz += 1
      }

      pos.x = THREE.MathUtils.clamp(
        pos.x + dx * CLAW_SPEED * delta,
        CLAW_MIN_X,
        CLAW_MAX_X,
      )
      pos.z = THREE.MathUtils.clamp(
        pos.z + dz * CLAW_SPEED * delta,
        CLAW_MIN_Z,
        CLAW_MAX_Z,
      )
    }

    // Smooth Y
    pos.y = THREE.MathUtils.lerp(pos.y, clawTargetYRef.current, delta * 3)
    setClawPos({ ...pos })
  })

  // Joystick tilt based on current input
  const keys = keysRef.current
  let tiltX = 0,
    tiltZ = 0
  if (phase === 'positioning') {
    if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) {
      tiltX -= 1
    }
    if (keys.has('arrowright') || keys.has('d')) {
      tiltX += 1
    }
    if (keys.has('arrowup') || keys.has('w') || keys.has('z')) {
      tiltZ -= 1
    }
    if (keys.has('arrowdown') || keys.has('s')) {
      tiltZ += 1
    }
  }

  const capsules = useMemo(() => {
    const items: { pos: [number, number, number]; color: string }[] = []
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * (BOX_W - 0.3)
      const z = (Math.random() - 0.5) * (BOX_D - 0.3)
      items.push({
        pos: [x, BOX_Y + 0.1 + i * 0.06, z],
        color: BALL_COLORS[i % BALL_COLORS.length],
      })
    }
    return items
  }, [])

  useImperativeHandle(ref, () => ({
    startAnimation() {
      // Enter positioning mode — player controls the claw
      setClawOpen(true)
      clawTargetYRef.current = CLAW_TOP_Y
      clawPosRef.current = {
        x: CLAW_MAX_X - 0.05,
        y: CLAW_TOP_Y,
        z: CLAW_MAX_Z - 0.05,
      }
      setPhase('positioning')

      // Wait until the drop sequence completes
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve
      })
    },
  }))

  const socleH = 0.5
  const socleY = BOX_Y - BOX_H / 2 - socleH / 2 - 0.02
  const ctrlBoxW = BOX_W * 0.4
  const ctrlBoxH = socleH * 0.8
  const ctrlBoxD = 0.25
  const ctrlBoxY = socleY - socleH / 2 + ctrlBoxH / 2 - 0.05
  const ctrlBoxZ = BOX_D / 2 + ctrlBoxD / 2 + 0.05

  return (
    <group>
      {/* ── TRANSPARENT BOX ── */}
      <mesh position={[0, BOX_Y, -BOX_D / 2 - 0.02]}>
        <boxGeometry args={[BOX_W + 0.04, BOX_H + 0.04, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[-BOX_W / 2, BOX_Y, 0]}>
        <boxGeometry args={[0.02, BOX_H + 0.04, BOX_D]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.12}
          roughness={0}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[BOX_W / 2, BOX_Y, 0]}>
        <boxGeometry args={[0.02, BOX_H + 0.04, BOX_D]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.12}
          roughness={0}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, BOX_Y, BOX_D / 2]}>
        <boxGeometry args={[BOX_W + 0.04, BOX_H + 0.04, 0.02]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.1}
          roughness={0}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Top wall */}
      <mesh position={[0, BOX_Y + BOX_H / 2, 0]}>
        <boxGeometry args={[BOX_W + 0.04, 0.02, BOX_D + 0.04]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* ── CHAPEAU ── */}
      <mesh position={[0, BOX_Y + BOX_H / 2 + 0.1, 0]}>
        <boxGeometry args={[BOX_W + 0.15, 0.2, BOX_D + 0.15]} />
        <meshStandardMaterial color="#e94560" roughness={0.4} />
      </mesh>
      <mesh position={[0, BOX_Y + BOX_H / 2 + 0.1, BOX_D / 2 + 0.09]}>
        <boxGeometry args={[0.6, 0.12, 0.02]} />
        <meshStandardMaterial color="#f4a261" roughness={0.5} />
      </mesh>

      {/* ── SOCLE ── */}
      <mesh position={[0, socleY, 0]}>
        <boxGeometry args={[BOX_W + 0.1, socleH, BOX_D + 0.1]} />
        <meshStandardMaterial color="#3a3a5e" roughness={0.5} />
      </mesh>

      {/* ── CONTROL BOX ── */}
      <group position={[0, ctrlBoxY, ctrlBoxZ]}>
        <mesh>
          <boxGeometry args={[ctrlBoxW, ctrlBoxH - 0.1, ctrlBoxD]} />
          <meshStandardMaterial color="#2a2a4e" roughness={0.5} />
        </mesh>
        {/* Angled top */}
        <mesh position={[0, ctrlBoxH / 2 - 0.02, -0.02]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[ctrlBoxW + 0.01, 0.09, ctrlBoxD + 0.04]} />
          <meshStandardMaterial color="#3a3a5e" roughness={0.4} />
        </mesh>
        {/* Controls on angled top */}
        <group position={[0, ctrlBoxH / 2 + 0.04, 0.02]} rotation={[0.3, 0, 0]}>
          <Joystick tiltX={tiltX} tiltZ={tiltZ} />
          <ActionButton
            pressed={phase === 'dropping' || phase === 'grabbing'}
          />
        </group>
        {/* Coin slot on front face */}
        <group position={[0.15, 0.05, ctrlBoxD / 2 + 0.01]}>
          <mesh>
            <torusGeometry args={[0.05, 0.005, 12, 24]} />
            <meshStandardMaterial
              color="#aaa"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.015, 0.065, 0.005]} />
            <meshStandardMaterial color="#0a0a1a" />
          </mesh>
        </group>
      </group>

      {/* ── DISPENSING HOLE ── */}
      <group position={[BOX_W / 2 + 0.06, socleY + socleH / 2 - 0.1, 0]}>
        <mesh>
          <boxGeometry args={[0.04, 0.22, 0.25]} />
          <meshStandardMaterial color="#0a0a1a" />
        </mesh>
        <mesh position={[-0.025, 0, 0]}>
          <boxGeometry args={[0.01, 0.25, 0.28]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* ── CLAW ARM (interactive) ── */}
      <ClawArm
        open={clawOpen}
        posX={clawPos.x}
        posY={clawPos.y}
        posZ={clawPos.z}
      />

      {/* ── Positioning indicator ── */}
      {phase === 'positioning' && (
        <mesh
          position={[clawPos.x, BOX_Y - BOX_H / 2 + 0.01, clawPos.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.08, 0.1, 24]} />
          <meshStandardMaterial
            color="#e94560"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── PHYSICS ── */}
      <PhysicsWorld capsules={capsules} showDispensed={showDispensed} />

      {/* ── LIGHTS ── */}
      <pointLight
        position={[0, BOX_Y + 0.3, 0]}
        color="#4ecdc4"
        intensity={0.8}
        distance={2}
      />
      <pointLight
        position={[0, BOX_Y - 0.3, BOX_D / 2 - 0.1]}
        color="#e94560"
        intensity={0.4}
        distance={1.5}
      />
    </group>
  )
})

ClawMachine.displayName = 'ClawMachine'
