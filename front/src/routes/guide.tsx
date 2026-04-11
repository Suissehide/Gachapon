import { createFileRoute, Link } from '@tanstack/react-router'
import { Helmet } from 'react-helmet-async'
import {
  BookOpen,
  ChevronRight,
  Layers,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { type ComponentType, type ReactNode } from 'react'

import { LandingNavbar } from '../components/custom/LandingNavbar'
import { useAuthDialogStore } from '../stores/authDialog.store'

export const Route = createFileRoute('/guide')({
  component: GuidePage,
})

const SECTIONS = [
  { id: 'tokens', label: 'Tokens & régénération' },
  { id: 'pulls', label: 'Tirer une capsule' },
  { id: 'rarete', label: 'Raretés & variantes' },
  { id: 'piete', label: 'Système de pitié' },
  { id: 'doublon', label: 'Doublons & poussière' },
  { id: 'ameliorations', label: 'Améliorations' },
  { id: 'collection', label: 'Collection' },
  { id: 'equipes', label: 'Équipes' },
  { id: 'api', label: 'API & Discord' },
]

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 py-10 border-b border-border/30 last:border-0"
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="text-xl font-black text-foreground">{title}</h2>
      </div>
      <div className="text-sm text-text-light leading-relaxed space-y-3 pl-11">
        {children}
      </div>
    </section>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-border/50 text-foreground/70">
      {children}
    </span>
  )
}

function RarityBadge({ rarity, color }: { rarity: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}
    >
      {rarity}
    </span>
  )
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed">
      {children}
    </div>
  )
}

function TipBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
      {children}
    </div>
  )
}

