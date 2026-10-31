import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { astralPalette, type CapsuleAnim } from './capsuleConfig'
import { ADDITIVE, dimFrag, flashFrag, planeVert, waveFrag } from './skyShaders'

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
const TAIL_WIDTH = 1.8

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

// Réécrit les sommets du ruban le long des points (`points[0]` = tête).
// La largeur naît en pointe sous la boule (sinon son bord avant droit
// dépasse du halo et se voit), s'élargit juste derrière, puis se resserre
// vers le bout de la traînée.
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
    const u = i / (TAIL_POINTS - 1)
    const head = Math.min(1, u / 0.18)
    const half = (width / 2) * head * (2 - head) * (1 - u * 0.75)
    position.setXYZ(i * 2, p.x - dy * half, p.y + dx * half, p.z - 0.05)
    position.setXYZ(i * 2 + 1, p.x + dy * half, p.y - dx * half, p.z - 0.05)
  }
  position.needsUpdate = true
  geometry.computeBoundingSphere()
}

const DUST_COUNT = 420
const BURST_COUNT = 160
const DUST_LIFE = 1.3
const GRAVITY = 2.6

// Boule de lumière : cœur blanc éblouissant, halo doré qui vire au violet et
// s'éteint bien avant le bord du plan (aucun disque net), quatre aigrettes
// qui scintillent. `uBurst` la change en étoile d'impact : aigrettes longues,
// diagonales en plus, cœur gonflé.
const orbFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uViolet;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uBurst;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float core = exp(-r * r * mix(90.0, 50.0, uBurst));
    float glow = exp(-r * r * 14.0);
    float halo = exp(-r * r * 5.0) * 0.35;
    float flicker = 0.85 + 0.15 * sin(uTime * 23.0);
    float reach = mix(9.0, 2.2, uBurst);
    float spikes = exp(-abs(p.x) * 60.0) * exp(-abs(p.y) * reach)
                 + exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * reach);
    vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
    spikes += (exp(-abs(d.x) * 70.0) * exp(-abs(d.y) * 4.0)
             + exp(-abs(d.y) * 70.0) * exp(-abs(d.x) * 4.0)) * uBurst;
    spikes *= flicker * mix(0.45, 1.3, uBurst);
    vec3 col = mix(uViolet, uGold, smoothstep(0.9, 0.2, r));
    col = mix(col, vec3(1.0), clamp(core * 1.4 + glow * 0.6 + spikes, 0.0, 1.0));
    float a = clamp(core + glow * 0.9 + halo + spikes * 0.8, 0.0, 1.0);
    a *= smoothstep(1.0, 0.55, r);
    gl_FragColor = vec4(col, a * uOpacity);
  }
