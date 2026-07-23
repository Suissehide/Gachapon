import { useFrame } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import gsap from 'gsap'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion.ts'
import { capsuleAudio } from '../capsule/capsuleAudio'

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

// Valeurs mutées par la timeline gsap de startAnimation, lues par useFrame.
type MachineAnim = {
  // Rotation cumulée du knob (radians)
  knobRot: number
  // Squash & stretch du corps de machine (0..1)
  squash: number
  // Ouverture de la trappe (0..1)
  door: number
  // Chute de la pièce dans la fente (0..1)
  coinDrop: number
  // Pulse de la lumière interne (0..1)
  litPulse: number
  // Intensité d'agitation des capsules physiques (0..1)
  agitation: number
}

function createMachineAnim(): MachineAnim {
  return {
    knobRot: 0,
    squash: 0,
    door: 0,
    coinDrop: 0,
    litPulse: 0,
    agitation: 0,
  }
}

// Mini gacha capsule visual — same structure as the reveal capsule
function MiniCapsuleVisual({
  color,
  glow = false,
}: {
  color: string
  glow?: boolean
}) {
  const r = CAPSULE_RADIUS
  const bottomMatRef = useRef<THREE.MeshStandardMaterial>(null)

  // La capsule distribuée « respire » en émissif chaud — teaser neutre de la
  // suite (jamais la rareté : le résultat réseau n'est pas encore connu ici).
  useFrame(({ clock }) => {
    if (!glow || !bottomMatRef.current) {
      return
    }
    bottomMatRef.current.emissiveIntensity =
      0.45 + Math.sin(clock.elapsedTime * 9) * 0.3
  })

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
          ref={bottomMatRef}
          color={color}
          roughness={0.85}
          metalness={0}
          emissive={glow ? '#ffd9a0' : '#000000'}
          emissiveIntensity={glow ? 0.45 : 0}
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
function DispensedPhysicsCapsule({
  visible,
  color,
}: {
  visible: boolean
  color: string
}) {
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
      <MiniCapsuleVisual color={color} glow />
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

// Jiggle au drag caméra + agitation pilotée par la timeline du tirage :
// pendant la phase « brassage », les capsules reçoivent de vraies impulsions
// physiques (latérales + pops verticaux) — la machine remue pour de vrai.
function CapsuleStirrer({
  bodies,
  anim,
}: {
  bodies: React.RefObject<(RapierRigidBody | null)[]>
  anim: MachineAnim
}) {
  const prevAzimuth = useRef(0)

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: boucle physique par frame — clamp, confinement, agitation et jiggle partagent l'itération sur les corps
  useFrame(({ camera }) => {
    const azimuth = Math.atan2(camera.position.x, camera.position.z)
    const delta = azimuth - prevAzimuth.current
    prevAzimuth.current = azimuth

    // Clamp velocities + force balls inside globe
    const maxSpeed = anim.agitation > 0 ? 2 : 1.5
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

      // Agitation du tirage : le fond vibre — petits pops rares, réservés aux
      // capsules de la moitié basse, la gravité garde le tas naturel.
      if (
        anim.agitation > 0.02 &&
        ry < 0 &&
        Math.random() < anim.agitation * 0.1
      ) {
        const k = anim.agitation * 0.006
        body.applyImpulse(
          {
            x: (Math.random() - 0.5) * k * 1.6,
            y: Math.random() * k,
            z: (Math.random() - 0.5) * k * 1.6,
          },
          true,
        )
      }
    }

    // Jiggle au drag caméra (comportement historique)
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
  dispensedColor,
  anim,
}: {
  capsules: { id: string; pos: [number, number, number]; color: string }[]
  showDispensed: boolean
  dispensedColor: string
  anim: MachineAnim
}) {
  const bodiesRef = useRef<(RapierRigidBody | null)[]>([])

  return (
    <Physics gravity={[0, -9.81, 0]}>
      <GlobeFloorCollider />
      <DispensingRampCollider />
      {capsules.map((c, i) => (
        <PhysicsCapsule
          key={c.id}
          color={c.color}
          startPos={c.pos}
          rigidBodyRef={(el) => {
            bodiesRef.current[i] = el
          }}
        />
      ))}
      <DispensedPhysicsCapsule visible={showDispensed} color={dispensedColor} />
      <CapsuleStirrer bodies={bodiesRef} anim={anim} />
    </Physics>
  )
}

// Oven-knob style dial + coin slot + push button + pièce animée
function Dial({ anim }: { anim: MachineAnim }) {
  const knobRef = useRef<THREE.Group>(null)
  const coinRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (knobRef.current) {
      knobRef.current.rotation.z = -anim.knobRot
    }
    const coin = coinRef.current
    if (coin) {
      const d = anim.coinDrop
      coin.visible = d > 0.001 && d < 0.999
      coin.position.y = 0.1 + 0.1 - d * 0.16
      coin.scale.setScalar(d < 0.75 ? 1 : Math.max(0.001, 1 - (d - 0.75) * 4))
    }
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

      {/* Pièce insérée — debout, faces vers ±X, alignée sur la fente */}
      <group ref={coinRef} position={[0.22, 0.2, 0.02]} visible={false}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.012, 20]} />
          <meshStandardMaterial
            color="#f5c542"
            metalness={0.85}
            roughness={0.25}
            emissive="#8a6a10"
            emissiveIntensity={0.25}
          />
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
  const [showDispensed, setShowDispensed] = useState(false)
  const [dispensedColor, setDispensedColor] = useState(BALL_COLORS[3])
  const anim = useMemo(createMachineAnim, [])
  const reduced = usePrefersReducedMotion()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  const bodyGroupRef = useRef<THREE.Group>(null)
  const doorRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const animatingRef = useRef(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const capsules = useMemo(() => {
    const items: {
      id: string
      pos: [number, number, number]
      color: string
    }[] = []
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * 0.2
      items.push({
        id: `capsule-${i}`,
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

  useEffect(
    () => () => {
      tlRef.current?.kill()
      gsap.killTweensOf(anim)
    },
    [anim],
  )

  useFrame(({ clock }) => {
    const body = bodyGroupRef.current
    if (body) {
      const s = anim.squash
      body.scale.set(1 + s * 0.035, 1 - s * 0.06, 1 + s * 0.035)
    }
    const door = doorRef.current
    if (door) {
      door.rotation.x = anim.door * -1.15
    }
    const light = lightRef.current
    if (light) {
      light.intensity =
        0.6 +
        anim.litPulse * 2.2 +
        anim.agitation * (1.2 + Math.sin(clock.elapsedTime * 30) * 0.5)
    }
  })

  useImperativeHandle(ref, () => ({
    // Chorégraphie gsap : pièce → crank à crans → brassage physique réel des
    // capsules (lumière qui pulse) → trappe qui s'ouvre + capsule éjectée
    // luisante. Résout quand la capsule a fini de rouler.
    async startAnimation() {
      if (animatingRef.current) {
        return
      }
      animatingRef.current = true
      setDispensedColor(
        BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      )

      const tl = gsap.timeline()
      tlRef.current = tl

      tl.call(() => capsuleAudio.coin())
      tl.fromTo(
        anim,
        { coinDrop: 0 },
        { coinDrop: 1, duration: 0.35, ease: 'power2.in' },
      )

      for (let i = 0; i < 3; i++) {
        tl.call(() => capsuleAudio.crank())
        tl.to(anim, {
          knobRot: `+=${(Math.PI * 2) / 3}`,
          duration: 0.24,
          ease: 'back.out(2.5)',
        })
        tl.fromTo(
          anim,
          { squash: 0 },
          { squash: 1, duration: 0.07, yoyo: true, repeat: 1 },
          '<',
        )
        tl.to({}, { duration: 0.05 })
      }

      tl.call(() => capsuleAudio.rattle())
      tl.to(anim, { agitation: 1, duration: 0.12 })
      tl.to(anim, { litPulse: 1, duration: 0.3, yoyo: true, repeat: 1 }, '<')
      tl.to(anim, { agitation: 0, duration: 0.45 }, '+=0.45')

      tl.call(() => {
        capsuleAudio.dispense()
        setShowDispensed(true)
      })
      tl.to(anim, { door: 1, duration: 0.22, ease: 'back.out(3)' }, '<')
      tl.fromTo(
        anim,
        { squash: 0 },
        { squash: 1, duration: 0.09, yoyo: true, repeat: 1 },
        '<',
      )
      tl.to({}, { duration: 0.95 })
      tl.to(anim, { door: 0, duration: 0.3, ease: 'power2.in' })

      if (reducedRef.current) {
        tl.timeScale(1.5)
      }

      await tl.then()
      setShowDispensed(false)
      animatingRef.current = false
    },
  }))

  return (
    <group>
      {/* Corps + socle : le groupe subit le squash & stretch */}
      <group ref={bodyGroupRef}>
        {/* ── BODY (square) ── */}
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshPhysicalMaterial
            color="#cc2936"
            roughness={0.35}
            metalness={0.05}
            clearcoat={0.6}
            clearcoatRoughness={0.3}
          />
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
          {/* Trappe qui bascule vers l'avant quand la capsule sort */}
          <group ref={doorRef} position={[0, -0.095, 0.012]}>
            <mesh position={[0, 0.095, 0]}>
              <planeGeometry args={[0.22, 0.19]} />
              <meshPhysicalMaterial
                color="#e8ebf2"
                transparent
                opacity={0.5}
                roughness={0.15}
                clearcoat={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
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
          <meshPhysicalMaterial
            color="#cc2936"
            roughness={0.35}
            metalness={0.05}
            clearcoat={0.6}
            clearcoatRoughness={0.3}
          />
        </mesh>

        {/* ── DIAL + COIN SLOT ── */}
        <Dial anim={anim} />
      </group>

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
        <meshPhysicalMaterial
          color="#cc2936"
          roughness={0.35}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
        />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshPhysicalMaterial
          color="#cc2936"
          roughness={0.35}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
        />
      </mesh>

      {/* ── ALL PHYSICS (globe capsules + dispensed capsule + ramp) ── */}
      <PhysicsWorld
        capsules={capsules}
        showDispensed={showDispensed}
        dispensedColor={dispensedColor}
        anim={anim}
      />

      {/* ── INTERNAL LIGHT — pulse pendant le brassage ── */}
      <pointLight
        ref={lightRef}
        position={[0, 0.5, 0]}
        color="#f59e0b"
        intensity={0.6}
        distance={2}
      />
    </group>
  )
})

GashaponMachine.displayName = 'GashaponMachine'
