import { cva, type VariantProps } from 'class-variance-authority'
import type React from 'react'

import { cn } from '../../libs/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-border text-text-light',
        primary: 'bg-primary/15 text-primary',
        success: 'bg-success/12 text-success',
        danger: 'bg-destructive/12 text-destructive',
        warning: 'bg-warning/12 text-warning',
        info: 'bg-info/12 text-info',
        common: 'bg-rarity-common/15 text-rarity-common',
        uncommon: 'bg-rarity-uncommon/15 text-rarity-uncommon',
        rare: 'bg-rarity-rare/15 text-rarity-rare',
        epic: 'bg-rarity-epic/15 text-rarity-epic',
        legendary: 'bg-rarity-legendary/15 text-rarity-legendary',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-px text-[11px]',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'default' },
  },
)

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>['variant']
>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { badgeVariants }
