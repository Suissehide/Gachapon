import type { RarityConfig, SizePreset } from './config.ts'

// Reads CSS vars set by TcgCardFace: --tcg-strip-bg  --tcg-sep  --tcg-label-c  --tcg-accent

type Props = {
  config: RarityConfig
  isOwned: boolean
  sz: SizePreset
}

export function RarityStrip({ config, isOwned, sz }: Props) {
  const shimmer = isOwned && config.shimmer
  const labelColor = shimmer
    ? undefined
    : isOwned
      ? config.labelColor
      : '#9ca3af'
  const gemColor = isOwned ? config.accentColor : '#d1d5db'

  return (
    <div
      className={`relative shrink-0 flex items-center gap-1.5 [background:var(--tcg-strip-bg)] ${sz.raritypadX} ${sz.raritypadY}`}
    >
      {/* Top border line */}
      <div className="absolute inset-x-0 top-0 h-px [background:linear-gradient(90deg,transparent,var(--tcg-sep),var(--tcg-sep),transparent)]" />

      {/* Left ornament line */}
      <div className="h-px flex-1 [background:linear-gradient(90deg,transparent,var(--tcg-sep))]" />

      {/* Gem symbols */}
      <span
        className={`shrink-0 tracking-[0.2em] ${sz.gemFontSize}`}
        style={{ color: gemColor }}
      >
        {isOwned ? config.gemLabel : '·'}
      </span>

      {/* Rarity label */}
      <span
        className={`shrink-0 font-bold tracking-[0.14em] uppercase whitespace-nowrap ${sz.rarityFontSize} ${shimmer ? 'legendary-text' : ''}`}
        style={labelColor ? { color: labelColor } : undefined}
      >
        {isOwned ? config.label : '·····'}
      </span>

      {/* Right gem symbols (mirrored) */}
      <span
        className={`shrink-0 tracking-[0.2em] ${sz.gemFontSize}`}
        style={{ color: gemColor }}
      >
        {isOwned ? config.gemLabel : '·'}
      </span>

      {/* Right ornament line */}
      <div className="h-px flex-1 [background:linear-gradient(270deg,transparent,var(--tcg-sep))]" />
    </div>
  )
}
