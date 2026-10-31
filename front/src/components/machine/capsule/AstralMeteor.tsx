import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { astralPalette, type CapsuleAnim } from './capsuleConfig'

// Trajet de l'étoile : courbe de Bézier du fond du ciel (en haut à gauche)
// jusqu'au centre. `anim.fall` va de 1 (départ) à 0 (arrivée).
const START = new THREE.Vector3(-6, 4.2, -6)
const CONTROL = new THREE.Vector3(-1.4, 3.6, -2.5)
const END = new THREE.Vector3(0, 0, 0.6)

function meteorPosition(fall: number, out: THREE.Vector3) {
  const t = 1 - fall
  return out
    .copy(START)
    .multiplyScalar((1 - t) * (1 - t))
    .addScaledVector(CONTROL, 2 * (1 - t) * t)
    .addScaledVector(END, t * t)
}

// Étoile pleine à `points` branches, centrée sur l'origine.
function starShape(points: number, outer: number, inner: number) {
  const shape = new THREE.Shape()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

// Queue en bandes plates : un ruban tendu sur la courbe, derrière la tête,
// qui s'effile vers l'arrière. Échantillonné sur le trajet (et non sur les
// images passées) : la queue garde sa longueur quelle que soit la cadence.
// Le plan du ruban reste face caméra (décalage perpendiculaire en x/y).
const TAIL_POINTS = 26
const TAIL_SPAN = 0.42
const TAIL_BANDS = [
  { width: 1.5, color: 'pink' as const, z: -0.06 },
  { width: 1, color: 'gold' as const, z: -0.04 },
  { width: 0.42, color: 'white' as const, z: -0.02 },
]

function createRibbonGeometry() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(TAIL_POINTS * 2 * 3), 3),
  )
  const index: number[] = []
  for (let i = 0; i < TAIL_POINTS - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geometry.setIndex(index)
  return geometry
}

// Réécrit les sommets d'un ruban le long des points (`points[0]` = tête). La largeur décroît jusqu'à zéro au bout de la queue.
function writeRibbon(
  geometry: THREE.BufferGeometry,
  points: THREE.Vector3[],
  width: number,
  z: number,
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
    const half = (width / 2) * (1 - i / (TAIL_POINTS - 1))
    position.setXYZ(i * 2, p.x - dy * half, p.y + dx * half, p.z + z)
    position.setXYZ(i * 2 + 1, p.x + dy * half, p.y - dx * half, p.z + z)
  }
  position.needsUpdate = true
  geometry.computeBoundingSphere()
}

const SPARK_COUNT = 90
const SPARK_LIFE = 0.65
const SPEED_LINE_IDS = Array.from({ length: 18 }, (_, i) => `speed-line-${i}`)

const sparkVert = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  attribute vec3 aColor;
  varying float vLife;
  varying vec3 vColor;
  void main() {
    vLife = aLife;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.4 + 0.6 * aLife) * (7.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

// Étincelle cartoon : étoile à quatre branches pleine, sans dégradé.
const sparkFrag = /* glsl */ `
  varying float vLife;
  varying vec3 vColor;
  void main() {
    vec2 p = abs(gl_PointCoord - 0.5) * 2.0;
    float star = p.x * p.y * 6.0 + (p.x + p.y) * 0.55;
    if (star > 0.75 || vLife <= 0.0) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`

const planeVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Flash d'impact plein cadre : blanc au centre, bord doré, opaque au pic
// pour cacher l'apparition de la capsule.
const flashFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform float uFlash;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    vec3 col = mix(vec3(1.0), uGold, smoothstep(0.35, 1.0, r));
    gl_FragColor = vec4(col, uFlash);
  }
