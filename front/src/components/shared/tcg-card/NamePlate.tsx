import type { SizePreset } from './config.ts'

// Reads CSS vars set by TcgCardFace on the root element:
//   --tcg-name-bg, --tcg-sep, --tcg-accent, --tcg-name-c, --tcg-set-c

type Props = {
  name: string
  setName: string
  isOwned: boolean
  sz: SizePreset
}

export function NamePlate({ name, setName, isOwned, sz }: Props) {
  return (
    <div
      className={`relative shrink-0 [background:var(--tcg-name-bg)] border-b border-b-[color:var(--tcg-sep)] ${sz.namepadX} ${sz.namepadY}`}
    >
      <span
        className={`absolute top-1.5 left-1.5 leading-none text-[color:var(--tcg-accent)] ${sz.diamondFontSize}`}
      >
        ◆
      </span>
      <span
        className={`absolute top-1.5 right-1.5 leading-none text-[color:var(--tcg-accent)] ${sz.diamondFontSize}`}
      >
        ◆
      </span>
      <h2
        className={`m-0 text-center font-black leading-[1.2] [font-family:Nunito,system-ui] tracking-[-0.01em] ${sz.nameFontSize} ${isOwned ? 'text-[color:var(--tcg-name-c)]' : 'text-[#4b5563]'}`}
      >
        {isOwned ? name : '???'}
      </h2>
      <p
        className={`mt-0.5 text-center italic tracking-[0.03em] ${sz.setFontSize} ${isOwned ? 'text-[color:var(--tcg-set-c)]' : 'text-[#374151]'}`}
      >
        {isOwned ? setName : '·····'}
      </p>
    </div>
  )
}
