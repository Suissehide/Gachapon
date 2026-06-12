import { HelpCircle } from 'lucide-react'

export function HiddenAchievementCard() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card/30 p-3">
      <div className="rounded-full bg-muted/40 p-2">
        <HelpCircle className="h-4 w-4 text-text-light/40" />
      </div>
      <div className="text-sm font-bold text-text-light/60">Succès caché</div>
    </div>
  )
}
