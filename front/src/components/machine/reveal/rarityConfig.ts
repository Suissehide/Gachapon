import type { CardRarity } from '../../../constants/card.constant'

export type { CardRarity as Rarity }

// Clé d'effet : la variante écrase la rareté (remplacement total, décision de
// spec). BRILLIANT et HOLOGRAPHIC ont leur propre animation, la rareté ne
// pilote alors plus rien.
export type EffectKey = CardRarity | 'BRILLIANT' | 'HOLOGRAPHIC'

export function resolveEffectKey(
  rarity: CardRarity,
  variant: string | null | undefined,
): EffectKey {
  return variant === 'BRILLIANT' || variant === 'HOLOGRAPHIC' ? variant : rarity
}

export type ParticleSetKey =
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'brilliant'
  | 'holo'

export interface WaveConfig {
  col: string
  w: number
  spd: number
  delay: number // ms RELATIVE TO BLAST time (not to triggerReveal)
  ghost: boolean
}

export interface EffectConfig {
  impactText: string | null
  impactSize: string
  impactColor: string
  impactStroke: string
  impactExtraShadow?: string

  shake: number
  shakeDuration: number
  flashColor: string | null
  triFlash: boolean
  // Couleurs du tri-flash — défaut CMJ legendary si absent (voir applyFlashes).
  triFlashColors?: string[]
  scanlineColor: string | null

  waves: WaveConfig[]
  particleSet: 'none' | ParticleSetKey
  particleHueShift: boolean
  inkBlots: boolean
  inkColors: string[]
  speedLines: boolean
  speedLineCount: number
  halftone: boolean
  chromaticAberration: boolean
  chromaticDuration: number
  tearBands: boolean
  starSparkles: boolean
  prismRays: boolean
}

// Chaque clé a UNE primitive vedette que les autres n'utilisent pas :
//   COMMON     → « pof » : 1 anneau sec, rien d'autre
//   UNCOMMON   → étincelles : particules only, aucun anneau
//   RARE       → zoom : speed lines radiales manga
//   EPIC       → glitch : aberration chromatique + tear bands
//   LEGENDARY  → splash page : halftone + encre + tri-flash (SANS speed lines
//                ni chromatique, qui appartiennent à RARE/EPIC)
//   BRILLIANT  → ruée vers l'or : star sparkles 4 branches dorées
//   HOLOGRAPHIC→ prisme : rayons arc-en-ciel rotatifs + particules hue-shift
export const EFFECT_CONFIG: Record<EffectKey, EffectConfig> = {
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
    particleHueShift: false,
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
    tearBands: false,
    starSparkles: false,
    prismRays: false,
  },

  UNCOMMON: {
    impactText: 'JOLI!',
    impactSize: '54px',
    impactColor: '#22c55e',
    impactStroke: '#14532d',

    shake: 3,
    shakeDuration: 320,
    flashColor: 'rgba(34,197,94,0.9)',
    triFlash: false,
    scanlineColor: null,

    // Signature « étincelles » : AUCUN anneau de choc — juste une nuée de
    // particules vertes qui monte. C'est l'absence d'onde qui la distingue.
    waves: [],
    particleSet: 'uncommon',
    particleHueShift: false,
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
    tearBands: false,
    starSparkles: false,
    prismRays: false,
  },

  RARE: {
    impactText: 'SUPERBE!',
    impactSize: '64px',
    impactColor: '#3b82f6',
    impactStroke: '#1e3a8a',

    shake: 7,
    shakeDuration: 380,
    flashColor: 'rgba(59,130,246,0.92)',
    triFlash: false,
    scanlineColor: null,

    // Signature « zoom » : PAS d'anneau — uniquement des lignes de vitesse
    // radiales qui emplissent l'écran. Motion pure, aucune onde.
    waves: [],
    particleSet: 'rare',
    particleHueShift: false,
    inkBlots: false,
    inkColors: [],
    speedLines: true,
    speedLineCount: 48,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
    tearBands: false,
    starSparkles: false,
    prismRays: false,
  },

  EPIC: {
    impactText: 'ÉNORME!',
    impactSize: '68px',
    impactColor: '#8b5cf6',
    impactStroke: '#4c1d95',

    shake: 11,
    shakeDuration: 450,
    flashColor: 'rgba(139,92,246,0.94)',
    triFlash: false,
    scanlineColor: null,

    // Signature « glitch » : anneaux dédoublés RVB + aberration chromatique
    // + NOUVELLES bandes de déchirure d'écran = réalité qui se brise.
    waves: [
      { col: 'rgb(196,181,253)', w: 8, spd: 17, delay: 0, ghost: true },
      { col: 'rgb(139,92,246)', w: 6, spd: 15, delay: 55, ghost: true },
      { col: 'rgb(124,58,237)', w: 4.5, spd: 13, delay: 120, ghost: true },
      { col: 'rgb(167,139,250)', w: 3, spd: 11, delay: 200, ghost: true },
    ],
    particleSet: 'epic',
    particleHueShift: false,
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: true,
    chromaticDuration: 900,
    tearBands: true,
    starSparkles: false,
    prismRays: false,
  },

  LEGENDARY: {
    impactText: 'INCROYABLE!',
    impactSize: '72px',
    impactColor: '#f59e0b',
    impactStroke: '#78350f',
    impactExtraShadow: '3px 3px 0 #78350f, 6px 6px 0 #ec4899',

    shake: 16,
    shakeDuration: 520,
    flashColor: null,
    triFlash: true,
    scanlineColor: null,

    // Signature « splash page » : la page de BD qui explose — tri-flash,
    // halftone Ben-Day, déluge de confettis, anneaux ambre. On lui RETIRE les
    // speed lines (signature de RARE), la chromatique (signature d'EPIC) et
    // les taches d'encre (retour QA : formes parasites derrière la carte) :
    // feu d'artifice éditorial, pas « tout en même temps ».
    waves: [
      { col: 'rgb(120,53,15)', w: 8, spd: 9, delay: 0, ghost: false },
      { col: 'rgb(245,158,11)', w: 5.5, spd: 7.5, delay: 55, ghost: true },
      { col: 'rgb(252,211,77)', w: 4, spd: 6.5, delay: 150, ghost: true },
      { col: 'rgb(245,158,11)', w: 3, spd: 5.5, delay: 260, ghost: true },
      { col: 'rgb(236,72,153)', w: 2, spd: 4.5, delay: 380, ghost: false },
      { col: 'rgb(252,211,77)', w: 1.5, spd: 3.5, delay: 480, ghost: false },
    ],
    particleSet: 'legendary',
    particleHueShift: false,
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: true,
    chromaticAberration: false,
    chromaticDuration: 0,
    tearBands: false,
    starSparkles: false,
    prismRays: false,
  },

  BRILLIANT: {
    // Le mot affiché pour une variante est en réalité IMPACT_VARIANT
    // (RevealGrid) — dégradé animé. Ces valeurs restent pour cohérence.
    impactText: 'SCINTILLANT!',
    impactSize: '68px',
    impactColor: '#f59e0b',
    impactStroke: '#78350f',

    // Intensité ≈ EPIC (décision de spec).
    shake: 10,
    shakeDuration: 450,
    flashColor: 'rgba(253,230,138,0.95)',
    triFlash: false,
    scanlineColor: null,

    // Signature « ruée vers l'or » : flash doré chaud, pluie d'étoiles
    // scintillantes 4 branches, anneaux dorés épais. Aucun élément d'une
    // autre signature (pas de speed lines, encre, halftone, chromatique).
    waves: [
      { col: 'rgb(180,83,9)', w: 7, spd: 9, delay: 0, ghost: false },
      { col: 'rgb(245,158,11)', w: 5, spd: 7.5, delay: 90, ghost: false },
      { col: 'rgb(253,230,138)', w: 3.5, spd: 6, delay: 200, ghost: false },
      { col: 'rgb(255,236,179)', w: 2, spd: 5, delay: 330, ghost: false },
    ],
    particleSet: 'none',
    particleHueShift: false,
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
    tearBands: false,
    starSparkles: true,
    prismRays: false,
  },

  HOLOGRAPHIC: {
    impactText: 'CHROMATIQUE!',
    impactSize: '72px',
    impactColor: '#a855f7',
    impactStroke: '#4c1d95',

    // Intensité ≈ LEGENDARY (décision de spec).
    shake: 14,
    shakeDuration: 520,
    flashColor: null,
    triFlash: true,
    triFlashColors: [
      'rgba(34,211,238,0.85)',
      'rgba(236,72,153,0.85)',
      'rgba(168,85,247,0.85)',
    ],
    scanlineColor: null,

    // Signature « prisme » : rayons arc-en-ciel rotatifs + particules à
    // teinte cyclante. Aucun anneau — le prisme EST l'élément radial.
    waves: [],
    particleSet: 'holo',
    particleHueShift: true,
    inkBlots: false,
    inkColors: [],
    speedLines: false,
    speedLineCount: 0,
    halftone: false,
    chromaticAberration: false,
    chromaticDuration: 0,
    tearBands: false,
    starSparkles: false,
    prismRays: true,
  },
}

