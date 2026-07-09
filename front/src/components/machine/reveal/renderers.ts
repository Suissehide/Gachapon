// front/src/components/machine/reveal/renderers.ts
import type {
  ChromState,
  HalftoneState,
  InkBlotState,
  ParticleState,
  PrismRayState,
  SpeedLineState,
  StarSparkleState,
  TearBandState,
  WaveState,
} from './types'

const MAX_WAVE_R = 1600 // px — always exits screen

// ── Waves ──────────────────────────────────────────────────────────────────────

export function drawWaves(
  ctx: CanvasRenderingContext2D,
  waves: WaveState[],
  cx: number,
  cy: number,
): void {
  for (const wave of waves) {
    if (!wave.active) {
      continue
    }
    const progress = Math.min(wave.r / MAX_WAVE_R, 1)
    const thick = Math.max(0.5, wave.w * (1 - progress * 0.65))

    ctx.lineWidth = thick

    if (wave.ghost) {
      // Red ghost at offset (cx-3, cy-2)
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = '#ff0055'
      ctx.beginPath()
      ctx.arc(cx - 3, cy - 2, wave.r, 0, Math.PI * 2)
      ctx.stroke()

      // Cyan ghost at offset (cx+2, cy+2)
      ctx.strokeStyle = '#00cfff'
      ctx.beginPath()
      ctx.arc(cx + 2, cy + 2, wave.r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Main ring
    ctx.globalAlpha = 1
    ctx.strokeStyle = wave.col
    ctx.beginPath()
    ctx.arc(cx, cy, wave.r, 0, Math.PI * 2)
    ctx.stroke()

    // Advance state
    wave.r += wave.spd * (1 + progress * 2.8)
    if (wave.r > MAX_WAVE_R) {
      wave.active = false
    }
  }
  ctx.globalAlpha = 1
}

// ── Particles ──────────────────────────────────────────────────────────────────

const GRAVITY = 0.12
const LIFE_DECAY = 0.018

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: ParticleState[],
): void {
  for (const p of particles) {
    if (p.life <= 0) {
      continue
    }

    // Advance
    p.x += p.vx
    p.y += p.vy
    p.vy += GRAVITY
    p.life -= LIFE_DECAY

    const a = Math.max(0, p.life)
    if (a <= 0) {
      continue
    }

    // hue-shift : la teinte cycle avec l'âge de la particule (signature HOLO)
    const col =
      p.baseHue == null
        ? p.col
        : `hsl(${(p.baseHue + (1 - p.life) * 240) % 360}, 90%, 60%)`

    if (p.type === 'streak') {
      const spd = Math.hypot(p.vx, p.vy) || 1
      const len = spd * 4
      const nx = p.vx / spd
      const ny = p.vy / spd

      // Red misprint shadow
      ctx.globalAlpha = a * 0.2
      ctx.strokeStyle = '#ff0055'
      ctx.lineWidth = p.size
      ctx.beginPath()
      ctx.moveTo(p.x + 3 - nx * len, p.y + 3 - ny * len)
      ctx.lineTo(p.x + 3, p.y + 3)
      ctx.stroke()

      // Main streak
      ctx.globalAlpha = a
      ctx.strokeStyle = col
      ctx.beginPath()
      ctx.moveTo(p.x - nx * len, p.y - ny * len)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    } else {
      const drawShape = (ox: number, oy: number) => {
        ctx.beginPath()
        if (p.type === 'square') {
          ctx.rect(ox - p.size / 2, oy - p.size / 2, p.size, p.size)
        } else {
          ctx.arc(ox, oy, p.size / 2, 0, Math.PI * 2)
        }
      }

      // Red misprint shadow at (+3, +3)
      ctx.globalAlpha = a * 0.2
      drawShape(p.x + 3, p.y + 3)
      ctx.fillStyle = '#ff0055'
      ctx.fill()

      // Main shape
      ctx.globalAlpha = a
      drawShape(p.x, p.y)
      ctx.fillStyle = col
      ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

// ── Ink blots ──────────────────────────────────────────────────────────────────

const BLOB_LIFE_DECAY = 0.012

export function drawInkBlots(
  ctx: CanvasRenderingContext2D,
  blots: InkBlotState[],
): void {
  for (const blot of blots) {
    if (blot.life <= 0) {
      continue
    }
    blot.t++
    blot.life -= BLOB_LIFE_DECAY
    const a = Math.max(0, blot.life)
    if (a <= 0) {
      continue
    }

    const buildPath = (offsetX: number, offsetY: number) => {
      ctx.beginPath()
      const first = blot.vertices[0]
      const angle0 = first.angle + blot.t * 0.006
      ctx.moveTo(
        blot.x + offsetX + Math.cos(angle0) * first.dist,
        blot.y + offsetY + Math.sin(angle0) * first.dist,
      )
      for (let i = 1; i < blot.vertices.length; i++) {
        const v = blot.vertices[i]
        const angle = v.angle + blot.t * 0.006
        ctx.lineTo(
          blot.x + offsetX + Math.cos(angle) * v.dist,
          blot.y + offsetY + Math.sin(angle) * v.dist,
        )
      }
      ctx.closePath()
    }

    // Red misprint blob at (+3, +3)
    ctx.globalAlpha = a * 0.2
    buildPath(3, 3)
    ctx.fillStyle = '#ff0055'
    ctx.fill()

    // Main blob
    ctx.globalAlpha = a
    buildPath(0, 0)
    ctx.fillStyle = blot.col
    ctx.fill()
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// ── Speed lines ────────────────────────────────────────────────────────────────

const SPEED_LINE_DECAY = 0.05

export function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  state: SpeedLineState,
  cx: number,
  cy: number,
  W: number,
  H: number,
): void {
  if (state.life <= 0) {
    return
  }
  const { life, count } = state

  const maxR =
    Math.max(
      Math.hypot(cx, cy),
      Math.hypot(W - cx, cy),
      Math.hypot(cx, H - cy),
      Math.hypot(W - cx, H - cy),
    ) + 10

  const sliceAngle = (Math.PI * 2) / count

  for (let i = 0; i < count; i++) {
    const angleStart = sliceAngle * i
    const angleEnd = angleStart + sliceAngle * 0.55

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, maxR, angleStart, angleEnd)
    ctx.closePath()

    ctx.fillStyle =
      i % 2 === 0
        ? `rgba(0,0,0,${life * 0.85})`
        : `rgba(250,246,236,${life * 0.7})`
    ctx.fill()
  }

  state.life -= SPEED_LINE_DECAY
  ctx.globalAlpha = 1
}

// ── Ben-Day halftone burst ─────────────────────────────────────────────────────

const HALFTONE_DECAY = 0.014
const CMYK = ['#ff0055', '#ffe600', '#00cfff', '#000000']

export function drawHalftone(
  ctx: CanvasRenderingContext2D,
  state: HalftoneState,
  cx: number,
  cy: number,
  maxR: number,
): void {
  if (state.life <= 0) {
    return
  }
  const { life } = state
  const outerRadius = maxR * (1 - life)

  for (let ring = 0; ring < 6; ring++) {
    const r = outerRadius - ring * 28
    if (r <= 2) {
      continue
    }
    const dotR = 3 * (1 - ring / 7) * life
    if (dotR <= 0) {
      continue
    }
    const nDots = Math.max(6, Math.floor((2 * Math.PI * r) / 13))
    const col = CMYK[ring % 4]

    for (let d = 0; d < nDots; d++) {
      const angle = (d / nDots) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
        dotR,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = col
      ctx.fill()
    }
  }

  state.life -= HALFTONE_DECAY
}

// ── Chromatic aberration ───────────────────────────────────────────────────────

const CHROM_DECAY = 0.025

export function drawChromAberration(
  ctx: CanvasRenderingContext2D,
  state: ChromState,
  cx: number,
  cy: number,
  W: number,
  H: number,
): void {
  if (state.life <= 0) {
    return
  }
  const a = state.life
  const gSize = Math.min(W, H) * 0.55

  // Red ghost shifted +3px right
  const grd1 = ctx.createRadialGradient(cx + 3, cy, 0, cx + 3, cy, gSize)
  grd1.addColorStop(0, `rgba(255,0,85,${a * 0.35})`)
  grd1.addColorStop(0.5, `rgba(255,0,85,${a * 0.1})`)
  grd1.addColorStop(1, 'rgba(255,0,85,0)')
  ctx.fillStyle = grd1
  ctx.fillRect(0, 0, W, H)

  // Cyan ghost shifted -3px left
  const grd2 = ctx.createRadialGradient(cx - 3, cy, 0, cx - 3, cy, gSize)
  grd2.addColorStop(0, `rgba(0,207,255,${a * 0.35})`)
  grd2.addColorStop(0.5, `rgba(0,207,255,${a * 0.1})`)
  grd2.addColorStop(1, 'rgba(0,207,255,0)')
  ctx.fillStyle = grd2
  ctx.fillRect(0, 0, W, H)

  state.life -= CHROM_DECAY
}

// ── Tear bands (déchirure d'écran glitch — signature EPIC) ────────────────────

const TEAR_DECAY = 0.04
const TEAR_RESHUFFLE_FRAMES = 4

export function drawTearBands(
  ctx: CanvasRenderingContext2D,
  state: TearBandState,
  W: number,
  H: number,
): void {
  if (state.life <= 0) {
    return
  }
  state.reshuffleIn--
  if (state.reshuffleIn <= 0) {
    state.reshuffleIn = TEAR_RESHUFFLE_FRAMES
    for (const b of state.bands) {
      b.offset = (Math.random() - 0.5) * 60 * state.life
    }
  }

  for (const b of state.bands) {
    const y = b.y * H
    const h = b.h * H
    // Liseré rouge en haut, cyan en bas (frange RVB), cœur translucide décalé
    ctx.fillStyle = `rgba(255,0,85,${state.life * 0.35})`
    ctx.fillRect(b.offset - 4, y, W, 2)
    ctx.fillStyle = `rgba(0,207,255,${state.life * 0.35})`
    ctx.fillRect(b.offset + 4, y + h - 2, W, 2)
    ctx.fillStyle = `rgba(255,255,255,${state.life * 0.08})`
    ctx.fillRect(b.offset, y, W, h)
  }

  state.life -= TEAR_DECAY
}

// ── Star sparkles (étoiles 4 branches dorées — signature BRILLIANT) ───────────

const SPARKLE_GRAVITY = 0.18
const SPARKLE_DECAY = 0.011
const SPARKLE_DRAG = 0.98

export function drawStarSparkles(
  ctx: CanvasRenderingContext2D,
  sparkles: StarSparkleState[],
): void {
  for (const sp of sparkles) {
    if (sp.life <= 0) {
      continue
    }
    sp.x += sp.vx
    sp.y += sp.vy
    sp.vy += SPARKLE_GRAVITY
    sp.vx *= SPARKLE_DRAG
    sp.t++
    sp.life -= SPARKLE_DECAY

    const a = Math.max(0, sp.life)
    if (a <= 0) {
      continue
    }

    // Twinkle : la taille oscille — l'étoile « scintille » en retombant
    const twinkle = 0.55 + 0.45 * Math.sin(sp.t * 0.35 + sp.size)
    const r = sp.size * twinkle

    ctx.globalAlpha = a
    ctx.strokeStyle = sp.col
    ctx.lineWidth = Math.max(1, r * 0.22)
    ctx.beginPath()
    ctx.moveTo(sp.x - r, sp.y)
    ctx.lineTo(sp.x + r, sp.y)
    ctx.moveTo(sp.x, sp.y - r)
    ctx.lineTo(sp.x, sp.y + r)
    ctx.stroke()

    // Cœur lumineux
    ctx.fillStyle = '#fffbe6'
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, Math.max(1, r * 0.18), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Prism rays (secteurs arc-en-ciel rotatifs — signature HOLOGRAPHIC) ────────

const PRISM_DECAY = 0.008
const PRISM_SPIN = 0.006 // rad/frame

export function drawPrismRays(
  ctx: CanvasRenderingContext2D,
  state: PrismRayState,
  cx: number,
  cy: number,
  W: number,
  H: number,
): void {
  if (state.life <= 0) {
    return
  }
  const maxR =
    Math.max(
      Math.hypot(cx, cy),
      Math.hypot(W - cx, cy),
      Math.hypot(cx, H - cy),
      Math.hypot(W - cx, H - cy),
    ) + 20
  const slice = (Math.PI * 2) / state.count

  for (let i = 0; i < state.count; i++) {
    const start = state.rot + slice * i
    const hue = (i / state.count) * 360
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, maxR, start, start + slice * 0.5)
    ctx.closePath()
    ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${state.life * 0.35})`
    ctx.fill()
  }

  state.rot += PRISM_SPIN
  state.life -= PRISM_DECAY
}
