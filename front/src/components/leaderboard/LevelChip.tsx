import { DEFAULT_ECONOMY, useEconomyConfig } from '../../queries/useEconomyConfig'

type Props = { level: number }

export function LevelChip({ level }: Props) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const isMax = level >= economy.xp.levelCap
  if (isMax) {
    return (
      <span
        className="inline-flex w-fit items-center self-start whitespace-nowrap rounded-full border border-[#f59e0b] px-[7px] py-[1px] font-mono text-[9px] font-bold tracking-[0.1em] text-[#6b3a00]"
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
    <span className="inline-flex w-fit items-center self-start whitespace-nowrap rounded-full border border-[rgba(27,23,38,0.08)] bg-[#fafaf7] px-[7px] py-[1px] font-mono text-[9px] font-bold tracking-[0.1em] text-[rgba(27,23,38,0.6)]">
      NIV. {level}
    </span>
  )
}
