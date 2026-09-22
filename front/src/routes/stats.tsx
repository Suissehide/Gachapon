import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarClock,
  Crown,
  Layers,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PublicStats } from '../api/stats.api.ts'
import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { currentLocale } from '../i18n/index.ts'
import { formatNumber } from '../libs/utils.ts'
import { usePublicStats } from '../queries/usePublicStats.ts'
import { useAuthDialogStore } from '../stores/authDialog.store'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
})

const fallback: PublicStats = {
  totalUsers: 0,
  totalPulls: 0,
  totalCards: 0,
  activeUsers: 0,
  legendaryPulls: 0,
  pullsToday: 0,
  totalDust: 0,
  setsCount: 0,
  legendaryCardsCount: 0,
}

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
  const locale = currentLocale()
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
          {formatNumber(count, locale)}
          {suffix}
        </p>
        <p className="text-sm text-text-light mt-2 font-medium">{label}</p>
      </div>
    </div>
  )
}

function StatsPage() {
  const { t } = useTranslation('stats')
  const { openRegister } = useAuthDialogStore()
  const { data: stats } = usePublicStats()

  const s = stats ?? fallback

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/stats" />
      <LandingNavbar />

      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            {t('page.eyebrow')}
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            {t('page.title')}
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-lg">
            {t('page.description')}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          <StatCard
            icon={Users}
            label={t('page.cards.registeredUsers')}
            value={s.totalUsers}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            delay={0}
          />
          <StatCard
            icon={Zap}
            label={t('page.cards.openedCapsules')}
            value={s.totalPulls}
            bgColor="bg-secondary/10"
            iconColor="text-secondary"
            delay={100}
          />
          <StatCard
            icon={Sparkles}
            label={t('page.cards.activeUsersThisWeek')}
            value={s.activeUsers}
            bgColor="bg-accent/10"
            iconColor="text-accent"
            delay={200}
          />
          <StatCard
            icon={Star}
            label={t('page.cards.availableCards')}
            value={s.totalCards}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            delay={300}
          />
          <StatCard
            icon={Trophy}
            label={t('page.cards.legendaryPullsObtained')}
            value={s.legendaryPulls}
            bgColor="bg-amber-500/10"
            iconColor="text-amber-500"
            delay={400}
          />
          <StatCard
            icon={CalendarClock}
            label={t('page.cards.capsulesOpenedToday')}
            value={s.pullsToday}
            bgColor="bg-secondary/10"
            iconColor="text-secondary"
            delay={500}
          />
          <StatCard
            icon={Sparkles}
            label={t('page.cards.totalDustAccumulated')}
            value={s.totalDust}
            bgColor="bg-accent/10"
            iconColor="text-accent"
            delay={600}
          />
          <StatCard
            icon={Layers}
            label={t('page.cards.availableSets')}
            value={s.setsCount}
            bgColor="bg-primary/10"
            iconColor="text-primary"
            delay={700}
          />
          <StatCard
            icon={Crown}
            label={t('page.cards.existingLegendaryCards')}
            value={s.legendaryCardsCount}
            bgColor="bg-amber-500/10"
            iconColor="text-amber-500"
            delay={800}
          />
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5 p-10 text-center">
          <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest mb-3">
            {t('page.cta.eyebrow')}
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-3">
            {t('page.cta.title')}
          </h2>
          <p className="text-text-light text-sm mb-8 max-w-sm mx-auto">
            {t('page.cta.description')}
          </p>
          <button
            type="button"
            onClick={openRegister}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {t('page.cta.button')}
          </button>
        </div>
      </main>
    </div>
  )
}
