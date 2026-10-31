import * as THREE from 'three'

// Shaders des arrivées célestes (étoile filante astrale, constellation) :
// plans plein cadre qui habillent le ciel autour de la capsule.

export const planeVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Flash d'arrivée plein cadre : opaque au pic pour cacher l'apparition de la
// capsule, bord teinté.
export const flashFrag = /* glsl */ `
  uniform vec3 uTint;
  uniform float uFlash;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    vec3 col = mix(vec3(1.0), uTint, smoothstep(0.2, 1.0, r) * 0.45);
    gl_FragColor = vec4(col, uFlash);
  }
`

// Voile noir au fond de la scène : le ciel s'assombrit derrière l'événement,
// qui garde tout son éclat.
export const dimFrag = /* glsl */ `
  uniform float uDim;
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, uDim);
  }
`

// Onde de lumière après le flash : un front large qui s'élargit, doublé
// d'un anneau fin et net qui le devance.
export const waveFrag = /* glsl */ `
  uniform vec3 uTint;
  uniform float uImpact;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float radius = 0.08 + uImpact * 0.62;
    float band = exp(-pow((r - radius) * 24.0, 2.0)) * 0.7;
    float ring = exp(-pow((r - radius * 1.25 - 0.03) * 90.0, 2.0));
    float inner = exp(-r * r * 6.0) * (1.0 - uImpact) * 0.5;
    float fade = (1.0 - uImpact) * step(0.001, uImpact) * smoothstep(1.0, 0.8, r);
    float a = (band + ring + inner) * fade;
    vec3 col = mix(vec3(1.0), uTint, 0.65 - ring * 0.5);
    gl_FragColor = vec4(col, a);
  }
`

export const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  blending: THREE.AdditiveBlending,
} as const
