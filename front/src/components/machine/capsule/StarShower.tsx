import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { makeSprite } from './ChargeSparks'
import { astralPalette, type CapsuleAnim } from './capsuleConfig'

// Pluie d'étoiles des capsules célestes : au burst, la coque se déchire en
// éclats qui jaillissent puis retombent en s'éteignant. Un seul Points,
// trajectoires balistiques calculées depuis l'instant d'ouverture. Palette
// astrale par défaut, `palette` pour une autre capsule.

const COUNT = 220
const LIFE_S = 1.6
const GRAVITY = 3.2

export function StarShower({
  anim,
  reduced,
  palette,
}: {
  anim: CapsuleAnim
  reduced: boolean
  palette?: readonly string[]
}) {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)
  const startRef = useRef<number | null>(null)

  const sprite = useMemo(makeSprite, [])
  const { positions, colors, velocity } = useMemo(() => {
    const pal = astralPalette()
    const colors = (
      palette ?? [
        pal.gold,
        pal.dayHaze,
        pal.daySky,
        pal.nightPink,
        pal.nightViolet,
        '#ffffff',
      ]
    ).map((c) => new THREE.Color(c))
    const pos = new Float32Array(COUNT * 3)
    const col = new Float32Array(COUNT * 3)
    const vel = new Float32Array(COUNT * 3)
    const v = new THREE.Vector3()
    for (let i = 0; i < COUNT; i++) {
      v.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize()
      // Éclats projetés surtout vers le haut, pour qu'ils retombent en pluie
      v.y = Math.abs(v.y) * 0.8 + 0.2
      v.multiplyScalar(1.6 + Math.random() * 2.8)
      vel[i * 3] = v.x
      vel[i * 3 + 1] = v.y
      vel[i * 3 + 2] = v.z
      colors[i % colors.length].toArray(col, i * 3)
    }
    return { positions: pos, colors: col, velocity: vel }
  }, [palette])

  useFrame((state) => {
    const points = pointsRef.current
    const mat = matRef.current
    if (!points || !mat) {
      return
    }
    if (anim.split <= 0) {
      startRef.current = null
      points.visible = false
      return
    }
    const now = state.clock.elapsedTime
    startRef.current ??= now
    const t = now - startRef.current
    points.visible = t < LIFE_S
    if (!points.visible) {
      return
    }
    for (let i = 0; i < COUNT * 3; i += 3) {
      positions[i] = velocity[i] * t
      positions[i + 1] = velocity[i + 1] * t - 0.5 * GRAVITY * t * t
      positions[i + 2] = velocity[i + 2] * t
    }
    points.geometry.attributes.position.needsUpdate = true
    mat.opacity = 1 - t / LIFE_S
    // Scintillement coupé en reduced motion
    mat.size = reduced
      ? 0.09
      : 0.09 * (0.7 + 0.5 * Math.abs(Math.sin(now * 14)))
  })

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={sprite ?? undefined}
        size={0.09}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
