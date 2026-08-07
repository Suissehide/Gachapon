// changelog-sync: dernier commit intégré au changelog. Mis à jour par la commande /changelog.
// last-synced-commit: 40e71575a58741e7089e49f5633a22244769d452
import { createFileRoute } from '@tanstack/react-router'
import { Helmet } from 'react-helmet-async'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { cn } from '../libs/utils.ts'

type ChangeType = 'new' | 'improved' | 'fixed'

type ChangelogEntry = {
  type: ChangeType
  text: string
}

type ChangelogRelease = {
  version: string
  title: string
  date: string
  summary: string
  entries: ChangelogEntry[]
}

const TYPE_META: Record<ChangeType, { label: string; className: string }> = {
  new: {
    label: 'Nouveau',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  improved: {
    label: 'Amélioré',
    className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  fixed: {
    label: 'Corrigé',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
}

const RELEASES: ChangelogRelease[] = [
  {
    version: '1.7',
    title: 'Neuf chapitres et palier 7',
    date: 'Août 2026',
    summary:
      'La campagne s’étend jusqu’au chapitre 9, tes cartes montent un palier de plus, et les boss reprennent leur rôle de vrai test de fin de chapitre.',
    entries: [
      {
        type: 'new',
        text: 'Quatre nouveaux chapitres : Volcan, Toundra, Abysses et Faille. La campagne compte désormais 9 chapitres et 90 étages.',
      },
      {
        type: 'new',
        text: 'Palier d’ascension 7 débloqué : tes cartes peuvent grimper jusqu’au niveau 70.',
      },
      {
        type: 'improved',
        text: 'Difficulté revue en profondeur : la montée en puissance des ennemis est désormais continue d’un bout à l’autre de la campagne, et le boss redevient le vrai pic de chaque chapitre — le vrai check de ta build.',
      },
      {
        type: 'new',
        text: 'De nouveaux succès marquent les jalons des chapitres 5, 7 et 9, alignés sur le plafond de niveau 70.',
      },
    ],
  },
  {
    version: '1.6',
    title: 'Éléments & tirage',
    date: 'Juillet – Août 2026',
    summary:
      'Tes cartes ont un élément, tes adversaires aussi — et le tirage se vit en grand.',
    entries: [
      {
        type: 'new',
        text: 'Éléments : chaque carte et chaque monstre appartient à un élément. Le feu brûle la nature, la nature fissure la terre, la terre absorbe l’eau, l’eau éteint le feu — et lumière et ténèbres se répondent. Attaquer avec l’avantage fait mal ; l’encaisser fait moins mal.',
      },
      {
        type: 'new',
        text: 'Ciblage élémentaire : au combat, chaque unité frappe en priorité l’adversaire qu’elle domine. Les éléments ennemis sont affichés avant de lancer l’assaut — à toi de composer ton équipe en conséquence.',
      },
      {
        type: 'improved',
        text: 'Campagne recalibrée pour tenir compte des éléments, et pastilles d’élément visibles sur les portraits comme sur l’aperçu des adversaires.',
      },
      {
        type: 'new',
        text: 'Tirage repensé : la capsule vibre en crescendo puis explose, la machine s’anime, le son suit. Le tirage x10 se dépile carte par carte, avec un bouton Passer si tu es pressé.',
      },
      {
        type: 'new',
        text: 'Un tutoriel en six étapes t’accueille sur la page de tirage, et ton énergie se remplit à bloc à chaque montée de niveau.',
      },
      {
        type: 'improved',
        text: 'Boutique rééquilibrée (packs de jetons, recharges, boutique du jour), stockage de jetons de base porté à 10, et affichage des ressources uniformisé partout.',
      },
    ],
  },
  {
    version: '1.5',
    title: 'Équipement, combat & campagne',
    date: 'Juillet 2026',
    summary:
      'Ton équipement progresse, le combat gagne en profondeur et la campagne s’agrandit.',
    entries: [
      {
        type: 'new',
        text: 'Progression d’équipement : améliore tes pièces jusqu’au niveau 12, sous-stats selon la rareté, et destruction en masse contre de l’or.',
      },
      {
        type: 'improved',
        text: 'Combat repensé : chaque carte agit selon sa vitesse (jauge d’action) et les attaques touchent des cibles aléatoires.',
      },
      {
        type: 'new',
        text: 'Campagne enrichie : chapitres 4 et 5, ennemis avec portraits et familles aux passifs uniques (poison, brûlure, bénédiction…).',
      },
      {
        type: 'improved',
        text: 'Collection : puissance affichée sur tes cartes, tri et filtres mémorisés, et recyclage des doublons en masse.',
      },
      {
        type: 'new',
        text: 'Boutique : packs d’énergie pour la campagne et boosts de tirage cumulables.',
      },
      {
        type: 'improved',
        text: 'Révélations plus spectaculaires : animations dédiées aux variantes Brillante et Holo, et inspection de la carte au clic.',
      },
    ],
  },
  {
    version: '1.4',
    title: 'Quêtes, souhaits & économie',
    date: 'Juillet 2026',
    summary:
      'De nouveaux objectifs quotidiens, une liste de souhaits et une économie remise à plat.',
    entries: [
      {
        type: 'new',
        text: 'Quêtes quotidiennes et hebdomadaires avec récompenses à réclamer.',
      },
      {
        type: 'new',
        text: 'Liste de souhaits : marque les cartes que tu convoites sur ton profil.',
      },
      {
        type: 'new',
        text: 'Page de statistiques publique pour suivre l’activité de la communauté.',
      },
      {
        type: 'improved',
        text: 'Refonte de l’économie : jetons, poussière et pitié rééquilibrés.',
      },
      {
        type: 'improved',
        text: 'Écran de tirage et de révélation affiné.',
      },
    ],
  },
  {
    version: '1.3',
    title: 'Combat & progression',
    date: 'Juin 2026',
    summary:
      'Le PvE arrive : succès, campagne, batailles et équipement pour tes cartes.',
    entries: [
      {
        type: 'new',
        text: 'Système de succès : débloque des récompenses en jouant.',
      },
      { type: 'new', text: 'Combat et batailles contre des adversaires.' },
      { type: 'new', text: 'Mode campagne avec une progression par étapes.' },
      { type: 'new', text: 'Équipement pour renforcer tes cartes au combat.' },
    ],
  },
  {
    version: '1.2',
    title: 'Compétences & classements',
    date: 'Avril – Mai 2026',
    summary: 'Personnalise ton style de jeu et grimpe dans les classements.',
    entries: [
      {
        type: 'new',
        text: 'Arbre de compétences pour faire évoluer ton profil de joueur.',
      },
      {
        type: 'new',
        text: 'Boutique quotidienne avec une sélection renouvelée chaque jour.',
      },
      {
        type: 'new',
        text: 'Classements repensés avec un système de score global.',
      },
      {
        type: 'improved',
        text: 'Révélation des cartes retravaillée avec des effets propres à chaque rareté.',
      },
    ],
  },
  {
    version: '1.1',
    title: 'Profils & récompenses',
    date: 'Mars 2026',
    summary:
      'Ta vitrine personnelle et de quoi être récompensé pour ta régularité.',
    entries: [
      {
        type: 'new',
        text: 'Pages de profil publiques pour montrer ta collection.',
      },
      {
        type: 'new',
        text: 'Séries de connexion (streak) et paliers de récompenses.',
      },
      { type: 'new', text: 'Recyclage des cartes en double en poussière.' },
      {
        type: 'new',
        text: 'Améliorations permanentes (gain de jetons, chance, récolte de poussière…).',
      },
      {
        type: 'new',
        text: 'Flux en direct des tirages de toute la communauté.',
      },
    ],
  },
  {
    version: '1.0',
    title: 'Le lancement',
    date: 'Mars 2026',
    summary:
      'La première version de Gachapon : joue, collectionne, rejoins une équipe.',
    entries: [
      {
        type: 'new',
        text: 'Machines 3D à pince et à capsule pour tes tirages.',
      },
      {
        type: 'new',
        text: 'Collection de cartes TCG avec variantes Holo et Brillante.',
      },
      { type: 'new', text: 'Comptes par e-mail ou via Google et Discord.' },
      {
        type: 'new',
        text: 'Équipes, invitations et classements entre membres.',
      },
      {
        type: 'new',
        text: 'Backoffice d’administration pour gérer cartes, sets et médias.',
      },
    ],
  },
]

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Changelog — Gachapon</title>
        <meta
          name="description"
          content="Historique des mises à jour et nouvelles fonctionnalités de Gachapon."
        />
        <link rel="canonical" href="https://gachapon.qwetle.fr/changelog" />
        <meta property="og:title" content="Changelog — Gachapon" />
        <meta
          property="og:description"
          content="Historique des mises à jour et nouvelles fonctionnalités de Gachapon."
        />
        <meta
          property="og:url"
          content="https://gachapon.qwetle.fr/changelog"
        />
      </Helmet>
      <LandingNavbar />
      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
          Mises à jour
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-4">Changelog</h1>
        <p className="text-text-light text-base leading-relaxed mb-16 max-w-xl">
          Tout ce qui a changé dans Gachapon, de la première capsule aux
          dernières nouveautés.
        </p>

        <div className="relative">
          <div
            className="absolute left-0 top-2 bottom-2 w-px bg-border"
            aria-hidden
          />
          <ol className="space-y-14">
            {RELEASES.map((release) => (
              <li key={release.version} className="relative pl-8">
                <span
                  className="absolute left-0 top-1.5 -translate-x-1/2 h-3 w-3 rounded-full bg-primary ring-4 ring-background"
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                  <span className="inline-flex items-center rounded-full bg-card border border-border px-2.5 py-0.5 text-xs font-bold tracking-wide">
                    v{release.version}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight">
                    {release.title}
                  </h2>
                </div>
                <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.15em] mb-3">
                  {release.date}
                </p>
                <p className="text-text-light text-sm leading-relaxed mb-5">
                  {release.summary}
                </p>
                <ul className="space-y-2.5">
                  {release.entries.map((entry) => (
                    <li key={entry.text} className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          TYPE_META[entry.type].className,
                        )}
                      >
                        {TYPE_META[entry.type].label}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground/90">
                        {entry.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  )
}
