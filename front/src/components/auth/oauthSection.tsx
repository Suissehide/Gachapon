import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import DiscordIcon from '../../assets/icons/discord.svg?react'
import GoogleIcon from '../../assets/icons/google.svg?react'
import { apiUrl } from '../../constants/config.constant.ts'
import { useAuthStore } from '../../stores/auth.store'
import { useAuthDialogStore } from '../../stores/authDialog.store'
import { Button } from '../ui/button.tsx'

export function OAuthDivider() {
  const { t } = useTranslation('auth')
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-light font-medium">
        {t('oauth.divider')}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

type OAuthLinkResult = 'linked' | 'account_exists' | 'email_unverified'

export function OAuthButtons({
  action,
  onLinked,
}: {
  action: 'login' | 'register' | 'link'
  /** Requis pour `action === 'link'` : appelé une fois la liaison résolue. */
  onLinked?: (result: OAuthLinkResult) => void
}) {
  const { t } = useTranslation(['auth', 'guest'])
  const navigate = useNavigate()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const setDialogOpen = useAuthDialogStore((s) => s.setOpen)

  const handleLinkError = (reason?: string) => {
    onLinked?.(
      reason === 'email_unverified' ? 'email_unverified' : 'account_exists',
    )
  }

  const handleOAuthSuccess = () => {
    setDialogOpen(false)
    if (action === 'link') {
      void fetchMe().then(() => onLinked?.('linked'))
      return
    }
    fetchMe().then(() => void navigate({ to: '/play' }))
  }

  const openOAuthPopup = async (provider: 'google' | 'discord') => {
    const authorizeUrl = `${apiUrl}/auth/oauth/${provider}/authorize?mode=${action}`
    // En mode `link`, l'autorisation exige une session invité valide : on
    // ouvre la popup vide tout de suite (les bloqueurs de popup refusent un
    // `window.open` déclenché après un `await`), puis on rafraîchit un
    // éventuel access token expiré avant de la rediriger vers le back.
    const popup = window.open(
      action === 'link' ? 'about:blank' : authorizeUrl,
      `${provider}-oauth`,
      'width=500,height=700,left=200,top=100',
    )
    if (!popup) {
      // Popup blocked (common on mobile) — fall back to full redirect
      window.location.href = authorizeUrl
      return
    }
    if (action === 'link') {
      await fetchMe()
      // L'utilisateur a pu fermer la popup pendant le `await` ci-dessus.
      if (!popup.closed) {
        popup.location.href = authorizeUrl
      }
    }
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      const data = event.data as {
        type?: string
        linked?: boolean
        reason?: string
      }
      if (data?.type !== 'oauth-link-error' && data?.type !== 'oauth-success') {
        return
      }
      window.removeEventListener('message', listener)
      popup.close()
      if (data.type === 'oauth-link-error') {
        handleLinkError(data.reason)
      } else {
        handleOAuthSuccess()
      }
    }
    window.addEventListener('message', listener)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => void openOAuthPopup('google')}
        className="rounded-xl px-4 h-auto py-2.5 gap-2.5 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
      >
        <GoogleIcon />
        {action === 'link'
          ? t('guest:link.google')
          : action === 'login'
            ? t('oauth.loginGoogle')
            : t('oauth.registerGoogle')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => void openOAuthPopup('discord')}
        className="rounded-xl px-4 h-auto py-2.5 gap-2.5 bg-[#5865F2] text-white hover:bg-[#4752C4]"
      >
        <DiscordIcon />
        {action === 'link'
          ? t('guest:link.discord')
          : action === 'login'
            ? t('oauth.loginDiscord')
            : t('oauth.registerDiscord')}
      </Button>
    </div>
  )
}
