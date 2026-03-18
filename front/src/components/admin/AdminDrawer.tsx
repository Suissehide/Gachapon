import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../ui/button'

type AdminDrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function AdminDrawer({
  open,
  onClose,
  title,
  children,
}: AdminDrawerProps) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  )
}
