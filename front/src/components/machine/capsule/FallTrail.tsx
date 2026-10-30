import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { astralPalette, type CapsuleAnim } from './capsuleConfig'

// Point de départ de la chute astrale : loin au fond du ciel, en haut à
// gauche. La capsule part de là (fall = 1), petite comme une étoile, et
// grossit en plongeant jusqu'au centre (fall = 0).
export const FALL_FROM = new THREE.Vector3(-3.2, 3.6, -9)

const TRAIL_LENGTH = 6
const TRAIL_WIDTH = 1.1
// Direction de la traînée à l'écran : vers le point de départ, dans le plan
// de la capsule (une traînée qui s'enfoncerait en profondeur resterait
// cachée derrière elle).
const ANGLE = Math.atan2(FALL_FROM.y, FALL_FROM.x)

const trailVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Tête brillante côté capsule (u = 0), queue qui s'efface (u = 1), bords
// adoucis en travers.
const trailFrag = /* glsl */ `
  uniform vec3 uHead;
  uniform vec3 uTail;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float along = 1.0 - vUv.x;
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float taper = mix(1.0, 0.15, vUv.x);
    float edge = smoothstep(1.0 - taper, 1.0 - taper + 0.35, across);
    float a = pow(along, 1.6) * edge * uOpacity;
    gl_FragColor = vec4(mix(uTail, uHead, along), a);
  }
`

/**
 * Traînée d'étoile filante derrière la capsule astrale pendant sa chute.
 * Elle suit la capsule, raccourcit à l'approche et disparaît à l'impact.
 */
export function FallTrail({ anim }: { anim: CapsuleAnim }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => {
    const p = astralPalette()
    return {
      uHead: { value: new THREE.Color('#ffffff') },
      uTail: { value: new THREE.Color(p.gold) },
      uOpacity: { value: 0 },
    }
  }, [])
  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return
    }
    const f = anim.fall
    mesh.visible = f > 0.001
    if (!mesh.visible) {
      return
    }
    // La traînée s'étire au départ puis se résorbe sur la tête à l'arrivée.
    const length = TRAIL_LENGTH * Math.min(1, f * 2.5)
    mesh.scale.set(length, 1, 1)
    mesh.position.set(
      FALL_FROM.x * f + Math.cos(ANGLE) * (length / 2),
      FALL_FROM.y * f + Math.sin(ANGLE) * (length / 2),
      FALL_FROM.z * f - 0.3,
    )
    uniforms.uOpacity.value = Math.min(1, f * 4)
  })

  return (
    <mesh ref={meshRef} rotation={[0, 0, ANGLE]} visible={false}>
      <planeGeometry args={[1, TRAIL_WIDTH]} />
      <shaderMaterial
        vertexShader={trailVert}
        fragmentShader={trailFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
