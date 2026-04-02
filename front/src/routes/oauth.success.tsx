import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/oauth/success')({
  component: OAuthSuccessPage,
})

function OAuthSuccessPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'oauth-success' },
        window.location.origin,
      )
      window.close()
    } else {
      void navigate({ to: '/play' })
    }
  }, [navigate])

  return null
}
