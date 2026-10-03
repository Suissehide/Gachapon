// NotificationBadge — pastille de notification partagée par la topbar
// (handoff `design_handoff_topbar_notifications`). Trois formes :
//   - `dot`    : point 8x8 dans le flux, après le libellé d'un groupe de nav.
//   - `pill`   : compteur plein, aligné à droite d'un élément de sous-menu.
//   - `anchored` : compteur ancré dans l'angle d'un bouton icône (cloche,
//     cadeau), à cheval sur l'angle pour ne pas masquer l'icône.
// Deux teintes : `alert` (rouge, à traiter) et `gain` (ambre, à récupérer).
// Remplace l'ancien `NotificationDot`, qui ne couvrait qu'un seul variant
// (point flottant hors flux) pour les quatre call sites de la topbar.

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../libs/utils.ts'

const badgeVariants = cva(
  'pointer-events-none inline-flex shrink-0 items-center justify-center font-extrabold text-white tabular-nums',
  {
    variants: {
      shape: {
        dot: 'h-2 w-2 rounded-full ring-2 ring-background',
        pill: 'h-[22px] min-w-[22px] rounded-full px-[7px] text-xs leading-none',
        anchored:
          'absolute -top-1 -right-1 h-[18px] min-w-[18px] rounded-full px-[5px] text-[11px] leading-none ring-2 ring-background',
      },
      tone: {
        alert: 'bg-badge-alert',
        gain: 'bg-badge-gain',
      },
    },
  },
)

/** Plafond d'affichage des compteurs (pill / anchored) : au-delà, "9+". */
const COUNT_CAP = 9

type Props = VariantProps<typeof badgeVariants> & {
  /** Ignoré par `dot` (jamais de chiffre) ; masque pill/anchored si <= 0. */
  count?: number
  /** Accessible uniquement sur `pill` (role="img") — `dot`/`anchored` restent
      `aria-hidden` : leur information vit dans le `aria-label` du conteneur
      (trigger de groupe, bouton cloche/cadeau). */
  ariaLabel?: string
  className?: string
}

export function NotificationBadge({
  shape = 'dot',
  tone = 'alert',
  count = 0,
  ariaLabel,
  className,
}: Props) {
  if (shape !== 'dot' && count <= 0) {
    return null
  }
  const isPill = shape === 'pill'
  return (
    <span
      role="img"
      aria-hidden={isPill ? undefined : true}
      aria-label={isPill ? ariaLabel : undefined}
      className={cn(badgeVariants({ shape, tone }), className)}
    >
      {shape === 'dot' ? null : count > COUNT_CAP ? `${COUNT_CAP}+` : count}
    </span>
  )
}
