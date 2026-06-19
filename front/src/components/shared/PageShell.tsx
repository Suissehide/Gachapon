// PageShell — squelette partagé pour les pages « Arcade clair ».
//
// Apporte le fond crème `#fbf8f3`, la décoration AuroraGrid (halos + grille
// fondue vers le beige) et le conteneur centré standard (max-w-5xl, padding
// horizontal/vertical aligné avec la spec du handoff).
//
// Usage :
//   <PageShell>
//     <PageHeader ... />
//     <Card>...</Card>
//   </PageShell>

import type { ReactNode } from 'react'

import { AuroraGrid } from './decorations/AuroraGrid'

type Props = {
  children: ReactNode
}

export function PageShell({ children }: Props) {
  return (
    <div
      className="relative min-h-[calc(100vh-4rem)]"
      style={{ background: '#fbf8f3', color: '#1b1726' }}
    >
      <AuroraGrid />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-[22px] px-4 py-8">
        {children}
      </div>
    </div>
  )
}
