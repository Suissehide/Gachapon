import type { ReactNode } from 'react'

import { useNavigate } from '@tanstack/react-router'
import DiscordIcon from '../../assets/icons/discord.svg?react'
import GoogleIcon from '../../assets/icons/google.svg?react'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/button.tsx'

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
  const navigate = useNavigate()
  const fetchMe = useAuthStore((s) => s.fetchMe)

  const handleDiscordClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const popup = window.open(
      '/auth/oauth/discord/authorize',
      'discord-oauth',
      'width=500,height=700,left=200,top=100',
    )
    if (!popup) {
      // Popup blocked (common on mobile) — fall back to full redirect
      window.location.href = '/auth/oauth/discord/authorize'
      return
    }
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if ((event.data as { type?: string })?.type === 'oauth-success') {
        window.removeEventListener('message', listener)
        popup.close()
        fetchMe().then(() => void navigate({ to: '/play' }))
      }
    }
    window.addEventListener('message', listener)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <OAuthButton
        href="/auth/oauth/google/authorize"
        icon={<GoogleIcon />}
        label={`${prefix} avec Google`}
        className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
      />
      <Button
        variant="ghost"
        onClick={handleDiscordClick}
        className="rounded-xl px-4 h-auto py-2.5 gap-2.5 bg-[#5865F2] text-white hover:bg-[#4752C4]"
      >
        <DiscordIcon />
        {`${prefix} avec Discord`}
      </Button>
    </div>
  )
}
