type Props = { level: number }

const MAX_LEVEL = 100

export function LevelChip({ level }: Props) {
  const isMax = level >= MAX_LEVEL
  if (isMax) {
    return (
      <span
        className="inline-flex items-center whitespace-nowrap rounded-full border border-[#f59e0b] px-[9px] py-[3px] font-mono text-[10px] font-bold tracking-[0.1em] text-[#6b3a00]"
        style={{
          background: 'linear-gradient(135deg, #fde68a, #fbbf24)',
          boxShadow: '0 2px 6px rgba(245,158,11,.22)',
        }}
      >
        NIV. MAX
      </span>
    )
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[rgba(27,23,38,0.08)] bg-[#fafaf7] px-[9px] py-[3px] font-mono text-[10px] font-bold tracking-[0.1em] text-[rgba(27,23,38,0.6)]">
      NIV. {level}
    </span>
  )
}
