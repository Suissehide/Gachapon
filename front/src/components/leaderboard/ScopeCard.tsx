import { Crown, Layers, Swords, Trophy } from 'lucide-react'

import { cn } from '../../libs/utils'

export type ScopeMode = 'collectors' | 'teams' | 'combat'

type Props = {
  mode: ScopeMode
  active: boolean
  onSelect: () => void
  title: string
  count: number
  countLabel: string
  leaderName: string | null
  leaderMetric: string | null
  mineRank: number | null
  mineSub: string
  mineIsTop?: boolean
  isLoading?: boolean
}

const ICON: Record<ScopeMode, typeof Trophy> = {
  collectors: Trophy,
  teams: Layers,
  combat: Swords,
}

const ordinalFr = (n: number) => (n === 1 ? '1er' : `${n}e`)

export function ScopeCard({
  mode,
  active,
  onSelect,
  title,
  count,
  countLabel,
  leaderName,
  leaderMetric,
  mineRank,
  mineSub,
  mineIsTop,
  isLoading,
}: Props) {
  const Icon = ICON[mode]
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-[20px] border bg-white p-5 pb-[18px] text-left transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-[3px]',
        active
          ? 'border-[#f5b942] shadow-[0_2px_0_rgba(245,158,11,0.12),0_20px_40px_-18px_rgba(245,158,11,0.4)]'
          : 'border-[rgba(27,23,38,0.08)] shadow-[0_2px_0_rgba(27,23,38,0.03),0_12px_28px_-18px_rgba(27,23,38,0.12)]',
        'motion-reduce:transform-none motion-reduce:transition-none',
      )}
    >
      {/* Glow */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-[60px] -right-[60px] h-[180px] w-[180px] rounded-full transition-opacity',
          active ? 'opacity-[0.22]' : 'opacity-0',
        )}
        style={{
          background:
            'radial-gradient(circle, rgba(245,158,11,.5), transparent 70%)',
        }}
      />

      {/* Head */}
      <div className="relative z-10 flex items-center gap-[10px]">
        <span
          className={cn(
            'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border transition-colors',
            active
              ? 'border-transparent bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)]'
              : 'border-[rgba(27,23,38,0.08)] bg-[#fafaf7] text-[rgba(27,23,38,0.5)]',
          )}
        >
          <Icon size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="font-display text-[19px] font-extrabold leading-none tracking-[-0.01em] text-[#1b1726]">
            {title}
          </span>
          <span className="font-mono text-[11px] tracking-[0.04em] text-[rgba(27,23,38,0.5)]">
            <b className="mr-[2px] tabular-nums text-[#1b1726]">{count}</b>
            {countLabel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 grid grid-cols-1 gap-[10px]">
        {/* Leader */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-[10px] gap-y-[8px] rounded-[14px] border border-[rgba(27,23,38,0.06)] bg-[#fafaf7] p-3">
          <span
            className="row-span-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5a2e02] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.5)]"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 60%, #b45309)',
            }}
          >
            <Crown size={13} />
          </span>
          <div className="flex min-w-0 flex-col gap-[1px]">
            <span className="block font-mono text-[9px] tracking-[0.16em] text-[rgba(27,23,38,0.45)]">
              EN TÊTE
            </span>
            <span className="truncate text-[14px] font-bold text-[#1b1726]">
              {isLoading ? '…' : (leaderName ?? '—')}
            </span>
          </div>
          <span className="col-start-2 truncate font-mono text-[10px] tracking-[0.03em] text-[rgba(27,23,38,0.5)]">
            {isLoading ? ' ' : (leaderMetric ?? '')}
          </span>
        </div>

        {/* Mine */}
        <div
          className={cn(
            'flex flex-col justify-center gap-[1px] rounded-[14px] border border-[#fcd34d] p-3',
            mineIsTop
              ? 'bg-[linear-gradient(135deg,#fef3c7,#fff7ed)]'
              : 'bg-[linear-gradient(135deg,#fff7ed,#fffdf9)]',
          )}
        >
          <span className="block font-mono text-[9px] tracking-[0.16em] text-[rgba(27,23,38,0.45)]">
            TA POSITION
          </span>
          <span className="mt-[2px] font-display text-[28px] font-extrabold leading-none tabular-nums text-[#b45309]">
            {isLoading ? '…' : mineRank === null ? '—' : ordinalFr(mineRank)}
          </span>
          <span className="truncate font-mono text-[10px] tracking-[0.02em] text-[rgba(27,23,38,0.55)]">
            {mineSub}
          </span>
        </div>
      </div>

      {/* CTA */}
      <span
        className={cn(
          'relative z-10 font-mono text-[10px] tracking-[0.14em] transition-colors',
          active
            ? 'text-[#d97706]'
            : 'text-[rgba(27,23,38,0.4)] group-hover:text-[rgba(27,23,38,0.7)]',
        )}
      >
        {active ? 'AFFICHÉ' : 'VOIR CE CLASSEMENT ›'}
      </span>
    </button>
  )
}
