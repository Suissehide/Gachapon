import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

export const Route = createFileRoute('/oauth/success')({
  component: OAuthSuccessPage,
})

type OpenerMessage =
  | { type: 'oauth-link-error'; reason: string }
  | { type: 'oauth-error'; reason: string }
  | { type: 'oauth-success'; linked: boolean }

function openerMessage(params: URLSearchParams): OpenerMessage {
  const linkError = params.get('link_error')
  if (linkError) {
    return { type: 'oauth-link-error', reason: linkError }
  }
  const oauthError = params.get('oauth_error')
  if (oauthError) {
    return { type: 'oauth-error', reason: oauthError }
  }
  return { type: 'oauth-success', linked: params.get('linked') === '1' }
}

function OAuthSuccessPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const { toast } = useToast()

  useEffect(() => {
    const message = openerMessage(new URLSearchParams(window.location.search))
    if (window.opener) {
      window.opener.postMessage(message, window.location.origin)
      window.close()
      return
    }
    // Redirection pleine page (popup bloquée) : pas d'opener à prévenir.
    if (message.type === 'oauth-error') {
      toast({
        title: t('oauth.errorTitle'),
        message: t('oauth.emailUnverified'),
        severity: TOAST_SEVERITY.ERROR,
      })
      void navigate({ to: '/' })
      return
    }
    if (message.type === 'oauth-link-error') {
      void navigate({
        to: '/settings',
        search: { link_error: message.reason },
      })
      return
    }
    void navigate({ to: message.linked ? '/settings' : '/play' })
  }, [navigate, t, toast])

  return null
}
