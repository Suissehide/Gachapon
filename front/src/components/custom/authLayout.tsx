import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-15%] h-[550px] w-[550px] rounded-full bg-primary/9 blur-[140px]" />
        <div className="absolute right-[-15%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-secondary/8 blur-[120px]" />
        <div className="absolute left-[40%] top-[50%] h-[300px] w-[300px] rounded-full bg-accent/5 blur-[90px]" />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <Link to="/">
          <span className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Gachapon
          </span>
        </Link>
      </div>

      {children}
    </div>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <Card className="relative z-10 w-full max-w-[420px] bg-card/70 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/40 p-8 animate-in fade-in-0 slide-in-from-bottom-6 duration-500 fill-mode-both">
      {children}
    </Card>
  )
}

export function OAuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-light font-medium">ou continuer avec</span>
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
