import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Atom,
  Award,
  BatteryCharging,
  BookOpen,
  Castle,
  ChevronRight,
  ChevronsUp,
  Coins,
  Crown,
  Dices,
  Flame,
  Gauge,
  Gift,
  Layers,
  LifeBuoy,
  ListChecks,
  Network,
  Shield,
  Skull,
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
import { Trans, useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { useAuthDialogStore } from '../stores/authDialog.store'

export const Route = createFileRoute('/guide')({
  component: GuidePage,
})

type Icon = ComponentType<{ className?: string }>

// Le texte vit dans `guide:sections.<id>.<key>` ; ce fichier ne décrit que la
// mise en page. `list` et `cards` pointent sur des objets `{ i1, i2, … }`
// (check-i18n-parity refuse les tableaux), relus avec `returnObjects` dans
// l'ordre de leurs clés — ajouter une puce = ajouter `iN` dans les deux
// locales, sans toucher au code.
type Block =
  | { kind: 'p' | 'info' | 'tip' | 'list'; key: string }
  | { kind: 'cards'; key: string; icons?: [Icon, string][] }
  | { kind: 'rarities' }
  | { kind: 'apiLinks' }

interface SectionSpec {
  id: string
  icon: Icon
  blocks: Block[]
}

const p = (key: string): Block => ({ kind: 'p', key })
const list = (key = 'list'): Block => ({ kind: 'list', key })
const info: Block = { kind: 'info', key: 'info' }
const tip: Block = { kind: 'tip', key: 'tip' }
const intro = p('intro')

// Les ids sont stables : ils pilotent les ancres `#<id>` et sont indépendants
// de la langue. Les libellés viennent de `guide:sectionLabels.<id>`.
// L'ordre est recopié dans le sommaire de scripts/seo-routes.mjs.
const SECTIONS: SectionSpec[] = [
  {
    id: 'monnaies',
    icon: Wallet,
    blocks: [
      intro,
      {
        kind: 'cards',
        key: 'cards',
        icons: [
          [Ticket, 'text-primary'],
          [Sparkles, 'text-sky-400'],
          [Coins, 'text-amber-400'],
          [BatteryCharging, 'text-emerald-400'],
          [Gauge, 'text-violet-400'],
          [Network, 'text-fuchsia-400'],
        ],
      },
    ],
  },
  { id: 'tokens', icon: Ticket, blocks: [intro, list(), info, tip] },
  { id: 'pulls', icon: Zap, blocks: [intro, list(), p('skills'), info] },
  {
    id: 'rarete',
    icon: Star,
    blocks: [
      intro,
      { kind: 'rarities' },
      p('variantIntro'),
      list(),
      p('outro'),
    ],
  },
  { id: 'piete', icon: LifeBuoy, blocks: [intro, list(), info] },
  { id: 'doublon', icon: Sparkles, blocks: [intro, list(), p('uses'), tip] },
  {
    id: 'boutique',
    icon: Store,
    blocks: [intro, { kind: 'cards', key: 'cards' }],
  },
  { id: 'niveaux', icon: Gauge, blocks: [intro, list(), info] },
  {
    id: 'competences',
    icon: Network,
    blocks: [intro, { kind: 'cards', key: 'cards' }, info],
  },
  {
    id: 'campagne',
    icon: Swords,
    blocks: [intro, list(), p('firstClear'), info],
  },
  { id: 'elements', icon: Atom, blocks: [intro, list(), tip] },
  { id: 'tours', icon: Castle, blocks: [intro, list()] },
  { id: 'combat-points', icon: BatteryCharging, blocks: [intro, list(), tip] },
  {
    id: 'cartes',
    icon: ChevronsUp,
    blocks: [intro, { kind: 'cards', key: 'cards' }, tip],
  },
  {
    id: 'equipement',
    icon: Shield,
    blocks: [intro, list(), p('setsIntro'), list('sets'), info],
  },
  { id: 'quetes', icon: ListChecks, blocks: [intro, list()] },
  { id: 'succes', icon: Award, blocks: [intro, list()] },
  { id: 'chaine', icon: Flame, blocks: [intro, list()] },
  { id: 'recompenses', icon: Gift, blocks: [intro, list(), info] },
  {
    id: 'classements',
    icon: Crown,
    blocks: [intro, { kind: 'cards', key: 'cards' }],
  },
  { id: 'collection', icon: Layers, blocks: [intro, list()] },
  {
    id: 'equipes',
    icon: Users,
    blocks: [intro, list(), p('progression'), list('perks'), info],
  },
  { id: 'raid', icon: Skull, blocks: [intro, list()] },
  {
    id: 'duels',
    icon: Dices,
    blocks: [intro, { kind: 'cards', key: 'cards' }],
  },
  { id: 'api', icon: BookOpen, blocks: [intro, list(), { kind: 'apiLinks' }] },
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

// `children` optionnel : <Trans> passe certaines instances sans enfants au
// JSX statique (`components={{ brilliantPill: <Pill /> }}`) — c'est <Trans>
// qui injecte le contenu traduit à l'exécution, TypeScript ne le voit pas.
function Pill({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-border/50 text-foreground/70">
      {children}
    </span>
  )
}

// `children` : texte injecté par <Trans> (`<rare>RARE</rare>`) ; sinon `rarity`.
function RarityBadge({
  rarity,
  color,
  children,
}: {
  rarity?: string
  color: string
  children?: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}
    >
      {children ?? rarity}
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

const RARITY_COLORS = {
  COMMON: 'border-border bg-muted text-text-light',
  UNCOMMON: 'border-green-500/30 bg-green-500/10 text-green-400',
  RARE: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  EPIC: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  LEGENDARY: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
} as const

// Balises utilisables dans n'importe quelle chaîne `guide:sections.*`.
const TRANS_COMPONENTS = {
  strong: <strong className="text-foreground" />,
  pill: <Pill />,
  rare: <RarityBadge color={RARITY_COLORS.RARE} />,
  epic: <RarityBadge color={RARITY_COLORS.EPIC} />,
  legendary: <RarityBadge color={RARITY_COLORS.LEGENDARY} />,
  teamLink: (
    <Link
      to="/team"
      className="text-primary hover:text-primary-light font-semibold"
    />
  ),
}

function SectionBlock({ id, block }: { id: string; block: Block }) {
  const { t } = useTranslation(['guide', 'discord'])

  if (block.kind === 'rarities') {
    return (
      <div className="flex flex-wrap gap-2 my-2">
        {(Object.keys(RARITY_COLORS) as (keyof typeof RARITY_COLORS)[]).map(
          (rarity) => (
            <RarityBadge
              key={rarity}
              rarity={rarity}
              color={RARITY_COLORS[rarity]}
            />
          ),
        )}
      </div>
    )
  }

  if (block.kind === 'apiLinks') {
    return (
      <div className="flex flex-wrap gap-3 mt-2">
        <Link
          to="/api-docs"
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          {t('discord:header.apiReferenceLink')}
        </Link>
        <Link
          to="/discord"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          {t('sections.api.discordGuideLink')}
        </Link>
      </div>
    )
  }

  const base = `sections.${id}.${block.key}`
  const text = (key: string) => (
    <Trans t={t} i18nKey={key} components={TRANS_COMPONENTS} />
  )

  switch (block.kind) {
    case 'p':
      return <p>{text(base)}</p>
    case 'info':
      return <InfoBox>{text(base)}</InfoBox>
    case 'tip':
      return <TipBox>{text(base)}</TipBox>
    case 'list': {
      const items = t(base, { returnObjects: true }) as Record<string, string>
      return (
        <ul className="space-y-1.5">
          {Object.keys(items).map((k) => (
            <li key={k}>• {text(`${base}.${k}`)}</li>
          ))}
        </ul>
      )
    }
    case 'cards': {
      const cards = t(base, { returnObjects: true }) as Record<
        string,
        { title: string; text: string }
      >
      return (
        <div
          className={
            block.icons ? 'grid gap-3 sm:grid-cols-2 mt-1' : 'space-y-3 mt-1'
          }
        >
          {Object.entries(cards).map(([k, card], i) => {
            const [CardIcon, color] = block.icons?.[i] ?? []
            return (
              <div
                key={k}
                className="rounded-lg border border-border/50 bg-card px-4 py-3"
              >
                <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  {CardIcon && <CardIcon className={`h-4 w-4 ${color}`} />}
                  {card.title}
                </p>
                <p>{text(`${base}.${k}.text`)}</p>
              </div>
            )
          })}
        </div>
      )
    }
  }
}

function GuidePage() {
  const { openRegister } = useAuthDialogStore()
  const { t } = useTranslation(['guide', 'discord'])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/guide" />
      <LandingNavbar />

      <div className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            {t('meta.eyebrow')}
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            {t('header.title')}
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-xl">
            <Trans
              t={t}
              i18nKey="header.intro"
              components={{
                collect: <strong />,
                battle: <strong />,
              }}
            />
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Table of contents — sticky sidebar */}
          <aside className="lg:w-52 shrink-0">
            <nav className="lg:sticky lg:top-24">
              <p className="text-[10px] font-semibold text-text-light/40 uppercase tracking-widest mb-3">
                {t('toc.heading')}
              </p>
              <ul className="space-y-1">
                {SECTIONS.map(({ id }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="flex items-center gap-1.5 text-xs text-text-light hover:text-foreground transition-colors py-0.5"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-primary/40" />
                      {t(`sectionLabels.${id}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {SECTIONS.map(({ id, icon, blocks }) => (
              <Section
                key={id}
                id={id}
                icon={icon}
                title={
                  id === 'api'
                    ? t('sections.api.title')
                    : t(`sectionLabels.${id}`)
                }
              >
                {blocks.map((block, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: liste statique, jamais réordonnée
                  <SectionBlock key={i} id={id} block={block} />
                ))}
              </Section>
            ))}
          </main>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5 p-8 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-base font-black text-foreground mb-1">
              {t('cta.title')}
            </p>
            <p className="text-xs text-text-light">{t('cta.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={openRegister}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {t('cta.button')}
          </button>
        </div>
      </div>
    </div>
  )
}
