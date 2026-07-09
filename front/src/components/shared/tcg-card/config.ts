import { Droplet, Flame, Leaf, type LucideIcon, Moon, Zap } from 'lucide-react'

// ── Rarity tokens ──────────────────────────────────────────────────────────────
// Drives --rar / --rar-light / --rar-dark CSS vars on the card root.

export type RarityKey = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type RarityTone = {
  hex: string
  light: string
  dark: string
  label: string
}

export const RARITY_TONES: Record<RarityKey, RarityTone> = {
  COMMON: {
    hex: '#6b7280',
    light: '#d1d5db',
    dark: '#374151',
    label: 'Commun',
  },
  UNCOMMON: {
    hex: '#22c55e',
    light: '#86efac',
    dark: '#14532d',
    label: 'Peu commun',
  },
  RARE: { hex: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', label: 'Rare' },
  EPIC: { hex: '#8b5cf6', light: '#c4b5fd', dark: '#4c1d95', label: 'Épique' },
  LEGENDARY: {
    hex: '#f59e0b',
    light: '#fcd34d',
    dark: '#78350f',
    label: 'Légendaire',
  },
}

export const getRarityTone = (rarity: string): RarityTone =>
  RARITY_TONES[rarity as RarityKey] ?? RARITY_TONES.COMMON

// ── Stats ──────────────────────────────────────────────────────────────────────

export type StatKey = 'pv' | 'atq' | 'def' | 'vit'

export type StatDef = {
  key: StatKey
  label: string
  color: string
}

export const STAT_DEFS: StatDef[] = [
  { key: 'pv', label: 'PV', color: '#ef4444' },
  { key: 'atq', label: 'ATQ', color: '#f59e0b' },
  { key: 'def', label: 'DEF', color: '#3b82f6' },
  { key: 'vit', label: 'VIT', color: '#8b5cf6' },
]

// ── Variant overlays ───────────────────────────────────────────────────────────
// Full-art CSS layers stacked over the card art for BRILLIANT / HOLOGRAPHIC.
// HOLOGRAPHIC additionally gets the mouse-tracked <HoloOverlay /> on top.

export type VariantOverlayLayer = {
  id: string
  bg: string
  bgSize: string
  animation: string
  blendMode: string
  /** Number, or a CSS expression (e.g. `var(--holo-opc, 0)` for pointer-driven layers). */
  opacity: number | string
}

export const VARIANT_OVERLAYS: Record<string, VariantOverlayLayer[]> = {
  BRILLIANT: [
    {
      // 1. Gilding — warm hue cast (blend `color` = art keeps its own luminance,
      //    so the illustration stays readable under the gold, unlike a flat tint).
      id: 'brilliant-gilding',
      bg: 'linear-gradient(165deg, #ffd75e 0%, #ffb63c 45%, #de8a1f 100%)',
      bgSize: '100% 100%',
      animation: 'none',
      blendMode: 'color',
      opacity: 0.7,
    },
    {
      // 2. Relief — warm vignette pressing the edges down like an embossed
      //    gold plate; keeps a bright "polished" pool near the top of the art.
      id: 'brilliant-relief',
      bg: 'radial-gradient(130% 115% at 50% 28%, rgba(255,238,190,0.2) 0%, rgba(150,78,0,0.24) 68%, rgba(92,44,0,0.5) 100%)',
      bgSize: '100% 100%',
      animation: 'none',
      blendMode: 'multiply',
      opacity: 1,
    },
    {
      // 3. Metal surface — fine brushed grain (two near-horizontal pitches that
      //    interfere into a subtle shimmer) + large soft conic facets that catch
      //    the light at different angles, like a milled ingot face.
      id: 'brilliant-surface',
      bg: [
        'repeating-linear-gradient(100deg, rgba(255,233,160,0.20) 0px, rgba(255,233,160,0.20) 1px, transparent 1px, transparent 3px)',
        'repeating-linear-gradient(100deg, rgba(84,42,0,0.20) 0px, rgba(84,42,0,0.20) 1px, transparent 1px, transparent 7px)',
        'conic-gradient(from 210deg at 50% 42%, rgba(255,224,130,0.30) 0deg, rgba(120,60,0,0.22) 55deg, rgba(255,242,190,0.32) 120deg, rgba(150,84,10,0.20) 185deg, rgba(255,224,130,0.28) 245deg, rgba(105,52,0,0.24) 300deg, rgba(255,224,130,0.30) 360deg)',
      ].join(', '),
      bgSize: 'auto, auto, 100% 100%',
      animation: 'none',
      blendMode: 'overlay',
      opacity: 0.85,
    },
    {
      // 4. Molten sweep — a hot white-gold specular beam travelling the diagonal
      //    once, then resting off-card (goldSweep), like light rolling over metal.
      //    Band must stay narrower than the card once scaled by bgSize (here
      //    14% × 320% ≈ 45% of the card), otherwise it covers the whole art and
      //    reads as a static rectangle instead of a moving beam. `no-repeat` is
      //    required too: while the beam rests off-card, the repeated neighbour
      //    tile would otherwise bleed a frozen gold block onto the card edge.
      id: 'brilliant-sweep',
      bg: 'linear-gradient(115deg, transparent 43%, rgba(255,208,96,0.45) 47%, rgba(255,252,235,0.95) 50%, rgba(255,208,96,0.45) 53%, transparent 57%) no-repeat',
      bgSize: '320% 320%',
      animation: 'goldSweep 6.5s ease-in-out infinite',
      blendMode: 'screen',
      opacity: 0.85,
    },
    {
      // 5. Star glints — a handful of pinpoint sparkles breathing in and out
      //    (goldTwinkle drives the layer opacity; layers stagger via delay).
      id: 'brilliant-glints',
      bg: [
        'radial-gradient(circle 2.5px at 16% 20%, rgba(255,255,250,0.95) 30%, transparent 100%)',
        'radial-gradient(circle 1.5px at 78% 12%, rgba(255,240,190,0.9) 30%, transparent 100%)',
        'radial-gradient(circle 2px at 88% 55%, rgba(255,255,240,0.85) 30%, transparent 100%)',
        'radial-gradient(circle 1.5px at 30% 72%, rgba(255,246,210,0.9) 30%, transparent 100%)',
      ].join(', '),
      bgSize: '100% 100%',
      animation: 'goldTwinkle 3.6s ease-in-out infinite',
      blendMode: 'screen',
      opacity: 1,
    },
    {
      id: 'brilliant-glints-b',
      bg: [
        'radial-gradient(circle 2px at 62% 30%, rgba(255,255,245,0.9) 30%, transparent 100%)',
        'radial-gradient(circle 1.5px at 10% 48%, rgba(255,238,180,0.85) 30%, transparent 100%)',
        'radial-gradient(circle 2.5px at 70% 84%, rgba(255,250,225,0.9) 30%, transparent 100%)',
      ].join(', '),
      bgSize: '100% 100%',
      animation: 'goldTwinkle 4.4s ease-in-out -2.1s infinite',
      blendMode: 'screen',
      opacity: 1,
    },
    {
      // 6. Pointer glare — bright gold spot following the cursor (CSS vars set by
      //    useHoloPointer; opacity rides --holo-opc so it fades in on hover only).
      id: 'brilliant-glare',
      bg: 'radial-gradient(farthest-corner circle at calc(var(--holo-lp, 50) * 1%) calc(var(--holo-tp, 50) * 1%), rgba(255,250,230,0.9) 8%, rgba(255,198,84,0.5) 26%, rgba(74,36,0,0.55) 88%)',
      bgSize: '100% 100%',
      animation: 'none',
      blendMode: 'overlay',
      opacity: 'var(--holo-opc, 0)',
    },
  ],
  HOLOGRAPHIC: [
    {
      // Horizontal diffraction scan-lines — the characteristic parallel line structure
      // of real holographic foil that splits light into rainbow.
      // Tight pitch, cool blue-white; a faint perpendicular set adds the secondary
      // grating axis. Completely different from the BRILLIANT diagonal diamond cuts.
      id: 'holographic-scanlines',
      bg: [
        'repeating-linear-gradient(  0deg, transparent 0px, transparent 3px, rgba(210,235,255,0.26) 3px, rgba(210,235,255,0.26) 4px)',
        'repeating-linear-gradient( 90deg, transparent 0px, transparent 7px, rgba(210,235,255,0.10) 7px, rgba(210,235,255,0.10) 8px)',
      ].join(', '),
      bgSize: 'auto',
      animation: 'none',
      blendMode: 'overlay',
      opacity: 1,
    },
  ],
}

// ── Elements ───────────────────────────────────────────────────────────────────

export type ElementKey = 'feu' | 'eau' | 'nature' | 'foudre' | 'ombre'

export type ElementDef = {
  name: string
  color: string
  icon: LucideIcon
}

export const ELEMENTS: Record<ElementKey, ElementDef> = {
  feu: { name: 'Feu', color: '#ef4444', icon: Flame },
  eau: { name: 'Eau', color: '#3b82f6', icon: Droplet },
  nature: { name: 'Nature', color: '#22c55e', icon: Leaf },
  foudre: { name: 'Foudre', color: '#f59e0b', icon: Zap },
  ombre: { name: 'Ombre', color: '#8b5cf6', icon: Moon },
}
