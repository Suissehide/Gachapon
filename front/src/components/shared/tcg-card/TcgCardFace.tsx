import type React from 'react'
import { useRef, useState } from 'react'

import { ArtArea } from './ArtArea.tsx'
import {
  RARITY_TCG_CONFIG,
  SIZE_COMPACT,
  SIZE_FULL,
  VARIANT_TCG_CONFIG,
} from './config.ts'
import { HoloOverlay } from './HoloOverlay.tsx'
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
  const isHolo = variant === 'HOLOGRAPHIC' && isOwned

  // Only `active` boolean drives re-renders; position values go directly to DOM via CSS vars
  const [holoActive, setHoloActive] = useState(false)
  const outerRef = useRef<HTMLDivElement>(null)

  const handleHoloMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = Math.abs(
      Math.floor((100 / rect.width) * (e.clientX - rect.left)) - 100,
    )
    const py = Math.abs(
      Math.floor((100 / rect.height) * (e.clientY - rect.top)) - 100,
    )
    const pa = 50 - px + (50 - py)
    if (!holoActive) {
      setHoloActive(true)
    }
    const el = outerRef.current
    if (el) {
      el.style.setProperty('--holo-lp', String(50 + (px - 50) / 1.5))
      el.style.setProperty('--holo-tp', String(50 + (py - 50) / 1.5))
      el.style.setProperty('--holo-px', String(50 + (px - 50) / 7))
      el.style.setProperty('--holo-py', String(50 + (py - 50) / 7))
      el.style.setProperty(
        '--holo-opc',
        String((20 + Math.abs(pa) * 1.5) / 100),
      )
    }
  }

  const handleHoloMouseLeave = () => setHoloActive(false)

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
      ref={outerRef}
      className={`absolute inset-0 [backface-visibility:hidden] ${sz.outerRadius} ${isOwned ? config.glowClass : ''}`}
      style={{
        ...cssVars,
        background: isOwned
          ? config.frameGradient
          : 'linear-gradient(145deg, #d1d5db 0%, #e5e7eb 50%, #d1d5db 100%)',
        padding: sz.framePad,
        boxShadow: isOwned ? config.glow : '0 2px 8px rgba(0,0,0,0.08)',
      }}
      onMouseMove={isHolo ? handleHoloMouseMove : undefined}
      onMouseLeave={isHolo ? handleHoloMouseLeave : undefined}
    >
      {/* Inner card body */}
      <div
        className={`relative h-full flex flex-col overflow-hidden [isolation:isolate] ${sz.innerRadius}`}
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
        {isHolo && <HoloOverlay active={holoActive} />}
      </div>

      {/* Corner L-bracket ornaments over the gradient frame */}
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-t-[1.5px] border-l-[1.5px] border-black/20`}
        style={{ top: cornerOffset, left: cornerOffset }}
      />
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-t-[1.5px] border-r-[1.5px] border-black/20`}
        style={{ top: cornerOffset, right: cornerOffset }}
      />
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-b-[1.5px] border-l-[1.5px] border-black/20`}
        style={{ bottom: cornerOffset, left: cornerOffset }}
      />
      <span
        className={`pointer-events-none absolute ${sz.cornerSize} border-b-[1.5px] border-r-[1.5px] border-black/20`}
        style={{ bottom: cornerOffset, right: cornerOffset }}
      />
    </div>
  )
}
