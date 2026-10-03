import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ChangelogTimeline } from '../components/changelog/ChangelogTimeline.tsx'
import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  const { t } = useTranslation('changelog')
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/changelog" />
      <LandingNavbar />
      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
          {t('page.eyebrow')}
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-4">
          {t('page.title')}
        </h1>
        <p className="text-text-light text-base leading-relaxed mb-16 max-w-xl">
          {t('page.description')}
        </p>

        <ChangelogTimeline />
      </main>
    </div>
  )
}
