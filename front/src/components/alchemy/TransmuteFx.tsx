import { advance, Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  type Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'

import type { CardRarity } from '../../constants/card.constant.ts'
import { useCanvasContextRecovery } from '../../hooks/useCanvasContextRecovery.ts'
import { getRarityTone } from '../shared/tcg-card/config.ts'

/** Spirale vers le cœur (s). Au-delà, le cœur pulse tant que le serveur n'a pas répondu. */
const SWIRL = 1.5
/** Éclatement final (s) — 2 s au total quand la réponse arrive à temps. */
const BURST = 0.5

const ARMS = 3
const ARM_HEADS = 110
const SPARK_HEADS = 70
/** Copies traînantes par particule : chaque copie rejoue la trajectoire un peu
 *  plus tôt, en plus petit — elles se chevauchent en un trait effilé. */
const ARM_TRAIL = 8
/** Les étincelles sont des étoiles BD, sans traînée. */
const SPARK_TRAIL = 1
const FOV = 50
/** Encre des contours : le `--text` du site. */
const INK = '#1b1726'

/** Dev seulement : `?fxProgress=0.5` fige l'animation (0 → 1 sur les 2 s). */
const FIXED_PROGRESS = (() => {
  if (!import.meta.env.DEV) {
    return null
  }
  const raw = new URLSearchParams(window.location.search).get('fxProgress')
  return raw === null ? null : Number(raw)
})()

// Commun aux shaders de points : couleur en aplats (teinte postérisée en
// 4 crans sombre → teinte → clair → blanc selon `h`), et taille de point.
// Cel-shading en deux passes : `uOutline` = 1 trace chaque point un peu plus
// gros à l'encre, la passe couleur repeint par-dessus — les points qui se
// chevauchent fusionnent en un seul trait cerné de noir.
const COMMON_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uSwirl;
  uniform float uBurst;
  uniform float uBurstT;
  uniform float uPx;
  uniform float uOutline;
  uniform vec3 uDark;
  uniform vec3 uHex;
  uniform vec3 uLight;
  varying vec3 vColor;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  vec3 heat(float h) {
    h = floor(h * 3.0 + 0.5) / 3.0;
    vec3 c = mix(uDark, uHex, smoothstep(0.0, 0.35, h));
    c = mix(c, uLight, smoothstep(0.35, 0.75, h));
    return mix(c, vec3(1.0), smoothstep(0.75, 1.0, h));
  }
  void emit(vec3 pos, float size) {
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float s = size <= 0.0 ? 0.0 : size + uOutline * (0.018 + 0.3 * size);
    gl_PointSize = s * uPx / -mv.z;
  }
`

// STAR : étoile à 4 branches ; HIGHLIGHT : reflet blanc en haut à gauche.
const SPRITE_FRAGMENT = /* glsl */ `
  uniform float uOutline;
  uniform vec3 uInk;
  varying vec3 vColor;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    #ifdef STAR
      float d = pow(abs(p.x), 0.5) + pow(abs(p.y), 0.5);
    #else
      float d = length(p);
    #endif
    if (d > 1.0) discard;
    vec3 col = vColor;
    #ifdef HIGHLIGHT
      col = mix(col, vec3(1.0), step(length(p - vec2(-0.35, -0.35)), 0.3) * 0.85);
    #endif
    gl_FragColor = vec4(mix(col, uInk, uOutline), 1.0);
    #include <colorspace_fragment>
  }
