import { createFileRoute, Link } from '@tanstack/react-router'
import { Helmet } from 'react-helmet-async'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>À propos — Gachapon</title>
        <meta
          name="description"
          content="Découvrez Gachapon, un jeu de cartes à collectionner en ligne inspiré des distributeurs automatiques de capsules japonaises. Tirage, rareté, équipes et API publique."
        />
        <link rel="canonical" href="https://gachapon.qwetle.fr/about" />
        <meta property="og:title" content="À propos — Gachapon" />
        <meta
          property="og:description"
          content="Découvrez Gachapon, un jeu de cartes à collectionner en ligne inspiré des distributeurs automatiques de capsules japonaises."
        />
        <meta property="og:url" content="https://gachapon.qwetle.fr/about" />
      </Helmet>
      <LandingNavbar />

      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            Le projet
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">À propos</h1>
          <p className="text-base text-text-light leading-relaxed">
            Gachapon est un jeu de cartes à collectionner en ligne, inspiré des
            distributeurs automatiques de capsules japonaises.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm text-text-light leading-relaxed">
          <section>
            <h2 className="text-lg font-black text-foreground mb-3">L'idée</h2>
            <p>
              L'idée est simple : chaque capsule que tu ouvres peut contenir une
              carte commune ou un trésor légendaire. Mais Gachapon ne s'arrête
              pas à la collection — tu fais aussi{' '}
              <strong className="text-foreground">combattre</strong> tes cartes
              dans une campagne. La chance ouvre les capsules, la stratégie fait
              le reste : compétences, montée en puissance des cartes et
              composition d'équipe font toute la différence.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-3">
              Fonctionnalités
            </h2>
            <ul className="space-y-2">
              {[
                'Tirage de capsules avec système de rareté (Common → Legendary) et variantes Brillantes & Holographiques',
                'Campagne et combats au tour par tour avec ton équipe de cartes',
                'Amélioration des cartes : niveau, ascension par palier et équipement',
                'Arbre de compétences pour des bonus passifs permanents',
                'Quêtes, succès, chaîne de connexion et récompenses à récupérer',
                'Boutique du jour et Vœu pour cibler les cartes qui te manquent',
                'Classements collectionneurs, équipes et combats',
                'Équipes pour jouer avec tes amis',
                'API publique pour créer ton propre bot Discord',
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
              Communauté
            </h2>
            <p className="mb-4">
              Rejoins le serveur Discord pour suivre les mises à jour, partager
              tes pulls et rencontrer d'autres collectionneurs.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.gg/my-gachapon"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Discord →
              </a>
              <Link
                to="/discord"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Intégration bot →
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
