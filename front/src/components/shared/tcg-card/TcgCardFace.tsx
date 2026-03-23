import type React from 'react'

import { ArtArea } from './ArtArea.tsx'
import {
  RARITY_TCG_CONFIG,
  SIZE_COMPACT,
  SIZE_FULL,
  VARIANT_TCG_CONFIG,
} from './config.ts'
import { NamePlate } from './NamePlate.tsx'
import { RarityStrip } from './RarityStrip.tsx'

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  rarity: string
  name: string
  setName: string
  imageUrl?: string | null
  variant?: string | null
  isOwned?: boolean
  showSweep?: boolean
  compact?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TcgCardFace({
  rarity,
  name,
  setName,
  imageUrl,
  variant,
  isOwned = true,
  showSweep = false,
  compact = false,
}: Props) {
  const config = RARITY_TCG_CONFIG[rarity] ?? RARITY_TCG_CONFIG.COMMON
  const variantInfo =
    variant && variant !== 'NORMAL' ? VARIANT_TCG_CONFIG[variant] : null
  const sz = compact ? SIZE_COMPACT : SIZE_FULL

  // All config-derived color/gradient values are exposed as CSS custom properties
  // so sub-components can reference them via Tailwind arbitrary values (var(--tcg-*))
  const cssVars = {
    '--tcg-sep': config.separatorColor,
    '--tcg-name-bg': config.namePlateBg,
    '--tcg-card-bg': config.cardBg,
    '--tcg-strip-bg': config.bottomStripBg,
    '--tcg-accent': config.accentColor,
    '--tcg-name-c': isOwned ? config.nameColor : '#4b5563',
    '--tcg-set-c': isOwned ? config.setColor : '#374151',
    '--tcg-label-c': isOwned ? config.labelColor : '#4b5563',
    '--tcg-inner-border': isOwned ? config.frameInnerBorder : '#374151',
  } as React.CSSProperties

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden [backface-visibility:hidden] ${sz.outerRadius}`}
      style={{
        ...cssVars,
        border: `${sz.borderWidth}px solid ${isOwned ? config.frameBorder : '#374151'}`,
        boxShadow: isOwned
          ? `inset 0 0 0 1px ${config.frameInnerBorder}88, ${config.glow}`
          : 'none',
        background: config.cardBg,
      }}
    >
      {/* Inner inset frame */}
      <div
        className={`border border-[color:var(--tcg-inner-border)] overflow-hidden flex-1 flex flex-col ${sz.innerMargin} ${sz.innerRadius}`}
      >
        <NamePlate name={name} setName={setName} isOwned={isOwned} sz={sz} />
        <ArtArea
          variantInfo={variantInfo}
          imageUrl={imageUrl}
          name={name}
          isOwned={isOwned}
          showSweep={showSweep}
          hasSweep={config.hasSweep}
          compact={compact}
          sz={sz}
        />
        <RarityStrip config={config} isOwned={isOwned} sz={sz} />
      </div>
    </div>
  )
}
