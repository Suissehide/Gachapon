import placeholderImg from '../../../assets/data/not-found.png'
import type { SizePreset, VariantInfo } from './config.ts'

// Reads CSS var set by TcgCardFace: --tcg-card-bg

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
    <div className="relative flex-1 [background:var(--tcg-card-bg)]">
      {/* Art mat — image inset from the edges */}
      <div className={`absolute ${sz.matInset} overflow-hidden rounded-[4px]`}>
        <img
          src={
            isOwned ? imageUrl || placeholderImg : imageUrl || placeholderImg
          }
          alt={isOwned ? name : ''}
          className={`absolute inset-0 h-full w-full object-cover ${isOwned ? '' : 'brightness-0 opacity-50'}`}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = placeholderImg
          }}
        />

        {/* Variant shimmer overlay */}
        {isOwned && variantInfo && (
          <div
            className="pointer-events-none absolute inset-0 mix-blend-color-dodge [background-size:200%_200%]"
            style={{
              background: variantInfo.overlayBg,
              animation: variantInfo.overlayAnimation,
            }}
          />
        )}

        {showSweep && hasSweep && isOwned && (
          <div className="card-sweep-inner" />
        )}
      </div>

      {/* Variant badge */}
      {isOwned && variantInfo && (
        <div className="absolute right-1.5 top-1.5 z-10">
          <span
            className={`flex items-center gap-0.5 rounded-full font-semibold backdrop-blur-sm ${compact ? 'px-1 py-px text-[8px]' : 'px-2 py-0.5 text-[10px]'} ${variantInfo.className}`}
          >
            <variantInfo.icon className={compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} />
            {!compact && variantInfo.label}
          </span>
        </div>
      )}
    </div>
  )
}
