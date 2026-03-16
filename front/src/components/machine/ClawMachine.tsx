import { animated, useSpring } from '@react-spring/three'
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

export type MachineState =
  | 'idle'
  | 'descending'
  | 'grabbing'
  | 'ascending'
  | 'releasing'

export type ClawMachineHandle = {
  startAnimation: () => Promise<void>
}

// Casing extérieur (murs de la machine)
function MachineCasing() {
  return (
    <group>
      {/* Fond */}
      <mesh position={[0, 0, -1]}>
        <boxGeometry args={[2.2, 3.2, 0.1]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Côtés */}
      <mesh position={[-1.1, 0, 0]}>
        <boxGeometry args={[0.1, 3.2, 2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[1.1, 0, 0]}>
        <boxGeometry args={[0.1, 3.2, 2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Toit */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.2, 0.1, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      {/* Sol */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[2.2, 0.1, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      {/* Vitre avant (transparente) */}
      <mesh position={[0, 0, 1]}>
        <boxGeometry args={[2.2, 3.2, 0.05]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.15}
          roughness={0}
          metalness={0}
          transmission={0.9}
        />
      </mesh>
      {/* Rails */}
      {[-0.8, 0, 0.8].map((x, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry list
        <mesh key={i} position={[x, 0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
          <meshStandardMaterial
            color="#e94560"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  )
}

// Pince (3 grappins)
function Claw({ open }: { open: boolean }) {
  const armAngle = open ? 0.4 : 0

  return (
    <group>
      {/* Corps de la pince */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.15]} />
        <meshStandardMaterial color="#e94560" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* 3 grappins — key=deg is stable (values: 0, 120, 240) */}
      {[0, 120, 240].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x = Math.sin(rad) * 0.1
        const z = Math.cos(rad) * 0.1
        return (
          <mesh
            key={deg}
            position={[x, -0.25, z]}
            rotation={[armAngle * Math.cos(rad), 0, armAngle * Math.sin(rad)]}
          >
            <boxGeometry args={[0.04, 0.25, 0.04]} />
            <meshStandardMaterial
              color="#c0392b"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Boules au fond de la machine
function GachaBalls({ count = 12 }: { count?: number }) {
  const positions = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 1.6,
        y: -1.2 + Math.random() * 0.3,
        z: (Math.random() - 0.5) * 1.4,
      })),
    [count],
  )

  return (
    <group>
      {positions.map((pos, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry list
        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            transparent
            opacity={0.85}
            roughness={0.05}
            metalness={0}
            transmission={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

// Boule en cours de prise (utilise animated.mesh directement)
function GrabbedBall({
  yPos,
}: {
  yPos: ReturnType<typeof useSpring>[0][string]
}) {
  return (
    <animated.mesh position-y={yPos}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshPhysicalMaterial
        color="#f0f0f0"
        transparent
        opacity={0.9}
        roughness={0.05}
        transmission={0.3}
      />
    </animated.mesh>
  )
}

export const ClawMachine = forwardRef<ClawMachineHandle>((_, ref) => {
  const [machineState, setMachineState] = useState<MachineState>('idle')
  const [clawOpen, setClawOpen] = useState(true)

  const [clawSpring, clawApi] = useSpring(() => ({ y: 1.2 }))
  const [ballSpring, ballApi] = useSpring(() => ({ y: -1.2 }))
  const [showBall, setShowBall] = useState(false)

  useImperativeHandle(ref, () => ({
    async startAnimation() {
      setMachineState('descending')
      setClawOpen(true)
      setShowBall(false)

      // 1. Descendre la pince
      await clawApi.start({ y: -1.0, config: { duration: 1200 } })[0]

      // 2. Fermer les grappins
      setMachineState('grabbing')
      setClawOpen(false)
      await new Promise((r) => setTimeout(r, 400))

      // 3. Faire apparaître la boule et remonter
      setShowBall(true)
      ballApi.start({ y: -1.0 })
      setMachineState('ascending')
      await clawApi.start({ y: 1.2, config: { duration: 1200 } })[0]
      ballApi.start({ y: 1.2 })

      // 4. Lâcher la boule (côté goulotte)
      setMachineState('releasing')
      await new Promise((r) => setTimeout(r, 600))
      await ballApi.start({ y: -0.5, config: { duration: 800 } })[0]

      setMachineState('idle')
      setClawOpen(true)
      setShowBall(false)
      clawApi.start({ y: 1.2 })
    },
  }))

  // machineState is available for external inspection via ref or future use
  void machineState

  return (
    <group>
      <MachineCasing />
      <GachaBalls />

      {/* Pince animée */}
      <animated.group position-y={clawSpring.y}>
        <Claw open={clawOpen} />
        {/* Câble */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1.5, 4]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </animated.group>

      {/* Boule en cours de transport */}
      {showBall && <GrabbedBall yPos={ballSpring.y} />}

      {/* Lumière interne */}
      <pointLight
        position={[0, 0.5, 0]}
        color="#4ecdc4"
        intensity={0.8}
        distance={3}
      />
      <pointLight
        position={[0, -0.5, 0.5]}
        color="#e94560"
        intensity={0.4}
        distance={2}
      />
    </group>
  )
})

ClawMachine.displayName = 'ClawMachine'
