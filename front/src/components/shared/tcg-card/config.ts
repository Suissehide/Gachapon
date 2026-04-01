import { Sun, Waves } from 'lucide-react'
import type React from 'react'

// ── Rarity config ─────────────────────────────────────────────────────────────

export type RarityConfig = {
  // Visual frame — gradient background acts as the border via padding technique
  frameGradient: string
  // Keep for CardReveal backdrop and CSS var fallbacks
  frameBorder: string
  backdropColor: string
  glow: string
  hasSweep: boolean
  // Card body
  cardBg: string
  cardTexture: string
  innerRing: string
  // Name plate
  namePlateBg: string
  separatorColor: string
  // Bottom strip
  bottomStripBg: string
  // Colors (also set as CSS vars for sub-components)
  nameColor: string
  setColor: string
  accentColor: string
  label: string
  labelColor: string
  gemLabel: string
  shimmer: boolean
  // Animated glow class to apply on the outer wrapper
  glowClass: string
}

export const RARITY_TCG_CONFIG: Record<string, RarityConfig> = {
  COMMON: {
    frameGradient:
      'linear-gradient(145deg, #9ca3af 0%, #d1d5db 30%, #f9fafb 50%, #d1d5db 70%, #9ca3af 100%)',
    frameBorder: '#9ca3af',
    backdropColor: '',
    glow: '0 2px 12px rgba(0,0,0,0.12)',
    hasSweep: false,
    cardBg: 'linear-gradient(170deg, #fafafa 0%, #f3f4f6 100%)',
    cardTexture:
      'repeating-linear-gradient(45deg, rgba(0,0,0,0.018) 0px, rgba(0,0,0,0.018) 1px, transparent 1px, transparent 6px)',
    innerRing: 'rgba(156,163,175,0.35)',
    namePlateBg: 'linear-gradient(180deg, #f3f4f6 0%, #fafafa 100%)',
    separatorColor: 'rgba(107,114,128,0.35)',
    bottomStripBg: 'linear-gradient(0deg, #e5e7eb 0%, #f3f4f6 100%)',
    nameColor: '#1f2937',
    setColor: '#6b7280',
    accentColor: '#9ca3af',
    label: 'Commun',
    labelColor: '#6b7280',
    gemLabel: '·',
    shimmer: false,
    glowClass: '',
  },
  UNCOMMON: {
    frameGradient:
      'linear-gradient(145deg, #15803d 0%, #4ade80 30%, #bbf7d0 50%, #4ade80 70%, #15803d 100%)',
    frameBorder: '#16a34a',
    backdropColor:
      'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.08) 0%, transparent 70%)',
    glow: '0 2px 10px rgba(34,197,94,0.18), 0 1px 4px rgba(0,0,0,0.08)',
    hasSweep: false,
    cardBg: 'linear-gradient(170deg, #f0fdf4 0%, #dcfce7 100%)',
    cardTexture:
      'repeating-linear-gradient(45deg, rgba(34,197,94,0.04) 0px, rgba(34,197,94,0.04) 1px, transparent 1px, transparent 6px)',
    innerRing: 'rgba(34,197,94,0.25)',
    namePlateBg: 'linear-gradient(180deg, #bbf7d0 0%, #f0fdf4 100%)',
    separatorColor: 'rgba(34,197,94,0.4)',
    bottomStripBg: 'linear-gradient(0deg, #bbf7d0 0%, #dcfce7 100%)',
    nameColor: '#14532d',
    setColor: '#15803d',
    accentColor: '#22c55e',
    label: 'Peu commun',
    labelColor: '#15803d',
    gemLabel: '◆',
    shimmer: false,
    glowClass: 'uncommon-glow',
  },
  RARE: {
    frameGradient:
      'linear-gradient(145deg, #0369a1 0%, #38bdf8 30%, #bae6fd 50%, #38bdf8 70%, #0369a1 100%)',
    frameBorder: '#0891b2',
    backdropColor:
      'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.08) 0%, transparent 70%)',
    glow: '0 2px 12px rgba(6,182,212,0.2), 0 1px 4px rgba(0,0,0,0.08)',
    hasSweep: true,
    cardBg: 'linear-gradient(170deg, #f0f9ff 0%, #e0f2fe 100%)',
    cardTexture:
      'repeating-linear-gradient(45deg, rgba(14,165,233,0.04) 0px, rgba(14,165,233,0.04) 1px, transparent 1px, transparent 6px)',
    innerRing: 'rgba(6,182,212,0.3)',
    namePlateBg: 'linear-gradient(180deg, #bae6fd 0%, #f0f9ff 100%)',
    separatorColor: 'rgba(6,182,212,0.4)',
    bottomStripBg: 'linear-gradient(0deg, #bae6fd 0%, #e0f2fe 100%)',
    nameColor: '#0c4a6e',
    setColor: '#0369a1',
    accentColor: '#0ea5e9',
    label: 'Rare',
    labelColor: '#0369a1',
    gemLabel: '◆◆',
    shimmer: false,
    glowClass: 'rare-glow',
  },
  EPIC: {
    frameGradient:
      'linear-gradient(145deg, #6d28d9 0%, #a78bfa 30%, #ede9fe 50%, #a78bfa 70%, #6d28d9 100%)',
    frameBorder: '#7c3aed',
    backdropColor:
      'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 70%)',
    glow: '0 2px 14px rgba(139,92,246,0.22), 0 1px 4px rgba(0,0,0,0.08)',
    hasSweep: true,
    cardBg: 'linear-gradient(170deg, #faf5ff 0%, #ede9fe 100%)',
    cardTexture:
      'repeating-linear-gradient(45deg, rgba(167,139,250,0.05) 0px, rgba(167,139,250,0.05) 1px, transparent 1px, transparent 6px)',
    innerRing: 'rgba(139,92,246,0.3)',
    namePlateBg: 'linear-gradient(180deg, #ddd6fe 0%, #faf5ff 100%)',
    separatorColor: 'rgba(139,92,246,0.4)',
    bottomStripBg: 'linear-gradient(0deg, #ddd6fe 0%, #ede9fe 100%)',
    nameColor: '#3b0764',
    setColor: '#6d28d9',
    accentColor: '#a78bfa',
    label: 'Épique',
    labelColor: '#6d28d9',
    gemLabel: '◆◆◆',
    shimmer: false,
    glowClass: 'epic-glow',
  },
  LEGENDARY: {
    frameGradient:
      'linear-gradient(145deg, #92400e 0%, #d97706 20%, #fbbf24 35%, #fde68a 48%, #fffbeb 50%, #fde68a 52%, #fbbf24 65%, #d97706 80%, #92400e 100%)',
    frameBorder: '#d97706',
    backdropColor:
      'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)',
    glow: '0 2px 16px rgba(245,158,11,0.28), 0 1px 6px rgba(180,83,9,0.15)',
    hasSweep: true,
    cardBg: 'linear-gradient(170deg, #fffbeb 0%, #fef3c7 100%)',
    cardTexture:
      'repeating-linear-gradient(45deg, rgba(245,158,11,0.06) 0px, rgba(245,158,11,0.06) 1px, transparent 1px, transparent 6px)',
    innerRing: 'rgba(245,158,11,0.4)',
    namePlateBg: 'linear-gradient(180deg, #fde68a 0%, #fffbeb 100%)',
    separatorColor: 'rgba(245,158,11,0.5)',
    bottomStripBg: 'linear-gradient(0deg, #fde68a 0%, #fef3c7 100%)',
    nameColor: '#451a03',
    setColor: '#92400e',
    accentColor: '#f59e0b',
    label: 'Légendaire',
    labelColor: '#92400e',
    gemLabel: '✦✦✦',
    shimmer: true,
    glowClass: 'legendary-glow',
  },
}

