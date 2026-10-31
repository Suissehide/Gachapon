import { Billboard, Trail } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { astralPalette, type CapsuleAnim } from './capsuleConfig'

// Trajet de l'étoile : courbe de Bézier du fond du ciel (en haut à gauche)
// jusqu'au centre, où elle éclot en capsule. `anim.fall` va de 1 (départ)
// à 0 (arrivée).
const START = new THREE.Vector3(-5.5, 3.8, -7)
const CONTROL = new THREE.Vector3(-1.2, 3.4, -3)
const END = new THREE.Vector3(0, 0, 0)

export function meteorPosition(fall: number, out: THREE.Vector3) {
  const t = 1 - fall
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return out
    .copy(START)
    .multiplyScalar(a)
    .addScaledVector(CONTROL, b)
    .addScaledVector(END, c)
}

const SPARK_COUNT = 70
const SPARK_LIFE = 0.7

const glintVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Éclat de l'étoile : cœur blanc, halo doré, quatre branches fines.
const glintFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float core = exp(-r * r * 60.0);
    float halo = exp(-r * r * 7.0) * 0.55;
    float rays = exp(-abs(p.x) * 40.0) * exp(-abs(p.y) * 2.2)
               + exp(-abs(p.y) * 40.0) * exp(-abs(p.x) * 2.2);
    vec3 col = mix(uGold, vec3(1.0), clamp(core * 1.5 + rays * 0.6, 0.0, 1.0));
    float a = clamp(core + halo + rays * 0.8, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`

const sparkVert = /* glsl */ `
  attribute float aLife;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (2.0 + 5.0 * aLife) * (12.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const sparkFrag = /* glsl */ `
  uniform vec3 uGold;
  varying float vLife;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vLife;
    gl_FragColor = vec4(mix(uGold, vec3(1.0), vLife * 0.6), a);
  }
`

// Onde de choc à l'éclosion : un anneau de lumière qui s'élargit et s'éteint.
const shockFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform float uImpact;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float radius = 0.15 + uImpact * 0.8;
    float band = exp(-pow((r - radius) * 18.0, 2.0));
    float a = band * (1.0 - uImpact);
    gl_FragColor = vec4(mix(vec3(1.0), uGold, uImpact), a);
  }
`

/**
 * L'étoile filante qui devient la capsule astrale : un point de lumière tombe
 * du fond du ciel en arc, avec sa traînée et ses étincelles, puis une onde de
 * choc marque l'éclosion de la capsule (`anim.impact`).
 */
export function AstralMeteor({ anim }: { anim: CapsuleAnim }) {
  const headRef = useRef<THREE.Group>(null)
  // La traînée lit la position monde de l'étoile dès son montage : montée
  // trop tôt, elle partirait de l'origine (matrice pas encore calculée) et
  // tirerait un trait depuis le centre. On attend la première image.
  const [trailReady, setTrailReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setTrailReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const shockRef = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => new THREE.Vector3(), [])
  const gold = useMemo(() => new THREE.Color(astralPalette().gold), [])

  const glintUniforms = useMemo(
    () => ({ uGold: { value: gold }, uOpacity: { value: 0 } }),
    [gold],
  )
  const shockUniforms = useMemo(
    () => ({ uGold: { value: gold }, uImpact: { value: 0 } }),
    [gold],
  )

  const sparks = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3),
    )
    geometry.setAttribute(
      'aLife',
      new THREE.BufferAttribute(new Float32Array(SPARK_COUNT), 1),
    )
    return {
      geometry,
      velocity: new Float32Array(SPARK_COUNT * 3),
      next: 0,
    }
  }, [])

  useFrame((_, delta) => {
    const head = headRef.current
    const shock = shockRef.current
    if (!head || !shock) {
      return
    }
    const flying = anim.fall > 0.001
    meteorPosition(anim.fall, pos)
    head.position.copy(pos)
    head.visible = flying
    // L'étoile s'allume au départ, puis brille de plus en plus en approchant.
    glintUniforms.uOpacity.value = Math.min(1, (1 - anim.fall) * 6)
    head.scale.setScalar(0.6 + (1 - anim.fall) * 0.9)

    const positions = sparks.geometry.attributes
      .position as THREE.BufferAttribute
    const life = sparks.geometry.attributes.aLife as THREE.BufferAttribute
    if (flying) {
      for (let k = 0; k < 2; k++) {
        const i = sparks.next
        sparks.next = (sparks.next + 1) % SPARK_COUNT
        positions.setXYZ(i, pos.x, pos.y, pos.z)
        sparks.velocity[i * 3] = (Math.random() - 0.5) * 0.8
        sparks.velocity[i * 3 + 1] = (Math.random() - 0.2) * 0.6
        sparks.velocity[i * 3 + 2] = (Math.random() - 0.5) * 0.8
        life.setX(i, 1)
      }
    }
    for (let i = 0; i < SPARK_COUNT; i++) {
      const l = life.getX(i)
      if (l <= 0) {
        continue
      }
      sparks.velocity[i * 3 + 1] -= delta * 1.6
      positions.setXYZ(
        i,
        positions.getX(i) + sparks.velocity[i * 3] * delta,
        positions.getY(i) + sparks.velocity[i * 3 + 1] * delta,
        positions.getZ(i) + sparks.velocity[i * 3 + 2] * delta,
      )
      life.setX(i, Math.max(0, l - delta / SPARK_LIFE))
    }
    positions.needsUpdate = true
    life.needsUpdate = true

    shock.visible = anim.impact > 0 && anim.impact < 1
    shockUniforms.uImpact.value = anim.impact
    shock.scale.setScalar(1 + anim.impact * 3.5)
  })

  return (
    <>
      {trailReady && (
        <Trail
          width={2.6}
          length={9}
          decay={1.2}
          color={gold}
          attenuation={(w) => w * w}
          target={headRef as React.RefObject<THREE.Object3D>}
        />
      )}
      <group ref={headRef} position={START} visible={false}>
        <Billboard>
          <mesh>
            <planeGeometry args={[1.4, 1.4]} />
            <shaderMaterial
              vertexShader={glintVert}
              fragmentShader={glintFrag}
              uniforms={glintUniforms}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      </group>
      <points geometry={sparks.geometry}>
        <shaderMaterial
          vertexShader={sparkVert}
          fragmentShader={sparkFrag}
          uniforms={glintUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <mesh ref={shockRef} visible={false} position={[0, 0, -0.5]}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          vertexShader={glintVert}
          fragmentShader={shockFrag}
          uniforms={shockUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}
