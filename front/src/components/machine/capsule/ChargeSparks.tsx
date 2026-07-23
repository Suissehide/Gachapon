import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { CapsuleAnim } from './capsuleConfig'

// Étincelles de charge : des points lumineux naissent sur une coquille autour
// de la capsule et convergent vers elle pendant la vibration — l'énergie est
// « aspirée ». CPU-léger : un seul BufferAttribute muté, rendu additif.

const COUNT = 150

type SparkData = {
  dir: Float32Array // directions unitaires xyz
  radius: Float32Array
  speed: Float32Array
}

function makeSprite(): THREE.Texture | null {
  if (typeof document === 'undefined') {
    return null
  }
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) {
    return null
  }
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function spawnRadius(): number {
  return 2.3 + Math.random() * 1.3
}

type Props = {
  anim: CapsuleAnim
  // Couleur mutable partagée avec la scène (lerpée vers le palier teasé)
  color: THREE.Color
  // Part des particules actives (0..1, dépend du palier)
  getRatio: () => number
}

export function ChargeSparks({ anim, color, getRatio }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)

  const sprite = useMemo(makeSprite, [])
  const { positions, data } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const dir = new Float32Array(COUNT * 3)
    const radius = new Float32Array(COUNT)
    const speed = new Float32Array(COUNT)
    const v = new THREE.Vector3()
    for (let i = 0; i < COUNT; i++) {
      v.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize()
      dir[i * 3] = v.x
      dir[i * 3 + 1] = v.y
      dir[i * 3 + 2] = v.z
      radius[i] = spawnRadius() * Math.random()
      speed[i] = 0.8 + Math.random() * 1.4
    }
    return {
      positions: pos,
      data: { dir, radius, speed } as SparkData,
    }
  }, [])

  useFrame((state, delta) => {
    const points = pointsRef.current
    const mat = matRef.current
    if (!points || !mat) {
      return
    }
    const c = anim.charge
    const visible = c > 0.02 && anim.split < 0.1
    points.visible = visible
    if (!visible) {
      return
    }

    const activeCount = Math.floor(COUNT * getRatio())
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      if (i >= activeCount) {
        positions[i * 3 + 1] = -999
        continue
      }
      data.radius[i] -= delta * data.speed[i] * (0.5 + c * 2.4)
      if (data.radius[i] < 0.2) {
        data.radius[i] = spawnRadius()
      }
      const r = data.radius[i]
      // Légère spirale pour éviter des trajectoires rectilignes mortes
      const swirl = t * 0.6 + i
      const x = data.dir[i * 3] * r
      const z = data.dir[i * 3 + 2] * r
      positions[i * 3] = x * Math.cos(swirl * 0.15) - z * Math.sin(swirl * 0.15)
      positions[i * 3 + 1] = data.dir[i * 3 + 1] * r
      positions[i * 3 + 2] =
        x * Math.sin(swirl * 0.15) + z * Math.cos(swirl * 0.15)
    }
    points.geometry.attributes.position.needsUpdate = true

    mat.color.copy(color)
    mat.opacity = Math.min(1, c * 2.2) * (1 - anim.inhale * 0.4)
    mat.size = 0.06 + c * 0.05
  })

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={sprite ?? undefined}
        size={0.07}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
