type Props = {
  wasDuplicate: boolean
}

export function NewDupChip({ wasDuplicate }: Props) {
  const label = wasDuplicate ? 'DOUBLON' : 'NOUVEAU'
  const cls = wasDuplicate
    ? 'bg-amber-500/90 text-white'
    : 'bg-emerald-500/90 text-white'
  return (
    <span
      className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-lg ${cls}`}
    >
      {label}
    </span>
  )
}
