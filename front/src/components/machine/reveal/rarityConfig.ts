import type { CardRarity } from '../../../constants/card.constant'

export type { CardRarity as Rarity }

export type ParticleSetKey = 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface WaveConfig {
  col: string
  w: number
  spd: number
  delay: number // ms RELATIVE TO BLAST time (not to triggerReveal)
  ghost: boolean
}

export interface RarityEffectConfig {
  impactText: string | null
  impactSize: string
  impactColor: string
  impactStroke: string
  impactExtraShadow?: string

  shake: number
  shakeDuration: number
  flashColor: string | null
  triFlash: boolean
  scanlineColor: string | null

  waves: WaveConfig[]
  particleSet: 'none' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  inkBlots: boolean
  inkColors: string[]
  speedLines: boolean
  speedLineCount: number
  halftone: boolean
  chromaticAberration: boolean
  chromaticDuration: number
}

// Colors are aligned with RARITY_TONES from shared/tcg-card/config.ts so the
// canvas effect, impact word, and card frame all speak the same language:
//   COMMON     → #6b7280 (grey)
//   UNCOMMON   → #22c55e (green)
//   RARE       → #3b82f6 (blue)
//   EPIC       → #8b5cf6 (purple)
//   LEGENDARY  → #f59e0b (amber) with #ec4899 + #fcd34d accents

export const RARITY_CONFIG: Record<CardRarity, RarityEffectConfig> = {
  COMMON: {
    impactText: null,
    impactSize: '42px',
    impactColor: '#6b7280',
    impactStroke: '#374151',

    shake: 1,
    shakeDuration: 200,
    flashColor: 'rgba(255,255,255,0.7)',
    triFlash: false,
    scanlineColor: null,

    waves: [
      {
        col: 'rgba(107,114,128,0.5)',
        w: 2.5,
        spd: 5,
        delay: 0,
        ghost: false,
      },
    ],
    particleSet: 'none',
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
  },

  UNCOMMON: {
    impactText: 'NICE!',
    impactSize: '54px',
    impactColor: '#22c55e',
    impactStroke: '#14532d',

    shake: 2,
    shakeDuration: 300,
    flashColor: 'rgba(34,197,94,0.9)',
    triFlash: false,
    scanlineColor: null,

    // Signature « étincelles » : un seul fin anneau rapide, les particules mènent.
    waves: [{ col: 'rgb(34,197,94)', w: 2.5, spd: 7, delay: 0, ghost: false }],
    particleSet: 'uncommon',
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
  },

  RARE: {
    impactText: 'SUPERBE!',
    impactSize: '64px',
    impactColor: '#3b82f6',
    impactStroke: '#1e3a8a',

    shake: 5,
    shakeDuration: 350,
    flashColor: 'rgba(59,130,246,0.92)',
    triFlash: false,
    scanlineColor: null,

    // Signature « zoom » : les lignes de vitesse mènent, un seul anneau net.
    waves: [{ col: 'rgb(147,197,253)', w: 4, spd: 8, delay: 0, ghost: false }],
    particleSet: 'rare',
    inkBlots: false,
    inkColors: [],
    speedLines: true,
    speedLineCount: 26,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
  },

  EPIC: {
    impactText: 'ÉNORME!',
    impactSize: '68px',
    impactColor: '#8b5cf6',
    impactStroke: '#4c1d95',

    shake: 9,
    shakeDuration: 380,
    flashColor: 'rgba(139,92,246,0.94)',
    triFlash: false,
    scanlineColor: null,

    // Signature « glitch instable » : encre liquide + aberration chromatique
    // mènent ; anneaux réduits, PAS de lignes de vitesse (exclusives à Rare).
    waves: [
      { col: 'rgb(76,29,149)', w: 5, spd: 8, delay: 0, ghost: true },
      { col: 'rgb(196,181,253)', w: 3, spd: 6, delay: 140, ghost: true },
    ],
    particleSet: 'epic',
    inkBlots: true,
    inkColors: ['#8b5cf6', '#c4b5fd', '#ddd6fe', '#4c1d95', '#7c3aed'],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: true,
    chromaticDuration: 680,
  },

  LEGENDARY: {
    impactText: 'LÉGENDAIRE!',
    impactSize: '72px',
    impactColor: '#f59e0b',
    impactStroke: '#78350f',
    impactExtraShadow: '3px 3px 0 #78350f, 6px 6px 0 #ec4899',

    shake: 13,
    shakeDuration: 420,
    flashColor: null,
    triFlash: true,
    scanlineColor: null,

    waves: [
      { col: 'rgb(120,53,15)', w: 8, spd: 9, delay: 0, ghost: false },
      { col: 'rgb(245,158,11)', w: 5.5, spd: 7.5, delay: 55, ghost: true },
      { col: 'rgb(252,211,77)', w: 4, spd: 6.5, delay: 150, ghost: true },
      { col: 'rgb(245,158,11)', w: 3, spd: 5.5, delay: 260, ghost: true },
      { col: 'rgb(236,72,153)', w: 2, spd: 4.5, delay: 380, ghost: false },
      { col: 'rgb(252,211,77)', w: 1.5, spd: 3.5, delay: 480, ghost: false },
    ],
    particleSet: 'legendary',
    inkBlots: true,
    inkColors: ['#f59e0b', '#fcd34d', '#ec4899', '#78350f', '#fbbf24'],
    speedLines: true,
    speedLineCount: 28,
    halftone: true,
    chromaticAberration: true,
    chromaticDuration: 550,
  },
}

