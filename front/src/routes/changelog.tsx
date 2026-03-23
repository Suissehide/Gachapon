import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import type { AuthTab } from '../components/auth/index.ts'
import { AuthDialog } from '../components/auth/index.ts'
import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<AuthTab>('login')

  const openLogin = () => {
    setDefaultTab('login')
    setDialogOpen(true)
  }
  const openRegister = () => {
    setDefaultTab('register')
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar onOpenLogin={openLogin} onOpenRegister={openRegister} />
      <AuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTab={defaultTab}
      />
      <main className="pt-32 pb-16 px-6 lg:px-10 max-w-4xl mx-auto">
        <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
          Mises à jour
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-6">Changelog</h1>
        <p className="text-text-light text-base leading-relaxed">
          Historique des versions à venir.
        </p>
      </main>
    </div>
  )
}
