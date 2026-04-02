// front/src/components/machine/reveal/useRevealEffect.ts
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { CardRarity } from '../../../constants/card.constant'
import {
  PARTICLE_COLORS,
  PARTICLE_COUNTS,
  RARITY_CONFIG,
  type RarityEffectConfig,
} from './rarityConfig'
import {
  drawChromAberration,
  drawHalftone,
  drawInkBlots,
  drawParticles,
  drawSpeedLines,
  drawWaves,
} from './renderers'
import type {
  CanvasRefs,
  ChromState,
  EffectState,
  HalftoneState,
  InkBlotState,
  ParticleState,
  SpeedLineState,
  WaveState,
} from './types'

// ── Spawn helpers ──────────────────────────────────────────────────────────────

function spawnParticles(
  s: EffectState,
  config: RarityEffectConfig,
  cx: number,
  cy: number,
): void {
  const counts =
    PARTICLE_COUNTS[config.particleSet as keyof typeof PARTICLE_COUNTS]
  const colors =
    PARTICLE_COLORS[config.particleSet as keyof typeof PARTICLE_COLORS]
  if (!counts || !colors) {
    return
  }
  const [nSquares, nStreaks, nDots] = counts

  const spawnOne = (type: ParticleState['type'], size: number): void => {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 12 + 5
    s.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      col: colors[Math.floor(Math.random() * colors.length)],
      size,
      life: 1,
      type,
    })
  }

  for (let i = 0; i < nSquares; i++) {
    spawnOne('square', Math.random() * 14 + 8)
  }
  for (let i = 0; i < nStreaks; i++) {
    spawnOne('streak', Math.random() * 6 + 4)
  }
  for (let i = 0; i < nDots; i++) {
    spawnOne('dot', Math.random() * 9 + 5)
  }
}