export const PARTICLE_COLORS: Record<ParticleSetKey, string[]> = {
  uncommon: ['#22c55e', '#86efac', '#14532d', '#fff'],
  rare: ['#3b82f6', '#93c5fd', '#1e3a8a', '#fff', '#60a5fa'],
  epic: ['#8b5cf6', '#c4b5fd', '#4c1d95', '#fff', '#a78bfa'],
  legendary: ['#f59e0b', '#fcd34d', '#ec4899', '#78350f', '#fbbf24', '#fff'],
  // Palette or : star sparkles (BRILLIANT) + fond ambiant. Pas de particules
  // classiques pour BRILLIANT (counts à 0) — les étoiles sont la signature.
  brilliant: ['#f59e0b', '#fde68a', '#fbbf24', '#fffbe6', '#b45309'],
  // Couleurs de DÉPART holo — la teinte cycle ensuite au rendu (hue-shift).
  holo: ['#22d3ee', '#a855f7', '#f59e0b', '#ec4899', '#38bdf8'],
}

// [squares, streaks, dots]
export const PARTICLE_COUNTS: Record<ParticleSetKey, [number, number, number]> =
  {
    uncommon: [45, 70, 40],
    rare: [30, 45, 22],
    epic: [60, 90, 42],
    legendary: [130, 200, 95],
    brilliant: [0, 0, 0],
    // Holo « moins cartoon » (retour QA) : peu de carrés à contour noir,
    // surtout des streaks et des points lumineux.
    holo: [25, 150, 85],
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

export const AMBIENT_CONFIG: Record<EffectKey, AmbientConfig> = {
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
  // Intensité ≈ EPIC — aura dorée
  BRILLIANT: {
    auraIntensity: 0.24,
    rays: true,
    particleCount: 64,
    particleSpeed: 0.55,
    particleSize: [3, 7],
    glow: 10,
  },
  // Intensité ≈ LEGENDARY — champ prismatique
  HOLOGRAPHIC: {
    auraIntensity: 0.28,
    rays: true,
    particleCount: 90,
    particleSpeed: 0.65,
    particleSize: [3, 8],
    glow: 12,
  },
}
