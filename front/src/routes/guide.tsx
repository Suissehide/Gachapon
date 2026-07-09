import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Award,
  BatteryCharging,
  BookOpen,
  ChevronRight,
  ChevronsUp,
  Coins,
  Crown,
  Flame,
  Gauge,
  Gift,
  Layers,
  LifeBuoy,
  ListChecks,
  Network,
  Sparkles,
  Star,
  Store,
  Swords,
  Ticket,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'

import { LandingNavbar } from '../components/custom/LandingNavbar'
import { useAuthDialogStore } from '../stores/authDialog.store'

export const Route = createFileRoute('/guide')({
  component: GuidePage,
})

const SECTIONS = [
  { id: 'monnaies', label: 'Les monnaies' },
  { id: 'tokens', label: 'Jetons & régénération' },
  { id: 'pulls', label: 'Tirer une capsule' },
  { id: 'rarete', label: 'Raretés & variantes' },
  { id: 'piete', label: 'Système de pitié' },
  { id: 'doublon', label: 'Doublons & poussière' },
  { id: 'boutique', label: 'Boutique du jour & Vœu' },
  { id: 'niveaux', label: 'Niveaux & XP' },
  { id: 'competences', label: 'Arbre de compétences' },
  { id: 'campagne', label: 'Campagne & combats' },
  { id: 'combat-points', label: 'Points de combat' },
  { id: 'cartes', label: 'Améliorer ses cartes' },
  { id: 'quetes', label: 'Quêtes' },
  { id: 'succes', label: 'Succès' },
  { id: 'chaine', label: 'Chaîne de connexion' },
  { id: 'recompenses', label: 'Récompenses' },
  { id: 'classements', label: 'Classements' },
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
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 leading-relaxed">
      {children}
    </div>
  )
}

function Currency({
  icon: Icon,
  name,
  color,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  name: string
  color: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
      <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        {name}
      </p>
      <p>{children}</p>
    </div>
  )
}

