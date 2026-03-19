import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import React from 'react'

import { cn } from '../../libs/utils.ts'
import { type ButtonProps, buttonVariants } from './button.tsx'

const popupVariants = cva(
  'fixed z-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ' +
    'bg-card border border-primary/20 rounded-xl shadow-[0_0_60px_rgba(245,158,11,0.08),0_24px_48px_rgba(0,0,0,0.4)] ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 ' +
    'data-[state=open]:slide-in-from-top-3 data-[state=closed]:slide-out-to-top-2 ' +
    'duration-200',
  {
    variants: {
      size: {
        default: 'w-[440px] max-w-[calc(100vw-2rem)]',
        lg: 'w-[600px] max-w-[calc(100vw-2rem)]',
        xl: 'w-[80vw] max-w-[900px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

interface PopupTriggerProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Trigger>,
    ButtonProps {}

interface PopupContentProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Content>,
    VariantProps<typeof popupVariants> {}

interface PopupTitleProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Title> {
  icon?: React.ReactNode
}

const Popup = Dialog.Root
const PopupClose = Dialog.Close
const PopupPortal = Dialog.Portal

const PopupContent = React.forwardRef<
  React.ComponentRef<typeof Dialog.Content>,
  PopupContentProps
>(({ className, size, children, ...props }, ref) => (
  <PopupPortal>
    <PopupOverlay />
    <PopupDescription />
    <Dialog.Content
      ref={ref}
      className={cn(popupVariants({ size }), className)}
      {...props}
    >
      {children}
      <PopupClose className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-text-light ring-offset-background transition-all duration-200 hover:bg-primary/10 hover:text-primary focus:outline-none disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Fermer</span>
      </PopupClose>
    </Dialog.Content>
  </PopupPortal>
))
PopupContent.displayName = Dialog.Content.displayName

const PopupOverlay = React.forwardRef<
  React.ComponentRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
      className,
    )}
    {...props}
    ref={ref}
  />
))
PopupOverlay.displayName = Dialog.Overlay.displayName

const PopupTrigger = React.forwardRef<
  React.ComponentRef<typeof Dialog.Trigger>,
  PopupTriggerProps
>(({ className, variant, size, ...props }, ref) => (
  <Dialog.Trigger
    ref={ref}
    className={cn(buttonVariants({ variant, size, className }))}
    {...props}
  />
))
PopupTrigger.displayName = Dialog.Trigger.displayName

const PopupHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 pt-6 pb-4 border-b border-border/60', className)}
    {...props}
  />
))
PopupHeader.displayName = 'PopupHeader'

const PopupTitle = React.forwardRef<
  React.ComponentRef<typeof Dialog.Title>,
  PopupTitleProps
>(({ className, children, icon, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn(
      'flex items-center gap-3 text-base font-semibold text-text m-0',
      className,
    )}
    {...props}
  >
    {icon && (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/25 text-primary">
        {icon}
      </span>
    )}
    {children}
  </Dialog.Title>
))
PopupTitle.displayName = 'PopupTitle'

const PopupDescription = React.forwardRef<
  React.ComponentRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('sr-only', className)}
    {...props}
  />
))
PopupDescription.displayName = 'PopupDescription'

const PopupBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
))
PopupBody.displayName = 'PopupBody'

const PopupFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex justify-end gap-2 px-6 py-4 border-t border-border/60',
      className,
    )}
    {...props}
  />
))
PopupFooter.displayName = 'PopupFooter'

export {
  Popup,
  PopupHeader,
  PopupFooter,
  PopupTitle,
  PopupDescription,
  PopupContent,
  PopupBody,
  PopupTrigger,
}