`

// Traînée : blanche près de la tête, or puis violet vers le bout, bords
// adoucis en travers, et fondue sous la tête pour ne pas trancher le halo.
const tailFrag = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uViolet;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = vUv.y * 2.0 - 1.0;
    float across = exp(-x * x * 3.0) * (1.0 - x * x);
    float along = pow(1.0 - vUv.x, 2.4) * smoothstep(0.0, 0.12, vUv.x);
    vec3 col = mix(uViolet, uGold, smoothstep(1.0, 0.35, vUv.x));
    col = mix(col, vec3(1.0), smoothstep(0.35, 0.0, vUv.x) * 0.9);
    gl_FragColor = vec4(col, across * along * 0.26 * uOpacity);
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

/**
 * L'étoile filante qui apporte la capsule astrale : une boule de lumière
 * entre par le haut à gauche et plonge en arc. Le ciel s'assombrit, la boule
 * vibre de plus en plus, aspire des poussières et crache des étincelles qui
 * retombent. À l'arrivée l'image se fige sur une étoile d'impact
 * (`anim.hitstop`), puis flash blanc (`anim.flash`), gerbe de débris en
 * gravité et onde de lumière (`anim.impact`).
 */
export function AstralMeteor({ anim }: { anim: CapsuleAnim }) {
  const headRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)
  const pos = useMemo(() => new THREE.Vector3(), [])
  const ahead = useMemo(() => new THREE.Vector3(), [])
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
        uBurst: { value: 0 },
      },
      tail: {
        uGold: { value: colors.gold },
        uViolet: { value: colors.violet },
        uOpacity: { value: 0 },
      },
      dust: { uGold: { value: colors.gold } },
      flash: { uTint: { value: colors.gold }, uFlash: { value: 0 } },
      dim: { uDim: { value: 0 } },
      wave: { uTint: { value: colors.gold }, uImpact: { value: 0 } },
    }),
    [colors],
  )

  const ribbon = useMemo(createRibbonGeometry, [])
  useEffect(() => () => ribbon.dispose(), [ribbon])
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
    // Pendant le hitstop plus rien ne bouge : ni poussière, ni vibration.
    const frozen = anim.hitstop > 0
    const dt = frozen ? 0 : delta
    const flying = anim.fall > 0.001
    const approach = flying ? 1 - anim.fall : 1
    meteorPosition(anim.fall, pos)
    const shiver = frozen ? 0 : approach ** 2 * 0.08
    const t = clock.elapsedTime
    head.position.set(
      pos.x + Math.sin(t * 61) * shiver,
      pos.y + Math.sin(t * 53 + 1.7) * shiver,
      pos.z,
    )
    head.visible = flying || frozen
    const scale = (0.7 + approach * 1.1) * (1 + anim.hitstop * 0.5)
    head.scale.setScalar(scale)
    // La boule s'allume au départ, puis brille de plus en plus en approchant.
    const glow = Math.min(1, approach * 5)
    uniforms.orb.uOpacity.value = glow
    uniforms.orb.uTime.value = t
    uniforms.orb.uBurst.value = anim.hitstop
    uniforms.tail.uOpacity.value = glow

    updateTail(tailRef.current, ribbon, tailPoints, anim.fall, scale)
    if (flying && !frozen) {
      meteorPosition(Math.max(0, anim.fall - 0.02), ahead)
      emitFlightDust(dust, pos, ahead, approach)
    }
    integrateDust(dust, dt)
    if (anim.impact > 0 && !burstDone.current) {
      burstDone.current = true
      explodeDust(dust)
    }
    uniforms.flash.uFlash.value = anim.flash
    // Le ciel s'assombrit avec l'approche, reste sombre pendant le gel, et
    // le flash puis l'onde d'impact le rallument.
    uniforms.dim.uDim.value =
      approach ** 2 * 0.55 * (1 - anim.flash) * (1 - anim.impact)
    uniforms.wave.uImpact.value = anim.impact
  })

  return (
    <>
      {/* Traînée lumineuse */}
      <group ref={tailRef} visible={false}>
        <mesh geometry={ribbon} renderOrder={1}>
          <shaderMaterial
            vertexShader={planeVert}
            fragmentShader={tailFrag}
            uniforms={uniforms.tail}
            side={THREE.DoubleSide}
            {...ADDITIVE}
          />
        </mesh>
      </group>

      {/* Tête : la boule de lumière, étoile d'impact pendant le gel */}
      <group ref={headRef} position={START} visible={false}>
        <Billboard>
          <mesh renderOrder={3}>
            <planeGeometry args={[3, 3]} />
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
        <planeGeometry args={[12, 12]} />
        <shaderMaterial
          vertexShader={planeVert}
          fragmentShader={waveFrag}
          uniforms={uniforms.wave}
          {...ADDITIVE}
        />
      </mesh>

      {/* Voile du ciel, tout au fond */}
      <mesh position={[0, 0, -6]} renderOrder={-1}>
        <planeGeometry args={[30, 16]} />
        <shaderMaterial
          fragmentShader={dimFrag}
          uniforms={uniforms.dim}
          transparent
          depthWrite={false}
          toneMapped={false}
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
  ribbon: THREE.BufferGeometry,
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
  writeRibbon(ribbon, points, TAIL_WIDTH * scale)
}

type Dust = {
  geometry: THREE.BufferGeometry
  velocity: Float32Array
  next: number
}

function spawn(
  dust: Dust,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  size: number,
) {
  const g = dust.geometry.attributes
  const i = dust.next
  dust.next = (dust.next + 1) % DUST_COUNT
  ;(g.position as THREE.BufferAttribute).setXYZ(i, x, y, z)
  dust.velocity[i * 3] = vx
  dust.velocity[i * 3 + 1] = vy
  dust.velocity[i * 3 + 2] = vz
  ;(g.aLife as THREE.BufferAttribute).setX(i, 1)
  ;(g.aSize as THREE.BufferAttribute).setX(i, size)
}

// Explosion de l'impact : une gerbe de débris part du centre, surtout vers
// le haut, et retombe en gravité sous le flash.
function explodeDust(dust: Dust) {
  for (let k = 0; k < BURST_COUNT; k++) {
    const a = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 6
    spawn(
      dust,
      END.x,
      END.y,
      END.z,
      Math.cos(a) * speed,
      Math.abs(Math.sin(a)) * speed * 0.8 + speed * 0.3,
      (Math.random() - 0.5) * 3,
      14 + Math.random() * 30,
    )
  }
}

// Pendant le vol : des étincelles se détachent de la tête vers l'arrière,
// de plus en plus nombreuses en approchant, et des poussières du ciel sont
// aspirées vers la boule.
function emitFlightDust(
  dust: Dust,
  pos: THREE.Vector3,
  ahead: THREE.Vector3,
  approach: number,
) {
  const dx = ahead.x - pos.x
  const dy = ahead.y - pos.y
  const len = Math.hypot(dx, dy) || 1
  const sparks = 2 + Math.round(approach * 6)
  for (let k = 0; k < sparks; k++) {
    const kick = 0.6 + Math.random() * 1.6
    spawn(
      dust,
      pos.x + (Math.random() - 0.5) * 0.4,
      pos.y + (Math.random() - 0.5) * 0.4,
      pos.z,
      (-dx / len) * kick + (Math.random() - 0.5) * 1.2,
      (-dy / len) * kick + (Math.random() - 0.3) * 1.2,
      (Math.random() - 0.5) * 0.4,
      8 + Math.random() * 16,
    )
  }
  if (Math.random() < approach * 2) {
    const a = Math.random() * Math.PI * 2
    const r = 1.6 + Math.random() * 1.4
    const sx = pos.x + Math.cos(a) * r
    const sy = pos.y + Math.sin(a) * r
    spawn(
      dust,
      sx,
      sy,
      pos.z,
      (pos.x - sx) * 2.4,
      (pos.y - sy) * 2.4 + GRAVITY * 0.5,
      0,
      6 + Math.random() * 8,
    )
  }
}

// Poussières : traînée, gravité, extinction.
function integrateDust(dust: Dust, dt: number) {
  const g = dust.geometry.attributes
  const position = g.position as THREE.BufferAttribute
  const life = g.aLife as THREE.BufferAttribute
  const size = g.aSize as THREE.BufferAttribute
  if (dt > 0) {
    const drag = Math.exp(-dt * 1.8)
    for (let i = 0; i < DUST_COUNT; i++) {
      const l = life.getX(i)
      if (l <= 0) {
        continue
      }
      dust.velocity[i * 3] *= drag
      dust.velocity[i * 3 + 1] = dust.velocity[i * 3 + 1] * drag - GRAVITY * dt
      dust.velocity[i * 3 + 2] *= drag
      position.setXYZ(
        i,
        position.getX(i) + dust.velocity[i * 3] * dt,
        position.getY(i) + dust.velocity[i * 3 + 1] * dt,
        position.getZ(i) + dust.velocity[i * 3 + 2] * dt,
      )
      life.setX(i, Math.max(0, l - dt / DUST_LIFE))
    }
  }
  position.needsUpdate = true
  life.needsUpdate = true
  size.needsUpdate = true
}
