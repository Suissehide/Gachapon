import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'

import type { CardRarity } from '../../constants/card.constant.ts'
import { useCanvasContextRecovery } from '../../hooks/useCanvasContextRecovery.ts'
import { getRarityTone } from '../shared/tcg-card/config.ts'

const COUNT = 3500
/** Spirale vers le cœur (s). Au-delà, le cœur pulse tant que le serveur n'a pas répondu. */
const SWIRL = 1.5
/** Éclatement final (s) — 2 s au total quand la réponse arrive à temps. */
const BURST = 0.5

const PARTICLE_VERTEX = /* glsl */ `
  attribute vec4 aSeed; // angle, rayon, vitesse, taille
  uniform float uTime;
  uniform float uSwirl;
  uniform float uBurst;
  uniform float uPixelRatio;
  varying float vMix;
  varying float vAlpha;
  void main() {
    float spin = aSeed.x + uTime * aSeed.z * (1.0 + 4.0 * uSwirl);
    float r = 0.06 + aSeed.y * pow(1.0 - uSwirl, 1.6);
    r += uBurst * aSeed.y * 1.4;
    vec3 pos = vec3(cos(spin) * r, sin(spin) * r * 0.82, (aSeed.w - 0.5) * r);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSeed.w * (34.0 + 46.0 * uSwirl) * uPixelRatio / -mv.z;
    vMix = fract(aSeed.x * 3.7);
    vAlpha = smoothstep(0.0, 0.25, uTime) * (1.0 - uBurst);
  }
`

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  varying float vMix;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(mix(uColor, uLight, vMix) * (1.0 + a), a * vAlpha);
  }
`

const CORE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(max(1.0 - d, 0.0), 2.6);
    vec3 col = mix(uColor, mix(uLight, vec3(1.0), 0.6), glow * glow);
    gl_FragColor = vec4(col * glow, glow * uIntensity);
  }
`

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
  const { geometry, material, coreGeometry, coreMaterial } = useMemo(() => {
    const seeds = new Float32Array(COUNT * 4)
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 4] = Math.random() * Math.PI * 2
      seeds[i * 4 + 1] = 0.3 + Math.random() ** 0.7 * 2.1
      seeds[i * 4 + 2] = 0.6 + Math.random() * 1.4
      seeds[i * 4 + 3] = 0.3 + Math.random()
    }
    const g = new BufferGeometry()
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    // Positions calculées dans le shader : seul le compte de sommets compte.
    g.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(COUNT * 3), 3),
    )
    const colors = {
      uColor: { value: new Color(tone.hex) },
      uLight: { value: new Color(tone.light) },
    }
    const m = new ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: {
        ...colors,
        uTime: { value: 0 },
        uSwirl: { value: 0 },
        uBurst: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const cm = new ShaderMaterial({
      vertexShader: CORE_VERTEX,
      fragmentShader: CORE_FRAGMENT,
      uniforms: { ...colors, uIntensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return {
      geometry: g,
      material: m,
      coreGeometry: new PlaneGeometry(1, 1),
      coreMaterial: cm,
    }
  }, [tone.hex, tone.light])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      coreGeometry.dispose()
      coreMaterial.dispose()
    },
    [geometry, material, coreGeometry, coreMaterial],
  )

  const burstAt = useRef<number | null>(null)
  const done = useRef(false)
  const coreRef = useRef<Mesh>(null)

  // Horloge murale (pas de delta cumulé) : un onglet qui rame ne rallonge
  // pas l'animation, il saute des images.
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const swirl = Math.min(t / SWIRL, 1)
    const eased = swirl * swirl * (3 - 2 * swirl)
    if (burstAt.current === null && swirl >= 1 && resolved) {
      burstAt.current = t
    }
    const burst =
      burstAt.current === null ? 0 : Math.min((t - burstAt.current) / BURST, 1)
    const burstEased = 1 - (1 - burst) ** 3
    material.uniforms.uTime.value = t
    material.uniforms.uSwirl.value = eased
    material.uniforms.uBurst.value = burstEased
    // Cœur : grossit avec la spirale, pulse en attente, flash puis s'éteint.
    const wait = swirl >= 1 && burstAt.current === null
    const pulse = wait ? 0.12 * Math.sin(t * 9) : 0
    coreMaterial.uniforms.uIntensity.value =
      (0.4 + 1.2 * eased + pulse) * (1 - burst)
    coreRef.current?.scale.setScalar(0.8 + 2.2 * eased + pulse + burstEased * 3)
    if (burst >= 1 && !done.current) {
      done.current = true
      onDone()
    }
  })

  return (
    <>
      <points geometry={geometry} material={material} />
      <mesh ref={coreRef} geometry={coreGeometry} material={coreMaterial} />
    </>
  )
}

/** Tourbillon de particules plein écran joué pendant la transmutation.
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
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 animate-[fadeIn_250ms_ease-out] bg-[radial-gradient(circle,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.35)_55%,transparent_100%)]"
    >
      <Canvas
        key={canvasKey}
        ref={canvasRef}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ alpha: true, antialias: false }}
        dpr={[1, 2]}
      >
        <Swirl rarity={rarity} resolved={resolved} onDone={onDone} />
      </Canvas>
    </div>
  )
}
