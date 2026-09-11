import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../libs/utils'

const buttonVariants = cva(
  'inline-flex gap-1.5 items-center justify-center rounded-md text-sm font-semibold cursor-pointer duration-200 transition-all ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/85 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/80',
        outline:
          'border border-border bg-transparent hover:bg-muted hover:text-text',
        secondary: 'bg-muted text-text border border-border hover:bg-border',
        ghost: 'bg-transparent hover:bg-muted hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
        none: 'text-primary bg-transparent border-none shadow-none p-0 hover:bg-primary/10',
        transparent:
          'text-primary bg-transparent border-none shadow-none p-0 focus-visible:ring-0',
        absolute:
          'absolute right-2 text-primary bg-transparent border-none shadow-none p-0 hover:bg-primary/10',
        gradient:
          'text-white font-bold shadow-[0_8px_24px_rgba(236,72,153,0.35)] bg-gradient-to-br from-primary to-secondary hover:brightness-105',
        pill: 'bg-card border border-border font-mono font-semibold shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)] hover:-translate-y-px hover:border-border-dark transition-transform',
        // Emplacement vide / affordance « en attente » — bordure pointillée,
        // encre atténuée, teinte ambrée au survol. Introduit pour le slot
        // libre de « Mes équipes » (docs/design_handoff_equipe/equipe.css,
        // `.tml-slot`) ; générique, réutilisable ailleurs.
        dashed:
          'border-[1.5px] border-dashed border-foreground/16 bg-transparent text-foreground/45 shadow-none hover:border-primary hover:bg-primary/10 hover:text-primary-dark',
        // Action principale d'un panneau — `.tm-btn--amber` du handoff
        // équipe (docs/design_handoff_equipe/equipe.css) : plein ambré,
        // texte gras, halo porté. Distinct de `default`, qui est le bouton
        // ambré courant sans halo ni graisse renforcée.
        // `disabled:shadow-none` fait partie de la variante : un bouton
        // grisé qui rayonne encore ment sur sa disponibilité.
        amber:
          'bg-primary text-primary-foreground font-bold shadow-[0_8px_20px_-6px_rgba(245,158,11,0.6)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-6px_rgba(245,158,11,0.7)] disabled:shadow-none disabled:hover:translate-y-0',
        // Pilule mono discrète — `.dz-locked` / `.dz-mini` du handoff duels
        // (docs/design_handoff_duels/equipe-duels.css). Sert aux actions
        // secondaires d'un panneau (« ANNULER ») et, via `buttonVariants`,
        // aux étiquettes non cliquables qui partagent la même recette.
        // L'intention du handoff est qu'une action impossible ou mineure ne
        // se présente jamais en gros bloc plein.
        mono: 'rounded-full border border-foreground/10 bg-surface-2 font-mono font-bold tracking-[0.1em] text-foreground/45 hover:border-foreground/25 hover:text-text',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-6 w-6 p-1 rounded-lg',
        pill: 'h-8 px-3 rounded-md text-[13px]',
        // Gabarit d'action de panneau — `.tm-btn` : padding 11/18, rayon
        // 12 px (`rounded-lg` sur l'échelle du projet, `rounded-xl` valant
        // 16), 14 px. `h-auto` parce que le padding fait la hauteur, pas
        // une hauteur fixe.
        action: 'h-auto rounded-lg px-[18px] py-[11px] text-sm',
        // Gabarit de la pilule mono : 10 px, padding 8/12, hauteur portée
        // par le padding.
        mono: 'h-auto rounded-full px-3 py-2 text-[10px]',
        // AUCUNE boîte : ni hauteur, ni padding, ni rayon. Pour un
        // déclencheur dont le contenu EST la surface — une vignette de
        // carte, une image. Le reste de la primitive (curseur, focus
        // visible, état désactivé) continue de s'appliquer, ce qui est
        // précisément la raison de passer par `Button` plutôt que par un
        // `<button>` nu.
        bare: 'h-auto p-0 rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