`

const ARM_VERTEX = /* glsl */ `
  ${COMMON_GLSL}
  attribute vec4 aSeed; // arm, phase, spread, size
  attribute float aTrail;
  vec3 armPos(float t) {
    float arm = floor(aSeed.x * ${ARMS}.0);
    float speed = 0.5 + 0.35 * hash(aSeed.y * 91.0);
    float s = fract(t * speed + aSeed.y); // 0 = rim, 1 = core
    float reach = 2.5 - 0.6 * uSwirl;
    float r = reach * pow(1.0 - s, 1.35) + 0.04;
    float ang = arm * 6.2831853 / ${ARMS}.0 + (1.0 - s) * 4.4 - t * 1.4;
    vec2 dir = vec2(cos(ang), sin(ang));
    float spread = (aSeed.z - 0.5) * (0.12 + 0.28 * r);
    vec2 p = dir * r + vec2(-dir.y, dir.x) * spread;
    return vec3(p, (hash(aSeed.y * 17.0) - 0.5) * 0.4 * r);
  }
  void main() {
    // The spiral speeds up as it tightens.
    float t = uTime + uSwirl * uSwirl * 1.2 - aTrail * 0.014;
    float speed = 0.5 + 0.35 * hash(aSeed.y * 91.0);
    float s = fract(t * speed + aSeed.y);
    float trail = 1.0 - aTrail / ${ARM_TRAIL}.0;
    vColor = heat(clamp(s * 0.85 + 0.15 * uSwirl, 0.0, 1.0));
    // Flat fill, no opacity fade: particles are born and die by shrinking.
    float grow = smoothstep(0.0, 0.12, s) * smoothstep(1.0, 0.9, s)
      * smoothstep(0.0, 0.25, uTime) * (1.0 - smoothstep(0.0, 0.3, uBurst));
    emit(armPos(t), (0.08 + 0.1 * aSeed.w) * (0.35 + 0.65 * trail) * (0.6 + 0.4 * s) * grow);
  }
`

const SPARK_VERTEX = /* glsl */ `
  ${COMMON_GLSL}
  attribute vec4 aSeed; // angle, elevation, speed, size
  attribute float aTrail;
  void main() {
    float tb = max(uBurstT - aTrail * 0.012, 0.0);
    float e = (aSeed.y - 0.5) * 2.2;
    vec3 dir = vec3(cos(aSeed.x) * cos(e), sin(aSeed.x) * cos(e), sin(e) * 0.6);
    float v = 4.0 + aSeed.z * aSeed.z * 12.0;
    float drag = 3.5;
    vec3 pos = dir * v * (1.0 - exp(-drag * tb)) / drag;
    pos.y -= 1.6 * tb * tb;
    vColor = heat(1.0 - uBurst * (0.5 + 0.4 * aSeed.w));
    emit(pos, step(0.0001, uBurst) * pow(1.0 - uBurst, 0.8) * (0.16 + 0.18 * aSeed.w));
  }
`

// Cercle runique : positions fixes (anneaux, hexagramme, glyphes), la rotation
// vient du mesh ; une onde claire court le long du trait.
const CIRCLE_VERTEX = /* glsl */ `
  ${COMMON_GLSL}
  attribute float aSize;
  uniform float uOpacity;
  void main() {
    float ang = atan(position.y, position.x);
    float wave = pow(0.5 + 0.5 * sin(ang * 3.0 - uTime * 7.0), 3.0);
    vColor = heat(wave > 0.5 ? 0.75 : 0.4);
    emit(position, aSize * uOpacity * (1.0 + 0.35 * wave));
  }
`

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Cœur : étoile d'impact BD qui tourne, cerclée d'encre, blanchit au flash.
const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uHex;
  uniform vec3 uLight;
  uniform vec3 uInk;
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    float a = atan(p.y, p.x);
    float spike = abs(fract(a * 10.0 / 6.2831853 + uTime * 0.25) - 0.5) * 2.0;
    float r = 0.42 + 0.22 * spike;
    if (d > r || uIntensity <= 0.01) discard;
    vec3 col = d < r * 0.55 ? uLight : uHex;
    col = mix(col, vec3(1.0), smoothstep(1.2, 2.0, uIntensity));
    col = d > r - 0.06 ? uInk : col;
    gl_FragColor = vec4(col, clamp(uIntensity * 4.0, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`

