import { Switch as RadixUiSwitch } from 'radix-ui'
import React from 'react'

import { cn } from '../../libs/utils.ts'

const Switch = React.forwardRef<
  React.ComponentRef<typeof RadixUiSwitch.Root>,
  React.ComponentPropsWithoutRef<typeof RadixUiSwitch.Root>
>(({ className, ...props }, ref) => (
  <RadixUiSwitch.Root
    ref={ref}
    className={cn(
      // Base track
      'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border/80 transition-all duration-300',
      // Focus
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      // Disabled
      'disabled:cursor-not-allowed disabled:opacity-40',
      // Unchecked: dark inset track
      'data-[state=unchecked]:bg-muted data-[state=unchecked]:shadow-inner',
      // Checked: amber track with glow
      'data-[state=checked]:border-primary/60 data-[state=checked]:bg-primary/20 data-[state=checked]:shadow-[0_0_12px_rgba(245,158,11,0.25),inset_0_0_8px_rgba(245,158,11,0.08)]',
      className,
    )}
    {...props}
  >
    <RadixUiSwitch.Thumb
      className={cn(
        // Base thumb
        'pointer-events-none block h-4 w-4 rounded-full shadow-sm ring-0 transition-all duration-300',
        // Unchecked: subtle neutral thumb
        'data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:scale-95 data-[state=unchecked]:bg-text-light',
        // Checked: amber thumb with inner glow
        'data-[state=checked]:translate-x-[1.375rem] data-[state=checked]:scale-100 data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      )}
    />
  </RadixUiSwitch.Root>
))
Switch.displayName = RadixUiSwitch.Root.displayName

export { Switch }
