import type { SetProgression } from '../../../api/profile.api'
import { Card, CardTitle } from '../../ui/card'

type Props = { sets: SetProgression[] }

export function SetsProgressionCard({ sets }: Props) {
  const totalOwned = sets.reduce((acc, s) => acc + s.owned, 0)
  const totalCards = sets.reduce((acc, s) => acc + s.total, 0)

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-5">
        <CardTitle className="text-sm uppercase tracking-wider">Progression par extension</CardTitle>
        <span className="font-mono text-[11px] text-text-light">
          {sets.length} SETS · {totalOwned} / {totalCards}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sets.map((s) => (
          <div
            key={s.id}
            className="relative overflow-hidden rounded-xl p-4 border"
            style={{
              background: `hsl(${s.hue}, 100%, 96%)`,
              borderColor: `hsl(${s.hue}, 60%, 85%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] shrink-0 text-white font-display font-extrabold"
                style={{ background: `hsl(${s.hue}, 70%, 50%)` }}
              >
                {s.short}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-text truncate">{s.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">
                  {s.owned} / {s.total} CARTES
                </div>
              </div>
              <div
                className="font-display text-[28px] font-extrabold leading-none"
                style={{ color: `hsl(${s.hue}, 60%, 28%)` }}
              >
                {Math.round(s.percent)}%
              </div>
            </div>
            <div className="mt-4 h-[6px] rounded-full overflow-hidden" style={{ background: `hsl(${s.hue}, 50%, 92%)` }}>
              <div
                className="h-full"
                style={{
                  width: `${s.percent}%`,
                  background: `linear-gradient(90deg, hsl(${s.hue}, 70%, 60%), hsl(${s.hue}, 70%, 45%))`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
