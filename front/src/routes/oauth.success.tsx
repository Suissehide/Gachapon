import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/oauth/success')({
  component: OAuthSuccessPage,
})

function OAuthSuccessPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linkError = params.get('link_error')
    const linked = params.get('linked') === '1'
    if (window.opener) {
      window.opener.postMessage(
        linkError
          ? { type: 'oauth-link-error', reason: linkError }
          : { type: 'oauth-success', linked },
        window.location.origin,
      )
      window.close()
    } else {
      void navigate({
        to: linkError || linked ? '/settings' : '/play',
        search: linkError ? { link_error: linkError } : {},
      })
    }
  }, [navigate])

  return null
}
