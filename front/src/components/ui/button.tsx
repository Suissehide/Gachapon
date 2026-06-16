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
        pill:
          'bg-card border border-border font-mono font-semibold shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)] hover:-translate-y-px hover:border-border-dark transition-transform',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-6 w-6 p-1 rounded-lg',
        pill: 'h-8 px-3 rounded-full text-[13px]',
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
