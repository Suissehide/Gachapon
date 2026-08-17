import '@scalar/api-reference-react/style.css'
import { ApiReferenceReact } from '@scalar/api-reference-react'
import { createFileRoute } from '@tanstack/react-router'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { apiUrl } from '../constants/config.constant'

export const Route = createFileRoute('/api-docs')({
  component: ApiDocsPage,
})

function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead path="/api-docs" />
      <LandingNavbar />
      <div
        style={
          { '--scalar-custom-header-height': '64px' } as React.CSSProperties
        }
      >
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
