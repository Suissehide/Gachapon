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

export function OAuthButtons({ action }: { action: 'login' | 'register' }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const setDialogOpen = useAuthDialogStore((s) => s.setOpen)

  const openOAuthPopup = (provider: 'google' | 'discord') => {
    const authorizeUrl = `${apiUrl}/auth/oauth/${provider}/authorize?mode=${action}`
    const popup = window.open(
      authorizeUrl,
      `${provider}-oauth`,
      'width=500,height=700,left=200,top=100',
    )
    if (!popup) {
      // Popup blocked (common on mobile) — fall back to full redirect
      window.location.href = authorizeUrl
      return
    }
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      if ((event.data as { type?: string })?.type === 'oauth-success') {
        window.removeEventListener('message', listener)
        popup.close()
        setDialogOpen(false)
        fetchMe().then(() => void navigate({ to: '/play' }))
      }
    }
    window.addEventListener('message', listener)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => openOAuthPopup('google')}
        className="rounded-xl px-4 h-auto py-2.5 gap-2.5 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
      >
        <GoogleIcon />
        {action === 'login'
          ? t('oauth.loginGoogle')
          : t('oauth.registerGoogle')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => openOAuthPopup('discord')}
        className="rounded-xl px-4 h-auto py-2.5 gap-2.5 bg-[#5865F2] text-white hover:bg-[#4752C4]"
      >
        <DiscordIcon />
        {action === 'login'
          ? t('oauth.loginDiscord')
          : t('oauth.registerDiscord')}
      </Button>
    </div>
  )
}
