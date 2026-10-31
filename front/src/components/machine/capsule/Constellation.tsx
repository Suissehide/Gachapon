import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { type CapsuleAnim, capsuleTint } from './capsuleConfig'
import { ADDITIVE, dimFrag, flashFrag, planeVert, waveFrag } from './skyShaders'

// Étoiles de la figure, allumées une à une pendant `FORM_DURATION` ; les
// cues audio de la formation (capsuleAudio.constellation) suivent ce rythme.
export const STAR_COUNT = 9
export const FORM_DURATION = 1.7
// Part de la formation que prend l'allumage d'une étoile ou le tracé d'un
// trait ; le trait i part quand l'étoile i + 1 est allumée.
const STEP = 0.11

const SKY_Z = -2.5
const END = new THREE.Vector3(0, 0, 0.6)

// Figure de la semaine : marche aléatoire déterministe, graine = semaine
// UTC commençant le lundi, comme la sélection de cartes de la capsule. Une
// polyligne de gauche à droite dans le haut du ciel.
function weekSeed(): number {
  return Math.floor((Date.now() / 86_400_000 + 3) / 7)
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weekFigure(): THREE.Vector3[] {
  const rnd = mulberry32(weekSeed())
  const stepX = 7.2 / (STAR_COUNT - 1)
  let y = 0.4 + rnd() * 1.6
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    y = THREE.MathUtils.clamp(y + (rnd() - 0.5) * 2.4, -1, 2.8)
    return new THREE.Vector3(
      -3.6 + i * stepX + (rnd() - 0.5) * stepX * 0.5,
      y,
      SKY_Z,
    )
  })
}

const starVert = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (7.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

// Étoile à quatre aigrettes : cœur blanc, aigrettes teintées.
const starFrag = /* glsl */ `
  uniform vec3 uTint;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0 || vAlpha <= 0.0) discard;
    float core = exp(-r * r * 18.0);
    float spikes = exp(-abs(p.x) * 30.0) * exp(-abs(p.y) * 4.0)
                 + exp(-abs(p.y) * 30.0) * exp(-abs(p.x) * 4.0);
    float a = clamp(core * 1.2 + spikes * 0.6, 0.0, 1.0) * vAlpha;
    vec3 col = mix(uTint, vec3(1.0), clamp(core * 1.5, 0.0, 1.0));
    gl_FragColor = vec4(col, a);
  }
`

/**
 * L'arrivée de la capsule Constellation : des étoiles s'allument une à une
 * dans le ciel assombri (`anim.fall`, 1 → 0), des traits les relient en une
 * figure, puis la figure se replie vers le point d'arrivée (`anim.gather`),
 * flash plein cadre (`anim.flash`) et onde de lumière (`anim.ring`). La
 * capsule est déjà là quand le flash retombe.
 */
export function Constellation({ anim }: { anim: CapsuleAnim }) {
  const figureRef = useRef<THREE.Group>(null)
  const tint = useMemo(
    () => new THREE.Color(capsuleTint('comet') ?? '#ffffff'),
    [],
  )
  const stars = useMemo(weekFigure, [])
  const uniforms = useMemo(
    () => ({
      star: { uTint: { value: tint } },
      flash: { uTint: { value: tint }, uFlash: { value: 0 } },
      dim: { uDim: { value: 0 } },
      wave: { uTint: { value: tint }, uImpact: { value: 0 } },
    }),
    [tint],
  )

  const starGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const attr = (size: number) =>
      new THREE.BufferAttribute(new Float32Array(STAR_COUNT * size), size)
    g.setAttribute('position', attr(3))
    g.setAttribute('aAlpha', attr(1))
    g.setAttribute('aSize', attr(1))
    return g
  }, [])
  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((STAR_COUNT - 1) * 2 * 3), 3),
    )
    return g
  }, [])
  useEffect(
    () => () => {
      starGeometry.dispose()
      lineGeometry.dispose()
    },
    [starGeometry, lineGeometry],
  )
  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: tint,
        ...ADDITIVE,
        opacity: 0,
      }),
    [tint],
  )
  useEffect(() => () => lineMaterial.dispose(), [lineMaterial])

  const placed = useMemo(
    () => Array.from({ length: STAR_COUNT }, () => new THREE.Vector3()),
    [],
  )

  useFrame(({ clock }) => {
    const figure = figureRef.current
    if (!figure) {
      return
    }
    // La figure disparaît sous le flash, quand la capsule prend sa place.
    figure.visible = anim.pop < 1
    const t = clock.elapsedTime
    // Formation : 0 tant que rien n'a commencé, 1 figure complète.
    const p = anim.fall >= 1 ? 0 : 1 - anim.fall
    const g = anim.gather
    const pos = starGeometry.attributes.position as THREE.BufferAttribute
    const alpha = starGeometry.attributes.aAlpha as THREE.BufferAttribute
    const size = starGeometry.attributes.aSize as THREE.BufferAttribute
    for (const [i, star] of stars.entries()) {
      const lit = THREE.MathUtils.clamp((p - i / STAR_COUNT) / STEP, 0, 1)
      // Pic d'éclat à l'allumage, scintillement ensuite, gonflement au repli.
      const flare = 1 + lit * (1 - lit) * 5
      const twinkle = 0.85 + 0.15 * Math.sin(t * 7 + i * 1.9)
      placed[i].copy(star).lerp(END, g)
      pos.setXYZ(i, placed[i].x, placed[i].y, placed[i].z)
      alpha.setX(i, lit * twinkle)
      size.setX(i, 60 * flare * (1 + g * 2.5))
    }
    pos.needsUpdate = true
    alpha.needsUpdate = true
    size.needsUpdate = true

    const line = lineGeometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < STAR_COUNT - 1; i++) {
      const drawn = THREE.MathUtils.clamp(
        (p - (i + 1) / STAR_COUNT) / STEP,
        0,
        1,
      )
      const a = placed[i]
      const b = placed[i + 1]
      line.setXYZ(i * 2, a.x, a.y, a.z)
      line.setXYZ(
        i * 2 + 1,
        a.x + (b.x - a.x) * drawn,
        a.y + (b.y - a.y) * drawn,
        a.z + (b.z - a.z) * drawn,
      )
    }
    line.needsUpdate = true
    lineGeometry.computeBoundingSphere()
    starGeometry.computeBoundingSphere()
    lineMaterial.opacity = 0.8 * (1 - g)

    uniforms.flash.uFlash.value = anim.flash
    uniforms.dim.uDim.value = p * 0.5 * (1 - anim.flash) * (1 - anim.ring)
    uniforms.wave.uImpact.value = anim.ring
  })

  return (
    <>
      <group ref={figureRef}>
        <lineSegments geometry={lineGeometry} material={lineMaterial} />
        <points geometry={starGeometry} renderOrder={3}>
          <shaderMaterial
            vertexShader={starVert}
            fragmentShader={starFrag}
            uniforms={uniforms.star}
            {...ADDITIVE}
          />
        </points>
      </group>

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
