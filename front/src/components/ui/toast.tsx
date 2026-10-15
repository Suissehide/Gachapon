import { Cross2Icon } from '@radix-ui/react-icons'
import { cva, type VariantProps } from 'class-variance-authority'
import { Toast as ToastPrimitives } from 'radix-ui'
import React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '../../libs/utils.ts'
import { buttonVariants } from './button.tsx'

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return createPortal(
    <ToastPrimitives.Provider>{children}</ToastPrimitives.Provider>,
    document.body,
  )
}

const ToastViewport = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[9999] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastClassName =
  'group relative mt-3 flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3.5 pr-11 text-text shadow-[var(--shadow-toast)] transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full'

// La sévérité ne se lit que sur la tuile : la surface reste celle d'une
// carte du site, quelle que soit la variante.
const toastIconVariants = cva(
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary-dark',
        destructive: 'bg-destructive/12 text-danger-ink',
        warning: 'bg-warning/15 text-warning',
        info: 'bg-info/12 text-info',
        success: 'bg-success/12 text-success-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Toast = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastClassName, className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastIcon = ({
  className,
  children,
  variant,
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof toastIconVariants>) => (
  <div className={cn(toastIconVariants({ variant }), className)}>
    {children}
  </div>
)

const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      buttonVariants({ size: 'sm' }),
      'shrink-0 self-center rounded-full px-3.5',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute top-2.5 right-2.5 cursor-pointer rounded-lg p-1 text-text-light transition-colors hover:bg-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    toast-close=""
    {...props}
  >
    <Cross2Icon className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      'font-display text-sm leading-snug font-bold tracking-tight',
      className,
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('mt-0.5 text-[13px] leading-snug text-text-light', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
}
