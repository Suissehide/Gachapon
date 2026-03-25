import { createFileRoute } from '@tanstack/react-router'
import { Sparkles, Star, Trophy, Users, Zap } from 'lucide-react'
import { type ComponentType, useEffect, useRef, useState } from 'react'

import type { AuthTab } from '../components/auth/index.ts'
import { AuthDialog } from '../components/auth/index.ts'
import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { type PublicStats, StatsApi } from '../api/stats.api.ts'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
})

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) {
      return
    }
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  bgColor,
  iconColor,
  delay = 0,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  bgColor: string
  iconColor: string
  delay?: number
}) {
  const [visible, setVisible] = useState(false)
  const count = useCountUp(visible ? value : 0, 1800)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="relative group rounded-2xl border border-border/50 bg-card p-8 overflow-hidden transition-all duration-300 hover:border-border hover:shadow-xl hover:-translate-y-0.5">
      {/* Glow */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${bgColor} blur-3xl`}
        style={{ transform: 'scale(0.8)' }}
      />
      <div className="relative">
        <div
          className={`inline-flex items-center justify-center h-12 w-12 rounded-xl mb-5 ${bgColor}`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <p className="text-4xl font-black tracking-tight text-foreground tabular-nums">
          {count.toLocaleString('fr-FR')}
          {suffix}
        </p>
        <p className="text-sm text-text-light mt-2 font-medium">{label}</p>
      </div>
    </div>
  )
}

function StatsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<AuthTab>('login')
  const [stats, setStats] = useState<PublicStats | null>(null)

  const openLogin = () => {
    setDefaultTab('login')
    setDialogOpen(true)
  }
  const openRegister = () => {
    setDefaultTab('register')
    setDialogOpen(true)
  }

  useEffect(() => {
    StatsApi.getPublicStats().then(setStats)
  }, [])

  const fallback: PublicStats = {
    totalUsers: 0,
    totalPulls: 0,
    totalCards: 0,
    activeUsers: 0,
    legendaryPulls: 0,
  }

  const s = stats ?? fallback

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar onOpenLogin={openLogin} onOpenRegister={openRegister} />
      <AuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTab={defaultTab}
      />

      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            Plateforme
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            En chiffres
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-lg">
            Des milliers de joueurs, des millions de capsules, des cartes
            légendaires qui changent de mains chaque jour.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          <StatCard
            icon={Users}
            label="Joueurs inscrits"
            value={s.totalUsers}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            delay={0}
          />
          <StatCard
            icon={Zap}
            label="Capsules ouvertes"
            value={s.totalPulls}
            bgColor="bg-secondary/10"
            iconColor="text-secondary"
            delay={100}
          />
          <StatCard
            icon={Sparkles}
            label="Joueurs actifs cette semaine"
            value={s.activeUsers}
            bgColor="bg-accent/10"
            iconColor="text-accent"
            delay={200}
          />
          <StatCard
            icon={Star}
            label="Cartes disponibles"
            value={s.totalCards}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            delay={300}
          />
          <StatCard
            icon={Trophy}
            label="Cartes légendaires obtenues"
            value={s.legendaryPulls}
            bgColor="bg-amber-500/10"
            iconColor="text-amber-500"
            delay={400}
          />
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5 p-10 text-center">
          <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest mb-3">
            Rejoins l'aventure
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-3">
            Ta prochaine légendaire t'attend
          </h2>
          <p className="text-text-light text-sm mb-8 max-w-sm mx-auto">
            Construis ta collection, monte en niveau et affronte les meilleurs
            joueurs.
          </p>
          <button
            type="button"
            onClick={openRegister}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Commencer gratuitement →
          </button>
        </div>
      </main>
    </div>
  )
}
