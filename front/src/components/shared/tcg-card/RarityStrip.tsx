import type { RarityConfig, SizePreset } from './config.ts'

// Reads CSS vars set by TcgCardFace: --tcg-strip-bg, --tcg-sep, --tcg-label-c

type Props = {
  config: RarityConfig
  isOwned: boolean
  sz: SizePreset
}

export function RarityStrip({ config, isOwned, sz }: Props) {
  const shimmer = isOwned && config.shimmer
  return (
    <div
      className={`shrink-0 flex items-center gap-2 [background:var(--tcg-strip-bg)] border-t border-t-[color:var(--tcg-sep)] ${sz.raritypadX} ${sz.raritypadY}`}
    >
      <div className="h-px flex-1 [background:linear-gradient(90deg,transparent,var(--tcg-sep))]" />
      <span
        className={`font-bold tracking-[0.12em] uppercase whitespace-nowrap ${sz.rarityFontSize} ${shimmer ? 'legendary-text' : 'text-[color:var(--tcg-label-c)]'}`}
      >
        {isOwned ? config.label : '·····'}
      </span>
      <div className="h-px flex-1 [background:linear-gradient(270deg,transparent,var(--tcg-sep))]" />
    </div>
  )
}
