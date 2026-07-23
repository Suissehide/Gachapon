import type React from 'react'

export type CanvasRefs = {
  dots: React.RefObject<HTMLCanvasElement | null> // halftone
  speed: React.RefObject<HTMLCanvasElement | null> // speed lines
  ink: React.RefObject<HTMLCanvasElement | null> // ink blots
  wave: React.RefObject<HTMLCanvasElement | null> // shockwaves
  pt: React.RefObject<HTMLCanvasElement | null> // particles
  chrom: React.RefObject<HTMLCanvasElement | null> // chromatic aberration
}

export type WaveState = {
  r: number // current radius px
  col: string // CSS color string
  w: number // initial line width
  spd: number // base speed px/frame
  active: boolean
  ghost: boolean
}

export type ParticleState = {
  x: number
  y: number
  vx: number
  vy: number
  col: string
  size: number
  life: number // 0→1, decays each frame
  type: 'square' | 'streak' | 'dot'
  baseHue?: number
}

export type InkBlotState = {
  x: number
  y: number
  col: string
  vertices: Array<{ angle: number; dist: number }> // 7 entries
  life: number
  t: number // frame counter, drives vertex rotation
}

export type SpeedLineState = {
  life: number // 1→0, decays 0.05/frame
  count: number
}

export type HalftoneState = {
  life: number // 1→0, decays 0.014/frame
}

export type ChromState = {
  life: number // 1→0, decays 0.025/frame
}

export type TearBandState = {
  life: number
  bands: Array<{ y: number; h: number; offset: number }>
  reshuffleIn: number
}

export type StarSparkleState = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  col: string
  life: number
  t: number
}

export type PrismRayState = {
  life: number
  rot: number
  count: number
}

export type EffectState = {
  cx: number
  cy: number
  waves: WaveState[]
  particles: ParticleState[]
  inkBlots: InkBlotState[]
  speedLine: SpeedLineState | null
  halftones: HalftoneState[]
  chrom: ChromState | null
  tearBands: TearBandState | null
  sparkles: StarSparkleState[]
  prismRays: PrismRayState | null
  timers: ReturnType<typeof setTimeout>[]
  rafId: number | null
}
