import { createFileRoute } from '@tanstack/react-router'
import { Helmet } from 'react-helmet-async'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Changelog — Gachapon</title>
        <meta name="description" content="Historique des mises à jour et nouvelles fonctionnalités de Gachapon." />
        <link rel="canonical" href="https://gachapon.qwetle.fr/changelog" />
        <meta property="og:title" content="Changelog — Gachapon" />
        <meta property="og:description" content="Historique des mises à jour et nouvelles fonctionnalités de Gachapon." />
        <meta property="og:url" content="https://gachapon.qwetle.fr/changelog" />
      </Helmet>
      <LandingNavbar />
      <main className="pt-32 pb-16 px-6 lg:px-10 max-w-4xl mx-auto">
        <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
          Mises à jour
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-6">Changelog</h1>
        <p className="text-text-light text-base leading-relaxed">
          Historique des versions à venir.
        </p>
      </main>
    </div>
  )
}
