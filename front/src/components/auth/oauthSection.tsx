import { useNavigate } from '@tanstack/react-router'
import { useCallback, type ReactNode } from 'react'

import DiscordIcon from '../../assets/icons/discord.svg?react'
import GoogleIcon from '../../assets/icons/google.svg?react'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button } from '../ui/button.tsx'

function useDiscordPopup() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const navigate = useNavigate()

  return useCallback(() => {
    const popup = window.open(
      '/auth/oauth/discord/authorize',
      'discord_oauth',
      'width=500,height=700,scrollbars=yes,resizable=yes',
    )

    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'oauth_success') return
      window.removeEventListener('message', handler)
      clearInterval(timer)
      await fetchMe()
      void navigate({ to: '/play' })
    }

    window.addEventListener('message', handler)

    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        window.removeEventListener('message', handler)
      }
    }, 500)
  }, [fetchMe, navigate])
}

export function OAuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-light font-medium">
        ou continuer avec
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export function OAuthButton({
  href,
  icon,
  label,
  className,
}: {
  href: string
  icon: ReactNode
  label: string
  className: string
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className={`rounded-xl px-4 h-auto py-2.5 gap-2.5 ${className}`}
    >
      <a href={href}>
        {icon}
        {label}
      </a>
    </Button>
  )
}

export function OAuthButtons({ action }: { action: 'login' | 'register' }) {
  const prefix = action === 'login' ? 'Continuer' : "S'inscrire"
  const openDiscordPopup = useDiscordPopup()

  return (
    <div className="flex flex-col gap-2.5">
      <OAuthButton
        href="/auth/oauth/google/authorize"
        icon={<GoogleIcon />}
        label={`${prefix} avec Google`}
        className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
      />
      <Button
        type="button"
        onClick={openDiscordPopup}
        variant="ghost"
        className="rounded-xl px-4 h-auto py-2.5 gap-2.5 bg-[#5865F2] text-white hover:bg-[#4752C4]"
      >
        <DiscordIcon />
        {`${prefix} avec Discord`}
      </Button>
    </div>
  )
}
