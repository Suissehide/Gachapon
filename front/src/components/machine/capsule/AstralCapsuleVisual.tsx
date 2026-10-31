import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion.ts'
import { astralPalette, MINI_CAPSULE_RADIUS } from './capsuleConfig'
import astralFrag from './shaders/astral.frag.glsl'
import astralVert from './shaders/astral.vert.glsl'

export type AstralMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uGlow: { value: THREE.Color }
    uOpacity: { value: number }
  }
}

// Matériau de la coque astrale (nébuleuse jour / nuit, voir astral.frag.glsl).
// Un même matériau sert aux deux hémisphères : le shader choisit jour ou nuit
// d'après le signe de y en espace objet.
export function createAstralMaterial(): AstralMaterial {
  const p = astralPalette()
  const c = (hex: string) => ({ value: new THREE.Color(hex) })
  const uniforms = {
    uDaySky: c(p.daySky),
    uDayHaze: c(p.dayHaze),
    uDayCloud: c(p.dayCloud),
    uDayEmber: c(p.dayEmber),
    uNightDeep: c(p.nightDeep),
    uNightViolet: c(p.nightViolet),
    uNightPink: c(p.nightPink),
    uNightBlue: c(p.nightBlue),
    uGold: c(p.gold),
    uTime: { value: 0 },
    uGlow: { value: new THREE.Color(0, 0, 0) },
    uOpacity: { value: 1 },
  }
  const material = new THREE.ShaderMaterial({
    vertexShader: astralVert,
    fragmentShader: astralFrag,
    uniforms,
    side: THREE.DoubleSide,
  })
  return material as AstralMaterial
}

// Liseré nacré au joint des deux hémisphères : il fait le lien entre le ciel
// de jour et la nuit violette sans trancher comme un trait d'or.
export function AstralBand({
  radius,
  segments,
}: {
  radius: number
  segments: number
}) {
  const p = astralPalette()
  return (
    <mesh>
      <cylinderGeometry
        args={[
          radius * 1.012,
          radius * 1.012,
          radius * 0.09,
          segments,
          1,
          true,
        ]}
      />
      <meshStandardMaterial
        color={p.pearl}
        emissive={p.pearl}
        emissiveIntensity={0.45}
        roughness={0.3}
        metalness={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Mini-capsule astrale des machines, même rayon que `MiniCapsuleVisual`.
// La capsule distinguée (`glow`, celle qui sort de la trappe) respire en
// émissif doré.
export function AstralCapsuleVisual({ glow = false }: { glow?: boolean }) {
  const r = MINI_CAPSULE_RADIUS
  const reduced = usePrefersReducedMotion()
  const material = useMemo(createAstralMaterial, [])
  const gold = useMemo(() => new THREE.Color(astralPalette().gold), [])

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!reduced) {
      material.uniforms.uTime.value = t
    }
    if (glow) {
      const breath = reduced ? 0.25 : 0.25 + Math.sin(t * 9) * 0.15
      material.uniforms.uGlow.value.copy(gold).multiplyScalar(breath)
    }
  })

  return (
    <group>
      <mesh material={material}>
        <sphereGeometry args={[r, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={material}>
        <sphereGeometry
          args={[r, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
      </mesh>
      <AstralBand radius={r} segments={16} />
    </group>
  )
}
