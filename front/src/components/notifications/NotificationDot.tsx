// NotificationDot — pastille rouge partagée par les badges de la topbar
// (cloches d'invitations, cadeaux de récompenses). Centralisée pour garantir
// taille, position et couleur strictement identiques entre les deux.
// `className` permet un léger réglage de position par appelant (cn/twMerge).

import { cn } from '../../libs/utils.ts'

type Props = { count: number; className?: string }

export function NotificationDot({ count, className }: Props) {
  if (count <= 0) {
    return null
  }
  const display = count > 9 ? '9+' : String(count)
  return (
    <span
      className={cn(
        'pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(239,68,68,0.35)] ring-2 ring-background',
        className,
      )}
      role="img"
      aria-label={`${count} en attente`}
    >
      {display}
    </span>
  )
}