export const PARTICLE_COLORS: Record<ParticleSetKey, string[]> = {
  uncommon: ['#22c55e', '#86efac', '#14532d', '#fff'],
  rare: ['#3b82f6', '#93c5fd', '#1e3a8a', '#fff', '#60a5fa'],
  epic: ['#8b5cf6', '#c4b5fd', '#4c1d95', '#fff', '#a78bfa'],
  legendary: ['#f59e0b', '#fcd34d', '#ec4899', '#78350f', '#fbbf24', '#fff'],
}

// [squares, streaks, dots]
export const PARTICLE_COUNTS: Record<ParticleSetKey, [number, number, number]> =
  {
    uncommon: [30, 50, 28],
    rare: [22, 32, 16],
    epic: [40, 60, 28],
    legendary: [90, 140, 65],
  }

// ── Ambient background (persistent post-reveal atmosphere) ──────────────────
// Consumed by RevealAmbientBackground. auraIntensity = opacité du radial-gradient
// derrière les cartes ; particleCount = cap dur de particules simultanées ;
// particleSpeed = vitesse de dérive verticale (px/frame @60fps) ; glow = shadowBlur.
export interface AmbientConfig {
  auraIntensity: number
  rays: boolean
  particleCount: number
  particleSpeed: number
  particleSize: [number, number]
  glow: number
}

export const AMBIENT_CONFIG: Record<CardRarity, AmbientConfig> = {
  COMMON: {
    auraIntensity: 0.06,
    rays: false,
    particleCount: 12,
    particleSpeed: 0.25,
    particleSize: [2, 4],
    glow: 0,
  },
  UNCOMMON: {
    auraIntensity: 0.12,
    rays: false,
    particleCount: 24,
    particleSpeed: 0.35,
    particleSize: [2, 5],
    glow: 4,
  },
  RARE: {
    auraIntensity: 0.18,
    rays: true,
    particleCount: 42,
    particleSpeed: 0.45,
    particleSize: [2, 6],
    glow: 6,
  },
  EPIC: {
    auraIntensity: 0.23,
    rays: true,
    particleCount: 64,
    particleSpeed: 0.55,
    particleSize: [3, 7],
    glow: 8,
  },
  LEGENDARY: {
    auraIntensity: 0.28,
    rays: true,
    particleCount: 90,
    particleSpeed: 0.65,
    particleSize: [3, 8],
    glow: 12,
  },
}