// Onde de choc : anneau plein bordé d'encre.
const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uHex;
  uniform vec3 uLight;
  uniform vec3 uInk;
  uniform float uBurst;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float r = (1.0 - pow(1.0 - uBurst, 2.0)) * 0.95;
    float w = 0.012 + 0.03 * (1.0 - uBurst);
    float x = abs(d - r);
    if (uBurst <= 0.0001 || x > w) discard;
    vec3 col = x > w - 0.008 ? uInk : mix(uLight, uHex, uBurst);
    gl_FragColor = vec4(col, 1.0 - uBurst * uBurst);
    #include <colorspace_fragment>
  }
`

function buildCircle() {
  const pts: number[] = []
  const sizes: number[] = []
  const add = (x: number, y: number, size: number) => {
    pts.push(x, y, 0)
    sizes.push(size)
  }
  const ring = (r: number, n: number, size: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      add(Math.cos(a) * r, Math.sin(a) * r, size)
    }
  }
  const line = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    n: number,
    size: number,
  ) => {
    for (let i = 0; i <= n; i++) {
      add(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, size)
    }
  }
  ring(1.2, 260, 0.06)
  ring(1.02, 220, 0.045)
  ring(0.55, 120, 0.04)
  // Hexagramme inscrit dans l'anneau intérieur.
  for (let tri = 0; tri < 2; tri++) {
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + tri * (Math.PI / 3) + Math.PI / 2
      const a1 = a0 + (Math.PI * 2) / 3
      line(
        Math.cos(a0) * 1.02,
        Math.sin(a0) * 1.02,
        Math.cos(a1) * 1.02,
        Math.sin(a1) * 1.02,
        70,
        0.035,
      )
    }
  }
  // Glyphes : 3 traits aléatoires dans une petite case, entre les deux anneaux.
  for (let g = 0; g < 18; g++) {
    const a = (g / 18) * Math.PI * 2
    const cx = Math.cos(a) * 1.11
    const cy = Math.sin(a) * 1.11
    for (let s = 0; s < 3; s++) {
      const j = () => (Math.random() - 0.5) * 0.1
      line(cx + j(), cy + j(), cx + j(), cy + j(), 6, 0.045)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
  g.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1))
  return g
}

function buildTrailed(heads: number, trail: number, seed: () => number[]) {
  const n = heads * trail
  const seeds = new Float32Array(n * 4)
  const trails = new Float32Array(n)
  for (let i = 0; i < heads; i++) {
    const s = seed()
    for (let k = 0; k < trail; k++) {
      seeds.set(s, (i * trail + k) * 4)
      // Tête en dernier : elle se peint par-dessus sa traînée.
      trails[i * trail + k] = trail - 1 - k
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('aSeed', new BufferAttribute(seeds, 4))
  g.setAttribute('aTrail', new BufferAttribute(trails, 1))
  // Positions calculées dans le shader : seul le compte de sommets compte.
  g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
  return g
}

type Fx = {
  core: ShaderMaterial
  circle: ShaderMaterial[]
}

/** Cœur et cercle runique, pilotés depuis le CPU (le reste vit dans les shaders). */
function paint(
  fx: Fx,
  core: Mesh | null,
  circle: Group | null,
  p: {
    t: number
    swirl: number
    eased: number
    burst: number
    burstT: number
    burstEased: number
    waiting: boolean
    bursting: boolean
  },
) {
  const { t, swirl, eased, burst, burstT, burstEased } = p
  // Cœur : grossit avec la spirale, pulse en attente, flash puis s'éteint.
  const pulse = 0.5 + 0.5 * Math.sin(t * (p.waiting ? 9 : 6))
  const flash = p.bursting ? Math.exp(-burstT * 9) * 2.2 : 0
  fx.core.uniforms.uIntensity.value =
    (0.2 + 0.75 * eased + 0.25 * pulse * eased + flash) * (1 - burst ** 2)
  core?.scale.setScalar(
    1.0 + 1.6 * eased + 0.3 * pulse * eased + burstEased * 3,
  )
  // Cercle runique : apparaît à mi-spirale, tourne, s'ouvre à l'éclatement.
  fx.circle[0].uniforms.uOpacity.value =
    Math.min(Math.max((swirl - 0.25) / 0.45, 0), 1) * (1 - burstEased)
  if (circle) {
    circle.rotation.z = -t * (0.6 + 0.8 * eased)
    circle.scale.setScalar(0.8 + 0.25 * eased + 0.03 * pulse + burstEased * 1.4)
  }
}

function Swirl({
  rarity,
  resolved,
  onDone,
}: {
  rarity: CardRarity
  resolved: boolean
  onDone: () => void
}) {
  const tone = getRarityTone(rarity)
  const fx = useMemo(() => {
    const u = {
      uTime: { value: 0 },
      uSwirl: { value: 0 },
      uBurst: { value: 0 },
      uBurstT: { value: 0 },
      uPx: { value: 1 },
      uDark: { value: new Color(tone.dark) },
      uHex: { value: new Color(tone.hex) },
      uLight: { value: new Color(tone.light) },
      uInk: { value: new Color(INK) },
    }
    const material = (
      vertexShader: string,
      fragmentShader: string,
      extra = {},
      defines = {},
    ) =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        defines,
        uniforms: { uOutline: { value: 0 }, ...u, ...extra },
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })
    // Passe contour (encre, sous tout) + passe couleur d'un même nuage de points.
    const inked = (vertexShader: string, extra = {}, defines = {}) => {
      const outline = material(vertexShader, SPRITE_FRAGMENT, extra, defines)
      outline.uniforms.uOutline.value = 1
      return [outline, material(vertexShader, SPRITE_FRAGMENT, extra, defines)]
    }
    const quad = new PlaneGeometry(1, 1)
    return {
      u,
      quad,
      geometries: [
        buildTrailed(ARM_HEADS, ARM_TRAIL, () => [
          Math.random(),
          Math.random(),
          // Écart au centre du bras : resserré, quelques égarées.
          0.5 + (Math.random() - 0.5) * Math.random() ** 1.5,
          Math.random(),
        ]),
        buildTrailed(SPARK_HEADS, SPARK_TRAIL, () => [
          Math.random() * Math.PI * 2,
          Math.random(),
          Math.random(),
          Math.random(),
        ]),
        buildCircle(),
        quad,
      ],
      arms: inked(ARM_VERTEX, {}, { HIGHLIGHT: '' }),
      sparks: inked(SPARK_VERTEX, {}, { STAR: '' }),
      // uOpacity partagé par les deux passes : un seul objet uniform.
      circle: inked(CIRCLE_VERTEX, { uOpacity: { value: 0 } }),
      core: material(QUAD_VERTEX, CORE_FRAGMENT, { uIntensity: { value: 0 } }),
      ring: material(QUAD_VERTEX, RING_FRAGMENT),
    }
  }, [tone.dark, tone.hex, tone.light])

  useEffect(
    () => () => {
      for (const g of fx.geometries) {
        g.dispose()
      }
      for (const m of [
        ...fx.arms,
        ...fx.sparks,
        ...fx.circle,
        fx.core,
        fx.ring,
      ]) {
        m.dispose()
      }
    },
    [fx],
  )

  const burstAt = useRef<number | null>(null)
  const done = useRef(false)
  const coreRef = useRef<Mesh>(null)
  const circleRef = useRef<Group>(null)

  // Horloge murale (pas de delta cumulé) : un onglet qui rame ne rallonge
  // pas l'animation, il saute des images.
  useFrame(({ clock, size, viewport }) => {
    const t =
      FIXED_PROGRESS === null
        ? clock.getElapsedTime()
        : FIXED_PROGRESS * (SWIRL + BURST)
    const swirl = Math.min(t / SWIRL, 1)
    const eased = swirl * swirl * (3 - 2 * swirl)
    if (
      burstAt.current === null &&
      swirl >= 1 &&
      (resolved || FIXED_PROGRESS !== null)
    ) {
      burstAt.current = FIXED_PROGRESS === null ? t : SWIRL
    }
    const burstT = burstAt.current === null ? 0 : t - burstAt.current
    const burst = Math.min(burstT / BURST, 1)
    const burstEased = 1 - (1 - burst) ** 3
    const { u } = fx
    u.uTime.value = t
    u.uSwirl.value = eased
    u.uBurst.value = burst
    u.uBurstT.value = burstT
    // Taille des points en unités monde, quelle que soit la résolution.
    u.uPx.value =
      (size.height * viewport.dpr) / (2 * Math.tan((FOV * Math.PI) / 360))

    paint(fx, coreRef.current, circleRef.current, {
      t,
      swirl,
      eased,
      burst,
      burstT,
      burstEased,
      waiting: swirl >= 1 && burstAt.current === null,
      bursting: burstAt.current !== null,
    })

    if (burst >= 1 && !done.current) {
      done.current = true
      onDone()
    }
  })

  // Ordre fixe : cœur, puis tous les contours, puis toutes les couleurs —
  // les contours de nuages qui se croisent fusionnent au lieu de se couper.
  return (
    <>
      <mesh
        ref={coreRef}
        geometry={fx.quad}
        material={fx.core}
        renderOrder={0}
      />
      <group ref={circleRef}>
        {[0, 1].map((pass) => (
          <points
            key={pass}
            geometry={fx.geometries[2]}
            material={fx.circle[pass]}
            renderOrder={1 + pass}
          />
        ))}
      </group>
      {(['arms', 'sparks'] as const).map((name, i) =>
        [0, 1].map((pass) => (
          <points
            key={`${name}-${pass}`}
            geometry={fx.geometries[i]}
            material={fx[name][pass]}
            renderOrder={1 + pass}
          />
        )),
      )}
      <mesh geometry={fx.quad} material={fx.ring} scale={5.5} renderOrder={3} />
    </>
  )
}

/** Tourbillon cartoon plein écran joué pendant la transmutation.
 *  `resolved` = la réponse serveur est là : la spirale éclate puis `onDone`. */
export function TransmuteFx({
  rarity,
  resolved,
  onDone,
}: {
  rarity: CardRarity
  resolved: boolean
  onDone: () => void
}) {
  const { canvasKey, canvasRef } = useCanvasContextRecovery()
  const tone = getRarityTone(rarity)
  // Image figée : l'onglet automatisé est souvent masqué (rAF coupé), on rend
  // à la main.
  useEffect(() => {
    if (FIXED_PROGRESS === null) {
      return
    }
    const id = setInterval(() => advance(performance.now()), 200)
    return () => clearInterval(id)
  }, [])
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 animate-[fadeIn_250ms_ease-out]"
      // Voile BD teinté de la rareté visée : trame Ben-Day sur un fond clair
      // qui masque la page, assombri sur les bords.
      style={{
        background: `radial-gradient(color-mix(in srgb, ${tone.hex} 30%, transparent) 26%, transparent 30%) 0 0 / 14px 14px, radial-gradient(circle, color-mix(in srgb, ${tone.light} 70%, var(--background)) 0%, color-mix(in srgb, var(--background) 92%, transparent) 55%, color-mix(in srgb, ${tone.dark} 55%, transparent) 100%)`,
      }}
    >
      <Canvas
        key={canvasKey}
        ref={canvasRef}
        camera={{ position: [0, 0, 6], fov: FOV }}
        gl={{
          alpha: true,
          antialias: false,
          preserveDrawingBuffer: FIXED_PROGRESS !== null,
        }}
        dpr={[1, 2]}
        frameloop={FIXED_PROGRESS === null ? 'always' : 'never'}
      >
        <Swirl rarity={rarity} resolved={resolved} onDone={onDone} />
      </Canvas>
    </div>
  )
}
