import { Coins, Sparkles, Star, X } from 'lucide-react'
import type { PullBatchEntry } from '../../../queries/useGacha'
import { Button } from '../../ui/button'

type Props = {
  results: PullBatchEntry[]
  tokensRemaining: number
  xpGained: number
  dustGained: number
  onClose: () => void
  onPullAgain: (count: 1 | 10) => void
}

export function SummaryPanel({
  results,
  tokensRemaining,
  xpGained,
  dustGained,
  onClose,
  onPullAgain,
}: Props) {
  const total = results.length
  const newCards = results.filter((r) => !r.wasDuplicate).length

  return (
    <div className="fixed bottom-8 left-1/2 z-[60] w-full max-w-2xl -translate-x-1/2 animate-[fadeInUp_400ms_ease-out_forwards] px-4">
      <div className="rounded-2xl border border-white/9 bg-[rgba(6,6,12,0.78)] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[20px]">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white/45">
          Bilan du tirage
        </p>

        <div className="grid grid-cols-3 gap-4 border-b border-white/6 pb-4">
          <Kpi
            icon={<Sparkles size={16} />}
            label="Nouvelles"
            value={`${newCards} / ${total}`}
          />
          <Kpi
            icon={<Coins size={16} />}
            label="Poussière"
            value={`+${dustGained}`}
          />
          <Kpi icon={<Star size={16} />} label="XP" value={`+${xpGained}`} />
        </div>

        <p className="mt-3 text-xs text-white/50">
          Jetons restants :{' '}
          <span className="font-bold text-white/90">{tokensRemaining}</span>
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={16} />
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={tokensRemaining < 1}
            onClick={() => onPullAgain(1)}
          >
            Retirer x1 (1 jeton)
          </Button>
          <Button
            className="flex-1"
            disabled={tokensRemaining < 10}
            onClick={() => onPullAgain(10)}
          >
            Retirer x10 (10 jetons)
          </Button>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-white/45">
        {icon}
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <span className="font-display text-lg font-bold text-white/95">
        {value}
      </span>
    </div>
  )
}
