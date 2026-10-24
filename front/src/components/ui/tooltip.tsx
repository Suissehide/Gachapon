import { Tooltip as RadixTooltip } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'

/**
 * Infobulle au survol (et au focus clavier), plus réactive que l'attribut
 * `title` natif. Sans `content`, l'enfant est rendu seul.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 150,
  className,
}: {
  content: ReactNode
  /** Un seul élément, qui reçoit les props du déclencheur (asChild). */
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  className?: string
}) {
  if (!content) {
    return children
  }
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            collisionPadding={16}
            className={cn(
              'z-100 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text shadow-lg',
              'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
              className,
            )}
          >
            {content}
            <RadixTooltip.Arrow
              className="fill-background drop-shadow-[0_1px_0_var(--border)]"
              width={10}
              height={5}
            />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
