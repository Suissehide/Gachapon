import { Droplet, Flame, type LucideIcon, Leaf, Moon, Zap } from 'lucide-react'

// ── Rarity tokens ──────────────────────────────────────────────────────────────
// Drives --rar / --rar-light / --rar-dark CSS vars on the card root.

export type RarityKey =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'

export type RarityTone = {
  hex: string
  light: string
  dark: string
  label: string
}

export const RARITY_TONES: Record<RarityKey, RarityTone> = {
  COMMON: { hex: '#22c55e', light: '#86efac', dark: '#14532d', label: 'Commun' },
  UNCOMMON: { hex: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', label: 'Peu commun' },
  RARE: { hex: '#8b5cf6', light: '#c4b5fd', dark: '#4c1d95', label: 'Rare' },
  EPIC: { hex: '#ec4899', light: '#f9a8d4', dark: '#831843', label: 'Épique' },
  LEGENDARY: { hex: '#f59e0b', light: '#fcd34d', dark: '#78350f', label: 'Légendaire' },
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
