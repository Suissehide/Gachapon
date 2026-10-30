import type { CardRarity } from '../../../constants/card.constant'
import type { PullBatchResult } from '../../../queries/useGacha'
import { resolveEffectKey } from '../reveal/rarityConfig'

// Enveloppe des capsules affichées : gacha classique ou capsule astrale
// (nébuleuse jour / nuit). Ne change que l'habillage, jamais la chorégraphie.
export type CapsuleKind = 'classic' | 'astral'

// Rayon des mini-capsules des machines (globe du gashapon, bac de la pince).
export const MINI_CAPSULE_RADIUS = 0.11

export type AstralPalette = {
  daySky: string
  dayHaze: string
  dayCloud: string
  dayEmber: string
  nightDeep: string
  nightViolet: string
  nightPink: string
  nightBlue: string
  gold: string
  goldDeep: string
}

let astralPaletteCache: AstralPalette | null = null

// Couleurs de la capsule astrale, lues une fois dans les jetons `--astral-*`
// de `_colors.css` (thème unique, pas de variante sombre) : three.js veut des
// couleurs concrètes, la source reste la feuille de style.
export function astralPalette(): AstralPalette {
  if (astralPaletteCache) {
    return astralPaletteCache
  }
  const css = getComputedStyle(document.documentElement)
  const read = (name: string) => css.getPropertyValue(name).trim()
  astralPaletteCache = {
    daySky: read('--astral-day-sky'),
    dayHaze: read('--astral-day-haze'),
    dayCloud: read('--astral-day-cloud'),
    dayEmber: read('--astral-day-ember'),
    nightDeep: read('--astral-night-deep'),
    nightViolet: read('--astral-night-violet'),
    nightPink: read('--astral-night-pink'),
    nightBlue: read('--astral-night-blue'),
    gold: read('--astral-gold'),
    goldDeep: read('--astral-gold-deep'),
  }
  return astralPaletteCache
}

// Lumière interne d'une machine : violette quand elle distribue de l'astral.
export function machineLightColor(kind: CapsuleKind, classic: string): string {
  return kind === 'astral' ? astralPalette().nightViolet : classic
}

// Palier de tease de la capsule : la capsule « annonce » la MEILLEURE rareté
// du lot avant de s'ouvrir, sans jamais spoiler la carte précise.
//   0 COMMON · 1 UNCOMMON · 2 RARE · 3 EPIC · 4 BRILLIANT · 5 LEGENDARY
//   6 HOLOGRAPHIC
export type TeaseTier = 0 | 1 | 2 | 3 | 4 | 5 | 6

const TIER_BY_EFFECT: Record<string, TeaseTier> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  BRILLIANT: 4,
  LEGENDARY: 5,
  HOLOGRAPHIC: 6,
}

export function computeTeaseTier(result: PullBatchResult): TeaseTier {
  let best: TeaseTier = 0
  for (const pull of result.pulls) {
    const key = resolveEffectKey(
      pull.card.rarity as CardRarity,
      pull.card.variant,
    )
    const tier = TIER_BY_EFFECT[key] ?? 0
    if (tier > best) {
      best = tier
    }
  }
  return best
}

export interface CapsuleTierConfig {
  label: string
  // Couleur émissive / aura principale
  color: string
  // Halo externe (plus sombre, donne la profondeur)
  colorOuter: string
  // Teinte de la coque (bas de capsule)
  shell: string
  // Couleur du flash plein écran au burst
  flash: string
  // Durée de la phase de charge/vibration (s) — plus haut = plus long
  chargeDuration: number
  // Durée de l'inhale (aspiration avant explosion, s)
  inhaleDuration: number
  // Amplitude du jitter de vibration
  vibrateAmp: number
  // Intensité de l'aura shader
  aura: number
  // Opacité des rayons rotatifs (0 = aucun)
  rays: number
  // Cyclage de teinte prismatique (HOLO)
  hueCycle: boolean
  // Intensité bloom max (au pic de charge)
  bloom: number
  // Part des étincelles de charge actives (0..1)
  sparkRatio: number
  // Étincelles qui scintillent (taille pulsée) au lieu d'un flux continu
  twinkle: boolean
}

// Capsule neutre : résultat réseau pas encore arrivé. Blanc froid discret —
// la montée en couleur au moment où le résultat tombe EST le micro-moment.
export const NEUTRAL_TIER: CapsuleTierConfig = {
  label: 'neutral',
  color: '#cdd5e4',
  colorOuter: '#5c6478',
  shell: '#e6e2ee',
  flash: '#ffffff',
  chargeDuration: 0.85,
  inhaleDuration: 0.24,
  vibrateAmp: 0.04,
  aura: 0.5,
  rays: 0,
  hueCycle: false,
  bloom: 0.8,
  sparkRatio: 0.2,
  twinkle: false,
}