function spawnInkBlots(
  s: EffectState,
  config: RarityEffectConfig,
  cx: number,
  cy: number,
): void {
  const nBlots = config.inkColors.length >= 5 ? 8 : 6

  for (let i = 0; i < nBlots; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 120
    const vertices = Array.from({ length: 7 }, (_, j) => ({
      angle: (j / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
      dist: 20 + Math.random() * 30,
    }))
    const blot: InkBlotState = {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      col: config.inkColors[
        Math.floor(Math.random() * config.inkColors.length)
      ],
      vertices,
      life: 1,
      t: 0,
    }
    s.inkBlots.push(blot)
  }
}

// ── Module-level flash helper (no hook deps needed) ────────────────────────────

function triggerFlash(color: string): void {
  const div = document.createElement('div')
  div.style.cssText = [
    'position:fixed',
    'inset:0',
    `background:${color}`,
    'pointer-events:none',
    'z-index:200',
    'opacity:1',
  ].join(';')
  document.body.appendChild(div)
  // Hold briefly so the flash registers visually, then fade
  setTimeout(() => {
    div.style.transition = 'opacity 200ms ease-out'
    div.style.opacity = '0'
    setTimeout(() => div.remove(), 250)
  }, 50)
}

// ── Canvas draw tick (extracted to reduce hook complexity) ─────────────────────

function getCanvasCtx(
  canvasRefs: CanvasRefs,
  key: keyof CanvasRefs,
  W: number,
  H: number,
): CanvasRenderingContext2D | null {
  const canvas = canvasRefs[key].current
  if (!canvas) {
    return null
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  ctx.clearRect(0, 0, W, H)
  return ctx
}

function drawTick(
  s: EffectState,
  canvasRefs: CanvasRefs,
  W: number,
  H: number,
): void {
  const { cx, cy } = s
  const get = (key: keyof CanvasRefs) => getCanvasCtx(canvasRefs, key, W, H)

  const waveCtx = get('wave')
  if (waveCtx && s.waves.some((w) => w.active)) {
    drawWaves(waveCtx, s.waves, cx, cy)
  }

  const ptCtx = get('pt')
  if (ptCtx && s.particles.some((p) => p.life > 0)) {
    drawParticles(ptCtx, s.particles)
  }

  const inkCtx = get('ink')
  if (inkCtx && s.inkBlots.some((b) => b.life > 0)) {
    drawInkBlots(inkCtx, s.inkBlots)
  }

  const speedCtx = get('speed')
  if (speedCtx && s.speedLine && s.speedLine.life > 0) {
    drawSpeedLines(speedCtx, s.speedLine, cx, cy, W, H)
  }

  const dotsCtx = get('dots')
  if (dotsCtx) {
    for (const h of s.halftones.filter((h) => h.life > 0)) {
      drawHalftone(dotsCtx, h, cx, cy, Math.max(W, H) * 0.85)
    }
  }

  const chromCtx = get('chrom')
  if (chromCtx && s.chrom && s.chrom.life > 0) {
    drawChromAberration(chromCtx, s.chrom, cx, cy, W, H)
  }
}

function hasActiveEffects(s: EffectState): boolean {
  return (
    s.waves.some((w) => w.active) ||
    s.particles.some((p) => p.life > 0) ||
    s.inkBlots.some((b) => b.life > 0) ||
    (s.speedLine?.life ?? 0) > 0 ||
    s.halftones.some((h) => h.life > 0) ||
    (s.chrom?.life ?? 0) > 0
  )
}

// ── triggerReveal sub-helpers ──────────────────────────────────────────────────

function applyShake(
  container: HTMLElement,
  config: RarityEffectConfig,
  addTimer: (fn: () => void, delay: number) => void,
): void {
  if (config.shake <= 0) {
    return
  }
  const modal = container.closest('[data-reveal-modal]') as HTMLElement | null
  if (!modal) {
    return
  }
  modal.style.setProperty('--shake-amp', `${config.shake}px`)
  modal.style.animation = `screenShake ${config.shakeDuration}ms cubic-bezier(0.36,0.07,0.19,0.97)`
  addTimer(() => {
    modal.style.animation = ''
  }, config.shakeDuration + 50)

  // Card tilt/zoom at impact
  container.style.setProperty('--impact-dur', `${config.shakeDuration + 50}ms`)
  container.classList.add('card-impact')
  addTimer(() => container.classList.remove('card-impact'), config.shakeDuration + 100)
}

function applyFlashes(
  config: RarityEffectConfig,
  addTimer: (fn: () => void, delay: number) => void,
): void {
  if (config.triFlash) {
    const triColors = [
      'rgba(255,0,85,0.85)',
      'rgba(255,230,0,0.82)',
      'rgba(0,207,255,0.82)',
    ]
    for (let i = 0; i < triColors.length; i++) {
      const col = triColors[i]
      addTimer(() => triggerFlash(col), i * 70)
    }
  } else if (config.flashColor) {
    triggerFlash(config.flashColor)
  }
}

function scheduleWaves(
  s: EffectState,
  config: RarityEffectConfig,
  addTimer: (fn: () => void, delay: number) => void,
  ensureRAF: () => void,
): void {
  for (const waveCfg of config.waves) {
    addTimer(() => {
      const wave: WaveState = {
        r: 0,
        col: waveCfg.col,
        w: waveCfg.w,
        spd: waveCfg.spd,
        active: true,
        ghost: waveCfg.ghost,
      }
      s.waves.push(wave)
      ensureRAF()
    }, waveCfg.delay)
  }
}

// FLASH_DONE: delay (ms) after which flash is visually gone — spawn canvas effects here
const FLASH_DONE = 260

function scheduleHalftoneAndChrom(
  s: EffectState,
  config: RarityEffectConfig,
  addTimer: (fn: () => void, delay: number) => void,
  ensureRAF: () => void,
): void {
  if (config.halftone) {
    addTimer(() => {
      s.halftones.push({ life: 1 } satisfies HalftoneState)
      ensureRAF()
    }, FLASH_DONE)
    addTimer(() => {
      s.halftones.push({ life: 1 } satisfies HalftoneState)
      ensureRAF()
    }, 500)
  }

  if (config.chromaticAberration) {
    addTimer(() => {
      s.chrom = { life: 1 }
      ensureRAF()
    }, FLASH_DONE)
    addTimer(() => {
      if (s.chrom) {
        s.chrom.life = Math.max(s.chrom.life, 0.6)
      }
      ensureRAF()
    }, 500)
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useRevealEffect(rarity: CardRarity): {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRefs: CanvasRefs
  impactVisible: boolean
  impactPos: { x: number; y: number } | null
  scanlineVisible: boolean
  hideScanline: () => void
  triggerReveal: () => void
  reset: () => void
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs: CanvasRefs = {
    dots: useRef<HTMLCanvasElement>(null),
    speed: useRef<HTMLCanvasElement>(null),
    ink: useRef<HTMLCanvasElement>(null),
    wave: useRef<HTMLCanvasElement>(null),
    pt: useRef<HTMLCanvasElement>(null),
    chrom: useRef<HTMLCanvasElement>(null),
  }

  const [impactVisible, setImpactVisible] = useState(false)
  const [impactPos, setImpactPos] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [scanlineVisible, setScanlineVisible] = useState(false)

  const effectState = useRef<EffectState>({
    cx: 0,
    cy: 0,
    waves: [],
    particles: [],
    inkBlots: [],
    speedLine: null,
    halftones: [],
    chrom: null,
    timers: [],
    rafId: null,
  })

  // ── Canvas helpers ───────────────────────────────────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: canvasRefs contains only stable refs created with useRef
  const clearCanvases = useCallback(() => {
    const W = window.innerWidth
    const H = window.innerHeight
    for (const key of [
      'dots',
      'speed',
      'ink',
      'wave',
      'pt',
      'chrom',
    ] as const) {
      const canvas = canvasRefs[key].current
      canvas?.getContext('2d')?.clearRect(0, 0, W, H)
    }
  }, [])

  // ── RAF tick — deps [] because it only reads stable refs ────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: effectState and canvasRefs are stable refs
  const tick = useCallback((): void => {
    const s = effectState.current
    const W = window.innerWidth
    const H = window.innerHeight

    drawTick(s, canvasRefs, W, H)

    s.rafId = hasActiveEffects(s) ? requestAnimationFrame(tick) : null
  }, [])

  // ── Timer helpers ─────────────────────────────────────────────────────────────

  const addTimer = (fn: () => void, delay: number): void => {
    const id = setTimeout(fn, delay)
    effectState.current.timers.push(id)
  }

  const ensureRAF = (): void => {
    const s = effectState.current
    if (!s.rafId) {
      s.rafId = requestAnimationFrame(tick)
    }
  }

  // ── Reset / cleanup ──────────────────────────────────────────────────────────

  const clearAll = useCallback((): void => {
    const s = effectState.current
    for (const id of s.timers) {
      clearTimeout(id)
    }
    s.timers = []
    if (s.rafId !== null) {
      cancelAnimationFrame(s.rafId)
      s.rafId = null
    }
    s.waves = []
    s.particles = []
    s.inkBlots = []
    s.speedLine = null
    s.halftones = []
    s.chrom = null
    clearCanvases()
  }, [clearCanvases])

  const reset = useCallback((): void => {
    clearAll()
    setImpactVisible(false)
    setImpactPos(null)
    setScanlineVisible(false)
  }, [clearAll])

  // ── triggerReveal ────────────────────────────────────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: addTimer and ensureRAF are inline wrappers over stable effectState ref — safe to omit
  const triggerReveal = useCallback((): void => {
    const s = effectState.current
    const container = containerRef.current
    if (!container) {
      return
    }

    clearAll()

    const config = RARITY_CONFIG[rarity]

    const rect = container.getBoundingClientRect()
    s.cx = rect.left + rect.width / 2
    s.cy = rect.top + rect.height / 2
    setImpactPos({ x: s.cx, y: s.cy })

    applyShake(container, config, addTimer)
    applyFlashes(config, addTimer)
    scheduleWaves(s, config, addTimer, ensureRAF)

    // Speed lines, ink blots: spawn after flash fades so they're visible immediately
    if (config.speedLines) {
      addTimer(() => {
        s.speedLine = { life: 1, count: config.speedLineCount }
        ensureRAF()
      }, FLASH_DONE)
    }

    if (config.inkBlots) {
      addTimer(() => {
        spawnInkBlots(s, config, s.cx, s.cy)
        ensureRAF()
      }, FLASH_DONE)
    }

    scheduleHalftoneAndChrom(s, config, addTimer, ensureRAF)

    // Particles at t=500ms (after flash + initial wave burst)
    if (config.particleSet !== 'none') {
      addTimer(() => {
        spawnParticles(s, config, s.cx, s.cy)
        ensureRAF()
      }, 500)
    }

    // Impact word: appear with particles at t=500ms, hold 600ms then fade
    addTimer(() => setImpactVisible(true), 500)
    addTimer(() => setImpactVisible(false), 500 + 600 + 150)

    ensureRAF()
  }, [rarity])

  const hideScanline = useCallback(() => setScanlineVisible(false), [])

  // Cleanup on unmount
  useEffect(() => () => clearAll(), [clearAll])

  return {
    containerRef,
    canvasRefs,
    impactVisible,
    impactPos,
    scanlineVisible,
    hideScanline,
    triggerReveal,
    reset,
  }
}