// ── Variant config ─────────────────────────────────────────────────────────────

export type VariantOverlayLayer = {
  id: string
  bg: string
  bgSize: string
  animation: string
  blendMode: string
  opacity: number
}

export type VariantInfo = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  className: string
  layers: VariantOverlayLayer[]
}

export const VARIANT_TCG_CONFIG: Record<string, VariantInfo> = {
  BRILLIANT: {
    icon: Sun,
    label: 'Brillant',
    className: 'bg-amber-400/25 border border-amber-500/50 text-amber-700',
    layers: [
      {
        // 1. Gold color cast — warm amber over the entire artwork
        id: 'brilliant-tint',
        bg: 'linear-gradient(160deg, rgba(255,195,0,0.7) 0%, rgba(255,155,0,0.6) 45%, rgba(210,90,0,0.4) 100%)',
        bgSize: '100% 100%',
        animation: 'none',
        blendMode: 'color',
        opacity: 1,
      },
      {
        // 2. Engraved diamond cuts — coarser ±45° crosshatch, wider pitch (5px).
        //    Warm gold ridges at +45° + dark shadow valleys at -45°.
        //    Creates the hammered/engraved look of Secret Rare Gold surfaces.
        //    Deliberately coarser and warmer than the holo scan-lines.
        id: 'brilliant-etch',
        bg: [
          'repeating-linear-gradient( 45deg, transparent 0px, transparent 5px, rgba(255,215,60,0.32) 5px, rgba(255,215,60,0.32) 7px)',
          'repeating-linear-gradient(-45deg, transparent 0px, transparent 5px, rgba(0,0,0,0.26)     5px, rgba(0,0,0,0.26)     7px)',
        ].join(', '),
        bgSize: 'auto',
        animation: 'none',
        blendMode: 'overlay',
        opacity: 1,
      },
      {
        // 3. Prismatic foil shimmer — cycling rainbow sliding across the textured gold,
        //    like Secret Rare cards under changing light
        id: 'brilliant-foil',
        bg: 'linear-gradient(125deg, rgba(255,50,0,0.5) 0%, rgba(255,190,0,0.55) 20%, rgba(255,255,80,0.35) 40%, rgba(80,255,180,0.4) 60%, rgba(0,140,255,0.5) 80%, rgba(180,50,255,0.45) 100%)',
        bgSize: '300% 300%',
        animation: 'holoColor 5s linear infinite, holoDrift 18s linear infinite',
        blendMode: 'color-dodge',
        opacity: 0.38,
      },
      {
        // 4. Diagonal gold light — sharp angled beam sweeping the card surface,
        //    like direct light catching a polished gold ingot at an angle.
        //    holoDrift moves the beam in a slow circular path for organic motion.
        id: 'brilliant-diagonal',
        bg: 'linear-gradient(125deg, transparent 10%, transparent 30%, rgba(255,245,100,0.55) 43%, rgba(255,255,200,0.80) 50%, rgba(255,245,100,0.55) 57%, transparent 70%, transparent 90%)',
        bgSize: '280% 280%',
        animation: 'holoDrift 8s ease-in-out infinite',
        blendMode: 'screen',
        opacity: 0.9,
      },
    ],
  },
  HOLOGRAPHIC: {
    icon: Waves,
    label: 'Holographique',
    className: 'bg-cyan-400/20 border border-cyan-500/40 text-cyan-700',
    layers: [
      {
        // Horizontal diffraction scan-lines — the characteristic parallel line structure
        // of real holographic foil that splits light into rainbow.
        // Tight 2px pitch (1px line / 1px gap), cool blue-white.
        // A faint perpendicular set adds the secondary grating axis (less dominant).
        // Completely different from the BRILLIANT diagonal diamond cuts.
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
  },
}

// ── Size presets ───────────────────────────────────────────────────────────────

export type SizePreset = {
  outerRadius: string
  framePad: number // padding on outer wrapper = frame thickness
  innerRadius: string
  namepadX: string
  namepadY: string
  nameFontSize: string
  setFontSize: string
  raritypadX: string
  raritypadY: string
  rarityFontSize: string
  gemFontSize: string
  matInset: string
  cornerSize: string // Tailwind w/h class for corner brackets
}

export const SIZE_FULL: SizePreset = {
  outerRadius: 'rounded-[7px]',
  framePad: 3,
  innerRadius: 'rounded-[4px]',
  namepadX: 'px-4',
  namepadY: 'py-2',
  nameFontSize: 'text-[16px]',
  setFontSize: 'text-[10px]',
  raritypadX: 'px-3',
  raritypadY: 'py-[5px]',
  rarityFontSize: 'text-[10px]',
  gemFontSize: 'text-[8px]',
  matInset: 'inset-[26px]',
  cornerSize: 'w-[9px] h-[9px]',
}

export const SIZE_COMPACT: SizePreset = {
  outerRadius: 'rounded-[5px]',
  framePad: 2,
  innerRadius: 'rounded-[2px]',
  namepadX: 'px-2',
  namepadY: 'py-[3px]',
  nameFontSize: 'text-[9px]',
  setFontSize: 'text-[7px]',
  raritypadX: 'px-1.5',
  raritypadY: 'py-[2px]',
  rarityFontSize: 'text-[7px]',
  gemFontSize: 'text-[6px]',
  matInset: 'inset-[13px]',
  cornerSize: 'w-[5px] h-[5px]',
}