export const CAPSULE_TIERS: readonly CapsuleTierConfig[] = [
  {
    label: 'common',
    color: '#aab4c4',
    colorOuter: '#4c5361',
    shell: '#d3d8e1',
    flash: '#e6e9ef',
    chargeDuration: 0.8,
    inhaleDuration: 0.22,
    vibrateAmp: 0.035,
    aura: 0.45,
    rays: 0,
    hueCycle: false,
    bloom: 0.7,
    sparkRatio: 0.15,
    twinkle: false,
  },
  {
    label: 'uncommon',
    color: '#34d97b',
    colorOuter: '#0d5c34',
    shell: '#bff0d4',
    flash: '#7cf0ae',
    chargeDuration: 0.95,
    inhaleDuration: 0.26,
    vibrateAmp: 0.045,
    aura: 0.7,
    rays: 0,
    hueCycle: false,
    bloom: 1,
    sparkRatio: 0.3,
    twinkle: false,
  },
  {
    label: 'rare',
    color: '#3f8cff',
    colorOuter: '#123d8f',
    shell: '#bcd7ff',
    flash: '#7ab5ff',
    chargeDuration: 1.1,
    inhaleDuration: 0.3,
    vibrateAmp: 0.055,
    aura: 0.95,
    rays: 0.35,
    hueCycle: false,
    bloom: 1.3,
    sparkRatio: 0.45,
    twinkle: false,
  },
  {
    label: 'epic',
    color: '#a855f7',
    colorOuter: '#3b1276',
    shell: '#e2c9ff',
    flash: '#c084fc',
    chargeDuration: 1.35,
    inhaleDuration: 0.34,
    vibrateAmp: 0.07,
    aura: 1.2,
    rays: 0.6,
    hueCycle: false,
    bloom: 1.7,
    sparkRatio: 0.65,
    twinkle: false,
  },
  {
    // Blanc champagne sans rayons : les rayons ambre appartiennent à
    // LEGENDARY, la brillante se reconnaît à son scintillement.
    label: 'brilliant',
    color: '#fff3d1',
    colorOuter: '#a8781c',
    shell: '#fffaf0',
    flash: '#fffbeb',
    chargeDuration: 1.5,
    inhaleDuration: 0.36,
    vibrateAmp: 0.075,
    aura: 1.35,
    rays: 0,
    hueCycle: false,
    bloom: 1.9,
    sparkRatio: 0.75,
    twinkle: true,
  },
  {
    label: 'legendary',
    color: '#ffb020',
    colorOuter: '#93300a',
    shell: '#ffdf9e',
    flash: '#ffcf5c',
    chargeDuration: 1.75,
    inhaleDuration: 0.4,
    vibrateAmp: 0.09,
    aura: 1.6,
    rays: 0.9,
    hueCycle: false,
    bloom: 2.3,
    sparkRatio: 0.9,
    twinkle: false,
  },
  {
    label: 'holographic',
    color: '#7ae0ff',
    colorOuter: '#7c2bb8',
    shell: '#e8f7ff',
    flash: '#c9f2ff',
    chargeDuration: 2,
    inhaleDuration: 0.44,
    vibrateAmp: 0.1,
    aura: 1.8,
    rays: 1,
    hueCycle: true,
    bloom: 2.6,
    sparkRatio: 1,
    twinkle: false,
  },
]

export function tierConfig(tier: TeaseTier | null): CapsuleTierConfig {
  return tier === null ? NEUTRAL_TIER : CAPSULE_TIERS[tier]
}

// Réglages exposés via leva en dev (multiplicateurs globaux sur le feel).
export interface CapsuleTuning {
  bloom: number
  chargeSpeed: number
  auraBoost: number
  vibrateBoost: number
  dolly: number
}

// Valeurs mutées par gsap, lues par useFrame — jamais dans du state React.
export interface CapsuleAnim {
  // Pop d'apparition de la capsule (0→1, elastic)
  pop: number
  // Progression de l'à-coup de shake courant (0→1, ré-armé 3×)
  burstT: number
  // Charge/vibration (0→1 sur chargeDuration)
  charge: number
  // Aspiration pré-explosion (0→1)
  inhale: number
  // Ouverture de la capsule (0→1)
  split: number
  // Flash de tease quand la rareté tombe (pic 1 puis retombe)
  sting: number
  // Position Z caméra (dolly)
  camZ: number
  // Secousse caméra au burst (1→0)
  camShake: number
  // Chute astrale : 1 = capsule loin dans le ciel, 0 = posée au centre
  fall: number
}

export function createCapsuleAnim(): CapsuleAnim {
  return {
    pop: 0,
    burstT: 0,
    charge: 0,
    inhale: 0,
    split: 0,
    sting: 0,
    camZ: 7,
    camShake: 0,
    fall: 0,
  }
}
