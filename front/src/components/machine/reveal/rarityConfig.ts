import type { CardRarity } from '../../../constants/card.constant'

export type { CardRarity as Rarity }

export interface WaveConfig {
  col:   string
  w:     number
  spd:   number
  delay: number
  ghost: boolean
}

export interface RarityEffectConfig {
  impactText:         string | null
  impactSize:         string
  impactColor:        string
  impactStroke:       string
  impactExtraShadow?: string

  shake:         number   // px amplitude
  shakeDuration: number   // ms
  flashColor:    string | null
  triFlash:      boolean
  scanlineColor: string | null

  waves:                WaveConfig[]
  particleSet:          'none' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  inkBlots:             boolean
  inkColors:            string[]
  speedLines:           boolean
  speedLineCount:       number
  halftone:             boolean
  chromaticAberration:  boolean
  chromaticDuration:    number
}

export const RARITY_CONFIG: Record<CardRarity, RarityEffectConfig> = {
  COMMON: {
    impactText: null,
    impactSize: '42px',
    impactColor: '#888',
    impactStroke: '#444',

    shake: 0,
    shakeDuration: 0,
    flashColor: null,
    triFlash: false,
    scanlineColor: null,

    waves: [],
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
    impactStroke: '#000',

    shake: 2,
    shakeDuration: 300,
    flashColor: 'rgba(34,197,94,0.4)',
    triFlash: false,
    scanlineColor: '#22c55e',

    waves: [
      { col: 'rgb(34,197,94)', w: 4,   spd: 6,   delay: 0,   ghost: false },
      { col: 'rgb(0,0,0)',     w: 2.5, spd: 4.5, delay: 100, ghost: false },
    ],
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
    impactText: 'RARE!',
    impactSize: '64px',
    impactColor: '#3b82f6',
    impactStroke: '#000',

    shake: 5,
    shakeDuration: 350,
    flashColor: 'rgba(59,130,246,0.55)',
    triFlash: false,
    scanlineColor: '#3b82f6',

    waves: [
      { col: 'rgb(0,0,0)',      w: 6,   spd: 8, delay: 0,   ghost: false },
      { col: 'rgb(59,130,246)', w: 4,   spd: 6, delay: 70,  ghost: true  },
      { col: 'rgb(0,0,0)',      w: 2.5, spd: 5, delay: 180, ghost: false },
    ],
    particleSet: 'rare',
    inkBlots: false,
    inkColors: [],
    speedLines: true,
    speedLineCount: 16,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
  },

  EPIC: {
    impactText: 'ÉPIQUE!',
    impactSize: '68px',
    impactColor: '#8b5cf6',
    impactStroke: '#000',

    shake: 9,
    shakeDuration: 380,
    flashColor: 'rgba(139,92,246,0.65)',
    triFlash: false,
    scanlineColor: '#8b5cf6',

    waves: [
      { col: 'rgb(0,0,0)',      w: 7,   spd: 9, delay: 0,   ghost: false },
      { col: 'rgb(139,92,246)', w: 5,   spd: 7, delay: 55,  ghost: true  },
      { col: 'rgb(0,0,0)',      w: 3.5, spd: 6, delay: 160, ghost: true  },
      { col: 'rgb(167,139,250)',w: 2,   spd: 5, delay: 280, ghost: false },
    ],
    particleSet: 'epic',
    inkBlots: true,
    inkColors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#000', '#7c3aed'],
    speedLines: true,
    speedLineCount: 22,
    halftone: false,
    chromaticAberration: true,
    chromaticDuration: 520,
  },

  LEGENDARY: {
    impactText: 'LÉGENDAIRE!',
    impactSize: '72px',
    impactColor: '#ffe600',
    impactStroke: '#000',
    impactExtraShadow: '3px 3px 0 #ff0055, 6px 6px 0 #00cfff',

    shake: 13,
    shakeDuration: 420,
    flashColor: null,
    triFlash: true,
    scanlineColor: '#ff0055',

    waves: [
      { col: 'rgb(0,0,0)',      w: 8,   spd: 9,   delay: 0,   ghost: false },
      { col: 'rgb(0,0,0)',      w: 5.5, spd: 7.5, delay: 55,  ghost: true  },
      { col: 'rgb(0,0,0)',      w: 4,   spd: 6.5, delay: 150, ghost: true  },
      { col: 'rgb(0,0,0)',      w: 3,   spd: 5.5, delay: 260, ghost: true  },
      { col: 'rgb(245,158,11)', w: 2,   spd: 4.5, delay: 380, ghost: false },
      { col: 'rgb(255,0,85)',   w: 1.5, spd: 3.5, delay: 480, ghost: false },
    ],
    particleSet: 'legendary',
    inkBlots: true,
    inkColors: ['#ff0055', '#ffe600', '#00cfff', '#000', '#ff7700'],
    speedLines: true,
    speedLineCount: 28,
    halftone: true,
    chromaticAberration: true,
    chromaticDuration: 550,
  },
}

export const PARTICLE_COLORS: Record<string, string[]> = {
  uncommon:  ['#22c55e', '#86efac', '#000', '#fff'],
  rare:      ['#3b82f6', '#93c5fd', '#000', '#fff', '#60a5fa'],
  epic:      ['#8b5cf6', '#a78bfa', '#000', '#c4b5fd', '#7c3aed'],
  legendary: ['#ff0055', '#ffe600', '#00cfff', '#000', '#ff7700', '#fff'],
}

// [squares, streaks, dots]
export const PARTICLE_COUNTS: Record<string, [number, number, number]> = {
  uncommon:  [12, 18,  8],
  rare:      [20, 30, 14],
  epic:      [30, 45, 21],
  legendary: [50, 75, 35],
}
