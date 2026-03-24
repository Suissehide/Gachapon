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
    '--tcg-texture': config.cardTexture,
    '--tcg-strip-bg': config.bottomStripBg,
    '--tcg-accent': config.accentColor,
    '--tcg-name-c': isOwned ? config.nameColor : '#9ca3af',
    '--tcg-set-c': isOwned ? config.setColor : '#d1d5db',
    '--tcg-label-c': isOwned ? config.labelColor : '#9ca3af',
  } as React.CSSProperties

  const cornerOffset = `${sz.framePad + 2}px`

  return (
    // Outer wrapper = gradient frame via background + padding technique
    <div
      className={`absolute inset-0 [backface-visibility:hidden] ${sz.outerRadius} ${isOwned ? config.glowClass : ''}`}
      style={{
        ...cssVars,
        background: isOwned
          ? config.frameGradient
          : 'linear-gradient(145deg, #d1d5db 0%, #e5e7eb 50%, #d1d5db 100%)',
        padding: sz.framePad,
        boxShadow: isOwned ? config.glow : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Inner card body */}
      <div
        className={`relative h-full flex flex-col overflow-hidden ${sz.innerRadius}`}
        style={{
          background: config.cardBg,
          boxShadow: `inset 0 0 0 1px ${isOwned ? config.innerRing : 'rgba(156,163,175,0.3)'}`,
        }}
      >
        {!isOwned && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-black/30" />
        )}
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

      {/* Corner L-bracket ornaments over the gradient frame */}
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-t-[1.5px] border-l-[1.5px] border-black/20 rounded-tl-[2px]`}
        style={{ top: cornerOffset, left: cornerOffset }}
      />
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-t-[1.5px] border-r-[1.5px] border-black/20 rounded-tr-[2px]`}
        style={{ top: cornerOffset, right: cornerOffset }}
      />
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-b-[1.5px] border-l-[1.5px] border-black/20 rounded-bl-[2px]`}
        style={{ bottom: cornerOffset, left: cornerOffset }}
      />
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-b-[1.5px] border-r-[1.5px] border-black/20 rounded-br-[2px]`}
        style={{ bottom: cornerOffset, right: cornerOffset }}
      />
    </div>
  )
}
