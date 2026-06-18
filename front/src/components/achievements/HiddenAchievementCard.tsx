import { HelpCircle } from 'lucide-react'

export function HiddenAchievementCard() {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.015)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px]"
          style={{
            background: 'var(--muted)',
            color: 'var(--text-light)',
          }}
        >
          <HelpCircle className="h-5 w-5 opacity-60" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-text-light">???</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light/60">
            Succès caché
          </div>
        </div>

        <div className="font-display text-[18px] font-extrabold leading-none text-text-light/40">
          ???
        </div>
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-text-light/50">
        Débloque pour révéler
      </p>
    </div>
  )
}
