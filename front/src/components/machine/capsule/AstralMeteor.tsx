import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { astralPalette, type CapsuleAnim } from './capsuleConfig'

// Trajet de l'étoile : courbe de Bézier qui entre par le haut à gauche, hors
// cadre, et finit au centre. `anim.fall` va de 1 (départ) à 0 (arrivée) ;
// au-delà de 1 la courbe se prolonge, ce qui donne sa longueur à la traînée
// dès l'entrée dans le cadre.
const START = new THREE.Vector3(-11, 6.5, -5)
const CONTROL = new THREE.Vector3(-2.5, 4.6, -2.5)
const END = new THREE.Vector3(0, 0, 0.6)

function meteorPosition(fall: number, out: THREE.Vector3) {
  const t = 1 - fall
  return out
    .copy(START)
    .multiplyScalar((1 - t) * (1 - t))
    .addScaledVector(CONTROL, 2 * (1 - t) * t)
    .addScaledVector(END, t * t)
}

// Traînée : un ruban tendu sur la courbe, derrière la tête. Échantillonné
// sur le trajet (et non sur les images passées) : sa longueur ne dépend pas
// de la cadence. Le plan reste face caméra (décalage perpendiculaire en x/y).
const TAIL_POINTS = 32
const TAIL_SPAN = 0.45
const TAIL_BANDS = [
  { width: 1.8, core: false },
  { width: 0.45, core: true },
]

function createRibbonGeometry() {
  const geometry = new THREE.BufferGeometry()
  const uv = new Float32Array(TAIL_POINTS * 2 * 2)
  for (let i = 0; i < TAIL_POINTS; i++) {
    const u = i / (TAIL_POINTS - 1)
    uv.set([u, 0, u, 1], i * 4)
  }
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(TAIL_POINTS * 2 * 3), 3),
  )
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  const index: number[] = []
  for (let i = 0; i < TAIL_POINTS - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geometry.setIndex(index)
  return geometry
}

// Réécrit les sommets d'un ruban le long des points (`points[0]` = tête).
// La largeur se resserre vers le bout de la traînée.
function writeRibbon(
  geometry: THREE.BufferGeometry,
  points: THREE.Vector3[],
  width: number,
) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < TAIL_POINTS; i++) {
    const p = points[i]
    const q = points[Math.min(i + 1, TAIL_POINTS - 1)]
    const r = points[Math.max(i - 1, 0)]
    let dx = q.x - r.x
    let dy = q.y - r.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    const half = (width / 2) * (1 - (i / (TAIL_POINTS - 1)) * 0.75)
    position.setXYZ(i * 2, p.x - dy * half, p.y + dx * half, p.z - 0.05)
    position.setXYZ(i * 2 + 1, p.x + dy * half, p.y - dx * half, p.z - 0.05)
  }
  position.needsUpdate = true
  geometry.computeBoundingSphere()
}

const DUST_COUNT = 220
const BURST_COUNT = 90
const DUST_LIFE = 1.1

const planeVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Boule de lumière : cœur blanc éblouissant, halo doré qui vire au violet
// sur les bords, quatre aigrettes fines qui scintillent.
const orbFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uViolet;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float core = exp(-r * r * 90.0);
    float glow = exp(-r * r * 14.0);
    float halo = exp(-r * 3.2) * 0.55;
    float flicker = 0.85 + 0.15 * sin(uTime * 23.0);
    float spikes = (exp(-abs(p.x) * 70.0) * exp(-abs(p.y) * 3.5)
                  + exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 3.5)) * flicker;
    vec3 col = mix(uViolet, uGold, smoothstep(0.9, 0.2, r));
    col = mix(col, vec3(1.0), clamp(core * 1.4 + glow * 0.6 + spikes, 0.0, 1.0));
    float a = clamp(core + glow * 0.9 + halo + spikes * 0.7, 0.0, 1.0);
    a *= smoothstep(1.0, 0.75, r);
    gl_FragColor = vec4(col, a * uOpacity);
  }
`

// Traînée : blanche près de la tête, or puis violet vers le bout, bords
// adoucis en travers. Le cœur est une version fine et plus vive.
const tailFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uViolet;
  uniform float uCore;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = vUv.y * 2.0 - 1.0;
    float across = exp(-x * x * mix(5.0, 9.0, uCore));
    float along = pow(1.0 - vUv.x, 1.6);
    vec3 col = mix(uViolet, uGold, smoothstep(1.0, 0.35, vUv.x));
    col = mix(col, vec3(1.0), smoothstep(0.35, 0.0, vUv.x) * 0.9 + uCore * 0.6);
    float a = across * along * mix(0.45, 0.9, uCore) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`

const dustVert = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * aLife * (7.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const dustFrag = /* glsl */ `
  uniform vec3 uGold;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0 || vLife <= 0.0) discard;
    float a = exp(-d * d * 4.0) * vLife;
    gl_FragColor = vec4(mix(uGold, vec3(1.0), vLife * 0.7), a);
  }
`

// Flash d'arrivée plein cadre : opaque au pic pour cacher l'apparition de la
// capsule, bord légèrement doré.
const flashFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform float uFlash;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    vec3 col = mix(vec3(1.0), uGold, smoothstep(0.35, 1.0, r) * 0.6);
    gl_FragColor = vec4(col, uFlash);
  }
