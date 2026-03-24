import type { SizePreset } from './config.ts'

// Reads CSS vars set by TcgCardFace:
//   --tcg-name-bg  --tcg-sep  --tcg-accent  --tcg-name-c  --tcg-set-c

type Props = {
  name: string
  setName: string
  isOwned: boolean
  sz: SizePreset
}

export function NamePlate({ name, setName, isOwned, sz }: Props) {
  return (
    <div
      className={`relative shrink-0 [background:var(--tcg-name-bg)] ${sz.namepadX} ${sz.namepadY}`}
    >
      {/* Top shimmer accent line */}
      <div className="absolute inset-x-6 top-0 h-px [background:linear-gradient(90deg,transparent,var(--tcg-accent),transparent)] opacity-60" />

      {/* Card name */}
      <h2
        className={`m-0 text-center font-black leading-tight [font-family:Nunito,system-ui] tracking-tight ${sz.nameFontSize} ${isOwned ? 'text-[color:var(--tcg-name-c)]' : 'text-[#9ca3af]'}`}
      >
        {isOwned ? name : '???'}
      </h2>

      {/* Set name flanked by decorative lines */}
      <div className="mt-0.5 flex items-center gap-1">
        <div className="h-px flex-1 [background:linear-gradient(90deg,transparent,var(--tcg-sep))]" />
        <p
          className={`shrink-0 italic tracking-[0.06em] ${sz.setFontSize} ${isOwned ? 'text-[color:var(--tcg-set-c)]' : 'text-[#d1d5db]'}`}
        >
          {isOwned ? setName : '·····'}
        </p>
        <div className="h-px flex-1 [background:linear-gradient(270deg,transparent,var(--tcg-sep))]" />
      </div>

      {/* Bottom separator */}
      <div className="absolute inset-x-0 bottom-0 h-px [background:linear-gradient(90deg,transparent,var(--tcg-sep),var(--tcg-sep),transparent)]" />
    </div>
  )
}
