import { Lock } from 'lucide-react'

export function HiddenAchievementCard() {
  return (
    <div
      className="flex flex-col rounded-2xl border border-dashed p-[18px]"
      style={{
        background: '#fafaf7',
        borderColor: 'rgba(27,23,38,.12)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border"
          style={{
            background: '#f1efe9',
            color: 'rgba(27,23,38,.4)',
            borderColor: 'rgba(27,23,38,.05)',
          }}
        >
          <Lock className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 pt-px">
          <div
            className="font-display text-[15px] font-bold leading-tight"
            style={{ color: 'rgba(27,23,38,.45)' }}
          >
            ???
          </div>
          <div
            className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em]"
            style={{ color: 'rgba(27,23,38,.45)' }}
          >
            Succès caché
          </div>
        </div>

        <div
          className="shrink-0 font-display text-[30px] font-extrabold leading-none"
          style={{ color: 'rgba(27,23,38,.18)' }}
        >
          ???
        </div>
      </div>

      <p
        className="mt-3.5 text-[13px] leading-[1.45] [min-height:38px]"
        style={{ color: 'rgba(27,23,38,.45)' }}
      >
        Débloque pour révéler la description et les récompenses.
      </p>
    </div>
  )
}
