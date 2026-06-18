import { HelpCircle } from 'lucide-react'

export function HiddenAchievementCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/30 p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted/40">
        <HelpCircle className="h-4 w-4 text-text-light/40" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm font-bold text-text-light">???</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-text-light/60">
          Succès caché
        </div>
      </div>
    </div>
  )
}
