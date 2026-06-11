// front/src/components/profile/arcade/cardArt.tsx
import type { ArcadeRarity } from './utils'

const RARITY_FRAME: Record<ArcadeRarity, string> = {
  COMMON: 'linear-gradient(135deg, #86efac, #22c55e)',
  UNCOMMON: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
  RARE: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)',
  EPIC: 'linear-gradient(135deg, #f9a8d4, #ec4899)',
  LEGENDARY: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
}

type Props = {
  rarity: ArcadeRarity
  name: string
  setName?: string
  imageUrl?: string | null
}

export function CardArt({ rarity, name, setName, imageUrl }: Props) {
  return (
    <div
      className="relative aspect-[3/4] w-full overflow-hidden rounded-xl"
      style={{ background: RARITY_FRAME[rarity], padding: 4 }}
    >
      <div className="absolute inset-1 rounded-lg bg-white flex flex-col">
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            background: imageUrl
              ? `url(${imageUrl}) center/cover`
              : `radial-gradient(circle at center, ${RARITY_FRAME[rarity]
                  .replace('linear-gradient(135deg, ', '')
                  .split(',')[0]}, transparent 70%)`,
          }}
        >
          {!imageUrl && (
            <svg
              width="60%"
              viewBox="0 0 100 100"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.85"
              role="img"
              aria-label={`${name} card art`}
            >
              <title>{`${name} card art`}</title>
              <circle cx="50" cy="50" r="32" />
              <polygon points="50,18 82,82 18,82" />
            </svg>
          )}
        </div>
        <div className="px-2 py-1.5 border-t border-[var(--arcade-border)]">
          <div className="font-display text-[11px] font-extrabold text-[var(--arcade-text)] truncate">{name}</div>
          {setName && (
            <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--arcade-text-muted)] truncate">
              {setName}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
