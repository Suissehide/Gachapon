import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import React from 'react'

import { cn } from '../../libs/utils.ts'
import { type ButtonProps, buttonVariants } from './button.tsx'

const Sheet = Dialog.Root

const sheetVariants = cva(
  'fixed z-100 bg-card border-border shadow-2xl shadow-black/50 transition ease-in-out focus:outline-none focus:ring-0 focus-visible:outline-none ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-250 data-[state=open]:duration-350',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-[440px] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full w-[440px] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

interface SheetTriggerProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Trigger>,
    ButtonProps {}

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Content>,
    VariantProps<typeof sheetVariants> {
  hasOverlay?: boolean
}

const SheetTrigger = React.forwardRef<
  React.ComponentRef<typeof Dialog.Trigger>,
  SheetTriggerProps
>(({ className, variant, size, ...props }, ref) => (
  <Dialog.Trigger
    ref={ref}
    className={cn(buttonVariants({ variant, size, className }))}
    {...props}
  />
))
SheetTrigger.displayName = Dialog.Trigger.displayName

const SheetClose = Dialog.Close
const SheetPortal = Dialog.Portal

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = Dialog.Overlay.displayName

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof Dialog.Content>,
  SheetContentProps
>(
  (
    { side = 'right', className, children, hasOverlay = true, ...props },
    ref,
  ) => (
    <SheetPortal>
      {hasOverlay && <SheetOverlay />}
      <SheetDescription />
      <Dialog.Content
        ref={ref}
        className={cn(sheetVariants({ side }), 'flex flex-col overflow-hidden', className)}
        {...props}
      >
        {/* Amber accent line */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent" />

        {children}

        <SheetClose className="absolute right-4 top-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-muted/50 text-text-light opacity-80 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:opacity-100 focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </SheetClose>
      </Dialog.Content>
    </SheetPortal>
  ),
)
SheetContent.displayName = Dialog.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col gap-1.5 border-b border-border/60 px-6 py-5 pr-12',
      className,
    )}
    {...props}
  />
)
SheetHeader.displayName = 'SheetHeader'

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, children, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('text-sm', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('font-display text-base font-bold text-text', className)}
    {...props}
  />
))
SheetTitle.displayName = Dialog.Title.displayName

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
