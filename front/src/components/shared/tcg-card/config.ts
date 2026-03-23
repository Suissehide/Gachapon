import { Gem, Sparkles } from 'lucide-react'
import type React from 'react'

// ── Rarity config ─────────────────────────────────────────────────────────────

export type RarityConfig = {
  frameBorder: string
  frameInnerBorder: string
  glow: string
  backdropColor: string
  hasSweep: boolean
  cardBg: string
  namePlateBg: string
  separatorColor: string
  bottomStripBg: string
  nameColor: string
  setColor: string
  accentColor: string
  label: string
  labelColor: string
  shimmer: boolean
}

export const RARITY_TCG_CONFIG: Record<string, RarityConfig> = {
  COMMON: {
    frameBorder: '#6b7280',
    frameInnerBorder: '#374151',
    glow: '',
    backdropColor: '',
    hasSweep: false,
    cardBg: 'linear-gradient(170deg, #1e2433 0%, #0f1520 100%)',
    namePlateBg: 'linear-gradient(135deg, #2d3748 0%, #1a2234 100%)',
    separatorColor: 'rgba(107,114,128,0.4)',
    bottomStripBg: 'linear-gradient(0deg, #0d1117 0%, #161d2d 100%)',
    nameColor: '#d1d5db',
    setColor: '#6b7280',
    accentColor: '#9ca3af',
    label: 'Commun',
    labelColor: '#9ca3af',
    shimmer: false,
  },
  UNCOMMON: {
    frameBorder: '#16a34a',
    frameInnerBorder: '#14532d',
    glow: '0 0 18px rgba(34,197,94,0.4), 0 0 40px rgba(34,197,94,0.15)',
    backdropColor: '',
    hasSweep: false,
    cardBg: 'linear-gradient(170deg, #0a1f15 0%, #050f0a 100%)',
    namePlateBg: 'linear-gradient(135deg, #14532d 0%, #0a1f15 100%)',
    separatorColor: 'rgba(34,197,94,0.35)',
    bottomStripBg: 'linear-gradient(0deg, #050f0a 0%, #0a1f15 100%)',
    nameColor: '#bbf7d0',
    setColor: '#4ade80',
    accentColor: '#4ade80',
    label: 'Peu commun',
    labelColor: '#4ade80',
    shimmer: false,
  },
  RARE: {
    frameBorder: '#0891b2',
    frameInnerBorder: '#164e63',
    glow: '0 0 22px rgba(6,182,212,0.55), 0 0 50px rgba(6,182,212,0.2)',
    backdropColor:
      'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.09) 0%, transparent 70%)',
    hasSweep: true,
    cardBg: 'linear-gradient(170deg, #0c1e3a 0%, #060c1a 100%)',
    namePlateBg: 'linear-gradient(135deg, #164e63 0%, #0c1e3a 100%)',
    separatorColor: 'rgba(6,182,212,0.35)',
    bottomStripBg: 'linear-gradient(0deg, #060c1a 0%, #0c1e3a 100%)',
    nameColor: '#bae6fd',
    setColor: '#22d3ee',
    accentColor: '#22d3ee',
    label: 'Rare',
    labelColor: '#22d3ee',
    shimmer: false,
  },
  EPIC: {
    frameBorder: '#7c3aed',
    frameInnerBorder: '#4c1d95',
    glow: '0 0 26px rgba(139,92,246,0.6), 0 0 60px rgba(139,92,246,0.22)',
    backdropColor:
      'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(139,92,246,0.11) 0%, transparent 70%)',
    hasSweep: true,
    cardBg: 'linear-gradient(170deg, #150d3a 0%, #080514 100%)',
    namePlateBg: 'linear-gradient(135deg, #4c1d95 0%, #150d3a 100%)',
    separatorColor: 'rgba(139,92,246,0.35)',
    bottomStripBg: 'linear-gradient(0deg, #080514 0%, #150d3a 100%)',
    nameColor: '#ddd6fe',
    setColor: '#a78bfa',
    accentColor: '#a78bfa',
    label: 'Épique',
    labelColor: '#a78bfa',
    shimmer: false,
  },
  LEGENDARY: {
    frameBorder: '#d97706',
    frameInnerBorder: '#92400e',
    glow: '0 0 30px rgba(245,158,11,0.7), 0 0 70px rgba(245,158,11,0.28), 0 0 120px rgba(245,158,11,0.1)',
    backdropColor:
      'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)',
    hasSweep: true,
    cardBg: 'linear-gradient(170deg, #1a0e00 0%, #0a0700 100%)',
    namePlateBg: 'linear-gradient(135deg, #78350f 0%, #1a0e00 100%)',
    separatorColor: 'rgba(245,158,11,0.45)',
    bottomStripBg: 'linear-gradient(0deg, #0a0700 0%, #1a0e00 100%)',
    nameColor: '#fde68a',
    setColor: '#fbbf24',
    accentColor: '#f59e0b',
    label: '✦ Légendaire ✦',
    labelColor: '#f59e0b',
    shimmer: true,
  },
}

// ── Variant config ─────────────────────────────────────────────────────────────

export type VariantInfo = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  className: string
  overlayBg: string
  overlayAnimation: string
}

export const VARIANT_TCG_CONFIG: Record<string, VariantInfo> = {
  BRILLIANT: {
    icon: Sparkles,
    label: 'Brillant',
    className: 'bg-amber-500/15 border border-amber-500/40 text-amber-300',
    overlayBg:
      'linear-gradient(135deg, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.15) 40%, rgba(252,211,77,0.35) 70%, rgba(251,191,36,0.3) 100%)',
    overlayAnimation: 'brilliant-shift 2s ease infinite',
  },
  HOLOGRAPHIC: {
    icon: Gem,
    label: 'Holographique',
    className: 'bg-purple-500/15 border border-purple-500/40 text-purple-300',
    overlayBg:
      'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.2) 25%, rgba(59,130,246,0.25) 50%, rgba(16,185,129,0.2) 75%, rgba(99,102,241,0.25) 100%)',
    overlayAnimation: 'holographic-shift 3s ease infinite',
  },
}

// ── Size presets ───────────────────────────────────────────────────────────────

export type SizePreset = {
  outerRadius: string
  borderWidth: number
  innerMargin: string
  innerRadius: string
  namepadX: string
  namepadY: string
  nameFontSize: string
  setFontSize: string
  raritypadX: string
  raritypadY: string
  rarityFontSize: string
  matInset: string
  diamondFontSize: string
}

export const SIZE_FULL: SizePreset = {
  outerRadius: 'rounded-2xl',
  borderWidth: 3,
  innerMargin: 'm-1',
  innerRadius: 'rounded-xl',
  namepadX: 'px-3.5',
  namepadY: 'py-2',
  nameFontSize: 'text-[14px]',
  setFontSize: 'text-[10px]',
  raritypadX: 'px-3.5',
  raritypadY: 'py-1.5',
  rarityFontSize: 'text-[10px]',
  matInset: 'inset-[7px]',
  diamondFontSize: 'text-[8px]',
}

export const SIZE_COMPACT: SizePreset = {
  outerRadius: 'rounded-[10px]',
  borderWidth: 2,
  innerMargin: 'm-0.5',
  innerRadius: 'rounded-[7px]',
  namepadX: 'px-2',
  namepadY: 'py-1',
  nameFontSize: 'text-[9px]',
  setFontSize: 'text-[7px]',
  raritypadX: 'px-2',
  raritypadY: 'py-[3px]',
  rarityFontSize: 'text-[7px]',
  matInset: 'inset-[4px]',
  diamondFontSize: 'text-[5px]',
}