`

// Onde de lumière qui s'élargit après le flash.
const waveFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform float uImpact;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float radius = 0.12 + uImpact * 0.85;
    float band = exp(-pow((r - radius) * 14.0, 2.0));
    float inner = exp(-r * r * 6.0) * (1.0 - uImpact) * 0.5;
    float a = (band + inner) * (1.0 - uImpact) * step(0.001, uImpact);
    gl_FragColor = vec4(mix(vec3(1.0), uGold, 0.5), a);
  }
`

const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  blending: THREE.AdditiveBlending,
} as const

/**
 * L'étoile filante qui apporte la capsule astrale : une boule de lumière
 * entre par le haut à gauche, plonge en arc en vibrant de plus en plus, avec
 * sa traînée et sa poussière dorée. À l'arrivée (`anim.flash`) un flash blanc
 * couvre l'écran, une gerbe d'étincelles explose et une onde de lumière
 * s'élargit (`anim.impact`).
 */
export function AstralMeteor({ anim }: { anim: CapsuleAnim }) {
  const headRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)
  const pos = useMemo(() => new THREE.Vector3(), [])
  const burstDone = useRef(false)

  const colors = useMemo(() => {
    const p = astralPalette()
    return {
      gold: new THREE.Color(p.gold),
      violet: new THREE.Color(p.nightViolet),
    }
  }, [])

  const uniforms = useMemo(
    () => ({
      orb: {
        uGold: { value: colors.gold },
        uViolet: { value: colors.violet },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      tails: TAIL_BANDS.map((band) => ({
        uGold: { value: colors.gold },
        uViolet: { value: colors.violet },
        uCore: { value: band.core ? 1 : 0 },
        uOpacity: { value: 0 },
      })),
      dust: { uGold: { value: colors.gold } },
      flash: { uGold: { value: colors.gold }, uFlash: { value: 0 } },
      wave: { uGold: { value: colors.gold }, uImpact: { value: 0 } },
    }),
    [colors],
  )

  const ribbons = useMemo(() => TAIL_BANDS.map(createRibbonGeometry), [])
  useEffect(
    () => () => {
      for (const g of ribbons) {
        g.dispose()
      }
    },
    [ribbons],
  )
  const tailPoints = useMemo(
    () => Array.from({ length: TAIL_POINTS }, () => new THREE.Vector3()),
    [],
  )

  const dust = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const attr = (size: number) =>
      new THREE.BufferAttribute(new Float32Array(DUST_COUNT * size), size)
    geometry.setAttribute('position', attr(3))
    geometry.setAttribute('aLife', attr(1))
    geometry.setAttribute('aSize', attr(1))
    return { geometry, velocity: new Float32Array(DUST_COUNT * 3), next: 0 }
  }, [])
  useEffect(() => () => dust.geometry.dispose(), [dust])

  useFrame(({ clock }, delta) => {
    const head = headRef.current
    if (!head) {
      return
    }
    const flying = anim.fall > 0.001
    meteorPosition(anim.fall, pos)
    // La boule vibre de plus en plus en approchant.
    const shiver = (1 - anim.fall) ** 2 * 0.06
    const t = clock.elapsedTime
    head.position.set(
      pos.x + Math.sin(t * 61) * shiver,
      pos.y + Math.sin(t * 53 + 1.7) * shiver,
      pos.z,
    )
    head.visible = flying
    const scale = 0.7 + (1 - anim.fall) * 1.1
    head.scale.setScalar(scale)
    // La boule s'allume au départ, puis brille de plus en plus en approchant.
    const glow = Math.min(1, (1 - anim.fall) * 5)
    uniforms.orb.uOpacity.value = glow
    uniforms.orb.uTime.value = t
    for (const u of uniforms.tails) {
      u.uOpacity.value = glow
    }

    updateTail(tailRef.current, ribbons, tailPoints, anim.fall, scale)
    emitDust(dust, flying, pos, delta)
    if (anim.impact > 0 && !burstDone.current) {
      burstDone.current = true
      explodeDust(dust)
    }
    uniforms.flash.uFlash.value = anim.flash
    uniforms.wave.uImpact.value = anim.impact
  })

  return (
    <>
      {/* Traînée : halo large puis cœur fin et vif */}
      <group ref={tailRef} visible={false}>
        {TAIL_BANDS.map((band, i) => (
          <mesh
            key={band.core ? 'core' : 'halo'}
            geometry={ribbons[i]}
            renderOrder={band.core ? 2 : 1}
          >
            <shaderMaterial
              vertexShader={planeVert}
              fragmentShader={tailFrag}
              uniforms={uniforms.tails[i]}
              side={THREE.DoubleSide}
              {...ADDITIVE}
            />
          </mesh>
        ))}
      </group>

      {/* Tête : la boule de lumière */}
      <group ref={headRef} position={START} visible={false}>
        <Billboard>
          <mesh renderOrder={3}>
            <planeGeometry args={[2.4, 2.4]} />
            <shaderMaterial
              vertexShader={planeVert}
              fragmentShader={orbFrag}
              uniforms={uniforms.orb}
              {...ADDITIVE}
            />
          </mesh>
        </Billboard>
      </group>

      <points geometry={dust.geometry}>
        <shaderMaterial
          vertexShader={dustVert}
          fragmentShader={dustFrag}
          uniforms={uniforms.dust}
          {...ADDITIVE}
        />
      </points>

      {/* Onde de lumière derrière la capsule */}
      <mesh position={[0, 0, -0.6]}>
        <planeGeometry args={[7, 7]} />
        <shaderMaterial
          vertexShader={planeVert}
          fragmentShader={waveFrag}
          uniforms={uniforms.wave}
          {...ADDITIVE}
        />
      </mesh>

      {/* Flash plein cadre devant la capsule */}
      <mesh position={[0, 0, 3]} renderOrder={10}>
        <planeGeometry args={[14, 10]} />
        <shaderMaterial
          vertexShader={planeVert}
          fragmentShader={flashFrag}
          uniforms={uniforms.flash}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

// La traînée suit la courbe derrière la tête ; elle disparaît à l'arrivée,
// sous le flash.
function updateTail(
  tail: THREE.Group | null,
  ribbons: THREE.BufferGeometry[],
  points: THREE.Vector3[],
  fall: number,
  scale: number,
) {
  if (!tail) {
    return
  }
  tail.visible = fall > 0.001
  if (!tail.visible) {
    return
  }
  for (const [i, p] of points.entries()) {
    meteorPosition(fall + (TAIL_SPAN * i) / (TAIL_POINTS - 1), p)
  }
  for (const [i, band] of TAIL_BANDS.entries()) {
    writeRibbon(ribbons[i], points, band.width * scale)
  }
}

type Dust = {
  geometry: THREE.BufferGeometry
  velocity: Float32Array
  next: number
}

// Explosion de l'impact : une gerbe d'étincelles part du centre dans toutes
// les directions, sous le flash.
function explodeDust(dust: Dust) {
  const g = dust.geometry.attributes
  const position = g.position as THREE.BufferAttribute
  const life = g.aLife as THREE.BufferAttribute
  const size = g.aSize as THREE.BufferAttribute
  for (let k = 0; k < BURST_COUNT; k++) {
    const i = dust.next
    dust.next = (dust.next + 1) % DUST_COUNT
    const a = Math.random() * Math.PI * 2
    const speed = 2.5 + Math.random() * 4
    position.setXYZ(i, END.x, END.y, END.z)
    dust.velocity[i * 3] = Math.cos(a) * speed
    dust.velocity[i * 3 + 1] = Math.sin(a) * speed
    dust.velocity[i * 3 + 2] = (Math.random() - 0.5) * 2
    life.setX(i, 1)
    size.setX(i, 16 + Math.random() * 26)
  }
}

// Poussière dorée semée par la tête pendant le vol : elle dérive doucement
// et s'éteint.
function emitDust(
  dust: Dust,
  flying: boolean,
  pos: THREE.Vector3,
  delta: number,
) {
  const g = dust.geometry.attributes
  const position = g.position as THREE.BufferAttribute
  const life = g.aLife as THREE.BufferAttribute
  const size = g.aSize as THREE.BufferAttribute
  if (flying) {
    for (let k = 0; k < 4; k++) {
      const i = dust.next
      dust.next = (dust.next + 1) % DUST_COUNT
      position.setXYZ(
        i,
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + (Math.random() - 0.5) * 0.4,
        pos.z,
      )
      dust.velocity[i * 3] = (Math.random() - 0.5) * 0.5
      dust.velocity[i * 3 + 1] = (Math.random() - 0.6) * 0.5
      dust.velocity[i * 3 + 2] = (Math.random() - 0.5) * 0.3
      life.setX(i, 1)
      size.setX(i, 10 + Math.random() * 18)
    }
  }
  for (let i = 0; i < DUST_COUNT; i++) {
    const l = life.getX(i)
    if (l <= 0) {
      continue
    }
    const drag = Math.exp(-delta * 2.2)
    dust.velocity[i * 3] *= drag
    dust.velocity[i * 3 + 1] *= drag
    dust.velocity[i * 3 + 2] *= drag
    position.setXYZ(
      i,
      position.getX(i) + dust.velocity[i * 3] * delta,
      position.getY(i) + dust.velocity[i * 3 + 1] * delta,
      position.getZ(i) + dust.velocity[i * 3 + 2] * delta,
    )
    life.setX(i, Math.max(0, l - delta / DUST_LIFE))
  }
  position.needsUpdate = true
  life.needsUpdate = true
  size.needsUpdate = true
}
