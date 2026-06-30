import placeholderImg from '../../assets/data/not-found.png'
import { getRarityTone } from '../shared/tcg-card/config.ts'

type Props = {
  rarity: string
  name: string
  imageUrl?: string | null
}

// Locked silhouette card — rarity-tinted background with a darkened
// version of the card art and corner brackets.
export function LockedCard({ rarity, name, imageUrl }: Props) {
  const tone = getRarityTone(rarity)

  return (
    <div
      className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-[16px] border px-[10px] pt-[14px] pb-3"
      style={{
        background: `linear-gradient(180deg, color-mix(in oklab, ${tone.light} 32%, #f3f1ec), color-mix(in oklab, ${tone.hex} 12%, #eae6df))`,
        borderColor: `color-mix(in oklab, ${tone.hex} 22%, rgba(27,23,38,0.1))`,
      }}
    >
      {/* Corner brackets */}
      <CornerBracket position="tl" tone={tone.dark} />
      <CornerBracket position="tr" tone={tone.dark} />
      <CornerBracket position="bl" tone={tone.dark} />
      <CornerBracket position="br" tone={tone.dark} />

      {/* ??? top label */}
      <div
        className="font-mono text-[13px] font-bold tracking-[0.1em]"
        style={{
          color: `color-mix(in oklab, ${tone.dark} 55%, rgba(27,23,38,0.4))`,
        }}
      >
        ???
      </div>

      {/* Dimmed silhouette of the art */}
      <div className="flex w-full flex-1 items-center justify-center">
        <img
          src={imageUrl || placeholderImg}
          alt=""
          aria-label={`Carte non possédée — ${name}`}
          className="max-h-[86%] max-w-[72%] object-contain opacity-40"
          style={{ filter: 'brightness(0)' }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = placeholderImg
          }}
        />
      </div>

      {/* Dotted bar at the bottom */}
      <div className="flex h-[14px] items-center justify-center">
        <span
          className="h-[4px] w-[42px] rounded-[2px] opacity-60"
          style={{
            background: `repeating-linear-gradient(90deg, color-mix(in oklab, ${tone.dark} 45%, transparent) 0 4px, transparent 4px 8px)`,
          }}
        />
      </div>
    </div>
  )
}

function CornerBracket({
  position,
  tone,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br'
  tone: string
}) {
  const base: React.CSSProperties = {
    width: '14px',
    height: '14px',
    position: 'absolute',
    border: `2px solid color-mix(in oklab, ${tone} 35%, rgba(27,23,38,0.25))`,
    zIndex: 2,
  }
  if (position.includes('t')) {
    base.top = '8px'
    base.borderBottom = 'none'
  } else {
    base.bottom = '8px'
    base.borderTop = 'none'
  }
  if (position.includes('l')) {
    base.left = '8px'
    base.borderRight = 'none'
    base.borderRadius = position === 'tl' ? '4px 0 0 0' : '0 0 0 4px'
  } else {
    base.right = '8px'
    base.borderLeft = 'none'
    base.borderRadius = position === 'tr' ? '0 4px 0 0' : '0 0 4px 0'
  }
  return <span className="pointer-events-none" style={base} />
}
