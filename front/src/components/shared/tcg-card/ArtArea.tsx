import type React from 'react'

import placeholderImg from '../../../assets/data/not-found.png'
import type { SizePreset, VariantInfo } from './config.ts'

type Props = {
  variantInfo: VariantInfo | null
  imageUrl?: string | null
  name: string
  isOwned: boolean
  showSweep: boolean
  hasSweep: boolean
  compact: boolean
  sz: SizePreset
}

export function ArtArea({
  variantInfo,
  imageUrl,
  name,
  isOwned,
  showSweep,
  hasSweep,
  compact,
  sz,
}: Props) {
  return (
    <div className="relative flex-1">
      {/* Art mat — inset image */}
      <div className={`absolute ${sz.matInset} overflow-hidden rounded-[3px]`}>
        <img
          src={imageUrl || placeholderImg}
          alt={isOwned ? name : ''}
          className={`absolute inset-0 h-full w-full object-cover ${isOwned ? '' : 'brightness-0 opacity-60'}`}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = placeholderImg
          }}
        />
        {showSweep && hasSweep && isOwned && (
          <div className="card-sweep-inner" />
        )}
      </div>

      {/* Variant overlay layers — cover full art area (outside mat padding) */}
      {isOwned &&
        variantInfo?.layers.map((layer) => (
          <div
            key={layer.id}
            className="pointer-events-none absolute inset-0"
            style={{
              background: layer.bg,
              backgroundSize: layer.bgSize,
              animation: layer.animation,
              mixBlendMode:
                layer.blendMode as React.CSSProperties['mixBlendMode'],
              opacity: layer.opacity,
            }}
          />
        ))}

      {/*
       * Cursor spotlight — only visible when --shine-o is set (CardDisplay hover).
       * Lives inside ArtArea so it blends directly with the texture layers above,
       * before isolation:isolate flattens them. Uses the simeydotme glare formula:
       * bright white center + dark edges → high contrast with mix-blend-mode overlay
       * makes etch/grating patterns pop sharply under the cursor.
       */}
      {isOwned && variantInfo && (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            opacity: 'var(--shine-o, 0)' as unknown as React.CSSProperties['opacity'],
            background:
              'radial-gradient(farthest-corner circle at var(--shine-x, 50%) var(--shine-y, 50%), hsla(0,0%,100%,0.7) 10%, hsla(0,0%,100%,0.5) 22%, hsla(0,0%,0%,0.45) 90%)',
          }}
        />
      )}

      {/* Variant badge */}
      {isOwned && variantInfo && (
        <div className="absolute right-1.5 top-1.5 z-10">
          <span
            className={`flex items-center gap-0.5 rounded-full font-semibold backdrop-blur-sm ${compact ? 'px-1 py-px text-[7px]' : 'px-1.5 py-0.5 text-[9px]'} ${variantInfo.className}`}
          >
            <variantInfo.icon
              className={compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'}
            />
            {!compact && variantInfo.label}
          </span>
        </div>
      )}
    </div>
  )
}
