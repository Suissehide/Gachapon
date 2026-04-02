import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/oauth-callback')({
  component: OAuthCallbackPage,
})

function OAuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth_success' }, window.location.origin)
      window.close()
    } else {
      void navigate({ to: '/play', replace: true })
    }
  }, [navigate])

  return null
}
