// Round medal disk for top 3 (gold/silver/bronze), simple mono chip otherwise.
type Props = { rank: number; size?: number }

const PALETTE: Record<1 | 2 | 3, { a: string; b: string; c: string; txt: string }> = {
  1: { a: '#fde68a', b: '#f59e0b', c: '#b45309', txt: '#5a2e02' },
  2: { a: '#f1f5f9', b: '#cbd5e1', c: '#94a3b8', txt: '#334155' },
  3: { a: '#fed7aa', b: '#fb923c', c: '#c2410c', txt: '#7c2d12' },
}

const ARIA = (rank: number) =>
  rank === 1 ? '1ère place' : rank <= 3 ? `${rank}e place` : `Rang ${rank}`

export function MedalRank({ rank, size = 40 }: Props) {
  if (rank <= 3) {
    const p = PALETTE[rank as 1 | 2 | 3]
    return (
      <div
        aria-label={ARIA(rank)}
        role="img"
        className="relative flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 32% 28%, ${p.a}, ${p.b} 58%, ${p.c} 100%)`,
          boxShadow: `inset 0 0 0 2px rgba(255,255,255,.45), 0 4px 12px -2px ${p.b}99`,
        }}
      >
        <span
          className="relative z-10 font-display text-[18px] font-extrabold"
          style={{ color: p.txt }}
        >
          {rank}
        </span>
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,.5) 0%, transparent 45%)',
          }}
        />
      </div>
    )
  }
  return (
    <div
      aria-label={ARIA(rank)}
      role="img"
      className="flex shrink-0 items-center justify-center rounded-[12px] border border-[rgba(27,23,38,0.08)] bg-[#fafaf7] font-mono text-[14px] font-bold text-[rgba(27,23,38,0.6)]"
      style={{ width: size, height: size }}
    >
      {rank}
    </div>
  )
}