function GuidePage() {
  const { openRegister } = useAuthDialogStore()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Guide du joueur — Gachapon</title>
        <meta name="description" content="Tout ce qu'il faut savoir pour débuter sur Gachapon : tokens, tirages, raretés, variantes, système de pitié, améliorations, équipes et API." />
        <link rel="canonical" href="https://gachapon.qwetle.fr/guide" />
        <meta property="og:title" content="Guide du joueur — Gachapon" />
        <meta property="og:description" content="Tout ce qu'il faut savoir pour débuter sur Gachapon : tokens, tirages, raretés, variantes, système de pitié, améliorations, équipes et API." />
        <meta property="og:url" content="https://gachapon.qwetle.fr/guide" />
      </Helmet>
      <LandingNavbar />

      <div className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            Documentation
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            Guide du joueur
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-xl">
            Tout ce qu'il faut savoir pour débuter, optimiser tes tirages et
            constituer la meilleure collection possible sur Gachapon.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Table of contents — sticky sidebar */}
          <aside className="lg:w-52 shrink-0">
            <nav className="lg:sticky lg:top-24">
              <p className="text-[10px] font-semibold text-text-light/40 uppercase tracking-widest mb-3">
                Sommaire
              </p>
              <ul className="space-y-1">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex items-center gap-1.5 text-xs text-text-light hover:text-foreground transition-colors py-0.5"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-primary/40" />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {/* Tokens */}
            <Section id="tokens" icon={Ticket} title="Tokens & régénération">
              <p>
                Les <strong className="text-foreground">tokens</strong> sont la
                monnaie d'action du jeu — chaque tirage de capsule en consomme
                un. Ils se régénèrent automatiquement au fil du temps, sans rien
                faire de ta part.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Le stock de tokens a un{' '}
                  <strong className="text-foreground">plafond</strong> : les
                  tokens accumulés au-delà sont perdus. Reviens régulièrement.
                </li>
                <li>
                  • La régénération est continue : les tokens sont calculés à la
                  volée à chaque connexion, sans écriture en base.
                </li>
                <li>
                  • La <strong className="text-foreground">topbar</strong>{' '}
                  affiche ton solde en temps réel et le délai avant le prochain
                  token.
                </li>
              </ul>
              <InfoBox>
                Tu peux aussi obtenir des tokens via la{' '}
                <strong>Boutique</strong> (packs payants) ou des événements.
              </InfoBox>
              <TipBox>
                Conseil : connecte-toi régulièrement pour éviter de dépasser le
                plafond et de perdre des tokens accumulés.
              </TipBox>
            </Section>

            {/* Pulls */}
            <Section id="pulls" icon={Zap} title="Tirer une capsule">
              <p>
                Un pull consomme 1 token et te donne une carte aléatoire issue
                du pool actif. Chaque carte possède un{' '}
                <strong className="text-foreground">poids de drop</strong>{' '}
                (dropWeight) : plus le poids est élevé, plus la carte est
                probable.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Le tirage est instantané, le résultat s'affiche en direct
                  via WebSocket.
                </li>
                <li>
                  • Le résultat inclut la carte, sa variante, si c'est un
                  doublon, et la poussière gagnée.
                </li>
                <li>
                  • Ton compteur de{' '}
                  <strong className="text-foreground">pitié</strong> est mis à
                  jour après chaque pull (voir section dédiée).
                </li>
              </ul>
              <p>
                L'upgrade <Pill>LUCK</Pill> multiplie les poids des cartes de
                rareté{' '}
                <RarityBadge
                  rarity="RARE"
                  color="border-blue-500/30 bg-blue-500/10 text-blue-400"
                />{' '}
                <RarityBadge
                  rarity="EPIC"
                  color="border-violet-500/30 bg-violet-500/10 text-violet-400"
                />{' '}
                <RarityBadge
                  rarity="LEGENDARY"
                  color="border-amber-500/30 bg-amber-500/10 text-amber-400"
                />{' '}
                sans affecter les raretés inférieures.
              </p>
            </Section>

            {/* Raretés & variantes */}
            <Section id="rarete" icon={Star} title="Raretés & variantes">
              <p>
                Chaque carte appartient à une des cinq raretés, du plus commun
                au plus rare :
              </p>
              <div className="flex flex-wrap gap-2 my-2">
                <RarityBadge
                  rarity="COMMON"
                  color="border-border bg-muted text-text-light"
                />
                <RarityBadge
                  rarity="UNCOMMON"
                  color="border-green-500/30 bg-green-500/10 text-green-400"
                />
                <RarityBadge
                  rarity="RARE"
                  color="border-blue-500/30 bg-blue-500/10 text-blue-400"
                />
                <RarityBadge
                  rarity="EPIC"
                  color="border-violet-500/30 bg-violet-500/10 text-violet-400"
                />
                <RarityBadge
                  rarity="LEGENDARY"
                  color="border-amber-500/30 bg-amber-500/10 text-amber-400"
                />
              </div>
              <p className="mt-3">
                Les cartes de rareté{' '}
                <strong className="text-foreground">
                  RARE, EPIC et LEGENDARY
                </strong>{' '}
                peuvent apparaître en version spéciale appelée{' '}
                <strong className="text-foreground">variante</strong> :
              </p>
              <div className="space-y-2 mt-2">
                <div className="flex items-start gap-2">
                  <Pill>NORMAL</Pill>
                  <span>Version standard de la carte, la plus fréquente.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>BRILLIANT</Pill>
                  <span>
                    Version brillante — génère plus de poussière en doublon.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>HOLOGRAPHIC</Pill>
                  <span>
                    Version holographique — la plus rare des variantes, génère
                    encore plus de poussière.
                  </span>
                </div>
              </div>
              <p className="mt-2">
                Les taux de variante sont différents selon la rareté : une
                Legendary a plus de chances d'être Holographique qu'une Rare.
                Les taux exacts sont configurés par les administrateurs.
              </p>
            </Section>

            {/* Pitié */}
            <Section id="piete" icon={Trophy} title="Système de pitié">
              <p>
                Le système de pitié garantit qu'aucun joueur ne peut tirer
                indéfiniment sans obtenir de carte Legendary. Un compteur{' '}
                <strong className="text-foreground">pityCurrent</strong>{' '}
                s'incrémente à chaque pull sans Legendary.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Quand{' '}
                  <strong className="text-foreground">
                    pityCurrent atteint le seuil
                  </strong>{' '}
                  (pityThreshold), le prochain pull est garanti Legendary.
                </li>
                <li>
                  • Obtenir une Legendary — que ce soit avant le seuil ou grâce
                  à la pitié —{' '}
                  <strong className="text-foreground">
                    remet le compteur à zéro
                  </strong>
                  .
                </li>
                <li>
                  • La pitié est personnelle : elle ne se partage pas et
                  persiste entre les sessions.
                </li>
              </ul>
              <InfoBox>
                Ton compteur de pitié est visible dans ton profil. Il est remis
                à 0 automatiquement dès qu'une Legendary est tirée.
              </InfoBox>
            </Section>

            {/* Doublons & poussière */}
            <Section id="doublon" icon={Sparkles} title="Doublons & poussière">
              <p>
                Si tu tires une carte que tu possèdes déjà, c'est un{' '}
                <strong className="text-foreground">doublon</strong>. Tu ne
                l'ajoutes pas une deuxième fois à ta collection : à la place, tu
                reçois de la{' '}
                <strong className="text-foreground">poussière</strong> (dust).
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Le montant de poussière dépend de la{' '}
                  <strong className="text-foreground">rareté</strong> de la
                  carte doublonnée : une Legendary rapporte beaucoup plus qu'une
                  Common.
                </li>
                <li>
                  • Les variantes <Pill>BRILLIANT</Pill> et{' '}
                  <Pill>HOLOGRAPHIC</Pill> multiplient la poussière gagnée.
                </li>
                <li>
                  • La poussière sert exclusivement à acheter des{' '}
                  <strong className="text-foreground">Améliorations</strong>.
                </li>
              </ul>
              <TipBox>
                L'upgrade <strong>DUST_HARVEST</strong> multiplie la poussière
                reçue sur chaque doublon. C'est l'upgrade la plus rentable si tu
                as déjà beaucoup de cartes.
              </TipBox>
            </Section>

            {/* Améliorations */}
            <Section id="ameliorations" icon={TrendingUp} title="Améliorations">
              <p>
                Les améliorations (upgrades) améliorent définitivement tes
                statistiques. Elles se débloquent avec de la{' '}
                <strong className="text-foreground">poussière</strong> et ont{' '}
                <strong className="text-foreground">4 niveaux</strong> chacune.
              </p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Pill>REGEN</Pill> Régénération de tokens
                  </p>
                  <p>
                    Réduit le délai entre chaque token régénéré. Plus le niveau
                    est élevé, moins tu attends.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Pill>LUCK</Pill> Chance
                  </p>
                  <p>
                    Multiplie les poids de drop des cartes RARE, EPIC et
                    LEGENDARY. Augmente significativement tes chances d'obtenir
                    des raretés.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Pill>DUST_HARVEST</Pill> Récolte de poussière
                  </p>
                  <p>
                    Multiplie la poussière reçue sur chaque doublon. Idéal en
                    fin de collection.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Pill>TOKEN_VAULT</Pill> Réserve de tokens
                  </p>
                  <p>
                    Augmente le plafond maximum de tokens en stock. Utile si tu
                    te connectes rarement.
                  </p>
                </div>
              </div>
              <InfoBox>
                Tous les upgrades sont permanents et cumulatifs. L'ordre d'achat
                dépend de ton style de jeu : joue souvent → REGEN en priorité.
                Grosse collection → DUST_HARVEST.
              </InfoBox>
            </Section>

            {/* Collection */}
            <Section id="collection" icon={Layers} title="Collection">
              <p>
                Ta <strong className="text-foreground">collection</strong>{' '}
                regroupe toutes les cartes uniques que tu as obtenues. Chaque
                carte n'y apparaît qu'une fois, quel que soit le nombre de fois
                où tu l'as tirée.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Tu peux filtrer par{' '}
                  <strong className="text-foreground">
                    rareté, variante ou set
                  </strong>
                  .
                </li>
                <li>
                  • Les cartes Brilliant et Holographique ont une apparence
                  visuelle distincte.
                </li>
                <li>
                  • Le{' '}
                  <strong className="text-foreground">
                    taux de complétion
                  </strong>{' '}
                  est visible sur ta page de profil.
                </li>
                <li>
                  • Ton profil public est accessible à tous via{' '}
                  <Pill>/profile/&lt;username&gt;</Pill>.
                </li>
              </ul>
              <TipBox>
                Une fois ta collection bien fournie, les doublons deviennent
                fréquents. C'est le bon moment pour investir dans{' '}
                <strong>DUST_HARVEST</strong> et préparer d'autres upgrades.
              </TipBox>
            </Section>

            {/* Équipes */}
            <Section id="equipes" icon={Users} title="Équipes">
              <p>
                Les <strong className="text-foreground">équipes</strong> te
                permettent de jouer avec tes amis. Tu peux créer ou rejoindre
                une équipe via la page{' '}
                <Link
                  to="/team"
                  className="text-primary underline underline-offset-2"
                >
                  Équipes
                </Link>
                .
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Chaque équipe a un{' '}
                  <strong className="text-foreground">owner</strong>, des admins
                  et des membres.
                </li>
                <li>• L'owner peut inviter des joueurs par username.</li>
                <li>
                  • Les membres reçoivent une invitation qu'ils acceptent ou
                  refusent.
                </li>
              </ul>
            </Section>

            {/* API & Discord */}
            <Section
              id="api"
              icon={BookOpen}
              title="API publique & bot Discord"
            >
              <p>
                Gachapon expose une{' '}
                <strong className="text-foreground">API publique</strong>{' '}
                documentée en OpenAPI 3.1. Tu peux l'utiliser pour créer ton
                propre bot Discord, des outils de suivi, ou intégrer Gachapon
                dans d'autres services.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • L'authentification se fait via un header{' '}
                  <Pill>X-API-Key</Pill> — génère ta clé dans Paramètres.
                </li>
                <li>
                  • Endpoints disponibles : <Pill>POST /pulls</Pill>,{' '}
                  <Pill>GET /collection</Pill>, <Pill>GET /leaderboard</Pill> et
                  plus.
                </li>
              </ul>
              <div className="flex flex-wrap gap-3 mt-2">
                <Link
                  to="/api-docs"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  Référence API →
                </Link>
                <Link
                  to="/discord"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Guide bot Discord →
                </Link>
              </div>
            </Section>
          </main>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5 p-8 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-base font-black text-foreground mb-1">
              Prêt à commencer ?
            </p>
            <p className="text-xs text-text-light">
              Crée ton compte gratuitement et tire ta première capsule.
            </p>
          </div>
          <button
            type="button"
            onClick={openRegister}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Jouer gratuitement →
          </button>
        </div>
      </div>
    </div>
  )
}
