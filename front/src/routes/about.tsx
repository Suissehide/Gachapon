import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { discordInviteUrl } from '../constants/config.constant'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  const { t } = useTranslation('about')
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/about" />
      <LandingNavbar />

      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            {t('page.eyebrow')}
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            {t('page.title')}
          </h1>
          <p className="text-base text-text-light leading-relaxed">
            {t('page.description')}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm text-text-light leading-relaxed">
          <section>
            <h2 className="text-lg font-black text-foreground mb-3">
              {t('idea.title')}
            </h2>
            <p>
              {t('idea.textBefore')}{' '}
              <strong className="text-foreground">{t('idea.emphasis')}</strong>
              {t('idea.textAfter')}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-3">
              {t('features.title')}
            </h2>
            <ul className="space-y-2">
              {[
                t('features.items.pulls'),
                t('features.items.campaign'),
                t('features.items.cardProgression'),
                t('features.items.skillTree'),
                t('features.items.questsAndRewards'),
                t('features.items.dailyShopAndWish'),
                t('features.items.leaderboards'),
                t('features.items.teams'),
                t('features.items.publicApi'),
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-3">
              {t('community.title')}
            </h2>
            <p className="mb-4">{t('community.description')}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t('community.discordLink')}
              </a>
              <Link
                to="/discord"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t('community.botLink')}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