`

type Palette = {
  gold: THREE.Color
  goldDeep: THREE.Color
  pink: THREE.Color
  ink: THREE.Color
  white: THREE.Color
}

/**
 * L'étoile filante qui apporte la capsule astrale, en style cartoon : une
 * grosse étoile dorée cernée de violet qui tourne, une queue en trois bandes
 * plates, des étincelles en étoile. À l'arrivée (`anim.flash`, `anim.impact`)
 * un flash blanc couvre l'écran pendant que la capsule apparaît derrière,
 * puis une étoile d'impact et des traits de vitesse s'ouvrent.
 */
export function AstralMeteor({ anim }: { anim: CapsuleAnim }) {
  const headRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const burstRef = useRef<THREE.Group>(null)
  const linesRef = useRef<THREE.Group>(null)
  const pos = useMemo(() => new THREE.Vector3(), [])

  const colors = useMemo<Palette>(() => {
    const p = astralPalette()
    return {
      gold: new THREE.Color(p.gold),
      goldDeep: new THREE.Color(p.goldDeep),
      pink: new THREE.Color(p.nightPink),
      ink: new THREE.Color(p.nightDeep),
      white: new THREE.Color('#ffffff'),
    }
  }, [])

  const geometries = useMemo(
    () => ({
      head: starShape(5, 0.62, 0.3),
      outline: starShape(5, 0.8, 0.42),
      shine: starShape(5, 0.2, 0.1),
      burst: starShape(12, 1, 0.55),
      burstRim: starShape(12, 1.12, 0.62),
      line: new THREE.PlaneGeometry(1.1, 0.07),
      tails: TAIL_BANDS.map(createRibbonGeometry),
    }),
    [],
  )
  useEffect(
    () => () => {
      for (const g of Object.values(geometries).flat()) {
        g.dispose()
      }
    },
    [geometries],
  )

  const materials = useMemo(() => {
    const flat = (color: THREE.Color) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    return {
      burst: flat(colors.white),
      burstRim: flat(colors.goldDeep),
      line: flat(colors.white),
    }
  }, [colors])
  useEffect(
    () => () => {
      for (const m of Object.values(materials)) {
        m.dispose()
      }
    },
    [materials],
  )

  const flashUniforms = useMemo(
    () => ({ uGold: { value: colors.gold }, uFlash: { value: 0 } }),
    [colors],
  )

  const sparks = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const attr = (size: number) =>
      new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * size), size)
    geometry.setAttribute('position', attr(3))
    geometry.setAttribute('aLife', attr(1))
    geometry.setAttribute('aSize', attr(1))
    geometry.setAttribute('aColor', attr(3))
    return {
      geometry,
      velocity: new Float32Array(SPARK_COUNT * 3),
      next: 0,
    }
  }, [])
  useEffect(() => () => sparks.geometry.dispose(), [sparks])

  // Points de la queue, de la tête vers le bout.
  const tailPoints = useMemo(
    () => Array.from({ length: TAIL_POINTS }, () => new THREE.Vector3()),
    [],
  )
  const tailRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const head = headRef.current
    if (!head) {
      return
    }
    const flying = anim.fall > 0.001
    meteorPosition(anim.fall, pos)
    head.position.copy(pos)
    head.visible = flying
    head.scale.setScalar(0.45 + (1 - anim.fall) * 0.9)

    updateTail(
      tailRef.current,
      geometries.tails,
      tailPoints,
      anim.fall,
      head.scale.x,
    )
    if (spinRef.current) {
      spinRef.current.rotation.z -= delta * 7
    }

    emitSparks(sparks, flying, pos, colors, delta)
    flashUniforms.uFlash.value = anim.flash

    poseImpact(anim.impact, burstRef.current, linesRef.current, materials)
  })

  return (
    <>
      {/* Queue : trois bandes plates, rose dehors, blanc au cœur */}
      <group ref={tailRef} visible={false}>
        {TAIL_BANDS.map((band, i) => (
          <mesh key={band.color} geometry={geometries.tails[i]}>
            <meshBasicMaterial
              color={colors[band.color]}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Tête : étoile dorée cernée de violet, reflet blanc */}
      <group ref={headRef} position={START} visible={false}>
        <Billboard>
          <group ref={spinRef}>
            <mesh geometry={geometries.outline} position-z={-0.02}>
              <meshBasicMaterial color={colors.ink} toneMapped={false} />
            </mesh>
            <mesh geometry={geometries.head}>
              <meshBasicMaterial color={colors.gold} toneMapped={false} />
            </mesh>
            <mesh geometry={geometries.shine} position={[-0.14, 0.16, 0.02]}>
              <meshBasicMaterial color={colors.white} toneMapped={false} />
            </mesh>
          </group>
        </Billboard>
      </group>

      <points geometry={sparks.geometry}>
        <shaderMaterial
          vertexShader={sparkVert}
          fragmentShader={sparkFrag}
          transparent
          depthWrite={false}
        />
      </points>

      {/* Étoile d'impact derrière la capsule */}
      <group ref={burstRef} position={[0, 0, -0.6]} visible={false}>
        <mesh geometry={geometries.burstRim} material={materials.burstRim} />
        <mesh
          geometry={geometries.burst}
          material={materials.burst}
          position-z={0.01}
        />
      </group>

      {/* Traits de vitesse qui rayonnent depuis le centre */}
      <group ref={linesRef} position={[0, 0, -0.4]} visible={false}>
        {SPEED_LINE_IDS.map((id) => (
          <mesh key={id} geometry={geometries.line} material={materials.line} />
        ))}
      </group>

      {/* Flash plein cadre devant la capsule */}
      <mesh position={[0, 0, 3]} renderOrder={10}>
        <planeGeometry args={[14, 10]} />
        <shaderMaterial
          vertexShader={planeVert}
          fragmentShader={flashFrag}
          uniforms={flashUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

// La queue suit la courbe derrière la tête ; elle disparaît à l'arrivée,
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
    meteorPosition(Math.min(1, fall + (TAIL_SPAN * i) / (TAIL_POINTS - 1)), p)
  }
  for (const [i, band] of TAIL_BANDS.entries()) {
    writeRibbon(ribbons[i], points, band.width * scale, band.z)
  }
}

// Étoile d'impact et traits de vitesse : s'ouvrent puis s'éteignent.
function poseImpact(
  k: number,
  burst: THREE.Group | null,
  lines: THREE.Group | null,
  materials: Record<'burst' | 'burstRim' | 'line', THREE.MeshBasicMaterial>,
) {
  const live = k > 0 && k < 1
  materials.burst.opacity = (1 - k) * 0.95
  materials.burstRim.opacity = (1 - k) * 0.95
  materials.line.opacity = 1 - k
  if (burst) {
    burst.visible = live
    burst.scale.setScalar(0.4 + k * 3.6)
    burst.rotation.z = k * 0.9
  }
  if (!lines) {
    return
  }
  lines.visible = live
  const count = lines.children.length
  const r = 1.6 + k * 4.5
  for (const [i, line] of lines.children.entries()) {
    const a = (i / count) * Math.PI * 2
    line.position.set(Math.cos(a) * r, Math.sin(a) * r, 0)
    line.rotation.z = a
    line.scale.set(1 - k * 0.6, 1, 1)
  }
}

type Sparks = {
  geometry: THREE.BufferGeometry
  velocity: Float32Array
  next: number
}

// Fait naître des étincelles à la tête pendant le vol, puis les fait vivre :
// elles s'éjectent, retombent et rétrécissent.
function emitSparks(
  sparks: Sparks,
  flying: boolean,
  pos: THREE.Vector3,
  colors: Palette,
  delta: number,
) {
  const g = sparks.geometry.attributes
  const position = g.position as THREE.BufferAttribute
  const life = g.aLife as THREE.BufferAttribute
  const size = g.aSize as THREE.BufferAttribute
  const color = g.aColor as THREE.BufferAttribute
  const tints = [colors.white, colors.gold, colors.pink]
  if (flying) {
    for (let k = 0; k < 3; k++) {
      const i = sparks.next
      sparks.next = (sparks.next + 1) % SPARK_COUNT
      position.setXYZ(i, pos.x, pos.y, pos.z)
      sparks.velocity[i * 3] = (Math.random() - 0.5) * 2.4
      sparks.velocity[i * 3 + 1] = (Math.random() - 0.3) * 2
      sparks.velocity[i * 3 + 2] = (Math.random() - 0.5) * 1.2
      life.setX(i, 1)
      size.setX(i, 26 + Math.random() * 26)
      const c = tints[i % tints.length]
      color.setXYZ(i, c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < SPARK_COUNT; i++) {
    const l = life.getX(i)
    if (l <= 0) {
      continue
    }
    sparks.velocity[i * 3 + 1] -= delta * 3
    position.setXYZ(
      i,
      position.getX(i) + sparks.velocity[i * 3] * delta,
      position.getY(i) + sparks.velocity[i * 3 + 1] * delta,
      position.getZ(i) + sparks.velocity[i * 3 + 2] * delta,
    )
    life.setX(i, Math.max(0, l - delta / SPARK_LIFE))
  }
  position.needsUpdate = true
  life.needsUpdate = true
  size.needsUpdate = true
  color.needsUpdate = true
}