function GuidePage() {
  const { openRegister } = useAuthDialogStore()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Guide du joueur — Gachapon</title>
        <meta
          name="description"
          content="Tout ce qu'il faut savoir sur Gachapon : jetons, tirages, raretés, pitié, poussière, boutique du jour, arbre de compétences, campagne & combats, amélioration des cartes, quêtes, succès, classements et API."
        />
        <link rel="canonical" href="https://gachapon.qwetle.fr/guide" />
        <meta property="og:title" content="Guide du joueur — Gachapon" />
        <meta
          property="og:description"
          content="Tout ce qu'il faut savoir sur Gachapon : tirages, raretés, poussière, boutique, arbre de compétences, campagne & combats, amélioration des cartes, quêtes et succès."
        />
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
            Gachapon mêle deux boucles de jeu : <strong>collectionner</strong>{' '}
            des cartes en tirant des capsules, et les{' '}
            <strong>faire combattre</strong> dans la campagne pour progresser.
            Voici tout ce qu'il faut savoir pour débuter et optimiser.
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
            {/* Les monnaies */}
            <Section id="monnaies" icon={Wallet} title="Les monnaies">
              <p>
                Cinq ressources rythment la partie. Ton solde de chacune est
                affiché en temps réel dans la{' '}
                <strong className="text-foreground">topbar</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mt-1">
                <Currency
                  icon={Ticket}
                  name="Jetons gacha"
                  color="text-primary"
                >
                  La monnaie des tirages. Chaque capsule coûte un jeton. Ils se
                  régénèrent tout seuls jusqu'à un plafond.
                </Currency>
                <Currency icon={Sparkles} name="Poussière" color="text-sky-400">
                  Obtenue via les doublons. Sert à la boutique du jour, au Vœu,
                  à monter tes cartes et à réinitialiser l'arbre de compétences.
                </Currency>
                <Currency icon={Coins} name="Or" color="text-amber-400">
                  Gagné en combat et via les quêtes. Sert principalement à
                  monter le <strong className="text-foreground">niveau</strong>{' '}
                  de tes cartes.
                </Currency>
                <Currency
                  icon={BatteryCharging}
                  name="Points de combat"
                  color="text-emerald-400"
                >
                  L'énergie de la campagne. Se régénère avec le temps jusqu'à un
                  plafond ; chaque combat ou farm en consomme.
                </Currency>
                <Currency
                  icon={Gauge}
                  name="XP & niveau"
                  color="text-violet-400"
                >
                  Gagnée en tirant et en combattant. Monter de niveau débloque
                  des points de compétence et des récompenses de palier.
                </Currency>
                <Currency
                  icon={Network}
                  name="Points de compétence"
                  color="text-fuchsia-400"
                >
                  Obtenus en montant de niveau. À investir dans l'arbre de
                  compétences pour des bonus passifs permanents.
                </Currency>
              </div>
            </Section>

            {/* Tokens */}
            <Section id="tokens" icon={Ticket} title="Jetons & régénération">
              <p>
                Les <strong className="text-foreground">jetons gacha</strong>{' '}
                sont la monnaie d'action du jeu — chaque tirage de capsule en
                consomme un. Ils se régénèrent automatiquement au fil du temps,
                sans rien faire de ta part.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Le stock de jetons a un{' '}
                  <strong className="text-foreground">plafond</strong> : les
                  jetons accumulés au-delà sont perdus. Reviens régulièrement.
                </li>
                <li>
                  • La régénération est continue : le solde est recalculé à la
                  volée à chaque connexion.
                </li>
                <li>
                  • La <strong className="text-foreground">topbar</strong>{' '}
                  affiche ton solde et le délai avant le prochain jeton.
                </li>
              </ul>
              <InfoBox>
                Tu peux aussi obtenir des jetons via la{' '}
                <strong>Boutique</strong> (packs de tokens) ou des événements.
                Certaines compétences accélèrent la régénération, augmentent le
                plafond, ou donnent une chance de jeton bonus.
              </InfoBox>
              <TipBox>
                Conseil : connecte-toi régulièrement pour éviter de dépasser le
                plafond et de perdre des jetons accumulés.
              </TipBox>
            </Section>

            {/* Pulls */}
            <Section id="pulls" icon={Zap} title="Tirer une capsule">
              <p>
                Un tirage consomme 1 jeton et te donne une carte aléatoire issue
                du pool actif. Chaque carte possède un{' '}
                <strong className="text-foreground">poids de drop</strong> :
                plus le poids est élevé, plus la carte est probable.
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
                  jour après chaque tirage (voir section dédiée).
                </li>
              </ul>
              <p>
                Plusieurs compétences influencent le tirage : elles multiplient
                les chances des raretés{' '}
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
                />
                , dopent les variantes, offrent une chance de{' '}
                <strong className="text-foreground">tirage gratuit</strong>, ou
                déclenchent une{' '}
                <strong className="text-foreground">boule dorée</strong> qui
                force une rareté minimale.
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
                  <Pill>BRILLANT</Pill>
                  <span>
                    Version brillante — génère plus de poussière en doublon.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>HOLOGRAPHIQUE</Pill>
                  <span>
                    Version holographique — la plus rare des variantes, génère
                    encore plus de poussière.
                  </span>
                </div>
              </div>
              <p className="mt-2">
                Les taux de variante dépendent de la rareté : une Legendary a
                plus de chances d'être Holographique qu'une Rare. Les taux
                exacts sont configurés par les administrateurs.
              </p>
            </Section>

            {/* Pitié */}
            <Section id="piete" icon={LifeBuoy} title="Système de pitié">
              <p>
                Le système de pitié garantit qu'aucun joueur ne peut tirer
                indéfiniment sans obtenir de carte Legendary. Un compteur
                s'incrémente à chaque tirage sans Legendary.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Quand le compteur{' '}
                  <strong className="text-foreground">atteint le seuil</strong>,
                  le prochain tirage est garanti Legendary.
                </li>
                <li>
                  • Obtenir une Legendary — avant le seuil ou grâce à la pitié —{' '}
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
                Ton compteur de pitié est visible dans ton profil. Une
                compétence dédiée permet d'<strong>abaisser le seuil</strong>{' '}
                pour tomber sur des Legendary plus souvent.
              </InfoBox>
            </Section>

            {/* Doublons & poussière */}
            <Section id="doublon" icon={Sparkles} title="Doublons & poussière">
              <p>
                Si tu tires une carte que tu possèdes déjà, c'est un{' '}
                <strong className="text-foreground">doublon</strong>. Tu ne
                l'ajoutes pas une deuxième fois à ta collection : à la place, tu
                reçois de la{' '}
                <strong className="text-foreground">poussière</strong>.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Le montant dépend de la{' '}
                  <strong className="text-foreground">rareté</strong> de la
                  carte doublonnée : une Legendary rapporte bien plus qu'une
                  Common.
                </li>
                <li>
                  • Les variantes <Pill>BRILLANT</Pill> et{' '}
                  <Pill>HOLOGRAPHIQUE</Pill> multiplient la poussière gagnée.
                </li>
                <li>
                  • Tu peux aussi{' '}
                  <strong className="text-foreground">recycler</strong> des
                  exemplaires en trop depuis la collection pour convertir des
                  doublons en poussière.
                </li>
              </ul>
              <p>
                La poussière est une monnaie polyvalente : elle sert à la{' '}
                <strong className="text-foreground">boutique du jour</strong>,
                au <strong className="text-foreground">Vœu</strong>, à{' '}
                <strong className="text-foreground">monter tes cartes</strong>{' '}
                et à <strong className="text-foreground">réinitialiser</strong>{' '}
                ton arbre de compétences.
              </p>
              <TipBox>
                Une compétence multiplie la poussière reçue sur chaque doublon.
                C'est l'un des meilleurs investissements quand ta collection est
                déjà bien fournie et que les doublons s'accumulent.
              </TipBox>
            </Section>

            {/* Boutique du jour & Vœu */}
            <Section id="boutique" icon={Store} title="Boutique du jour & Vœu">
              <p>
                La <strong className="text-foreground">Boutique</strong> te
                permet de dépenser ta poussière pour cibler des cartes précises,
                plutôt que de compter uniquement sur le hasard des tirages.
              </p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    Boutique du jour
                  </p>
                  <p>
                    Une sélection de cartes renouvelée chaque jour, achetables à
                    la poussière (prix selon la rareté). Le compteur « Nouveau
                    tirage dans… » indique le renouvellement. Des compétences
                    peuvent{' '}
                    <strong className="text-foreground">
                      ajouter des emplacements
                    </strong>{' '}
                    et{' '}
                    <strong className="text-foreground">
                      réduire les prix
                    </strong>
                    .
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">Vœu</p>
                  <p>
                    Choisis{' '}
                    <strong className="text-foreground">
                      une carte de ton choix
                    </strong>{' '}
                    comme vœu, puis achète-la à la poussière. Elle coûte plus
                    cher qu'en boutique du jour, et un{' '}
                    <strong className="text-foreground">délai</strong>{' '}
                    s'applique avant de pouvoir en changer ou racheter. Une
                    compétence raccourcit ce délai.
                  </p>
                </div>
              </div>
              <InfoBox>
                La Boutique héberge aussi les <strong>packs de tokens</strong>{' '}
                et des <strong>boosts</strong> temporaires pour accélérer ta
                progression.
              </InfoBox>
            </Section>

            {/* Niveaux & XP */}
            <Section id="niveaux" icon={Gauge} title="Niveaux & XP">
              <p>
                Ton{' '}
                <strong className="text-foreground">niveau de compte</strong>{' '}
                progresse avec l'<strong className="text-foreground">XP</strong>{' '}
                que tu gagnes en tirant des capsules et en remportant des
                combats.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • La quantité d'XP requise augmente à chaque palier selon une
                  courbe.
                </li>
                <li>
                  • Monter de niveau octroie des{' '}
                  <strong className="text-foreground">
                    points de compétence
                  </strong>{' '}
                  et des récompenses de palier à récupérer.
                </li>
                <li>
                  • Des compétences augmentent l'XP gagnée par tirage et par
                  combat.
                </li>
              </ul>
              <InfoBox>
                Ne confonds pas le <strong>niveau de ton compte</strong> (ta
                progression globale) et le <strong>niveau d'une carte</strong>{' '}
                (sa puissance en combat, voir « Améliorer ses cartes »).
              </InfoBox>
            </Section>

            {/* Arbre de compétences */}
            <Section
              id="competences"
              icon={Network}
              title="Arbre de compétences"
            >
              <p>
                L'
                <strong className="text-foreground">
                  arbre de compétences
                </strong>{' '}
                remplace les anciennes améliorations. Tu y investis les{' '}
                <strong className="text-foreground">
                  points de compétence
                </strong>{' '}
                gagnés en montant de niveau ; chaque nœud débloque un{' '}
                <strong className="text-foreground">
                  bonus passif permanent
                </strong>
                .
              </p>
              <p>Les compétences couvrent quatre grands domaines :</p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" /> Tirage & chance
                  </p>
                  <p>
                    Booste les raretés, les variantes, la boule dorée, la chance
                    de tirage gratuit, et abaisse le seuil de pitié.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-400" /> Économie
                  </p>
                  <p>
                    Accélère la régénération et augmente le plafond de jetons,
                    donne des jetons bonus, multiplie la poussière, réduit les
                    prix de boutique et augmente l'or gagné.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-violet-400" /> Progression
                  </p>
                  <p>
                    Augmente l'XP de tirage et de combat, ajoute des
                    emplacements à la boutique du jour et raccourcit le délai du
                    Vœu.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-emerald-400" /> Combat
                  </p>
                  <p>
                    Augmente le plafond et la régénération des points de combat,
                    réduit le coût du farm et améliore le taux de drop
                    d'équipement.
                  </p>
                </div>
              </div>
              <InfoBox>
                Tu peux <strong>réinitialiser</strong> l'arbre à tout moment
                contre de la poussière : tous tes points sont rendus et
                redistribuables. Pratique pour tester une nouvelle orientation.
              </InfoBox>
            </Section>

            {/* Campagne & combats */}
            <Section id="campagne" icon={Swords} title="Campagne & combats">
              <p>
                La <strong className="text-foreground">Campagne</strong> est la
                boucle de combat. Tu progresses à travers des{' '}
                <strong className="text-foreground">chapitres</strong>{' '}
                thématiques — Plaines, Forêt des Murmures, Cendres, Océan,
                Cristaux, Volcan, Toundra — chacun découpé en{' '}
                <strong className="text-foreground">étapes</strong> de plus en
                plus difficiles.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Chaque étape se joue avec ton{' '}
                  <strong className="text-foreground">équipe de combat</strong>{' '}
                  (jusqu'à 3 cartes). Certaines étapes sont des{' '}
                  <strong className="text-foreground">Boss</strong> (1v3).
                </li>
                <li>
                  • L'écran de{' '}
                  <strong className="text-foreground">Préparation</strong>{' '}
                  affiche les adversaires, les récompenses, le coût en énergie
                  et un verdict de puissance : <Pill>Avantage</Pill>{' '}
                  <Pill>Équilibré</Pill> <Pill>Risqué</Pill>.
                </li>
                <li>
                  • Le combat est{' '}
                  <strong className="text-foreground">au tour par tour</strong>{' '}
                  : tes cartes utilisent leurs stats (PV, ATQ, DEF, VIT), leurs
                  passifs et leur équipement.
                </li>
              </ul>
              <p>
                Le <strong className="text-foreground">premier passage</strong>{' '}
                d'une étape offre des récompenses garanties (or, poussière, XP,
                et parfois un équipement ou une carte garantis). Rejouer une
                étape déjà nettoyée rapporte des récompenses répétables, avec
                des chances de drop d'équipement et de cartes.
              </p>
              <InfoBox>
                <strong>Farm ×3</strong> (balayage) rejoue automatiquement une
                étape déjà nettoyée plusieurs fois d'un coup, contre de
                l'énergie — idéal pour accumuler or et poussière sans rejouer
                chaque combat.
              </InfoBox>
            </Section>

            {/* Points de combat */}
            <Section
              id="combat-points"
              icon={BatteryCharging}
              title="Points de combat"
            >
              <p>
                Les{' '}
                <strong className="text-foreground">points de combat</strong>{' '}
                (l'« énergie ») sont à la campagne ce que les jetons sont aux
                tirages. Ils se régénèrent passivement jusqu'à un plafond,
                affiché dans la topbar.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Chaque combat et chaque farm en consomme. Sans énergie, le
                  bouton indique{' '}
                  <strong className="text-foreground">
                    « Énergie insuffisante »
                  </strong>
                  .
                </li>
                <li>
                  • Des compétences accélèrent leur régénération, augmentent le
                  plafond, et réduisent le coût du farm.
                </li>
              </ul>
              <TipBox>
                Dépense ton énergie avant qu'elle n'atteigne le plafond :
                au-delà, les points régénérés sont perdus, exactement comme les
                jetons.
              </TipBox>
            </Section>

            {/* Améliorer ses cartes */}
            <Section id="cartes" icon={ChevronsUp} title="Améliorer ses cartes">
              <p>
                Pour tenir face aux étapes avancées, tes cartes doivent gagner
                en puissance. Trois leviers se combinent, gérés depuis la fiche
                d'une carte.
              </p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">Niveau</p>
                  <p>
                    Monte le <strong className="text-foreground">niveau</strong>{' '}
                    d'une carte contre de l'or et de la poussière : ses stats
                    (PV, ATQ, DEF, VIT) augmentent à chaque niveau, jusqu'au
                    plafond de son palier.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    Palier & ascension
                  </p>
                  <p>
                    Une fois une carte au sommet de son{' '}
                    <strong className="text-foreground">palier</strong>,{' '}
                    <strong className="text-foreground">l'ascensionner</strong>{' '}
                    consomme un{' '}
                    <strong className="text-foreground">doublon</strong> pour
                    passer au palier suivant et relever son plafond de niveau.
                    Son <strong className="text-foreground">passif</strong>{' '}
                    gagne aussi en puissance à chaque palier.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    Équipement
                  </p>
                  <p>
                    Chaque carte dispose de 3 emplacements — <Pill>Arme</Pill>{' '}
                    <Pill>Armure</Pill> <Pill>Accessoire</Pill>. Les pièces
                    tombent en combat (et sur les boss), ont une rareté, et
                    ajoutent des bonus de stats. Équipe-les ou retire-les depuis
                    la page{' '}
                    <strong className="text-foreground">Équipement</strong>.
                  </p>
                </div>
              </div>
              <TipBox>
                Après une défaite, deux réflexes : revoir la composition de ton
                équipe, ou monter le niveau de tes cartes avant de retourner au
                front.
              </TipBox>
            </Section>

            {/* Quêtes */}
            <Section id="quetes" icon={ListChecks} title="Quêtes">
              <p>
                Les <strong className="text-foreground">quêtes</strong> te
                donnent des objectifs concrets récompensés en jetons, poussière,
                or et XP. Elles progressent automatiquement au fil de tes
                actions.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Les{' '}
                  <strong className="text-foreground">Hebdomadaires</strong> se
                  renouvellent chaque lundi ; les{' '}
                  <strong className="text-foreground">One-shot</strong> ne se
                  font qu'une seule fois.
                </li>
                <li>
                  • Une quête terminée passe « Récupéré » une fois que tu as
                  cliqué sur{' '}
                  <strong className="text-foreground">Réclamer</strong>.
                </li>
                <li>
                  • Compléter toutes les hebdomadaires débloque le bonus{' '}
                  <strong className="text-foreground">Semaine parfaite</strong>.
                </li>
              </ul>
            </Section>

            {/* Succès */}
            <Section id="succes" icon={Award} title="Succès">
              <p>
                Les <strong className="text-foreground">succès</strong> sont des
                objectifs à long terme débloqués par tes actions : tirages,
                montées de niveau, chaîne de connexion, appartenance à une
                équipe, et bien d'autres.
              </p>
              <ul className="space-y-1.5">
                <li>• Leur progression est visible (par ex. « 4 / 10 »).</li>
                <li>
                  • Filtre-les par <Pill>Tous</Pill> <Pill>Réussis</Pill>{' '}
                  <Pill>À débloquer</Pill>.
                </li>
                <li>
                  • Les récompenses peuvent inclure des cartes, des jetons, de
                  la poussière et de l'XP.
                </li>
              </ul>
            </Section>

            {/* Chaîne de connexion */}
            <Section id="chaine" icon={Flame} title="Chaîne de connexion">
              <p>
                Connecte-toi{' '}
                <strong className="text-foreground">chaque jour</strong> pour
                allonger ta chaîne. Un jour manqué la remet à zéro, mais ta{' '}
                <strong className="text-foreground">meilleure chaîne</strong>{' '}
                reste conservée.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Des{' '}
                  <strong className="text-foreground">paliers de chaîne</strong>{' '}
                  octroient des récompenses (jetons, poussière, or, XP).
                </li>
                <li>
                  • C'est le moyen le plus simple d'accumuler des ressources sur
                  la durée : la régularité paie.
                </li>
              </ul>
            </Section>

            {/* Récompenses */}
            <Section id="recompenses" icon={Gift} title="Récompenses">
              <p>
                De nombreux systèmes déposent des{' '}
                <strong className="text-foreground">
                  récompenses à récupérer
                </strong>{' '}
                : quêtes, montées de niveau, chaîne de connexion, succès et
                événements. Elles s'accumulent dans la{' '}
                <strong className="text-foreground">cloche</strong> de
                notifications.
              </p>
              <ul className="space-y-1.5">
                <li>
                  • Réclame-les une par une, ou tout d'un coup — les récompenses
                  de quête se réclament séparément, depuis la page Quêtes.
                </li>
                <li>
                  • Certaines contiennent une{' '}
                  <strong className="text-foreground">carte</strong> révélée à
                  la réclamation.
                </li>
              </ul>
              <InfoBox>
                Pense à passer les récupérer : la pastille de la cloche
                t'indique combien de récompenses t'attendent.
              </InfoBox>
            </Section>

            {/* Classements */}
            <Section id="classements" icon={Crown} title="Classements">
              <p>
                Les <strong className="text-foreground">classements</strong> te
                situent face aux autres joueurs sur trois axes :
              </p>
              <div className="space-y-2 mt-1">
                <div className="flex items-start gap-2">
                  <Pill>Collectionneurs</Pill>
                  <span>
                    Classe par taux de complétion, cartes distinctes et
                    variantes.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>Équipes</Pill>
                  <span>Classe les équipes par complétion collective.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>Combats</Pill>
                  <span>
                    Classe par chapitre et étape les plus avancés atteints en
                    campagne.
                  </span>
                </div>
              </div>
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
                  • Les cartes Brillant et Holographique ont une apparence
                  visuelle distincte.
                </li>
                <li>
                  • La fiche d'une carte permet de la définir comme{' '}
                  <strong className="text-foreground">Vœu</strong>, de la{' '}
                  <strong className="text-foreground">recycler</strong>, de la
                  monter en niveau et de l'ascensionner.
                </li>
                <li>
                  • Ton profil public est accessible à tous via{' '}
                  <Pill>/profile/&lt;username&gt;</Pill>.
                </li>
              </ul>
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
                  <strong className="text-foreground">owner</strong> et des
                  membres.
                </li>
                <li>• L'owner peut inviter des joueurs par username.</li>
                <li>
                  • Les invitations ont une durée de validité ; le membre les
                  accepte ou les refuse.
                </li>
                <li>
                  • La complétion collective de l'équipe apparaît dans le{' '}
                  <strong className="text-foreground">
                    classement Équipes
                  </strong>
                  .
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
