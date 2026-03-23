import '@scalar/api-reference-react/style.css'
import { ApiReferenceReact } from '@scalar/api-reference-react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import type { AuthTab } from '../components/auth/index.ts'
import { AuthDialog } from '../components/auth/index.ts'
import { LandingNavbar } from '../components/custom/landing-navbar'
import { apiUrl } from '../constants/config.constant'

export const Route = createFileRoute('/api-docs')({
  component: ApiDocsPage,
})

function ApiDocsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<AuthTab>('login')

  const openLogin = () => { setDefaultTab('login'); setDialogOpen(true) }
  const openRegister = () => { setDefaultTab('register'); setDialogOpen(true) }

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar onOpenLogin={openLogin} onOpenRegister={openRegister} />
      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultTab={defaultTab} />
      <div style={{ '--scalar-custom-header-height': '64px' } as React.CSSProperties}>
        <ApiReferenceReact
          configuration={{
            url: `${apiUrl}/openapi.json`,
            darkMode: false,
          }}
        />
      </div>
    </div>
  )
}
