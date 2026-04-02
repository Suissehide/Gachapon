import type React from 'react'

export type CanvasRefs = {
  dots:  React.RefObject<HTMLCanvasElement | null>
  speed: React.RefObject<HTMLCanvasElement | null>
  ink:   React.RefObject<HTMLCanvasElement | null>
  wave:  React.RefObject<HTMLCanvasElement | null>
  pt:    React.RefObject<HTMLCanvasElement | null>
  chrom: React.RefObject<HTMLCanvasElement | null>
}

export type WaveState = {
  r:      number   // current radius px
  col:    string   // CSS color string
  w:      number   // initial line width
  spd:    number   // base speed px/frame
  active: boolean
}

export type ParticleState = {
  x:    number
  y:    number
  vx:   number
  vy:   number
  col:  string
  size: number
  life: number              // 0→1, decays each frame
  type: 'square' | 'streak' | 'dot'
}

export type InkBlotState = {
  x:        number
  y:        number
  col:      string
  vertices: Array<{ angle: number; dist: number }>  // 7 entries
  life:     number
  t:        number          // frame counter, drives vertex rotation
}

export type SpeedLineState = {
  life:  number             // 1→0, decays 0.05/frame
  count: number
}

export type HalftoneState = {
  life: number              // 1→0, decays 0.014/frame
}

export type ChromState = {
  life: number              // 1→0, decays 0.025/frame
}

export type EffectState = {
  cx:        number
  cy:        number
  waves:     WaveState[]
  particles: ParticleState[]
  inkBlots:  InkBlotState[]
  speedLine: SpeedLineState | null
  halftones: HalftoneState[]
  chrom:     ChromState | null
  timers:    ReturnType<typeof setTimeout>[]
  rafId:     number | null
}
